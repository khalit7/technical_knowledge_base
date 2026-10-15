// Every tab of the JAX core page: click every control at 390 px dark and 920 px light; fail on page errors,
// undefined / [object / Infinity anywhere, NaN in numeric cells (the prose says "NaN" on purpose), unfilled data spans,
// or sideways scroll. Usage (repo root): NPM_CONFIG_USERCONFIG=<empty file> node <this file> <index.html> [screenshot dir]
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]),shots=process.argv[3];
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const TABS=['t-read','t-jcx','t-jcad','t-jccf','t-jccv','t-more'];
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  const unfilled=await p.evaluate(()=>[...document.querySelectorAll('[data-k]')].filter(e=>e.textContent.trim()===''||e.textContent==='?').map(e=>e.dataset.k));
  ok(unfilled.length===0,`${w} ${scheme}: every data span filled (${unfilled.slice(0,5).join(', ')})`);
  for(const tab of TABS){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,250));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;const seen=new Set();
      // repeat: controls can create new controls (a case picker draws a new chart with its own inputs)
      for(let pass=0;pass<3;pass++){
        const els=[...root.querySelectorAll('button,select,input[type=range],input[type=checkbox],summary,.jc-lines div.click')].filter(e=>!seen.has(e));
        for(const e of els){seen.add(e);if(!e.isConnected)continue;
          if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
          else if(e.type==='range'){const mx=+e.max;for(let v=+e.min;v<=mx;v+=Math.max(1,Math.floor(mx/12))){if(!e.isConnected)break;e.value=v;e.dispatchEvent(new Event('input'));c++}}
          else{e.click();c++}
          await new Promise(r=>setTimeout(r,4));
        }
      }
      // deep passes for controls that redraw themselves: every equation of every jaxpr, every case of the custom-derivative lab
      const q=s=>root.querySelectorAll(s);const sleep=()=>new Promise(r=>setTimeout(r,3));
      if(t==='t-jcx'){for(const b of [...q('#jcx-seg button')]){b.click();await sleep();const n=q('#jcx-lines div.click').length;
        for(let i=0;i<n;i++){const d=root.querySelector('#jcx-lines div.click[data-i="'+i+'"]');if(d){d.click();c++;await sleep()}
          root.querySelectorAll('#jcx-detail summary').forEach(s=>s.click())}}}
      if(t==='t-jccv'){for(const b of [...q('#jccv-seg button')]){b.click();await sleep();
        for(const k of [...q('#jccv-vars input')]){const kk=root.querySelector('#jccv-vars input[data-v="'+k.dataset.v+'"]');if(kk){kk.click();c++;await sleep()}}
        for(const k of [...q('#jccv-vars input')]){const kk=root.querySelector('#jccv-vars input[data-v="'+k.dataset.v+'"]');if(kk&&!kk.checked){kk.click();await sleep()}}
        const r=root.querySelector('#jccv-x');if(r){const mx=+r.max;for(let v=0;v<=mx;v+=7){const rr=root.querySelector('#jccv-x');rr.value=v;rr.dispatchEvent(new Event('input'));c++;await sleep()}}}}
      if(t==='t-jcad'){for(const b of [...q('#jcad-mode button')]){b.click();await sleep();for(const w of [...q('#jcad-who button')]){w.click();
        const f=root.querySelector('#jcad-ctl-f');for(let i=0;i<14;i++){f.click();c++;await sleep()}}}}
      return c},tab);
    // back on this tab (a click may have switched tabs) and re-check
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,150));
    const bad=await p.evaluate(t=>{const r=document.getElementById(t);const s=r.innerText;
      const words=(s.match(/\bundefined\b|\[object|Infinity/g)||[]).length;
      const num=[...r.querySelectorAll('.stat .v,.bars .val,td.num,svg text')].filter(e=>/NaN/.test(e.textContent)).length;
      return words+num},tab);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad===0,`${w} ${scheme} ${tab}: ${n} control actions, no undefined/NaN in numbers (${bad})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
    if(shots){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`${shots}/ui_${tab}_${w}_${scheme}.png`,fullPage:true})}
  }
  const shown=await p.evaluate(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''});
  ok(errs.length===0&&!shown,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')} ${shown.slice(0,200)}`);
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
