// Exercises every control and preset of the Training lab in headless Chrome, at 390 px dark and 920 px light:
// no console errors, no NaN or undefined in the tab's text, no sideways scroll; screenshots in ../../.shots/lab-*.png.
// usage (from src/lab): node check_lab.mjs [quick]
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const quick=process.argv[2]==='quick';
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined,args:process.platform==='linux'?['--no-sandbox']:[]});
let fails=0;const say=(...a)=>console.log(...a);
for(const [scheme,width] of [['dark',390],['light',920]]){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page);await p.click('button[data-t=t-lab]');await new Promise(r=>setTimeout(r,300));
  const probe=async(what)=>{const r=await p.evaluate(()=>{const t=document.getElementById('t-lab').innerText;return{nan:/\bNaN\b/.test(t),und:/undefined/.test(t),side:document.documentElement.scrollWidth>innerWidth,box:(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''})()}});
    const bad=r.nan||r.und||r.side||r.box||errs.length;if(bad){fails++;say('FAIL',scheme,width,what,JSON.stringify(r),errs.splice(0))}return!bad};
  await probe('open');
  // presets: finish each, screenshot
  const ids=await p.$$eval('#lb-pre button',bs=>bs.map(b=>b.dataset.p).filter(Boolean));
  for(const id of ids){await p.click('#lb-pre button[data-p="'+id+'"]');await p.evaluate(()=>{window.LB_TEST.setPlay(false);window.LB_TEST.finish()});await new Promise(r=>setTimeout(r,60));
    await probe('preset '+id);
    if(!quick||id==='sigmoid'){const el=await p.$('#lb-s-run');await el.screenshot({path:path.join(shots,'lab-'+id+'-'+scheme+'-'+width+'.png')})}
    // scrub to a third of the way
    await p.evaluate(()=>{const s=document.getElementById('lb-scrub');s.value=String(Math.round(+s.max/3));s.dispatchEvent(new Event('input'))});await probe('scrub '+id)}
  // play, pause, step, restart, speed
  await p.click('#lb-pre button[data-p="zeros"]');await p.evaluate(()=>window.LB_TEST.setPlay(false));
  for(const sp of ['1','2','3']){await p.select('#lb-speed',sp);await p.click('#lb-play');await new Promise(r=>setTimeout(r,400));await p.click('#lb-play');await probe('play speed '+sp)}
  await p.click('#lb-step');await p.click('#lb-step');await probe('step');await p.click('#lb-reset');await probe('reset');
  for(const bt of ['#lb-copyab','#lb-swap','#lb-copyba']){await p.click(bt);await probe(bt)}
  // every option of every control, for A and B and the shared ones; a few steps after each
  if(!quick||scheme==='dark'){
    const sels=await p.$$eval('#lb-ctl select,#lb-sh select',ss=>ss.map(s=>({id:s.id,n:s.options.length})));let tried=0;
    for(const s of sels){for(let i=0;i<s.n;i++){await p.evaluate((id,i)=>{const e=document.getElementById(id);if(e.disabled)return;e.value=String(i);e.dispatchEvent(new Event('change'))},s.id,i);
        await p.evaluate(()=>{for(let k=0;k<3;k++)document.getElementById('lb-step').click()});tried++;await probe(s.id+'='+i)}
      // back to the first preset's value for the next control, so combinations stay sane
      await p.click('#lb-pre button[data-p="zeros"]');await p.evaluate(()=>window.LB_TEST.setPlay(false))}
    say(scheme,width,'controls tried',tried)}
  // the ten-seed check on one preset
  if(scheme==='dark'){await p.click('#lb-pre button[data-p="zeros"]');await p.evaluate(()=>window.LB_TEST.setPlay(false));await p.click('#lb-seedgo');
    await p.waitForFunction(()=>!document.getElementById('lb-seedgo').disabled,{timeout:300000});
    const res=await p.$eval('#lb-seeds',e=>e.innerText);if(!/10 of 10 seeds \(as stated\)/.test(res)){fails++;say('FAIL seeds',res.slice(-300))}else say('seed check: zeros as stated');await probe('seeds');
    const el=await p.$('#lb-s-seeds');await el.screenshot({path:path.join(shots,'lab-seeds-'+scheme+'-'+width+'.png')})}
  const tabEl=await p.$('#t-lab');await tabEl.screenshot({path:path.join(shots,'lab-full-'+scheme+'-'+width+'.png')});
  await p.close()}
await b.close();say(fails?'check_lab: '+fails+' failures':'check_lab: pass');process.exit(fails?1:0);
