// ---- The lab's engine (browser and node): random directed graphs, the BFS harness of Theorem 1 (i),
// and a fixed-depth reader that composes edge lookups by repeated Boolean squaring. ----
// Written for this page; src/sweep.mjs runs the same code in node to produce inputs/sweep.json.
(function(root){
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // Two families. 'local' (long paths on purpose, the worst case Theorem 1 is about): nodes 0..N-1 on a line,
  // forward edges i->i+1 (p 0.9), i->i+2 (p 0.3), i->i+3 (p 0.15), rare backward edges (p 1.5/N); s = 0, t = N-1.
  // Half the graphs (a coin per graph) get every edge across one random cut removed, so t is unreachable; in the
  // other half any gap in the line is bridged, so t is reachable and about N/1.3 hops away.
  // 'random' (typical short paths): every ordered pair is an edge with p = 1.6/N, s and t drawn at random.
  function graph(N,fam,seed){const r=rng(seed*7919+N*131+(fam==='local'?1:2)),A=[];for(let i=0;i<N;i++)A.push(new Uint8Array(N));
    if(fam==='local'){const P=[0,0.9,0.3,0.15];for(let i=0;i<N;i++){for(let d=1;d<=3;d++)if(i+d<N&&r()<P[d])A[i][i+d]=1;for(let j=0;j<i;j++)if(r()<1.5/N)A[i][j]=1}
      const cut=r()<0.5,c=Math.floor(r()*(N-1));
      if(cut){for(let i=0;i<=c;i++)for(let j=c+1;j<N;j++)A[i][j]=0}
      else for(let i=0;i<N-1;i++){let x=0;for(let a=Math.max(0,i-2);a<=i;a++)for(let b=i+1;b<=Math.min(N-1,a+3);b++)x|=A[a][b];if(!x)A[i][i+1]=1}
      return {N,A,s:0,t:N-1,fam,seed,cut:cut?c:-1}}
    for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(i!==j&&r()<1.6/N)A[i][j]=1;
    const s=Math.floor(r()*N);let t=Math.floor(r()*(N-1));if(t>=s)t++;return {N,A,s,t,fam,seed}}
  // Theorem 1 (i): R (visited) and F (frontier) as N-bit vectors; each round queries E(u,v) for u in F, v not in R.
  // Returns every round, so the page can step through it. Each query is one call of the AC0 primitive.
  function bfs(g){const {N,A,s,t}=g,R=new Uint8Array(N);let F=[s];R[s]=1;const rounds=[];let calls=0;
    while(F.length){const nx=[],q=[];for(const u of F)for(let v=0;v<N;v++)if(!R[v]){calls++;q.push([u,v]);if(A[u][v]&&nx.indexOf(v)<0)nx.push(v)}
      nx.forEach(v=>R[v]=1);rounds.push({frontier:F.slice(),found:nx.slice(),queries:q.length,calls,visited:[...R]});F=nx}
    // distance of t: the round in which it was found (0 if s = t)
    let d=s===t?0:-1;rounds.forEach((rd,i)=>{if(d<0&&rd.found.indexOf(t)>=0)d=i+1});
    return {rounds,calls,reach:!!R[t],dist:d,bitsState:3*N}}
  // The fixed-depth reader: layer 0 holds one-hop reachability (I or A); each further layer squares the Boolean
  // matrix (an OR of N ANDs per entry, constant depth), so after k layers it knows every pair within 2^k hops.
  // It answers yes if t is within that horizon, no otherwise; it cannot tell "too far" from "unreachable".
  function reader(g,k){const {N,A,s,t}=g;let R=[];for(let i=0;i<N;i++){const row=new Uint8Array(N);for(let j=0;j<N;j++)row[j]=(i===j||A[i][j])?1:0;R.push(row)}
    for(let l=0;l<k;l++){const S=[];for(let i=0;i<N;i++){const row=new Uint8Array(N);for(let m=0;m<N;m++)if(R[i][m]){const Rm=R[m];for(let j=0;j<N;j++)if(Rm[j])row[j]=1}S.push(row)}R=S}
    return {yes:!!R[s][t],seen:[...R[s]],horizon:2**k,gates:k*N*N*N}}
  // The sweep uses the exact equivalence: the reader with k layers is right iff t is unreachable or dist(s,t) <= 2^k.
  function sweep(fam,Ns,Ks,G){const out={fam,Ns,Ks,G,acc:{},calls:[],rounds:[],reach:[],dist:[]};Ks.forEach(k=>out.acc[k]=[]);
    Ns.forEach(N=>{let c=0,ro=0,re=0,ds=0;const ok={};Ks.forEach(k=>ok[k]=0);
      for(let s=1;s<=G;s++){const g=graph(N,fam,s),b=bfs(g);c+=b.calls;ro+=b.rounds.length;if(b.reach){re++;ds+=b.dist}
        Ks.forEach(k=>{const yes=b.reach&&b.dist<=2**k;if(yes===b.reach)ok[k]++})}
      Ks.forEach(k=>out.acc[k].push(ok[k]/G));out.calls.push(c/G);out.rounds.push(ro/G);out.reach.push(re/G);out.dist.push(re?ds/re:0)});
    return out}
  const GR={rng,graph,bfs,reader,sweep};
  if(typeof module!=='undefined'&&module.exports)module.exports=GR;else root.GR=GR;
})(typeof window!=='undefined'?window:globalThis);
