// Post-training data child page check. Usage (from the repo root): node <this file> <page folder> [shots dir]
// 1) the page embeds exactly data/pd_data.json and every fact of data/facts.json appears in the text;
// 2) a set of prose numbers recomputed here from data/out/*.json (independently of build_data.py) appear in the page;
// 3) every control of every tab is exercised at 390 px dark and 920 px light: no errors, NaN, undefined or sideways scroll;
// 4) optional element screenshots for review.
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs';
const require=createRequire(path.resolve('html_utils/package.json'));
const puppeteer=require('puppeteer');
const dir=path.resolve(process.argv[2]);const shots=process.argv[3]||null;
const src=path.join(dir,'src');const J=f=>JSON.parse(fs.readFileSync(path.join(src,f),'utf8'));
const D=J('data/pd_data.json'),F=J('data/facts.json');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const fmt=x=>Math.round(x).toLocaleString('en-US'),pct=(a,b,d)=>(100*a/b).toFixed(d)+'%';
// 2) independent recomputation from the run outputs
const si=J('data/out/selfinst.json'),ck=J('data/out/check.json'),pf=J('data/out/pref.json'),env=J('data/out/env.json'),rl=J('data/out/rlcheck.json');
const R={si_dolly_pct:pct(si.dolly.above,si.dolly.n,1),si_alp_exact:fmt(si.alpaca.exactly),ck_mv_pct:pct(ck.answer.ok.math_verify,ck.n,0),
  ck_tulu_pct:pct(ck.answer.ok.tulu_math,ck.n,0),ck_last_pct:pct(ck.answer.ok.last_number,ck.n,0),ck_ll_true:fmt(ck.llama.true),
  ub_h4_ties:fmt(pf.ufb_raw.rule_stats.h4.ties),env_resolved_pct:pct(env.nebius.resolved,env.nebius.n,1),rl_math_rec:fmt(rl.math.recorded),
  rl_math_mv:fmt(rl.math.ours.math_verify),rl_if_all:fmt(rl.if.ours_all),
  env_gym_f2p1_pct:pct(env.swe_gym.f2p_one,env.swe_gym.n,0)};
for(const [k,v] of Object.entries(R))ok(F[k]===v||(F[k]||'').startsWith(v),'fact '+k+' = '+v+' (recomputed; facts.json says '+F[k]+')');
const text=html.replace(/<[^>]+>/g,' ');
let miss=Object.entries(F).filter(([k,v])=>!text.includes(String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').slice(0,40))&&!html.includes(String(v).slice(0,40)));
ok(miss.length===0,'every fact appears in the page'+(miss.length?' (missing: '+miss.map(x=>x[0]).join(',')+')':''));
ok(!/@@[a-z0-9_]+@@/.test(html),'no unfilled @@fact@@');
const b=await puppeteer.launch({headless:'shell'});
for(const [w,scheme] of [[390,'dark'],[920,'light']]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+path.join(dir,'index.html'),{waitUntil:'load'});
  if(w===390){const E=await p.evaluate(()=>window.PD);ok(JSON.stringify(E)===JSON.stringify(D),'embedded window.PD equals data/pd_data.json')}
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('#tabs button')].map(b=>b.dataset.t));
  for(const t of tabs){
    const n=await p.evaluate(async(t)=>{document.querySelector('#tabs button[data-t="'+t+'"]').click();const T=document.getElementById(t);let c=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(150);
      for(const sg of T.querySelectorAll('.seg')){for(const b of [...sg.querySelectorAll('button')]){b.click();c++;await wait(20);
        for(const sc of T.querySelectorAll('.an-ctl input[type=range]')){for(let i=0;i<=+sc.max;i++){sc.value=i;sc.dispatchEvent(new Event('input'));c++;await wait(2)}}}}
      for(const s of T.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change'));c++;await wait(10);
        for(const bb of T.querySelectorAll('#pp-next,#pc-next')){for(let k=0;k<3;k++){bb.click();c++}}}}
      for(const x of T.querySelectorAll('input[type=checkbox]')){x.click();c++;await wait(10);x.click()}
      for(const x of T.querySelectorAll('.pa-list button,circle[data-k],td.v')){x.dispatchEvent(new MouseEvent('click',{bubbles:true}));c++;await wait(5)}
      for(const x of T.querySelectorAll('.an-ctl button,.pr .opts button,#pp-prev,#pc-prev')){x.click();c++;await wait(5)}
      T.querySelectorAll('details').forEach(d=>d.open=true);await wait(300);return c},t);
    const txt=await p.evaluate(t=>document.getElementById(t).innerText,t);
    const bad=(txt.match(/.{0,40}(NaN|undefined|\[object).{0,40}/g)||[]);
    ok(!bad.length,w+'px '+t+': '+n+' controls exercised, no NaN or undefined'+(bad.length?' '+bad.slice(0,3).join(' | '):''));
    const side=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(side<=0,w+'px '+t+': no sideways scroll ('+side+')');
  }
  ok(errs.length===0,w+'px: no errors'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
  if(shots){fs.mkdirSync(shots,{recursive:true});
    for(const [t,sel] of [['t-read','#pd-s0'],['t-read','#pd-si-card'],['t-read','#pd-mix-card'],['t-read','#pd-lin'],['t-read','#pd-s3'],['t-read','#pd-s4'],['t-read','#pd-s5'],['t-read','#pd-bin-card'],['t-read','#pd-s6'],['t-read','#pd-ex-card'],['t-read','#pd-s7'],['t-read','#pd-s8'],['t-read','#pd-s9'],['t-pdat','#t-pdat'],['t-pdpair','#t-pdpair'],['t-pdchk','#t-pdchk']]){
      await p.evaluate(t=>document.querySelector('#tabs button[data-t="'+t+'"]').click(),t);await new Promise(r=>setTimeout(r,250));
      const el=await p.$(sel);if(el)await el.screenshot({path:path.join(shots,w+'_'+sel.replace('#','')+'.png')})}}
  await p.close();
}
await b.close();console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
