// Check the noise-chasing toy (parts/13_js_sim.js) outside the browser: the calibration of its default mean effect
// against the released coding run, and the 400-seed averages the page shows at the defaults.
// usage (from src/): node check_sim.mjs        (after build.sh, which writes parts/_gen_data.js)
import fs from 'node:fs';
const g = globalThis; g.window = g;
eval(fs.readFileSync('parts/_gen_data.js', 'utf8'));
g.mulberry32 = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } };
g.RC = g.PAPER.rc;
const src = fs.readFileSync('parts/13_js_sim.js', 'utf8'); const i = src.indexOf('const SIM='); const j = src.indexOf('})();', i) + 5;
eval(src.slice(i, j).replace('const SIM=', 'globalThis.SIM='));
const SIM = g.SIM, P = SIM.P;
const med = () => { const ds = []; for (let s = 1; s <= 400; s++) { const R = SIM.run(SIM.draws(1000 + s), 'r'); for (let t = 1; t < R.length; t++) R[t].c.forEach(c => { if (c.why !== 'critic') ds.push(c.sh - R[t - 1].sh) }) } ds.sort((a, b) => a - b); return ds[ds.length >> 1] };
const target = RC.simdef.mu;
console.log('defaults', JSON.stringify(P));
console.log('released coding run median measured change', target, 'toy under RRSI rules', med().toFixed(4));
const o = SIM.mc(400);
console.log('400 seeds, keep the best: seen %s true %s tokens x%s below-start %s', ...o.g.map(x => x.toFixed(2)));
console.log('400 seeds, RRSI rules:    seen %s true %s tokens x%s below-start %s', ...o.r.map(x => x.toFixed(2)));
const ok = Math.abs(med() - target) < 0.003 && o.g[0] - o.g[1] > o.r[0] - o.r[1] && o.r[2] < o.g[2] && o.r[1] < o.g[1];
fs.writeFileSync('inputs/check_sim.json', JSON.stringify({ defaults: P, target, toy_median: med(), mc: o, ok }, null, 1));
console.log(ok ? 'PASS: calibrated; seen-true gap and tokens smaller under RRSI rules; true quality not better (as the page says)' : 'FAIL');
process.exit(ok ? 0 : 1);
