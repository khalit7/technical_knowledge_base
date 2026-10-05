// ---- Performance calculator (t-calc): player helper and the one-training-step animation (1 vs 8 vs 64 GPUs) ----
window.CALCP=function(o){
  // o: {root, play, prev, next, scrub, spd, total() sim seconds, stops() sim times, draw(t), wall seconds for one pass}
  const X=window.CALCX;let t=0,playing=false,last=0,raf=0,visible=false;
  const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(!visible)stop()}):null;if(io)io.observe(o.root);else visible=true;
  function set(v){const T=o.total();t=Math.max(0,Math.min(T,v));o.scrub.value=Math.round(t/T*1000);o.draw(t)}
  function frame(ts){if(!playing)return;const dt=Math.min(0.1,(ts-last)/1000);last=ts;
    if(document.getElementById('t-calc').hidden||!visible){stop();return}
    const T=o.total(),k=T/(o.wall||8)*(+o.spd.value);set(t+dt*k);if(t>=T){stop();return}raf=requestAnimationFrame(frame)}
  function start(){if(t>=o.total())set(0);playing=true;o.play.textContent='Pause';last=performance.now();raf=requestAnimationFrame(frame)}
  function stop(){playing=false;cancelAnimationFrame(raf);o.play.textContent=t>=o.total()?'Replay':'Play'}
  o.play.addEventListener('click',()=>{playing?stop():start()});
  o.scrub.addEventListener('input',()=>{stop();set(o.scrub.value/1000*o.total())});
  o.next.addEventListener('click',()=>{stop();const s=o.stops().find(x=>x>t+1e-9);set(s==null?o.total():s)});
  o.prev.addEventListener('click',()=>{stop();const ss=o.stops().filter(x=>x<t-1e-9);set(ss.length?ss[ss.length-1]:0)});
  return {set:set,reset:()=>{stop();set(0)},get t(){return t},stop:stop,auto:()=>{if(!X.RM&&!playing&&t===0)start()}};
};
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id);
  let mode='8',ov=false,P,TMAX;
  const NAMES={'1':'1 GPU','8':'8 GPUs in one server (NVLink)','64f':'64 GPUs in 8 servers, flat FSDP','64h':'64 GPUs in 8 servers, HSDP'};
  function phases(r){
    // [key, lane, start, end] for one micro-batch, sim seconds
    const tc=r.t_cmp,f=tc/3,ph=[];
    if(!ov||r.n===1){let x=0;const add=(k,l,d)=>{if(d>0){ph.push([k,l,x,x+d]);x+=d}};
      add('agf','net',r.ag);add('fwd','cmp',f);add('agb','net',r.ag);add('bwd','cmp',tc-f);add('rs','net',r.rs);add('cross','net',r.cross);add('opt','cmp',r.opt/r.micro);}
    else{ph.push(['fwd','cmp',0,f]);ph.push(['bwd','cmp',f,tc]);let x=0;[['agf',r.ag],['agb',r.ag],['rs',r.rs],['cross',r.cross]].forEach(a=>{if(a[1]>0){ph.push([a[0],'net',x,x+a[1]]);x+=a[1]}});
      const end=Math.max(tc,x);ph.push(['opt','cmp',end,end+r.opt/r.micro]);}
    return ph;
  }
  const CAP={
    agf:r=>'<b>Gather the weights for the forward pass.</b> Each GPU holds only 1/'+(mode==='64h'?8:r.n)+' of the model, so before computing a layer it collects the other pieces from its peers (all-gather of BF16 weights, '+X.fGB(2*X.M.l8.P/1e9)+' for the whole model) '+(mode==='64f'?'<b>through the 50 GB/s NICs</b>, because a 64-GPU ring is only as fast as its slowest link.':'over NVLink at 450 GB/s each way.'),
    fwd:r=>'<b>Forward pass.</b> One 8,192-token sequence through 32 layers: 2 x 8.03B x 8,192 = '+X.fE(2*X.M.l8.P*8192)+' FLOPs, a third of the micro-batch\'s work.',
    agb:r=>'<b>Gather again for the backward pass.</b> FSDP freed the gathered weights after the forward pass to save memory, so it gathers them a second time.',
    bwd:r=>'<b>Backward pass.</b> Gradients with respect to activations and to weights: twice the forward FLOPs. This is where the 6 in 6ND comes from (2 forward + 4 backward).',
    rs:r=>'<b>Reduce-scatter the gradients.</b> Every GPU computed gradients for the whole model from its own data; they are summed and each GPU keeps only the slice it owns ('+(mode==='64f'?'again over the slow NICs':'over NVLink')+').',
    cross:r=>'<b>All-reduce across servers.</b> HSDP keeps a full replica of the sharded model in each server, so only gradients cross servers: each GPU sums its 1/8 slice with the GPUs holding the same slice in the other 7 servers. '+X.fGB(2*X.M.l8.P/8/1e9)+' per GPU once per step, instead of three model-sized transfers per micro-batch.',
    opt:r=>'<b>Optimizer step</b> (once per step, after the last micro-batch). Adam reads and writes the FP32 master weights, moments and gradients: memory-bound, '+X.fT(r.opt)+' on this GPU\'s slice.'};
  const CMPLAB={fwd:'forward',bwd:'backward',opt:'opt.'},NETLAB={agf:'gather',agb:'gather',rs:'reduce-scatter',cross:'cross-server all-reduce'};
  const COL={fwd:'var(--c1)',bwd:'var(--c4)',opt:'var(--c5)',agf:'var(--c3)',agb:'var(--c3)',rs:'var(--c2)',cross:'var(--bad)'};
  function draw(t){
    const el=$('calc-sviz'),r=X.stepAnim(mode,ov),ph=phases(r),W=Math.max(300,el.clientWidth),narrow=W<520;
    const cur=ph.filter(p=>t>=p[2]&&t<p[3]).map(p=>p[0]);
    // cluster picture
    const gy=8,cell=narrow?9:12,gap=3;let s='',H=0;
    const nodes=r.n===1?1:r.n/8,per=r.n===1?1:8,boxW=per*(cell+gap)+8,cols=Math.max(1,Math.min(nodes,Math.floor((W-10)/(boxW+10)))),rows=Math.ceil(nodes/cols);
    const netOn=cur.some(k=>(k==='agf'||k==='agb'||k==='rs')&&mode==='64f')||cur.indexOf('cross')>=0,nvOn=cur.some(k=>(k==='agf'||k==='agb'||k==='rs')&&mode!=='64f'&&r.n>1);
    const cmpOn=cur.some(k=>k==='fwd'||k==='bwd'||k==='opt');
    for(let i=0;i<nodes;i++){const cx=5+(i%cols)*(boxW+10),cy=gy+Math.floor(i/cols)*(cell+22);
      s+='<rect x="'+cx+'" y="'+cy+'" width="'+boxW+'" height="'+(cell+10)+'" rx="4" style="fill:none;stroke:'+(nvOn?'var(--c3)':'var(--line)')+';stroke-width:'+(nvOn?2.2:1)+'"/>';
      for(let j=0;j<per;j++)s+='<rect x="'+(cx+4+j*(cell+gap))+'" y="'+(cy+5)+'" width="'+cell+'" height="'+cell+'" rx="2" style="fill:'+(cmpOn?'var(--c1)':'var(--dim)')+'"/>';}
    H=gy+rows*(cell+22);
    if(nodes>1){const y=H-4;s+='<line x1="5" x2="'+(5+Math.min(nodes,cols)*(boxW+10)-10)+'" y1="'+y+'" y2="'+y+'" style="stroke:'+(netOn?'var(--bad)':'var(--line)')+';stroke-width:'+(netOn?3:1.5)+';stroke-dasharray:6 4;stroke-dashoffset:'+(-t*80).toFixed(1)+'"/>';H+=4}
    s+='<text x="5" y="'+(H+12)+'" font-size="11" style="fill:var(--mute)">'+X.esc(NAMES[mode])+(nodes>1&&!narrow?': boxes are servers (NVLink inside, green when used), dashed line the network (red when used)':'')+'</text>';H+=18;
    // timeline of one micro-batch, to a fixed scale shared by all four clusters
    const tl={l:narrow?62:90,r:10},iw=W-tl.l-tl.r,X0=tl.l,y1=H+16,y2=y1+30,sx=v=>X0+v/TMAX*iw;
    s+='<text x="0" y="'+(H+10)+'" font-size="11" style="fill:var(--mute)">'+(narrow?'one micro-batch on GPU 0 (x '+r.micro+' per step)':'one micro-batch on GPU 0, x '+r.micro+' micro-batch'+(r.micro>1?'es':'')+' per step (same time scale for all four)')+'</text>';
    s+='<text x="'+(X0-6)+'" y="'+(y1+15)+'" font-size="11" text-anchor="end">compute</text><text x="'+(X0-6)+'" y="'+(y2+15)+'" font-size="11" text-anchor="end">network</text>';
    s+='<rect x="'+X0+'" y="'+y1+'" width="'+iw+'" height="22" style="fill:var(--soft)"/><rect x="'+X0+'" y="'+y2+'" width="'+iw+'" height="22" style="fill:var(--soft)"/>';
    ph.forEach(p=>{const a=p[2],b=Math.min(p[3],t);if(b<=a)return;const y=p[1]==='cmp'?y1:y2,w=Math.max(0.6,sx(b)-sx(a));
      s+='<rect x="'+sx(a)+'" y="'+y+'" width="'+w+'" height="22" style="fill:'+COL[p[0]]+'"/>';
      const lab=p[1]==='cmp'?CMPLAB[p[0]]:NETLAB[p[0]];if(w>lab.length*6.2+6)s+='<text x="'+(sx(a)+4)+'" y="'+(y+15)+'" font-size="11" style="fill:var(--bg)">'+lab+'</text>'});
    for(let k=0;k<=Math.floor(TMAX/0.5);k++){const x=sx(k*0.5);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(y2+22)+'" y2="'+(y2+26)+'" style="stroke:var(--mute)"/><text x="'+x+'" y="'+(y2+37)+'" font-size="10.5" text-anchor="'+(x>W-20?'end':'middle')+'" style="fill:var(--mute)">'+(k*0.5)+' s</text>'}
    const xc=sx(Math.min(t,TMAX));s+='<line x1="'+xc+'" x2="'+xc+'" y1="'+(y1-4)+'" y2="'+(y2+26)+'" style="stroke:var(--ink);stroke-width:1.5"/>';
    H=y2+44;
    // memory per GPU
    const mw=W-tl.l-tl.r,ms=Math.max(r.mem,80)*1.04,mx=v=>X0+v/ms*mw;
    s+='<text x="'+(X0-6)+'" y="'+(H+15)+'" font-size="11" text-anchor="end">memory</text>';
    s+='<rect x="'+X0+'" y="'+H+'" width="'+(mx(r.states)-X0)+'" height="20" style="fill:var(--c4)"/><rect x="'+mx(r.states)+'" y="'+H+'" width="'+(mx(r.mem)-mx(r.states))+'" height="20" style="fill:var(--c6)"/>';
    s+='<line x1="'+mx(80)+'" x2="'+mx(80)+'" y1="'+(H-4)+'" y2="'+(H+24)+'" style="stroke:var(--ink);stroke-width:2"/>';s+='<text x="'+(mx(80)-4)+'" y="'+(H+36)+'" font-size="11" text-anchor="end">80 GB</text>';
    s+='<text x="'+X0+'" y="'+(H+50)+'" font-size="11" style="fill:var(--mute)">states '+X.fGB(r.states)+' + activations '+X.fGB(r.act)+' = '+X.fGB(r.mem)+(r.fits?'':' &gt; 80 GB: does not fit')+'</text>';
    H+=58;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One training step animated">'+s+'</svg>';
    const k=cur.length?cur[cur.length-1]:(t>=Math.max.apply(null,ph.map(p=>p[3]))-1e-9?'end':ph[0][0]);
    $('calc-scap').innerHTML=k==='end'?'<b>Step done.</b> '+(r.n===1?'On one GPU this run cannot actually start: model states alone are '+X.fGB(r.states)+' against 80 GB. The timeline is what it would take if memory were unlimited.':'Network busy for '+X.pct(r.net_busy)+' of the compute time.'+(mode==='64f'?' Without overlap the step nearly doubles; with perfect overlap the network is still busy almost all the time, so any hiccup shows up as lost GPU time.':mode==='64h'?' Same 64 GPUs, but the heavy gathers stay on NVLink and only a 1/8 gradient slice crosses servers.':''))
      :CAP[k](r);
    $('calc-sout').innerHTML=X.stat('Step time',X.fT(r.step),r.micro+' x '+X.fT(r.step/r.micro-r.opt/r.micro)+' + optimizer')+X.stat('Tokens/s',X.sig(r.tok_s),X.sig(r.tok_s_gpu)+' per GPU')+X.stat('MFU',X.pct(r.mfu),'40% while computing')+X.stat('Sent per GPU per step',X.fGB(r.vol_gb),'network busy '+X.pct(r.net_busy)+' of compute')+X.stat('Memory per GPU',X.fGB(r.mem),r.fits?'<span class="calc-ok">fits</span> in 80 GB':'<span class="calc-no">does not fit</span>');
  }
  function init(){
    TMAX=Math.max.apply(null,['1','8','64f','64h'].map(m=>{const r=X.stepAnim(m,false);return r.t_cmp+r.comm+r.opt/r.micro}));
    P=window.CALCP({root:$('calc-sviz'),play:$('calc-splay'),prev:$('calc-sprev'),next:$('calc-snext'),scrub:$('calc-sscrub'),spd:$('calc-sspd'),wall:9,
      total:()=>{const r=X.stepAnim(mode,ov),ph=phases(r);return Math.max.apply(null,ph.map(p=>p[3]))},
      stops:()=>{const r=X.stepAnim(mode,ov);return phases(r).map(p=>p[3]).sort((a,b)=>a-b)},draw:draw});
    $('calc-smode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.v;[...$('calc-smode').children].forEach(x=>x.classList.toggle('on',x===b));P.reset();P.auto()});
    $('calc-sov').addEventListener('change',e=>{ov=e.target.checked;P.reset();P.auto()});
    X.onRender(()=>{P.set(P.t)});addEventListener('resize',()=>{if(!$('t-calc').hidden)P.set(P.t)});
    P.set(0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
