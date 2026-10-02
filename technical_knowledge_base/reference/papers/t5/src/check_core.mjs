// Check the page's JS port of T5's preprocessing (parts/12_js_t5core.js) against its stated invariants and against recompute.py.
// usage (from the repo root): node technical_knowledge_base/reference/papers/t5/src/check_core.mjs
// Writes inputs/check_core.json.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
global.mulberry32 = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } };
const T5 = require(path.join(here, 'parts', '12_js_t5core.js'));
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs', 'recompute.json')));
const pyRound = x => { const f = Math.floor(x), d = x - f; if (Math.abs(d - .5) < 1e-9) return f % 2 === 0 ? f : f + 1; return Math.round(x) };
let masks = 0, bad = [], outside = 0;
// 1. random_spans_noise_mask: exact noise count, exact span count, starts clean, ends noisy, alternates
for (const n of [2, 3, 5, 11, 50, 128, 512, 568]) for (const d of [0.05, 0.1, 0.15, 0.25, 0.5]) for (const s of [1, 2, 3, 5, 10]) for (let seed = 1; seed <= 20; seed++) {
  let nn = Math.min(Math.max(pyRound(n * d), 1), n - 1), ns = Math.max(pyRound(nn / s), 1);
  if (n - nn < ns) { outside++; continue } // fewer clean tokens than spans: TensorFlow's stack would fail, outside the function's domain
  const m = T5.spanMask(n, d, s, mulberry32(seed)); masks++;
  const cnt = m.filter(Boolean).length, runs = m.filter((x, i) => x && (i === 0 || !m[i - 1])).length;
  if (m.length !== n || cnt !== nn || runs !== Math.min(ns, nn) || m[0] || !m[n - 1]) bad.push({ n, d, s, seed, cnt, nn, runs, ns });
}
// 2. every partition equally likely: n = 6 tokens, 2 noise tokens in 1 or 2 spans; count distinct masks over 20,000 seeds
const freq = {}; for (let seed = 1; seed <= 20000; seed++) { const k = T5.spanMask(8, 0.25, 1, mulberry32(seed)).map(x => +x).join(''); freq[k] = (freq[k] || 0) + 1 }
const fv = Object.values(freq), uni = { patterns: fv.length, min: Math.min(...fv), max: Math.max(...fv) };
// 3. lengths against recompute.py's port of random_spans_helper and the per-512 counts
let hl = 0, hok = 0; for (const k of Object.keys(RC.spans)) { const [d, s] = k.split('_').map(Number), a = T5.helper(512, d, s), b = RC.spans[k]; hl++; if (a.raw === b.raw && a.inputs === b.inputs && a.targets === b.targets) hok++; else bad.push({ helper: k, a, b }) }
for (const k of Object.keys(RC.spans_per512)) { const [d, s] = k.split('_').map(Number), a = T5.lenSpans(512, d, s), b = RC.spans_per512[k]; hl++; if (a.inp === b.inputs && a.tgt === b.targets) hok++; else bad.push({ per512: k, a, b }) }
const li = T5.lenIid(512, .15), pi = RC.iid['0.15']; const iidOk = Math.abs(li.tgt - pi.targets_replace) < 1e-9 && Math.abs(li.inp - pi.inputs_replace) < 1e-9;
// 4. i.i.d. expected lengths against simulation (200,000 masks of 512)
let st = 0, si = 0; const N = 20000; for (let seed = 1; seed <= N; seed++) { const r = mulberry32(seed), m = T5.iidMask(512, .15, r); const a = T5.sentinelize(m.map((_, i) => 't' + i), m), b = T5.sentinelize(m.map((_, i) => 't' + i), m.map(x => !x)); si += a.out.length + 1; st += b.out.length + 1 }
const sim = { inputs: si / N, targets: st / N, formula: li };
// 5. buckets against recompute.py
let bk = 0, bok = 0; for (const [k, v] of Object.entries(RC.buckets.enc)) { bk++; if (T5.bucket(+k, true) === v) bok++ } for (const [k, v] of Object.entries(RC.buckets.dec)) { bk++; if (T5.bucket(+k, false) === v) bok++ }
// 6. Figure 2 from its mask
const tok = 'Thank you for inviting me to your party last week .'.split(' '), fm = [0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0].map(Boolean);
const fi = T5.sentinelize(tok, fm).out.map(x => x.s || x.t).join(' '), ft = T5.targetsFromSpans(tok, fm).map(x => x.s || x.t).join(' ');
const fig2 = fi === 'Thank you <X> me to your party <Y> week .' && ft === '<X> for inviting <Y> last <Z>';
const out = { masks, outside_domain: outside, mask_failures: bad.filter(x => x.n).length, uniform: uni, helper: `${hok} of ${hl}`, iid_formula_vs_python: iidOk, iid_simulated: sim, buckets: `${bok} of ${bk}`, fig2, bad: bad.slice(0, 5) };
fs.writeFileSync(path.join(here, 'inputs', 'check_core.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
const pass = !bad.length && iidOk && bok === bk && fig2 && Math.abs(sim.targets - li.tgt) < 0.5 && Math.abs(sim.inputs - li.inp) < 0.5 && uni.max / uni.min < 1.15;
console.log(pass ? 'PASS' : 'FAIL'); process.exit(pass ? 0 : 1);
