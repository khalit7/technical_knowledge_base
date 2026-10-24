// Check every tab: every button clicked, every range moved, every select changed, at 390 px dark and 920 px light;
// no page errors, no NaN, undefined or unfilled "?" numbers, no broken images, no sideways scroll; nothing playing on load.
// Usage: node check_page.mjs <shots dir>
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=path.resolve(here,'../index.html');
const shots=process.argv[2]||path.resolve(here,'..','.shots_av');fs.mkdirSync(shots,{recursive:true});
const TABS=['t-read','t-avtok','t-more'];
const b=await puppeteer.launch({headless:'shell'});
let bad=0;
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  for(let y=0;y<30000;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,30))}
  await new Promise(r=>setTimeout(r,1500));
  const playing=await p.evaluate(()=>[...document.querySelectorAll('.an-play')].filter(b=>/Pause/.test(b.textContent)).length);
  console.log(w,scheme,'animations playing after scrolling, before any click:',playing);if(playing)bad++;
  await p.evaluate(()=>scrollTo(0,0));
  for(const tab of TABS){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,300));
    const H=await p.evaluate(()=>document.body.scrollHeight);
    for(let y=0;y<H;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,40))}
    const n=await p.evaluate(async t=>{let k=0;const T=document.getElementById(t);
      for(const el of T.querySelectorAll('button')){el.click();k++;await new Promise(r=>setTimeout(r,5))}
      for(const r of T.querySelectorAll('input[type=range]')){for(let v=+r.min;v<=+r.max;v++){r.value=v;r.dispatchEvent(new Event('input'));k++}}
      for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++}}
      for(const tr of T.querySelectorAll('tr[data-k]')){tr.click();k++}
      for(const d of T.querySelectorAll('[data-v]')){d.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));k++;break}
      for(const d of T.querySelectorAll('details')){d.open=true}
      return k},tab);
    await new Promise(r=>setTimeout(r,400));
    const res=await p.evaluate(t=>{const T0=document.getElementById(t);const T=T0.cloneNode(true);T.querySelectorAll('[data-nanok],style').forEach(e=>e.remove());document.body.appendChild(T);T.hidden=false;T.id='';const txt=T.innerText;T.remove();
      return {nan:/\bNaN\b/.test(txt),undef:/\bundefined\b/.test(txt),q:[...T0.querySelectorAll('[data-av]')].filter(e=>e.textContent==='?').map(e=>e.dataset.av),
        sw:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        broken:[...T0.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length}},tab);
    console.log(w,scheme,tab,'controls',n,JSON.stringify(res));
    if(res.nan||res.undef||res.q.length||res.sw||res.broken)bad++;
    const secs=await p.evaluate(t=>[...document.querySelectorAll('#'+t+' section, #'+t+' .rd-card')].map((s,i)=>{if(!s.id)s.id='avshot'+i;return s.id}),tab);
    for(const id of secs){await p.evaluate(id=>document.getElementById(id).scrollIntoView(),id);await new Promise(r=>setTimeout(r,120));
      await p.screenshot({path:path.join(shots,`${w}_${scheme}_${tab}_${id}.png`)})}
  }
  // reading time: html_utils/audit_pages.mjs (230 words a minute, closed details apart) is the measure of record
  console.log('errors',errs.length);errs.slice(0,8).forEach(e=>console.log('  ',e));if(errs.length)bad++;
  await p.close();
}
}finally{await b.close()}
console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
