// Runs the page's SAT_CORE (parts/33_js_sat_a.js + 33_js_sat_b.js) in node and compares every duration with expected.json from check_saturation.py.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const H=path.dirname(fileURLToPath(import.meta.url)), P=path.join(H,'..','parts');
const ctx={window:{}}; vm.createContext(ctx);
for(const f of ['33_js_sat_a.js','33_js_sat_b.js']) vm.runInContext(fs.readFileSync(path.join(P,f),'utf8'),ctx);
const C=ctx.window.SAT_CORE, exp=JSON.parse(fs.readFileSync(path.join(H,'expected.json'),'utf8'));
let n=0,bad=0;
for(const key in exp){const [f,mode,ch,ind]=key.split('|');const o={f:+f,mode,chance:ch==='1',indOnly:ind==='1'};
  for(const b of C.D.benchmarks){const r=C.crossing(b,o),e=exp[key][b.id];n++;
    const ok=r.status===e.status&&r.days===e.days&&Math.abs(r.thr-e.thr)<1e-6&&(!e.model||(r.pt&&r.pt.m===e.model));
    if(!ok){bad++;console.log('MISMATCH',key,b.id,JSON.stringify(e),r.status,r.days,r.pt&&r.pt.m)}}}
console.log(`core check: ${n} durations compared, ${bad} mismatches`); process.exit(bad?1:0);
