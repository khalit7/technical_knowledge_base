// Reading and Further reading tabs: click every control at 390 px dark and 920 px light; fail on page errors,
// NaN, undefined or sideways scroll. Usage (repo root): node <this file> <index.html> [screenshot dir]
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]),shots=process.argv[3];
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  for(const tab of ['t-read','t-more']){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,200));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;
      const els=[...root.querySelectorAll('button,select,input[type=range],summary')];
      for(const e of els){
        if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
        else if(e.type==='range'){for(let v=+e.min;v<=+e.max;v++){e.value=v;e.dispatchEvent(new Event('input'));c++}}
        else{e.click();c++}
        await new Promise(r=>setTimeout(r,5));
      }
      return c},tab);
    const bad=await p.evaluate(t=>{const s=document.getElementById(t).innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity/g)||[]).length},tab);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad===0,`${w} ${scheme} ${tab}: ${n} control actions, no NaN/undefined (${bad})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
    if(shots){await p.evaluate(t=>window.scrollTo(0,0),tab);await p.screenshot({path:`${shots}/rd_${tab}_${w}_${scheme}.png`,fullPage:true})}
  }
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
