// Quality lab check. Usage (from the repo root): node <this file> <path to index.html> [shots dir]
// 1) the page embeds exactly src/qual/out/q_summary.json; 2) every data-q number is filled (no ?, n/a, NaN, undefined);
// 3) every control in #t-qual is exercised at 390 px dark and 920 px light with no errors and no sideways scroll; screenshots.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);const shots=process.argv[3]||null;
const here=path.dirname(new URL(import.meta.url).pathname);
const summary=JSON.parse(fs.readFileSync(path.join(here,'out','q_summary.json'),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.removeItem('dc-tab')}catch(e){}document.querySelector('#tabs button[data-t="t-qual"]').click()});
  await new Promise(r=>setTimeout(r,400));
  if(w===390){const S=await p.evaluate(()=>window.QD.S);ok(JSON.stringify(S)===JSON.stringify(summary),'embedded summary equals out/q_summary.json');
    const c=await p.evaluate(()=>{const d=window.QD.docs,C=window.QD.cut;return [d.edu.filter(x=>x>=2.5).length,d.dclm.filter(x=>x>=C).length,d.own.filter(x=>x>=window.QD.own_thr).length,d.edu.filter((x,i)=>x>=2.5&&d.dclm[i]>=C).length]});
    ok(c[0]===summary.keep_edu&&c[1]===summary.keep_dclm&&c[2]===summary.keep_own&&c[3]===summary.keep_both,'page recounts keeps from embedded scores: '+c.join(', '))}
  const bad=await p.evaluate(()=>[...document.querySelectorAll('#t-qual [data-q]')].filter(e=>/^\?$|n\/a|NaN|undefined/.test(e.textContent)||!e.textContent.trim()).map(e=>e.dataset.q));
  ok(bad.length===0,w+'px: all data-q numbers filled'+(bad.length?' (bad: '+bad.join(',')+')':''));
  // exercise controls
  const n=await p.evaluate(async()=>{const T=document.getElementById('t-qual');let c=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const b of T.querySelectorAll('button')){b.click();c++;await wait(20)}
    for(const s of T.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change'));c++;await wait(10)}}
    for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,Math.round((+r.min+ +r.max)/2)]){r.value=v;r.dispatchEvent(new Event('input'));c++;await wait(10)}}
    for(const x of T.querySelectorAll('input[type=checkbox]')){x.click();c++;await wait(20);x.click();await wait(20)}
    document.querySelectorAll('#t-qual details').forEach(d=>d.open=true);
    const cv=document.getElementById('q-shard');const r=cv.getBoundingClientRect();cv.dispatchEvent(new MouseEvent('click',{clientX:r.left+3,clientY:r.top+3,bubbles:true}));c++;
    // step the shard animation through every step with each filter
    const sel=document.getElementById('q-shard-f');for(const o of [...sel.options]){sel.value=o.value;sel.dispatchEvent(new Event('change'));
      const sc=document.getElementById('q-shard-ctl-s');for(let i=0;i<=+sc.max;i++){sc.value=i;sc.dispatchEvent(new Event('input'));await wait(5)}}
    await wait(800);return c});
  const txt=await p.evaluate(()=>document.getElementById('t-qual').innerText);
  ok(!/NaN|undefined|\[object/.test(txt.replace(/Encountered NaN/g,'')),w+'px: no NaN or undefined in the tab text');
  const side=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(side<=0,w+'px: no sideways scroll ('+side+')');
  const wide=await p.evaluate(()=>{const W=document.documentElement.clientWidth;return [...document.querySelectorAll('#t-qual *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.q-tw')}).slice(0,5).map(e=>e.tagName+'#'+e.id+'.'+e.className)});
  ok(wide.length===0,w+'px: nothing sticks out of the viewport'+(wide.length?' '+wide.join(' '):''));
  ok(errs.length===0,w+'px: '+n+' controls exercised, no errors'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(shots){fs.mkdirSync(shots,{recursive:true});
    await p.evaluate(()=>{const sc=document.getElementById('q-shard-ctl-s');sc.value=4;sc.dispatchEvent(new Event('input'))});await new Promise(r=>setTimeout(r,900));
    await p.screenshot({path:path.join(shots,'q_'+w+'_'+scheme+'.png'),fullPage:true})}
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
