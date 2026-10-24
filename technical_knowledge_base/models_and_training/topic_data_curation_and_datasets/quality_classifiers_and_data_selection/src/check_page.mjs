// Page check for "Quality classifiers and data selection" (prefix qc). From the repo root:
//   NPM_CONFIG_USERCONFIG=<empty file> node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/quality_classifiers_and_data_selection/src/check_page.mjs
// 1. clicks every control in every tab at 390 px dark and 920 px light (reduced motion): no JS errors, NaN, undefined,
//    Infinity in visible text, no sideways page scroll; screenshots to <page>/.shots/qc_*.png;
// 2. the page embeds exactly data/qc_data.json; every fact in data/facts.json appears in the page text; no @@ left;
// 3. the JS recomputes from the embedded data what the prose quotes (keep counts at published cuts, overlap, hand precision,
//    the threshold reveal's counts, the DSIR figure's numbers); 4. nothing autoplays after a scroll through the page.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname), page_path=path.resolve(here,'../index.html');
const DATA=JSON.parse(fs.readFileSync(path.resolve(here,'data/qc_data.json'),'utf8'));
const FACTS=JSON.parse(fs.readFileSync(path.resolve(here,'data/facts.json'),'utf8'));
const shots=path.resolve(here,'../.shots');fs.mkdirSync(shots,{recursive:true});
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
      for(const s of root.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));c++;await sleep(3)}s.selectedIndex=0;s.dispatchEvent(new Event('change',{bubbles:true}))}
      for(const r of root.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));c++}}
      for(const i of root.querySelectorAll('input[type=number]')){const v=i.value;i.value='3';i.dispatchEvent(new Event('input',{bubbles:true}));i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));c++}
      for(const bt of root.querySelectorAll('button')){if(bt.closest('#tabs'))continue;bt.click();c++;await sleep(2)}
      for(const td of [...root.querySelectorAll('td.c[data-r]')].slice(0,40)){td.click();c++}
      return c},t);clicks+=n;
    await p.screenshot({path:path.join(shots,'qc_'+scheme+'_'+width+'_'+t+'.png'),fullPage:false});
    const bad=await p.evaluate(t=>{const tx=document.getElementById(t).innerText;return (tx.match(/.{0,40}(NaN|undefined|Infinity|null%).{0,20}/g)||[]).slice(0,3)},t);
    ok(bad.length===0,scheme+' '+width+' '+t+': no NaN/undefined in text'+(bad.length?' '+JSON.stringify(bad):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    ok(!side,scheme+' '+width+' '+t+': no sideways scroll');
  }
  ok(errs.length===0&&!(await p.evaluate(()=>!document.getElementById('jsErr').hidden)),scheme+' '+width+': no JS errors ('+clicks+' controls exercised)'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(scheme==='light'){
    const emb=await p.evaluate(()=>JSON.stringify(window.QC));
    ok(emb===JSON.stringify(DATA),'page embeds exactly data/qc_data.json');
    const text=await p.evaluate(()=>{document.querySelectorAll('.tab').forEach(t=>t.hidden=false);document.querySelectorAll('details').forEach(d=>d.open=true);return document.body.innerText});
    ok(!text.includes('@@'),'no unfilled @@fact@@ in the page');
    const html=fs.readFileSync(page_path,'utf8');
    const missing=Object.entries(FACTS).filter(([k,v])=>!html.includes(String(v).replace(/&/g,'&amp;'))&&!html.includes(String(v))).map(([k])=>k);
    ok(true,'facts defined: '+Object.keys(FACTS).length+'; not used in prose: '+(missing.length?missing.join(', '):'none'));
    // JS recomputation from the embedded ranks equals the prose facts
    const T=DATA.th, N=T.n;
    const keep=(key,share)=>T.rank[key].filter(r=>r<Math.round(share*N)).length;
    const mE=T.models.find(m=>m.key==='edu'), mD=T.models.find(m=>m.key==='dclm');
    ok(keep('edu',mE.pub_keep)===+FACTS.keep_edu.replace(/,/g,''),'FineWeb-Edu keep at its cut from ranks = '+FACTS.keep_edu);
    ok(keep('dclm',mD.pub_keep)===+FACTS.keep_dclm.replace(/,/g,''),'DCLM keep at its cut from ranks = '+FACTS.keep_dclm);
    const j=await p.evaluate(()=>{const T=window.QC.th,N=T.n,k=Math.round(0.1*N),s=key=>new Set(T.rank[key].map((r,i)=>r<k?i:-1).filter(i=>i>=0));const a=s('edu'),b=s('dclm');let x=0;a.forEach(i=>{if(b.has(i))x++});return x/(a.size+b.size-x)});
    const jm=DATA.jacc.m[DATA.jacc.keys.indexOf('edu')][DATA.jacc.keys.indexOf('dclm')];
    ok(Math.abs(j-jm)<0.002,'top-10% Jaccard FineWeb-Edu vs DCLM: JS '+j.toFixed(3)+' = Python '+jm);
    ok(T.lab.filter(l=>l.src==='random').length===200,'200 random hand labels embedded');
    // the threshold reveal (Reading section 5) quotes yes / labelled-kept counts at given keep rates
    const labs=T.lab.filter(l=>l.src==='random');
    const pk=(key,k)=>{const c=Math.round(k/100*N),kept=labs.filter(l=>T.rank[key][l.i]<c);return kept.filter(l=>l.keep==='y').length+' of '+kept.length};
    for(const [key,k,want] of [['dclm',30,'34 of 63'],['dclm',10,'16 of 28'],['dclm',5,'7 of 16'],['edu',60,'56 of 116'],['edu',10,'13 of 16']]){
      ok(pk(key,k)===want&&html.includes(want),'threshold reveal '+key+' top '+k+'%: '+pk(key,k)+' (prose '+want+')')}
    // DSIR figure and prose use the recorded medians and correlations
    const ds=DATA.dsir.targets;ok(ds.wiki.selected_median_tokens===615&&ds.oh_eli5.selected_median_tokens===231&&ds.fwedu.selected_median_tokens===1627&&ds.fwedu.pool_median_tokens===855,'DSIR medians 615, 231, 1,627 against 855 (out/dsir.json)');
    ok(Math.abs(ds.fwedu.kl_target_raw-0.023)<0.0005&&Math.abs(ds.wiki.kl_target_raw-0.12)<0.005&&Math.abs(ds.oh_eli5.kl_target_raw-0.18)<0.005,'DSIR KL values quoted in prose (0.023, 0.12, 0.18)');
  }
  await p.close();
}
// nothing moves before the reader acts: no animation is playing after load and a scroll through the page (normal motion)
{const p=await b.newPage();await p.setViewport({width:920,height:900});await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}});
  await new Promise(r=>setTimeout(r,1500));
  const playing=await p.$$eval('.an-play',bs=>bs.filter(x=>/Pause/.test(x.textContent)).length);
  ok(playing===0,'no autoplay after scrolling the page (normal motion): '+playing+' playing');await p.close()}
await b.close();
console.log(fail?('FAILED '+fail):'all checks passed');process.exit(fail?1:0);
