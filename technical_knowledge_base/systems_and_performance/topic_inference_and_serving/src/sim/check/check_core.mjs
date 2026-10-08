// Runs parts/31_js_sim_0core.js on every case in the reference dump from dump_ref.py
// and requires the same requests, the same step log (rows, preemptions, step times,
// KV maps) and the same metrics. Run: node check_core.mjs <ref.json>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(here, '../../parts/31_js_sim_0core.js'), 'utf8'));
const S = globalThis.ISIM;
const ref = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0, steps = 0;
const close = (a, b) => a === b || Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return close(a, b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === 'object') { const ka = Object.keys(a).sort(), kb = Object.keys(b).sort(); return same(ka, kb) && ka.every(k => same(a[k], b[k])); }
  return a === b;
}
for (const c of ref) {
  const r = S.run(c.cfg, true);
  const mt = S.metrics(r.reqs, r.engs, c.cfg.slo);
  const reqs = r.reqs.map(q => [q.id, q.arr, q.P, q.O, q.first, q.done, q.npre, q.hit]);
  let msg = [];
  if (!same(reqs, c.reqs)) msg.push('requests');
  if (r.log.length !== c.log.length) msg.push('steps ' + r.log.length + ' vs ' + c.log.length);
  else for (let i = 0; i < r.log.length; i++) if (!same(r.log[i], c.log[i])) { msg.push('step ' + i); break; }
  if (!same(mt, c.metrics)) msg.push('metrics');
  steps += c.log.length;
  if (msg.length) bad++;
  console.log((msg.length ? 'FAIL ' : 'ok   ') + c.name + ' (' + c.log.length + ' steps) ' + msg.join(', '));
}
console.log(`cases ${ref.length}, steps ${steps}, failures ${bad}`);
process.exit(bad ? 1 : 0);
