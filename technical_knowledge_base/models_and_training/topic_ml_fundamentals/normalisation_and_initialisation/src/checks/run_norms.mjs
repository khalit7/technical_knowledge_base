// Runs parts/21_js_toy.js and parts/22_js_normmath.js under node and writes checks/norms_js.json for norms_ref.py.
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
for(const f of ['21_js_toy.js','22_js_normmath.js'])eval(fs.readFileSync(path.join(here,'../parts',f),'utf8'));
const NI=globalThis.NI,out={};
for(const seed of [3,11]){
  const xi=NI.makeImage(seed),xt=NI.makeTokens(seed+2);
  out['img'+seed]={x:[...xi]};out['tok'+seed]={x:[...xt]};
  for(const k of ['bn','ln','in','gn','rms'])out['img'+seed][k]=[...NI.normalise(xi,'img',k,3).y];
  for(const k of ['bn','ln','rms'])out['tok'+seed][k]=[...NI.normalise(xt,'tok',k).y];
}
// BatchNorm: 12 training batches then eval, at batch sizes 2 and 8
for(const B of [2,8]){const D=NI.BNF.D;let run={m:new Float64Array(D),v:new Float64Array(D).fill(1)};const ys=[];
  const bs=NI.bnStream(7,B,12,0);for(const x of bs){const r=NI.bnTrain(x,B,D,run,0.1);ys.push([...r.y]);run=r.run}
  const te=NI.bnStream(99,B,1,3)[0];
  out['bn'+B]={batches:bs.map(a=>[...a]),train_y:ys,run_m:[...run.m],run_v:[...run.v],test:[...te],eval_y:[...NI.bnEval(te,B,D,run)],ln_y:[...NI.lnRows(te,B,D).y]}}
fs.writeFileSync(path.join(here,'norms_js.json'),JSON.stringify(out));console.log('wrote norms_js.json');
