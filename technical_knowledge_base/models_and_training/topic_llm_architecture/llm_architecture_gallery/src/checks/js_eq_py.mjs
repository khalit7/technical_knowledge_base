// Runs the page's own cache code (parts/23_js_ag_1core.js) on the data the page embeds and prints, per row, the
// numbers the tabs display; check_data.py compares them with the Python (src/out/gallery.json).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const SRC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(SRC, '../index.html'), 'utf8');
const data = html.match(/window\.AGD=(.*?);\n/s)[1];
const core = fs.readFileSync(path.join(SRC, 'parts/23_js_ag_1core.js'), 'utf8');
const stub = { getElementById: () => null, querySelector: () => null, documentElement: { clientWidth: 900 } };
const ctx = { window: { AGD: JSON.parse(data) }, document: stub, matchMedia: () => ({ matches: false }), addEventListener() {} };
ctx.window.matchMedia = ctx.matchMedia; vm.createContext(ctx); vm.runInContext(core, ctx);
const G = ctx.window.AG, T = 131072, out = [];
for (const r of G.rows) {
  if (!r.kv) { out.push({ n: r.n }); continue }
  out.push({ n: r.n, full: G.cache(r, T, false), cred: G.cache(r, T, true), at1k: G.cache(r, 1000, true), expl: G.explain(r).total, state: G.stateB(r), fam: r.fam });
}
console.log(JSON.stringify(out));
