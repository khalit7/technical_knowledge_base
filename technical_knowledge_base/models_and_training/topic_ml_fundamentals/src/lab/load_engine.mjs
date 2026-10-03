// Loads parts/32_js_lab_a.js (the page's engine) into Node; used by every check in this folder.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
// indirect eval in the global scope (a vm context runs this code about ten times slower)
(0,eval)(fs.readFileSync(path.join(here,'../parts/32_js_lab_a.js'),'utf8'));
(0,eval)(fs.readFileSync(path.join(here,'../parts/32_js_lab_b.js'),'utf8'));
export const LB=globalThis.LB;
export const BASE=globalThis.LB.DEF;
export function train(cfg,sh){const d=LB.makeData(sh.task,sh.n,sh.noise,sh.seed);const r=new LB.Run(cfg,d,sh);while(!r.done)r.step();return r}
export function summary(r){const H=r.H,i=H.t.length-1;let k=i;while(k>0&&!isFinite(H.vaL[k]))k--;return{t:r.t,div:r.div,stopped:r.stopped,trL:+H.trL[k].toFixed(4),vaL:+H.vaL[k].toFixed(4),trA:+H.trA[k].toFixed(3),vaA:+H.vaA[k].toFixed(3),bestVa:+r.best.v.toFixed(4),bestT:r.best.t}}
