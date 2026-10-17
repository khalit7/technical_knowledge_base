// Check the whole page: every control in every tab clicked at 390 px dark and 920 px light; no page errors, NaN,
// undefined or "missing"; no sideways scroll; screenshots of each tab; Reading word count for the reading time.
// Usage: node check_page.mjs [shots dir]   (one headless-shell browser, closed at the end)
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=path.resolve(here,'../index.html');
const shots=process.argv[2]||path.resolve(here,'../.shots_fm');fs.mkdirSync(shots,{recursive:true});
const b=await puppeteer.launch({headless:'shell'});
let bad=0;
const TABS=['t-read','t-fmpath','t-fmsteps','t-fmts','t-more'];
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('requestfailed',r=>errs.push('request failed: '+r.url().slice(-80)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  for(const tab of TABS){
    await p.evaluate(t=>{document.querySelector('#tabs button[data-t="'+t+'"]').click();scrollTo(0,0)},tab);
    const H=await p.evaluate(()=>document.body.scrollHeight);
    for(let y=0;y<H;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,40))}
    const n=await p.evaluate(async(t)=>{let k=0;const T=document.getElementById(t);
      for(const el of T.querySelectorAll('button,summary')){el.click();k++;await new Promise(r=>setTimeout(r,12))}
      for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));s.dispatchEvent(new Event('input'));k++;await new Promise(r=>setTimeout(r,5))}}
      for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
      for(const c of T.querySelectorAll('input[type=checkbox]')){c.click();c.click();k++}
      const cv=T.querySelector('#fmr-avg');if(cv){const r=cv.getBoundingClientRect();for(const [fx,fy] of [[.2,.3],[.8,.7]]){const o={clientX:r.left+fx*r.width,clientY:r.top+fy*r.height,bubbles:true};cv.dispatchEvent(new PointerEvent('pointerdown',o));cv.dispatchEvent(new PointerEvent('pointermove',o));window.dispatchEvent(new PointerEvent('pointerup',o));k++}}
      return k},tab);
    await new Promise(r=>setTimeout(r,400));
    await p.evaluate(()=>scrollTo(0,0));
    await p.screenshot({path:path.join(shots,tab+'_'+w+'.png'),fullPage:true});
    const r=await p.evaluate(t=>{const T=document.getElementById(t);const tx=T.innerText;
      return {nan:(tx.match(/.{0,30}(\bNaN\b|undefined|Infinity|missing |\bpending\b).{0,30}/)||[''])[0],side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        err:!document.getElementById('jsErr').hidden?document.getElementById('jsErr').textContent:'',unexp:/\{\{/.test(T.innerHTML),words:tx.split(/\s+/).length}},tab);
    console.log(w,scheme,tab,'controls',n,JSON.stringify(r));
    if(r.nan||r.side||r.err||r.unexp)bad++;
  }
  console.log(w,'errors',errs.length?errs.slice(0,5):'none');if(errs.length)bad++;
  await p.close();
}
}finally{await b.close()}
console.log(bad?'FAIL '+bad:'OK');
