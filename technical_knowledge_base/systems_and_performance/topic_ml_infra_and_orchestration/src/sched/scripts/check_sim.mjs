// Compare the page's simulator (parts/31_js_sc_2sim.js) with sim.py's output (out/sim_w1.json). run: node check_sim.mjs
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
globalThis.window={};
new Function(fs.readFileSync(path.join(here,'../../parts/31_js_sc_2sim.js'),'utf8'))();
const S=window.SC_SIM;const py=JSON.parse(fs.readFileSync(path.join(here,'../out/sim_w1.json'),'utf8'));
const W1=[['A',4,6],['B',6,4],['C',2,3],['D',1,2],['E',4,5],['F',2,7],['G',1,1],['H',3,2]];
const w1=()=>W1.map(([n,s,r])=>({name:n,size:s,run:r,limit:r,submit:0}));
let bad=0;const eq=(a,b,what)=>{const srt=o=>o&&typeof o==="object"&&!Array.isArray(o)?Object.fromEntries(Object.keys(o).sort().map(k=>[k,srt(o[k])])):Array.isArray(o)?o.map(srt):o;const A=JSON.stringify(srt(a)),B=JSON.stringify(srt(b));if(A!==B){bad++;console.log('DIFF',what,A,B)}};
for(const pol of ['fifo','easy','conservative']){const r=S.simulate(w1(),8,pol);eq(r.m,py['w1_'+pol].m,'w1 '+pol);
  for(const k in r.sched)eq(r.sched[k],py['w1_'+pol].sched[k],'w1 '+pol+' '+k)}
for(const pad of [1,3]){const jobs=S.genWorkload(256,300,0.9,pad,7);
  for(const pol of ['fifo','easy','conservative']){const key='scale_pad'+(pad===1?'1':'3')+'_'+pol;const r=S.simulate(jobs,256,pol);
    eq(r.m,py[key].m,key);eq([jobs[0],jobs[1]].map(j=>[j.name,j.size,j.run,j.limit,j.submit]),py[key].first.map(j=>[j.name,j.size,j.run,j.limit,j.submit]),key+' gen');eq(r.sched.j17,py[key].j17,key+' j17')}}
eq(S.simulateNodes(w1(),2,4),py.w1_slurmlike,'w1 slurm-like');
console.log(bad?('FAIL '+bad):'OK: page simulator == sim.py on every compared value');process.exit(bad?1:0);
