// Storage and data movement (tabs since 2026-10-24: Reading, Sizing calculator, Further reading): click every control in every tab at 390 px dark and 920 px light; fail on page errors,
// NaN, undefined, Infinity or sideways scroll; check the page's sizing JS against recompute.py's cases;
// screenshot every card with an id. Usage (repo root): node <this file> <page folder> [shots dir]
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const folder=path.resolve(process.argv[2]),shots=process.argv[3];
const cases=JSON.parse(fs.readFileSync(path.join(folder,'src','out','size_cases.json'),'utf8'));
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+path.join(folder,'index.html'),{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  // no animation may move before the reader acts (2026-10-24): load, scroll the Reading tab end to end, wait, then look
  const playing=await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}
    await new Promise(r=>setTimeout(r,1500));return [...document.querySelectorAll('button[aria-label="Pause"]')].length+[...document.querySelectorAll('input[type=range][id$="-s"]')].filter(e=>+e.value>0).length});
  ok(playing===0,`${w} ${scheme}: nothing autoplays after a full scroll (${playing} moved)`);
  await p.evaluate(()=>scrollTo(0,0));
  for(const tab of ['t-read','t-sdsize','t-more']){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,200));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;
      const els=[...root.querySelectorAll('button,select,input,summary')];
      for(const e of els){
        if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'));c++}}
        else if(e.type==='range'){const lo=+e.min,hi=+e.max;for(let k=0;k<=12;k++){e.value=lo+(hi-lo)*k/12;e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='number'){const v=e.value;for(const x of ['0','1','37',v]){e.value=x;e.dispatchEvent(new Event('input'));c++}}
        else if(e.tagName==='SUMMARY'){e.click();c++}
        else{e.click();c++}
        await new Promise(r=>setTimeout(r,3));
      }
      // walk every animation through all its steps in every mode
      for(const seg of root.querySelectorAll('.seg')){for(const sb of seg.querySelectorAll('button')){sb.click();
        const card=seg.closest('.card,.rd-card,.io-card');const fwd=card&&card.querySelector('button[aria-label="Next step"]');
        if(fwd)for(let k=0;k<20;k++){fwd.click();c++}}}
      return c},tab);
    const bad=await p.evaluate(t=>{const s=document.getElementById(t).innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g)||[])},tab);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad.length===0,`${w} ${scheme} ${tab}: ${n} control actions, no NaN/undefined/null (${bad.slice(0,3)})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
    if(shots){const ids=await p.evaluate(t=>[...document.getElementById(t).querySelectorAll('.card[id],.rd-card[id]')].map(e=>e.id),tab);
      for(const id of ids){const el=await p.$('#'+id);if(el)await el.screenshot({path:`${shots}/${w}_${scheme}_${id}.png`})}}
  }
  if(w===920){const r=await p.evaluate(cs=>cs.map(c=>{const o=window.SD_SIZE(c.in);return Object.keys(c.out).every(k=>Math.abs(o[k]-c.out[k])<=1e-9*Math.max(1,Math.abs(c.out[k])))}),cases);
    ok(r.every(Boolean),`sizing JS equals recompute.py on ${r.length} cases (${r.filter(x=>!x).length} differ)`)}
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
}finally{await b.close()}
console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
