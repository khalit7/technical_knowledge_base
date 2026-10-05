// ---- Reading tab: text filled from data, predict-then-reveal, and the static charts ----
// SGT.lanes draws a to-scale timeline: lanes (rows), events [lane, start, end, label, color, faded].
window.SGT=(function(){
  const E=RD.esc;
  const col={copy:'var(--c6)',compute:'var(--c1)',comm:'var(--c2)',cpu:'var(--c4)',gpu:'var(--c1)',wait:'var(--dim)',opt:'var(--c3)'};
  function ticks(tmax,n){const raw=tmax/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=[1,2,2.5,5,10].find(x=>x*p>=raw)*p;const a=[];for(let t=0;t<=tmax+1e-9;t+=m)a.push(+t.toFixed(6));return a}
  // o: {el, lanes:[[id,label]], ev:[[lane,s,e,label,color,dim]], tmax, unit, marks:[[t,label]], lw}
  function lanes(o){
    const W=RD.width(o.el),lw=Math.min(o.lw||92,W*0.28),rh=o.rh||26,top=6,H=top+o.lanes.length*rh+26;
    const x=t=>lw+(W-lw-10)*t/o.tmax;let s='';
    const li={};o.lanes.forEach((l,i)=>{li[l[0]]=i;const y=top+i*rh;
      s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+(W-lw-10)+'" height="'+(rh-6)+'" fill="var(--soft)" rx="3"/>';
      s+=RD.t(4,y+rh/2+4,E(l[1]),{fs:11})});
    o.ev.forEach(e=>{const i=li[e[0]];if(i===undefined)return;const y=top+i*rh,x0=x(e[1]),w=Math.max(1,x(e[2])-x0);
      s+='<rect x="'+x0.toFixed(1)+'" y="'+(y+4)+'" width="'+w.toFixed(1)+'" height="'+(rh-8)+'" rx="2" fill="'+(e[4]||col[e[0]]||'var(--acc)')+'" opacity="'+(e[5]?0.22:0.9)+'"><title>'+E(e[3]||'')+'</title></rect>';
      if(e[3]&&w>E(e[3]).length*5.6+6)s+=RD.t(x0+4,y+rh/2+4,E(e[3]),{fs:10.5,fill:'var(--bg)'})});
    (o.marks||[]).forEach(m=>{const xx=x(m[0]);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(top+o.lanes.length*rh)+'" stroke="var(--ink)" stroke-dasharray="3 3" stroke-width="1"/>';
      if(m[1])s+=RD.t(Math.min(xx+3,W-90),top+o.lanes.length*rh+22,E(m[1]),{fs:10.5,w:600})});
    const ty=top+o.lanes.length*rh;ticks(o.tmax,Math.max(3,Math.floor((W-lw)/80))).forEach(t=>{const xx=x(t);if(xx>W-8)return;
      s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+ty+'" y2="'+(ty+4)+'" stroke="var(--mute)"/>'+RD.t(xx,ty+14,(+t.toPrecision(4))+(t===0?' '+o.unit:''),{fs:10,a:'middle',fill:'var(--mute)'})});
    o.el.innerHTML=RD.svg(W,H,s,o.label||'timeline');
  }
  // horizontal bars: rows [label, value, color, note]
  function bars(el,rows,unit,log){
    const W=RD.width(el),lw=Math.min(190,W*0.42),rh=24,H=rows.length*rh+8,vmax=Math.max(...rows.map(r=>r[1]));
    const f=v=>log?Math.log10(1+v)/Math.log10(1+vmax):v/vmax;let s='';
    rows.forEach((r,i)=>{const y=4+i*rh,w=Math.max(2,(W-lw-70)*f(r[1]));
      s+=RD.t(lw-6,y+15,E(r[0]),{fs:11,a:'end'})+'<rect x="'+lw+'" y="'+(y+4)+'" width="'+w.toFixed(1)+'" height="'+(rh-9)+'" rx="2" fill="'+r[2]+'"/>'+RD.t(lw+w+5,y+15,E(r[3]||(r[1]+' '+unit)),{fs:11,w:600})});
    el.innerHTML=RD.svg(W,H,s,'bar chart');
  }
  return {lanes,bars,col};
})();
(function(){
  const S=window.SG,E=RD.esc,$=id=>document.getElementById(id);
  const fmt=v=>typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:3}):String(v);
  // text lists read from the headers and the PyTorch source
  if($('sg-nodetypes'))$('sg-nodetypes').innerHTML=S.cuda.node_types.filter(t=>!/Reserved/.test(t[0])).map(t=>'<code>'+E(t[0])+'</code>').join(', ');
  if($('sg-upd'))$('sg-upd').innerHTML=S.cuda.update_results.filter(x=>x!=='Success').map(x=>'<code>'+E(x)+'</code>').join(', ');
  if($('sg-capmodes'))$('sg-capmodes').innerHTML=S.cuda.capture_modes.map(x=>'<code>cudaStreamCaptureMode'+E(x)+'</code>').join(', ');
  if($('sg-skips')){const r=S.torchsrc.skip_reasons_cudagraph_utils.concat(S.torchsrc.skip_reasons_lowering).map(x=>x.replace(/[ (:;.]+$/,'')).filter((x,i,a)=>a.indexOf(x)===i);
    $('sg-skips').innerHTML=r.map(x=>'"'+E(x)+'"').join('; ')+' (strings from <code>cudagraph_utils.py</code> and <code>lowering.py</code>, PyTorch '+E(S.torchsrc.torch)+') <span class="rd-pub">read here</span>'}
  if($('sg-ncclapi')){const ep=S.cuda.nccl_entry_points,coll=ep.filter(x=>/^nccl(AllReduce|AllGather|ReduceScatter|Broadcast|Reduce|AlltoAll|Gather|Scatter|Send|Recv)$/.test(x));
    $('sg-ncclapi').innerHTML=ep.length+' functions; the communication calls are '+coll.map(x=>'<code>'+x+'</code>').join(', ')+', most with a <code>...Config</code> variant taking per-call settings'}
  if($('sg-ncclcfg'))$('sg-ncclcfg').innerHTML=S.cuda.nccl_config_fields.map(x=>'<code>'+E(x)+'</code>').join(', ');
  if($('sg-nccldev'))$('sg-nccldev').innerHTML=S.cuda.nccl_device_headers.map(x=>'<code>'+E(x)+'</code>').join(', ');
  if($('sg-cond-sass'))$('sg-cond-sass').textContent='// halve_and_test, sm_90a, cuobjdump -sass (CUDA 13.4.2); '+S.cuda.cond_regs+' registers\n'+S.cuda.cond_sass.join('\n');
  // predict-then-reveal
  document.querySelectorAll('#t-read .rd-pr').forEach(card=>{const ans=card.querySelector('.ans');
    card.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      card.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');ans.hidden=false}))});
  RD.tabLinks(document.getElementById('t-read'));

  // default-stream toy: A on s1, B on stream 0, C on s2, copy on stream 0; each kernel 1 unit, copy 0.6
  let dsMode='legacy';
  function drawDS(){const el=$('sg-ds-fig');if(!el)return;let ev,cap;
    if(dsMode==='legacy'){ev=[['s1',0,1,'A'],['s0',1,2,'B'],['s2',2,3,'C'],['s0',3,3.6,'copy']];
      cap='Legacy default stream: B waits for A, C waits for B, the copy waits for C. Four operations, no overlap, 3.6 units.'}
    else{ev=[['s1',0,1,'A'],['s0',0,1,'B'],['s2',0,1,'C'],['s0',1,1.6,'copy']];
      cap='Per-thread default stream: A, B and C may run together (they are tiny); only the copy, on the same stream as B, waits for B. 1.6 units if the GPU has room.'}
    SGT.lanes({el,lanes:[['s1','stream s1'],['s0',dsMode==='legacy'?'stream 0 (legacy)':'stream 0 (per-thread)'],['s2','stream s2']],ev:ev.map(e=>e.concat([e[3]==='copy'?'var(--c6)':'var(--c1)'])),tmax:3.8,unit:'units',lw:120,label:'default stream timeline'});
    $('sg-ds-cap').textContent=cap+' Illustrative durations; the ordering is the documented rule.'}
  if($('sg-ds-seg'))RD.seg($('sg-ds-seg'),m=>{dsMode=m;drawDS()});
  // M1 launch measurements
  function drawM1(){const el=$('sg-m1-fig');if(!el)return;const m=S.m1.metal,p=S.m1.mps;
    SGT.bars(el,[['Metal: launch + wait each',m.wait_each.us,'var(--bad)',m.wait_each.us+' µs'],['Metal: queued, wait once',m.queue.us,'var(--c5)',m.queue.us+' µs'],
      ['Metal: one command buffer',m.one_cb.us,'var(--c1)',m.one_cb.us+' µs'],['Metal: recorded once, replayed',m.icb_replay.us,'var(--c3)',m.icb_replay.us+' µs'],
      ['PyTorch MPS: sync each',p.sync_each,'var(--bad)',p.sync_each+' µs'],['PyTorch MPS: sync once',p.sync_once,'var(--c1)',p.sync_once+' µs']],'µs',true)}
  function drawConc(){const el=$('sg-conc-fig');if(!el)return;const c=S.m1.conc;
    SGT.bars(el,[['one kernel alone',c.single_ms,'var(--mute)',c.single_ms+' ms'],[c.k+' kernels, one queue',c.one_queue.ms,'var(--c5)',c.one_queue.ms+' ms'],[c.k+' kernels, '+c.k+' queues',c.k_queues.ms,'var(--bad)',c.k_queues.ms+' ms'],[c.k+' kernels, concurrent encoder',c.concurrent.ms,'var(--c3)',c.concurrent.ms+' ms']],'ms');
    $('sg-conc-cap').innerHTML='<span class="rd-meas">measured on Apple M1 Pro GPU</span> '+c.k+' kernels of one 32-thread threadgroup each, a dependent loop of '+c.iters.toLocaleString('en-US')+' FMAs, so each fills one of 16 GPU cores. Median of '+c.runs+' runs of 7 trials (runs for '+c.k+' queues: '+c.k_queues.runs.join(', ')+' ms); load average '+c.load[0]+' to '+c.load[1]+'. Metal through PyObjC.'}
  // chunked pipeline
  function pipeSim(k,two){const P=S.pipe,hi=P.h2d_ms/k,ke=P.k_ms/k,ho=P.d2h_ms/k,ev=[];
    if(k===1){ev.push(['in',0,hi,'H2D']);ev.push(['ker',hi,hi+ke,'kernel']);ev.push([two?'out':'in',hi+ke,hi+ke+ho,'D2H']);return {ev,T:hi+ke+ho}}
    let inE=0,kE=0,oE=0;const kend=[];
    if(two){for(let c=0;c<k;c++){const s=inE;inE=s+hi;ev.push(['in',s,inE,'']);const ks=Math.max(inE,kE);kE=ks+ke;ev.push(['ker',ks,kE,'']);kend.push(kE);const os=Math.max(kE,oE);oE=os+ho;ev.push(['out',os,oE,''])}return {ev,T:oE}}
    // one engine: copies in issue order, an out may run as soon as its kernel is done (greedy, earliest issued ready op)
    const done=new Array(k).fill(false);let t=0,ni=0,no=0;const ke2=[];let kEnd=0;
    while(no<k){let op=null;if(no<ni&&ke2[no]<=t)op='o';else if(ni<k)op='i';else{t=ke2[no];op='o'}
      if(op==='i'){ev.push(['in',t,t+hi,'']);t+=hi;const ks=Math.max(t,kEnd);kEnd=ks+ke;ev.push(['ker',ks,kEnd,'']);ke2.push(kEnd);ni++}
      else{const s=Math.max(t,ke2[no]);ev.push(['in',s,s+ho,'',`var(--c2)`]);t=s+ho;no++}}
    return {ev,T:t}}
  function drawPipe(){const el=$('sg-pipe-fig');if(!el)return;const k=+$('sg-pipe-k').value,two=$('sg-pipe-two').checked;$('sg-pipe-kv').textContent=k;
    const r=pipeSim(k,two),P=S.pipe;
    const ev=r.ev.map(e=>[e[0],e[1],e[2],e[3],e[4]||(e[0]==='ker'?'var(--c1)':e[0]==='out'?'var(--c2)':'var(--c6)')]);
    SGT.lanes({el,lanes:two?[['in','copy in (H2D)'],['ker','kernels'],['out','copy out (D2H)']]:[['in','copy engine'],['ker','kernels']],ev,tmax:Math.max(P.serial_ms,r.T)*1.02,unit:'ms',lw:110,marks:[[r.T,'done '+r.T.toFixed(2)+' ms']],label:'copy pipeline'});
    $('sg-pipe-cnt').innerHTML=RD.stat('Serial (1 chunk)',P.serial_ms.toFixed(2)+' ms','copy in, kernel, copy out')+RD.stat('This pipeline',r.T.toFixed(2)+' ms',k+' chunks, '+(two?'two engines':'one engine'))+RD.stat('Speed-up',(P.serial_ms/r.T).toFixed(2)+'×','limited by the copies')}
  if($('sg-pipe-k')){$('sg-pipe-k').addEventListener('input',drawPipe);$('sg-pipe-two').addEventListener('change',drawPipe)}
  // DDP measured on CPU
  function drawDDP(){const el=$('sg-ddp-fig');if(!el)return;const d=S.ddp,ev=[];
    [['overlap','ov'],['serial','se']].forEach(([m,p])=>{const x=d[m].example;ev.push([p+'c',0,x.compute,'backward compute','var(--c1)']);
      x.buckets.forEach(b=>ev.push([p+'a',b[2],b[3],'b'+(b[0]+1),'var(--c2)']))});
    const tmax=Math.max(d.overlap.example.end,d.serial.example.end)*1.03;
    SGT.lanes({el,lanes:[['ovc','overlap: compute'],['ova','overlap: all-reduce'],['sec','serial: compute'],['sea','serial: all-reduce']],ev,tmax,unit:'ms',lw:128,
      marks:[[d.overlap.example.end,''],[d.serial.example.end,'']],label:'DDP measured timeline'})}
  function drawProf(){const el=$('sg-prof-fig');if(!el)return;const p=S.ddp.profile,tmax=Math.max(...p.map(e=>e[1]+e[2]))*1.03;
    SGT.lanes({el,lanes:[['bw','autograd thread'],['ar','Gloo threads']],ev:p.map(e=>[e[0],e[1],e[1]+e[2],'',e[0]==='ar'?'var(--c2)':'var(--c1)']),tmax,unit:'ms',lw:110,label:'profiler events'})}
  function all(){drawDS();drawM1();drawConc();drawPipe();drawDDP();drawProf()}
  RD.onRender(all);RD.onResize(all);all();
})();
