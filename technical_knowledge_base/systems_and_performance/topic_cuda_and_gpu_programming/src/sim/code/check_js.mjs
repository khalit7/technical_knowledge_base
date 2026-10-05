// Run the page's simulator code (parts/31_js_sim_1core.js) on every case in out/expected.json
// (written by reference.py) and compare. Usage: node code/check_js.mjs
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const window = {};
new Function('window', fs.readFileSync(path.join(root, '..', 'parts', '31_js_sim_1core.js'), 'utf8'))(window);
const C = window.SIMC;
const ex = JSON.parse(fs.readFileSync(path.join(root, 'out', 'expected.json'), 'utf8'));
let n = 0, bad = 0;
function eq(a, b, where) {
  n++;
  const ok = (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)) : JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { bad++; if (bad < 10) console.log('MISMATCH', where, a, b); }
}
function cmp(got, want, where) { for (const k of Object.keys(want)) eq(got[k], want[k], where + '.' + k); }
eq(C.lcgSigns(64, 12345), ex.signs, 'signs');
eq(C.lcgSigns(64, 12345, true), ex.signs_sorted, 'signs_sorted');
for (const [key, want] of Object.entries(ex.diverge)) {
  const [kind, la, lb] = key.split('/');
  const signs = kind === 'data_random' ? ex.signs : ex.signs_sorted;
  const k = kind.startsWith('data') ? 'data' : kind;
  [0, 1].forEach(w => cmp(C.diverge(C.condMask(k, w, signs), 3, +la, +lb, 1), want[w], key + '/w' + w));
}
for (const [key, want] of Object.entries(ex.coalesce)) {
  const [pat, elem, p] = key.split('/');
  cmp(C.coalesce(C.laneAddresses(pat, +elem, +p), +elem), want, key);
}
cmp(C.transposeSectors(false), ex.transpose.naive, 'tr naive');
cmp(C.transposeSectors(true), ex.transpose.tiled, 'tr tiled');
for (const [key, want] of Object.entries(ex.banks)) {
  const [pat, s] = key.split('/');
  cmp(C.banks(C.bankWords(pat, s ? +s : undefined)), want, key);
}
for (const [key, want] of Object.entries(ex.occupancy)) {
  const [arch, regs, smem, block, bars] = key.split('/');
  cmp(C.occupancy(arch, +regs, +smem, +block, +bars), want, key);
}
for (const [key, want] of Object.entries(ex.latency)) {
  const p = key.split('/');
  if (p[0] === 'trace') cmp(C.latencySim(+p[1], +p[2], +p[3], 1, 200, 60), want, key);
  else cmp(C.latencySim(+p[0], +p[1], +p[2], +p[3]), want, key);
}
for (const [key, want] of Object.entries(ex.tiling)) {
  const [bm, bn, elem] = key.split('/');
  cmp(C.tiling(4096, +bm, +bn, +elem), want, key);
}
cmp(C.tileAnim(), ex.tile_anim, 'tile_anim');
console.log(`check_js: ${n} values compared, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
