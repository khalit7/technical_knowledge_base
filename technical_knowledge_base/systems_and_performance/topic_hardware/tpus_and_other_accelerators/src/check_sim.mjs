// The page's JavaScript systolic simulator (SYS.simulate, SYS.tiled), the Reading animation and the
// weights-fit chart against the Python reference (out/systolic_ref.json, out/recompute.json).
// Usage (from the repo root): node <page>/src/check_sim.mjs <page>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = process.argv[2];
const ref = JSON.parse(fs.readFileSync(path.join(dir, 'src/out/systolic_ref.json')));
const rc = JSON.parse(fs.readFileSync(path.join(dir, 'src/out/recompute.json')));
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.goto('file://' + path.resolve(dir, 'index.html'));
const res = await p.evaluate((ref) => {
  const out = { cases: [], tiled: [] };
  for (const c of ref.cases) { const s = SYS.simulate(c.X, c.W); out.cases.push({ Y: s.Y, cycles: s.cycles, passes: s.passes, active: s.active }); }
  for (const t of ref.tiled) { out.tiled.push(SYS.tiled(t.M, t.K, t.N, t.R, t.R)); }
  out.rd = window.__tpuRdSys; out.fit = [0, 1, 2].map(m => window.__tpuFit(m, 2));
  out.pod = POD.slice('v5p', [4, 4, 4], [true, false, false], 16.06e9 * 1.0000000);
  return out;
}, ref);
await b.close();
let bad = 0, n = 0;
const eq = (a, b, what) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log('MISMATCH', what, JSON.stringify(a).slice(0, 120), JSON.stringify(b).slice(0, 120)); } };
ref.cases.forEach((c, i) => { const r = res.cases[i]; eq(r.Y, c.Y, 'Y ' + i); eq(r.cycles, c.cycles, 'cycles ' + i); eq(r.passes, c.passes, 'passes ' + i); eq(r.active, c.active, 'active ' + i); });
ref.tiled.forEach((t, i) => { const r = res.tiled[i]; eq(r.tiles, t.tiles, 'tiles ' + i); eq(r.cycles, t.cycles, 'tcycles ' + i); n++; if (Math.abs(r.util - t.util) > 1e-12 || Math.abs(r.pad - t.pad_util) > 1e-12) { bad++; console.log('MISMATCH util', i); } });
eq(res.rd.Y, ref.cases[0].Y, 'reading animation Y'); eq(res.rd.cycles, ref.cases[0].cycles, 'reading cycles');
const keys = ['groq_tsp', 'groq3', 'wse3', 'h100', 'b200', 'mi355x', 'tpu7x'];
['8B', '70B', '405B'].forEach((m, i) => eq(res.fit[i], keys.map(k => rc.fit_bf16[m][k]), 'fit ' + m));
n++; if (Math.abs(res.pod.t - rc.ar_v5p_axis_s) > 0.0006) { bad++; console.log('MISMATCH pod all-reduce', res.pod.t, rc.ar_v5p_axis_s); }
console.log(bad ? `check_sim: ${bad} of ${n} mismatches` : `check_sim: ${n} of ${n} match`);
process.exit(bad ? 1 : 0);
