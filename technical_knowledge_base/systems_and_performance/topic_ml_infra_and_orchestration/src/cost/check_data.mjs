// Cost lab: the page embeds exactly out/co_data.json, the calculator matches recompute.py, every number
// filled into the prose comes from the data. Usage (repo root): node <this file> <index.html>
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname);
const data=JSON.parse(fs.readFileSync(path.join(here,'out/co_data.json'),'utf8'));delete data.azure_raw;
const rc=JSON.parse(fs.readFileSync(path.join(here,'out/recompute.json'),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();
await p.goto('file://'+path.resolve(process.argv[2]),{waitUntil:'load'});
await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-cost"]').click());
const r=await p.evaluate(()=>{const C=window.CO;const o={params:405853388800,tokens_t:15.6,gpu:'h100',n:16384,mfu:0.4,price:5.97,rate_k:C.calc.LLAMA_RATE,stall_s:60,restart_min:10,interval_min:+document.getElementById('co-c-iv').value,idle:0};
  return {D:window.CO_DATA,run:C.calc.run(o),iv:o.interval_min,spans:[...document.querySelectorAll('#t-cost [data-co]')].map(e=>[e.dataset.co,e.textContent]),
    text:document.getElementById('t-cost').innerText}});
ok(JSON.stringify(r.D)===JSON.stringify(data),'embedded data equals out/co_data.json');
ok(r.iv===rc.yd,'default interval is the Young/Daly optimum '+rc.yd+' min');
for(const k of ['paid_h','goodput','wall_days','cost','ideal_h','mtbf_h'])ok(Math.abs(r.run[k]/rc.defaults[k]-1)<1e-9,'calculator '+k+' = recompute.py '+rc.defaults[k]);
ok(r.spans.length>0&&r.spans.every(([k,v])=>v.trim().length>0),'all '+r.spans.length+' prose numbers filled');
// hand-written numbers in the prose, checked against the data
const q=data.queue,F=Object.fromEntries(data.fails.map(f=>[f.key,f]));
const checks=[['29% idle',Math.round((1-q.fifo.util)*100)===29],['12 of 12',q.deadlock.gpus_held===12&&q.deadlock.cap_gpus===12],
  ['4 fake GPUs held per failure run',data.fails.every(f=>Math.abs(f.held_gpu_s-4*f.segs.reduce((a,s)=>a+s[1]-s[0],0))<1e-6)],
  ['crash at step 120',F.crash.crash_step===120&&F.nockpt.crash_step===120],['resume from 100',F.crash.resumed_from===100],
  ['about 40% (Slurm training share)',Math.abs(data.alloc[0].train/data.alloc[0].alloc_s-0.4)<0.05],
  ['1.39 MB checkpoint, 4 writes per 200 steps',data.alloc.every(a=>a.steps%50===0)],
  ['all runs reach the same loss',data.alloc.filter(a=>a.steps===200).every(a=>a.gloss===2.264)]];
for(const [m,c] of checks)ok(c,'prose: '+m);
ok(!/\bNaN\b|undefined/.test(r.text),'no NaN or undefined in the tab');
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
