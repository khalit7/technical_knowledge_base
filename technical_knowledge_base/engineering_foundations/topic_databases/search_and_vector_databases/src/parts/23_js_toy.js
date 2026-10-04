// ---- The toy vector space for the Reading animations (illustrative: 2 dimensions instead of 384) ----
// 300 points in 8 clusters, seeded, so every reader sees the same picture. The HNSW graph is built with the
// paper's algorithm (Malkov and Yashunin, Algorithms 1, 2 and 4: layer draw with mL = 1/ln(M), greedy descent,
// beam search at layer 0, heuristic neighbour selection), with M = 4 and 2M = 8 links on layer 0, ef_construction 24.
// IVF uses k-means with 12 lists. Counts of distance computations are exact for this toy.
window.TOY=(function(){
  function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const R=rng(20261004),N=300,P=[];
  const gauss=()=>{let u=0,v=0;while(!u)u=R();v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const centres=[[.18,.22],[.42,.15],[.75,.2],[.88,.5],[.62,.48],[.3,.55],[.15,.82],[.55,.82]];
  for(let i=0;i<N;i++){const c=centres[i%8],sd=.055+.03*((i*7)%3);let x=c[0]+gauss()*sd,y=c[1]+gauss()*sd;
    x=Math.min(.98,Math.max(.02,x));y=Math.min(.98,Math.max(.02,y));P.push([x,y])}
  // a second attribute for the filtering section: 10% of points belong to "tenant 7"
  const tenant=P.map((p,i)=>((i*37+11)%10===0)?7:((i*13)%9)+1>=7?((i*13)%9)+2:((i*13)%9)+1);
  const T7=tenant.map(t=>t===7);
  const d2=(a,b)=>{const dx=a[0]-b[0],dy=a[1]-b[1];return dx*dx+dy*dy};
  // ---- HNSW build ----
  const M=4,M0=8,EFC=24,mL=1/Math.log(M);
  const level=[],links=[];let entry=-1,top=-1;
  function searchLayer(q,eps,ef,lc,cnt,trace){
    const vis=new Set(eps),C=eps.map(e=>[d2(P[e],q),e]),W=C.slice();cnt.n+=eps.length;
    while(C.length){C.sort((a,b)=>a[0]-b[0]);const c=C.shift();W.sort((a,b)=>a[0]-b[0]);const f=W[W.length-1];
      if(c[0]>f[0])break;const ev=[];
      for(const e of (links[c[1]][lc]||[])){if(vis.has(e))continue;vis.add(e);cnt.n++;ev.push(e);const de=d2(P[e],q);
        W.sort((a,b)=>a[0]-b[0]);const ff=W[W.length-1];
        if(W.length<ef||de<ff[0]){C.push([de,e]);W.push([de,e]);W.sort((a,b)=>a[0]-b[0]);if(W.length>ef)W.pop()}}
      if(trace)trace.push({layer:lc,cur:c[1],ev:ev,best:W.map(w=>w[1]),comps:cnt.n})}
    W.sort((a,b)=>a[0]-b[0]);return W}
  function select(q,cands,m){// heuristic (Algorithm 4): keep a candidate only if it is closer to q than to every kept one
    const s=cands.slice().sort((a,b)=>a[0]-b[0]),out=[];
    for(const c of s){if(out.length>=m)break;let ok=true;for(const r of out){if(d2(P[c[1]],P[r])<c[0]){ok=false;break}}if(ok)out.push(c[1])}
    return out}
  for(let i=0;i<N;i++){
    const l=Math.floor(-Math.log(R()||1e-9)*mL);level.push(l);links.push([]);for(let k=0;k<=l;k++)links[i].push([]);
    if(entry<0){entry=i;top=l;continue}
    const q=P[i],cnt={n:0};let ep=[entry];
    for(let lc=top;lc>l;lc--){ep=[searchLayer(q,ep,1,lc,cnt)[0][1]]}
    for(let lc=Math.min(top,l);lc>=0;lc--){
      const W=searchLayer(q,ep,EFC,lc,cnt),mx=lc?M:M0;const nb=select(q,W,M);links[i][lc]=nb.slice();
      for(const e of nb){const L=links[e][lc];L.push(i);if(L.length>mx){links[e][lc]=select(P[e],L.map(x=>[d2(P[x],P[e]),x]),mx)}}
      ep=W.map(w=>w[1])}
    if(l>top){top=l;entry=i}}
  // ---- k-means for IVF (12 lists, 10 iterations, deterministic start) ----
  const K=12;let cen=[];for(let k=0;k<K;k++)cen.push(P[(k*25+3)%N].slice());let asg=new Array(N).fill(0);
  for(let it=0;it<10;it++){for(let i=0;i<N;i++){let b=0,bd=9;for(let k=0;k<K;k++){const d=d2(P[i],cen[k]);if(d<bd){bd=d;b=k}}asg[i]=b}
    for(let k=0;k<K;k++){let sx=0,sy=0,n=0;for(let i=0;i<N;i++)if(asg[i]===k){sx+=P[i][0];sy+=P[i][1];n++}if(n)cen[k]=[sx/n,sy/n]}}
  // the query: placed near the border of two lists so one probe misses true neighbours (the boundary problem)
  const Q=[.47,.5];
  const exact=(q,k,pred)=>P.map((p,i)=>[d2(p,q),i]).filter(x=>!pred||pred(x[1])).sort((a,b)=>a[0]-b[0]).slice(0,k).map(x=>x[1]);
  function hnswTrace(q,ef){const cnt={n:0},tr=[];let ep=[entry];
    tr.push({layer:top,cur:entry,ev:[],best:[entry],comps:1,enter:true});cnt.n=0;
    for(let lc=top;lc>0;lc--){const W=searchLayer(q,ep,1,lc,cnt,tr);ep=[W[0][1]]}
    const W=searchLayer(q,ep,ef,0,cnt,tr);return {steps:tr,result:W.map(w=>w[1]),comps:cnt.n}}
  function ivfTrace(q,probes){const cd=cen.map((c,k)=>[d2(c,q),k]).sort((a,b)=>a[0]-b[0]);const lists=cd.slice(0,probes).map(x=>x[1]);
    const steps=[{lists:[],scanned:[],comps:K,note:'centroids'}];let comps=K,sc=[];
    for(const L of lists){const pts=[];for(let i=0;i<N;i++)if(asg[i]===L)pts.push(i);comps+=pts.length;sc=sc.concat(pts);
      steps.push({lists:lists.slice(0,steps.length),scanned:sc.slice(),comps:comps})}
    const res=sc.map(i=>[d2(P[i],q),i]).sort((a,b)=>a[0]-b[0]).slice(0,10).map(x=>x[1]);return {steps:steps,result:res,comps:comps,lists:lists}}
  // filtered search on the toy: post-filter (HNSW then keep tenant 7), iterative (keep expanding), pre-filter (scan tenant 7 only)
  function postFilter(q,ef){const h=hnswTrace(q,ef);return {cands:h.result,kept:h.result.filter(i=>T7[i]),comps:h.comps}}
  function iterative(q,ef,want,cap){// expand layer 0 in order of distance until `want` tenant-7 points are found (simplified)
    const h=hnswTrace(q,ef);const seen=new Set(h.result);let comps=h.comps;const order=h.result.slice();
    const C=h.result.map(i=>[d2(P[i],q),i]);let expanded=new Set();
    while(order.filter(i=>T7[i]).length<want&&comps<cap){C.sort((a,b)=>a[0]-b[0]);const c=C.find(x=>!expanded.has(x[1]));if(!c)break;expanded.add(c[1]);
      for(const e of links[c[1]][0]){if(seen.has(e))continue;seen.add(e);comps++;order.push(e);C.push([d2(P[e],q),e])}}
    const kept=order.filter(i=>T7[i]).map(i=>[d2(P[i],q),i]).sort((a,b)=>a[0]-b[0]).slice(0,want).map(x=>x[1]);
    return {seen:[...seen],kept:kept,comps:comps}}
  function preFilter(q,want){const ids=[];for(let i=0;i<N;i++)if(T7[i])ids.push(i);return {kept:exact(q,want,i=>T7[i]),comps:ids.length,scanned:ids}}
  const deg0=links.reduce((s,l)=>s+l[0].length,0)/N;
  return {P,N,Q,M,M0,EFC,level,links,entry,top,cen,asg,K,T7,d2,exact,hnswTrace,ivfTrace,postFilter,iterative,preFilter,deg0,
    layerCount:l=>level.filter(x=>x>=l).length};
})();
