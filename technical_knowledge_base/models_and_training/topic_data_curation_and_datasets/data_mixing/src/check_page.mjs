// Page check for the data mixing child page (prefix mx2). From the repo root:
//   node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/data_mixing/src/check_page.mjs
// 1. clicks every control in every tab at 390 px dark and 920 px light (reduced motion), failing on JS errors, NaN,
//    undefined, Infinity in visible text, or sideways page scroll;
// 2. checks the page embeds exactly data/mx2_data.json and parts/26_js_cpt_data.js, that the page's JS reproduces recompute.py
//    (DoReMi toy, mixing-law refit, blend rule) and cpt/recompute_cpt.py (CMR, D-CPT), and that numbers quoted in the prose match;
// 3. with normal motion, scrolls the whole Reading tab and confirms no animation has started by itself (2026-10-23 rule).
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname), page_path=path.resolve(here,'../index.html');
const DATA=JSON.parse(fs.readFileSync(path.resolve(here,'data/mx2_data.json'),'utf8'));
const CPTD=JSON.parse(fs.readFileSync(path.resolve(here,'parts/26_js_cpt_data.js'),'utf8').replace(/^\/\/.*\n/,'').replace(/^window\.CPT=/,'').replace(/;\s*$/,''));
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
    // every button, select and range inside the tab
    const n=await p.evaluate(async t=>{const root=document.getElementById(t);let c=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      for(const s of root.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));c++;await sleep(5)}s.selectedIndex=s.id==='mx2-fit-model'?1:0;s.dispatchEvent(new Event('change',{bubbles:true}))}
      for(const r of root.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,(+r.min+ +r.max)/2]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));c++}}
      for(const i of [...root.querySelectorAll('input[type=number]')].slice(0,6)){const v=i.value;i.value='7';i.dispatchEvent(new Event('input',{bubbles:true}));i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));c++}
      for(const bt of root.querySelectorAll('button')){if(bt.closest('#tabs'))continue;bt.click();c++;await sleep(2)}
      for(const bt of root.querySelectorAll('.seg button,.chips button[data-k]')){bt.click();c++;await sleep(2)}
      return c},t);clicks+=n;
    const bad=await p.evaluate(t=>{const tx=document.getElementById(t).innerText;return (tx.match(/.{0,40}(NaN|undefined|Infinity).{0,20}/g)||[]).slice(0,3)},t);
    ok(bad.length===0,scheme+' '+width+' '+t+': no NaN/undefined in text'+(bad.length?' '+JSON.stringify(bad):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    ok(!side,scheme+' '+width+' '+t+': no sideways scroll');
  }
  ok(errs.length===0&&!(await p.evaluate(()=>!document.getElementById('jsErr').hidden)),scheme+' '+width+': no JS errors ('+clicks+' controls exercised)'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(scheme==='light'){
    // 2a. embedded data equals the recorded file
    const emb=await p.evaluate(()=>JSON.stringify(window.MX2));
    ok(emb===JSON.stringify(DATA),'page embeds exactly data/mx2_data.json');
    // 2b. JS reproduces recompute.py
    const toy=await p.evaluate(()=>{const r=RD.mx2toy(window.MX2.toy.params);return {avg:r.avg,t50:r.steps[49].al,mr:r.main_ref,md:r.main_dr}});
    ok(toy.avg.every((v,i)=>Math.abs(v-DATA.toy.check_avg[i])<1e-5),'DoReMi toy: JS averages = Python '+toy.avg.map(v=>v.toFixed(4)).join(' '));
    ok(toy.t50.every((v,i)=>Math.abs(v-DATA.toy.check_t50.al[i])<1e-5),'DoReMi toy: JS step-50 weights = Python');
    ok(toy.md.every((v,i)=>Math.abs(v-DATA.toy.main_doremi[i])<1e-3),'DoReMi toy: before/after main losses = Python');
    const fit=await p.evaluate(()=>{const R=window.MX2.regmix,F=RD.mx2fit,y=R.train.Y.pile_cc,o={};
      for(const [k,f] of [['linear',F.fitLin],['dml',F.fitExp]]){const m=f(R.train.X,y);o[k]={};for(const t of ['1M','60M','1B'])o[k][t]=100*F.spearman(R.test[t].X.map(x=>m.pred(x)),R.test[t].Y.pile_cc)}
      o.lgb1B=100*F.spearman(R.lgb_pred['1B'],R.test['1B'].Y.pile_cc);return o});
    for(const k of ['linear','dml'])for(const t of ['1M','60M','1B'])ok(Math.abs(fit[k][t]-DATA.regmix.fit[k][t].rho)<0.3,'refit '+k+' '+t+': JS '+fit[k][t].toFixed(2)+' vs Python '+DATA.regmix.fit[k][t].rho);
    ok(Math.abs(fit.lgb1B-DATA.regmix.fit.lightgbm['1B'].rho)<0.3,'LightGBM 1B rho from embedded (4-decimal) predictions: '+fit.lgb1B.toFixed(2));
    const bl=await p.evaluate(()=>{const s=RD.mx2blend.seqMeg(),c=[0,0,0];let mx=0;s.forEach((d,k)=>{c[d]++;mx=Math.max(mx,...c.map((v,j)=>Math.abs(v-RD.mx2blend.BW[j]*(k+1))))});return mx});
    ok(bl<1.0001,'Megatron blend: no domain more than one sample from target (max gap '+bl.toFixed(2)+')');
    const tm=await p.evaluate(()=>{const S=RD.mx2samp,q=S.temperature(3.33),i=window.MX2.pile.findIndex(x=>x.name==='Wikipedia (en)');return [q[i],S.unimax(1254.2,3)[i]]});
    ok(Math.abs(tm[0]-DATA.pile_examples.tau333)<1e-4&&Math.abs(tm[1]-DATA.pile_examples.unimax3)<1e-4,'temperature and UniMax JS = Python (Wikipedia)');
    // 2c. prose numbers match data
    const text=await p.evaluate(()=>{document.querySelectorAll('.tab').forEach(t=>t.hidden=false);document.querySelectorAll('details').forEach(d=>d.open=true);document.querySelectorAll('.mx2-pred .ans').forEach(a=>a.hidden=false);return document.body.innerText});
    const has=s=>text.includes(s);const D=DATA,mu=D.muennighoff.table;
    ok(has('6.35 times')&&D.pile_examples.tau333_epochs===6.35,'prose: Wikipedia 6.35 epochs at tau 3.33');
    ok(has('from 0.77% (natural) to 3.23%')&&D.pile_examples.natural===0.0077&&D.pile_examples.tau333===0.0323,'prose: Wikipedia shares');
    ok(has('0.52 of its 227 GiB')&&Math.abs(D.pile_examples.pcc_tau333_epochs-0.521)<1e-9,'prose: Pile-CC 0.52 epochs');
    ok(has('worth 3.73 fresh epochs')&&mu['4']===3.726&&has('sixteen are worth 10.6')&&mu['16']===10.582,'prose: Muennighoff 4 and 16 epochs');
    ok(has('1.97 × 50B')&&mu['2']===1.968&&has('3.73 × 50B'),'prose: 2 to 4 epoch drill');
    ok(has('(10.58 to 14.34)')&&mu['32']===14.335,'prose: 16 to 32 epochs');
    ok(has('rank correlation between the two weightings over 22 domains is 0.90')&&D.pile_cmp_rho.bytes_vs_doremi_baseline===0.901,'prose: rho 0.90 bytes vs DoReMi baseline');
    const F=D.regmix.fit;ok(has('(ρ 98.76)')&&F.dml['1B'].rho===98.76,'prose: DML 1B rho');
    ok(has('the refit gives 0.024 and 0.003')&&Math.abs(F.linear['1M'].mse-0.0235)<1e-4&&Math.abs(F.lightgbm['1M'].mse-0.003)<1e-4,'prose: refit MSEs');
    const sm=D.recipes.smollm3;ok(has('English web falls from 70% to 50%')&&Math.round(100*sm[0].groups.web_en)===70&&Math.round(100*sm[2].groups.web_en)===50,'prose: SmolLM3 web share');
    ok(has('code goes from 12.5% to 23%')&&Math.abs(sm[0].groups.code-0.125)<1e-9&&Math.round(100*sm[2].groups.code)===23,'prose: SmolLM3 code share');
    ok(has('maths from 2.7% to 12.5%')&&Math.abs(sm[0].groups.math-0.027)<1e-9&&Math.abs(sm[2].groups.math-0.1249)<1e-9,'prose: SmolLM3 maths share');
    ok(has('from 0.40 to about 0.29')&&Math.abs(D.toy.check_avg[0]-0.29088)<1e-4&&has('from 0.15 to about 0.11'),'prose: toy prediction answer');
    ok(D.regmix.ratio_flops_doremi===0.095&&has('about 10%'),'prose: RegMix FLOPs about 10% of DoReMi');
    // continued-pretraining sections (moved from the former CPT page)
    const embC=await p.evaluate(()=>JSON.stringify(window.CPT));ok(embC===JSON.stringify(CPTD),'page embeds exactly parts/26_js_cpt_data.js');
    const cm=await p.evaluate(async()=>{const o=[],sz=document.getElementById('cmSize'),sl=document.getElementById('cmT');sl.value=20;sl.dispatchEvent(new Event('input'));
      for(const v of ['460M','940M','1.6B','3.1B']){sz.value=v;sz.dispatchEvent(new Event('change'));o.push(document.getElementById('cmOut').innerText.includes('match'))}return o});
    ok(cm.every(Boolean),'CMR calculator reproduces the four published CMRs at 20B ('+cm.join(',')+')');
    const dc=await p.evaluate(()=>{const s=document.getElementById('dcT');s.value=3;s.dispatchEvent(new Event('input'));return document.getElementById('dcOut').innerText});
    ok(/0\.92[45]/.test(dc),'D-CPT crossing at 3% near 0.924: '+dc.slice(0,90));
    const fill=await p.evaluate(()=>[...document.querySelectorAll('[data-v]')].map(e=>e.textContent));ok(fill.length>=5&&fill.every(v=>v&&v!=='?'),'toy numbers filled in the prose: '+fill.join(', '));
    const T=CPTD.toy.summary;ok(has('removes '+T['p1.0_r0.25'].removed_pct+'% of the English loss rise'),'prose: toy 25% replay removes '+T['p1.0_r0.25'].removed_pct+'%');
    ok(has('1% replay removed 52% of the Pile loss rise, 5% removed 71% and 25% removed 89%'),'prose: Ibrahim replay shares');
    const PR=D.proxy_runs;ok(PR&&PR.doremi&&PR.doremi.length===1,'measured DoReMi run embedded');
    const R=PR.doremi[0],pc=v=>(100*v).toFixed(1)+'%';
    ok(has('from 17% to 2.6%')&&Math.round(100*R.ref_weights.web)===17&&R.avg_weights.web===0.0263,'prose: web 17% to 2.6%');
    ok(has('rise to about 38% each')&&Math.round(100*R.avg_weights.code)===38&&Math.round(100*R.avg_weights.math)===38,'prose: code and maths about 38%');
    const H=R.trajectory,mx=k=>Math.max(...H.map(r=>r[k]));ok(has('reached 0.998 on code and 0.994 on maths')&&mx(2).toFixed(3)==='0.998'&&mx(3).toFixed(3)==='0.994','prose: max single-step alpha');
    const top=H.map(r=>r.indexOf(Math.max(...r)));ok(has('93% of the logged steps')&&Math.round(100*top.filter(t=>t===2||t===3).length/top.length)===93,'prose: code or maths on top 93%');
    const RA=R.running_avg,at=st=>RA[R.steps_logged.indexOf(st)];ok(has('maths 0.59 at step 200, 0.47 at 2,000, 0.385 at the end')&&at(200)[3].toFixed(2)==='0.59'&&at(2000)[3].toFixed(2)==='0.47'&&R.avg_weights.math.toFixed(3)==='0.385','prose: running average of maths (end value '+R.avg_weights.math+', logged end '+RA[RA.length-1][3]+')');
    const E=R.excess,n10=Math.round(E.length/10),last=[0,1,2,3,4].map(k=>E.slice(-n10).reduce((a,r)=>a+r[k],0)/n10),first=[0,1,2,3,4].map(k=>E.slice(0,n10).reduce((a,r)=>a+r[k],0)/n10);
    ok(has('0.58 to 0.62 nats on all five')&&Math.min(...last).toFixed(2)==='0.58'&&Math.max(...last).toFixed(2)==='0.62','prose: final excess equalised '+last.map(v=>v.toFixed(3)).join(' '));
    ok(has('about 2.3 to 2.7 nats')&&Math.min(...first)>2.3&&Math.max(...first)<2.8,'prose: early excess '+first.map(v=>v.toFixed(2)).join(' '));
    const dl=R.names.map(n=>R.proxy_val_loss[n]-R.ref_val_loss[n]);ok(has('0.35 to 0.39 nats worse')&&Math.min(...dl)>0.345&&Math.max(...dl)<0.395,'prose: proxy worse by '+dl.map(v=>v.toFixed(3)).join(' '));
    ok(D.smoke!==null&&Math.abs(D.smoke.tokens_per_s-6400)<100&&Math.abs(PR.runs[0].tokens_per_s-14700)<100,'prose: CPU about 6,400 and GPU about 14,700 tokens/s');
  }
  await p.close();
}
// 3. no autoplay: normal motion, scroll every card into view, wait, and confirm nothing is playing and every scrubber is at 0
{ const p=await b.newPage();await p.setViewport({width:920,height:900});await p.goto('file://'+page_path,{waitUntil:'load'});
  await p.evaluate(async()=>{try{localStorage.clear()}catch(e){}const sl=ms=>new Promise(r=>setTimeout(r,ms));for(const c of document.querySelectorAll('#t-read .card')){c.scrollIntoView({block:'center'});await sl(60)}await sl(2000)});
  const st=await p.evaluate(()=>[...document.querySelectorAll('#t-read .an-play')].map(b=>b.getAttribute('aria-label')+':'+(b.parentElement.querySelector('input[type=range]')||{}).value));
  ok(st.length>=4&&st.every(x=>x.startsWith('Play:0')),'no animation starts by itself ('+st.length+' controllers: '+st.join(' ')+')');
  await p.close(); }
await b.close();
console.log(fail?('FAILED '+fail):'all checks passed');process.exit(fail?1:0);
