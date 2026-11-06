// Exercises every control on the page in headless Chrome, at 390 px dark, 920 px light and 1400 px light: no console errors, no NaN, undefined or
// Infinity in the visible tab's text, no sideways scroll, error box hidden. Screenshots of each visual land in ../../.shots/el-*.png.
// Motion (Khalid, 2026-11-06; replaces the no-autoplay assertion): every 3D stage and 2D animation plays by itself once scrolled into view,
// stepping reaches its last step, its step list has one item per step, and under prefers-reduced-motion nothing moves by itself.
// usage (from src/checks): node check_page.mjs [quick]
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const quick=process.argv[2]==='quick';
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined});
let fails=0,probes=0;const say=(...a)=>console.log(...a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [scheme,width] of (quick?[['dark',390]]:[['dark',390],['light',920],['light',1400]])){
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
  // split layout at 1400 px: every .s3sp is two columns
  if(width>=1100){probes++;const cols=await p.$$eval('#t-read .s3sp',xs=>xs.map(x=>getComputedStyle(x).display));if(!cols.length||cols.some(d=>d!=='grid')){fails++;say('FAIL split',scheme,width,cols)}}
  // the numbers Fig. 1's step list quotes, from the page's own engine
  if(width===920){probes++;const h=await p.evaluate(()=>{const H=window.PG3.hero,f=v=>v.map(x=>x.toFixed(2)).join(',');return [f(H.score),f(H.u0),f(H.uB),f(H.grad),H.var0.toFixed(2),H.varB.toFixed(2),f(H.pi1),H.ratio.toFixed(2),window.PG3.rtg.TOGO.join(',')].join(' | ')});
    const want='0.67,-0.33,-0.33 | 0.67,-0.33,-0.33 | -1.33,0.67,0.67 | -0.67,-0.33,1.00 | 7.56 | 1.56 | 0.22,0.26,0.51 | 1.54 | 2,1,1,-1';
    if(h!==want){fails++;say('FAIL hero numbers',h)}}
  // 2D animations: each plays by itself once at least half in view (its button reads Pause), and its step list has one item per step
  for(const [card,ctl,list] of [['rd-pgc','rd-pgC','sx-pgc'],['co-ex','co-exC','sx-ex'],['rd-ga','rd-gaC','sx-ga'],['rd-pp','rd-ppC','sx-pp']]){
    await p.$eval('#'+card,e=>e.scrollIntoView({block:'center'}));await sleep(1500);probes++;
    const r=await p.evaluate((ctl,list)=>({play:/Pause/.test(document.getElementById(ctl+'-p').textContent),n:+document.getElementById(ctl+'-s').max+1,li:document.getElementById(list).children.length,on:document.querySelectorAll('#'+list+' li.on').length}),ctl,list);
    if(!r.play||r.n!==r.li||r.on!==1){fails++;say('FAIL anim',scheme,width,card,JSON.stringify(r))}
    // a click on the last list item stops it there
    await p.evaluate(l=>{const L=document.getElementById(l);L.children[L.children.length-1].click()},list);await sleep(300);probes++;
    const r2=await p.evaluate(ctl=>({play:/Pause/.test(document.getElementById(ctl+'-p').textContent),i:+document.getElementById(ctl+'-s').value,n:+document.getElementById(ctl+'-s').max}),ctl);
    if(r2.play||r2.i!==r2.n){fails++;say('FAIL anim stop',scheme,width,card,JSON.stringify(r2))}
    await probe(card+' last')}
  // 3D stages: autoplay on view, list length, every list item, step to the end, mid and last screenshots, stopped stays stopped
  for(const id of await p.$$eval('#t-read .stg',xs=>xs.map(x=>x.id))){
    await p.$eval('#'+id,e=>e.scrollIntoView({block:'center'}));await sleep(2400);probes++;
    if(!((await p.$eval('#'+id,e=>+e.dataset.frames||0))>0)){fails++;say('FAIL stage did not play',scheme,width,id)}
    const modes=id==='stg-oac'?['ddpg','td3','sac']:[null];
    for(const m of modes){if(m){await click('#rd-oacM button[data-m="'+m+'"]');await sleep(300)}
      const n=await p.$eval('#'+id+' .stg-r',e=>+e.max+1),lis=await p.$eval('#'+id,h=>h.closest('.s3sp').querySelector('ol.sx').children.length);probes++;
      if(n!==lis){fails++;say('FAIL stage list',scheme,width,id,n,lis)}
      for(let k=0;k<n;k++){await p.evaluate((id,k)=>document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(),id,k);await sleep(120);await probe(id+' '+(m||'')+' step '+(k+1))}
      await click('#'+id+'-b');for(let k=0;k<n+1;k++)await click('#'+id+'-f');await sleep(2000);probes++;
      const shown=await p.$eval('#'+id+' .stg-st',e=>e.textContent);if(shown!=='step '+n+' of '+n){fails++;say('FAIL stage end',scheme,width,id,shown)}
      const mid=Math.floor((n-1)/2);
      await p.evaluate((id,k)=>document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(),id,mid);await sleep(1800);await shot('#'+id,id+(m?'-'+m:'')+'-mid');
      await p.evaluate((id,k)=>document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(),id,n-1);await sleep(1800);await shot('#'+id,id+(m?'-'+m:'')+'-last');
      const f0=await p.$eval('#'+id,e=>+e.dataset.frames||0);await sleep(1200);probes++;if((await p.$eval('#'+id,e=>+e.dataset.frames||0))!==f0){fails++;say('FAIL stage kept moving',scheme,width,id)}}
    await click('#'+id+'-b');const f0=await p.$eval('#'+id,e=>+e.dataset.frames||0);await click('#'+id+'-p');await sleep(1000);probes++;
    if((await p.$eval('#'+id,e=>+e.dataset.frames||0))<=f0){fails++;say('FAIL stage did not play on play',scheme,width,id)}await click('#'+id+'-p')}
  if(width===1400){await p.evaluate(()=>scrollTo(0,0));await sleep(300);await p.screenshot({path:path.join(shots,'el-top-'+scheme+'-'+width+'.png')})}
  // new static figures and the natural-gradient slider
  for(const v of [0,50,98,99])for(const d of [1,10,50]){await slide('rd-ngP',v);await slide('rd-ngD',d);await probe('ng '+v+' '+d)}
  await slide('rd-ngP',0);await slide('rd-ngD',10);await shot('#rd-ngC','ng');
  for(const id of ['rd-heroC','rd-jpC','rd-a3cC'])await shot('#'+id,id);
  await p.$eval('#rd-hero g[data-go="rd-ppo"]',e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));await sleep(200);await probe('hero click');
  await p.$$eval('details',ds=>ds.forEach(d=>d.open=true));await probe('details open');
  await p.$eval('#rd-spine tr[data-go="rd-ppo"]',e=>e.click());await sleep(200);await probe('spine click');await shot('#rd-spine','spine');
  // baseline explorer
  for(const v of [-20,0,30,80])for(const l of [-30,0,20,30]){await slide('rd-bxB',v);await slide('rd-bxL',l);await probe('bx '+v+' '+l)}
  await slide('rd-bxB',30);await slide('rd-bxL',20);await shot('#rd-bx','bx');
  // baseline animation
  for(const o of [0,10,20])for(const sd of ['5','8']){await slide('rd-pgO',o);await pick('rd-pgS',sd);await walk('rd-pgC','pg o'+o+' s'+sd)}
  await slide('rd-pgO',10);await pick('rd-pgS','5');await slide('rd-pgC-s',4);await shot('#rd-pgc','pg');
  await click('#rd-pgC-p');await sleep(900);await click('#rd-pgC-p');await click('#rd-pgC-f');await click('#rd-pgC-b');await pick('rd-pgC-v','2');await probe('pg transport');
  // GAE
  for(const pr of ['ex','long']){await click('#rd-gaM button[data-p="'+pr+'"]');for(const l of [0,50,95,100])for(const g of [80,99,100])for(const e of [-50,0,50]){await slide('rd-gaL',l);await slide('rd-gaG',g);await slide('rd-gaE',e);if(!quick||l===95)await probe('gae '+pr+' '+l+' '+g+' '+e)}await walk('rd-gaC','gae '+pr)}
  await click('#rd-gaM button[data-p="ex"]');await slide('rd-gaC-s',3);await shot('#rd-ga','gae');
  // clip vs ratio
  for(const r of [0,70,100,150,250])for(const e of [5,20,50]){await slide('rd-clR',r);await slide('rd-clE',e);await probe('cl '+r+' '+e)}
  await slide('rd-clR',70);await slide('rd-clE',20);await shot('#rd-cl','cl');
  // PPO epochs
  for(const a of ['1','-1']){await click('#rd-ppM button[data-a="'+a+'"]');for(const e of [5,20,50])for(const h of [5,20,60]){await slide('rd-ppE',e);await slide('rd-ppH',h);await walk('rd-ppC','pp '+a+' '+e+' '+h)}}
  await click('#rd-ppM button[data-a="1"]');await slide('rd-ppE',20);await slide('rd-ppH',60);await slide('rd-ppC-s',3);await shot('#rd-pp','pp');
  // SAC
  await p.$eval('#rd-sa',e=>e.scrollIntoView());await sleep(1200);
  for(const v of [0,44,100,130,150,200]){await slide('rd-saA',v);await probe('sac '+v)}
  await click('#rd-saB');await probe('sac auto');await slide('rd-saA',87);await shot('#rd-sa','sac');
  // ---------------- Short corridor (sections 4 and 5 of Reading since 2026-10-24) ----------------
  await p.$eval('#co-fig',e=>e.scrollIntoView());await sleep(300);await probe('cor in view');
  await p.waitForFunction(()=>document.getElementById('co-figS').textContent.startsWith('Seeds'),{timeout:300000,polling:300});await probe('cor curves');
  for(const sd of ['1','3']){await pick('co-exS',sd);await walk('co-exC','cor '+sd)}
  await pick('co-exS','1');await slide('co-exC-s',4);await shot('#co-ex','cor-ex');
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
{ // reduced motion: no stage or animation moves by itself
  const p=await b.newPage();await p.setViewport({width:1400,height:900});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.goto('file://'+page);await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});await p.goto('file://'+page);
  for(const id of await p.$$eval('#t-read .stg',xs=>xs.map(x=>x.id))){await p.$eval('#'+id,e=>e.scrollIntoView({block:'center'}));await sleep(1500);probes++;
    const r=await p.$eval('#'+id,e=>({f:+e.dataset.frames||0,st:e.querySelector('.stg-st').textContent,n:+e.querySelector('.stg-r').max+1}));
    if(r.f>0||r.st!=='step 1 of '+r.n){fails++;say('FAIL reduced motion',id,JSON.stringify(r))}}
  for(const [card,ctl] of [['rd-pgc','rd-pgC'],['co-ex','co-exC'],['rd-ga','rd-gaC'],['rd-pp','rd-ppC']]){await p.$eval('#'+card,e=>e.scrollIntoView({block:'center'}));await sleep(1500);probes++;
    const r=await p.evaluate(ctl=>({play:/Pause/.test(document.getElementById(ctl+'-p').textContent),i:+document.getElementById(ctl+'-s').value}),ctl);if(r.play||r.i!==0){fails++;say('FAIL reduced motion',card,JSON.stringify(r))}}
  await p.close()}
await b.close();say('probes',probes,'fails',fails);process.exit(fails?1:0);
