// Runs the page's simulator (parts/31_js_sc_core.js) on the reference cases written by gen_ref.py and compares every field.
// usage: node check_sim.mjs out/ref.json
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const ctx={window:{},Math,Array,Object};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here,'..','parts','31_js_sc_core.js'),'utf8'),ctx);
const S=ctx.window.PRSIM;const cases=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let bad=0,num=0;
for(const c of cases){const r=S.run(c.params);
  for(const k of Object.keys(c.result)){if(k==='series')continue;num++;if(Math.abs(r[k]-c.result[k])>1e-9){bad++;console.log('DIFF',c.params.metric,c.params.cold,k,r[k],c.result[k])}}
  if(r.series.length!==c.result.series.length){bad++;console.log('LEN',r.series.length,c.result.series.length);continue}
  r.series.forEach((s,i)=>{for(const k of Object.keys(s)){num++;const d=Math.abs(s[k]-c.result.series[i][k]);if(d>1.01e-4*(k==='metric'?1:10)){bad++;if(bad<10)console.log('DIFF series',c.params.metric,i,k,s[k],c.result.series[i][k])}}});
}
console.log(cases.length+' cases, '+num+' numbers compared, '+bad+' differences');process.exit(bad?1:0);
