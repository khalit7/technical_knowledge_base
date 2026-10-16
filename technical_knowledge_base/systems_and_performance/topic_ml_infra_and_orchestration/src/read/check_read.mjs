// Reading tab: the numbers the page prints come from the same simulators and formulas as recompute.py.
// Usage (repo root): node <this file> <index.html> <expected.json>
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);const X=JSON.parse(fs.readFileSync(process.argv[3]));
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
try{
const p=await b.newPage();await p.setViewport({width:920,height:900});
await p.goto('file://'+page_path,{waitUntil:'load'});
const g=await p.evaluate(()=>({bf:window.RD_BF,ck:window.RD_CK,l3:window.RD_FAIL,words:window.RD_WORDS,
  txt:id=>0,ids:Object.fromEntries(['rd-bf-m1','rd-bf-m2','rd-bf-u1','rd-bf-u2','rd-bf-w1','rd-bf-w2','rd-l3m','rd-m1k','rd-m100k','rd-ck70','rd-ck405','rd-time'].map(i=>[i,(document.getElementById(i)||{}).textContent]))}));
for(const m of ['fifo','easy']){
  ok(JSON.stringify(g.bf[m].sched)===JSON.stringify(Object.fromEntries(Object.entries(X[m].sched).map(([k,v])=>[k,v])))||Object.keys(X[m].sched).every(k=>g.bf[m].sched[k][0]===X[m].sched[k][0]&&g.bf[m].sched[k][1]===X[m].sched[k][1]),`${m} schedule matches recompute.py`);
  ok(g.bf[m].makespan===X[m].makespan&&Math.abs(g.bf[m].util-X[m].util)<1e-9&&Math.abs(g.bf[m].meanWait-X[m].mean_wait)<1e-9,`${m} makespan ${g.bf[m].makespan}, util ${g.bf[m].util.toFixed(3)}, mean wait ${g.bf[m].meanWait}`);
}
ok(g.ids['rd-bf-m1']==String(X.fifo.makespan)&&g.ids['rd-bf-m2']==String(X.easy.makespan),'prose makespans');
ok(g.ids['rd-bf-u1']==Math.round(X.fifo.util*100)+'%'&&g.ids['rd-bf-u2']==Math.round(X.easy.util*100)+'%','prose utilisation');
ok(g.ids['rd-bf-w1']==X.fifo.mean_wait.toFixed(1)&&g.ids['rd-bf-w2']==X.easy.mean_wait.toFixed(1),'prose mean waits');
ok(g.ids['rd-l3m']==X.llama3_mtbf_h.toFixed(1),'Llama 3 MTBF '+g.ids['rd-l3m']);
ok(g.ids['rd-m1k']==String(Math.round(X.mtbf_1000)),'1,000-GPU MTBF '+g.ids['rd-m1k']+' h');
ok(g.ids['rd-m100k']==String(Math.round(X.mtbf_100000*60)),'100,000-GPU MTBF '+g.ids['rd-m100k']+' min');
ok(g.ids['rd-ck70']==X.ckpt_70B_TB.toFixed(2)&&g.ids['rd-ck405']==X.ckpt_405B_TB.toFixed(1),'checkpoint sizes');
for(const m of ['none','ckpt'])ok(Math.abs(g.ck[m].end-X['tl_'+m].end)<1e-9&&Math.abs(g.ck[m].lost-X['tl_'+m].lost)<1e-9,`timeline ${m}: ends ${g.ck[m].end.toFixed(2)} h, lost ${g.ck[m].lost.toFixed(2)} h, goodput ${(g.ck[m].goodput*100).toFixed(1)}%`);
// calculator against recompute.py's Young rows
for(const n of [1000,16384,100000]){
  const r=await p.evaluate(n=>{const s=(id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('change'))};s('rd-mt-n',n);s('rd-mt-c',60);s('rd-mt-r',600);return document.getElementById('rd-mt-out').innerText},n);
  const y=X['young_'+n];const lossTxt=y.lost>=0.5?'over 50%':(y.lost*100).toFixed(1)+'%';
  ok(r.includes(lossTxt),`calculator N=${n}: shows ${lossTxt}`);
}
ok(Math.abs(+g.ids['rd-time']-g.words/200)<0.6,`reading time ${g.ids['rd-time']} min from ${g.words} words`);
}finally{await b.close()}
console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
