// ---- Reading section 4: one cluster's power through six training steps, without and with smoothing (same input; port of swing_trace in recompute.py) ----
// 2026-11-12: the 13 phases are grouped into 5 explained stretches (the long-replay rule), one item each in #sx-sw-raw and #sx-sw-smooth on the left;
// a forward step draws its stretch of the trace progressively; the mode switch swaps the step list and replays.
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
  // stretches: [first phase, last phase] (phases: compute and all-reduce per step, the checkpoint after step 3)
  const STR=[[0,0],[1,1],[2,5],[6,6],[7,12]];window.PW_SWSTR=STR;
  let shown=-1,tw=0;
  function draw(i){if(tw){cancelAnimationFrame(tw);tw=0}
    const tgt=STR[i][1],t0=i>0?STR[i-1][1]:-1,fwd=i===shown+1&&!RD.RM&&$('pw-swing-card').classList.contains('rd-fwd');shown=i;
    if(fwd){const st=performance.now(),N0=t0<0?0:TR[mode].bounds[t0],N1=TR[mode].bounds[tgt];
      const f=now=>{const u=Math.min(1,(now-st)/1400);paint(tgt,Math.round(N0+(N1-N0)*u));tw=u<1?requestAnimationFrame(f):0};paint(tgt,N0);tw=requestAnimationFrame(f)}
    else paint(tgt,TR[mode].bounds[tgt])}
  function paint(i,endPts){const el=$('pw-swing-svg');const W=RD.width(el),H=200,l=46,r=10,t=12,b=28,pw=W-l-r,ph=H-t-b;
    const T=TR[mode],N=T.pts.length,end=T.bounds[i],endD=Math.max(1,endPts);const x=j=>l+pw*j/N,y=v=>t+ph*(1-v);
    let s='';[0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,y(v)+4,F.n(v*MW,0),{a:'end',fs:10,fill:'var(--mute)'})});
    s+=RD.t(4,t+4,'MW',{fs:10,fill:'var(--mute)'});
    // ghost of the other mode for comparison
    const G=TR[mode==='raw'?'smooth':'raw'].pts;let gp='';for(let j=0;j<G.length;j+=2)gp+=(j?'L':'M')+x(j).toFixed(1)+' '+y(G[j]).toFixed(1);
    s+='<path d="'+gp+'" fill="none" stroke="var(--dim)" stroke-width="1.2"/>';
    let d='';for(let j=0;j<endD;j++)d+=(j?'L':'M')+x(j).toFixed(1)+' '+y(T.pts[j]).toFixed(1);
    s+='<path d="'+d+'" fill="none" stroke="'+(mode==='raw'?'var(--c2)':'var(--c3)')+'" stroke-width="2"/>';
    if(mode==='smooth')s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(S.floor)+'" y2="'+y(S.floor)+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-r-2,y(S.floor)+12,'floor 90%',{a:'end',fs:10,fill:'var(--c3)'});
    const secs=N*dt;[0,20,40,60].forEach(sv=>{if(sv<=secs)s+=RD.t(x(sv/dt),H-10,sv+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Cluster power over six training steps');
    const seen=T.pts.slice(0,end),skip=Math.round(2/dt),st=mode==='smooth'?seen.slice(Math.min(skip,seen.length-1)):seen;
    const pp=(Math.max(...st)-Math.min(...st))*MW;
    const eRaw=TR.raw.pts.slice(0,end).reduce((a,v)=>a+v,0),eNow=seen.reduce((a,v)=>a+v,0);
    $('pw-swing-out').innerHTML=RD.stat('Power now',F.n(seen[seen.length-1]*MW,1)+' MW','of '+F.n(MW,1)+' MW at full power')+
      RD.stat('Largest swing so far',F.n(pp,1)+' MW',mode==='smooth'?'after the 2 s start-up ramp':'peak to trough')+
      RD.stat('Energy against no smoothing',(eNow>=eRaw?'+':'')+((eNow/eRaw-1)*100).toFixed(1)+'%',mode==='smooth'?'spent holding the floor; this trace idles far more than a real step, the paper measured 10.5% on real runs':'the baseline')}
  const A=RD.anim({card:'pw-swing-card',ctl:'pw-swing-ctl',n:STR.length,draw,ms:4600,label:'Stretch of the trace',list:'sx-sw-raw'});
  RD.seg($('pw-swing-seg'),m=>{mode=m;$('sx-sw-raw').hidden=m!=='raw';$('sx-sw-smooth').hidden=m==='raw';shown=-1;A.reset(STR.length,'sx-sw-'+m)});
  window.PW_SWA=A;
  RD.onResize(()=>A.redraw());
})();
