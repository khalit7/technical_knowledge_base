// ---- Toy RLHF: the paper's three steps at toy scale, run live (also loaded by node for the checks) ----
// A tiny language model (an MLP over the last 3 tokens) is pretrained on "internet text", fine-tuned on
// demonstrations (step 1), a reward model is fit to simulated labeler rankings with the paper's Eq. 1 (step 2),
// and the policy is trained with PPO against it with a per-token KL penalty and an optional pretraining-gradient
// mix (step 3, Eq. 2). Everything is float64 and seeded, so a run is exactly reproducible.
(function(root){
'use strict';
// ---------- vocabulary, tasks, text ----------
const WORDS=['<bos>','<end>','⏎','name','a','an','fruit','colour','animal','count','to','three','what','is','two','plus','say','hello',
  'apple','pear','plum','red','blue','green','cat','dog','frog','one','four','sure'];
const V=WORDS.length,ID={};WORDS.forEach((w,i)=>ID[w]=i);
const T=s=>s.split(' ').map(w=>{if(!(w in ID))throw new Error('word '+w);return ID[w]});
const TASKS=[
  {k:'fruit',p:T('name a fruit'),ans:[T('apple'),T('pear'),T('plum')]},
  {k:'colour',p:T('name a colour'),ans:[T('red'),T('blue'),T('green')]},
  {k:'animal',p:T('name an animal'),ans:[T('cat'),T('dog'),T('frog')]},
  {k:'count',p:T('count to three'),ans:[T('one two three')]},
  {k:'sum',p:T('what is two plus two'),ans:[T('four')]},
  {k:'hello',p:T('say hello'),ans:[T('hello')]}];
const NT=TASKS.length,BOS=0,END=1,NL=2,SURE=ID.sure,CAP=8,CTX=3;
const INSTR=new Set(T('name count to what plus say'));
const FACTS=[['apple is a','fruit'],['pear is a','fruit'],['plum is a','fruit'],['red is a','colour'],['blue is a','colour'],['green is a','colour'],
  ['cat is an','animal'],['dog is an','animal'],['frog is an','animal'],['two plus two is','four'],['one two','three']].map(([c,w])=>({c:T(c),w:ID[w]}));
// ---------- seeded randomness ----------
function rng(seed){let a=seed>>>0;const f=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  f.int=n=>Math.floor(f()*n);f.pick=a=>a[Math.floor(f()*a.length)];
  f.gauss=()=>{let u=0,v=0;while(u===0)u=f();while(v===0)v=f();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  f.gumbel=()=>{let u=0;while(u===0)u=f();return -Math.log(-Math.log(u))};return f}
// "Internet text": worksheets of instructions (the next line is usually another instruction, the GPT-3 failure the
// paper starts from), a few worksheets with answers, and pages of facts.
function factLine(r){const f=r.pick(FACTS);return f.c.concat([f.w])}
function doc(r){const u=r(),out=[],n=2+r.int(3);
  for(let i=0;i<n;i++){let line;
    if(u<.5)line=r.pick(TASKS).p;
    else if(u<.62){const t=r.pick(TASKS);line=t.p.concat([NL],r.pick(t.ans))}
    else line=r()<.85?factLine(r):(r()<.5?T('hello'):T('one two three'));
    out.push(...line,NL)}
  out.push(END);return out}
function corpus(seed,n){const r=rng(seed),D=[];for(let i=0;i<n;i++)D.push(doc(r));return D}
// every (context, next token) window of a token stream; ctx holds the previous 3 tokens (BOS-padded)
function windows(seq,from){const W=[];for(let i=from||0;i<seq.length;i++){const c=[];for(let j=CTX;j>=1;j--)c.push(i-j>=0?seq[i-j]:BOS);W.push({c,y:seq[i]})}return W}
const promptSeq=t=>TASKS[t].p.concat([NL]);
// ---------- the language model: h = tanh(E1[t-1]+E2[t-2]+E3[t-3]+b1), logits = h U + b2 ----------
const H=32;
function newLM(seed){const r=rng(seed),s1=.5,s2=1/Math.sqrt(H);
  const m={E:new Float64Array(CTX*V*H),b1:new Float64Array(H),U:new Float64Array(H*V),b2:new Float64Array(V)};
  for(let i=0;i<m.E.length;i++)m.E[i]=r.gauss()*s1;for(let i=0;i<m.U.length;i++)m.U[i]=r.gauss()*s2;return m}
const KEYS=['E','b1','U','b2'];
const cloneP=m=>{const o={};KEYS.forEach(k=>o[k]=Float64Array.from(m[k]));return o};
const zerosLike=m=>{const o={};KEYS.forEach(k=>o[k]=new Float64Array(m[k].length));return o};
function fwd(m,c){const h=new Float64Array(H),z=new Float64Array(V);
  for(let k=0;k<H;k++)h[k]=m.b1[k];
  for(let j=0;j<CTX;j++){const off=(j*V+c[CTX-1-j])*H;for(let k=0;k<H;k++)h[k]+=m.E[off+k]}  // E block j = token t-1-j
  for(let k=0;k<H;k++)h[k]=Math.tanh(h[k]);
  for(let v=0;v<V;v++){let s=m.b2[v];for(let k=0;k<H;k++)s+=h[k]*m.U[k*V+v];z[v]=s}
  let mx=-1e300;for(let v=0;v<V;v++)if(z[v]>mx)mx=z[v];let se=0;for(let v=0;v<V;v++)se+=Math.exp(z[v]-mx);
  const lse=mx+Math.log(se),lp=new Float64Array(V);for(let v=0;v<V;v++)lp[v]=z[v]-lse;return {h,lp}}
// accumulate w * d(log p(y|c))/dparams into g
function bwdLogp(m,g,c,y,w,f){f=f||fwd(m,c);const {h,lp}=f,dz=new Float64Array(V);
  for(let v=0;v<V;v++)dz[v]=-Math.exp(lp[v])*w;dz[y]+=w;
  const dh=new Float64Array(H);
  for(let k=0;k<H;k++){let s=0;for(let v=0;v<V;v++){g.U[k*V+v]+=h[k]*dz[v];s+=m.U[k*V+v]*dz[v]}dh[k]=s*(1-h[k]*h[k])}
  for(let v=0;v<V;v++)g.b2[v]+=dz[v];
  for(let k=0;k<H;k++)g.b1[k]+=dh[k];
  for(let j=0;j<CTX;j++){const off=(j*V+c[CTX-1-j])*H;for(let k=0;k<H;k++)g.E[off+k]+=dh[k]}
  return lp[y]}
// Adam (ascent on the accumulated gradient g); state kept per model
function adam(m,lr,b1,b2){return {m,lr,b1:b1||.9,b2:b2||.95,t:0,M:zerosLike(m),S:zerosLike(m)}}
function adamStep(o,g,lr){o.t++;const a=lr==null?o.lr:lr,c1=1-Math.pow(o.b1,o.t),c2=1-Math.pow(o.b2,o.t);
  KEYS.forEach(k=>{const p=o.m[k],gg=g[k],M=o.M[k],S=o.S[k];for(let i=0;i<p.length;i++){const x=gg[i];M[i]=o.b1*M[i]+(1-o.b1)*x;S[i]=o.b2*S[i]+(1-o.b2)*x*x;
    p[i]+=a*(M[i]/c1)/(Math.sqrt(S[i]/c2)+1e-8)}})}
function sample(m,t,r,temp){const seq=promptSeq(t),n0=seq.length,out=[],lps=[];temp=temp||1;
  for(let i=0;i<CAP;i++){const c=[];for(let j=CTX;j>=1;j--)c.push(seq.length-j>=0?seq[seq.length-j]:BOS);
    const {lp}=fwd(m,c);let u=r(),y=V-1;
    if(temp===1){for(let v=0;v<V;v++){u-=Math.exp(lp[v]);if(u<=0){y=v;break}}}
    else{let mx=-1e300;const q=new Float64Array(V);for(let v=0;v<V;v++){q[v]=lp[v]/temp;if(q[v]>mx)mx=q[v]}let se=0;for(let v=0;v<V;v++){q[v]=Math.exp(q[v]-mx);se+=q[v]}for(let v=0;v<V;v++){u-=q[v]/se;if(u<=0){y=v;break}}}
    seq.push(y);out.push(y);lps.push(lp[y]);if(y===END)break}
  return {t,y:out,lps,seq,n0}}
function greedy(m,t){const seq=promptSeq(t),out=[];for(let i=0;i<CAP;i++){const c=seq.slice(-CTX);const {lp}=fwd(m,c);let y=0;for(let v=1;v<V;v++)if(lp[v]>lp[y])y=v;seq.push(y);out.push(y);if(y===END)break}return out}
function seqLogps(m,t,y){const seq=promptSeq(t).concat(y),n0=seq.length-y.length,W=windows(seq,n0);return W.map(w=>fwd(m,w.c).lp[w.y])}
// ---------- the labelers ----------
// True preference (the toy's ground truth, which the paper never has): a correct, complete answer; one "sure" is
// polite, more is not; extra words, wrong answers, more instructions (what GPT-3 does) and never stopping cost.
const eqA=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
function utility(t,y){const fin=y.length&&y[y.length-1]===END,w=y.filter(x=>x!==END);let s=0;while(s<w.length&&w[s]===SURE)s++;
  const c=w.slice(s),A=TASKS[t].ans;let u;
  if(!c.length)u=-2;
  else if(A.some(a=>eqA(a,c)))u=3;
  else{const a=A.find(a=>eqA(a,c.slice(0,a.length)));
    if(a)u=3-.6*(c.length-a.length);
    else if(c.some(x=>INSTR.has(x)))u=-1.5;
    else if(TASKS.some((o,j)=>j!==t&&o.ans.some(a=>eqA(a,c.slice(0,a.length)))))u=-1;
    else u=-1}
  if(s===1)u+=.5;else if(s>1)u+=.5-.8*(s-1);
  if(!fin)u-=1;return u}
// One labeler ranks K responses: utilities plus Gumbel noise of scale tau (so any pair is a Bradley-Terry choice,
// P(a over b) = sigmoid((U_a - U_b)/tau)). Returns the indices from best to worst.
function rank(us,r,tau){const z=us.map((u,i)=>({i,v:u+tau*r.gumbel()}));z.sort((a,b)=>b.v-a.v);return z.map(o=>o.i)}
const sig=x=>1/(1+Math.exp(-x));
// ---------- the reward model: linear in bag-of-words features, global and per task ----------
const NF=V+NT*V;
function feats(t,y){const f=new Float64Array(NF);for(const x of y){f[x]+=1;f[V+t*V+x]+=1}return f}
const rmScore=(rm,t,y)=>{const f=feats(t,y);let s=rm.b;for(let i=0;i<NF;i++)s+=rm.w[i]*f[i];return s};
// Step 2: K responses per prompt from the SFT policy, ranked by one labeler, all C(K,2) pairs in one batch
// element (the paper's fix: one forward pass per response), loss = -(1/C(K,2)) sum log sigmoid(r_w - r_l) (Eq. 1).
function rmData(sft,nPrompts,K,seed,tau){const r=rng(seed),D=[];
  for(let n=0;n<nPrompts;n++){const t=r.int(NT),ys=[];for(let k=0;k<K;k++)ys.push(sample(sft,t,r).y);
    const ord=rank(ys.map(y=>utility(t,y)),r,tau),pairs=[];
    for(let a=0;a<K;a++)for(let b=a+1;b<K;b++){if(eqA(ys[ord[a]],ys[ord[b]]))continue;pairs.push([ord[a],ord[b]])}  // identical texts are ties: dropped
    D.push({t,ys,pairs})}
  return D}
function rmLossGrad(rm,el,gw){const fs=el.ys.map(y=>feats(el.t,y)),rs=fs.map(f=>{let s=rm.b;for(let i=0;i<NF;i++)s+=rm.w[i]*f[i];return s});
  const C=el.pairs.length;if(!C)return 0;let L=0;
  for(const [w,l] of el.pairs){const d=rs[w]-rs[l];L+=-Math.log(sig(d))/C;const gd=(1-sig(d))/C;
    if(gw)for(let i=0;i<NF;i++)gw[i]+=gd*(fs[w][i]-fs[l][i])}   // ascent direction on -loss
  return L}
function trainRM(D,o){o=o||{};const lr=o.lr||.05,bs=o.bs||16,ep=o.epochs||1,r=rng(o.seed||7),rm={w:new Float64Array(NF),b:0};
  const M=new Float64Array(NF),S=new Float64Array(NF);let t=0,log=[];
  for(let e=0;e<ep;e++){const idx=D.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=r.int(i+1);[idx[i],idx[j]]=[idx[j],idx[i]]}
    for(let s=0;s<idx.length;s+=bs){const g=new Float64Array(NF);let L=0,n=0;for(let q=s;q<Math.min(idx.length,s+bs);q++){L+=rmLossGrad(rm,D[idx[q]],g);n++}
      t++;const frac=t/Math.ceil(idx.length*ep/bs),a=lr*(.1+.9*.5*(1+Math.cos(Math.PI*Math.min(1,frac))));  // cosine to 10%, as §C.2
      for(let i=0;i<NF;i++){const x=g[i]/n;M[i]=.9*M[i]+.1*x;S[i]=.95*S[i]+.05*x*x;rm.w[i]+=a*(M[i]/(1-Math.pow(.9,t)))/(Math.sqrt(S[i]/(1-Math.pow(.95,t)))+1e-8)}
      log.push(L/n)}}
  rm.log=log;return rm}
// accuracy of the RM, and of a second labeler, on fresh comparisons from the same SFT policy
function rmAccuracy(rm,sft,n,seed,tau){const r=rng(seed);let ok=0,ag=0,tot=0;
  for(let i=0;i<n;i++){const t=r.int(NT),a=sample(sft,t,r).y,b=sample(sft,t,r).y;if(eqA(a,b))continue;
    const ua=utility(t,a),ub=utility(t,b);const l1=ua+tau*r.gumbel()>ub+tau*r.gumbel(),l2=ua+tau*r.gumbel()>ub+tau*r.gumbel();
    const pr=rmScore(rm,t,a)>rmScore(rm,t,b);ok+=(pr===l1);ag+=(l1===l2);tot++}
  return {rm:ok/tot,labelers:ag/tot,n:tot}}
// ---------- language-model training (pretraining, SFT, and the ptx term) ----------
function lmGradBatch(m,g,W,w){let L=0;for(const x of W)L+=bwdLogp(m,g,x.c,x.y,w/W.length);return L/W.length}
function lmTrain(m,W,o){const r=rng(o.seed),opt=adam(m,o.lr),steps=o.steps,bs=o.bs,log=[];
  for(let s=0;s<steps;s++){const g=zerosLike(m),B=[];for(let i=0;i<bs;i++)B.push(W[r.int(W.length)]);
    const lp=lmGradBatch(m,g,B,1);const a=o.lr*(o.cos?(.1+.9*.5*(1+Math.cos(Math.PI*s/steps))):1);adamStep(opt,g,a);if(s%o.logEvery===0)log.push(-lp)}
  return log}
const meanCE=(m,W)=>{let s=0;for(const x of W)s-=fwd(m,x.c).lp[x.y];return s/W.length};
const factCtx=f=>[NL,NL].concat(f.c).slice(-CTX);
const factScore=m=>{let s=0;for(const f of FACTS)s+=Math.exp(fwd(m,factCtx(f)).lp[f.w]);return s/FACTS.length};
function demos(seed,n){const r=rng(seed),D=[];for(let i=0;i<n;i++){const t=r.int(NT),a=r.pick(TASKS[t].ans),y=(r()<.5?[SURE]:[]).concat(a,[END]);D.push({t,y})}return D}
const demoWindows=D=>{const W=[];D.forEach(d=>{const seq=promptSeq(d.t).concat(d.y);W.push(...windows(seq,seq.length-d.y.length))});return W};
// ---------- step 3: PPO against the RM with a per-token KL penalty, optionally with pretraining gradients ----------
// Bandit episodes (one prompt, one response, then the RM's score). Per-token reward -beta*log(pi/pi_SFT), plus the
// RM score at the last token; no discount, advantage = return - V(task, position), whitened per batch; V is a table
// initialised to the RM's mean score per task (the paper initialises a value network from the RM). Clip 0.2,
// one inner epoch over minibatches. With gamma > 0, each minibatch also accumulates gamma times the gradient of the
// pretraining log-likelihood on fresh pretraining windows (8 per episode, as §C.4's ratio), the paper's PPO-ptx.
const PPO_DEF={beta:.3,gamma:0,iters:500,lr:3e-3,batch:64,mb:16,seed:21,every:25,evalN:96};
// ppoInit/ppoIter let the page train a few iterations per animation frame; ppo() runs them all at once.
function ppoInit(S,o){o=Object.assign({},PPO_DEF,o);const pol=cloneP(S.sft);
  const st={S,o,pol,opt:adam(pol,o.lr),r:rng(o.seed),Vt:[],hist:[],it:0,last:null};
  for(let t=0;t<NT;t++)st.Vt.push(new Float64Array(CAP).fill(S.rmMean[t]));
  ppoEval(st);return st}
function ppoEval(st){const ev=evaluate(st.pol,st.S,st.o.evalN,st.o.seed+1000+st.it);ev.it=st.it;st.hist.push(ev);if(st.o.onEval)st.o.onEval(ev)}
function ppoIter(st){const {S,o,pol,r,Vt}=st,B=o.batch,MB=o.mb,beta=o.beta,gam=o.gamma||0,eps=[];st.it++;
  for(let b=0;b<B;b++){const t=r.int(NT),s=sample(pol,t,r),ref=seqLogps(S.sft,t,s.y),rmS=rmScore(S.rm,t,s.y);
    const n=s.y.length,rew=new Float64Array(n);let kl=0;for(let i=0;i<n;i++){const d=s.lps[i]-ref[i];kl+=d;rew[i]=-beta*d}rew[n-1]+=rmS;
    const G=new Float64Array(n);let acc=0;for(let i=n-1;i>=0;i--){acc+=rew[i];G[i]=acc}
    eps.push({t,s,G,rmS,kl,ref,rew})}
  const all=[];eps.forEach(e=>{e.A=new Float64Array(e.s.y.length);e.V=new Float64Array(e.s.y.length);for(let i=0;i<e.s.y.length;i++){e.V[i]=Vt[e.t][i];e.A[i]=e.G[i]-Vt[e.t][i];all.push(e.A[i])}});
  const mu=all.reduce((a,b)=>a+b,0)/all.length,sd=Math.sqrt(all.reduce((a,b)=>a+(b-mu)*(b-mu),0)/all.length)+1e-8;
  eps.forEach(e=>{e.Araw=Float64Array.from(e.A);for(let i=0;i<e.A.length;i++){e.A[i]=(e.A[i]-mu)/sd;Vt[e.t][i]+=.1*(e.G[i]-Vt[e.t][i])}});
  for(let q=0;q<B;q+=MB){const P=[];if(gam>0)for(let k=0;k<8*MB;k++)P.push(S.ptxW[r.int(S.ptxW.length)]);
    adamStep(st.opt,ppoGrad(pol,eps.slice(q,q+MB),P,gam).g)}
  st.last={eps,mu,sd};
  if(st.it%o.every===0||st.it===o.iters)ppoEval(st);
  return st.it>=o.iters}
function ppo(S,o){const st=ppoInit(S,o);while(!ppoIter(st));return {pol:st.pol,hist:st.hist,st}}
// The gradient of one PPO-ptx minibatch (ascent direction): the clipped surrogate (Schulman et al. 2017, clip 0.2)
// averaged over the minibatch's tokens, plus gamma times the mean pretraining log-likelihood of the windows P.
// Returns {g, obj}; obj is the objective whose gradient g is (checked against PyTorch autograd by check_grad.py).
function ppoGrad(pol,eps,P,gam){const g=zerosLike(pol);let ntok=0,obj=0;eps.forEach(e=>ntok+=e.s.y.length);
  eps.forEach(e=>{const seq=e.s.seq,n0=e.s.n0;
    for(let i=0;i<e.s.y.length;i++){const c=seq.slice(n0+i-CTX,n0+i),f=fwd(pol,c),lpn=f.lp[e.s.y[i]],ratio=Math.exp(lpn-e.s.lps[i]),A=e.A[i];
      const cr=Math.min(1.2,Math.max(.8,ratio));obj+=Math.min(ratio*A,cr*A)/ntok;
      // d/dtheta of min(ratio*A, clip(ratio)*A) is ratio*A*dlogp when the unclipped term is the active one, else 0
      const clipped=(A>=0&&ratio>1.2)||(A<0&&ratio<.8);if(!clipped)bwdLogp(pol,g,c,e.s.y[i],ratio*A/ntok,f)}});
  if(gam>0&&P.length){P.forEach(x=>{obj+=gam*bwdLogp(pol,g,x.c,x.y,gam/P.length)/P.length})}
  return {g,obj}}
// evaluation: mean true utility and RM score of samples, KL from SFT (nats per response), held-out pretraining
// cross-entropy and the fact score (the toy's "public NLP benchmark": mean probability of the right word)
function evaluate(m,S,n,seed){const r=rng(seed);let u=0,rs=0,kl=0,sure=0,len=0;
  for(let i=0;i<n;i++){const t=i%NT,s=sample(m,t,r),ref=seqLogps(S.sft,t,s.y);u+=utility(t,s.y);rs+=rmScore(S.rm,t,s.y);
    for(let k=0;k<s.y.length;k++)kl+=s.lps[k]-ref[k];sure+=s.y.filter(x=>x===SURE).length;len+=s.y.length}
  return {u:u/n,rm:rs/n,kl:kl/n,sure:sure/n,len:len/n,ce:meanCE(m,S.ptxTest),fact:factScore(m)}}
// win rate of model a against model b by simulated labelers on the same prompts (ties count half), as Figure 1
function winRate(a,b,n,seed,tau){const r=rng(seed);let w=0;for(let i=0;i<n;i++){const t=i%NT,ya=sample(a,t,r).y,yb=sample(b,t,r).y;
  if(eqA(ya,yb)){w+=.5;continue}const ua=utility(t,ya)+tau*r.gumbel(),ub=utility(t,yb)+tau*r.gumbel();w+=ua>ub?1:0}return w/n}
// ---------- the whole pipeline ----------
const DEF={seed:1,tau:.3,nDocs:3000,preSteps:3000,preLr:.01,nDemo:600,sftEpochs:16,sftPtx:.1,sftLr:.003,K:6,nRM:800,rmLr:.05};
function stage0(o){o=Object.assign({},DEF,o);const docs=corpus(o.seed,o.nDocs),W=[];docs.forEach(d=>W.push(...windows(d)));
  const test=[];corpus(o.seed+99,300).forEach(d=>test.push(...windows(d)));
  const base=newLM(o.seed+2);const log=lmTrain(base,W,{seed:o.seed+3,lr:o.preLr,steps:o.preSteps,bs:32,logEvery:50,cos:true});
  return {o,base,ptxW:W,ptxTest:test,preLog:log}}
function stage1(S){const o=S.o,D=demos(o.seed+4,o.nDemo),Dv=demos(o.seed+5,150),W=demoWindows(D),Wv=demoWindows(Dv),sft=cloneP(S.base);
  // 16 epochs with cosine decay to 10% (§3.5, §C.1), 10% of each batch pretraining text (the PPO init of §C.3);
  // record validation loss and the true score after each epoch
  const steps=Math.ceil(W.length/16),opt=adam(sft,o.sftLr),r=rng(o.seed+6),ep=[];let s=0;const tot=steps*o.sftEpochs;
  ep.push({e:0,val:meanCE(sft,Wv),u:evaluate(sft,{sft:S.base,rm:{w:new Float64Array(NF),b:0},ptxTest:S.ptxTest},96,o.seed+7).u});
  for(let e=1;e<=o.sftEpochs;e++){for(let k=0;k<steps;k++,s++){const g=zerosLike(sft),B=[];for(let i=0;i<16;i++)B.push(r()<o.sftPtx?S.ptxW[r.int(S.ptxW.length)]:W[r.int(W.length)]);lmGradBatch(sft,g,B,1);
      adamStep(opt,g,o.sftLr*(.1+.9*.5*(1+Math.cos(Math.PI*s/tot))))}
    ep.push({e,val:meanCE(sft,Wv),u:evaluate(sft,{sft:S.base,rm:{w:new Float64Array(NF),b:0},ptxTest:S.ptxTest},96,o.seed+7).u})}
  S.sft=sft;S.demos=D;S.sftEpochs=ep;return S}
function stage2(S){const o=S.o,D=rmData(S.sft,o.nRM,o.K,o.seed+8,o.tau);S.rmD=D;let rm=trainRM(D,{lr:o.rmLr,seed:o.seed+9});
  // normalise with a bias so the labeler demonstrations score 0 on average (§3.5)
  let m=0;S.demos.forEach(d=>m+=rmScore(rm,d.t,d.y));rm.b-=m/S.demos.length;S.rm=rm;
  const r=rng(o.seed+10);S.rmMean=[];for(let t=0;t<NT;t++){let s=0;for(let i=0;i<32;i++)s+=rmScore(rm,t,sample(S.sft,t,r).y);S.rmMean.push(s/32)}
  S.rmAcc=rmAccuracy(rm,S.sft,1500,o.seed+12,o.tau);return S}
function pipeline(o){return stage2(stage1(stage0(o)))}
const fmt=y=>y.map(x=>WORDS[x]).join(' ');
root.TOY={WORDS,V,ID,T,TASKS,NT,FACTS,CAP,CTX,H,END,SURE,rng,corpus,doc,windows,promptSeq,newLM,cloneP,zerosLike,fwd,bwdLogp,adam,adamStep,sample,greedy,seqLogps,
  utility,rank,sig,feats,NF,rmScore,rmData,rmLossGrad,trainRM,rmAccuracy,ppoGrad,ppoInit,ppoIter,lmGradBatch,lmTrain,meanCE,factScore,demos,demoWindows,ppo,evaluate,winRate,
  DEF,PPO_DEF,stage0,stage1,stage2,pipeline,fmt};
})(typeof window!=='undefined'?window:globalThis);
