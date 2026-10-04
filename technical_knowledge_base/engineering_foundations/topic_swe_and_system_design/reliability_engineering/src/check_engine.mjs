// Runs the page's engine (parts/22_js_engine.js) on every input in recompute_out.json and compares every number.
import fs from 'fs';
const here=new URL('.',import.meta.url).pathname;
globalThis.window={};(0,eval)(fs.readFileSync(here+'parts/22_js_engine.js','utf8'));
const RE=window.RE,R=JSON.parse(fs.readFileSync(here+'recompute_out.json','utf8'));
let n=0,bad=0;
function cmp(a,b,path){if(a===null||b===null||typeof a!=='object'){n++;const ok=(a===b)||(typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a)));if(!ok){bad++;if(bad<15)console.log('DIFF',path,a,b)}return}
  for(const k of Object.keys(b))cmp(a[k],b[k],path+'.'+k)}
for(const k of Object.keys(R.presets)){cmp(JSON.parse(JSON.stringify(RE.P[k])),R.presets[k],'preset '+k);const r=RE.sim(RE.P[k]);cmp({S:r.S,tot:r.tot},R.engine[k],'engine '+k)}
R.random.forEach((x,i)=>{const r=RE.sim(x.cfg);cmp({S:r.S,tot:r.tot},x.res,'random '+i)});
// small calculators and the rate limiter and SLO tabs
for(const f of ['24_js_rd_static.js','26_js_rd_rl.js','32_js_slo.js']){(0,eval)(fs.readFileSync(here+'parts/'+f,'utf8').replace(/\n\(function\(\)\{[\s\S]*$/,''))}
cmp(window.RCALC.nines(),R.nines,'nines');cmp(window.RCALC.chain(),R.chain,'chain');cmp(window.RCALC.burn(),R.burn,'burn');cmp(window.RCALC.fanout(),R.fanout,'fanout');
for(const a of Object.keys(R.rl)){const r=window.RLIM.run(a);cmp({accepted:r.accepted,rejected:r.rejected,busiest:r.busiest,maxWait:r.maxWait},R.rl[a],'rl '+a)}
R.slo.forEach((x,i)=>{const r=window.SLOC.run(...x.in);cmp(r,x.res,'slo '+i)});
console.log('compared',n,'numbers, differences',bad);process.exit(bad?1:0);
