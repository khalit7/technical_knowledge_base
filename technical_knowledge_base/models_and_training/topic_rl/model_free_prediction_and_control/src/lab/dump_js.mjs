// Runs the page's own engine (parts/32_js_lab_a.js) in Node and writes js_dump.json for check.py:
// small configurations (compared bit for bit with the Python port) and the full default configurations (whose shapes check.py tests).
// usage (from src/lab): node dump_js.mjs
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const E=createRequire(import.meta.url)(path.resolve(here,'../parts/32_js_lab_a.js'));
const run=g=>{let r;while(!(r=g.next()).done);return r.value};
const out={small:{},full:{}};
// ---- small: every method, few runs
out.small.rw5=run(E.rw5Job({seed:7,runs:10,episodes:30,methods:[{k:'td',a:.1},{k:'mc',a:.03},{k:'btd'},{k:'bmc'}]}));
out.small.rw19={};for(const fam of ['nstep','lret','tdl'])out.small.rw19[fam]=run(E.rw19Job({fam,seed:7,runs:3,as:E.alphas(0.1)}));
const ccfg={eps:.1,alpha:.5,episodes:150};
out.small.cliff=run(E.clJob({...ccfg,seed:7,runs:3,algs:['sarsa','q','esarsa']}));
const r0=E.clRun('q',7,0,ccfg,false),r1=E.clRun('sarsa',7,0,ccfg,false);
out.small.clQ=r0.Q;out.small.clEval=[E.clEvalEps(r0.Q,.1),E.clEvalEps(r1.Q,.1)];
out.small.gw={};for(const k of ['eval','vi','pi','td','mc']){const M=E.gwMethod(k,{seed:7,alpha:.1});const tr=[];for(let f=0;f<40;f++){M.step();tr.push(M.V.slice())}out.small.gw[k]=tr}
out.small.tr19=[[4,0.8],[1,0.4],[16,1]].map(([n,l],i)=>{const o=E.rw19Trace(7,i*3,n,l,0.4),f=o.F[o.F.length-1];return{n,l,ep:i*3,Vn:f.Vn,Vl:f.Vl}});
out.small.clStar=E.clEvalEps(E.clQstar(),.1);
out.small.trace=E.rw5Trace(7,20,.1,.1).map(f=>[f.Vt,f.Vm]);
// ---- full: the page's defaults
out.full.rw5=run(E.rw5Job({seed:1,runs:100,episodes:100,methods:[{k:'td',a:.05},{k:'td',a:.1},{k:'td',a:.15},{k:'mc',a:.01},{k:'mc',a:.02},{k:'mc',a:.03},{k:'mc',a:.04}]}));
out.full.rw5b=run(E.rw5Job({seed:1,runs:100,episodes:100,methods:[{k:'btd'},{k:'bmc'}]}));
out.full.rw19={};for(const fam of ['nstep','lret','tdl'])out.full.rw19[fam]=run(E.rw19Job({fam,seed:1,runs:100}));
out.full.cliff=run(E.clJob({eps:.1,alpha:.5,episodes:500,seed:1,runs:100,algs:['sarsa','q','esarsa']}));
const q0=E.clRun('q',1,0,{eps:.1,alpha:.5,episodes:500},false);out.full.clEvalQ=E.clEvalEps(q0.Q,.1);
const s0=E.clRun('sarsa',1,0,{eps:.1,alpha:.5,episodes:500},false);out.full.clEvalS=E.clEvalEps(s0.Q,.1);
fs.writeFileSync(path.join(here,'js_dump.json'),JSON.stringify(out,(k,v)=>typeof v==='number'&&!isFinite(v)?(v>0?'Infinity':v<0?'-Infinity':'NaN'):v));
console.log('wrote js_dump.json');
