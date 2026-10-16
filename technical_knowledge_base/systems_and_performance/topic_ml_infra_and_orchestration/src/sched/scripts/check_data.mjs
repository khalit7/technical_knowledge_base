// Confirm the built page embeds exactly the recorded data (out/sc_data.json) and that numbers written in the prose
// match the data. Usage (repo root): node <this file> <index.html>
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(process.argv[2],'utf8');
const want=JSON.parse(fs.readFileSync(path.join(here,'../out/sc_data.json'),'utf8'));
const m=html.match(/window\.SC_DATA=(\{.*?\});\n/s);
let fail=0;const ok=(c,s)=>{console.log((c?'ok   ':'FAIL ')+s);if(!c)fail++};
ok(!!m,'SC_DATA present');
const got=JSON.parse(m[1]);
const srt=o=>o&&typeof o==='object'&&!Array.isArray(o)?Object.fromEntries(Object.keys(o).sort().map(k=>[k,srt(o[k])])):Array.isArray(o)?o.map(srt):o;
ok(JSON.stringify(srt(got))===JSON.stringify(srt(want)),'embedded data == out/sc_data.json');
// raw files -> data: sacct start times of a few jobs
const raw=fs.readFileSync(path.join(here,'../runs/slurm/w1_backfill.sacct'),'utf8');
const t=s=>Date.parse(s+'Z')/1000;const rows=raw.trim().split('\n').slice(1).map(l=>l.split('|'));
const t0=Math.min(...rows.map(r=>t(r[7])));
for(const r of rows){const n=r[1].slice(-1);const j=got.w1.backfill.find(x=>x.n===n);ok(j&&j.st===t(r[8])-t0,'w1 backfill '+n+' start '+(t(r[8])-t0)+' s')}
// prose numbers fixed in the HTML against the data
const prose=[['alice 5408',/alice 5408, carol and bob 0/],['10065',/\b10065\b/],['bob 74',/had used 74 units/],['job 39 requeued 41 s',/PREEMPTED<\/code> after 41 s/]];
for(const [k,re] of prose)ok(re.test(html),'prose: '+k);
ok(got.w3al[0].en===41,'data: preempted run lasted 41 s');
const w2=got.w2;const first=w2.filter(j=>j.name!=='sc-fs-hist').sort((a,b)=>a.st-b.st).slice(0,3).map(j=>j.name);
ok(first.join()==='sc-fs-b1,sc-fs-b2,sc-fs-b3','w2: first wave is b1,b2,b3 ('+first+')');
if(got.k1){ok(/insufficient unused quota/.test(html),'k8s: Kueue message quoted')}
console.log(fail?'FAILED '+fail:'ALL OK');process.exit(fail?1:0);
