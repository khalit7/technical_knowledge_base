// Dump JS trajectories for every surface x optimiser at a test learning rate, plus the noise used, for checks/torch_ref.py
import fs from 'fs';import vm from 'vm';
const here=new URL('.',import.meta.url).pathname;
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(here+'../parts/30_js_engine.js','utf8'),ctx);
const E=ctx.OPTE;vm.runInContext(fs.readFileSync(here+'../parts/31_js_race_lr.js','utf8').replace('window.','globalThis.'),ctx);const TL=ctx.RACE_LR;const LR={gd:0.03,mom:0.01,nes:0.01,adagrad:0.5,rmsprop:0.02,adam:0.1,adamw:0.1,lion:0.03,shampoo:0.5,soap:0.1,muon:0.05,sfsgd:0.02,sfadamw:0.1};
const out={runs:[]};
for(const sk of Object.keys(E.S)){const sf=E.S[sk];
  for(const ok of Object.keys(E.O)){for(const [tag,lr,T] of [['test',LR[ok],Math.min(sf.steps,300)],['default',TL[sk][ok],sf.steps]])for(const sch of (E.O[ok].sf?['const']:['const','cosine','wsd'])){
    const r=E.run(sk,ok,lr,{steps:T,sched:sch,seed:7});
    out.runs.push({sk,ok,sch,tag,lr,T,xs:[...r.xs],ys:[...r.ys]});}}}
// the noise stream for seed 7 (2 numbers per step)
const nz=E.gauss(7);out.noise=[];for(let i=0;i<2*1200;i++)out.noise.push(nz());
out.surf=Object.fromEntries(Object.entries(E.S).map(([k,v])=>[k,{start:v.start,noise:v.noise||0}]));
fs.writeFileSync(here+'js_traj.json',JSON.stringify(out));console.log('runs',out.runs.length);
