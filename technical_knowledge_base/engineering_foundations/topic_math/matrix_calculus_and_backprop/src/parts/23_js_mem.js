// ---- Reading section 9: one chain of tanh layers run four ways (inference, store everything, checkpoint every k, store nothing) ----
(function(){
  const M=window.MC, svgEl=document.getElementById('mc-mem-svg');
  if(!svgEl)return;
  let mode='ckpt', n=9, seg=3, sch, vals;
  const f2=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);
  function build(){vals=M.chainVals(n);sch=M.chainSchedule(n,mode,seg);
    sch.ev.unshift({t:'start',k:0,held:[0],now:1,peak:1,fw:0,rc:0,bw:0})}
  build();
  function draw(i){
    const e=sch.ev[Math.min(i,sch.ev.length-1)], w=RD.width(svgEl);
    const per=Math.max(4,Math.min(n+1,Math.floor((w-8)/46))), rows=Math.ceil((n+1)/per);
    const bw=Math.min(64,Math.floor((w-8)/per)-6), bh=34, rowH=bh+40;
    const held=new Set(e.held);
    // gradients known so far: backward step k gives gbar_{k-1}; gbar_n known once backward starts
    const gk=new Set();let bwSeen=false;
    for(let j=1;j<=i&&j<sch.ev.length;j++){const x=sch.ev[j];if(x.t==='b'){bwSeen=true;gk.add(x.k);gk.add(x.k-1)}}
    let s='';
    for(let k=0;k<=n;k++){
      const r=Math.floor(k/per),c=k%per,x=4+c*(bw+6),y=14+r*rowH;
      const isNow=(e.t==='r'&&e.k===k)||(e.t==='f'&&e.k===k), isB=e.t==='b'&&(e.k===k||e.k-1===k);
      let fill='none',stroke='var(--line)',tc='var(--mute)';
      if(held.has(k)){fill=(e.t==='r'&&e.k===k)?'var(--c2)':(isB?'var(--c3)':'var(--acc)');stroke=fill;tc='var(--bg)'}
      s+=RD.t(x+bw/2,y-3,'h'+k,{a:'middle',fs:10,fill:'var(--mute)'});
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="5" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(isNow||isB?2:1)+'"/>';
      if(held.has(k)||isNow)s+=RD.t(x+bw/2,y+21,f2(vals.h[k]),{a:'middle',fs:bw<40?9:11,fill:tc,w:600});
      if(gk.has(k))s+=RD.t(x+bw/2,y+bh+13,'ḡ '+f2(vals.gh[k]),{a:'middle',fs:9,fill:'var(--c3)'});
    }
    const H=14+rows*rowH;
    svgEl.innerHTML=RD.svg(w,H,s,'Activations of a '+n+'-layer chain');
    const cap=document.getElementById('mc-mem-cap');let t,p;
    if(e.t==='start'){t='The input h0 is in memory';p=mode==='infer'?'Inference: each value is needed only by the next layer.':mode==='all'?'Training without checkpointing: every activation will be kept for the backward pass.':mode==='ckpt'?'Checkpointing: only h0, h'+seg+', h'+(2*seg)+', ... will be kept; the rest are recomputed when the backward pass needs them.':'Store nothing: only the input is kept, and every activation is recomputed from h0 whenever the backward pass needs it.'}
    else if(e.t==='f'){t='Forward: layer '+e.k+' computes h'+e.k+' = tanh('+M.CHAIN.w[e.k-1]+' × h'+(e.k-1)+') = '+f2(vals.h[e.k]);
      p=mode==='infer'?'h'+(e.k-1)+' is no longer needed and is freed.':(held.has(e.k-1)?'h'+(e.k-1)+' stays in memory for the backward pass.':'h'+(e.k-1)+' is freed: it will be recomputed later.');
      if(e.k===n&&mode!=='infer')p+=' Loss = (h'+n+' − '+M.CHAIN.t+')² / 2 = '+vals.loss.toFixed(4)+'; its gradient ḡ'+n+' = '+f2(vals.gh[n])+'.'}
    else if(e.t==='r'){t='Recompute h'+e.k+' from h'+(e.k-1);p='The backward pass needs a value that was freed, so the forward computation is run again from the nearest value still in memory.'}
    else{t='Backward through layer '+e.k;p='Uses h'+(e.k-1)+' and h'+e.k+': w̄'+e.k+' = ḡ'+e.k+'(1 − h'+e.k+'²) h'+(e.k-1)+' = '+f2(vals.gw[e.k-1])+', and ḡ'+(e.k-1)+' = '+f2(vals.gh[e.k-1])+' is passed on. h'+e.k+' is then freed.'}
    cap.innerHTML='<div class="t">'+RD.esc(t)+'</div><p>'+RD.esc(p)+'</p>';
    const allPeak=n+1;
    document.getElementById('mc-mem-cnt').innerHTML=RD.stat('Held now',String(e.now),'activations in memory')+RD.stat('Peak so far',String(e.peak),'store everything peaks at '+allPeak)+
      RD.stat('Layer evaluations',String(e.fw+e.rc),e.fw+' forward + '+e.rc+' recomputed')+RD.stat('Backward steps',e.bw+' of '+(mode==='infer'?0:n),'');
  }
  const A=RD.anim({card:'mc-mem-card',ctl:'mc-mem-ctl',n:sch.ev.length,draw,ms:900,label:'Step'});
  function rebuild(){build();A.reset(sch.ev.length);A.play()}
  RD.seg(document.getElementById('mc-mem-mode'),m=>{mode=m;rebuild()});
  const nr=document.getElementById('mc-mem-n'),sr=document.getElementById('mc-mem-s');
  nr.addEventListener('input',()=>{n=+nr.value;document.getElementById('mc-mem-nv').textContent=n;sr.max=Math.min(8,n);if(seg>n){seg=n;sr.value=n;document.getElementById('mc-mem-sv').textContent=n}rebuild()});
  sr.addEventListener('input',()=>{seg=+sr.value;document.getElementById('mc-mem-sv').textContent=seg;if(mode!=='ckpt'){mode='ckpt';document.querySelectorAll('#mc-mem-mode button').forEach(b=>b.classList.toggle('on',b.dataset.m==='ckpt'))}rebuild()});
  RD.onResize(()=>A.redraw());
})();
