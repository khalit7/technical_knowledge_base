// Exercises every control of ../index.html in headless Chrome and reports errors, NaN/undefined text and overflow.
// usage (from the repo root): node <page>/src/checks/page_check.mjs [width]
import { createRequire } from 'module';import path from 'path';import {fileURLToPath} from 'url';
const require=createRequire(path.resolve('html_utils/package.json'));const puppeteer=require('puppeteer');
const here=path.dirname(fileURLToPath(import.meta.url));const file=path.resolve(here,'../../index.html');
const width=+(process.argv[2]||920);
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.setViewport({width,height:900});await p.goto('file://'+file);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function wide(){return p.evaluate(()=>{const o=[];document.querySelectorAll('.tab:not([hidden]) *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>innerWidth+1&&!e.closest('.tw,.hmwrap,.nav,.tabs'))o.push(e.tagName+'.'+e.className+' '+Math.round(r.right))});return o.slice(0,8)})}
async function bad(){return p.evaluate(()=>{const t=document.querySelector('.tab:not([hidden])').innerText;const m=t.match(/.{0,40}(NaN(?!s)|undefined|Infinity|null).{0,20}/g);return m?m.slice(0,5):[]})}
async function clickAll(sel,steps){const n=await p.$$eval(sel,a=>a.length);for(let i=0;i<n;i++){await p.evaluate((s,i)=>document.querySelectorAll(s)[i].click(),sel,i);await wait(60);
  if(steps)for(let k=0;k<steps;k++){await p.evaluate(s=>{const c=document.querySelector(s);c&&c.click()},steps===true?'':steps);}
  const B=await bad();if(B.length)console.log('BAD after',sel,i,B)}}
// Reading tab
console.log('wide at load',await wide());
for(const ctl of ['sc-ctl','bn-ctl','pl-ctl']){
  const n=await p.$eval('#'+ctl+'-s',e=>+e.max);
  for(let k=0;k<=n;k++){await p.evaluate((c,k)=>{const s=document.getElementById(c+'-s');s.value=k;s.dispatchEvent(new Event('input'))},ctl,k);await wait(20)}
  const B=await bad();if(B.length)console.log('BAD',ctl,B)}
for(const sel of ['#sc-modes button','#bn-modes button','#ax-lay button','#ax-kind button','#pl-modes button']){
  const n=await p.$$eval(sel,a=>a.length);
  for(let i=0;i<n;i++){await p.evaluate((s,i)=>document.querySelectorAll(s)[i].click(),sel,i);await wait(30);
    for(const ctl of ['bn-ctl','pl-ctl','sc-ctl']){const mx=await p.$eval('#'+ctl+'-s',e=>+e.max);for(const k of [0,1,Math.floor(mx/2),mx]){await p.evaluate((c,k)=>{const s=document.getElementById(c+'-s');s.value=k;s.dispatchEvent(new Event('input'))},ctl,k)}}
    const B=await bad();if(B.length)console.log('BAD',sel,i,B);
    if(sel.startsWith('#ax-kind')){for(const id of ['#ax-out','#ax-chg','#ax-chg','#ax-in']){await p.click(id);}await p.evaluate(()=>{const c=document.querySelectorAll('#ax-t .c');c[c.length-1].click()})}}}
for(const L of ['6','24','48','12']){await p.select('#pl-L',L);await wait(50)}
for(const v of ['gpt2','xavier']){await p.select('#pl-init',v)}
for(const v of ['','pre','deep','none','post']){await p.select('#pl-cmp',v)}
for(const id of ['in-fi','in-fo','in-L']){for(const v of ['4','14','2','100','9','20']){await p.evaluate((id,v)=>{const e=document.getElementById(id);if(+v>=+e.min&&+v<=+e.max){e.value=v;e.dispatchEvent(new Event('input'))}},id,v)}}
await p.select('#in-act','lin');
console.log('reading bad',await bad(),'wide',await wide());
// Depth tab
await p.click('button[data-t=t-depth]');await wait(4000);
for(const sel of ['#dp-q button','#rm-q button','#rm-models button','#rm-models button']){const n=await p.$$eval(sel,a=>a.length);for(let i=0;i<n;i++){await p.evaluate((s,i)=>document.querySelectorAll(s)[i].click(),sel,i);await wait(30);const B=await bad();if(B.length)console.log('BAD',sel,i,B)}}
console.log('depth note:',await p.$eval('#dp-note',e=>e.innerText));
console.log('depth wide',await wide());
await p.click('button[data-t=t-more]');await wait(200);console.log('more wide',await wide());
const box=await p.evaluate(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''});
console.log('errors',errs,'errbox',box);
await b.close();
