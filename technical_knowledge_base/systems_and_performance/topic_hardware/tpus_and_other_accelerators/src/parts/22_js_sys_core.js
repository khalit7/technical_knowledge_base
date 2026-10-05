// ---- Systolic array core, shared by the Reading animation and the Systolic array lab ----
// A port of src/sim/systolic.py (simulate and tiled_cycles); check_sim.mjs compares the two.
window.SYS=(function(){
  // Cycle-by-cycle weight-stationary array for one tile (K <= rows, N <= cols).
  // Returns frames[t] = {pe:[[{a,m,s}|null]], out:[[m,n,val]]} and totals.
  function simulate(X,W){
    const M=X.length,K=X[0].length,N=W[0].length;
    let a=[],p=[];for(let k=0;k<K;k++){a.push(Array(N).fill(null));p.push(Array(N).fill(null))}
    const Y=X.map(()=>Array(N).fill(null));const frames=[];
    let t=0,macs=0,edge=0,passes=0,done=0;const active=[];
    while(done<M*N){
      const na=[],np=[];for(let k=0;k<K;k++){na.push(Array(N).fill(null));np.push(Array(N).fill(null))}
      let act=0;const out=[];let fe=0,fp=0;
      for(let k=0;k<K;k++)for(let n=0;n<N;n++){
        let ac;
        if(n===0){const m=t-k;ac=(m>=0&&m<M)?{v:X[m][k],m:m}:null;if(ac){edge++;fe++}}
        else{ac=a[k][n-1];if(ac){passes++;fp++}}
        if(!ac)continue;
        let ps=0;
        if(k>0){const pr=p[k-1][n];if(!pr||pr.m!==ac.m)throw new Error('systolic timing');ps=pr.s;passes++;fp++}
        na[k][n]=ac;np[k][n]={s:ps+ac.v*W[k][n],m:ac.m};macs++;act++;
      }
      for(let n=0;n<N;n++){const o=np[K-1][n];if(o){Y[o.m][n]=o.s;done++;out.push([o.m,n,o.s])}}
      a=na;p=np;active.push(act);
      frames.push({pe:K?na.map((r,k)=>r.map((c,n)=>c?{a:c.v,m:c.m,s:np[k][n].s}:null)):[],out:out,edge:fe,pass:fp,act:act});
      t++;
      if(t>10000)throw new Error('runaway');
    }
    return {Y,frames,cycles:t,macs,edge,passes,active};
  }
  // Big matmul on an R x C array; weights double-buffered, shifted in one row per cycle.
  function tiled(M,K,N,R,C){
    const tk=Math.ceil(K/R),tn=Math.ceil(N/C),tiles=tk*tn;
    const cyc=R+tiles*Math.max(M,R)+(R+C-2);
    return {tiles,cycles:cyc,util:M*K*N/(R*C*cyc),pad:(K*N)/(tk*R*tn*C),tk,tn};
  }
  return {simulate,tiled};
})();
