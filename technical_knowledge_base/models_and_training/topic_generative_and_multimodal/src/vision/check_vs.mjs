// Check the Zero-shot lab tab (t-vision, the Vision lab until 2026-10-24): every control clicked at 390 px dark and 920 px light, no page errors,
// no NaN or undefined, no sideways scroll; reading time measured (220 words per minute); screenshots to argv[2].
// Usage: node check_vs.mjs <shots dir>
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_=process.argv[3]||path.resolve(here,'../../index.html');
const shots=process.argv[2]||path.resolve(here,'.shots');fs.mkdirSync(shots,{recursive:true});
// line ranges of this tab's scripts in index.html: errors elsewhere belong to other tabs (reported separately)
const html=fs.readFileSync(page_,'utf8').split('\n');const mine=[];let cur=null;
html.forEach((l,i)=>{const m=l.match(/<script>\/\* (\S+) \*\//);if(m){cur=m[1].startsWith('34_js_vs')?[i+1]:null}if(cur&&l.includes('</script>')){cur.push(i+1);mine.push(cur);cur=null}});
const isMine=e=>{const m=[...String(e).matchAll(/index\.html:(\d+)|\(line (\d+)\)/g)];return m.length===0?/VS|vs-/.test(String(e)):m.some(x=>{const n=+(x[1]||x[2]);return mine.some(([a,z])=>n>=a&&n<=z)})};
const b=await puppeteer.launch({headless:'shell'});
let bad=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_);
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}document.querySelector('#tabs button[data-t="t-vision"]').click()});
  await wait(300);
  const H=await p.evaluate(()=>document.body.scrollHeight);
  for(let y=0;y<H;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await wait(40)}
  // screenshots of the main cards in their default state
  for(const id of ['vs-pa','vs-sm','vs-lc','vs-sc','vs-zq','vs-ty','vs-pr']){const el=await p.$('#'+id);if(el){await el.scrollIntoView();await wait(150);await el.screenshot({path:path.join(shots,id+'_'+w+'.png')})}}
  const n=await p.evaluate(async()=>{let k=0;const T=document.getElementById('t-vision');
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(const el of T.querySelectorAll('button,summary')){el.click();k++;await sleep(3)}
    for(const s of T.querySelectorAll('select')){for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));k++;await sleep(3)}}
    for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2]){r.value=v;r.dispatchEvent(new Event('input'));k++}}
    // every step of both animations, for both models and all images
    if(document.getElementById('vs-pa'))for(const m of document.querySelectorAll('#vs-pa-m button')){m.click();for(const o of document.getElementById('vs-pa-img').options){const s=document.getElementById('vs-pa-img');s.value=o.value;s.dispatchEvent(new Event('change'));
      const sc=document.getElementById('vs-pa-ctl-s');for(let i=0;i<8;i++){sc.value=i;sc.dispatchEvent(new Event('input'));k++}}}
    const c=document.getElementById('vs-pa-c');if(c){const r=c.getBoundingClientRect();
    for(const [x,y] of [[10,10],[r.width*0.3,r.width*0.3],[20,r.height-10]]){c.dispatchEvent(new MouseEvent('click',{clientX:r.left+x,clientY:r.top+y,bubbles:true}));k++}}
    const ts=document.getElementById('vs-ty-ctl-s');if(ts)for(let i=0;i<7;i++){ts.value=i;ts.dispatchEvent(new Event('input'));k++}
    for(const q of document.querySelectorAll('#vs-zq-g button')){q.click();k++}
    for(const cell of [...document.querySelectorAll('#vs-sm-g button')].slice(0,40)){cell.click();k++}
    return k});
  await p.evaluate(()=>document.querySelectorAll('#t-vision details').forEach(d=>d.open=true));
  const el=await p.$('#vs-pa');if(el){  // the patch card moved to Vision encoders on 2026-10-24
  await p.evaluate(()=>{const s=document.getElementById('vs-pa-ctl-s');s.value=4;s.dispatchEvent(new Event('input'))});
  await el.scrollIntoView();await wait(100);await el.screenshot({path:path.join(shots,'vs-pa-step5_'+w+'.png')});
  await p.evaluate(()=>{const s=document.getElementById('vs-pa-ctl-s');s.value=7;s.dispatchEvent(new Event('input'))});
  await el.screenshot({path:path.join(shots,'vs-pa-step8_'+w+'.png')});}
  const r=await p.evaluate(()=>{const t=document.getElementById('t-vision').innerText;
    return {nan:/\bNaN\b|undefined|Infinity/.test(t),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
      wide:[...document.querySelectorAll('#t-vision *')].filter(e=>!e.closest('.tw')&&e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,5).map(e=>e.tagName+'#'+e.id+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)),
      words:t.split(/\s+/).filter(Boolean).length,unexp:/\{\{/.test(document.body.innerHTML)}});
  const myErrs=errs.filter(isMine),other=errs.length-myErrs.length;
  const ok=!r.nan&&!r.side&&!r.unexp&&myErrs.length===0;if(!ok)bad++;
  console.log(w,scheme,'controls',n,JSON.stringify(r),'my errors',JSON.stringify(myErrs.slice(0,5)),'other tabs errors',other,'reading min',(r.words/220).toFixed(1));
  await p.close();
}
await b.close();
console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
