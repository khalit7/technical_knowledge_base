// ---- The toy R1-Zero: a tiny policy that may think before it answers, trained by GRPO on a rule reward ----
// Runs in the browser and in node (toy_sweep.mjs, check_engine.mjs). Deterministic: every random draw is a seeded mulberry32.
// A question is a list of n digits (n = 1..8, each 0, 1 or 2); the answer is their sum mod 3. The policy writes tokens:
// thinking tokens claim the running sum so far, in language A (0 1 2) or language B (零 一 二); END closes the thinking
// (the </think> tag); an answer token ANS0..ANS2 ends the output. Each thinking token reads the next digit, so a chain that
// reaches the end of the list can know the answer; an answer given earlier must guess the digits it never read.
// That is the toy's assumption, by construction: the network does one addition per token (like a model with a fixed amount
// of computation per token) and sees only the digit under its reading position, never the whole list at once.
// The reward is the paper's Eq. 4 (accuracy + format, equal weight), optionally plus Eq. 7 (language consistency).
var TOY=(function(){
const NMAX=8, NT=6, END=6, ANS=7, NO=10;          // outputs: A0 A1 A2 B0 B1 B2 END ANS0 ANS1 ANS2
const BOS=7;                                        // previous-token input: 0..5 thinking, 6 END, 7 start
// inputs (one-hot groups): previous token (8), digit under the reading position (0, 1, 2, none: 4),
// digits left to read (0..8: 9), last claimed sum (0, 1, 2, none: 4), thinking tokens so far (0..10: 11)
const NF=8+4+9+4+11, NH=32, NP=NF*NH+NH+NH*NO+NO;  // 36 inputs, 32 hidden, 10 outputs: 1,514 parameters
const KMAX=10;
const TOK=['0','1','2','零','一','二','</think>','→0','→1','→2'];
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0;while(u===0)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function newPolicy(seed){const r=rng(seed),p=new Float64Array(NP),s1=1/Math.sqrt(5),s2=1/Math.sqrt(NH);
  for(let i=0;i<NF*NH;i++)p[i]=gauss(r)*s1;for(let i=NF*NH+NH;i<NF*NH+NH+NH*NO;i++)p[i]=gauss(r)*s2;return p}
// active inputs for a position: prev token, digit under the reader (or none), digits left, last claim (or none), thinking count
function feats(prev,dig,left,claim,k){return [prev,8+(dig<0?3:dig),12+left,21+(claim<0?3:claim),25+Math.min(k,KMAX)]}
function fwd(p,f){const h=new Float64Array(NH),bo=NF*NH,wo=bo+NH,oo=wo+NH*NO;
  for(let j=0;j<NH;j++){let s=p[bo+j];for(const i of f)s+=p[i*NH+j];h[j]=Math.tanh(s)}
  const z=new Float64Array(NO);for(let k=0;k<NO;k++){let s=p[oo+k];for(let j=0;j<NH;j++)s+=h[j]*p[wo+j*NO+k];z[k]=s}return {h,z}}
// legal outputs: after END only an answer; otherwise anything
const legal=prev=>prev===END?[7,8,9]:null;
function softmaxM(z,lg){const pr=new Float64Array(NO);let m=-1e300;for(let k=0;k<NO;k++)if(!lg||lg.includes(k))m=Math.max(m,z[k]);
  let s=0;for(let k=0;k<NO;k++)if(!lg||lg.includes(k)){pr[k]=Math.exp(z[k]-m);s+=pr[k]}for(let k=0;k<NO;k++)pr[k]/=s;return pr}
function probsF(p,f,prev){return softmaxM(fwd(p,f).z,legal(prev))}
function bwd(p,g,f,h,dz){const bo=NF*NH,wo=bo+NH,oo=wo+NH*NO,dh=new Float64Array(NH);
  for(let k=0;k<NO;k++){const d=dz[k];if(!d)continue;g[oo+k]+=d;for(let j=0;j<NH;j++){g[wo+j*NO+k]+=d*h[j];dh[j]+=d*p[wo+j*NO+k]}}
  for(let j=0;j<NH;j++){const d=dh[j]*(1-h[j]*h[j]);if(!d)continue;g[bo+j]+=d;for(const i of f)g[i*NH+j]+=d}}
// g += w * d/dθ log π(tok | state); returns π(tok)
function addLogp(p,g,f,prev,tok,w){const {h,z}=fwd(p,f),pr=softmaxM(z,legal(prev));if(w){const dz=new Float64Array(NO);for(let k=0;k<NO;k++)dz[k]=w*((k===tok?1:0)-pr[k]);bwd(p,g,f,h,dz)}return pr[tok]}
// ---- one output, step by step: the state the policy sees at each position ----
// returns {toks, fs, prevs, ans, acc, fmt, trunc, think, nA}
function rollOne(p,q,cap,r,temp){const n=q.length;let prev=BOS,k=0,claim=-1,sum=0,used=0;const toks=[],fs=[],prevs=[],lp=[];let nA=0,ans=-1,sawEnd=false;
  while(used<cap){const dig=k<n?q[k]:-1,f=feats(prev,dig,Math.max(0,n-k),claim,k);let pr=probsF(p,f,prev);
    if(temp&&temp!==1){const lg=legal(prev);let s=0;for(let i=0;i<NO;i++){pr[i]=(!lg||lg.includes(i))?Math.pow(pr[i],1/temp):0;s+=pr[i]}for(let i=0;i<NO;i++)pr[i]/=s}
    let u=r(),t=0;for(;t<NO-1;t++){u-=pr[t];if(u<0&&pr[t]>0)break}if(pr[t]===0){t=0;while(pr[t]===0)t++}
    toks.push(t);fs.push(f);prevs.push(prev);lp.push(Math.log(pr[t]));used++;
    if(t<NT){if(k<n)sum=(sum+q[k])%3;k++;claim=t%3;if(t<3)nA++;prev=t}
    else if(t===END){sawEnd=true;prev=END}
    else{ans=t-ANS;break}}
  const total=q.reduce((a,b)=>a+b,0)%3,trunc=ans<0;
  return {toks,fs,prevs,lp,ans,acc:(!trunc&&ans===total)?1:0,fmt:(!trunc&&sawEnd)?1:0,trunc:trunc?1:0,think:k,nA}}
function reward(o,cfg){let r=o.acc+o.fmt;if(cfg.lc){r+=cfg.lcw*(o.think>0?o.nA/o.think:cfg.lcEmpty)}return r}
// ---- exact evaluation over all 3^n questions of each length, by dynamic programming over the policy's states ----
// state: (thinking tokens k, previous token, true sum so far mod 3, tokens in language A); the digit under the reader is
// summed over its three values. Returns per length n: accuracy, format rate, truncation, mean thinking tokens, mean language
// consistency (share of thinking tokens in A; an empty chain counts as lcEmpty), share of outputs that mix both languages.
function evaluate(p,cap,lcEmpty){if(lcEmpty==null)lcEmpty=1;const out=[];
  for(let n=1;n<=NMAX;n++){let acc=0,fmt=0,trunc=0,think=0,lc=0,mix=0,ansDirect=0;
    // frontier: map key -> {prev,sum,nA,k,pr}
    let front=[{prev:BOS,sum:0,nA:0,k:0,pr:1}];
    while(front.length){const nx=new Map();
      for(const s of front){const k=s.k,left=Math.max(0,n-k),claim=s.prev<NT?s.prev%3:-1;
        const digs=k<n?[0,1,2]:[-1];
        for(const d of digs){const w=s.pr/digs.length;const f=feats(s.prev,d,left,claim,k),pr=probsF(p,f,s.prev);
          const sumAfter=d<0?s.sum:(s.sum+d)%3;// true sum including the digit under the reader
          const lcv=k>0?s.nA/k:lcEmpty;
          // direct answer (no END): uses k+1 tokens
          for(let a=0;a<3;a++){const pa=w*pr[ANS+a];if(!pa)continue;
            if(k+1<=cap){const pc=left===0?(a===s.sum?1:0):left===1?(a===sumAfter?1:0):1/3;acc+=pa*pc;think+=pa*k;lc+=pa*lcv;if(s.nA>0&&s.nA<k)mix+=pa;ansDirect+=pa}
            else{trunc+=pa;think+=pa*k;lc+=pa*lcv;if(s.nA>0&&s.nA<k)mix+=pa}}
          // END then an answer: k+2 tokens
          const pe=w*pr[END];
          if(pe){if(k+2<=cap){const f2=feats(END,d,left,claim,k),pa=probsF(p,f2,END);
              for(let a=0;a<3;a++){const pc=left===0?(a===s.sum?1:0):left===1?(a===sumAfter?1:0):1/3;acc+=pe*pa[ANS+a]*pc}
              fmt+=pe;think+=pe*k;lc+=pe*lcv;if(s.nA>0&&s.nA<k)mix+=pe}
            else{trunc+=pe;think+=pe*k;lc+=pe*lcv;if(s.nA>0&&s.nA<k)mix+=pe}}
          // another thinking token
          for(let t=0;t<NT;t++){const pt=w*pr[t];if(!pt)continue;const nA=s.nA+(t<3?1:0);
            if(k+1>=cap){trunc+=pt;think+=pt*(k+1);lc+=pt*(nA/(k+1));if(nA>0&&nA<k+1)mix+=pt;continue}
            const key=t+'|'+sumAfter+'|'+nA;const e=nx.get(key);if(e)e.pr+=pt;else nx.set(key,{prev:t,sum:sumAfter,nA,k:k+1,pr:pt})}}}
      front=[...nx.values()]}
    out.push({n,acc,fmt,trunc,think,lc,mix,direct:ansDirect})}
  const m=key=>out.reduce((s,o)=>s+o[key],0)/out.length;
  return {byN:out,acc:m('acc'),fmt:m('fmt'),trunc:m('trunc'),think:m('think'),lc:m('lc'),mix:m('mix')}}
// ---- the pretraining corpus (illustrative): how solutions to such questions might look on a web the toy has read ----
// 35% answer straight away with no tags; 50% open the thinking tags, write a few steps (0 to 3) and then the answer;
// 15% write every step. Writers know the answer, so short documents still end with the right answer, which the model cannot
// see. Language: 55% A, 25% B, 20% switching at random token by token. 5% of written steps are slips, carried forward.
const CORPUS={direct:.35,short:.50,full:.15,langA:.55,langB:.25,slip:.05};
function makeDoc(r,C,forceFull,forceLang){const n=1+Math.floor(r()*NMAX),q=[];for(let i=0;i<n;i++)q.push(Math.floor(r()*3));
  const total=q.reduce((a,b)=>a+b,0)%3;let kind=forceFull?'full':(u=>u<C.direct?'direct':u<C.direct+C.short?'short':'full')(r());
  const lu=r(),lang=forceLang||(lu<C.langA?'A':lu<C.langA+C.langB?'B':'mix');const toks=[];
  if(kind==='direct'){toks.push(ANS+total);return {q,toks}}
  const k=kind==='full'?n:Math.min(n,Math.floor(r()*4));let run=0;
  for(let i=0;i<k;i++){run=(run+q[i])%3;if(!forceFull&&r()<C.slip)run=(run+1+Math.floor(r()*2))%3;
    const L=lang==='mix'?(r()<.5?'A':'B'):lang;toks.push((L==='A'?0:3)+run)}
  toks.push(END);toks.push(ANS+(kind==='full'?run:total));return {q,toks}}
function corpus(seed,N,C,forceFull,forceLang){const r=rng(seed),D=[];for(let i=0;i<N;i++)D.push(makeDoc(r,C||CORPUS,forceFull,forceLang));return D}
// teacher forcing: the states a document passes through
function docStates(d){const n=d.q.length;let prev=BOS,k=0,claim=-1;const S=[];
  for(const t of d.toks){S.push({f:feats(prev,k<n?d.q[k]:-1,Math.max(0,n-k),claim,k),prev,t});
    if(t<NT){k++;claim=t%3;prev=t}else if(t===END)prev=END;else break}return S}
// ---- Adam ----
function adam(n,lr){return {m:new Float64Array(n),v:new Float64Array(n),t:0,lr,b1:.9,b2:.999,eps:1e-8}}
function step(p,g,o){o.t++;const c1=1-Math.pow(o.b1,o.t),c2=1-Math.pow(o.b2,o.t);
  for(let i=0;i<p.length;i++){const gi=-g[i];o.m[i]=o.b1*o.m[i]+(1-o.b1)*gi;o.v[i]=o.b2*o.v[i]+(1-o.b2)*gi*gi;p[i]-=o.lr*(o.m[i]/c1)/(Math.sqrt(o.v[i]/c2)+o.eps)}}
// supervised fine-tuning (pretraining on the corpus, the cold start): mean log-likelihood per token, minibatches of B documents
function sft(p,docs,cfg,onEpoch){const o=adam(NP,cfg.lr),r=rng(cfg.seed||1),idx=docs.map((_,i)=>i);
  for(let e=0;e<cfg.epochs;e++){for(let i=idx.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
    for(let b=0;b<idx.length;b+=cfg.batch){const g=new Float64Array(NP);const B=idx.slice(b,b+cfg.batch);
      const SS=B.map(i=>docStates(docs[i])),nt=SS.reduce((a,S)=>a+S.length,0);
      for(const S of SS)for(const s of S)addLogp(p,g,s.f,s.prev,s.t,1/nt)
      step(p,g,o)}if(onEpoch)onEpoch(e)}return p}
// ---- GRPO as DeepSeek-R1 runs it (Eq. 1 to 3; per-token ratios against the rollout policy, clip ε, k3 KL against a
// reference that is replaced by the current policy every refEvery steps). One rollout samples M minibatches of Q questions
// with G outputs each; the M minibatches are then trained one after another, a single inner epoch, so later minibatches are
// off-policy and the clip matters. Dr. GRPO variant: no std in the advantage, a constant length normaliser.
const DEF={Q:8,G:16,M:16,lr:3e-3,eps:10,beta:0.001,refEvery:16,steps:400,capA:7,capB:10,capAt:316,lc:false,lcw:1,lcEmpty:1,temp:1,obj:'grpo',seed:1};
function capAt(cfg,s){return s<cfg.capAt?cfg.capA:cfg.capB}
function makeRun(base,cfg){cfg=Object.assign({},DEF,cfg);const c={cfg,p:Float64Array.from(base),ref:Float64Array.from(base),opt:adam(NP,cfg.lr),r:rng(cfg.seed),steps:0,queue:[],samples:0,tokens:0,hist:[]};return c}
function newQ(r){const n=1+Math.floor(r()*NMAX),q=[];for(let i=0;i<n;i++)q.push(Math.floor(r()*3));return q}
function rollout(c){const cfg=c.cfg,cap=capAt(cfg,c.steps);const mbs=[];
  for(let m=0;m<cfg.M;m++){const groups=[];for(let i=0;i<cfg.Q;i++){const q=newQ(c.r),os=[];for(let g=0;g<cfg.G;g++)os.push(rollOne(c.p,q,cap,c.r,cfg.temp));groups.push({q,os})}mbs.push(groups)}
  c.queue=mbs;c.samples+=cfg.M*cfg.Q*cfg.G}
// gradient of the minibatch objective; records it in c.rec when c.rec is an array (for check_engine)
function grad(c,groups){const cfg=c.cfg,G=cfg.G,Q=groups.length,beta=cfg.beta,eps=cfg.eps,g=new Float64Array(NP);
  const info={g,clipped:0,tokens:0,zeroGroups:0,R:0,acc:0,fmt:0,think:0,lc:0};const L=Math.max(cfg.capA,cfg.capB);
  for(const grp of groups){const R=grp.os.map(o=>reward(o,cfg));const mu=R.reduce((a,b)=>a+b,0)/G;
    const sd=Math.sqrt(R.reduce((a,b)=>a+(b-mu)*(b-mu),0)/(G-1));
    if(!(sd>0))info.zeroGroups++;
    const Aa=R.map(v=>cfg.obj==='drgrpo'?(v-mu):(sd>0?(v-mu)/sd:0));
    if(c.rec)c.rec.push({q:grp.q,os:grp.os.map(o=>({toks:o.toks,lp:o.lp,acc:o.acc,fmt:o.fmt,think:o.think,nA:o.nA})),R});
    grp.os.forEach((o,i)=>{const A=Aa[i],norm=cfg.obj==='drgrpo'?L:o.toks.length;info.R+=R[i];info.acc+=o.acc;info.fmt+=o.fmt;info.think+=o.think;info.lc+=o.think>0?o.nA/o.think:cfg.lcEmpty;
      for(let t=0;t<o.toks.length;t++){const f=o.fs[t],prev=o.prevs[t],tok=o.toks[t];const {h,z}=fwd(c.p,f),pr=softmaxM(z,legal(prev));
        const rho=pr[tok]/Math.exp(o.lp[t]);info.tokens++;
        // d/dlogπ of min(ρA, clip(ρ,1-ε,1+ε)A) is ρA unless the clip is the active branch, then 0
        const clip=(A>0&&rho>1+eps)||(A<0&&rho<1-eps);if(clip)info.clipped++;
        let w=clip?0:rho*A;
        if(beta){const pf=probsF(c.ref,f,prev)[tok];w+=beta*(pf/pr[tok]-1)}// d/dlogπ of -β k3, k3 = πref/π - log(πref/π) - 1
        w/=norm*G*Q;if(!w)continue;const dz=new Float64Array(NO);for(let k=0;k<NO;k++)dz[k]=w*((k===tok?1:0)-pr[k]);bwd(c.p,g,f,h,dz)}})}
  const n=Q*G;info.R/=n;info.acc/=n;info.fmt/=n;info.think/=n;info.lc/=n;return info}
function trainStep(c){if(!c.queue.length)rollout(c);const groups=c.queue.shift();const info=grad(c,groups);step(c.p,info.g,c.opt);c.steps++;
  if(c.cfg.refEvery&&c.steps%c.cfg.refEvery===0)c.ref=Float64Array.from(c.p);
  // a new cap applies from the next rollout (as raising the maximum length takes effect for new samples)
  if(c.steps===c.cfg.capAt)c.queue=[];
  return info}
// a whole run with exact evaluations every E steps
function run(base,cfg,E,onEval){const c=makeRun(base,cfg);const hist=[];const ev=()=>{const e=evaluate(c.p,capAt(c.cfg,c.steps),c.cfg.lcEmpty);e.step=c.steps;e.cap=capAt(c.cfg,c.steps);hist.push(e);if(onEval)onEval(e,c)};
  ev();let clipped=0,tokens=0,zero=0,groups=0;while(c.steps<c.cfg.steps){const info=trainStep(c);clipped+=info.clipped;tokens+=info.tokens;zero+=info.zeroGroups;groups+=c.cfg.Q;if(c.steps%E===0){ev();const h=hist[hist.length-1];h.clipShare=tokens?clipped/tokens:0;h.zeroShare=groups?zero/groups:0;clipped=0;tokens=0;zero=0;groups=0}}
  return {c,hist}}
// ---- the cold start (R1's stage 1 at toy scale): 128 readable worked solutions, every step written, all in language A ----
const COLD={docs:128,seed:99,lr:3e-3,epochs:4,batch:16,sftSeed:4};
function coldStart(base){const p=Float64Array.from(base);sft(p,corpus(COLD.seed,COLD.docs,null,true,'A'),{lr:COLD.lr,epochs:COLD.epochs,batch:COLD.batch,seed:COLD.sftSeed});return p}
// the runs the page offers (and toy_sweep.mjs runs with three seeds each). capA/capB: the length cap before and after step capAt
const PRESETS={
  zero:{name:'R1-Zero as in the paper',cfg:{},cold:false},
  zero_long:{name:'R1-Zero, long cap from the start',cfg:{capA:10},cold:false},
  zero_lc:{name:'R1-Zero plus the language reward',cfg:{lc:true},cold:false},
  zero_long_lc:{name:'Long cap plus the language reward',cfg:{capA:10,lc:true},cold:false},
  cold_lc:{name:'Cold start, then RL with the language reward (R1 stages 1 and 2)',cfg:{capA:10,lc:true},cold:true},
  eps02:{name:'R1-Zero with a common clip, ε = 0.2',cfg:{eps:0.2},cold:false},
  drgrpo:{name:'R1-Zero trained with Dr. GRPO',cfg:{obj:'drgrpo'},cold:false}};
// ---- weights: shipped as integers, value x 10^4 (the sweep and the page both start from these rounded weights) ----
const fromInts=a=>Float64Array.from(a,v=>v/1e4),toInts=p=>Array.from(p,v=>Math.round(v*1e4));
// sequence log-probability of an output under p (for the animation's before/after)
function seqLogp(p,q,toks){const n=q.length;let prev=BOS,k=0,claim=-1,s=0;
  for(const t of toks){const f=feats(prev,k<n?q[k]:-1,Math.max(0,n-k),claim,k);s+=Math.log(probsF(p,f,prev)[t]);
    if(t<NT){k++;claim=t%3;prev=t}else if(t===END)prev=END;else break}return s}
return {NMAX,NT,END,ANS,NO,BOS,NF,NH,NP,KMAX,TOK,CORPUS,DEF,rng,newPolicy,feats,fwd,softmaxM,legal,probsF,addLogp,rollOne,reward,evaluate,corpus,makeDoc,docStates,adam,step,sft,makeRun,newQ,rollout,grad,trainStep,run,capAt,fromInts,toInts,seqLogp,COLD,coldStart,PRESETS}})();
if(typeof module!=='undefined')module.exports=TOY;
