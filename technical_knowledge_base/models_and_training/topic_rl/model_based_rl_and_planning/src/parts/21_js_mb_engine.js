// ---- Computation engine for every visual on this page (no drawing here) ----
// A line-by-line mirror of src/mb_ref.py; src/recompute.py writes src/expected.json and src/check_engine.mjs compares.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in mb_ref.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  // index of the largest value; ties broken uniformly at random (one draw only when there is a tie)
  function argmaxR(v,r){let m=-Infinity,c=0,a=0;for(let k=0;k<v.length;k++){if(v[k]>m){m=v[k];a=k;c=1}else if(v[k]===m)c++}
    if(c===1)return a;let j=Math.floor(r()*c);for(let k=0;k<v.length;k++)if(v[k]===m){if(j===0)return k;j--}return a}

  // ======================= 1. Dyna-Q and Dyna-Q+ (Sutton and Barto 8.2, 8.3) =======================
  const DR=[-1,1,0,0],DC=[0,0,1,-1];   // up, down, right, left (the book's order)
  const rowWall=(r,c0,c1)=>{const w=[];for(let c=c0;c<c1;c++)w.push([r,c]);return w};
  const MAZES={
    dyna:{R:6,C:9,start:[2,0],goal:[0,8],walls:[[1,2],[2,2],[3,2],[0,7],[1,7],[2,7],[4,5]]},
    block:{R:6,C:9,start:[5,3],goal:[0,8],walls:rowWall(3,0,8),walls2:rowWall(3,1,9)},
    short:{R:6,C:9,start:[5,3],goal:[0,8],walls:rowWall(3,1,9),walls2:rowWall(3,1,8)}};
  function wallset(mz,key){const s=new Set();for(const [r,c] of mz[key||'walls'])s.add(r*mz.C+c);return s}
  function mazeStep(mz,walls,s,a){const r=Math.floor(s/mz.C),c=s%mz.C,r2=r+DR[a],c2=c+DC[a];
    if(r2<0||r2>=mz.R||c2<0||c2>=mz.C||walls.has(r2*mz.C+c2))return s;return r2*mz.C+c2}
  function DynaAgent(mz,n,alpha,eps,gamma,rA,rP,plus,kappa){
    const S=mz.R*mz.C,ag={mz,S,n,alpha,eps,gamma,rA,rP,plus:!!plus,kappa:kappa||0,goal:mz.goal[0]*mz.C+mz.goal[1],
      Q:[],mR:new Float64Array(S*4),mS:new Int32Array(S*4),mT:new Float64Array(S*4),obs:[],acts:new Array(S).fill(null),t:0,updates:0};
    for(let s=0;s<S;s++)ag.Q.push([0,0,0,0]);
    ag.qmax=s=>s===ag.goal?0:Math.max(ag.Q[s][0],ag.Q[s][1],ag.Q[s][2],ag.Q[s][3]);
    ag.act=s=>{if(ag.rA()<ag.eps)return Math.floor(ag.rA()*4);return argmaxR(ag.Q[s],ag.rA)};
    // one real step: act, direct RL (d), model learning (e), n planning updates (f). Returns [a, s2, r].
    ag.realStep=(s,walls)=>{const a=ag.act(s),s2=mazeStep(mz,walls,s,a),r=s2===ag.goal?1:0;ag.t++;
      const q=ag.Q[s];q[a]+=ag.alpha*(r+ag.gamma*ag.qmax(s2)-q[a]);
      if(ag.acts[s]===null){ag.obs.push(s);ag.acts[s]=[];
        if(ag.plus)for(let b=0;b<4;b++){ag.mR[s*4+b]=0;ag.mS[s*4+b]=s;ag.mT[s*4+b]=0}}
      if(!ag.acts[s].includes(a))ag.acts[s].push(a);
      ag.mR[s*4+a]=r;ag.mS[s*4+a]=s2;ag.mT[s*4+a]=ag.t;
      for(let i=0;i<ag.n;i++){const ps=ag.obs[Math.floor(ag.rP()*ag.obs.length)];let pa;
        if(ag.plus)pa=Math.floor(ag.rP()*4);else{const L=ag.acts[ps];pa=L[Math.floor(ag.rP()*L.length)]}
        let pr=ag.mR[ps*4+pa];if(ag.plus)pr+=ag.kappa*Math.sqrt(ag.t-ag.mT[ps*4+pa]);
        const ps2=ag.mS[ps*4+pa],pq=ag.Q[ps];pq[pa]+=ag.alpha*(pr+ag.gamma*ag.qmax(ps2)-pq[pa]);ag.updates++}
      return [a,s2,r]};
    ag.policy=()=>{const p=[];for(let x=0;x<S;x++){const q=ag.Q[x],m=Math.max(q[0],q[1],q[2],q[3]),mn=Math.min(q[0],q[1],q[2],q[3]);p.push(mn===m?-1:q.indexOf(m))}return p};
    return ag}
  const startOf=mz=>mz.start[0]*mz.C+mz.start[1];
  // Figure 8.2: mean steps per episode over runs (run k uses seeds 1000+k and 2000+k for every n)
  function dynaCurves(nList,runs,episodes,p){const mz=MAZES.dyna,walls=wallset(mz),st=startOf(mz),out={};
    for(const n of nList){const tot=new Float64Array(episodes),first=[];
      for(let run=0;run<runs;run++){const ag=DynaAgent(mz,n,p.alpha,p.eps,p.gamma,rng(1000+run),rng(2000+run));
        for(let e=0;e<episodes;e++){let s=st,k=0;for(;;){s=ag.realStep(s,walls)[1];k++;if(s===ag.goal)break}tot[e]+=k;if(e===0)first.push(k)}}
      out[n]={mean:Array.from(tot,x=>x/runs),first}}
    return out}
  // Figure 8.3 as an animation: run `run` with n planning steps; frames of episode 2 (state, greedy policy, counters)
  function dynaEpisode2(n,run,p,maxFrames){const mz=MAZES.dyna,walls=wallset(mz),st=startOf(mz);
    const ag=DynaAgent(mz,n,p.alpha,p.eps,p.gamma,rng(1000+run),rng(2000+run));let s=st,k1=0;
    for(;;){s=ag.realStep(s,walls)[1];k1++;if(s===ag.goal)break}
    const frames=[{pos:st,pol:ag.policy(),k:0,upd:ag.updates,vS:ag.qmax(st)}];s=st;let k=0;
    for(;;){s=ag.realStep(s,walls)[1];k++;frames.push({pos:s,pol:ag.policy(),k,upd:ag.updates,vS:ag.qmax(st)});if(s===ag.goal||k>=(maxFrames||1e9))break}
    return {ep1:k1,frames}}
  function dynaSnapshot(n,run,p){const e=dynaEpisode2(n,run,p),len=e.frames.length-1,half=Math.floor(len/2),f=e.frames[half];
    return {lens:[e.ep1,len],half,pos:f.pos,policy:f.pol,arrows:f.pol.filter(x=>x>=0).length}}
  // Figures 8.4 and 8.5: cumulative reward by step, averaged over runs; walls change after `sw` steps
  function changingMaze(name,plus,steps,sw,n,alpha,eps,gamma,kappa,runs,seed0){seed0=seed0==null?5000:seed0;
    const mz=MAZES[name],w1=wallset(mz,'walls'),w2=wallset(mz,'walls2'),st=startOf(mz),cum=new Float64Array(steps);
    for(let run=0;run<runs;run++){const ag=DynaAgent(mz,n,alpha,eps,gamma,rng(seed0+run),rng(seed0+1000+run),plus,kappa);let s=st,c=0;
      for(let t=0;t<steps;t++){const walls=t<sw?w1:w2,o=ag.realStep(s,walls);s=o[1];if(o[2]>0){c++;s=st}cum[t]+=c}}
    return Array.from(cum,x=>x/runs)}

  // ======================= 2. Tic-tac-toe: exact solution, network, PUCT and UCT =======================
  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function winner(b){for(const [i,j,k] of LINES)if(b[i]!==0&&b[i]===b[j]&&b[j]===b[k])return b[i];return 0}
  function mover(b){let x=0,o=0;for(const v of b){if(v===1)x++;else if(v===-1)o++}return x===o?1:-1}
  function terminal(b){const w=winner(b);if(w)return [true,w];for(const v of b)if(v===0)return [false,0];return [true,0]}
  function termValue(b){const w=terminal(b)[1];return w===0?0:(w===mover(b)?1:-1)}
  const SOLVED=new Map();   // key: board joined; value [v, optimal moves]
  function solve(b){const key=b.join(',');if(SOLVED.has(key))return SOLVED.get(key)[0];
    if(terminal(b)[0]){SOLVED.set(key,[termValue(b),[]]);return termValue(b)}
    const m=mover(b),vals={};let best=-2;
    for(let a=0;a<9;a++)if(b[a]===0){const b2=b.slice();b2[a]=m;vals[a]=-solve(b2);if(vals[a]>best)best=vals[a]}
    const opt=[];for(let a=0;a<9;a++)if(a in vals&&vals[a]===best)opt.push(a);SOLVED.set(key,[best,opt]);return best}
  function solved(b){solve(b);return SOLVED.get(b.join(','))}
  function b64(s){const bin=atob(s),u=new Int8Array(bin.length);for(let i=0;i<bin.length;i++){const c=bin.charCodeAt(i);u[i]=c>127?c-256:c}return u}
  function dequant(d){const q=b64(d.q),sh=d.shape,rows=sh.length===2?sh[0]:1,cols=sh.length===2?sh[1]:sh[0],W=[];
    for(let r=0;r<rows;r++){const row=new Float64Array(cols);for(let c=0;c<cols;c++)row[c]=q[r*cols+c]*d.scale[r];W.push(row)}return sh.length===2?W:W[0]}
  function Net(w){const W1=dequant(w.W1),b1=dequant(w.b1),Wp=dequant(w.Wp),bp=dequant(w.bp),Wv=dequant(w.Wv),bv=dequant(w.bv),H=W1.length;
    function evaluate(b){const m=mover(b),x=new Float64Array(18);for(let i=0;i<9;i++){x[i]=b[i]===m?1:0;x[9+i]=b[i]===-m?1:0}
      const h=new Float64Array(H);for(let j=0;j<H;j++){let s=0;const row=W1[j];for(let i=0;i<18;i++)s+=row[i]*x[i];s+=b1[j];h[j]=s>0?s:0}
      const lg=new Float64Array(9);for(let a=0;a<9;a++){let s=0;const row=Wp[a];for(let j=0;j<H;j++)s+=row[j]*h[j];lg[a]=s+bp[a]}
      let s=0;const row=Wv[0];for(let j=0;j<H;j++)s+=row[j]*h[j];const v=Math.tanh(s+bv[0]);
      let mx=-Infinity;for(let a=0;a<9;a++)if(b[a]===0&&lg[a]>mx)mx=lg[a];
      const e=new Array(9);for(let a=0;a<9;a++)e[a]=b[a]===0?Math.exp(lg[a]-mx):0;let z=0;for(let a=0;a<9;a++)z+=e[a];
      return [e.map(x=>x/z),v]}
    return {evaluate}}
  const C_PUCT=1.25,UCT_C=Math.SQRT2;
  function TNode(b){const t=terminal(b)[0];return {b,P:null,N:[0,0,0,0,0,0,0,0,0],W:[0,0,0,0,0,0,0,0,0],kids:{},exp:false,term:t,tv:t?termValue(b):0}}
  // AlphaZero-style search: no rollouts; one leaf evaluated by the network per simulation
  function puct(net,b,sims,trace){const root=TNode(b.slice());const e0=net.evaluate(root.b);root.P=e0[0];root.exp=true;const tr=[];
    for(let i=0;i<sims;i++){let nd=root;const path=[];
      while(nd.exp&&!nd.term){let sN=0;for(let a=0;a<9;a++)sN+=nd.N[a];let best=-1,bs=-1e9;const sq=Math.sqrt(sN);
        for(let a=0;a<9;a++){if(nd.b[a]!==0)continue;const q=nd.N[a]?nd.W[a]/nd.N[a]:0,u=q+C_PUCT*nd.P[a]*sq/(1+nd.N[a]);if(u>bs+1e-12){bs=u;best=a}}
        path.push([nd,best]);if(!(best in nd.kids)){const b2=nd.b.slice();b2[best]=mover(nd.b);nd.kids[best]=TNode(b2)}nd=nd.kids[best]}
      let v,kind,newNode=false;if(nd.term){v=nd.tv;kind='terminal'}else{const e=net.evaluate(nd.b);nd.P=e[0];v=e[1];nd.exp=true;kind='net';newNode=true}
      const leafv=v;for(let k=path.length-1;k>=0;k--){const [par,a]=path[k];v=-v;par.N[a]++;par.W[a]+=v}
      if(trace)tr.push({path:path.map(x=>x[1]),kind,v:leafv,N:root.N.slice(),W:root.W.slice(),leafP:kind==='net'?nd.P.slice():null})}
    return {N:root.N,Q:root.N.map((n,a)=>n?root.W[a]/n:null),P:root.P,v0:e0[1],trace:tr,root}}
  // plain UCT with uniformly random playouts (Kocsis and Szepesvari 2006; four steps as in Browne et al. 2012)
  function uct(b,sims,r,trace){const root=TNode(b.slice()),tr=[];
    for(let i=0;i<sims;i++){let nd=root;const path=[];
      while(!nd.term){const untried=[];for(let a=0;a<9;a++)if(nd.b[a]===0&&!(a in nd.kids))untried.push(a);
        if(untried.length){const a=untried[Math.floor(r()*untried.length)],b2=nd.b.slice();b2[a]=mover(nd.b);nd.kids[a]=TNode(b2);path.push([nd,a]);nd=nd.kids[a];break}
        let sN=0;for(let a=0;a<9;a++)sN+=nd.N[a];let best=-1,bs=-1e9;const lg=Math.log(sN);
        for(let a=0;a<9;a++){if(nd.b[a]!==0)continue;const u=nd.W[a]/nd.N[a]+UCT_C*Math.sqrt(lg/nd.N[a]);if(u>bs+1e-12){bs=u;best=a}}
        path.push([nd,best]);nd=nd.kids[best]}
      const bb=nd.b.slice(),roll=[];
      while(!terminal(bb)[0]){const legal=[];for(let a=0;a<9;a++)if(bb[a]===0)legal.push(a);const a=legal[Math.floor(r()*legal.length)];bb[a]=mover(bb);roll.push(a)}
      const res=termValue(bb);let v=roll.length%2===0?res:-res;const leafv=v;
      for(let k=path.length-1;k>=0;k--){const [par,a]=path[k];v=-v;par.N[a]++;par.W[a]+=v}
      if(trace)tr.push({path:path.map(x=>x[1]),roll,v:leafv,N:root.N.slice(),W:root.W.slice()})}
    return {N:root.N,Q:root.N.map((n,a)=>n?root.W[a]/n:null),trace:tr,root}}
  function top(N){let best=0;for(let a=0;a<9;a++)if(N[a]>N[best])best=a;return best}

  // ======================= 3. Pendulum: true dynamics, learned ensemble, compounding error =======================
  function trueStep(th,thd,u){u=Math.min(2,Math.max(-2,u));let n=thd+(3*10/2*Math.sin(th)+3*u)*0.05;n=Math.min(8,Math.max(-8,n));return [th+n*0.05,n]}
  function PMember(w,os){const L=[[dequant(w.W1),dequant(w.b1)],[dequant(w.W2),dequant(w.b2)],[dequant(w.W3),dequant(w.b3)]];
    return {step(th,thd,u){let x=[Math.cos(th),Math.sin(th),thd/8,u/2];
      for(let li=0;li<3;li++){const W=L[li][0],bb=L[li][1],y=[];for(let j=0;j<W.length;j++){let s=0;const row=W[j];for(let i=0;i<x.length;i++)s+=row[i]*x[i];s+=bb[j];y.push(li<2?Math.tanh(s):s)}x=y}
      return [th+x[0]*os[0],thd+x[1]*os[1]]}}}
  function pymod(x,y){let r=x%y;if(r!==0&&((r<0)!==(y<0)))r+=y;return r}
  const wrap=a=>pymod(a+Math.PI,2*Math.PI)-Math.PI;
  function pendTests(n,T,seed){const r=rng(seed==null?77:seed),out=[];n=n||200;T=T||50;
    for(let i=0;i<n;i++){const th=(r()*2-1)*Math.PI,thd=r()*2-1,us=[];for(let t=0;t<T;t++)us.push((r()*2-1)*2);out.push([th,thd,us])}return out}
  function pendRollout(mem,th,thd,us,k){let tt=th,td=thd,mt=th,md=thd;const T=[tt],M=[mt],TD=[td],MD=[md];
    for(let t=0;t<us.length;t++){if(k&&t%k===0){mt=tt;md=td}let o=trueStep(tt,td,us[t]);tt=o[0];td=o[1];o=mem.step(mt,md,us[t]);mt=o[0];md=o[1];T.push(tt);M.push(mt);TD.push(td);MD.push(md)}
    return {T,M,TD,MD}}
  function pendErrorCurves(mems,tests,k){const T=tests[0][2].length,err=mems.map(()=>new Float64Array(T+1)),spread=new Float64Array(T+1);
    for(const [th,thd,us] of tests){const rolls=mems.map(m=>pendRollout(m,th,thd,us,k));
      for(let t=0;t<=T;t++){const ds=[];for(let i=0;i<rolls.length;i++){const d=wrap(rolls[i].M[t]-rolls[i].T[t]);err[i][t]+=Math.abs(d);ds.push(d)}
        let mu=0;for(const d of ds)mu+=d;mu/=ds.length;let ss=0;for(const d of ds)ss+=(d-mu)**2;spread[t]+=Math.sqrt(ss/(ds.length-1))}}
    const n=tests.length;return {err:err.map(e=>Array.from(e,x=>x/n)),spread:Array.from(spread,x=>x/n)}}

  root.MB={rng,argmaxR,MAZES,wallset,mazeStep,DynaAgent,dynaCurves,dynaEpisode2,dynaSnapshot,changingMaze,
    winner,mover,terminal,termValue,solve,solved,allSolved:()=>SOLVED,Net,puct,uct,top,dequant,trueStep,PMember,wrap,pendTests,pendRollout,pendErrorCurves};
})(typeof window!=='undefined'?window:globalThis);
