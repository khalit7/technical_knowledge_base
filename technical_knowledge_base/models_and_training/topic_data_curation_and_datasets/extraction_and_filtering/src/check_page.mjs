// Page check for the Extraction and filtering child page (prefix ef). From the repo root:
//   node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/extraction_and_filtering/src/check_page.mjs
// 1. clicks every control in every tab at 390 px dark and 920 px light (reduced motion), failing on JS errors, NaN,
//    undefined or Infinity in visible text, or sideways page scroll; steps both animations to their ends;
//    saves element screenshots to ../.shots/el-*.png;
// 2. checks the page embeds exactly the data make_data.py wrote, that every prose fact was filled, that the rule
//    workbench at its defaults reproduces run0 (2,692 kept), and that numbers quoted in the prose match the data.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname), page_path=path.resolve(here,'../index.html'), shots=path.resolve(here,'../.shots');
fs.mkdirSync(shots,{recursive:true});
const js=fs.readFileSync(path.resolve(here,'parts/22_js_data.js'),'utf8');
const D=JSON.parse(js.slice('window.EF='.length,js.lastIndexOf(';')));
const F=JSON.parse(fs.readFileSync(path.resolve(here,'data/ef_facts.json'),'utf8'));
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const b=await puppeteer.launch({headless:'shell'});
for(const [scheme,width] of [['dark',390],['light',920]]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme},{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.setViewport({width,height:900});await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
  const tabs=await p.$$eval('#tabs button',bs=>bs.map(x=>x.dataset.t));let clicks=0;
  for(const t of tabs){
    await p.click('#tabs button[data-t="'+t+'"]');
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      for(const s of root.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));c++;await sleep(3)}}
      for(const r of root.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,Math.round((+r.min+ +r.max)/2)]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));c++}}
      for(const i of root.querySelectorAll('input[type=checkbox]')){i.click();c++;i.click()}
      for(const bt of root.querySelectorAll('button')){if(bt.closest('#tabs'))continue;bt.click();c++;await sleep(2)}
      for(const d of root.querySelectorAll('details')){d.open=true;c++}
      for(const r of root.querySelectorAll('.ef-bar[data-g]')){r.click();c++;break}
      return c},t);clicks+=n;
    const bad=await p.evaluate(t=>{const tx=document.getElementById(t).innerText;return (tx.match(/.{0,40}(NaN|undefined|Infinity|\[pending\]|\[\[).{0,20}/g)||[]).slice(0,3)},t);
    ok(bad.length===0,scheme+' '+width+' '+t+': no NaN/undefined/pending in text'+(bad.length?' '+JSON.stringify(bad):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    ok(!side,scheme+' '+width+' '+t+': no sideways scroll');
  }
  ok(errs.length===0&&!(await p.evaluate(()=>!document.getElementById('jsErr').hidden)),scheme+' '+width+': no JS errors ('+clicks+' controls exercised)'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  await p.reload({waitUntil:'load'});
  const last=async(ctl)=>{await p.evaluate(c=>{const s=document.getElementById(c+'-s');s.value=s.max;s.dispatchEvent(new Event('input'))},ctl)};
  for(const [t,sel,prep,tag] of [
      ['t-read','#ef-jt-card',async()=>{await last('ef-jt-ctl')},'final'],
      ['t-read','#ef-jt-card',async()=>{await p.evaluate(()=>{const s=document.getElementById('ef-jt-ctl-s');s.value=2;s.dispatchEvent(new Event('input'))})},'pass1'],
      ['t-read','#ef-jt-card',async()=>{await p.click('#ef-jt-mode button[data-m=cmp]');await last('ef-jt-ctl')},'cmp'],
      ['t-read','#ef-ln-card',async()=>{await last('ef-ln-ctl')},'fw'],
      ['t-read','#ef-ln-card',async()=>{await p.click('#ef-ln-mode button[data-m=c4]');await last('ef-ln-ctl')},'c4'],
      ['t-read','#ef-path-card',null,''],['t-read','#ef-x-bars',null,''],['t-read','#ef-wceb',null,''],['t-read','#ef-st-bars',null,''],
      ['t-read','#ef-rt',null,''],['t-read','#ef-traps',null,''],['t-read','#ef-lid-mini',null,''],['t-read','#ef-tox',null,''],['t-read','#ef-cost',null,''],['t-read','#ef-cache',null,''],['t-read','#ef-url',null,''],
      ['t-ext','#t-ext',null,''],['t-lid','#t-lid',null,''],['t-rules','#t-rules',null,''],['t-labels','#ef-b-sum',null,'']]){
    await p.click('#tabs button[data-t="'+t+'"]');if(prep)await prep();const el=await p.$(sel);
    if(el)await el.screenshot({path:path.join(shots,'el-'+scheme+'-'+sel.slice(1)+(tag?'-'+tag:'')+'.png')})}
  if(scheme==='light'){
    const emb=await p.evaluate(()=>JSON.stringify(window.EF));ok(emb===JSON.stringify(D),'page embeds exactly parts/22_js_data.js (made from data/*.json by make_data.py)');
    await p.click('#tabs button[data-t="t-rules"]');
    const kept=await p.$eval('#ef-w-cnt',e=>e.textContent);ok(kept.includes('Kept'+D.wb.run0_kept.toLocaleString('en-US')),'workbench defaults keep '+D.wb.run0_kept+' (run0)');
    ok(D.wb.check_reproduces_run0===D.wb.n,'workbench encoding reproduces run0 for '+D.wb.check_reproduces_run0+' of '+D.wb.n);
    await p.click('#tabs button[data-t="t-read"]');const txt=await p.$eval('#t-read',e=>e.textContent.replace(/\s+/g,' '));
    const html=fs.readFileSync(page_path,'utf8');
    ok(!/\[\[[A-Z0-9_]+\]\]/.test(html)&&!html.includes('[pending]'),'every [[fact]] filled');
    for(const v of Object.values(F))ok(txt.includes(String(v)),'prose carries fact '+v);
    const C=D.chain,n=x=>x.toLocaleString('en-US');
    const must=[n(C.traf111.kept),n(C.wet.kept),n(C.justext.kept),n(C.res.kept),n(C.justext.kept_in_fineweb),
      (100*D.traf.paths.own/20280).toFixed(1)+'%',(100*D.traf.paths.baseline/20280).toFixed(1)+'%',(100*(D.traf.paths.readability+D.traf.paths.justext)/20280).toFixed(1)+'%',
      n(D.traf.nodedup_vs_dedup.emptied),n(D.traf.nodedup_vs_dedup.shorter),n(D.traf.dedup_vs_shuffled.differ),
      n(D.struct.alltext.code.code_indented),n(D.struct.resiliparse.code.code_indent_kept),n(D.struct.alltext.wiki_math.tex),
      n(D.lines.fw_line_reasons.too_few_words),n(D.lines.lines_total),n(D.lines.docs_edited_by_fw_c4_among_kept),n(D.lines.rw_drop_docs),n(D.lines.rw_drop_docs_among_run0_kept),
      (100*D.lines.chars.fw_removed_lines/D.lines.chars.total).toFixed(1)+'%',(100*D.lines.chars.c4punct_removed_lines/D.lines.chars.total).toFixed(1)+'%',
      n(D.url.datatrove_domains),n(D.url.dt_in_ut1_cat.adult),n(D.url.dt_in_ut1_cat.phishing),n(D.url.dt_not_in_any_ut1),n(D.url.ut1_adult_not_in_dt),
      (100*D.url.dt_in_ut1_cat.adult/D.url.datatrove_domains).toFixed(1)+'%',
      n(Object.values(D.url.fresh_rw_extra_pages).reduce((a,b)=>a+b,0)),
      n(D.labels.summary.kept.J)+' are junk',n(D.labels.summary['drop:char_dup_ratio'].W)+' of '+D.labels.summary['drop:char_dup_ratio'].n,
      D.labels.summary['drop:gopher_too_many_bullets'].W+' of '+D.labels.summary['drop:gopher_too_many_bullets'].n,
      D.labels.summary['drop:curly_bracket'].W+' of '+D.labels.summary['drop:curly_bracket'].n];
    for(const m of must)ok(txt.includes(m),'prose number matches data: '+m);
  }
}
await b.close();console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
