// Dump recorded gradient computations of the toy engine for check_engine.py (PyTorch autograd of the paper's Eq. 1 to 3).
// node check_engine.mjs  ->  model/engine_case.json (regenerated, not kept)
import fs from 'fs';import {createRequire} from 'module';const require=createRequire(import.meta.url);
const T=require('./parts/22_js_toy.js');const src=fs.readFileSync('parts/_gen_toy.js','utf8');
const D=JSON.parse(src.slice(src.indexOf('=')+1,src.lastIndexOf(';')));const base=T.fromInts(D.baseInts);
const out={NF:T.NF,NH:T.NH,NO:T.NO,cases:{}};
for(const [name,cfg] of [['grpo_eps0.2',{eps:0.2,beta:0.04,lc:true,refEvery:0}],['grpo_eps10',{eps:10,beta:0.001,refEvery:0}],['drgrpo',{obj:'drgrpo',eps:0.2,beta:0.04,refEvery:0}]]){
  const c=T.makeRun(base,Object.assign({seed:7,Q:4,G:6,M:8},cfg));
  for(let s=0;s<5;s++)T.trainStep(c);// later minibatches of the same rollout: the policy has moved, so ratios differ from 1
  const groups=c.queue.shift();c.rec=[];const info=T.grad(c,groups);
  out.cases[name]={cfg:c.cfg,p:Array.from(c.p),ref:Array.from(c.ref),rec:c.rec.map(g=>({q:g.q,R:g.R,os:g.os.map((o,i)=>({toks:o.toks,lp:o.lp}))})),g:Array.from(info.g),clipped:info.clipped,tokens:info.tokens}}
// supervised fine-tuning gradient on 8 corpus documents
{const docs=T.corpus(5,8);const p=Float64Array.from(base);const g=new Float64Array(T.NP);const SS=docs.map(d=>T.docStates(d)),nt=SS.reduce((a,S)=>a+S.length,0);
  for(const S of SS)for(const s of S)T.addLogp(p,g,s.f,s.prev,s.t,1/nt);
  out.cases.sft={p:Array.from(p),docs:docs.map(d=>({q:d.q,toks:d.toks})),g:Array.from(g)}}
fs.mkdirSync('model',{recursive:true});fs.writeFileSync('model/engine_case.json',JSON.stringify(out));console.log('written',Object.keys(out.cases).join(' '),Object.values(out.cases).map(c=>c.clipped).join(' '));
