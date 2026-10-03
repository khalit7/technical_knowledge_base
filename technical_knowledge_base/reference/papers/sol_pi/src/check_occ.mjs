// Check the page's port of Online Context Compact's gate (parts/14_js_occ.js) against the released TypeScript
// (inputs/economics.ts, copied from github.com/NVlabs/SoL-Pi on 2026-10-03) on random inputs, including the edge cases
// (no history, zero ratio, first and later compactions, cooldown, window pressure). Writes inputs/check_occ.json.
// usage (from this folder): node --experimental-strip-types check_occ.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const port = require('./parts/14_js_occ.js');
const ts = await import('./inputs/economics.ts');
let s = 12345; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 };
const pick = a => a[Math.floor(r() * a.length)];
const N = 50000; let same = 0; const diff = []; const reasons = {};
for (let k = 0; k < N; k++) {
  const ctx = Math.floor(r() * 260000);
  const arch = Math.floor(r() * ctx);
  const nb = pick([null, 0, 1, 2, 3, 5, 8]);
  const counts = nb === null ? null : Array.from({ length: nb }, () => Math.floor(r() * 40));
  const prior = pick([0, 0, 1, 2, 4]);
  const inp = {
    writeTokens: ctx, archiveTokens: arch, memoTokens: pick([0, 1000, 5000]), contextTokens: ctx,
    completedBoundaryRequestCounts: counts, remainingBoundaries: Math.floor(r() * 8),
    averageContextTokenIncrement: pick([null, 0, Math.floor(r() * 6000) + 1]),
    contextWindowTokens: pick([null, 200000, 272000, 1000000]),
    priorCompactionCount: prior, requestsSinceLastCompaction: prior === 0 ? null : pick([0, 1, 2, 3, 10, undefined]),
    carriedDebtTokens: prior === 0 ? 0 : Math.floor(r() * 2e6), cacheDebtRepaymentTokens: prior === 0 ? 0 : Math.floor(r() * 2e5),
    cacheWriteReadRatio: pick([null, 0, 1, 10, 12.5, 20]),
  };
  const a = ts.decideCompaction({ ...inp, economics: ts.DEFAULT_COMPACTION_ECONOMICS });
  const b = port.occDecide(inp);
  const keys = ['compact', 'reason', 'breakevenRequests', 'combinedBreakevenRequests', 'effectiveHorizonRequests', 'expectedRemainingRequests', 'postCompactionTokens'];
  const bad = keys.filter(x => !(a[x] === b[x] || (typeof a[x] === 'number' && Math.abs(a[x] - b[x]) < 1e-9)));
  reasons[a.reason] = (reasons[a.reason] || 0) + 1;
  if (bad.length) { if (diff.length < 5) diff.push({ inp, bad, ts: bad.map(x => a[x]), port: bad.map(x => b[x]) }) } else same++;
}
const def = JSON.stringify(ts.DEFAULT_COMPACTION_ECONOMICS) === JSON.stringify(port.OCC_ECON);
const out = { checked: N, identical: same, defaults_match: def, reasons, diff, date: '2026-10-03' };
fs.writeFileSync('inputs/check_occ.json', JSON.stringify(out, null, 1));
console.log(same === N && def ? 'PASS' : 'FAIL', same + '/' + N, 'defaults match', def, reasons);
process.exit(same === N && def ? 0 : 1);
