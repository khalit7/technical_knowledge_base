// Evaluates the calculator's JS model on every case in recompute.json and compares with the Python reference.
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url)),parts=path.join(here,'..','parts');
const ctx={window:{},Math,JSON,Object,Number,isFinite,String};ctx.window.matchMedia=ctx.matchMedia=()=>({matches:false});vm.createContext(ctx);
for(const f of ['32_js_calc_0data.js','32_js_calc_1core.js'])vm.runInContext(fs.readFileSync(path.join(parts,f),'utf8'),ctx);
const X=ctx.window.CALCX,R=JSON.parse(fs.readFileSync(path.join(here,'recompute.json'),'utf8'));
let n=0,bad=0;
function cmp(tag,a,b){for(const k in b){const x=a[k],y=b[k];n++;
  if(typeof y==='number'){if(!(Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(y)))){bad++;console.log('MISMATCH',tag,k,x,y)}}
  else if(y!==null&&typeof y!=='object'&&x!==y){bad++;console.log('MISMATCH',tag,k,x,y)}
  else if(y===null&&x!==null){bad++;console.log('MISMATCH',tag,k,x,y)}}}
R.train.forEach((c,i)=>cmp('train'+i,X.train(c.in),c.out));
R.decode.forEach((c,i)=>cmp('decode'+i,X.decode(c.in),c.out));
R.cross.forEach((c,i)=>{n++;const v=X.crossover(c.in);if(v!==c.out){bad++;console.log('MISMATCH cross',i,v,c.out)}});
R.prefill.forEach((c,i)=>cmp('prefill'+i,X.prefill(c.in),c.out));
R.allreduce.forEach((c,i)=>{n++;const v=X.allreduce(...c.in);if(Math.abs(v-c.out)>1e-12){bad++;console.log('MISMATCH ar',i,v,c.out)}});
R.tp.forEach((c,i)=>cmp('tp'+i,X.tpRatio(c.in),c.out));
for(const k in R.anim){const ov=k.endsWith('o');cmp('anim'+k,X.stepAnim(ov?k.slice(0,-1):k,ov),R.anim[k])}
console.log('checked',n,'values, mismatches',bad);process.exit(bad?1:0);
