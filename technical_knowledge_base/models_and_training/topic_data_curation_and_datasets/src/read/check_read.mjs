// Checks that the Reading tab embeds exactly the recorded published figures (src/read/facts.md)
// and that numbers quoted in its prose match the embedded data and the live demos.
// Usage (from the repo root): node <this file> <path to index.html>
import {createRequire} from 'module';
import path from 'path';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const page_path=path.resolve(process.argv[2]);
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();
await p.goto('file://'+page_path,{waitUntil:'load'});
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const D=await p.evaluate(()=>window.RDD);
const text=await p.evaluate(()=>{document.querySelectorAll('#t-read details').forEach(d=>d.open=true);document.querySelectorAll('#t-read .ans').forEach(a=>a.hidden=false);return document.getElementById('t-read').innerText});
const has=s=>text.includes(s);
// 1. embedded data equals the recorded facts
const expect={
 filt:[27.5,26.1,27.1,27.2,28.6,29.0,29.2,30.2],
 fwP:[[0.7,0.56],[0.75,0.77],[0.8,0.92],[0.85,0.988]],rwP:[[0.75,0.76],[0.8,0.994]],
 olmoPre:[53.0,59.8,72.6,81.3,75.8,29.0,40.7,44.6,24.1,27.4,74.6],olmoMid:[62.9,63.7,79.8,83.8,77.2,36.9,60.8,50.4,67.5,31.0,78.0],
 t5rep:[[0,83.28,80.88],[64,82.87,80.97],[256,82.62,79.78],[1024,79.55,76.27],[4096,76.34,70.92]],
 smol:[[37.5,35.5],[57.5,53.5],[41.9,40.8],[60.1,62.3],[36.2,40.1],[76.2,76.9]],
 lin:{'C4':175e9,'The Pile':387e9,'RefinedWeb':600e9,'Dolma':3e12,'RedPajama v2':30e12,'FineWeb':15e12,'FineWeb-Edu':1.3e12,'DCLM-Pool':240e12,'DCLM-baseline':3.8e12,'Zyda-2':5e12,'Nemotron-CC':6.3e12,'Essential-Web v1.0':24e12,'Nemotron-CC v2':6.6e12,'FinePDFs':3e12,'Dolma 3 Mix':5.93e12,'Nemotron-CC v2.1':2.5e12}};
ok(JSON.stringify(D.filt.map(r=>r[1]))===JSON.stringify(expect.filt),'DCLM Table 4 values');
ok(JSON.stringify(D.fwP)===JSON.stringify(expect.fwP)&&JSON.stringify(D.rwP)===JSON.stringify(expect.rwP),'FineWeb and RefinedWeb LSH probabilities');
ok(JSON.stringify(D.olmo.pre)===JSON.stringify(expect.olmoPre)&&JSON.stringify(D.olmo.mid)===JSON.stringify(expect.olmoMid),'OLMo 2 Table 9 7B rows');
ok(JSON.stringify(D.t5rep)===JSON.stringify(expect.t5rep),'T5 Table 9');
ok(JSON.stringify(D.smol.map(r=>[r[1],r[2]]))===JSON.stringify(expect.smol),'SmolLM2 Table 1');
ok(D.lin.length===Object.keys(expect.lin).length&&D.lin.every(c=>expect.lin[c[0]]===c[2]),'corpus sizes ('+D.lin.length+')');
// 2. the S-curve formula reproduces the published probabilities (to the published rounding)
const P=(s,bb,r)=>1-Math.pow(1-Math.pow(s,r),bb);
ok(D.fwP.every(([s,v])=>Math.abs(P(s,14,8)-v)<0.006),'14 x 8 reproduces FineWeb');
ok(D.rwP.every(([s,v])=>Math.abs(P(s,450,20)-v)<0.006),'450 x 20 reproduces RefinedWeb');
ok(D.rwP.every(([s])=>P(s,20,450)<1e-6),'20 x 450 (prose reading) matches almost nothing');
ok(JSON.stringify(D.d3P)===JSON.stringify([[0.6,0.10],[0.8,0.90]])&&D.d3P.every(([s,v])=>Math.abs(P(s,26,11)-v)<0.011),'26 x 11 reproduces Dolma 3 (90% at 0.8, 10% at 0.6)');
// 3. prose numbers match data (rebuilt 2026-10-24: the S-curve, DCLM bars, OLMo 2 bars and n-gram demo were retired; their numbers live on the owners)
ok(has('30.2 Core against 27.5')&&has('29.0 Core against fastText\'s 30.2')&&has('27.1 Core against 27.5'),'prose DCLM Table 4 numbers');
ok(has('24.1 to 67.5'),'prose OLMo GSM8K');
ok(has('about 4 GLUE points and 4.6 SQuAD')&&Math.abs((83.28-79.55)-3.73)<1e-9&&Math.abs((80.88-76.27)-4.61)<1e-9,'prose T5 repetition costs');
ok(has('about 1.2% of the run')&&Math.abs(50/4050*100-1.23)<0.01,'prose 50B / 4.05T');
ok(has('57.5%'),'prose Dolmino synthetic share (100 - 10 - 5 - 5 - 22.5)');
ok(D.fwP.every(([s,v])=>Math.abs(P(s,14,8)-v)<0.006),'14 x 8 (the hero and section 4 name it) reproduces FineWeb');
// 4. live demos match the step lists (2026-11-09: the page stepper's caption became the step list sx-page; the card keeps the live view and counts)
const pg=await p.evaluate(async()=>{const r={};const seg=document.getElementById('rd-page-mode'),ctl=document.getElementById('rd-page-ctl'),sl=ctl.querySelector('input[type=range]');
  for(const m of ['wet','traf','res']){seg.querySelector('[data-m="'+m+'"]').click();for(const st of [1,4,5,6,8]){sl.value=st;sl.dispatchEvent(new Event('input'));r[m+st]=document.getElementById('rd-page-cnt').innerText+' | '+document.getElementById('rd-page-view').innerText}}
  r.list=document.getElementById('sx-page').innerText;const P=window.RDP.page;
  r.wetDrop=P.wet_lines.filter((l,j)=>!P.keep_traf[j]).length;r.wetN=P.wet_lines.length;r.kept=P.keep_traf.filter(Boolean).length;r.lid=P.lid;r.v=P.verdict;r.hc=P.html_chars;r.ht=P.html_tags;return r});
ok(/dropped/.test(pg.wet4)&&/FAIL/.test(pg.wet4)&&/Words with a letter/.test(pg.wet4)&&pg.v.wet[1]==='gopher_below_alpha_threshold'&&pg.list.includes('gopher_below_alpha_threshold'),'WET text: live rules and datatrove agree (alpha rule), as the list says');
ok(!/FAIL/.test(pg.traf4)&&/: 0\.801/.test(pg.traf4)&&!/FAIL/.test(pg.res4)&&pg.list.includes('0.801 against 0.8'),'trafilatura and resiliparse text pass; alpha 0.801 as the list says');
ok(/2\.765/.test(pg.traf5)&&/0\.00164/.test(pg.traf5)&&pg.list.includes('2.765')&&pg.list.includes('0.00164'),'quality scores of the real page shown and listed');
ok(/a candidate pair/.test(pg.traf6),'the three extractions of the page are candidate near duplicates');
ok(pg.wetDrop===24&&pg.wetN===36&&pg.list.includes('24 of its 36 lines')&&pg.kept===12&&pg.list.includes('keep the 12 lines'),'WET and extractor line counts in the list');
ok(['0.9435','0.9361','0.9313'].every((v,i)=>pg.list.includes(v)&&Math.abs([pg.lid.traf,pg.lid.res,pg.lid.wet][i]-+v)<1e-9),'lid.176 scores in the list');
ok(pg.list.includes(pg.hc.toLocaleString('en-US')+' characters of HTML with '+pg.ht+' tags'),'raw record size in the list');
// 4b. Fig. 1 (the stage stg-pipe): every number in its step list against the data it draws
const st=await p.evaluate(()=>{const L=document.getElementById('sx-pipe').innerText,S=window.TM_DATA.storage,b=k=>S.sizes.find(x=>x.fmt===k).bytes/S.tokens,D=window.MXD.proxy.doremi,Q=window.QD.S,R0=window.DCPD.run0;
  return {L,bpt:[b('jsonl'),b('jsonl.zst'),b('bin')].map(v=>v.toFixed(2)),tok:S.tokens,ref:D.ref_w.map(v=>Math.round(v*100)+'%'),dr:D.avg_w.map(v=>(v*100).toFixed(1)+'%'),edu:Q.keep_edu,dclm:Q.keep_dclm,pii:window.DCPD.pii.docs_edited,
    resp:R0.responses,rem:[R0.removed['3_gopher_rep'].n,R0.removed['4_gopher_qual'].n,R0.removed['5_c4'].n,R0.removed['6_fineweb_qual'].n],fw:[R0.fineweb_kept,R0.fineweb_in_final]}});
ok(st.bpt.every(v=>st.L.includes(v))&&st.L.includes(st.tok.toLocaleString('en-US')),'stage: bytes per token '+st.bpt.join(', '));
ok(st.ref.every(v=>st.L.includes(v))&&st.dr.every(v=>st.L.includes(v)),'stage: natural shares and DoReMi weights '+st.dr.join(', '));
ok(st.L.includes('keeps '+st.edu)&&st.L.includes(st.dclm.toLocaleString('en-US'))&&st.L.includes(st.pii+' documents edited'),'stage: quality keeps and PII edits');
ok(st.L.includes(st.resp.toLocaleString('en-US')+' responses')&&st.rem.every(v=>st.L.includes(v.toLocaleString('en-US')))&&st.L.includes(st.fw[0].toLocaleString('en-US'))&&st.L.includes(st.fw[1].toLocaleString('en-US')),'stage: responses, rule removals, FineWeb overlap');
const R=await p.evaluate(()=>window.RDP);
ok(R.funnel.docs.html_pages===20463&&R.funnel.docs.after_minhash_in_file===2617&&R.chardup['extra_docs_kept_at_0.1']===154&&R.chardup['kept_at_0.1']===2846,'embedded Pipeline lab funnel and char-dup numbers');
const hero=[['20,991 responses',true],['−183 → 20,280',R.funnel.docs.after_url===20280],['→ 19,241',R.funnel.docs.after_extraction===19241],['−12,270 → 6,971',R.funnel.docs.after_lid===6971],['−4,279 → 2,692',R.funnel.docs.after_c4_and_fineweb_rules===2692&&R.funnel.docs.after_lid-2692===4279],['−75 inside one file → 2,617',R.funnel.docs.after_minhash_in_file===2617]];
hero.forEach(([t,c])=>ok(has(t)&&c,'hero: '+t));
const prose=[['12.8%',Math.abs(2617/20463-0.128)<0.0005],['2,846 against 2,692',true],['14.4%',true],['92 are kept by both, out of 640',true],['75 of 2,692 documents (2.8%)',Math.abs(75/2692-0.028)<0.0005],['914 of the same 2,692 (34.0%)',Math.abs(914/2692-0.340)<0.0005],['remove 1,277',true],['4,334 of 7,500',true]];
prose.forEach(([t,c])=>ok(has(t)&&c,'prose: '+t));
// 5. calculator: the default strict cut needs more crawls than exist (prose claim)
const calc=await p.evaluate(()=>document.getElementById('rd-c-cap').innerText);
ok(/Not enough web/.test(calc),'calculator default: 2T at score 3 is infeasible ('+calc.split('\n')[0]+')');
console.log(fail?'FAILED '+fail:'all checks passed');
await b.close();process.exit(fail?1:0);
