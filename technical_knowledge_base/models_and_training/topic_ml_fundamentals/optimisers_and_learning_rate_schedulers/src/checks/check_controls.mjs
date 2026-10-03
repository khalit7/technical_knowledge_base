// Click every control of the page at 390 px dark and 920 px light; report script errors and NaN / undefined / Infinity in visible text.
// Run from html_utils' node_modules: node checks/check_controls.mjs (resolves puppeteer from ../../../../../html_utils)
import { createRequire } from 'module';import path from 'path';
const here=path.dirname(new URL(import.meta.url).pathname);
const require=createRequire(path.resolve(here,'../../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const file='file://'+path.resolve(here,'../../index.html');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let bad=0;
for(const [scheme,w] of [['dark',390],['light',920]]){
  const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto(file);await sleep(300);
  const scan=async(where)=>{const t=await p.evaluate(()=>{const tb=document.querySelector('.tab:not([hidden])');return tb.innerText});
    const m=t.match(/NaN(?!, plateaus)|undefined|Infinity/g);if(m){bad++;console.log('BAD TEXT',where,m.slice(0,3))}};
  const clickAll=async(sel,where,after)=>{const n=await p.$$eval(sel,e=>e.length);for(let i=0;i<n;i++){await p.evaluate((s,i)=>document.querySelectorAll(s)[i].click(),sel,i);await sleep(60);if(after)await after();await scan(where+' '+i)}};
  // Reading
  await clickAll('#bc-mode button','bias mode',async()=>{await clickAll('#bc-b2 button','b2');await p.evaluate(()=>{const s=document.getElementById('bc-ctl-s');for(const v of [0,11,39]){s.value=v;s.dispatchEvent(new Event('input'))}})});
  await clickAll('#mem-model button','mem');
  await clickAll('#en-mode button','end',async()=>{await p.evaluate(()=>{const s=document.getElementById('en-ctl-s');s.value=59;s.dispatchEvent(new Event('input'))})});
  // Race
  await p.click('button[data-t=t-race]');await sleep(200);
  const surfs=await p.$$eval('#rc-surf button',e=>e.length);
  for(let i=0;i<surfs;i++){await p.evaluate(i=>document.querySelectorAll('#rc-surf button')[i].click(),i);await sleep(50);
    // all optimisers on
    await p.evaluate(()=>document.querySelectorAll('#rc-pick input').forEach(c=>{if(!c.checked)c.click()}));await sleep(50);
    for(const sch of ['const','cosine','wsd'])for(const mv of ['-8','0','8']){
      await p.evaluate((sch,mv)=>{document.querySelector('#rc-sch button[data-v='+sch+']').click();const r=document.getElementById('rc-mul');r.value=mv;r.dispatchEvent(new Event('input'));
        const s=document.getElementById('rc-ctl-s');s.value=99;s.dispatchEvent(new Event('input'))},sch,mv);await sleep(30);await scan('race '+i+' '+sch+' '+mv)}
    await p.evaluate(()=>{const r=document.getElementById('rc-mul');r.value='0';r.dispatchEvent(new Event('input'));const sd=document.getElementById('rc-seed');sd.value='3';sd.dispatchEvent(new Event('change'))});await sleep(30);await scan('seed')}
  await p.click('button[data-t=t-more]');await sleep(100);await scan('more');
  const dead=await p.$$eval('a[target=_blank]',as=>as.filter(a=>!/^https?:\/\//.test(a.href)).map(a=>a.href));
  console.log(scheme,w,'errors',errs,'non-http links',dead.length);if(errs.length)bad++;
  await b.close()}
console.log('bad',bad);
