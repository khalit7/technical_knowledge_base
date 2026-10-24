// Check the whole page: every control in every tab clicked at 390 px dark and 920 px light; no page errors, no NaN or
// undefined, no sideways scroll; card screenshots to argv[2]. Reading time: html_utils/audit_pages.mjs (230 words a minute).
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
  for(const tab of ['t-read','t-evcmp','t-evpick','t-more']){
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
      const t2=t;return {nan:/\bNaN\b|undefined|Infinity/.test(t2),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        wide:[...T.querySelectorAll('*')].filter(e=>!e.closest('.tw')&&!e.closest('.nav')&&!e.closest('.tabs')&&e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,4).map(e=>e.tagName+'#'+e.id+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)),
        words:t.split(/\s+/).filter(Boolean).length}},tab);
    out[tab]={controls:n,...r};
    if(r.nan||r.side||r.wide.length)bad++;
  }
  // screenshots of the animations at every step, and of the tabs
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-read"]').click());await wait(200);
  for(const [id,seg,modes,n] of [['ev-an1','ev-an1-set',['ddpm','vae','half'],6],['ev-an2','ev-an2-q',['75'],4]]){
    for(const m of modes){await p.evaluate((g,m)=>document.querySelector('#'+g+' button[data-m="'+m+'"]').click(),seg,m);await wait(80);
      for(let s=0;s<n;s++){await p.evaluate((c,s)=>{const e=document.getElementById(c);e.value=s;e.dispatchEvent(new Event('input'))},id+'-ctl-s',s);
        const el=await p.$('#'+id);await el.scrollIntoView();await wait(100);await el.screenshot({path:path.join(shots,id+'_'+m+'_'+s+'_'+w+'.png')})}}}
  for(const id of ['ev-sets','ev-bias','ev-pr','ev-sd','ev-sd-tab','ev-ranktab','ev-pit']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await wait(100);await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  for(const tab of ['t-evcmp','t-evpick']){await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);await wait(300);await p.evaluate(()=>scrollTo(0,0));
    const el=await p.$('#'+tab);await el.screenshot({path:path.join(shots,tab+'_'+w+'.png')})}
  const myErrs=errs;if(myErrs.length)bad++;
  console.log(w,scheme,JSON.stringify(out),'errors',JSON.stringify(myErrs.slice(0,5)));
  await p.close();
}
await b.close();
console.log(bad?'FAIL '+bad:'ALL OK');
