// Exercises every control of the Estimator lab in headless Chrome, at 390 px dark and 920 px light:
// no console errors, no NaN or undefined in the tab's text, no sideways scroll, error box hidden; screenshots in ../../.shots/lab-*.png.
// usage (from src/lab): node check_lab.mjs
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined,args:process.platform==='linux'?['--no-sandbox']:[]});
let fails=0,probes=0;const say=(...a)=>console.log(...a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [scheme,width] of [['dark',390],['light',920]]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page);await p.click('button[data-t=t-lab]');await sleep(300);
  const probe=async(what)=>{probes++;const r=await p.evaluate(()=>{const t=document.getElementById('t-lab').innerText;return{nan:/\bNaN\b/.test(t),und:/undefined/.test(t),side:document.documentElement.scrollWidth>innerWidth,box:(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''})()}});
    const bad=r.nan||r.und||r.side||r.box||errs.length;if(bad){fails++;say('FAIL',scheme,width,what,JSON.stringify(r),errs.splice(0))}return!bad};
  const idle=async()=>{await p.waitForFunction(()=>{const T=window.LB_TEST;return T&&!T.rwBusy()&&!T.nl().busy()&&!T.cl().busy()},{timeout:300000,polling:200})};
  const click=async(sel)=>{await p.$eval(sel,e=>e.click())};
  const pick=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('change'))},id,v)};
  const opts=async id=>p.$$eval('#'+id+' option',os=>os.map(o=>o.value));
  const scrub=async(id,v)=>{await p.evaluate((id,v)=>{const s=document.getElementById(id);s.value=String(v);s.dispatchEvent(new Event('input'))},id,v)};
  const play=async(pre,ms)=>{await click('#'+pre+'-play');await sleep(ms);const on=await p.$eval('#'+pre+'-play',e=>e.getAttribute('aria-pressed'));if(on==='true')await click('#'+pre+'-play')};
  await probe('open');
  // visit every section so its default run starts, then screenshot at the defaults
  for(const id of ['lb-gw','lb-rw','lb-nl','lb-cl']){await p.$eval('#'+id,e=>e.scrollIntoView());await sleep(400)}
  await idle();await sleep(300);
  for(const pre of ['lb-gw','lb-rw','lb-nl','lb-cl']){const on=await p.$eval('#'+pre+'-play',e=>e.getAttribute('aria-pressed'));if(on==='true')await click('#'+pre+'-play')}
  await scrub('lb-gw-scr',3);await scrub('lb-rw-scr',10);await scrub('lb-nl-scr',40);await scrub('lb-cl-scr',300);await sleep(200);await probe('defaults');
  for(const id of ['lb-gw','lb-rw','lb-nl','lb-cl']){const el=await p.$('#'+id);await el.screenshot({path:path.join(shots,'lab-'+id+'-'+scheme+'-'+width+'.png')})}
  // ---- 1. gridworld
  await p.$eval('#lb-gw',e=>e.scrollIntoView());
  for(const w of ['a','b'])for(const v of await opts('lb-gw-m'+w)){await pick('lb-gw-m'+w,v);await click('#lb-gw-fwd');await click('#lb-gw-fwd');await click('#lb-gw-back');await probe('gw m'+w+'='+v)}
  await pick('lb-gw-ma','eval');await pick('lb-gw-mb','td');
  for(const v of await opts('lb-gw-al')){await pick('lb-gw-al',v);await probe('gw alpha '+v)}for(const v of await opts('lb-gw-seed')){await pick('lb-gw-seed',v);await probe('gw seed '+v)}
  for(const sp of ['0','1','2']){await pick('lb-gw-spd',sp);await play('lb-gw',350);await probe('gw play '+sp)}
  for(const v of [0,1,2,3,10,100,199]){await scrub('lb-gw-scr',v);await probe('gw scrub '+v)}
  // ---- 2. 5-state walk
  await p.$eval('#lb-rw',e=>e.scrollIntoView());
  for(const e of ['0','1','10','100']){await click('#lb-rw .lb-jb button[data-e="'+e+'"]');await probe('rw jump '+e)}
  for(const v of await opts('lb-rw-at')){await pick('lb-rw-at',v);await probe('rw at '+v)}for(const v of await opts('lb-rw-am')){await pick('lb-rw-am',v);await probe('rw am '+v)}
  for(const sp of ['0','1','2']){await pick('lb-rw-spd',sp);await play('lb-rw',350);await probe('rw play '+sp)}
  await scrub('lb-rw-scr',0);await click('#lb-rw-fwd');await click('#lb-rw-fwd');await click('#lb-rw-back');await probe('rw step');await scrub('lb-rw-scr',100);await click('#lb-rw-fwd');await probe('rw end');
  for(const m of ['batch','on']){await click('#lb-rw-mode button[data-m="'+m+'"]');await idle();await probe('rw mode '+m)}
  for(const v of ['20','500','100']){await pick('lb-rw-runs',v);await idle();await probe('rw runs '+v)}for(const v of ['2','3','1']){await pick('lb-rw-seed',v);await idle();await probe('rw seed '+v)}
  await click('#lb-rw-lg button');await probe('rw legend');await click('#lb-rw-lg button');
  // ---- 3. 19-state walk
  await p.$eval('#lb-nl',e=>e.scrollIntoView());
  for(const id of ['lb-nl-n','lb-nl-l','lb-nl-ep'])for(const v of await opts(id)){await pick(id,v);await click('#lb-nl-fwd');await scrub('lb-nl-scr',1000);await click('#lb-nl-back');await probe(id+'='+v)}
  for(const sp of ['0','1','2']){await pick('lb-nl-spd',sp);await play('lb-nl',350);await probe('nl play '+sp)}
  for(const f of ['lret','tdl','nstep','tdl']){await click('#lb-nl-fam button[data-f="'+f+'"]');await idle();await probe('nl fam '+f);if(f!=='nstep'&&scheme==='dark'){const el=await p.$('#lb-nl .lb-chart');await el.screenshot({path:path.join(shots,'lab-nl-'+f+'-'+scheme+'-'+width+'.png')})}}
  await click('#lb-nl-zm');await probe('nl zoom');await click('#lb-nl-ov');await idle();await probe('nl overlay off');await click('#lb-nl-ov');await idle();await click('#lb-nl-zm');
  await click('#lb-nl-lg button');await probe('nl legend');await click('#lb-nl-lg button');
  await pick('lb-nl-runs','25');await idle();await probe('nl runs 25');await pick('lb-nl-seed','2');await idle();await probe('nl seed 2');await pick('lb-nl-runs','100');await pick('lb-nl-seed','1');await idle();
  // ---- 4. cliff
  await p.$eval('#lb-cl',e=>e.scrollIntoView());
  for(const sp of ['0','1','2']){await pick('lb-cl-spd',sp);await scrub('lb-cl-scr',0);await play('lb-cl',400);await click('#lb-cl-fwd');await click('#lb-cl-back');await click('#lb-cl-back');await probe('cl speed '+sp)}
  for(const v of [0,1,250,499,500]){await scrub('lb-cl-scr',v);await click('#lb-cl-fwd');await probe('cl scrub '+v)}
  for(const w of ['a','b'])for(const v of await opts('lb-cl-m'+w)){await pick('lb-cl-m'+w,v);await idle();await probe('cl m'+w+'='+v)}
  await pick('lb-cl-ma','sarsa');await pick('lb-cl-mb','q');await idle();
  for(const id of ['lb-cl-eps','lb-cl-al','lb-cl-seed']){for(const v of await opts(id)){await pick(id,v);await idle();await probe(id+'='+v)}}
  await pick('lb-cl-eps','0.1');await pick('lb-cl-al','0.5');await pick('lb-cl-seed','1');
  for(const v of ['20','300','100']){await pick('lb-cl-runs',v);await idle();await probe('cl runs '+v)}for(const v of ['1','10']){await pick('lb-cl-sm',v);await probe('cl smooth '+v)}
  await click('#lb-cl-lg button');await probe('cl legend');await click('#lb-cl-lg button');await idle();
  // resize while open
  await p.setViewport({width:width===390?360:1100,height:900});await sleep(400);await probe('resize');
  const tabEl=await p.$('#t-lab');await p.setViewport({width,height:900});await sleep(300);await tabEl.screenshot({path:path.join(shots,'lab-full-'+scheme+'-'+width+'.png')});
  say(scheme,width,'done');await p.close()}
await b.close();say(fails?'check_lab: '+fails+' failures of '+probes+' probes':'check_lab: pass ('+probes+' probes)');process.exit(fails?1:0);
