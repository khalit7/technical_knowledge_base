// The page's CuTe algebra (parts/22_js_cute.js) against CuTe's own output (cute/out/layouts.txt,
// CUTLASS 4.8.0 compiled and run in kb-gpu-lab:1). Compares printed shape:stride and every value.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {window: {}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../parts/22_js_cute.js'), 'utf8'), ctx);
const C = ctx.window.CUTE;
const lines = fs.readFileSync(path.join(here, '../cute/out/layouts.txt'), 'utf8').split('\n');
const ref = {}, tv = {};
for (const l of lines) {
  let m = /^CASE (\S+)\|(.*)\|(.*)$/.exec(l); if (m) ref[m[1]] = {p: m[2].replace(/_/g, ''), v: m[3].split(',').map(Number)};
  m = /^TV (\S+)\|rows=(\d+)\|(.*)\|(.*)$/.exec(l); if (m) tv[m[1]] = {rows: +m[2], p: m[3].replace(/_/g, ''), v: m[4].split(',').map(Number)};
}
const P = s => C.parse(s);
const L = n => P(ref[n].p);
const S = C.swz;
const cases = {
  colmajor_4x8: () => P('(4,8):(1,4)'), rowmajor_4x8: () => P('(4,8):(8,1)'), padded_4x8: () => P('(4,8):(1,5)'),
  nested_2x2x2x4: () => P('((2,2),(2,4)):((1,8),(2,16))'),
  coalesce_out: () => C.coalesce(L('coalesce_in')),
  compose_AB: () => C.compose(L('compose_A'), L('compose_B')),
  complement_24: () => C.complement(L('complement_in'), 24),
  divide_1d: () => C.divide(L('divide_A'), L('divide_tiler')),
  divide_8x8_by_2x4: () => C.divide(L('matrix_8x8'), [P('2:1'), P('4:1')]),
  zipped_8x8_by_2x4: () => C.zipped(L('matrix_8x8'), [P('2:1'), P('4:1')]),
  blocked_2x2_by_3x4: () => C.blocked(P('(2,2):(1,2)'), P('(3,4):(1,3)')),
  raked_2x2_by_3x4: () => C.raked(P('(2,2):(1,2)'), P('(3,4):(1,3)')),
  doc2d_divide: () => C.divide(L('doc2d_A'), [P('3:3'), P('(2,4):(1,8)')]),
};
const swz = {smem_8x64_sw128: [3, 3, 3, '(8,64):(64,1)'], smem_8x32_sw64: [2, 3, 3, '(8,32):(32,1)'], smem_8x16_sw32: [1, 3, 3, '(8,16):(16,1)']};
let ok = 0, bad = 0, vals = 0;
for (const [n, f] of Object.entries(cases)) {
  const r = f(), s = C.lstr(r), m = C.map(r), e = ref[n];
  const same = s === e.p && m.length === e.v.length && m.every((x, i) => x === e.v[i]);
  vals += e.v.length; same ? ok++ : bad++;
  console.log((same ? 'OK  ' : 'BAD ') + n + '  js ' + s + '  cute ' + e.p);
}
for (const [n, [b, mm, s, lay]] of Object.entries(swz)) {
  const f = S(b, mm, s), m = C.map(P(lay)).map(f), e = ref[n];
  const same = m.every((x, i) => x === e.v[i]); vals += e.v.length; same ? ok++ : bad++;
  console.log((same ? 'OK  ' : 'BAD ') + n + '  Sw<' + b + ',' + mm + ',' + s + '> o ' + lay);
}
for (const [n, e] of Object.entries(tv)) {
  const l = P(e.p), T = C.size(l.s[0]), V = C.size(l.s[1]); const m = [];
  for (let t = 0; t < T; t++) for (let v = 0; v < V; v++) m.push(C.at(l, t + T * v));
  const same = m.every((x, i) => x === e.v[i]); vals += e.v.length; same ? ok++ : bad++;
  console.log((same ? 'OK  ' : 'BAD ') + 'TV ' + n + ' ' + e.p);
}
console.log(`layout check: ${ok} cases match, ${bad} differ, ${vals} values compared`);
fs.writeFileSync(path.join(here, '../out/layout_check.json'), JSON.stringify({ok, bad, vals}));
process.exit(bad ? 1 : 0);
