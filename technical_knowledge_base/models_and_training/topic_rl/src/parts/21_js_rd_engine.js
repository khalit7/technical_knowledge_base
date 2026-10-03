// ---- Reading tab: the exact computations behind the one-episode widget (window.RDE) ----
// Pure functions, no DOM. src/read/check_engine.mjs runs this file in Node and compares every output
// with src/read/recompute.py (an independent Python implementation) via src/read/expected.json.
(function(root){
  // One episode S0 -> S1 -> S2 -> end; p: {g, lam, R:[R1,R2,R3], V:[V0,V1,V2], alpha, pDP}
  function targets(p){const g=p.g,R=p.R,V=p.V,T=3;
    const nstep=n=>{let G=0;for(let k=0;k<Math.min(n,T);k++)G+=Math.pow(g,k)*R[k];if(n<T)G+=Math.pow(g,n)*V[n];return G};
    const mc=nstep(T),td=nstep(1),two=nstep(2);
    const w=[(1-p.lam),(1-p.lam)*p.lam,p.lam*p.lam];const lam=w[0]*td+w[1]*two+w[2]*mc;
    const dp=p.pDP*(R[0]+g*V[1]);
    return {mc,td,two,lam,w,dp,reinforceB:mc-V[0],delta:td-V[0],upd:t=>V[0]+p.alpha*(t-V[0])}}
  // group-relative advantages (GRPO: divide by the population standard deviation)
  function groupAdv(r){const G=r.length,m=r.reduce((a,b)=>a+b,0)/G;
    const sd=Math.sqrt(r.reduce((a,b)=>a+(b-m)*(b-m),0)/G);
    return {m,sd,A:r.map(x=>sd>0?(x-m)/sd:0)}}
  root.RDE={targets,groupAdv};
})(typeof window!=='undefined'?window:globalThis);
