// Scheduling lab: click every control at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// Infinity or sideways scroll; save screenshots. Usage (repo root): node <this file> <index.html> [screenshot dir]
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]),shots=process.argv[3];
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-sched"]').click());
  await new Promise(r=>setTimeout(r,300));
  if(shots)await p.screenshot({path:path.join(shots,'sched_'+w+'_top.png'),fullPage:false});
  const n=await p.evaluate(async()=>{const root=document.getElementById('t-sched');let c=0;
    const els=[...root.querySelectorAll('button,select,input[type=range],input[type=checkbox],summary')];
    for(const e of els){
      if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
      else if(e.type==='range'){const st=Math.max(+e.step||1,(+e.max-+e.min)/30);for(let v=+e.min;v<=+e.max+1e-9;v+=st){e.value=v;e.dispatchEvent(new Event('input'));c++}e.value=e.defaultValue;e.dispatchEvent(new Event('input'))}
      else{e.click();c++}
      await new Promise(r=>setTimeout(r,3));
    }
    return c});
  const bad=await p.evaluate(()=>{const s=document.getElementById('t-sched').innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity|\?\s*<|>\?</g)||[])});
  const q=await p.evaluate(()=>[...document.querySelectorAll('#t-sched b[id],#t-sched span[id]')].filter(e=>e.textContent.trim()==='?').map(e=>e.id));
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(errs.length===0,w+' '+scheme+': no errors '+errs.slice(0,3).join(' | '));
  ok(bad.length===0,w+': no NaN/undefined/Infinity '+bad.slice(0,5).join(','));
  ok(q.length===0,w+': every data-bound number filled '+q.join(','));
  ok(sw<=0,w+': no sideways scroll ('+sw+')');
  ok(n>40,w+': clicked '+n+' controls');
  if(shots){await p.evaluate(()=>{document.querySelectorAll('#t-sched details').forEach(d=>d.open=false)});
    const secs=await p.evaluate(()=>[...document.querySelectorAll('#t-sched section')].map(s=>s.id));
    for(const id of secs){const el=await p.$('#'+id);await el.screenshot({path:path.join(shots,'sched_'+w+'_'+id+'.png')})}}
  await p.close();
}
}finally{await b.close()}
console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
