// Reading tab: every derived number the prose prints equals recompute.py's out/expected.json.
// Since the 2026-10-24 rebuild the Reading tab has no simulators; the derived numbers are static text.
// Usage (repo root): node <this file> <index.html> <expected.json>
import fs from 'fs';
const html=fs.readFileSync(process.argv[2],'utf8');const X=JSON.parse(fs.readFileSync(process.argv[3]));
const a=html.indexOf('id="t-read"'),b=html.indexOf('id="t-sched"');
const txt=html.slice(a,b).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&times;/g,'×').replace(/&radic;/g,'√').replace(/\s+/g,' ');
let fail=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fail++};
const has=(s,m)=>ok(txt.includes(s),m+': "'+s+'"');
has('every 3.1 hours','Llama 3 MTBF '+X.llama3_mtbf_h.toFixed(2)+' h');
has(Math.round(X.mtbf_1000)+' h','1,000-GPU MTBF');
has(Math.round(X.mtbf_100000*60)+' min','100,000-GPU MTBF');
has(X.llama3_mtbf_h.toFixed(1)+' h × 16,384 / N','MTBF formula');
has('about '+X.ckpt_70B_TB.toFixed(2)+' TB','70B checkpoint');
has('about '+X.ckpt_405B_TB.toFixed(1)+' TB','405B checkpoint');
has('about '+Math.round(X.young_1000.tau_min)+' minutes between checkpoints and about '+Math.round(X.young_1000.lost*100)+'% loss','Young at 1,000 GPUs');
has('gives about '+Math.round(X.young_16384.tau_min)+' minutes for C = 1 minute','Young at 16,384 GPUs');
// bar widths of the MTBF figure follow the derived values
const w=[...html.slice(a,b).matchAll(/<span class="fill" style="width:([\d.]+)%/g)].slice(0,3).map(m=>+m[1]);
ok(Math.abs(w[1]-X.mtbf_16384/X.mtbf_1000*100)<0.2&&Math.abs(w[2]-X.mtbf_100000/X.mtbf_1000*100)<0.2,'MTBF bar widths '+w.join(', '));
console.log(fail?'FAILED '+fail:'all checks passed');process.exit(fail?1:0);
