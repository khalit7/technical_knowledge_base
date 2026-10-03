// Check the in-page replay (parts/22_js_replay.js) against replay.py on every shipped trace.
// usage (from src/): node check_replay.mjs [sample dir]   -> writes inputs/check_replay.json
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
globalThis.window = {};
new Function('window', fs.readFileSync('parts/21_traces.js', 'utf8'))(globalThis.window);
const RP = require('./parts/22_js_replay.js');
const exp = JSON.parse(fs.readFileSync('inputs/replay_expected.json', 'utf8'));
let bad = 0, nev = 0;
const S = o => JSON.stringify(o);
window.TRACES.forEach((C, i) => {
  const j = RP.run(C), p = exp[i];
  const cmp = (k, a, b) => { if (S(a) !== S(b)) { bad++; console.log('trace', i, k, S(a).slice(0, 200), '!=', S(b).slice(0, 200)); } };
  cmp('events', j.events, p.events); nev += j.events.length;
  cmp('E0', Object.fromEntries(Object.entries(j.E0).map(([k, v]) => [k, [v.lines, v.cut, v.full, v.t]])), Object.fromEntries(Object.entries(p.E0).map(([k, v]) => [k, [v.lines, v.cut, v.full, v.t]])));
  cmp('final', Object.keys(j.final).sort(), Object.keys(p.final).sort());
  cmp('created', j.created, p.created);
  for (const k of ['known_only', 'held', 'e0_files', 'e0_lines', 'end_files', 'end_lines', 'turns', 'seed']) cmp(k, j[k], p[k]);
});
const res = { traces: window.TRACES.length, events: nev, mismatches: bad, ok: bad === 0 };
if (process.argv[2]) { // the whole sample: node check_replay.mjs <sample dir> (after replay.py <sample dir>)
  const C = JSON.parse(fs.readFileSync(process.argv[2] + '/allC.json', 'utf8')), R = JSON.parse(fs.readFileSync(process.argv[2] + '/allR.json', 'utf8'));
  let b2 = 0, e2 = 0;
  C.forEach((c, i) => { const j = RP.run(c); e2 += j.events.length; for (const k of Object.keys(R[i])) if (S(j[k]) !== S(R[i][k])) b2++; });
  Object.assign(res, { sample_traces: C.length, sample_events: e2, sample_mismatching_fields: b2 });
}
if (!process.argv[2] && fs.existsSync('inputs/check_replay.json')) { // keep the last whole-sample result (the sample is not in the repo)
  const old = JSON.parse(fs.readFileSync('inputs/check_replay.json', 'utf8'));
  for (const k of ['sample_traces', 'sample_events', 'sample_mismatching_fields']) if (k in old) res[k] = old[k];
}
fs.writeFileSync('inputs/check_replay.json', JSON.stringify(res) + '\n');
console.log(res);
