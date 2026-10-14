// Page check for the storage and loading child page (prefix sl). From the repo root:
//   node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/storage_and_loading/src/check_page.mjs
// 1. clicks every control in every tab at 390 px dark and 920 px light (reduced motion), failing on JS errors, NaN,
//    undefined or Infinity in visible text, or sideways page scroll; saves element screenshots to ../.shots/;
// 2. checks the page embeds exactly data/sl_data.json, that the browser's packing and shuffle code reproduce the Python
//    runs, and that numbers quoted in the prose match the data.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const here=path.dirname(new URL(import.meta.url).pathname), page_path=path.resolve(here,'../index.html'), shots=path.resolve(here,'../.shots');
fs.mkdirSync(shots,{recursive:true});
const D=JSON.parse(fs.readFileSync(path.resolve(here,'data/sl_data.json'),'utf8'));
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
      for(const s of root.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));c++;await sleep(5)}}
      for(const r of root.querySelectorAll('input[type=range]')){for(const v of [r.min,r.max,Math.round((+r.min+ +r.max)/2)]){r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));c++}}
      for(const i of root.querySelectorAll('input[type=checkbox]')){i.click();c++;i.click()}
      for(const bt of root.querySelectorAll('button')){if(bt.closest('#tabs'))continue;bt.click();c++;await sleep(2)}
      for(const bt of root.querySelectorAll('.seg button')){bt.click();c++;await sleep(2)}
      for(const r of root.querySelectorAll('[data-w]')){r.dispatchEvent(new MouseEvent('click',{bubbles:true}));c++;break}
      return c},t);clicks+=n;
    const bad=await p.evaluate(t=>{const tx=document.getElementById(t).innerText;return (tx.match(/.{0,40}(NaN|undefined|Infinity).{0,20}/g)||[]).slice(0,3)},t);
    ok(bad.length===0,scheme+' '+width+' '+t+': no NaN/undefined in text'+(bad.length?' '+JSON.stringify(bad):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    ok(!side,scheme+' '+width+' '+t+': no sideways scroll');
  }
  ok(errs.length===0&&!(await p.evaluate(()=>!document.getElementById('jsErr').hidden)),scheme+' '+width+': no JS errors ('+clicks+' controls exercised)'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  // element screenshots in a fresh state
  await p.reload({waitUntil:'load'});
  for(const [t,sel,prep] of [['t-read','#sl-meg',async()=>{await p.evaluate(()=>{const s=document.getElementById('sl-meg-ctl-s');s.value=8;s.dispatchEvent(new Event('input'))})}],
      ['t-read','#sl-meg',async()=>{await p.evaluate(()=>{document.querySelector('#sl-meg-seg button[data-m=nano]').click();const s=document.getElementById('sl-meg-ctl-s');s.value=s.max;s.dispatchEvent(new Event('input'))})}],
      ['t-read','#sl-fwpq',null],['t-read','#sl-cmp',null],['t-read','#sl-wrap',null],['t-read','#sl-shsum',null],
      ['t-pack','#sl-p-card',async()=>{await p.evaluate(()=>{document.querySelector('#sl-p-s button[data-m=bfd]').click();const s=document.getElementById('sl-p-ctl-s');s.value=s.max;s.dispatchEvent(new Event('input'))})}],
      ['t-shuf','#sl-s-card',null],['t-shuf','#sl-r-card',async()=>{await p.evaluate(()=>document.querySelector('#sl-r-m button[data-m=buffer]').click())}],
      ['t-calc','#t-calc',null],['t-fmt','#sl-f-bars',null]]){
    await p.click('#tabs button[data-t="'+t+'"]');if(prep)await prep();const el=await p.$(sel);
    if(el)await el.screenshot({path:path.join(shots,'el-'+scheme+'-'+sel.slice(1)+(prep&&sel==='#sl-meg'?(await p.evaluate(()=>document.querySelector('#sl-meg-seg .on').dataset.m)):'')+'.png')})}
  if(scheme==='light'){
    const emb=await p.evaluate(()=>JSON.stringify(window.SL));ok(emb===JSON.stringify(D),'page embeds exactly data/sl_data.json');
    // packing: browser code against packing.py at every L
    await p.click('#tabs button[data-t="t-pack"]');
    for(const L of ['1024','2048','4096','8192']){await p.click('#sl-p-l button[data-m="'+L+'"]');const tx=await p.$eval('#sl-p-chk',e=>e.textContent);ok(/identical for all four/.test(tx),'packing JS = packing.py at L='+L)}
    await p.click('#tabs button[data-t="t-shuf"]');
    const keys=Object.keys(D.shuf.orders);let allm=true;
    for(const k of keys){await p.select('#sl-s-rec',k);const tx=await p.$eval('#sl-s-out',e=>e.textContent);if(!/matches Python/.test(tx)){allm=false;console.log('  mismatch',k)}}
    ok(allm,'shuffle metrics recomputed in the browser match shuffle.py for all '+keys.length+' recorded schemes');
    // prose numbers against data
    await p.click('#tabs button[data-t="t-read"]');const txt=await p.$eval('#t-read',e=>e.textContent.replace(/\s+/g,' '));
    const f2=D.fmt2k,sz=k=>f2.sizes.find(s=>s.fmt===k).bytes,P2=D.pack.k2['2048'],M=k=>D.shuf.m[k],R=D.resume,mb=b=>(b/1e6).toFixed(2)+' MB';
    const claims=[[mb(sz('jsonl')),'JSONL size'],[mb(sz('jsonl.zst')),'zstd JSONL'],[mb(sz('parquet.zstd3')),'Parquet zstd 3'],[mb(sz('parquet.zstd')),'Parquet default'],
      [(100*P2.pad.pad_frac).toFixed(1)+'%','padding 2048'],[String(P2.concat.docs_cut)+' of the 2,000','docs cut'],[String(P2.bfd.docs_cut),'bfd cut'],[Math.round(100*P2.concat.cross_pair_frac)+'%','cross 2048'],
      [Math.round(100*D.pack.k2['8192'].concat.cross_pair_frac)+'%','cross 8192'],[(100*D.pack.k2['2048'].trunc.tokens_lost_frac).toFixed(1)+'%','trunc lost'],
      [f2.tokens.qwen3.ids_ge_65536.toLocaleString('en-US'),'ids >= 65536'],[f2.tokens.qwen3.docs_with_id_ge_65536.toLocaleString('en-US'),'docs wrapped'],
      [M('none').batch_distinct_mean.toFixed(1)+' bucket','none distinct'],['gives '+M('hf_buf1000_mbis1').batch_distinct_mean.toFixed(1),'buf1000'],[M('global').batch_distinct_mean.toFixed(1),'global'],
      [M('hf_buf100_mbis1').batch_distinct_mean.toFixed(1)+' buckets','buf100'],[M('dl4_hf_buf1000_mbis1').batch_distinct_mean.toFixed(1)+' buckets','dl4'],
      [String(R.hf_buffer1000.never_seen),'hf lost'],[String(R.new_seed_restart.never_seen)+' never seen','new seed'],
      [(D.llama.tokens_per_s/1e6).toFixed(1)+' million tokens','llama tps'],[D.llama.step_s.toFixed(1)+' s','llama step'],[Math.round(D.llama.mb_per_s_uint32)+' MB/s','llama MB/s'],
      [(D.xcheck.nemotron_bpt).toFixed(2)+' bytes per token','nemotron bpt'],[(D.xcheck.fineweb_bpt).toFixed(2)+' bytes per token','fineweb bpt'],['our '+(D.xcheck.ours_snappy_gpt2_bpt).toFixed(2),'ours snappy'],
      [(D.fw.footer_bytes/1e6).toFixed(1)+' MB','footer'],[String(D.fw.row_groups),'row groups'],[(D.fw.file_bytes/1e9).toFixed(2)+' GB','fw file'],
      [(100*D.meg.nanogpt_big.unseen_frac).toFixed(1)+'%','nanogpt unseen'],[(D.tok.chars_per_token).toFixed(2)+' characters','chars per token'],
      [(D.tok.rough_single_thread_tokens_per_s/1e6).toFixed(2)+'M tokens','tok single'],[(D.tok.rough_batch_tokens_per_s/1e6).toFixed(1)+'M tokens','tok batch'],
      [Math.round(D.loader.nanogpt_get_batch_tok_s/1e6)+'M tokens','loader nanogpt'],[Math.round(D.loader.dataloader_0_workers_tok_s/1e6)+'M tokens','loader 0'],[Math.round(D.loader.dataloader_4_workers_tok_s/1e6)+'M with 4','loader 4'],
      [String(f2.tar.members.toLocaleString('en-US'))+' members','tar members'],[Math.round(100*(1-f2.tar.payload_bytes/f2.tar.file_bytes))+'% of the file','tar overhead']];
    for(const [s,n] of claims)ok(txt.includes(s),'prose has '+n+': "'+s+'"');
  }
  await p.close();
}
await b.close();
console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
