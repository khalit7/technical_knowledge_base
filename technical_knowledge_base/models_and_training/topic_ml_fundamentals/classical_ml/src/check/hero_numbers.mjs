// Numbers quoted in the hero caption: three model shapes on the same 2-D data (the page's own engine, checked against scikit-learn by check_ml.mjs).
// Run from src/: node check/hero_numbers.mjs   (writes check/hero_numbers.json)
import fs from 'fs';
eval(fs.readFileSync('parts/30_js_ml.js','utf8'));
const ML=globalThis.ML,D=JSON.parse(fs.readFileSync('inputs/datasets.json'));
const acc=(f,X,y)=>X.filter((x,i)=>(f(x)>=0.5?1:0)===y[i]).length/X.length;
const out={};
for(const k of ['moons','circles','xor','blobs','cancer']){const d=D.lab[k],X=d.Xtr,y=d.ytr;
  const lr=ML.logreg(X,y,1),tr=ML.tree(X,y,null,{maxDepth:3}),gb=ML.gboost(X,y,{nStages:100,lr:0.1,maxDepth:2,seeds:ML.SK_SEEDS});
  const r=m=>({train:+acc(x=>m.predict(x),X,y).toFixed(4),test:+acc(x=>m.predict(x),d.Xte,d.yte).toFixed(4)});
  out[k]={n:[X.length,d.Xte.length],logreg:r(lr),tree:{...r(tr),leaves:tr.leaves()},gb:r(gb)}}
fs.writeFileSync('check/hero_numbers.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
