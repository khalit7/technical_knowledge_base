// Exercises every control on the page in headless Chrome, at 390 px dark and 920 px light: no console errors, no NaN, undefined or
// Infinity in the visible tab's text, no sideways scroll, error box hidden. Screenshots of each visual land in ../../.shots/el-*.png.
// usage (from src/checks): node check_page.mjs [quick]
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const quick=process.argv[2]==='quick';
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined});
let fails=0,probes=0;const say=(...a)=>console.log(...a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [scheme,width] of (quick?[['dark',390]]:[['dark',390],['light',920]])){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page);await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});await p.reload();await sleep(300);
  let cur='t-read';
  const tab=async t=>{cur=t;await p.click('button[data-t='+t+']');await sleep(250)};
  const probe=async(what)=>{probes++;const r=await p.evaluate(t=>{const x=document.getElementById(t).innerText;return{nan:/\bNaN\b/.test(x),und:/undefined/.test(x),inf:/Infinity/.test(x),side:document.documentElement.scrollWidth>innerWidth,box:(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''})()}},cur);
    const bad=r.nan||r.und||r.inf||r.side||r.box||errs.length;if(bad){fails++;say('FAIL',scheme,width,what,JSON.stringify(r),errs.splice(0))}return!bad};
  const click=async sel=>{await p.$eval(sel,e=>e.click())};
  const pick=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}))},id,v)};
  const slide=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}))},id,v)};
  const check=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.checked=v;e.dispatchEvent(new Event('change',{bubbles:true}))},id,v)};
  const steps=async ctl=>p.$eval('#'+ctl+'-s',e=>+e.max);
  const shot=async(sel,name)=>{const el=await p.$(sel);if(el){await el.scrollIntoView();await sleep(150);await el.screenshot({path:path.join(shots,'el-'+name+'-'+scheme+'-'+width+'.png')})}};
  const walk=async(ctl,what)=>{const n=await steps(ctl);for(const i of [0,1,2,Math.floor(n/2),n]){await slide(ctl+'-s',i);await probe(what+' step '+i)}};
  // ---------------- Reading ----------------
  await probe('read open');
  for(const g of ['rd-rf','rd-base','rd-sac','rd-quiz']){await p.$eval('#'+g,e=>e.scrollIntoView());await sleep(200)}
  await p.$$eval('details',ds=>ds.forEach(d=>d.open=true));await probe('details open');
  await p.$eval('#rd-spine tr[data-go="rd-ppo"]',e=>e.click());await sleep(200);await probe('spine click');await shot('#rd-spine','spine');
  // baseline explorer
  for(const v of [-20,0,30,80])for(const l of [-30,0,20,30]){await slide('rd-bxB',v);await slide('rd-bxL',l);await probe('bx '+v+' '+l)}
  await slide('rd-bxB',30);await slide('rd-bxL',20);await shot('#rd-bx','bx');
  // baseline animation
  for(const o of [0,10,20])for(const sd of ['5','8']){await slide('rd-pgO',o);await pick('rd-pgS',sd);await walk('rd-pgC','pg o'+o+' s'+sd)}
  await slide('rd-pgO',10);await pick('rd-pgS','5');await slide('rd-pgC-s',60);await shot('#rd-pgc','pg');
  await click('#rd-pgC-p');await sleep(900);await click('#rd-pgC-p');await click('#rd-pgC-f');await click('#rd-pgC-b');await pick('rd-pgC-v','2');await probe('pg transport');
  // GAE
  for(const pr of ['ex','long']){await click('#rd-gaM button[data-p="'+pr+'"]');for(const l of [0,50,95,100])for(const g of [80,99,100])for(const e of [-50,0,50]){await slide('rd-gaL',l);await slide('rd-gaG',g);await slide('rd-gaE',e);if(!quick||l===95)await probe('gae '+pr+' '+l+' '+g+' '+e)}await walk('rd-gaC','gae '+pr)}
  await click('#rd-gaM button[data-p="ex"]');await slide('rd-gaC-s',3);await shot('#rd-ga','gae');
  // clip vs ratio
  for(const r of [0,70,100,150,250])for(const e of [5,20,50]){await slide('rd-clR',r);await slide('rd-clE',e);await probe('cl '+r+' '+e)}
  await slide('rd-clR',70);await slide('rd-clE',20);await shot('#rd-cl','cl');
  // PPO epochs
  for(const a of ['1','-1']){await click('#rd-ppM button[data-a="'+a+'"]');for(const e of [5,20,50])for(const h of [5,20,60]){await slide('rd-ppE',e);await slide('rd-ppH',h);await walk('rd-ppC','pp '+a+' '+e+' '+h)}}
  await click('#rd-ppM button[data-a="1"]');await slide('rd-ppE',20);await slide('rd-ppH',60);await slide('rd-ppC-s',10);await shot('#rd-pp','pp');
  // SAC
  await p.$eval('#rd-sa',e=>e.scrollIntoView());await sleep(1200);
  for(const v of [0,44,100,130,150,200]){await slide('rd-saA',v);await probe('sac '+v)}
  await click('#rd-saB');await probe('sac auto');await slide('rd-saA',87);await shot('#rd-sa','sac');
  // ---------------- Short corridor ----------------
  await tab('t-cor');await sleep(300);await probe('cor open');
  await p.waitForFunction(()=>document.getElementById('co-figS').textContent.startsWith('Seeds'),{timeout:300000,polling:300});await probe('cor curves');
  for(const m of ['rf','ac'])for(const sd of ['1','3']){await click('#co-exM button[data-k="'+m+'"]');await pick('co-exS',sd);await walk('co-exC','cor '+m+' '+sd)}
  await click('#co-exM button[data-k="ac"]');await pick('co-exS','1');await slide('co-exC-s',30);await shot('#co-ex','cor-ex');
  if(!quick){for(const id of ['ac','ac12']){await click('#co-figK button[data-id="'+id+'"]')}
    await p.waitForFunction(()=>document.getElementById('co-figS').textContent.startsWith('Seeds'),{timeout:300000,polling:300});await probe('cor ac curves');
    await pick('co-figN','20');await check('co-figF',false);await p.waitForFunction(()=>document.getElementById('co-figS').textContent.startsWith('Seeds'),{timeout:300000,polling:300});await probe('cor nofloor');
    await check('co-figF',true);await pick('co-figN','100');await p.waitForFunction(()=>document.getElementById('co-figS').textContent.startsWith('Seeds'),{timeout:300000,polling:300});}
  await shot('#co-fig','cor-fig');
  const tbl=await p.$eval('#co-figT',e=>e.innerText);if(width===920)say(tbl);
  // ---------------- Further reading ----------------
  await tab('t-more');await probe('more open');
  await p.close();
}
await b.close();say('probes',probes,'fails',fails);process.exit(fails?1:0);
