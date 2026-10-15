// Checks that the Reading tab embeds exactly the recorded figures (src/read/facts.md), that numbers quoted in its
// prose match the embedded data, that derived numbers recompute, and measures the reading time.
// Usage (from the repo root): node <this file> <path to index.html>
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();
await p.goto('file://'+page_path,{waitUntil:'load'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const D=await p.evaluate(()=>window.RDJ);
const text=await p.evaluate(()=>{document.querySelectorAll('#t-read details').forEach(d=>d.open=true);document.querySelectorAll('#t-read .ans').forEach(a=>a.hidden=false);return document.getElementById('t-read').innerText});
const has=s=>text.includes(s);
// 1. embedded vendor figures equal facts.md
const exp={v5e:[197e12,819e9,16],v5p:[459e12,2765e9,95*1.073741824],v6e:[918e12,1638e9,32],Ironwood:[2307e12,7380e9,192*1.073741824]};
ok(D.tpu.every(t=>JSON.stringify([t.peak,t.bw,t.hbm])===JSON.stringify(exp[t.n])),'TPU specs as in facts.md');
ok(D.hf.pytorch===255916&&D.hf.jax===12404,'Hugging Face counts');
const EQ=JSON.parse(fs.readFileSync(path.join(path.dirname(page_path),'src/data/equiv.json'),'utf8'));
ok(D.models[0].p===EQ.n_params&&has(EQ.n_params.toLocaleString('en-US')+' parameters'),'running example parameter count = equiv.json');
ok(D.models.find(m=>m.n==='LLaMA 3-70B').p===70.4e9&&D.bytesPerParam===16,'70B parameter count and 16 bytes per parameter');
// 2. derived numbers recompute and match the prose and table
const ridge=t=>t.peak/t.bw;
const R=Object.fromEntries(D.tpu.map(t=>[t.n,Math.round(ridge(t))]));
ok(R.v5e===241&&R.v5p===166&&R.v6e===560&&R.Ironwood===313,'ridge points 241, 166, 560, 313 ('+JSON.stringify(R)+')');
const tableRidges=await p.evaluate(()=>[...document.querySelectorAll('#rd-s6 table tbody tr')].map(r=>r.lastElementChild.textContent.trim()));
ok(JSON.stringify(tableRidges)===JSON.stringify(['241','166','560','313']),'ridge column in the table');
ok(has('8 ÷ 560 = 1.4%')&&Math.abs(8/ridge(D.tpu[2])*100-1.43)<0.01,'decode predict 1.4%');
ok(has('2,307 ÷ 918 = 2.5x')&&has('4,614 ÷ 918 = 5.0x')&&Math.abs(2307/918-2.51)<0.01&&Math.abs(4614/918-5.03)<0.01,'Ironwood ratios');
ok(has('about 21 to 1')&&Math.round(D.hf.pytorch/D.hf.jax)===21,'Hub ratio');
ok(has('255,916')&&has('12,404'),'Hub counts in prose');
ok(has('166 (v5p) to 560 (v6e)'),'interview ridge range');
// 3. the memory widget: 70B with data parallel = 1.1 TB; fewest chips
const sh=await p.evaluate(()=>document.getElementById('rd-sh-cap').innerText);
ok(/1\.1 TB of training state/.test(sh)&&/v5p 12/.test(sh)&&/Ironwood 6/.test(sh),'memory widget default: '+sh.split('\n')[0]);
ok(Math.ceil(16*70.4e9/1e9/(95*1.073741824))===12,'70B needs 12 v5p chips for the state alone');
// 4. code shown on the page equals the recorded run (if filled)
const exPath=path.join(path.dirname(page_path),'src/read/out/examples.json');
if(fs.existsSync(exPath)){const ex=JSON.parse(fs.readFileSync(exPath,'utf8'));
  for(const k of Object.keys(ex).filter(k=>k[0]!=='_')){const first=ex[k].output.split('\n')[0].trim();ok(first===''||has(first.slice(0,60)),'run output shown: '+k)}}
// 5. reading time: words outside widgets, captions included
const words=await p.evaluate(()=>{const r=document.getElementById('t-read').cloneNode(true);
  r.querySelectorAll('details,.rd-card,.pr .ans,pre,nav,style,script,.an-ctl,.an-cnt').forEach(e=>e.remove());
  const main=r.innerText.split(/\s+/).filter(Boolean).length;
  const f=document.getElementById('t-read').cloneNode(true);let fold=0;f.querySelectorAll('details>div,.pr .ans').forEach(e=>fold+=e.innerText.split(/\s+/).filter(Boolean).length);
  return {main,fold}});
const mins=Math.round(words.main/200),fmins=Math.round(words.fold/200);
console.log('reading: '+words.main+' words outside widgets = about '+mins+' min; folded answers '+words.fold+' words = about '+fmins+' min');
const shown=await p.evaluate(()=>document.getElementById('rd-time').textContent);
ok(Math.abs(+shown-mins)<=2,'stated reading time '+shown+' within 2 min of measured '+mins);
// 6. TODO markers left
const todos=await p.evaluate(()=>[...document.querySelectorAll('#t-read .rd-todo,#t-more .rd-todo')].map(e=>e.id||e.textContent.slice(0,40)));
console.log('TODO boxes left: '+todos.length+' '+todos.join(', '));
console.log(fail?'FAILED '+fail:'all checks passed');
await b.close();process.exit(fail?1:0);
