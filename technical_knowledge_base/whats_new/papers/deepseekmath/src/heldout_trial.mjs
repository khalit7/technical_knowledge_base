// The held-out split the toy first used, kept as evidence for the page's "Cannot" box. node heldout_trial.mjs -> inputs/heldout_trial.json
// Base model as shipped (SFT on all 100 questions); each method then trains on 70 questions only and is scored on the other 30.
import fs from 'fs';import {createRequire} from 'module';const require=createRequire(import.meta.url);
const T=require('./parts/22_js_toy.js');const base=T.decode(fs.readFileSync('parts/_gen_toy.js','utf8').match(/decode\("([^"]+)"\)/)[1]);
const r=T.rng(3),ix=T.ALLQ.map((_,i)=>i);for(let i=ix.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ix[i],ix[j]]=[ix[j],ix[i]]}
const train=ix.slice(0,70).map(i=>T.ALLQ[i]),held=ix.slice(70).map(i=>T.ALLQ[i]);const out={base:{train:T.evaluate(base,train).acc,held:T.evaluate(base,held).acc},runs:{}};
for(const m of ['sft','rft','onrft','ppo','grpo']){const c=T.makeCtx(base,train,m,{lr:0.003,batch:8,G:8,beta:0.04,lam:0.95,seed:5});for(let s=0;s<400;s++)T.trainStep(c);
  out.runs[m]={train:T.evaluate(c.p,train).acc,held:T.evaluate(c.p,held).acc};console.log(m,out.runs[m])}
console.log('base',out.base);fs.writeFileSync('inputs/heldout_trial.json',JSON.stringify(out,null,1));
