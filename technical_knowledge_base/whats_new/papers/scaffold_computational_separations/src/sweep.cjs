// node src/sweep.cjs : every number the lab tab shows, from the page's own engine (parts/22_js_graph.js).
// Writes inputs/sweep.json; check_page.mjs compares the page's live sweep with it.
const path = require('path'), fs = require('fs');
const GR = require(path.join(__dirname, 'parts', '22_js_graph.js'));
const Ns = [8, 16, 32, 64, 128, 256], Ks = [1, 2, 3, 4, 5, 6, 7, 8], G = 200;
const out = { _doc: 'Written by sweep.cjs from parts/22_js_graph.js; do not edit by hand.', Ns, Ks, G, fam: {} };
for (const fam of ['local', 'random']) out.fam[fam] = GR.sweep(fam, Ns, Ks, G);
// checks: the reader computed by squaring agrees with the distance rule; BFS never exceeds N^2 calls
let agree = 0, total = 0, maxRatio = 0;
for (const fam of ['local', 'random']) for (const N of [8, 12, 16, 24, 32]) for (let s = 1; s <= 60; s++) {
  const g = GR.graph(N, fam, s), b = GR.bfs(g);
  maxRatio = Math.max(maxRatio, b.calls / (N * N));
  for (const k of [0, 1, 2, 3, 4]) { const r = GR.reader(g, k); total++; if (r.yes === (b.reach && b.dist <= 2 ** k)) agree++; }
}
out.check = { reader_vs_distance_rule: agree + ' of ' + total, max_calls_over_N2: +maxRatio.toFixed(4) };
fs.writeFileSync(path.join(__dirname, 'inputs', 'sweep.json'), JSON.stringify(out, null, 1));
for (const fam of ['local', 'random']) { const f = out.fam[fam]; console.log(fam, 'reach', f.reach.map(v => v.toFixed(2)).join(' '), '| dist', f.dist.map(v => v.toFixed(1)).join(' '), '| rounds', f.rounds.map(v => v.toFixed(1)).join(' '), '| calls', f.calls.map(v => v.toFixed(0)).join(' '));
  Ks.forEach(k => console.log('  k=' + k, f.acc[k].map(v => v.toFixed(3)).join(' '))); }
console.log(out.check);
