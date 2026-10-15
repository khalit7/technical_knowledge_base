// Every tab of the JAX LLM codebases page: click every control at 390 px dark and 920 px light; fail on page errors,
// undefined / [object / NaN / Infinity in the text, unfilled value spans or source references, or sideways scroll.
// Optional third argument: a folder for element screenshots of every card (for looking at).
// Usage (repo root): NPM_CONFIG_USERCONFIG=<empty file> node <this file> <index.html> [shots dir]
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]),shots=process.argv[3];
const b=await puppeteer.launch({headless:'shell'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const TABS=['t-read','t-lcmap','t-lccfg','t-lcstep','t-more'];
const CARDS={'t-read':['#lc-one-stats','#lc-five','#lc-cfgdemo','#lc-port-card','#lc-port-table','#lc-rule-card','#lc-shtab-card','#lc-var-card','#lc-remat-card','#lc-mfu-card','#lc-lora-card','#lc-grpo-card','#lc-lev-tab'],
  't-lcmap':['#t-lcmap'],'t-lccfg':['#t-lccfg'],'t-lcstep':['#st-card']};
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  p.on('request',r=>{if(!r.url().startsWith('file:'))errs.push('network request '+r.url())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme},{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  const unfilled=await p.evaluate(()=>[...document.querySelectorAll('[id^="lc-v-"],#lc-err-mesh')].filter(e=>e.textContent.trim()==='').map(e=>e.id));
  ok(unfilled.length===0,`${w} ${scheme}: every value span filled (${unfilled.join(', ')})`);
  const refs=await p.evaluate(()=>document.querySelectorAll('code[data-src]').length+[...document.querySelectorAll('code')].filter(c=>c.textContent==='?').length);
  ok(refs===0,`${w} ${scheme}: every source reference resolved (${refs} left)`);
  const cov=await p.evaluate(()=>window.LC_STEP_CHECK);
  ok(cov&&cov.covered===cov.total,`${w} ${scheme}: every traced MaxText function belongs to a stage (${cov&&cov.covered}/${cov&&cov.total})`);
  for(const tab of TABS){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,250));
    if(shots&&CARDS[tab]){for(const sel of CARDS[tab]){const el=await p.$(sel);if(el){await el.evaluate(e=>e.scrollIntoView());await new Promise(r=>setTimeout(r,120));
      await el.screenshot({path:`${shots}/${tab}_${sel.replace(/[#.]/g,'')}_${w}_${scheme}.png`})}}}
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;const seen=new Set();
      for(let pass=0;pass<3;pass++){
        const els=[...root.querySelectorAll('button,select,input[type=range],input[type=search],summary,.mp-row,.cf-it[data-k]')].filter(e=>!seen.has(e));
        for(const e of els){seen.add(e);if(!e.isConnected)continue;
          if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
          else if(e.type==='range'){const mx=+e.max;for(let v=+e.min;v<=mx;v++){if(!e.isConnected)break;e.value=v;e.dispatchEvent(new Event('input'));c++}}
          else if(e.type==='search'){for(const q of ['remat','fsdp','zzzz','']){e.value=q;e.dispatchEvent(new Event('input'));c++}}
          else{e.click();c++}
          await new Promise(r=>setTimeout(r,3));
        }
      }
      // animations: every mode, every step
      const sleep=()=>new Promise(r=>setTimeout(r,3));
      const walk=async(segSel,fwdSel)=>{for(const bb of [...root.querySelectorAll(segSel+' button[data-m]')]){bb.click();await sleep();const f=root.querySelector(fwdSel);for(let i=0;i<20&&f;i++){f.click();c++;await sleep()}}};
      if(t==='t-read'){await walk('#lc-port-mode','#lc-port-ctl-f');
        for(const wb of [...root.querySelectorAll('#lc-rule-w button[data-m]')])for(const mb of [...root.querySelectorAll('#lc-rule-m button[data-m]')]){wb.click();mb.click();const f=root.querySelector('#lc-rule-ctl-f');for(let i=0;i<14;i++){f.click();c++;await sleep()}}
        await walk('#lc-grpo-mode','#lc-grpo-ctl-f')}
      if(t==='t-lcstep')await walk('#st-mode','#st-ctl-f');
      return c},tab);
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),tab);
    await new Promise(r=>setTimeout(r,150));
    const bad=await p.evaluate(t=>{const r=document.getElementById(t);const s=r.innerText+' '+[...r.querySelectorAll('svg text')].map(x=>x.textContent).join(' ');
      // the prose says "NaN" once on purpose (Tunix's loss normalisation): NaN is only an error in numbers
      const num=[...r.querySelectorAll('.stat .v,.stat .d,td.num,svg text,[id^="lc-v-"]')].filter(e=>/NaN/.test(e.textContent)).length;
      return (s.match(/\bundefined\b|\[object|Infinity/g)||[]).length+num},tab);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(bad===0,`${w} ${scheme} ${tab}: ${n} control actions, no undefined/NaN/Infinity (${bad})`);
    ok(sw<=0,`${w} ${scheme} ${tab}: no sideways scroll (${sw})`);
  }
  const shown=await p.evaluate(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''});
  ok(errs.length===0&&!shown,`${w} ${scheme}: no page errors or network requests ${errs.slice(0,3).join(' | ')} ${shown.slice(0,300)}`);
  await p.close();
}
await b.close();
console.log(fail?`FAILED ${fail}`:'ALL OK');process.exit(fail?1:0);
