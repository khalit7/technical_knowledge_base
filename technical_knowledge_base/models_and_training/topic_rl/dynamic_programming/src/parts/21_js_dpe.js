// ---- DP engine (window.DPE): worlds, backups, sweeps and every method the page animates ----
// Pure functions, no DOM. src/check_engine.mjs runs this file in Node and compares its outputs with
// src/recompute.py, an independent Python implementation, through src/recompute.json.
(function(root){
  // ---------- linear solve (Gaussian elimination, partial pivoting) ----------
  function solve(A,b){const n=b.length,M=A.map((r,i)=>r.concat([b[i]]));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/M[c][c];if(f!==0)for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
    return M.map((r,i)=>r[n]/r[i])}

  // ---------- worlds ----------
  // A world: n states (terminals included), term[s] true for terminals, tv[s] their fixed value,
  // nA actions, out[s][a] = list of [successor, probability, reward] (merged), drawing layout cells[s] = [x, y].
  const ARW=['↑','→','↓','←'],DX=[[0,-1],[1,0],[0,1],[-1,0]];// up, right, down, left; y grows downwards
  function grid(o){// o: {W,H,walls:[[x,y]],term:{'x,y':value},stepR, goalR:{'x,y':reward on entering}, slip}
    const cells=[],id={};for(let y=0;y<o.H;y++)for(let x=0;x<o.W;x++){if((o.walls||[]).some(w=>w[0]===x&&w[1]===y))continue;id[x+','+y]=cells.length;cells.push([x,y])}
    const n=cells.length,term=cells.map(c=>(c[0]+','+c[1]) in o.term),tv=cells.map(c=>term[cells.indexOf(c)]?o.term[c[0]+','+c[1]]:0);
    const mv=(s,d)=>{const [x,y]=cells[s],k=(x+DX[d][0])+','+(y+DX[d][1]);return k in id?id[k]:s};
    const out=cells.map((c,s)=>{if(term[s])return [];return [0,1,2,3].map(a=>{const outs=o.slip?[[a,1-2*o.slip],[(a+1)%4,o.slip],[(a+3)%4,o.slip]]:[[a,1]];const m={};
      outs.forEach(([d,p])=>{const t=mv(s,d);const key=t;const r=o.stepR+((o.goalR&&(cells[t][0]+','+cells[t][1]) in o.goalR&&t!==s)?o.goalR[cells[t][0]+','+cells[t][1]]:0);
        if(m[key])m[key][1]+=p;else m[key]=[t,p,r]});return Object.values(m).sort((u,v)=>u[0]-v[0])})});
    return {n,nA:4,term,tv,out,cells,W:o.W,H:o.H,walls:o.walls||[],aname:['up','right','down','left'],arw:ARW,id}}
  const W={};
  // Sutton and Barto Example 4.1: 4x4, the two shaded corners are one terminal (drawn twice), -1 per move, gamma 1
  W.sb44=Object.assign(grid({W:4,H:4,term:{'0,0':0,'3,3':0},stepR:-1}),{key:'sb44',name:'Sutton and Barto 4×4 (Example 4.1)',g:1});
  // Silver Lecture 3 "shortest path": 4x4, one goal top left, -1 per move
  W.silver=Object.assign(grid({W:4,H:4,term:{'0,0':0},stepR:-1}),{key:'silver',name:'Silver\'s shortest path (Lecture 3)',g:1});
  // Russell and Norvig 4x3: wall at (1,1) counting x from the left and y from the bottom; exits +1 and -1 hold their value;
  // -0.04 per step; the intended move with 0.8, each perpendicular move with 0.1
  W.aima=Object.assign(grid({W:4,H:3,walls:[[1,1]],term:{'3,0':1,'3,1':-1},stepR:-0.04,slip:0.1}),{key:'aima',name:'Russell and Norvig 4×3 (AIMA Figure 17.1)',g:1});
  // Sutton and Barto Example 8.1 Dyna maze (layout as in Zhang's reproduction code): 6 rows x 9 columns, +1 on reaching the goal
  W.maze=Object.assign(grid({W:9,H:6,walls:[[2,1],[2,2],[2,3],[7,0],[7,1],[7,2],[5,4]],term:{'8,0':0},stepR:0,goalR:{'8,0':1}}),{key:'maze',name:'Dyna maze (Sutton and Barto Example 8.1)',g:0.95});
  // the page's corridor: A, B, C, then the goal G; right from C pays 10; left from A bumps the wall
  W.corr=(function(){const out=[[ [[0,1,0]],[[1,1,0]] ],[ [[0,1,0]],[[2,1,0]] ],[ [[1,1,0]],[[3,1,10]] ],[]];
    return {key:'corr',name:'Corridor',n:4,nA:2,term:[false,false,false,true],tv:[0,0,0,0],out,cells:[[0,0],[1,0],[2,0],[3,0]],W:4,H:1,walls:[],aname:['left','right'],arw:['←','→'],g:0.9,names:['A','B','C','G']}})();

  // ---------- backups ----------
  const tval=(w,V,s)=>w.term[s]?w.tv[s]:V[s];
  function q(w,V,g,s,a){let t=0;for(const [s2,p,r] of w.out[s][a])t+=p*(r+g*tval(w,V,s2));return t}
  function qs(w,V,g,s){const r=[];for(let a=0;a<w.nA;a++)r.push(q(w,V,g,s,a));return r}
  // look-ups: one per (action, successor) pair read from the model
  const look=(w,s,acts)=>acts.reduce((t,a)=>t+w.out[s][a].length,0);
  const allA=w=>[...Array(w.nA).keys()];
  function init(w){return w.tv.slice()}// non-terminals start at 0; terminals hold their fixed value
  const uniform=w=>w.out.map(()=>Array(w.nA).fill(1/w.nA));
  function evalBackup(w,V,g,pi,s){let v=0;for(let a=0;a<w.nA;a++)if(pi[s][a]>0)v+=pi[s][a]*q(w,V,g,s,a);return v}
  function viBackup(w,V,g,s){return Math.max(...qs(w,V,g,s))}
  const states=(w,order)=>{const o=[];for(let s=0;s<w.n;s++)if(!w.term[s])o.push(s);return order==='rev'?o.reverse():o};
  // one sweep; kind 'eval' (needs pi) or 'vi'; inplace overwrites as it goes
  function sweep(w,V,g,kind,pi,inplace,order){const src=V,dst=V.slice();const rd=inplace?dst:src;let d=0,cost=0;
    for(const s of states(w,order)){const v=kind==='vi'?viBackup(w,rd,g,s):evalBackup(w,rd,g,pi,s);d=Math.max(d,Math.abs(v-src[s]));dst[s]=v;
      cost+=kind==='vi'?look(w,s,allA(w)):look(w,s,allA(w).filter(a=>pi[s][a]>0))}
    return {V:dst,d,cost}}
  // greedy action sets (all actions within tol of the best)
  function greedy(w,V,g,tol){tol=tol==null?1e-9:tol;return w.out.map((o,s)=>{if(w.term[s])return [];const Q=qs(w,V,g,s),m=Math.max(...Q);return Q.map((x,a)=>x>=m-tol*Math.max(1,Math.abs(m))?a:-1).filter(a=>a>=0)})}
  // exact value of a policy: (I - g P_pi) V = R_pi over non-terminals
  function evalExact(w,pi,g){const S=states(w),ix={};S.forEach((s,i)=>ix[s]=i);const A=[],b=[];
    S.forEach(s=>{const row=Array(S.length).fill(0);row[ix[s]]=1;let rb=0;
      for(let a=0;a<w.nA;a++){const pa=pi[s][a];if(!pa)continue;for(const [s2,p,r] of w.out[s][a]){rb+=pa*p*r;if(w.term[s2])rb+=pa*p*g*w.tv[s2];else row[ix[s2]]-=g*pa*p}}
      A.push(row);b.push(rb)});
    const x=solve(A,b),V=init(w);S.forEach((s,i)=>V[s]=x[i]);return V}
  function vstar(w,g){let V=init(w);for(let k=0;k<100000;k++){const r=sweep(w,V,g,'vi',null,false);V=r.V;if(r.d<1e-13)break}return V}
  const maxErr=(w,V,T)=>{let m=0;for(let s=0;s<w.n;s++)if(!w.term[s])m=Math.max(m,Math.abs(V[s]-T[s]));return m};
  const detPi=(w,acts)=>acts.map((a,s)=>{const r=Array(w.nA).fill(0);if(!w.term[s])r[a]=1;return r});

  // ---------- methods, run against a budget of model look-ups ----------
  // kind: 'pe' (evaluate the uniform random policy), 'vi', 'pi' (full evaluation to theta), 'mpi' (k evaluation sweeps), 'ps' (prioritised sweeping)
  // opts: {inplace, order, k, theta}. Returns a list of atomic operations' results: {V, pol (greedy sets or the stored policy), cost (cumulative look-ups),
  // backups (cumulative), sweeps, label, last (states just backed up), stored (true when the policy is stored)}.
  function run(w,g,kind,opts,maxCost){opts=opts||{};const theta=opts.theta==null?1e-4:opts.theta;let V=init(w);const ops=[];let cost=0,backups=0,sweeps=0;
    const nS=states(w).length;
    const push=(label,last,extra)=>ops.push(Object.assign({V:V.slice(),cost,backups,sweeps,label,last},extra||{}));
    push('start: every non-terminal value is 0',[],{d:Infinity});
    if(kind==='pe'||kind==='vi'){const pi=uniform(w);
      while(cost<maxCost){const r=sweep(w,V,g,kind==='pe'?'eval':'vi',pi,!!opts.inplace,opts.order);V=r.V;cost+=r.cost;backups+=nS;sweeps++;
        push((kind==='pe'?'evaluation':'value iteration')+' sweep '+sweeps,states(w,opts.order),{d:r.d});if(r.d<1e-12)break}
      return ops}
    if(kind==='pi'||kind==='mpi'){let pi=uniform(w),acts=null,it=0,ev=0,stable=false;
      // the first policy is the uniform random one (proper in every world here); after the first improvement policies are deterministic
      while(cost<maxCost){// evaluation
        const r=sweep(w,V,g,'eval',pi,!!opts.inplace,opts.order);V=r.V;cost+=r.cost;backups+=nS;sweeps++;ev++;
        const done=kind==='mpi'?ev>=opts.k:r.d<theta;
        push('policy '+it+': evaluation sweep '+ev+(kind==='pi'&&done?' (largest change below '+theta+')':''),states(w,opts.order),{d:r.d,stored:it>0,acts:acts&&acts.slice(),pi:it});
        if(!done)continue;
        // improvement: look at every action of every state
        const G=greedy(w,V,g);const na=G.map((set,s)=>w.term[s]?-1:(acts&&set.indexOf(acts[s])>=0?acts[s]:set[0]));
        let changed=!acts||na.some((a,s)=>a!==acts[s]);
        for(const s of states(w))cost+=look(w,s,allA(w));
        acts=na;pi=detPi(w,acts);it++;ev=0;
        if(kind==='pi'&&!changed){push('improvement: no action changes, the policy is stable and optimal',[],{d:0,stored:true,acts:acts.slice(),pi:it,stop:true});break}
        if(kind==='mpi'&&!changed&&r.d<theta){push('improvement: no change and values settled: stop',[],{d:0,stored:true,acts:acts.slice(),pi:it,stop:true});break}
        push('improvement '+it+': greedy on these values'+(changed?'':' (no action changed)'),[],{d:r.d,stored:true,acts:acts.slice(),pi:it,improve:true})}
      return ops}
    if(kind==='ps'){// model-known prioritised sweeping: back up the state with the largest priority; push gamma * max_a P(s|p,a) * |change| onto each predecessor
      const pred=Array.from({length:w.n},()=>({}));for(let p=0;p<w.n;p++)for(let a=0;a<w.nA;a++)for(const [s2,pr] of (w.out[p][a]||[]))if(!w.term[s2])pred[s2][p]=Math.max(pred[s2][p]||0,pr);
      const pri=Array(w.n).fill(0);for(const s of states(w)){pri[s]=Math.abs(viBackup(w,V,g,s)-V[s]);cost+=look(w,s,allA(w))}
      push('priorities: every state\'s Bellman error, computed once (one sweep of look-ups)',[],{d:Infinity});
      const tiny=1e-12;
      while(cost<maxCost){let s=-1,m=tiny;for(const x of states(w))if(pri[x]>m){m=pri[x];s=x}if(s<0)break;
        const v=viBackup(w,V,g,s),dv=Math.abs(v-V[s]);V[s]=v;pri[s]=0;cost+=look(w,s,allA(w));backups++;
        for(const p in pred[s]){pri[p]+=g*pred[s][p]*dv;cost+=1}
        push('back up the state with the largest priority',[s],{d:dv})}
      return ops}
    throw new Error('unknown method '+kind)}
  // the state of a run after a budget of look-ups: the last operation that fits
  function at(ops,budget){let i=0;while(i+1<ops.length&&ops[i+1].cost<=budget)i++;return i}

  // ---------- the corridor, backup by backup (for the Reading animation) ----------
  // mode 'sync' (two arrays), 'cba' or 'abc' (in place, that order), 'pe' (evaluate the uniform random policy, synchronous)
  function corridorSteps(mode,g,maxSweeps){const w=W.corr;let V=[0,0,0,0];const steps=[{V:V.slice(),s:-1,sweep:0}];
    const order=mode==='cba'?[2,1,0]:[0,1,2];const pi=uniform(w);
    for(let k=1;k<=maxSweeps;k++){const old=V.slice(),rd=(mode==='sync'||mode==='pe')?old:V;let d=0;
      for(const s of order){const Q=qs(w,rd,g,s),v=mode==='pe'?0.5*Q[0]+0.5*Q[1]:Math.max(...Q);d=Math.max(d,Math.abs(v-old[s]));V[s]=v;steps.push({V:V.slice(),s,sweep:k,Q,read:rd.slice()})}
      steps[steps.length-1].d=d;if(d<1e-12)break}
    return steps}

  // ---------- contraction: two value-iteration runs from different starts ----------
  function twoRuns(w,g,K,V0a,V0b){let a=V0a.slice(),b=V0b.slice();const T=vstar(w,g),out=[{da:maxErr(w,a,T),db:maxErr(w,b,T),dab:maxErr(w,a,b)}];
    for(let k=0;k<K;k++){a=sweep(w,a,g,'vi',null,false).V;b=sweep(w,b,g,'vi',null,false).V;out.push({da:maxErr(w,a,T),db:maxErr(w,b,T),dab:maxErr(w,a,b)})}return out}
  // sweeps needed to cut an error by a factor 1/eps at discount g, and the stopping bound
  const sweepsFor=(g,eps)=>Math.ceil(Math.log(1/eps)/Math.log(1/g));
  const stopBound=(g,theta)=>g*theta/(1-g);

  // ---------- the gambler's problem (Sutton and Barto Example 4.3) ----------
  // capital 1..99, stake 1..min(s,100-s) (stake 0 changes nothing and is left out of the argmax), +1 on reaching 100, gamma 1
  function gambler(ph,sweepsMax,theta){const V=Array(101).fill(0);V[100]=1;const hist=[V.slice()];
    for(let k=0;k<sweepsMax;k++){let d=0;for(let s=1;s<100;s++){let m=-1;for(let a=1;a<=Math.min(s,100-s);a++){const v=ph*V[s+a]+(1-ph)*V[s-a];if(v>m)m=v}d=Math.max(d,Math.abs(m-V[s]));V[s]=m}
      hist.push(V.slice());if(d<theta)break}
    // greedy stakes: smallest stake within tol of the best, and the full set of ties
    const tol=1e-9,pol=[],ties=[];for(let s=1;s<100;s++){let m=-1;const vs=[];for(let a=1;a<=Math.min(s,100-s);a++){const v=ph*V[s+a]+(1-ph)*V[s-a];vs.push(v);if(v>m)m=v}
      const t=[];vs.forEach((v,i)=>{if(v>=m-tol)t.push(i+1)});ties.push(t);pol.push(t[0])}
    return {hist,V,pol,ties}}

  // ---------- curse of dimensionality ----------
  function curse(d,v,m,b){const n=Math.pow(v,d);return {n,dense:m*n*n,sparse:m*n*b,policies:n*Math.log10(m)}}

  root.DPE={solve,W,q,qs,init,uniform,sweep,greedy,evalExact,vstar,maxErr,run,at,corridorSteps,twoRuns,sweepsFor,stopBound,gambler,curse,states,look,detPi};
})(typeof window!=='undefined'?window:globalThis);
