// Clicks every control of the Saturation timeline tab at 390 px dark and 920 px light; reports errors, NaN/undefined text and sideways scroll; saves screenshots to ../../.shots/sat-*.png
import {createRequire} from 'module'; import path from 'path'; import {fileURLToPath} from 'url';
const H=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.join(H,'../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const file='file://'+path.resolve(H,'../../index.html'), shots=path.resolve(H,'../../.shots');
const b=await puppeteer.launch({headless:'shell'});
let total=0;
for(const [scheme,w] of [['dark',390],['light',920]]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width:w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto(file);await p.click('button[data-t=t-sat]');await new Promise(r=>setTimeout(r,400));
  const bad=[];const check=async(lbl)=>{const r=await p.evaluate(()=>{const t=document.getElementById('t-sat').innerText;return {nan:/NaN|undefined|Infinity|\[object/.test(t),sw:document.documentElement.scrollWidth>innerWidth,box:!document.getElementById('jsErr').hidden}});if(r.nan||r.sw||r.box)bad.push(lbl+JSON.stringify(r))};
  await p.screenshot({path:`${shots}/sat-${scheme}-${w}-full.png`,fullPage:true});
  await check('initial');
  const sel=['#sa-f button','#sa-mode button','#sa-smx button','#sa-sort button','#sa-amode button'];
  for(const s of sel){const n=await p.$$(s);for(const e of n){await e.click();await new Promise(r=>setTimeout(r,60));await check(s)}}
  for(const s of ['#sa-chance','#sa-ind']){await p.click(s);await check(s);await p.click(s);await check(s)}
  // every benchmark chip, and every point of each
  const chips=await p.$$('#sa-chips button');
  for(let i=0;i<chips.length;i++){const c=(await p.$$('#sa-chips button'))[i];await c.click();await new Promise(r=>setTimeout(r,30));
    const pts=await p.$$('#sa-chart [data-s]');for(const q of pts){await q.click()}await check('chip'+i)}
  const pans=await p.$$('#sa-sm .sa-pn');await pans[3].click();await check('panel');
  for(const q of await p.$$('#sa-trend [data-i]'))await q.click();await check('trend');
  // animation: both modes, step, scrub to end, play briefly
  for(const m of await p.$$('#sa-amode button')){await m.click();await p.click('#sa-fwd');await p.click('#sa-back');
    await p.$eval('#sa-scrub',e=>{e.value=e.max;e.dispatchEvent(new Event('input'))});await check('scrub');
    await p.$eval('#sa-scrub',e=>{e.value=Math.floor(e.max/2);e.dispatchEvent(new Event('input'))});
    await p.evaluate(()=>document.getElementById('sa-anim').scrollIntoView());await p.click('#sa-play');await new Promise(r=>setTimeout(r,900));await p.click('#sa-play');await check('play')}
  await p.select('#sa-speed','4');
  await p.evaluate(()=>{document.querySelector('#sa-f button[data-v="0.9"]').click();document.querySelector('#sa-amode button[data-v="cal"]').click()});
  await p.evaluate(()=>window.scrollTo(0,0));
  await p.screenshot({path:`${shots}/sat-${scheme}-${w}-end.png`,fullPage:true});
  console.log(scheme,w,'errors',errs,'bad',bad.length,bad.slice(0,5));total+=errs.length+bad.length;await p.close()}
await b.close();console.log(total?'UI CHECK FAILED':'UI check ok');process.exit(total?1:0);
