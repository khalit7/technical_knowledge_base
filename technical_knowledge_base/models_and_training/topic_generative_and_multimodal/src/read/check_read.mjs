// Check the Reading and Further reading tabs: every control clicked at 390 px dark and 920 px light,
// no page errors, no NaN or undefined, no sideways scroll; reading time measured; screenshots written to argv[2].
// Usage: node check_read.mjs <shots dir>
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=path.resolve(here,'../../index.html');
const shots=process.argv[2]||path.resolve(here,'.shots');fs.mkdirSync(shots,{recursive:true});
const b=await puppeteer.launch({headless:'shell'});
let bad=0;
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}document.querySelector('#tabs button[data-t="t-read"]').click()});
  // scroll through so observers fire
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=700){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,40))}
  const n=await p.evaluate(async()=>{let k=0;const sel='#t-read button,#t-read summary';
    for(const el of document.querySelectorAll(sel)){el.click();k++;await new Promise(r=>setTimeout(r,5))}
    const r=document.getElementById('rd-gen-ctl-s');if(r){for(const v of [0,10,25,49,50]){r.value=v;r.dispatchEvent(new Event('input'))}}
    for(const s of document.querySelectorAll('#t-read select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('input'));s.dispatchEvent(new Event('change'));k++}}
    const sec=document.getElementById('rd-c-sec');if(sec){sec.value='0.25';sec.dispatchEvent(new Event('input'))}
    return k});
  await p.evaluate(()=>document.querySelectorAll('#t-read details').forEach(d=>d.open=true));
  for(const id of ['rd-gen-card','rd-cost-card']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  await p.screenshot({path:path.join(shots,'read_top_'+w+'.png')});
  const r1=await p.evaluate(()=>{const t=document.getElementById('t-read').innerText;
    return {nan:/\bNaN\b|undefined|Infinity/.test(t),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
      err:!document.getElementById('jsErr').hidden?document.getElementById('jsErr').textContent:'',
      todo:document.querySelectorAll('#t-read .rd-todo').length,unexp:/\{\{/.test(document.body.innerHTML)}});
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-more"]').click());
  await p.screenshot({path:path.join(shots,'more_'+w+'.png'),fullPage:false});
  const r2=await p.evaluate(()=>{const t=document.getElementById('t-more').innerText;return {nan:/\bNaN\b|undefined/.test(t),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    links:[...document.querySelectorAll('#t-more a[href^="http"]')].filter(a=>a.target!=='_blank'||!/noopener/.test(a.rel)).length}});
  console.log(w,scheme,'controls',n,'read',JSON.stringify(r1),'more',JSON.stringify(r2),'errors',errs.length?errs:'none');
  if(errs.length||r1.nan||r1.side||r1.err||r1.unexp||r2.nan||r2.side||r2.links)bad++;
  if(w===920){
    const wd=await p.evaluate(()=>{const t=document.getElementById('t-read').cloneNode(true);
      t.querySelectorAll('svg,canvas,nav,.nav,.an-cnt,.an-ctl,.an-cap,.rd-todo,.rd-calc,style,script').forEach(e=>e.remove());
      const det=[...t.querySelectorAll('details')].map(d=>d.textContent).join(' ');t.querySelectorAll('details').forEach(e=>e.remove());
      const ans=[...t.querySelectorAll('.pr .ans')].map(d=>d.textContent).join(' ');
      const w=s=>s.split(/\s+/).filter(Boolean).length;return {main:w(t.textContent)-w(ans),folded:w(det)+w(ans)}});
    console.log('words',wd,'reading min',(wd.main/200).toFixed(1),'folded min',(wd.folded/200).toFixed(1));
  }
  await p.close();
}
await b.close();
console.log(bad?'FAIL '+bad:'OK');
