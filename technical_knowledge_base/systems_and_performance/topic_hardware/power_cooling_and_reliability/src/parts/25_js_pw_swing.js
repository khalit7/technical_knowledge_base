// ---- Reading section 5: one cluster's power through six training steps, without and with smoothing (same input; port of swing_trace in recompute.py) ----
(function(){
  const P=window.PW,S=P.swing,F=window.PWF,$=id=>document.getElementById(id);
  const dt=0.05;
  // phases: [target fraction of full power, seconds, kind]
  const seq=[];for(let k=0;k<S.iters;k++){seq.push([1,S.compute_s,'compute',k]);seq.push([S.idle,S.comm_s,'comm',k]);if(k===2)seq.push([S.idle,S.ckpt_s,'ckpt',k])}
  function trace(smooth){let p=S.idle;const pts=[],bounds=[];
    seq.forEach(([target,dur])=>{const n=Math.round(dur/dt);
      for(let j=0;j<n;j++){const tgt=smooth?Math.max(target,S.floor):target;
        if(smooth){const st=S.ramp_per_s*dt;p=tgt>p?Math.min(tgt,p+st):Math.max(tgt,p-st)}else p=tgt;pts.push(p)}
      bounds.push(pts.length)});return {pts,bounds}}
  const TR={raw:trace(false),smooth:trace(true)};
  const MW=S.tdp_w*S.gpus/1e6;
  let mode='raw';
  const caps={compute:k=>'Step '+(k+1)+', compute: every GPU runs its forward and backward pass at once, drawing close to its 1,200 W limit.',
    comm:k=>'Step '+(k+1)+', all-reduce: GPUs mostly wait on the network, so power falls toward idle across the whole cluster within a fraction of a second.',
    ckpt:()=>'Checkpoint: training pauses while state is written, so the whole cluster sits near idle for 12 s, the longest dip in the trace.'};
  const capS={compute:k=>'Step '+(k+1)+', compute: the same work; the power cap ramped up gradually at the start instead of jumping.',
    comm:()=>'All-reduce: the floor holds every GPU at 90% of its limit (filler work or the GPU\'s own power burner), so the grid sees a small dip.',
    ckpt:()=>'Checkpoint: still held at 90%. The swing has nearly gone; the energy spent holding the floor trains nothing.'};
  function draw(i){const el=$('pw-swing-svg');const W=RD.width(el),H=200,l=46,r=10,t=12,b=28,pw=W-l-r,ph=H-t-b;
    const T=TR[mode],N=T.pts.length,end=T.bounds[i];const x=j=>l+pw*j/N,y=v=>t+ph*(1-v);
    let s='';[0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,y(v)+4,F.n(v*MW,0),{a:'end',fs:10,fill:'var(--mute)'})});
    s+=RD.t(4,t+4,'MW',{fs:10,fill:'var(--mute)'});
    // ghost of the other mode for comparison
    const G=TR[mode==='raw'?'smooth':'raw'].pts;let gp='';for(let j=0;j<G.length;j+=2)gp+=(j?'L':'M')+x(j).toFixed(1)+' '+y(G[j]).toFixed(1);
    s+='<path d="'+gp+'" fill="none" stroke="var(--dim)" stroke-width="1.2"/>';
    let d='';for(let j=0;j<end;j++)d+=(j?'L':'M')+x(j).toFixed(1)+' '+y(T.pts[j]).toFixed(1);
    s+='<path d="'+d+'" fill="none" stroke="'+(mode==='raw'?'var(--c2)':'var(--c3)')+'" stroke-width="2"/>';
    if(mode==='smooth')s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(S.floor)+'" y2="'+y(S.floor)+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-r-2,y(S.floor)+12,'floor 90%',{a:'end',fs:10,fill:'var(--c3)'});
    const secs=N*dt;[0,20,40,60].forEach(sv=>{if(sv<=secs)s+=RD.t(x(sv/dt),H-10,sv+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Cluster power over six training steps');
    const ph_=seq[i];$('pw-swing-cap').textContent=(mode==='raw'?caps:capS)[ph_[2]](ph_[3]);
    const seen=T.pts.slice(0,end),skip=Math.round(2/dt),st=mode==='smooth'?seen.slice(Math.min(skip,seen.length-1)):seen;
    const pp=(Math.max(...st)-Math.min(...st))*MW;
    const eRaw=TR.raw.pts.slice(0,end).reduce((a,v)=>a+v,0),eNow=seen.reduce((a,v)=>a+v,0);
    $('pw-swing-out').innerHTML=RD.stat('Power now',F.n(seen[seen.length-1]*MW,1)+' MW','of '+F.n(MW,1)+' MW at full power')+
      RD.stat('Largest swing so far',F.n(pp,1)+' MW',mode==='smooth'?'after the 2 s start-up ramp':'peak to trough')+
      RD.stat('Energy against no smoothing',(eNow>=eRaw?'+':'')+((eNow/eRaw-1)*100).toFixed(1)+'%',mode==='smooth'?'spent holding the floor; this trace idles far more than a real step, the paper measured 10.5% on real runs':'the baseline')}
  const A=RD.anim({card:'pw-swing-card',ctl:'pw-swing-ctl',n:seq.length,draw,ms:1300,label:'Training phase'});
  RD.seg($('pw-swing-seg'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();
