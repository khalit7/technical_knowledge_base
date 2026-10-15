// Transforms lab (t-xf): click every control at 390 px dark and 920 px light; fail on page errors,
// NaN, undefined or sideways scroll; screenshots of the tab. Usage (repo root):
// NPM_CONFIG_USERCONFIG=<empty file> node <this file> <index.html> [screenshot dir]
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]),shots=process.argv[3];
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-xf"]').click());
  await new Promise(r=>setTimeout(r,300));
  if(shots)await p.screenshot({path:`${shots}/xf_${w}_${scheme}_top.png`,fullPage:false});
  const n=await p.evaluate(async()=>{const root=document.getElementById('t-xf');let c=0;
    // pytree: open every container by clicking until no closed toggles remain
    for(let k=0;k<40;k++){const t=[...root.querySelectorAll('#xf-pt-tree button[aria-expanded="false"]')];if(!t.length)break;t[0].click();c++}
    const els=[...root.querySelectorAll('button,select,input[type=range],summary')].filter(e=>!e.closest('#xf-nav'));
    for(const e of els){
      if(!e.isConnected)continue;
      if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
      else if(e.type==='range'){for(let v=+e.min;v<=+e.max;v++){e.value=v;e.dispatchEvent(new Event('input'));c++}}
      else{e.click();c++}
      await new Promise(r=>setTimeout(r,3));
    }
    // pause any playing animation
    root.querySelectorAll('button[aria-label="Pause"]').forEach(b=>b.click());
    return c});
  const bad=await p.evaluate(()=>{const s=document.getElementById('t-xf').innerText;const out=[];const re=/.{0,50}(\bNaN\b|\bundefined\b|Infinity|n\/a).{0,30}/g;let m;while((m=re.exec(s)))out.push(m[0].replace(/\s+/g,' '));return out});
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const wide=await p.evaluate(()=>{const r=document.getElementById('t-xf').getBoundingClientRect();return [...document.querySelectorAll('#t-xf *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>r.right+2&&!e.closest('.xf-code,.xf-lines,.tw,.xf-tree')}).slice(0,5).map(e=>e.tagName+'.'+e.className+'#'+e.id)});
  ok(bad.length===0,`${w} ${scheme}: ${n} control actions, no NaN/undefined/n/a (${bad.slice(0,5).join(',')})`);
  ok(sw<=0,`${w} ${scheme}: no sideways scroll (${sw})`);
  ok(wide.length===0,`${w} ${scheme}: nothing wider than the tab outside scroll boxes (${wide.join(' ')})`);
  const drills=await p.evaluate(()=>document.querySelectorAll('#xf-drills .xf-ans:not([hidden])').length);
  ok(drills>0,`${w} ${scheme}: drills revealed ${drills}`);
  if(shots){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`${shots}/xf_${w}_${scheme}_full.png`,fullPage:true})}
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
