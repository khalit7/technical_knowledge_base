// Run every lesson variant on the page's own engine (parts/31_js_sql_a_engine.js, sql.js) with the page's own loader and
// runner (parts/31_js_sql_c_run.js), in node, and store the results in results.json under "sqlite".
// Run: node run_sqljs.mjs   (then python3 recompute.py --check)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const parts = path.join(here, '..', 'parts');
const ctx = { console, WebAssembly, URL, TextDecoder, TextEncoder, setTimeout, clearTimeout, Uint8Array, atob: s => Buffer.from(s, 'base64').toString('binary') };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['31_js_sql_a_engine.js', '31_js_sql_b_data.js', '31_js_sql_c_run.js']) vm.runInContext(fs.readFileSync(path.join(parts, f), 'utf8'), ctx, { filename: f });
const wasm = Buffer.from(ctx.SQ_WASM_B64, 'base64');
const SQL = await ctx.initSqlJs({ wasmBinary: new Uint8Array(wasm) });
const D = ctx.SQ_DATA, RUN = ctx.SQRUN;
const base = RUN.build(SQL, D);
const ver = (() => { const db = new SQL.Database(base); const v = db.exec('select sqlite_version()')[0].values[0][0]; db.close(); return v })();
const resPath = path.join(here, 'results.json'); const R = JSON.parse(fs.readFileSync(resPath, 'utf8'));
let n = 0;
for (const l of D.lessons) for (const [key, v] of Object.entries(l.variants)) {
  const db = new SQL.Database(base);
  const out = RUN.run(db, v.sql, 30).map(r => { const o = { sql: r.sql }; if (r.error) o.error = r.error; else if (r.cols) { o.cols = r.cols; o.rows = r.rows; o.n = r.n } else o.changes = r.changes; return o });
  db.close();
  const k = l.id + ':' + key; (R.runs[k] = R.runs[k] || {}).sqlite = out; n++;
}
R.meta.sqljs_sqlite = ver + ' (sql.js 1.14.2)';
fs.writeFileSync(resPath, JSON.stringify(R));
console.log('ran', n, 'variants on sql.js, SQLite', ver);
