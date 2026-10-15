// Mixing lab (t-mix) checks. Usage from the repo root: node <this file> <path to index.html> [shots dir]
// 1. the page embeds exactly src/mix/mx_data.json; 2. the page's JS reproduces build_data.py's examples;
// 3. prose numbers match the data; 4. every control clicked at 390 px dark and 920 px light (reduced motion too):
//    no JS errors, no NaN/undefined/Infinity in the tab, no sideways scroll, no SVG wider than its box.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);const shots=process.argv[3]||null;
const here=path.dirname(new URL(import.meta.url).pathname);
const want=JSON.parse(fs.readFileSync(path.join(here,'mx_data.json'),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});
async function open(w,dark,rm){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:dark?'dark':'light'},{name:'prefers-reduced-motion',value:rm?'reduce':'no-preference'}]);
  await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('dc-tab','t-mix')}catch(e){}});
  await p.goto('file://'+page_path,{waitUntil:'load'});await new Promise(r=>setTimeout(r,300));return {p,errs}}
// ---------- 1 to 3 on one page
{const {p,errs}=await open(920,false,true);
  const D=await p.evaluate(()=>window.MXD);
  ok(JSON.stringify(D)===JSON.stringify(want),'embedded data equals mx_data.json');
  // JS maths against the build's examples
  const js=await p.evaluate(()=>{const X=MXX,D=MXD,U=D.domains.map(d=>d.gpt2*1e9);const out={};
    for(const B of [1e12,4e12,15e12])for(const [n,w] of [['natural',X.temperature(U,1)],['T2',X.temperature(U,2)],['T333',X.temperature(U,3.33)],['T5',X.temperature(U,5)],['uniform',[.2,.2,.2,.2,.2]],['unimax4',X.unimax(U,B,4)]]){
      out[n+'_'+(B/1e12)+'T']=w.map((v,i)=>({w:v,ep:v*B/U[i],eff:X.eff(U[i],v*B)/1e9}))}return out});
  let maxd=0;for(const k in want.examples)want.examples[k].rows.forEach((r,i)=>{const j=js[k][i];maxd=Math.max(maxd,Math.abs(j.w-r.w)/1e-6,Math.abs(j.ep-r.epochs)/1e-3,Math.abs(j.eff-r.eff)/1e-2)});
  ok(maxd<=0.51,'page JS reproduces build_data.py examples to its rounding (worst '+maxd.toFixed(2)+' of the last printed digit)');
  const text=await p.evaluate(()=>{document.querySelectorAll('#t-mix details').forEach(d=>d.open=true);document.querySelectorAll('#t-mix .pr .ans').forEach(a=>a.hidden=false);return document.getElementById('t-mix').innerText});
  const html=fs.readFileSync(page_path,'utf8');const has=s=>text.includes(s)||html.includes(s);  // captions of later animation steps live in the JS source
  const M=want.muennighoff_table;ok(has('worth 3.73 fresh passes')&&Math.abs(M['4']-3.726)<1e-9&&has('sixteen are worth 10.58')&&M['16']===10.582,'prose Muennighoff 4 and 16 epochs');
  ok(has('R</i>* = 15.39')||has('R* = 15.39'),'prose R* (15.39 from '+want.R_star+')');
  const O=want.olmo2;ok(has('1.2% of the run')&&Math.abs(O.mid_frac-0.01235)<1e-4,'prose OLMo 2 mid-training 1.2%');
  ok(has('about 30% of all the math')&&Math.abs(O.math_mid_share-0.297)<0.01,'prose 30% of math in the final stage ('+O.math_mid_share+')');
  ok(has('about 0.6% of every batch')&&Math.abs(O.stage1.math-0.00615)<3e-4,'prose stage-1 math 0.6%');
  ok(has('about 0.86% of every batch')&&Math.abs(O.static_math-0.00864)<1e-4,'prose static math 0.86%');
  ok(has('about 0.4B math tokens')&&Math.abs(O.static_math_mid-0.432)<0.01,'prose static math in the final 50B');
  const R=want.regmix_t4;ok(has('46.8 against 46.8')&&R.avg[1]===46.8&&R.avg[4]===46.8&&R.avg[5]===47.3&&R.best_on[4]==='5/14'&&R.best_on[1]==='0/14','prose RegMix Table 4');
  const C=want.cmr;ok(C.finance['460M']===29.8&&C.finance['3.1B']===47.8&&C.academic_460M===36.7,'CMR values');
  const hz=want.horizon.filter(r=>r.budget===15);ok(has('repeats it 15 to 75 times')&&hz.find(r=>r.name==='DCLM-baseline').epochs===15&&hz.find(r=>r.name==='FineWeb-Edu').epochs===75,'prose 15 to 75 epochs at 15T');
  const ex=want.examples['T333_4T'].rows[1];ok(has('About '+Math.round(ex.epochs)+' epochs'),'predict 1 answer uses build numbers ('+ex.epochs+')');
  ok(has('the final 1.2% of the run carries about 30%')||has('The final 1.2% of the run carries about 30%'),'caption 30%');
  ok(errs.length===0,'no JS errors on load'+(errs.length?': '+errs.join(' | '):''));await p.close()}
// ---------- 4 controls at two widths and themes
for(const [w,dark,rm] of [[390,true,false],[920,false,false],[390,false,true]]){
  const {p,errs}=await open(w,dark,rm);const tag=w+(dark?'-dark':'-light')+(rm?'-rm':'');
  const n=await p.evaluate(async()=>{const T=document.getElementById('t-mix');const sl=ms=>new Promise(r=>setTimeout(r,ms));let c=0;
    const btns=[...T.querySelectorAll('button')];for(const b of btns){if(b.offsetParent===null)continue;b.click();c++;await sl(30)}
    // every mode, then every range at min, mid and max
    for(const m of ['temp','unimax','manual']){T.querySelector('#mx-mode button[data-m="'+m+'"]').click();await sl(30);
      for(const r of [...T.querySelectorAll('input[type=range]')]){if(r.offsetParent===null)continue;for(const v of [r.min,Math.round((+r.min+ +r.max)/2),r.max]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));c++;await sl(5)}}}
    for(const s of ['static','staged'])for(let i=0;i<5;i++){T.querySelector('#mx-st-mode button[data-m="'+s+'"]').click();const r=document.getElementById('mx-st-ctl-s');r.value=i;r.dispatchEvent(new Event('input',{bubbles:true}));await sl(950);c++}
    return c});
  await new Promise(r=>setTimeout(r,1000));
  const bad=await p.evaluate(()=>{const T=document.getElementById('t-mix');const t=T.innerText;const m=t.match(/.{0,30}(NaN|undefined|Infinity(?!.{0,3}uniform)).{0,30}/);
    const sw=document.scrollingElement.scrollWidth>document.documentElement.clientWidth+1;
    const wide=[...T.querySelectorAll('svg')].filter(s=>s.getBoundingClientRect().width>s.parentElement.getBoundingClientRect().width+1).length;
    const err=document.getElementById('jsErr');return {m:m&&m[0],sw,wide,err:err&&!err.hidden?err.textContent:''}});
  ok(!bad.m,tag+': no NaN/undefined/Infinity'+(bad.m?' ('+bad.m+')':''));ok(!bad.sw,tag+': no sideways scroll');ok(bad.wide===0,tag+': no SVG wider than its box ('+bad.wide+')');
  ok(!bad.err&&errs.length===0,tag+': no JS errors'+(bad.err||errs.length?': '+bad.err+errs.join(' | '):'')+' ('+n+' actions)');
  if(shots){await p.evaluate(()=>{const s=document.getElementById('mx-st-ctl-s');s.value=2;s.dispatchEvent(new Event('input',{bubbles:true}))});await new Promise(r=>setTimeout(r,1000));
    for(const id of ['mx-s0','mx-s1','mx-s2','mx-s3','mx-s4','mx-s5','mx-s6','mx-s7']){const el=await p.$('#'+id);await el.screenshot({path:path.join(shots,'mx_'+tag+'_'+id+'.png')})}}
  await p.close()}
await b.close();console.log(fail?'FAILURES: '+fail:'all ok');process.exit(fail?1:0);
