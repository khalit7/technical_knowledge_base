// Training lab checks. Usage (repo root): node <root>/src/train/check_train.mjs [screenshot dir]
// 1. Every control of #t-train clicked at 390 px dark and 920 px light: no page errors, NaN, undefined, Infinity, sideways scroll,
//    and every SVG text inside its svg box (no clipping).
// 2. The page's embedded data (window.TRD) equals the measured outputs in out/*.json for the numbers the tab quotes.
// 3. Every number written into prose (.tr-v spans) is filled and equals the embedded data; static numbers in the HTML match.
import {createRequire} from 'module';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(HERE,'..','..','index.html'),shots=process.argv[2];
const J=n=>JSON.parse(fs.readFileSync(path.join(HERE,'out',n),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.setViewport({width:w,height:900});
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>document.querySelector('#tabs button[data-t="t-train"]').click());
  await new Promise(r=>setTimeout(r,300));
  const n=await p.evaluate(async()=>{const root=document.getElementById('t-train');let c=0;
    const els=[...root.querySelectorAll('button,select,input,summary')];
    for(const e of els){
      if(e.tagName==='SELECT'){for(const o of e.options){e.value=o.value;e.dispatchEvent(new Event('change'));c++}}
      else if(e.type==='range'){for(let v=+e.min;v<=+e.max;v++){e.value=v;e.dispatchEvent(new Event('input'));c++}}
      else if(e.type==='checkbox'){e.click();c++;await new Promise(r=>setTimeout(r,3));e.click();c++}
      else{e.click();c++}
      await new Promise(r=>setTimeout(r,3));
    }
    // the port panes were retired 2026-10-23 (now PyTorch to JAX, section 1)
    return c});
  const bad=await p.evaluate(()=>{const s=document.getElementById('t-train').innerText;return (s.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g)||[])});
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const clip=await p.evaluate(()=>{const out=[];document.querySelectorAll('#t-train svg').forEach(s=>{const r=s.getBoundingClientRect();if(!r.width)return;
    s.querySelectorAll('text').forEach(t=>{const q=t.getBoundingClientRect();if(q.width&&(q.left<r.left-1||q.right>r.right+1))out.push(t.textContent)})});return out});
  ok(bad.length===0,`${w} ${scheme}: ${n} control actions, no NaN/undefined/null (${bad.slice(0,5)})`);
  ok(sw<=0,`${w} ${scheme}: no sideways scroll (${sw})`);
  ok(clip.length===0,`${w} ${scheme}: no SVG text outside its svg (${clip.slice(0,4)})`);
  // prose numbers: filled, and equal to the data
  const spans=await p.evaluate(()=>[...document.querySelectorAll('#t-train .tr-v')].map(s=>[s.dataset.k,s.dataset.f,s.textContent,JSON.stringify(TR.get(s.dataset.k))]));
  const empty=spans.filter(s=>!s[2]||s[2]==='never'&&s[3]!=='null');
  ok(spans.length>0&&empty.length===0,`${w} ${scheme}: ${spans.length} prose numbers filled (${empty.map(s=>s[0])})`);
  if(w===920){
    const TRD=await p.evaluate(()=>window.TRD);
    const tw=J('twin_long.json'),ck=J('ckpt_resume.json'),pf=J('pitfalls.json'),ox=J('optax_check.json'),mx=J('mixed.json'),fw=J('frameworks.json'),cs=J('ckpt_sharded.json');
    const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),'data: '+m);
    eq(TRD.twin.val,tw.val,'twin validation losses');eq(TRD.twin.drift,tw.drift,'twin drift table');eq([TRD.twin.first_over.e5,TRD.twin.first_over.e4,TRD.twin.first_over.e3,TRD.twin.first_over.e2],['1e-05','0.0001','0.001','0.01'].map(k=>tw.first_step_loss_diff_over[k]),'twin first-over steps');
    eq(TRD.twin.max_abs_loss_diff,tw.max_abs_loss_diff,'twin max loss diffs');eq(TRD.twin.loss.torch,tw.loss.torch.filter((v,i)=>i%10===0),'twin torch curve (every 10th)');
    eq(TRD.ck.bit_identical_state,ck.bit_identical_state,'resume bit-identical');eq(TRD.ck.losses_full,ck.losses_full,'resume losses');
    eq(Object.keys(TRD.pit.v).map(k=>TRD.pit.v[k].loss),Object.keys(pf.variants).map(k=>pf.variants[k].loss),'pitfall curves');
    eq(TRD.pit.torch,pf.torch_loss,'pitfall reference curve');
    eq(TRD.mx.bf16_all.ln_scale_unmoved,mx.variants.bf16_all.ln_scale_unmoved,'bf16 frozen LayerNorm count');
    eq(TRD.mx.f32.loss,mx.variants.f32.loss,'mixed f32 curve');
    eq(TRD.fw.res.equinox,fw.results.equinox,'frameworks equinox diff');eq(TRD.cks.equal_after_8way_restore,cs.equal_after_8way_restore,'sharded restore equal');
    ok(Math.abs(TRD.ox.matched.diff[49]-ox.matched.max_abs_param_diff_per_step[49])/ox.matched.max_abs_param_diff_per_step[49]<1e-2,'data: adamw matched diff');
    // static numbers written into the HTML
    const html=fs.readFileSync(page_path,'utf8');
    const eqv=JSON.parse(fs.readFileSync(path.join(HERE,'..','data','equiv.json'),'utf8'));
    ok(html.includes('826,368')&&eqv.n_params===826368,'static: 826,368 parameters');
    ok(html.includes('198,272 parameters')&&fw.results.nnx_param_count===198272,'static: block 198,272 parameters');
    ok(Math.abs(fw.results.ref_max_abs-2.1)<0.05,'static: largest block output about 2.1 ('+fw.results.ref_max_abs+')');
    ok(Math.abs(eqv.logits.max_abs_logit-1.1)<0.05,'static: largest initial logit about 1.1');
    ok(ck.iterator_state.next_index===100&&html.includes('{"next_index": 100}'),'static: grain iterator state');
    ok(cs.saved_shard_shapes[0]==='(64, 128)'&&cs.restored_8way_shard_shapes[0]==='(128, 64)','static: shard shapes');
    const sqr=pf.variants.transpose.square_matrices_transposed;ok(sqr===16&&html.includes('16 of the running example'),'static: 16 square matrices ('+sqr+')');
  }
  if(shots){const secs=await p.evaluate(()=>[...document.querySelectorAll('#t-train section')].map(s=>s.id));
    for(const id of secs){const el=await p.$('#'+id);await el.screenshot({path:`${shots}/tr_${id}_${w}_${scheme}.png`})}}
  ok(errs.length===0,`${w} ${scheme}: no page errors ${errs.slice(0,3).join(' | ')}`);
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
