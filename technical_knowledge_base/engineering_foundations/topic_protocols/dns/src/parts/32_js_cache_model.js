// ---- Cache timeline: the model (pure function; recompute.py implements the same and check_embed.py compares them) ----
// N resolver caches, each kept warm by steady traffic, with fetch phases spread evenly over one TTL (cache i at u = (i + 0.5) / N).
// The TTL is lowered from oldTTL to newTTL `lead` seconds before the change (lead 0 = not lowered at all) and the address
// changes at t = 0. A cache shows the old address until the entry it holds at t = 0 expires. On top, a share of clients
// adds its own cache of up to `jvm` seconds (spread evenly), and a share never re-resolves (pinned connections).
window.cacheModel=function(p){
  const N=p.n||400,d=[];
  for(let i=0;i<N;i++){const u=(i+0.5)/N;let e;
    if(p.lead<=0){e=(1-u)*p.oldTTL}
    else{const e0=-p.lead+(1-u)*p.oldTTL;if(e0>0)e=e0;else{const r=((-e0)%p.newTTL);e=p.newTTL-r}}
    d.push(e)}
  // client layer: clients are spread evenly over caches; the first `jvmShare` of every 100 add a client cache
  const C=[];const M=1000;
  for(let j=0;j<M;j++){const base=d[j%N];const k=(j*7919)%M/M;let s=base;
    if(k<p.jvmShare)s+=p.jvm*((j*104729)%M/M);
    if(k>=1-p.pinShare)s=Infinity;C.push(s)}
  C.sort((a,b)=>a-b);
  const at=t=>C.filter(s=>s>t).length/M;
  const finite=C.filter(s=>isFinite(s));
  return {at:at,worst:finite.length?finite[finite.length-1]:0,median:C[Math.floor(M/2)],pinned:C.length-finite.length};
};
