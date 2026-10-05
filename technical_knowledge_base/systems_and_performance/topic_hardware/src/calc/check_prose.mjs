// Confirms index.html embeds exactly the generated calculator data and that numbers written in the tab's prose match the model.
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url)),html=fs.readFileSync(path.join(here,'..','..','index.html'),'utf8');
const part=fs.readFileSync(path.join(here,'..','parts','32_js_calc_0data.js'),'utf8');
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m)}};
ok(html.includes(part.trim()),'page embeds the generated data part verbatim');
const R=JSON.parse(fs.readFileSync(path.join(here,'recompute.json'),'utf8'));
const ctx={window:{},Math,JSON,Object,Number,isFinite,String};ctx.window.matchMedia=ctx.matchMedia=()=>({matches:false});vm.createContext(ctx);
for(const f of ['32_js_calc_0data.js','32_js_calc_1core.js'])vm.runInContext(fs.readFileSync(path.join(here,'..','parts',f),'utf8'),ctx);
const X=ctx.window.CALCX,M=X.M;
ok(JSON.stringify(X.D.checks)===JSON.stringify(R.checks.map(c=>Object.assign({},c,{fmt:X.D.checks.find(d=>d.what===c.what).fmt}))),'checks in page equal recompute.json');
const tab=html.slice(html.indexOf('<div class="tab" id="t-calc"'),html.indexOf('<div class="tab" id="t-roof"'));
const txt=tab.replace(/<style>[\s\S]*?<\/style>/,'').replace(/<[^>]+>/g,'');
const r1=x=>Math.round(x*10)/10;
const claims=[
 ['on 507 values (all match)',507,507],
 ['8.03 billion',r1(M.l8.P/1e9*100)/100,8.03],
 ['adds 1.1% for PaLM',r1(12*118*48*256*2048/(6*540.35e9)*100),1.1],
 ['15% for Llama 3.1 70B at 8,192',Math.round(12*M.l70.L*M.l70.nh*M.l70.dqk*8192/(6*M.l70.P)*100),15],
 ['61% at 32,768',Math.round(12*M.l70.L*M.l70.nh*M.l70.dqk*32768/(6*M.l70.P)*100),61],
 ['37.6B and 671B',r1(M.dsv3.Pact/1e9),37.6],['37.6B and 671B (total)',Math.round(M.dsv3.P/1e9),671],
 ['5.13B active excludes',Math.round((M.oss120.Pact-M.oss120.V*M.oss120.h)/1e7)/100,5.13],['5.71B with it',Math.round(M.oss120.Pact/1e7)/100,5.71],
 ['295 FLOPs in the time it reads one byte',Math.round(989.5/3.35),295],
 ['524,288 tokens',64*8192,524288],
 ['450 GB/s each way per H100',X.C.h100.up,450],
];
for(const [s,v,w] of claims){ok(Math.abs(v-w)<1e-9,s+': computed '+v+' vs written '+w);const key=s.replace(/ \(total\)$/,'');ok(txt.includes(key),'prose contains "'+key+'"')}
ok(!/NaN|undefined/.test(txt),'no NaN/undefined in static text');
console.log('prose and embed checks',claims.length*2+3,'failures',bad);process.exit(bad?1:0);
