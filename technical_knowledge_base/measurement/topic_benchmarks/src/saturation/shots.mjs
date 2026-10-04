// Section screenshots of the Saturation timeline tab: node shots.mjs [dark|light] [width] [benchmark id]
import {createRequire} from 'module'; import path from 'path'; import {fileURLToPath} from 'url';
const H=path.dirname(fileURLToPath(import.meta.url));const require=createRequire(path.join(H,'../../../../../html_utils/package.json'));const puppeteer=require('puppeteer');
const [scheme='light',w='920',sel='tbs',frame='']=process.argv.slice(2);const shots=path.resolve(H,'../../.shots');
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();await p.setViewport({width:+w,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
await p.goto('file://'+path.resolve(H,'../../index.html'));await p.click('button[data-t=t-sat]');await new Promise(r=>setTimeout(r,300));
await p.click(`#sa-chips button[data-b="${sel}"]`);
if(frame){const [m,i]=frame.split(':');await p.click(`#sa-amode button[data-v="${m}"]`);await p.$eval('#sa-scrub',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input'))},i)}
const parts={top:['#sa-stats','#sa-verdict','.sa-card'],sm:['#sa-sm'],det:['#sa-dhead','#sa-chart','#sa-leg','#sa-pt'],bars:['#sa-bars'],trend:['#sa-trend','#sa-era'],anim:['.sa-player','#sa-actr','#sa-acap','#sa-anim'],tabs:['#sa-tbs','#sa-chains']};
for(const [k,ss] of Object.entries(parts)){const r=await p.evaluate(ss=>{let t=1e9,bt=0,l=1e9,rr=0;ss.forEach(s=>{const e=document.querySelector(s);const q=e.getBoundingClientRect();t=Math.min(t,q.top+scrollY);bt=Math.max(bt,q.bottom+scrollY);l=Math.min(l,q.left);rr=Math.max(rr,q.right)});return {x:Math.max(0,l-4),y:t-4,width:Math.min(innerWidth,rr+4)-Math.max(0,l-4),height:bt-t+8}},ss);
  await p.screenshot({path:`${shots}/sat-${k}-${scheme}-${w}.png`,clip:r,captureBeyondViewport:true})}
await b.close();
