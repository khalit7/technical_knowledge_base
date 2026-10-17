// Check the Diffusion lab tab: every control clicked at 390 px dark and 920 px light, no page errors, no NaN or
// undefined, no sideways scroll, no clipped canvases; reading time measured; screenshots to argv[2].
// Usage: node check_page.mjs <shots dir>
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
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('requestfailed',r=>errs.push('request failed: '+r.url().slice(-80)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}document.querySelector('#tabs button[data-t="t-diff"]').click()});
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,60))}
  const n=await p.evaluate(async()=>{let k=0;
    for(const el of document.querySelectorAll('#t-diff button,#t-diff summary,#t-diff figure')){el.click();k++;await new Promise(r=>setTimeout(r,8))}
    for(const s of document.querySelectorAll('#t-diff select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++}}
    for(const r of document.querySelectorAll('#t-diff input[type=range]')){for(const v of [r.min,r.max,Math.round((+r.min+ +r.max)/2)]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
    for(const c of document.querySelectorAll('#t-diff input[type=checkbox]')){c.click();c.click();k++}
    return k});
  await new Promise(r=>setTimeout(r,500));
  for(const id of ['df-fwd-card','df-snr-card','df-loss-card','df-traj-card','df-steps-card','df-ev-card','df-cfg-card','df-sdcfg-card','df-sdst-card','df-time-card']){
    const el=await p.$('#'+id);if(el){await el.scrollIntoView();await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  const r=await p.evaluate(()=>{const tab=document.getElementById('t-diff');const t=tab.innerText;
    const over=[...tab.querySelectorAll('svg,canvas,img,pre,table')].filter(e=>{const r=e.getBoundingClientRect();const pr=tab.getBoundingClientRect();return r.width>0&&r.right>pr.right+1&&!e.closest('.tw')&&e.tagName!=='PRE'}).length;
    return {nan:/\bNaN\b|undefined|Infinity|missing /.test(t),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,over,
      err:!document.getElementById('jsErr').hidden?document.getElementById('jsErr').textContent:'',unexp:/\{\{/.test(tab.innerHTML),
      inTab:!!tab.querySelector('#t-flow')}});
  console.log(w,scheme,'controls',n,JSON.stringify(r),'errors',errs.length?errs:'none');
  if(errs.length||r.nan||r.side||r.err||r.unexp||r.over||r.inTab)bad++;
  if(w===920){
    const wd=await p.evaluate(()=>{const t=document.getElementById('t-diff').cloneNode(true);
      t.querySelectorAll('svg,canvas,style,script,.df-cnt,.df-an,.out,.bars,.df-sd,.df-strip,.df-cls').forEach(e=>e.remove());
      const det=[...t.querySelectorAll('details,.df-q .ans,pre')].map(d=>d.textContent).join(' ');t.querySelectorAll('details,.df-q .ans,pre').forEach(e=>e.remove());
      const w=s=>s.split(/\s+/).filter(Boolean).length;return {main:w(t.textContent),folded:w(det)}});
    console.log('words',JSON.stringify(wd),'reading min',(wd.main/200).toFixed(1),'folded and code min',(wd.folded/200).toFixed(1));
  }
  await p.close();
}
}finally{await b.close()}
console.log(bad?'FAIL '+bad:'OK');
