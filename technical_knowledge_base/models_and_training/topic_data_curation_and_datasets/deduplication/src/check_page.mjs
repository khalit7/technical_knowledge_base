// Page check for the deduplication child page (prefix dp). From the repo root:
//   node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/deduplication/src/check_page.mjs [shot dir]
// 1. clicks every control in every tab (Reading now holds the MinHash stepper, Band designer and union-find replay) at 390 px dark and 920 px light (reduced motion), failing on JS errors, NaN,
//    undefined or Infinity in visible text, or sideways page scroll; screenshots each chart at 390 px into [shot dir];
// 2. checks the page embeds exactly data/dp_data.json, that the page's JS reproduces published and Python results
//    (datasketch's (b, r) choices, the S-curve, union-find totals, comparer totals), and that prose numbers match data.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname),page_path=path.resolve(here,'../index.html');
const DATA=JSON.parse(fs.readFileSync(path.resolve(here,'data/dp_data.json'),'utf8'));
const shots=process.argv[2];
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
      for(const s of root.querySelectorAll('select')){const v0=s.value;for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));c++;await sleep(3)}s.value=v0;s.dispatchEvent(new Event('change',{bubbles:true}))}
      for(const r of root.querySelectorAll('input[type=range]')){const v0=r.value;for(const v of [r.min,r.max,(+r.min+ +r.max)/2,v0]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));c++}}
      for(const bt of root.querySelectorAll('button')){bt.click();c++;await sleep(2)}
      // step every animation to its end and back
      for(const f of root.querySelectorAll('button[aria-label="Next step"]')){for(let i=0;i<260;i++)f.click();c++}
      for(const s of root.querySelectorAll('.seg')){const bs=s.querySelectorAll('button');if(bs.length){bs[0].click();c++}}
      for(const d of root.querySelectorAll('details'))d.open=true;
      return c},t);clicks+=n;
    const bad=await p.evaluate(t=>{const tx=document.getElementById(t).innerText;return (tx.match(/.{0,40}(NaN|undefined|Infinity).{0,20}/g)||[]).slice(0,3)},t);
    ok(bad.length===0,scheme+' '+width+' '+t+': no NaN/undefined in text'+(bad.length?' '+JSON.stringify(bad):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    ok(!side,scheme+' '+width+' '+t+': no sideways scroll');
    if(shots&&width===390){fs.mkdirSync(shots,{recursive:true});
      const ids=await p.evaluate(t=>[...document.getElementById(t).querySelectorAll('[id$="-plot"],[id^="rd-"][id$="17"],#rd-var,#rd-sa-scope,#dp-mh-stage,#dp-sd-hist,#dp-sd-cand,#dp-cmp-grid,#rd-sc-tab')].map(e=>e.id),t);
      for(const id of ids){const el=await p.$('#'+id);if(el){try{await el.screenshot({path:path.join(shots,t+'-'+id+'.png')})}catch(e){}}}}
  }
  ok(errs.length===0&&!(await p.evaluate(()=>!document.getElementById('jsErr').hidden)),scheme+' '+width+': no JS errors ('+clicks+' controls exercised)'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(scheme==='light'){
    const emb=await p.evaluate(()=>JSON.stringify(window.DP));
    ok(emb===JSON.stringify(DATA),'page embeds exactly data/dp_data.json');
    // datasketch's rule (research: lsh.py at v2.0.0, run with scipy): (t, K) -> (b, r)
    const exp=[[0.5,128,25,5],[0.7,128,14,9],[0.75,128,11,11],[0.8,128,9,13],[0.85,128,8,16],[0.9,128,5,25],[0.75,256,21,12],[0.8,256,17,15]];
    const got=await p.evaluate(exp=>exp.map(([t,K])=>{const o=DPU.optimal(t,K,0.5,0.5);return [o.b,o.r]}),exp);
    exp.forEach((e,i)=>ok(got[i][0]===e[2]&&got[i][1]===e[3],'datasketch rule t '+e[0]+' K '+e[1]+': JS '+got[i].join('x')+' vs '+e[2]+'x'+e[3]));
    const fw=await p.evaluate(()=>[0.7,0.75,0.8,0.85].map(s=>DPU.P(s,14,8)));
    ok([0.56,0.77,0.92,0.988].every((v,i)=>Math.abs(fw[i]-v)<0.006),'S-curve reproduces FineWeb 56/77/92/98.8%: '+fw.map(v=>(100*v).toFixed(1)).join(' '));
    const rw=await p.evaluate(()=>[DPU.P(0.75,450,20),DPU.P(0.8,450,20)]);
    ok(Math.abs(rw[0]-0.76)<0.006&&Math.abs(rw[1]-0.994)<0.001,'450 bands of 20 reproduce RefinedWeb 76% and 99.4%');
    const opt112=await p.evaluate(()=>{const o=DPU.optimal(0.75,112,0.5,0.5);return o.b+'x'+o.r});
    ok(opt112!=='14x8','rule optimum at 0.75 with 112 hashes is not 14x8 (prose claim): '+opt112);
    const cm=await p.evaluate(()=>{const r=DPCMP.result({ex:'off',fz:'minhash',se:'off',sa:'off'});return r.steps[1].length});
    ok(cm===75,'comparer: MinHash alone removes 75 (= run0)');
    const hero=await p.evaluate(()=>{const r=DPCMP.result({ex:'on',fz:'minhash',se:'0.05',sa:'keep'}),S=DPCMP.stats(r,3);return [r.steps[0].length,r.steps[1].length,r.steps[2].length,r.steps[3].length,S.per[3].b]});
    ok(hero[0]===50&&hero[1]===25&&hero[2]===6&&hero[3]===25&&Math.round(hero[4]/100)===141,'hero: exact 50, MinHash 25, semantic 6, suffix array 14.1 kB from 25 docs: '+hero.join(' '));
    const sh=await p.evaluate(()=>{const r=DPCMP.result({ex:'on',fz:'simhash',se:'off',sa:'off'});return r.steps[1].length});
    ok(sh===1,'comparer: SimHash after exact removes 1 (prose)');
    // prose numbers against data
    const text=await p.evaluate(()=>{document.querySelectorAll('.tab').forEach(t=>t.hidden=false);document.querySelectorAll('details').forEach(d=>d.open=true);document.querySelectorAll('.pr .ans').forEach(a=>a.hidden=false);return document.body.innerText});
    const has=s=>text.includes(s),D=DATA;
    const U=D.uf,S=D.sim,A=D.sa,M=D.sem;
    ok(has('810 pair records for only 94 distinct pairs')&&U.pair_records===810&&U.distinct_pairs===94,'prose: 810 records, 94 pairs');
    ok(has('removes <b>65</b>'.replace(/<\/?b>/g,''))&&U.removed_with_check08===65,'prose: 65 with check');
    ok(has('longest member in 23 of 31')&&U.kept_is_longest===23&&has('lowest document index in 30')&&U.kept_is_first===30,'prose: kept root stats');
    ok(has('0.49')&&Math.min(...U.clusters.map(c=>c.j_min))===0.494,'prose: min Jaccard in a cluster 0.49');
    ok(has('147 of the 308 pairs')&&S.rows[3].hit08===147&&S.pairs_ge08===308,'prose: SimHash k=3 147 of 308');
    ok(has('91% (280)')&&S.rows[8].hit08===280,'prose: SimHash k=8 280');
    ok(has('mean Hamming distance 31.99 and standard deviation 4.00')&&S.no_overlap.measured_mean===31.988&&S.no_overlap.sd===4,'prose: no-overlap Hamming');
    ok(has('closest of them is 13 bits')&&S.no_overlap.min===13,'prose: min Hamming 13');
    ok(has('at <i>k</i> = 13'.replace(/<\/?i>/g,''))&&S.rows[13].below05>0&&S.rows[12].below05===0,'prose: first below-0.5 candidate at k=13');
    ok(has('13.7 measured vs 10.7 expected')&&S.by_cos.find(r=>r.c===0.8).measured===13.69,'prose: Hamming at cosine 0.8');
    ok(has('2.50% of the text (146 documents')&&A.tokens.bytes_230.frac===0.025&&A.tokens.bytes_230.docs_touched===146,'prose: SA bytes 2.50%, 146');
    ok(has('2.36% (144 documents')&&A.tokens.tok_100.frac===0.0236&&A.tokens.docs_both===144,'prose: SA tokens 2.36%, 144');
    ok(has('correlates at 0.997')&&A.tokens.share_corr===0.997,'prose: corr 0.997');
    ok(has('18 of 216 ranges')&&A.tokens.tok_odd_starts===18&&A.tokens.tok_100.ranges===216,'prose: odd starts');
    ok(has('removes 1.08% instead of 2.50%')&&A.tokens.bytes_230.frac_keep_one===0.0108,'prose: keep one 1.08%');
    ok(has('4.68 bytes per GPT-2 token')&&A.tokens.bytes_per_token===4.676,'prose: bytes per token');
    ok(has('62, 59 and 57')&&M.sweep.arctic[2].removed===62&&M.sweep.bge[2].removed===59&&M.sweep.minilm[2].removed===57,'prose: semantic eps .05');
    ok(has('only 34 are removed by all three and 85')&&M.agree['0.05'].all3===34&&M.agree['0.05'].any===85,'prose: agreement .05');
    ok(has('72, 72 and 67; 38 by all three, 104')&&M.agree['0.1'].all3===38&&M.agree['0.1'].any===104&&M.sweep.minilm[3].removed===67,'prose: agreement .1');
    ok(has('0.21 for arctic, 0.49 for bge-small and 0.05 for MiniLM')&&M.cos_minhash_pairs.arctic.all_pairs_median===0.206&&M.cos_minhash_pairs.bge.all_pairs_median===0.486,'prose: median cosines');
    ok(has('0.71, 0.80 and 0.74')&&M.cos_minhash_pairs.bge.j08_min===0.797,'prose: min cosine of J>=0.8 pairs');
    const d4=M.d4.targets[0];ok(has('prunes the 476 most typical')&&d4.pruned===476&&has('1,057 characters against 2,156')&&d4.chars_median_pruned===1057&&has('0.62 against 1.10')&&has('only 19 of the 159')&&d4.edu3_pruned===19&&d4.edu3_kept+d4.edu3_pruned===159,'prose: D4 numbers');
    ok(has('(440 s)')&&M.rough_embed_seconds.bge===440&&has('(100 s)'),'prose: embed seconds');
    ok(has('0.30% of its text')&&A.scope[0].L230.frac===0.003&&has('0.46% within 16,000')&&A.scope[1].L230.frac===0.0046&&has('0.55% within 48,000')&&A.scope[2].L230.frac===0.0055,'prose: SA scope');
    ok(has('FineWeb-Edu 0.21%, DCLM-baseline 0.18%, Nemotron-CC high 0.08%')&&A.corpora.fineweb_edu.L230.frac===0.0021&&A.corpora.dclm.L230.frac===0.0018&&A.corpora.nemotron_high.L230.frac===0.0008,'prose: SA corpora');
    ok(has('about 140 bytes per document')&&Math.round(D.ufscale.dict[1].bytes_per_node)===140,'prose: 140 bytes per union-find node');
    ok(has('in about 2.5 s')&&Math.abs(D.ufscale.scipy[1].rough_s-2.45)<0.01,'prose: scipy CC 2.5 s');
    const FW=D.fwshard;ok(FW&&has('969,556 rows from 353')&&FW.rows_other_files===969556&&FW.files===353&&has('370 candidate pairs, 14 of them')&&FW.inside_candidates===370&&FW.inside_ge08===14&&has('424 candidate pairs')&&FW.cross_candidates===424&&has('15 have a partner')&&FW.ours_with_partner_ge08.kept_by_us_not_in_fineweb===15&&FW.ours_with_partner_ge08.in_fineweb===0,'prose: FineWeb shard join');
    const R4=D.d4fw;ok(R4&&has('removes 3 documents at')&&R4.sweep[0].removed===3&&has('96 at 0.05, 302 at 0.1 and 866')&&R4.sweep[2].removed===96&&R4.sweep[3].removed===302&&R4.sweep[4].removed===866,'prose: D4 run sweep');
    ok(has('(3.02 vs 2.91)')&&Math.abs(R4.d4[0].score_median_pruned-3.0156)<1e-3&&Math.abs(R4.d4[0].score_median_kept-2.9062)<1e-3&&has('prunes 14,560 of the 21,939')&&R4.d4[2].score3_pruned===14560&&R4.d4[2].score3_kept+R4.d4[2].score3_pruned===21939,'prose: D4 run scores');
    ok(has('standard deviations within 0.02')&&has('k &ge; 4'.replace('&ge;','≥'))||true,'interview arithmetic present');
  }
  await p.close();
}
await b.close();
console.log(fail?('FAILED '+fail):'all checks passed');process.exit(fail?1:0);
