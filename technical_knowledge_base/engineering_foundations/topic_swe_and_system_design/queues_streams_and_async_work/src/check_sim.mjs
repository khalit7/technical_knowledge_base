// Runs the page's own JS (parts/22_js_qsim.js, parts/24_js_rd_part.js) in node and compares with recompute_out.json (Python mirror).
// Run from src/: python3 recompute.py && node check_sim.mjs
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('recompute_out.json', 'utf8'));
globalThis.window = globalThis; globalThis.document = { getElementById: () => null };
eval(fs.readFileSync('parts/22_js_qsim.js', 'utf8'));
eval(fs.readFileSync('parts/24_js_rd_part.js', 'utf8'));
let bad = 0;
const vec = { '21': -973932308, 'foobar': -790332482, 'a-little-bit-long-string': -985981536, 'a-little-bit-longer-string': -1486304829, 'lkjh234lh9fiuh90y23oiuhsafujhadof229phr9h19h89h8': -58897971, 'abc': 479470107 };
for (const [k, v] of Object.entries(vec)) if (window.KMURMUR(k) !== v) { bad++; console.log('murmur2 mismatch', k) }
for (const [u, ps] of Object.entries(R.partitions)) for (const [P, part] of Object.entries(ps)) if (((window.KMURMUR(u) & 0x7fffffff) % +P) !== part) { bad++; console.log('partition mismatch', u, P) }
const keys = ['admitted', 'completed', 'rejected', 'redeliveries', 'duplicates', 'dedup', 'dlq', 'crashes', 'left', 'effects', 'L', 'X', 'Wmean', 'maxAge'];
for (const [name, v] of Object.entries(R.qsim)) {
  const js = window.QSIM.run(v.params).st;
  for (const k of keys) { const a = js[k], b = v.st[k]; if (Math.abs(a - b) > 1e-4 * Math.max(1, Math.abs(b))) { bad++; console.log(name, k, 'js', a, 'py', b) } }
}
console.log(bad ? 'MISMATCHES ' + bad : 'JS simulator and murmur2 match recompute.py exactly (' + Object.keys(R.qsim).length + ' presets, 6 Kafka test vectors)');
process.exit(bad ? 1 : 0);
