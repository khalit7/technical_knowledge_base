// UI and data checks for the training_stack page. Usage (repo root): node <page>/src/runs/check_ui.mjs [screenshot dir]
// 1. Every tab: every control clicked at 390 px dark and 920 px light: no page errors, no NaN / undefined / Infinity / '?'
//    placeholders in the text, no sideways scroll, every SVG text inside its svg box.
// 2. window.TS equals what make_data.py derives from out/*.json (spot values re-read from the JSON here).
// 3. Every data-ts span is filled (no '?'); every data-ts-src link resolves.
import {createRequire} from 'module';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(HERE,'..','..','index.html'),shots=process.argv[2];
const J=n=>JSON.parse(fs.readFileSync(path.join(HERE,'out',n+'.json'),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const TABS=['t-read','t-state','t-opt','t-resume','t-data','t-more'];
const b=await puppeteer.launch({headless:'shell'});
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  for(const t of TABS){
    await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),t);
    await new Promise(r=>setTimeout(r,250));
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;
      const els=[...root.querySelectorAll('button,select,input,summary')].filter(e=>!e.closest('a'));
      for(const e of els){
        if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++;await new Promise(r=>setTimeout(r,2))}}
        else if(e.type==='range'){for(let v=+e.min;v<=+e.max;v++){e.value=v;e.dispatchEvent(new Event('input'));c++}}
        else{e.click();c++}
        await new Promise(r=>setTimeout(r,3));
      }
      // step every animation to its end so final captions render
      root.querySelectorAll('input[type=range]').forEach(r=>{r.value=r.max;r.dispatchEvent(new Event('input'))});
      return c},t);
    const bad=await p.evaluate(t=>{const s=document.getElementById(t).innerText.replace(/NaN injected|is NaN|a NaN|NaNs|NaN\?/g,'');return (s.match(/\bNaN\b|\bundefined\b|Infinity|\[object|(^|\s)\?(\s|$)/g)||[])},t);
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    const clip=await p.evaluate(t=>{const out=[];document.querySelectorAll('#'+t+' svg').forEach(s=>{const r=s.getBoundingClientRect();if(!r.width)return;
      s.querySelectorAll('text').forEach(x=>{const q=x.getBoundingClientRect();if(q.width&&(q.left<r.left-1||q.right>r.right+1))out.push(x.textContent)})});return out},t);
    ok(bad.length===0,`${w} ${scheme} ${t}: ${n} control actions, no NaN/undefined/placeholder (${bad.slice(0,5)})`);
    ok(sw<=0,`${w} ${scheme} ${t}: no sideways scroll (${sw})`);
    ok(clip.length===0,`${w} ${scheme} ${t}: svg text inside its box (${clip.slice(0,3)})`);
    if(shots){fs.mkdirSync(shots,{recursive:true});await p.screenshot({path:path.join(shots,`${t}-${scheme}-${w}.png`),fullPage:true})}
  }
  ok(errs.length===0,`${w} ${scheme}: no page errors (${errs.slice(0,3)})`);
  if(w===920){
    const r=await p.evaluate(()=>({unfilled:[...document.querySelectorAll('[data-ts]')].filter(e=>e.innerHTML.trim()===''||e.innerHTML==='?').map(e=>e.dataset.ts),
      badsrc:[...document.querySelectorAll('[data-ts-src]')].filter(a=>!a.href||a.textContent==='?').map(a=>a.dataset.tsSrc),
      nspans:document.querySelectorAll('[data-ts]').length,nsrc:document.querySelectorAll('[data-ts-src]').length,TS:window.TS}));
    ok(r.unfilled.length===0,`${r.nspans} data-ts spans filled (${r.unfilled.slice(0,5)})`);
    ok(r.badsrc.length===0,`${r.nsrc} source links resolve (${r.badsrc})`);
    // the embedded data equals the recorded outputs (spot checks over every file)
    const T=r.TS,nnx=J('nnx'),opt=J('optax'),ck=J('ckpt'),gr=J('grain'),mx=J('mixed'),fu=J('full'),cm=J('ckpt_mesh'),src=J('source');
    ok(T.nnx.E1.n_nodes===nnx.E1.n_nodes&&T.nnx.E1.n_params===nnx.E1.n_params&&T.nnx.leaves.length===nnx.E1.leaves.length,'nnx inventory equals out/nnx.json');
    ok(JSON.stringify(T.nnx.E5)===JSON.stringify(nnx.E5),'jit trace log equals out/nnx.json');
    ok(T.opt.S1.steps.length===opt.S1.steps.length&&Math.abs(T.opt.S1.steps[3].stages.update[0]-opt.S1.steps[3].stages.update[0])<=1e-6*Math.abs(opt.S1.steps[3].stages.update[0]),'optax stages equal out/optax.json (6 significant digits)');
    ok(Object.keys(T.opt.S9.runs).every(k=>Math.abs(T.opt.S9.runs[k].val_end-opt.S9.runs[k].val_end)<1e-5),'optimiser runs equal out/optax.json');
    ok(Object.keys(T.ckpt.variants).every(k=>T.ckpt.variants[k].bitwise_equal===ck.variants[k].bitwise_equal),'resume variants equal out/ckpt.json');
    ok(JSON.stringify(T.grain.G1_equal)===JSON.stringify(gr.G1_equal),'grain equalities equal out/grain.json');
    ok(Math.abs(T.mixed.M2.runs.static.val_end-mx.M2.runs.static.val_end)<1e-6,'mixed precision equals out/mixed.json');
    ok(T.full.final_bitwise_equal_A_vs_BC===fu.final_bitwise_equal_A_vs_BC,'complete script result equals out/full.json');
    ok(Object.keys(T.ckpt_mesh.targets).every(k=>T.ckpt_mesh.targets[k].continued_bitwise_equal_ref===cm.targets[k].continued_bitwise_equal_ref),'mesh restore equals out/ckpt_mesh.json');
    ok(Object.keys(src).every(k=>T.src[k]&&T.src[k].l===src[k].line),'source line numbers equal out/source.json');
    // the root's Training lab number this page quotes
    const rootMixed=JSON.parse(fs.readFileSync(path.resolve(HERE,'../../../src/train/out/mixed.json'),'utf8'));
    ok(Math.abs(rootMixed.variants.f32.val_300-opt.S9.runs['adamw (running example)'].val_end)<1e-6,'AdamW 300-step validation loss agrees with the root Training lab (mixed.json f32) within 1e-6');
  }
  await p.close();
}
await b.close();
console.log(fail?`FAILED ${fail}`:'all checks passed');process.exit(fail?1:0);
