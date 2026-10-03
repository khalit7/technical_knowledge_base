// Runs the page's engine (parts/22_js_rd_engine.js) in Node and compares it with recompute.py's expected.json.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url'; import vm from 'vm';
const here=path.dirname(fileURLToPath(import.meta.url));
const ctx={Math,Float64Array,Int32Array,Array,Object,isFinite,console};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here,'../parts/22_js_rd_engine.js'),'utf8'),ctx);
const E=ctx.RDE,X=JSON.parse(fs.readFileSync(path.join(here,'expected.json'),'utf8'));
let n=0,bad=0,worst=0;
function cmp(name,a,b,tol){n++;const d=Math.abs(a-b)/Math.max(1e-300,Math.abs(b)),e=Math.abs(a-b);const ok=d<=tol||e<=tol*1e-3||(Math.abs(b)<1e-12&&Math.abs(a)<1e-12);if(!ok){bad++;if(bad<40)console.log('MISMATCH',name,a,b,'rel',d.toExponential(2))}if(isFinite(d)&&d>worst&&Math.abs(b)>1e-12)worst=d}
const arr=(nm,a,b,t)=>{if(a.length!==b.length){bad++;console.log('LEN',nm,a.length,b.length);return}a.forEach((v,i)=>cmp(nm+'['+i+']',v,b[i],t))};
X.stats.forEach((s,i)=>{const j=E.stats(i);arr('acts '+s.mode,j.acts,s.acts,1e-9);arr('grads '+s.mode,j.grads,s.grads,1e-8);cmp('loss '+s.mode,j.loss,s.loss,1e-11);cmp('head '+s.mode,j.head,s.head,1e-9)});
for(const k of ['classic','modern']){const j=E.step(k),e=X.step[k];for(const f of Object.keys(e))cmp('step '+k+' '+f,j[f],e[f],1e-7)}
const g=E.geometry();cmp('rank',g.rank,X.geometry.rank,0);cmp('adamOut',g.adamOut,X.geometry.adamOut,1e-8);arr('sv sgd',g.sgd,X.geometry.sgd,1e-7);arr('sv adam',g.adam,X.geometry.adam,1e-7);arr('sv muon',g.muon,X.geometry.muon,1e-7);g.iters.forEach((it,i)=>arr('ns'+i,it,X.geometry.iters[i],1e-7));
const TS=X.sched.ts;for(const k of ['step','isqrt','cosine','wsd'])TS.forEach((t,i)=>cmp('sched '+k+' '+t,E.SCHED[k](t),X.sched[k][i],1e-12));
const W=E.wdSim();for(const k of ['l2','adamw'])W.frames[k].forEach((fr,i)=>arr('wd '+k+' '+i,fr,X.wd[k][i],1e-8));
for(const key of Object.keys(X.bptt)){const [w,bf]=key.split('_').map(Number),j=E.bptt(w,bf);arr('bptt rnn '+key,j.rnn,X.bptt[key].rnn,1e-9);arr('bptt lstm '+key,j.lstm,X.bptt[key].lstm,1e-9)}
for(const key of Object.keys(X.roc)){const [dp,p]=key.split('_').map(Number),j=E.curves(dp,p);cmp('auc '+key,j.auc,X.roc[key].auc,1e-12);cmp('auprc '+key,j.auprc,X.roc[key].auprc,1e-10)}
for(const x of Object.keys(X.erf))cmp('erf '+x,E.erf(+x),X.erf[x],1e-13);
for(const key of Object.keys(X.losses)){const [p,gm]=key.split('_').map(Number),j=E.losses(p,10,0.1,gm),e=X.losses[key];for(const f of Object.keys(e))cmp('loss '+key+' '+f,j[f],e[f],1e-9)}
console.log(`check_engine: ${n} values compared, ${bad} mismatches, worst relative difference ${worst.toExponential(2)}`);
process.exit(bad?1:0);
