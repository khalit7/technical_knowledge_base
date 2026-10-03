// Compare the page's JS (layout calculator core and the animation's numbers) with recompute.json. Run from src/: node check_calc.mjs
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('recompute.json','utf8'));
globalThis.window=globalThis;globalThis.document={getElementById:()=>null};
eval(fs.readFileSync('parts/30_js_calc_core.js','utf8'));
eval(fs.readFileSync('parts/22_js_anim.js','utf8').split('(function(){\n  const $=id')[0]);
let bad=0;const close=(a,b,tag)=>{const ok=Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(b));if(!ok){bad++;console.log('MISMATCH',tag,a,b)}};
for(const [k,p] of Object.entries(window.LAY.PRESETS)){const j=window.LAY.layout(p),py=R.presets[k];
  for(const f of ['N','states','A','total','tokens','t_comp'])close(j[f],py[f],k+'.'+f);
  for(const a of ['DP','TP','CP','PP','EP']){close(j.comm[a],py.comm[a],k+'.comm.'+a);close(j.t[a],py.t[a],k+'.t.'+a);if(j.link[a]!==py.link[a]){bad++;console.log('LINK',k,a)}}}
const A=window.ANIM,GB=1e9;
for(const m of ['DP','ZeRO-1','ZeRO-2','ZeRO-3','HSDP','TP','PP','CP','EP']){const N=A.numbers(m,4);close(N.states/GB,R.anim.states[m],'anim.states.'+m);
  const key=m==='HSDP'?null:m;if(key)close((N.nv+N.ib)/GB,R.anim.sent[key],'anim.sent.'+m);else{close(N.nv/GB,R.anim.sent.HSDP_nv,'hsdp nv');close(N.ib/GB,R.anim.sent.HSDP_ib,'hsdp ib')}
  close(Math.max(...N.A)/GB,R.anim.seq_acts,'anim.acts.'+m)}
close(A.numbers('EP',1).nv/GB,R.anim.sent_long.EP,'ep long sent');close(A.numbers('PP',1).nv/GB,R.anim.sent_long.PP,'pp long sent');
close(A.numbers('EP',1).A[0]/GB,R.anim.ep_long_gpu0_acts,'ep long acts');close(A.numbers('DP',1).A[0]/GB,R.anim.long.acts/GB,'dp long acts');
console.log(bad?bad+' mismatches':'all match: '+Object.keys(window.LAY.PRESETS).length+' presets, 9 animation modes, long-sequence checks');
