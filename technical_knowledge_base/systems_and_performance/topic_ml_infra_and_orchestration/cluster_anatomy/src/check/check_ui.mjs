// Every tab: click every control (the message path and job stepper live in the Reading tab since 2026-10-24) at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// Infinity or sideways scroll; check the page's sizing model against src/out/expected.json.
// Usage (repo root): node <this file> <page folder> [screenshot dir]
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const dir=path.resolve(process.argv[2]),shots=process.argv[3];
const exp=JSON.parse(fs.readFileSync(dir+'/src/out/expected.json','utf8'));
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
try{
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+dir+'/index.html',{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  for(const tab of ['t-read','t-camap','t-casize','t-more']){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,250));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;
      const els=[...root.querySelectorAll('button,select,input,summary,th[data-k],[data-p],.cm-ch')];
      for(const e of els){if(!e.isConnected)continue;
        if(e.tagName==='SELECT'){for(const o of [...e.options]){e.value=o.value;e.dispatchEvent(new Event('change'));e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='range'){for(let v=+e.min;v<=+e.max;v++){e.value=v;e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='number'){for(const v of [e.min||'1','0','',e.max||'99']){e.value=v;e.dispatchEvent(new Event('input'));c++}}
        else if(e.type==='checkbox'){e.click();e.click();c+=2}
        else{e.dispatchEvent(new MouseEvent('click',{bubbles:true}));c++}
        await new Promise(r=>setTimeout(r,4));}
      // restore the sizing preset so screenshots show a preset
      const pre=document.getElementById('sz-pre');if(pre&&t==='t-casize'){pre.value='0';pre.dispatchEvent(new Event('change'))}
      return c},tab);
    if(tab==='t-camap'){const m=await p.evaluate(async()=>{let c=0;for(const d of [...document.querySelectorAll('#cm-design button')]){d.click();
        const n=document.querySelectorAll('#cm-lv button').length;for(let i=0;i<n;i++){document.querySelector('#cm-lv button[data-i="'+i+'"]').click();c++;
          const ch=document.querySelector('#cm-svg .cm-ch');if(ch){ch.dispatchEvent(new MouseEvent('click',{bubbles:true}));c++}
          const bad=(document.getElementById('t-camap').innerText.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g)||[]).length;if(bad)return -1}}
        document.querySelector('#cm-design [data-m="llama3"]').click();return c});ok(m>0,`${w} ${scheme} t-camap: every design and level (${m} actions)`)}
    if(tab==='t-read'){const m=await p.evaluate(async()=>{let c=0;const sl=document.getElementById('mp-ctl-s');
        for(const a of [...document.querySelectorAll('#mp-a button')])for(const b of [...document.querySelectorAll('#mp-b button')]){a.click();b.click();
          for(let v=0;v<=+sl.max;v++){sl.value=v;sl.dispatchEvent(new Event('input'));c++}
          if((document.getElementById('ca-mp-card').innerText.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b|\?\)/g)||[]).length)return -1}
        document.querySelector('#mp-a [data-m="node"]').click();document.querySelector('#mp-b [data-m="pod"]').click();
        const js=document.getElementById('ca-job-ctl-s');for(let v=0;v<=+js.max;v++){js.value=v;js.dispatchEvent(new Event('input'));c++;
          if(!document.getElementById('ca-job-cap').textContent.includes('Step '+(v+1)))return -2}
        return c});ok(m>0,`${w} ${scheme} t-read message path: 25 route pairs, every hop (${m} actions)`)}
    const bad=await p.evaluate(t=>{const s=document.getElementById(t).innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g)||[]).length},tab);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad===0,`${w} ${scheme} ${tab}: ${n} control actions, no NaN/undefined/null (${bad})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
    if(shots){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`${shots}/${tab}_${w}_${scheme}.png`,fullPage:true})}
  }
  if(w===920){
    const bad=await p.evaluate(cases=>{let bad=[];for(const c of cases){const r=window.CA_SIZE(c.in);for(const k of Object.keys(c.out)){const a=r[k],e=c.out[k];
      if(typeof e==='number'?Math.abs(a-e)>1e-9*Math.max(1,Math.abs(e)):a!==e)bad.push(k+' '+a+' '+e)}}return bad},exp.size_cases);
    ok(bad.length===0,`sizing model: JS equals Python on ${exp.size_cases.length} cases ${bad.slice(0,3).join(';')}`);
  }
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
}finally{await b.close()}
console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
