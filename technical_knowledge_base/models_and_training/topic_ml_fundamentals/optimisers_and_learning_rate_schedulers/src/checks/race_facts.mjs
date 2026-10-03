// Numbers the Reading tab quotes from the Optimiser race (tuned default rates, constant schedule unless stated).
import fs from 'fs';import vm from 'vm';
const here=new URL('.',import.meta.url).pathname;const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(here+'../parts/30_js_engine.js','utf8'),ctx);vm.runInContext(fs.readFileSync(here+'../parts/31_js_race_lr.js','utf8').replace('window.','globalThis.'),ctx);
const E=ctx.OPTE,LR=ctx.RACE_LR;const first=(a,f)=>{for(let i=0;i<a.length;i++)if(f(a[i],i))return i;return null};
const res={};
for(const sk of Object.keys(E.S)){res[sk]={};for(const ok of Object.keys(E.O)){
  const r=E.run(sk,ok,LR[sk][ok],{seed:1});const o={lr:LR[sk][ok],final:r.ls[r.T],to1e3:first(r.ls,l=>l<1e-3)};
  if(sk==='saddle')o.escape=first(r.ys,y=>Math.abs(y)>0.5);
  if(sk==='noisy'){for(const sc of ['cosine','wsd']){const q=E.run(sk,ok,LR[sk][ok],{seed:1,sched:sc});o[sc]=q.ls[q.T]}
    let m=0;for(let s=1;s<=20;s++){const q=E.run(sk,ok,LR[sk][ok],{seed:s});let a=0;for(let i=r.T-60;i<=r.T;i++)a+=q.ls[i];m+=a/61}o.floor20=m/20;
    let mc=0;for(let s=1;s<=20;s++){const q=E.run(sk,ok,LR[sk][ok],{seed:s,sched:'cosine'});mc+=q.ls[q.T]}o.cos20=mc/20}
  res[sk][ok]=o}}
for(const sk in res){console.log('==',sk);for(const ok in res[sk])console.log(ok.padEnd(8),JSON.stringify(res[sk][ok],(k,v)=>typeof v==='number'?+v.toPrecision(3):v))}
fs.writeFileSync(here+'race_facts.json',JSON.stringify(res,null,1));
