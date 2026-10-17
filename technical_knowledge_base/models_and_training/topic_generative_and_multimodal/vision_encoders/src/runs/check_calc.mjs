// The page's JavaScript against recompute.py (transformers' own resizing functions and the MACs formula).
// Usage: node check_calc.mjs   (after recompute.py and build.sh)
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../../../html_utils/package.json'));
const puppeteer=require('puppeteer');
const ref=JSON.parse(fs.readFileSync(path.resolve(here,'../out/recompute.json'),'utf8'));
const b=await puppeteer.launch({headless:'shell'});const p=await b.newPage();
await p.goto('file://'+path.resolve(here,'../../index.html'));
const r=await p.evaluate(ref=>{const bad=[];let n=0;
  for(const [h,w,mp,exp] of ref.naflex){n++;const got=VEcalc.naflex(h,w,16,mp);if(got[0]!==exp[0]||got[1]!==exp[1])bad.push(['naflex',h,w,mp,exp,got])}
  for(const [h,w,exp] of ref.smart){n++;const got=VEcalc.smart(h,w,28,3136,12845056);if(JSON.stringify(got)!==JSON.stringify(exp))bad.push(['smart',h,w,exp,got])}
  for(const [a,exp] of ref.macs){n++;const got=VEU.macs(a[0],a[1],a[2],a[3],a[4],a[5],a[6]);if(got.total!==exp.total||got.scores!==exp.scores)bad.push(['macs',a,exp.total,got.total])}
  return {n,bad}},ref);
console.log('checked',r.n,'cases; mismatches',r.bad.length,JSON.stringify(r.bad.slice(0,5)));
await b.close();
