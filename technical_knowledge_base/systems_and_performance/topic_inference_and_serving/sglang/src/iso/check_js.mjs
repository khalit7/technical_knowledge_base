// The page's JavaScript core (parts/22_js_sg_core.js) against the Python reference (out/iso.json):
// every per-request hit of every trace and capacity, and every scheduling result, must be identical.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {window: {}, Math, Map, Set, Array, Error, Infinity, console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', 'parts', '22_js_sg_core.js'), 'utf8'), ctx);
const SG = ctx.window.SG, ref = JSON.parse(fs.readFileSync(path.join(here, 'out', 'iso.json'), 'utf8'));
let bad = 0, n = 0;
for (const row of ref.cache) {
  const reqs = SG.getTrace(row.trace);
  for (const kind of ['radix', 'blocks']) {
    const r = SG.runCache(kind, reqs, row.cap); n++;
    const hits = r.reqs.map(x => x[1]);
    const same = JSON.stringify(hits) === JSON.stringify(row[kind].per_req) && r.reqs.reduce((s, x) => s + x[2], 0) === row[kind].evicted;
    if (!same) { bad++; console.log('MISMATCH cache', row.trace, row.cap, kind); }
    if (kind === 'radix' && r.cache.nodes !== row.radix.nodes) { bad++; console.log('MISMATCH nodes', row.trace, row.cap); }
  }
}
for (const [tr, pts] of Object.entries(ref.curve || {})) {
  const reqs = SG.getTrace(tr);
  for (const [cap, rh, bh] of pts) {
    n++; const a = SG.runCache('radix', reqs, cap).reqs.reduce((s, x) => s + x[1], 0), b = SG.runCache('blocks', reqs, cap).reqs.reduce((s, x) => s + x[1], 0);
    if (a !== rh || b !== bh) { bad++; console.log('MISMATCH curve', tr, cap, a, rh, b, bh); }
  }
}
for (const s of ref.sched) {
  const r = SG.schedRun(SG.ragTrace(8, 800, s.nq, 5), s.cap, s.policy, s.seed); n++;
  if (r.hit_tokens !== s.hit || r.rounds.length !== s.rounds) { bad++; console.log('MISMATCH sched', JSON.stringify(s), r.hit_tokens, r.rounds.length); }
}
console.log(bad ? `FAIL ${bad} of ${n}` : `OK ${n} runs identical`);
process.exit(bad ? 1 : 0);
