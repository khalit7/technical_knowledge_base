// Cost lab tab (t-cost): click every control at 390 px dark and 920 px light; fail on page errors,
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
  p.on('pageerror',e=>errs.push(String(e.stack||e).slice(0,300)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text()+' @'+JSON.stringify(m.location())+' '+(m.stackTrace()||[]).map(s=>s.url.slice(-20)+':'+s.lineNumber+':'+s.columnNumber).join(','))});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  for(const tab of ['t-cost']){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,200));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;
      const els=[...root.querySelectorAll('button,select,input[type=range],input[type=number],summary,[data-co-f]')];
      for(const e of els){
        if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='range'){const lo=+e.min,hi=+e.max;for(let k=0;k<=20;k++){e.value=lo+(hi-lo)*k/20;e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='number'){for(const v of [e.min||0,e.value*2||10,e.value]){e.value=v;e.dispatchEvent(new Event('input'));c++}}
        else if(e.tagName==='g'){e.dispatchEvent(new MouseEvent('click',{bubbles:true}));c++}
        else{e.click();c++}
        await new Promise(r=>setTimeout(r,5));
      }
      return c},tab);
    
    const bad=await p.evaluate(t=>{const s=document.getElementById(t).innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity/g)||[]).length},tab);
    const je=await p.evaluate(()=>{const e=document.getElementById('jsErr');return e&&!e.hidden?e.textContent.slice(0,600):''});if(je)console.log('jsErr:',je);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad===0,`${w} ${scheme} ${tab}: ${n} control actions, no NaN/undefined (${bad})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
    if(shots){await p.evaluate(t=>window.scrollTo(0,0),tab);await p.screenshot({path:`${shots}/co_${tab}_${w}_${scheme}.png`,fullPage:true})}
  }
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
