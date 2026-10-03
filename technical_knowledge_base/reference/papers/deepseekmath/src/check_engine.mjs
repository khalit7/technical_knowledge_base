// Dump one recorded gradient computation per method for check_engine.py (PyTorch autograd from the paper's equations).
// node check_engine.mjs  ->  model/engine_case.json
import fs from 'fs';import {createRequire} from 'module';const require=createRequire(import.meta.url);
const T=require('./parts/22_js_toy.js');const src=fs.readFileSync('parts/_gen_toy.js','utf8');
const base=T.decode(src.match(/decode\("([^"]+)"\)/)[1]);const out={NI:T.NI,NH:T.NH,NO:T.NO,cases:{}};
for(const m of Object.keys(T.METHODS)){const cfg={lr:0.003,batch:4,G:6,beta:m==='dpo'?0.1:0.04,lam:0.95,seed:11};
  const c=T.makeCtx(base,T.ALLQ,m,cfg);for(let s=0;s<5;s++)T.trainStep(c);// move away from the reference first
  c.rec=[];const info=T.grad(c);
  out.cases[m]={cfg,p:Array.from(c.p),ref:Array.from(c.ref),critic:c.critic?Array.from(c.critic):null,rec:JSON.parse(JSON.stringify(c.rec)),g:Array.from(info.g),cg:info.cg?Array.from(info.cg):null}}
fs.writeFileSync('model/engine_case.json',JSON.stringify(out));console.log('written',Object.keys(out.cases).join(' '));
