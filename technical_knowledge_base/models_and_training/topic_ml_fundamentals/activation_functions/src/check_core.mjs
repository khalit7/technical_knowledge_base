// Runs the page's own JS (parts/21_js_core.js) on a grid and writes check/js_core.json for recompute.py to compare with PyTorch.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {Math, console}; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'parts/21_js_core.js'), 'utf8'), ctx);
const AF = ctx.AF;
const xs = []; for (let i = 0; i <= 2400; i++) xs.push(-12.0025 + i * 0.01);   // never exactly 0
const out = {xs, f: {}, d: {}, stats: {}, mins: {}, erf: [], llama: {}, softmax: []};
for (const a of AF.L) { out.f[a.id] = xs.map(a.f); out.d[a.id] = xs.map(a.d); out.stats[a.id] = AF.stats(a); out.mins[a.id] = AF.minOf(a); }
for (let x = -6; x <= 6; x += 0.37) out.erf.push([x, AF.erf(x)]);
out.llama = {llama1_7b: AF.llamaHidden(4096, 256, null), llama3_8b: AF.llamaHidden(4096, 1024, 1.3), llama2_70b: AF.llamaHidden(8192, 4096, 1.3),
  llama31_405b: AF.llamaHidden(16384, 4096, 1.2), llama32_1b: AF.llamaHidden(2048, 256, 1.5), llama32_3b: AF.llamaHidden(3072, 256, 1.0)};
out.softmax = [AF.softmax([2, 1, 0.1]), AF.softmax([2, 1, 0.1], 0.5), AF.softmax([1000, 999, 0])];
fs.mkdirSync(path.join(here, 'check'), {recursive: true});
fs.writeFileSync(path.join(here, 'check/js_core.json'), JSON.stringify(out));
console.log('js_core.json written;', AF.L.length, 'functions;', JSON.stringify(out.llama));
for (const a of AF.L) { const s = out.stats[a.id]; console.log(a.id.padEnd(9), 'mean', s.mean.toFixed(4), 'E[f2]', s.m2.toFixed(4), 'gain', s.gain.toFixed(4), "E[f'2]", s.d2.toFixed(4), 'min', out.mins[a.id].v.toFixed(4), '@', out.mins[a.id].x.toFixed(3)); }
