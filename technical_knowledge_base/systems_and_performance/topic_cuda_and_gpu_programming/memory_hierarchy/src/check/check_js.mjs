// The page's models (parts/24_js_model.js) against the Python reference (out/expected.json). Run from src/: node check/check_js.mjs
import fs from 'fs'; import vm from 'vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('parts/24_js_model.js', 'utf8'), ctx);
const M = ctx.window.MHM, E = JSON.parse(fs.readFileSync('out/expected.json', 'utf8'));
let bad = 0, n = 0;
for (const c of E.cases) {
  let got;
  if (c.kind === 'sectors') { const r = M.sectors(c.p); got = { nSec: r.nSec, fetched: r.fetched, used: r.used }; }
  else if (c.kind === 'banks') { const r = M.banks(c.p); got = { passes: r.passes, ideal: r.ideal }; }
  else { const r = M.pipeline(...c.p); got = { total: r.total, issue: r.issue, ce: r.ce }; }
  for (const k of Object.keys(c.exp)) { n++; if (JSON.stringify(got[k]) !== JSON.stringify(c.exp[k])) { bad++; if (bad < 5) console.log('MISMATCH', c.kind, JSON.stringify(c.p), k, got[k], c.exp[k]); } }
}
console.log(E.cases.length + ' cases, ' + n + ' values, ' + bad + ' mismatches');
process.exit(bad ? 1 : 0);
