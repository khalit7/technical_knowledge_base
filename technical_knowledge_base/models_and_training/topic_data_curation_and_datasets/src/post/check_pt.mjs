// Post-training data lab check. Usage (from the repo root): node <this file> <path to index.html> [shots dir]
// 1) the page embeds exactly parts/35_js_pt_0data.js's data (window.PTD equals out/*.json where they overlap);
// 2) every data-pt number is filled and equals the value recomputed from the embedded data here;
// 3) every control in #t-post is exercised at 390 px dark and 920 px light: no errors, NaN, undefined or sideways scroll.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);const shots=process.argv[3]||null;
const here=path.dirname(new URL(import.meta.url).pathname);
const J=f=>JSON.parse(fs.readFileSync(path.join(here,'out',f),'utf8'));
const stats=J('stats.json'),filt=J('filter.json'),chk=J('checkers.json'),reph=J('rephrase.json');
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.removeItem('dc-tab')}catch(e){}document.querySelector('#tabs button[data-t="t-post"]').click()});
  await new Promise(r=>setTimeout(r,400));
  if(w===390){
    const E=await p.evaluate(()=>window.PTD);
    ok(E.stats.pref.ties===stats.pref.ties&&E.stats.sft.len.all.response_tok['0.5']===stats.sft.len.all.response_tok['0.5']&&JSON.stringify(E.stats.rlvr.dup_question)===JSON.stringify(stats.rlvr.dup_question),'embedded stats equal out/stats.json (pruned copy)');
    ok(JSON.stringify(E.checkers.ref.MATH.ok)===JSON.stringify(chk.ref.MATH.ok)&&JSON.stringify(E.checkers.ref.gsm8k.ok)===JSON.stringify(chk.ref.gsm8k.ok),'embedded checker counts equal out/checkers.json');
    ok(JSON.stringify(E.rephrase.agg)===JSON.stringify(reph.agg)&&JSON.stringify(E.rephrase.cosmo_agg)===JSON.stringify(reph.cosmo_agg),'embedded rephrase aggregates equal out/rephrase.json');
    for(const d of ['sft','pref','rlvr','cosmo']){const f=E.filter[d],o=filt[d];
      const codes=[...o.codes].map((c,i)=>[i,c]).filter(x=>x[1]!=='.');let i=0;const emb=[];String(f.removed_rows).replace(/([a-z])(\d+)/g,(m,l,d)=>{i+=+d;emb.push([i,l]);return m});
      ok(f.removed===o.removed&&JSON.stringify(f.by_rule)===JSON.stringify(o.by_rule)&&JSON.stringify(emb)===JSON.stringify(codes),d+': embedded filter result equals out/filter.json ('+o.removed+' removed)')}
    const N=await p.evaluate(()=>window.PT.nums);
    const fm=x=>x.toLocaleString('en-GB');
    ok(N.sft_removed.startsWith(fm(filt.sft.removed)+' of 5,000'),'prose sft_removed '+N.sft_removed);
    ok(N.pref_ties===fm(stats.pref.ties),'prose pref_ties '+N.pref_ties);
    ok(N.rlvr_comma===fm(filt.rlvr.unrewardable_detail.gsm8k),'prose rlvr_comma '+N.rlvr_comma);
    ok(N.ref_mv_math.startsWith(fm(chk.ref.MATH.ok.math_verify)),'prose ref_mv_math '+N.ref_mv_math);
    // contamination pairs: the page's live 8-gram coverage at Tulu 3's setting equals the child page's recorded value
    const cov=await p.evaluate(async()=>{const s=document.getElementById('pt-cpair'),n=document.getElementById('pt-cn'),t=document.getElementById('pt-ct');n.value=8;n.dispatchEvent(new Event('input'));t.value=50;t.dispatchEvent(new Event('input'));
      const out=[];for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change'));const p=window.PTD.contam.pairs[+o.value];
        const v=document.getElementById('pt-cverd').innerText;const m=v.match(/grams: ([0-9.]+)%/),m13=v.match(/13-grams \(GPT-3 rule, any match flags\): ([0-9,]+)/);
        out.push([+m[1],Math.round(p.cov8*1000)/10,+m13[1].replace(/,/g,''),p.m13])}return out});
    ok(cov.every(([a,b,c,d])=>Math.abs(a-b)<0.11&&c===d),'contamination checker reproduces the child page on '+cov.length+' pairs '+JSON.stringify(cov));
  }
  const bad=await p.evaluate(()=>[...document.querySelectorAll('#t-post [data-pt]')].filter(e=>/n\/a|NaN|undefined/.test(e.textContent)||!e.textContent.trim()).map(e=>e.dataset.pt));
  ok(bad.length===0,w+'px: all data-pt numbers filled'+(bad.length?' (bad: '+bad.join(',')+')':''));
  const n=await p.evaluate(async()=>{const T=document.getElementById('t-post');let c=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const segs=[...T.querySelectorAll('.pt-seg')];
    for(const sg of segs){for(const b of [...sg.querySelectorAll('button')]){b.click();c++;await wait(30);
      for(const s of T.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change'));c++;await wait(5)}}
      for(const x of T.querySelectorAll('#pt-fopt input[type=checkbox]:not([disabled])')){x.click();c++;await wait(10)}
      for(const sc of T.querySelectorAll('.an-ctl input[type=range]')){for(let i=0;i<=+sc.max;i++){sc.value=i;sc.dispatchEvent(new Event('input'));await wait(3)}}}}
    for(const b of T.querySelectorAll('.an-ctl button,.pt-pr button')){b.click();c++;await wait(15)}
    for(const r of T.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,Math.round((+r.min+ +r.max)/2)]){r.value=v;r.dispatchEvent(new Event('input'));c++;await wait(5)}}
    T.querySelectorAll('details').forEach(d=>d.open=true);await wait(600);return c});
  const txt=await p.evaluate(()=>document.getElementById('t-post').innerText);
  ok(!/NaN|undefined|\[object/.test(txt),w+'px: no NaN or undefined in the tab text');
  const side=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(side<=0,w+'px: no sideways scroll ('+side+')');
  const wide=await p.evaluate(()=>{const W=document.documentElement.clientWidth;return [...document.querySelectorAll('#t-post *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.pt-tw')&&!e.closest('[style*="overflow-x"]')}).slice(0,5).map(e=>e.tagName+'#'+e.id+'.'+e.className)});
  ok(wide.length===0,w+'px: nothing sticks out of the viewport'+(wide.length?' '+wide.join(' '):''));
  ok(errs.length===0,w+'px: '+n+' controls exercised, no errors'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(shots){fs.mkdirSync(shots,{recursive:true});
    await p.evaluate(()=>{document.querySelector('#pt-fds button[data-m="sft"]').click();const s=document.getElementById('pt-fctl-s');s.value=2;s.dispatchEvent(new Event('input'));
      document.querySelector('#pt-ds button[data-m="pref"]').click()});await new Promise(r=>setTimeout(r,500));
    await p.screenshot({path:path.join(shots,'pt_'+w+'_'+scheme+'.png'),fullPage:true})}
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
