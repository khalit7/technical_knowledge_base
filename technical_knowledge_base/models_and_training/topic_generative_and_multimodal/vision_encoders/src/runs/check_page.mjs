// Check the whole page: every control in every tab clicked at 390 px dark and 920 px light; no page errors, no NaN or
// undefined, no sideways scroll; reading words of the Reading tab (audit_pages.mjs is the measure); card screenshots to argv[2].
// Usage: node check_page.mjs <shots dir>
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=path.resolve(here,'../../index.html');
const shots=process.argv[2]||path.resolve(here,'.shots');fs.mkdirSync(shots,{recursive:true});
const b=await puppeteer.launch({headless:'shell'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let bad=0;
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  const out={};
  for(const tab of ['t-read','t-vecmp','t-veret','t-vecalc','t-more']){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);await wait(250);
    const H=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<H;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await wait(25)}
    const n=await p.evaluate(async tab=>{let k=0;const T=document.getElementById(tab);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      for(const el of T.querySelectorAll('button,summary')){if(el.closest('.an-ctl')&&/Play|Pause/.test(el.textContent))continue;el.click();k++;await sleep(2)}
      for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++;await sleep(2)}}
      for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2,r.min]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
      for(const r of T.querySelectorAll('input[type=number]')){const v0=r.value;for(const v of [r.min,r.max,v0]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
      for(const c of T.querySelectorAll('input[type=checkbox]')){c.click();c.dispatchEvent(new Event('change'));c.click();c.dispatchEvent(new Event('change'));k++}
      for(const c of [...T.querySelectorAll('canvas')].slice(0,12)){const r=c.getBoundingClientRect();if(!r.width)continue;
        c.dispatchEvent(new MouseEvent('click',{clientX:r.left+r.width*0.3,clientY:r.top+r.height*0.6,bubbles:true}));k++}
      for(const h of [...T.querySelectorAll('.hit')].slice(0,6)){h.click();k++}
      return k},tab);
    const r=await p.evaluate(tab=>{const T=document.getElementById(tab),t=T.innerText;
      return {nan:/\bNaN\b|undefined|Infinity/.test(t),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        wide:[...T.querySelectorAll('*')].filter(e=>!e.closest('.tw')&&!e.closest('.nav')&&!e.closest('.tabs')&&e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,4).map(e=>e.tagName+'#'+e.id+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)),
        words:t.split(/\s+/).filter(Boolean).length}},tab);
    out[tab]={controls:n,...r};
    if(r.nan||r.side||r.wide.length)bad++;
  }
  // screenshots of the animations at chosen steps, and of the tabs' main cards
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-read"]').click());await wait(200);
  for(const [id,ctl,steps] of [['ve-pt','ve-pt-ctl-s',[0,1,2,3,4,5,6,7]],['ve-ra','ve-ra-ctl-s',[0,2,3,4]],['ve-la','ve-la-ctl-s',[0,3,4,6]]]){
    for(const s of steps){await p.evaluate((c,s)=>{const e=document.getElementById(c);e.value=s;e.dispatchEvent(new Event('input'))},ctl,s);
      const el=await p.$('#'+id);await el.scrollIntoView();await wait(120);await el.screenshot({path:path.join(shots,id+'_'+s+'_'+w+'.png')})}}
  for(const id of ['ve-hero','ve-loss','ve-chunk','ve-typo','vk-shapes','vk-rules','ve-reg','ve-laion','ve-board','ve-layers','ve-flops']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await wait(100);await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  const myErrs=errs;if(myErrs.length)bad++;
  console.log(w,scheme,JSON.stringify(out),'errors',JSON.stringify(myErrs.slice(0,5)),'reading min',(out['t-read'].words/220).toFixed(1));
  await p.close();
}
// fresh page, normal and reduced motion: nothing may move before the reader acts; default-state card screenshots
for(const rm of ['no-preference','reduce']){const p=await b.newPage();await p.setViewport({width:920,height:900});
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:rm}]);await p.goto('file://'+page_);
  const H=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<H;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await wait(120)}
  await wait(3000);
  const moved=await p.evaluate(()=>[...document.querySelectorAll('.an-ctl input[type=range]')].filter(r=>+r.value!==0).map(r=>r.id));
  if(moved.length)bad++;console.log('motion',rm,'animations off step 0:',JSON.stringify(moved));
  if(rm==='no-preference')for(const id of ['ve-hero','ve-pt','ve-loss','ve-chunk','ve-typo']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await wait(100);await el.screenshot({path:path.join(shots,id+'_default_920.png')})}}
  await p.close()}
await b.close();
console.log(bad?'FAIL '+bad:'ALL OK');
