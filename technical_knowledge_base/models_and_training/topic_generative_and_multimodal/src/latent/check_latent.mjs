// Check the Latent lab tab: every control clicked and every range moved at 390 px dark and 920 px light;
// no page errors, no NaN or undefined, no sideways scroll; reading time measured; screenshots to argv[2].
// Usage: node check_latent.mjs <shots dir>
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
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}document.querySelector('#tabs button[data-t="t-latent"]').click()});
  await new Promise(r=>setTimeout(r,300));
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,60))}
  for(const id of await p.evaluate(()=>[...document.querySelectorAll('#t-latent section')].map(s=>s.id))){await p.evaluate(id=>document.getElementById(id).scrollIntoView(),id);await new Promise(r=>setTimeout(r,400));
    await p.screenshot({path:path.join(shots,`init_${w}_${scheme}_${id}.png`)})}
  const n=await p.evaluate(async()=>{let k=0;const T=document.getElementById('t-latent');
    for(const el of T.querySelectorAll('button')){el.click();k++;await new Promise(r=>setTimeout(r,8))}
    for(const r of T.querySelectorAll('input[type=range]')){for(let v=+r.min;v<=+r.max;v++){r.value=v;r.dispatchEvent(new Event('input'));k++}}
    for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++}}
    for(const id of ['lt-ex-ae2','lt-ex-vae2']){const c=document.getElementById(id);const r=c.getBoundingClientRect();
      for(const [u,v] of [[.1,.1],[.5,.5],[.9,.8]]){const o={clientX:r.left+u*r.width,clientY:r.top+v*r.height,pointerId:1,bubbles:true};c.dispatchEvent(new PointerEvent('pointerdown',o));c.dispatchEvent(new PointerEvent('pointerup',o));k++}}
    for(const s of T.querySelectorAll('#lt-vq-tok span')){s.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));k++;break}
    return k});
  await new Promise(r=>setTimeout(r,500));
  const res=await p.evaluate(()=>{const T=document.getElementById('t-latent');const txt=T.innerText;
    return {nan:/\bNaN\b/.test(txt),undef:/\bundefined\b/.test(txt),q:[...T.querySelectorAll('[data-lt]')].filter(e=>e.textContent==='?').length,
      sw:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,words:txt.split(/\s+/).length,
      broken:[...T.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length}});
  console.log(w,scheme,'controls',n,JSON.stringify(res),'errors',errs.length);errs.slice(0,5).forEach(e=>console.log('  ',e));
  if(errs.length||res.nan||res.undef||res.q||res.sw||res.broken)bad++;
  if(w===920)console.log('reading time at 200 words/min: about',Math.round(res.words/200),'min for',res.words,'words');
  // screenshots per section
  const secs=await p.evaluate(()=>[...document.querySelectorAll('#t-latent section')].map(s=>s.id));
  for(const id of secs){await p.evaluate(id=>document.getElementById(id).scrollIntoView(),id);await new Promise(r=>setTimeout(r,250));
    await p.screenshot({path:path.join(shots,`${w}_${scheme}_${id}.png`)})}
  await p.close();
}
}finally{await b.close()}
console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
