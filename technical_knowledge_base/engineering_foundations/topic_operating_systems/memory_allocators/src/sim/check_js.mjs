// Runs the page's caching-allocator model (../parts/32_js_cache_core.js) on every case in cases.json and
// compares each step (ok, stats, block layout) with the Python reference (cache_ref.py). Usage: node check_js.mjs
import fs from 'fs'; import {execFileSync} from 'child_process';
const src = fs.readFileSync(new URL('../parts/32_js_cache_core.js', import.meta.url), 'utf8');
new Function(src)();
const ref = JSON.parse(execFileSync('python3', ['cache_ref.py', 'cases.json'], {maxBuffer: 1 << 28}).toString());
const cases = JSON.parse(fs.readFileSync('cases.json', 'utf8'));
let bad = 0, steps = 0;
for (const [name, c] of Object.entries(cases)) {
  const js = globalThis.CACHESIM.run(c.ops, c.cfg), py = ref[name];
  if (js.length !== py.length) { bad++; console.log('length', name, js.length, py.length); continue; }
  for (let i = 0; i < js.length; i++) { steps++;
    const a = JSON.stringify([js[i].ok, js[i].stats, js[i].layout]), b = JSON.stringify([py[i].ok, py[i].stats, py[i].layout]);
    if (a !== b) { bad++; console.log('mismatch', name, 'step', i); console.log(' js', a.slice(0, 300)); console.log(' py', b.slice(0, 300)); break; }
  }
}
console.log(`cases ${Object.keys(cases).length}, steps compared ${steps}, mismatching cases ${bad}`);
