// Bayesian-optimisation paths of the page (ML.gpEI) against the NumPy port in recompute.py, step by step.
// Run from src/: node check/check_search.mjs
import fs from 'fs';
eval(fs.readFileSync('parts/30_js_ml.js','utf8'));const ML=globalThis.ML;
const S=JSON.parse(fs.readFileSync('inputs/svm_digits_surface.json')),R=JSON.parse(fs.readFileSync('inputs/recompute.json'));
const A=S.acc,n1=A.length,n2=A[0].length,flat=A.flat(),P=[];for(let i=0;i<n1;i++)for(let j=0;j<n2;j++)P.push([i/(n1-1),j/(n2-1)]);
for(const [seed,py] of Object.entries(R.bo_paths)){const r=ML.rng(+seed),out=[];while(out.length<3){const c=Math.floor(r()*flat.length);if(!out.includes(c))out.push(c)}
  while(out.length<py.length){out.push(ML.gpEI(P,out,out.map(c=>flat[c]),0.15,0.01).next)}
  const same=out.filter((v,i)=>v===py[i]).length;console.log('seed',seed,'steps equal',same,'of',py.length)}
