// ---- Reused from the Topic: rl long Reading tab (src/for_children/reading_full/21_js_rd_engine.js), trimmed to the
// student MRP and MDP and the 4x3 world (window.RDE). src/check_engine.mjs checks it against src/recompute_rd.py.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){const u1=r(),u2=r();return Math.sqrt(-2*Math.log(1-u1))*Math.cos(2*Math.PI*u2)}
  // solve A x = b by Gaussian elimination with partial pivoting
  function solve(A,b){const n=b.length,M=A.map((r,i)=>r.concat([b[i]]));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/M[c][c];for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
    return M.map((r,i)=>r[n]/r[i])}

  // ---- 1. Silver's student Markov reward process (Lecture 2). Sleep is terminal (value 0). ----
  const MRP={names:['Class 1','Class 2','Class 3','Pass','Pub','Facebook'],
    R:[-2,-2,-2,10,1,-1],
    // P[s] = list of [successor index, probability]; index 6 is Sleep
    P:[[[1,.5],[5,.5]],[[2,.8],[6,.2]],[[3,.6],[4,.4]],[[6,1]],[[0,.2],[1,.4],[2,.4]],[[5,.9],[0,.1]]]};
  function mrpValues(g){const n=6,A=[],b=[];for(let s=0;s<n;s++){const row=new Array(n).fill(0);row[s]=1;
      MRP.P[s].forEach(([t,p])=>{if(t<n)row[t]-=g*p});A.push(row);b.push(MRP.R[s])}
    return solve(A,b)}
  // one sampled episode from a start state: list of states visited and the discounted return
  function mrpEpisode(start,g,r){let s=start,G=0,d=1;const path=[s],rew=[];
    for(let k=0;k<1000&&s<6;k++){const R=MRP.R[s];G+=d*R;d*=g;rew.push(R);let u=r(),acc=0,nx=MRP.P[s][MRP.P[s].length-1][0];
      for(const [t,p] of MRP.P[s]){acc+=p;if(u<acc){nx=t;break}}s=nx;path.push(s)}
    return {path,rew,G}}

  // ---- 2. The student MDP: states C1, C2, C3, Facebook; two actions each ----
  // A[s] = [[name, reward, [[succ,prob],...]], ...]; successor 4 is the end (Sleep, or Pass then Sleep)
  const MDP={names:['Class 1','Class 2','Class 3','Facebook'],
    A:[[['Study',-2,[[1,1]]],['Facebook',-1,[[3,1]]]],
       [['Study',-2,[[2,1]]],['Sleep',0,[[4,1]]]],
       [['Study',10,[[4,1]]],['Pub',1,[[0,.2],[1,.4],[2,.4]]]],
       [['Quit',0,[[0,1]]],['Facebook',-1,[[3,1]]]]]};
  // pi[s] = probability of the first action in state s
  function mdpEval(pi,g){const n=4,A=[],b=[];for(let s=0;s<n;s++){const row=new Array(n).fill(0);row[s]=1;let rb=0;
      MDP.A[s].forEach((a,i)=>{const w=i?1-pi[s]:pi[s];rb+=w*a[1];a[2].forEach(([t,p])=>{if(t<n)row[t]-=g*w*p})});A.push(row);b.push(rb)}
    const V=solve(A,b);return {V,Q:qFrom(V,g)}}
  function qFrom(V,g){return MDP.A.map(acts=>acts.map(a=>a[1]+g*a[2].reduce((s,[t,p])=>s+p*(t<4?V[t]:0),0)))}
  function mdpOptimal(g){let V=[0,0,0,0];for(let k=0;k<5000;k++){const Q=qFrom(V,g),nv=Q.map(q=>Math.max(...q));
      const d=Math.max(...nv.map((v,i)=>Math.abs(v-V[i])));V=nv;if(d<1e-13)break}return {V,Q:qFrom(V,g)}}

  // ---- 4. Russell and Norvig's 4x3 world: value iteration against Q-learning from samples ----
  // cells (x,y), x 0..3, y 0..2; wall (1,1); terminals (3,2) +1 and (3,1) -1; reward -0.04 per step; gamma 1;
  // the intended move happens with 0.8, each perpendicular move with 0.1; bumping a wall stays put.
  const GW=(function(){const S=[];for(let y=0;y<3;y++)for(let x=0;x<4;x++)if(!(x===1&&y===1))S.push([x,y]);
    const idx=(x,y)=>S.findIndex(c=>c[0]===x&&c[1]===y);
    const D=[[0,1],[1,0],[0,-1],[-1,0]];// up, right, down, left
    const term={};term[idx(3,2)]=1;term[idx(3,1)]=-1;
    function mv(s,d){const [x,y]=S[s],nx=x+D[d][0],ny=y+D[d][1];const j=idx(nx,ny);return j<0?s:j}
    // outcomes of action a: [[succ,prob],...]
    function out(s,a){return [[mv(s,a),.8],[mv(s,(a+1)%4),.1],[mv(s,(a+3)%4),.1]]}
    return {S,idx,D,term,mv,out,start:idx(0,0),r:-0.04}})();
  function gwQ(V,s){return [0,1,2,3].map(a=>GW.r+GW.out(s,a).reduce((t,[n,p])=>t+p*V[n],0))}
  function gwValueIteration(K){const n=GW.S.length;let V=new Array(n).fill(0);Object.keys(GW.term).forEach(s=>V[s]=GW.term[s]);
    const hist=[V.slice()];for(let k=0;k<K;k++){const nv=V.map((v,s)=>s in GW.term?v:Math.max(...gwQ(V,s)));V=nv;hist.push(V.slice())}return hist}
  // Q-learning with epsilon-greedy behaviour, exploring starts (each episode starts in a random non-terminal cell)
  // and step size 1/N(s,a)^0.8; snapshots at the listed episode counts
  const GW_NONT=GW.S.map((c,i)=>i).filter(i=>!(i in GW.term));
  function gwQLearning(seed,eps,marks){const r=rng(seed),n=GW.S.length,Q=[],N=[];for(let s=0;s<n;s++){Q.push([0,0,0,0]);N.push([0,0,0,0])}
    const snaps=[],last=marks[marks.length-1];let samples=0;
    for(let e=1;e<=last;e++){let s=GW_NONT[Math.floor(r()*GW_NONT.length)];const path=[s];
      for(let k=0;k<500&&!(s in GW.term);k++){let a;const u=r(),ua=r();
        if(u<eps)a=Math.floor(ua*4);else{a=0;for(let b=1;b<4;b++)if(Q[s][b]>Q[s][a])a=b}
        const v=r();const d=v<.8?a:v<.9?(a+1)%4:(a+3)%4;const s2=GW.mv(s,d);
        const tgt=GW.r+(s2 in GW.term?GW.term[s2]:Math.max(...Q[s2]));N[s][a]++;Q[s][a]+=(tgt-Q[s][a])/Math.pow(N[s][a],0.8);samples++;s=s2;path.push(s)}
      if(marks.indexOf(e)>=0)snaps.push({ep:e,samples,V:Q.map((q,s)=>s in GW.term?GW.term[s]:Math.max(...q)),pol:Q.map(q=>q.indexOf(Math.max(...q))),path})}
    return snaps}

  root.RDE={rng,gauss,solve,MRP,mrpValues,mrpEpisode,MDP,mdpEval,mdpOptimal,GW,gwQ,gwValueIteration,gwQLearning};
})(typeof window!=='undefined'?window:globalThis);
