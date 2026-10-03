// The toy R1-Zero, offline: pretrain the base model on the illustrative corpus, round its weights, then run every preset
// with three seeds and keep what the page shows. node toy_sweep.mjs (from src/; about two minutes on one core)
//   -> inputs/toy.json (everything, for recompute and the page's "what reproduces" lines)
//   -> parts/_gen_toy.js (the base weights, the sweep summary, the published traces and the animation's group)
import fs from 'fs';import {createRequire} from 'module';const require=createRequire(import.meta.url);
const T=require('./parts/22_js_toy.js');
const t0=Date.now();const log=(...a)=>console.log(((Date.now()-t0)/1000).toFixed(1)+'s',...a);
// 1. pretraining: 20,000 corpus documents, 3 epochs, Adam 3e-3, batches of 32, initial weights seed 3
const PRE={docs:20000,corpusSeed:7,initSeed:3,lr:3e-3,epochs:3,batch:32,sftSeed:5};
const p0=T.newPolicy(PRE.initSeed);const pre=[];
T.sft(p0,T.corpus(PRE.corpusSeed,PRE.docs),{lr:PRE.lr,epochs:PRE.epochs,batch:PRE.batch,seed:PRE.sftSeed},e=>{const ev=T.evaluate(p0,10);pre.push({epoch:e+1,acc:ev.acc,think:ev.think,fmt:ev.fmt,lc:ev.lc});log('pretrain epoch',e+1,ev.acc.toFixed(3))});
const baseInts=T.toInts(p0),base=T.fromInts(baseInts);
const rd=v=>Math.round(v*1e4)/1e4;
const slim=e=>({s:e.step,cap:e.cap,acc:rd(e.acc),fmt:rd(e.fmt),think:rd(e.think),lc:rd(e.lc),mix:rd(e.mix),trunc:rd(e.trunc),clip:e.clipShare==null?null:rd(e.clipShare),zero:e.zeroShare==null?null:rd(e.zeroShare),byN:e.byN.map(o=>rd(o.acc)),thinkN:e.byN.map(o=>rd(o.think))});
const cold=T.coldStart(base);
const E=20,SEEDS=[1,2,3];const sweep={};
for(const [key,P] of Object.entries(T.PRESETS)){sweep[key]={name:P.name,cfg:P.cfg,cold:P.cold,runs:[]};
  for(const seed of SEEDS){const {hist}=T.run(P.cold?cold:base,Object.assign({seed},P.cfg),E);sweep[key].runs.push(hist.map(slim));
    const f=hist[hist.length-1];log(key,seed,'acc',f.acc.toFixed(3),'think',f.think.toFixed(2),'lc',f.lc.toFixed(2))}}
// mean and range over seeds, per evaluation point
for(const k in sweep){const R=sweep[k].runs;sweep[k].mean=R[0].map((e,i)=>{const o={s:e.s,cap:e.cap};for(const m of ['acc','fmt','think','lc','mix','trunc','clip','zero']){const v=R.map(r=>r[i][m]).filter(x=>x!=null);if(v.length){o[m]=rd(v.reduce((a,b)=>a+b,0)/v.length);o[m+'Lo']=Math.min(...v);o[m+'Hi']=Math.max(...v)}}return o})}
// 2. published traces of the default run (seed 1): six questions answered at seven checkpoints, one sample each
const QS=[[1,2],[2,0,1,1],[0,2,2,1,2],[1,1,0,2,2,1],[2,1,2,0,1,1,2],[1,0,2,2,1,2,0,1]];
const CKP=[0,40,120,200,300,340,400];const traces=[];
{const c=T.makeRun(base,Object.assign({seed:1},T.PRESETS.zero.cfg));const take=()=>{const r=T.rng(1000+c.steps),cap=T.capAt(c.cfg,c.steps);traces.push({s:c.steps,cap,out:QS.map(q=>{const o=T.rollOne(c.p,q,cap,r);return {t:o.toks,acc:o.acc,fmt:o.fmt,trunc:o.trunc}})})};
  take();while(c.steps<c.cfg.steps){T.trainStep(c);if(CKP.includes(c.steps))take()}}
// 3. the animation's group: one question, 16 answers from the base model, chosen (first seed that qualifies) so the group
// shows every case: correct full chains, a mixed-language one, short chains, answers without tags
const qA=[2,1,0,2,2];let grp=null;
for(let s=1;s<500&&!grp;s++){const r=T.rng(s),os=[];for(let g=0;g<16;g++)os.push(T.rollOne(base,qA,7,r));
  const full=os.filter(o=>o.think>=5&&o.acc).length,mixed=os.filter(o=>o.think>=2&&o.nA>0&&o.nA<o.think).length,notag=os.filter(o=>!o.fmt).length,short=os.filter(o=>o.fmt&&o.think<5).length;
  if(full>=3&&mixed>=2&&notag>=2&&short>=4&&os.some(o=>o.think>=5&&o.acc&&o.nA>0&&o.nA<o.think))grp={seed:s,os}}
function groupStep(mode){const cfg=Object.assign({},T.DEF,{lc:mode==='lc',beta:0});const R=grp.os.map(o=>T.reward(o,cfg));const G=R.length,mu=R.reduce((a,b)=>a+b,0)/G,sd=Math.sqrt(R.reduce((a,b)=>a+(b-mu)*(b-mu),0)/(G-1));
  const A=R.map(v=>sd>0?(v-mu)/sd:0);const c={cfg,p:Float64Array.from(base),ref:Float64Array.from(base)};const info=T.grad(c,[{q:qA,os:grp.os}]);
  // one plain gradient step of size eta (illustrative), then each answer's new log-probability
  const eta=2,p1=Float64Array.from(base);for(let i=0;i<p1.length;i++)p1[i]+=eta*info.g[i];
  const d=grp.os.map(o=>T.seqLogp(p1,qA,o.toks)-T.seqLogp(base,qA,o.toks));
  return {R:R.map(rd),mu:rd(mu),sd:rd(sd),A:A.map(rd),dlogp:d.map(rd),eta}}
const anim={q:qA,seed:grp.seed,os:grp.os.map(o=>({t:o.toks,acc:o.acc,fmt:o.fmt,think:o.think,nA:o.nA,lp:rd(T.seqLogp(base,qA,o.toks))})),zero:groupStep('zero'),lc:groupStep('lc')};
log('animation group seed',grp.seed);
// 4. base model, exactly
const baseEval={c7:T.evaluate(base,7),c10:T.evaluate(base,10),cold10:T.evaluate(cold,10)};
const out={pre:PRE,pretrain:pre,corpus:T.CORPUS,cold:T.COLD,def:T.DEF,NP:T.NP,base:{acc7:rd(baseEval.c7.acc),acc10:rd(baseEval.c10.acc),think:rd(baseEval.c10.think),fmt:rd(baseEval.c10.fmt),lc:rd(baseEval.c10.lc),mix:rd(baseEval.c10.mix),byN7:baseEval.c7.byN.map(o=>rd(o.acc)),cold10:rd(baseEval.cold10.acc),coldThink:rd(baseEval.cold10.think)},sweep,traces,QS,anim};
fs.writeFileSync('inputs/toy.json',JSON.stringify(out));
const r3=v=>v==null?null:Math.round(v*1000)/1000;
const compact={};for(const [k,v] of Object.entries(sweep)){const M=v.mean,o={name:v.name,s:M.map(e=>e.s),cap:M.map(e=>e.cap)};
  for(const m of ['acc','think','lc','mix','fmt','trunc','clip','zero'])for(const x of (['acc','think','lc'].includes(m)?['','Lo','Hi']:['']))if(M[0][m+x]!==undefined||M[1][m+x]!==undefined)o[m+x]=M.map(e=>r3(e[m+x]));
  o.byN=v.runs[0].map((e,i)=>e.byN.map((_,n)=>r3(v.runs.reduce((a,r)=>a+r[i].byN[n],0)/v.runs.length)));
  o.seeds=v.runs.map(r=>({acc:r.map(e=>r3(e.acc)),think:r.map(e=>r3(e.think))}));compact[k]=o}
fs.writeFileSync('parts/_gen_toy.js','// Generated by toy_sweep.mjs: the pretrained base model (weights x 10^4), the three-seed sweep, published traces, the animation group.\nwindow.TOYDATA='+JSON.stringify({baseInts,sweep:compact,traces,QS,anim,base:out.base,pretrain:pre.map(e=>({epoch:e.epoch,acc:r3(e.acc),think:r3(e.think)}))})+';\n');
log('done; _gen_toy.js',fs.statSync('parts/_gen_toy.js').size,'bytes');
