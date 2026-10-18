// Runs the root Config calculator's core (window.CC, Topic: llm-architecture src/parts/33_js_cc_1core.js) on every
// gallery config whose model_type the calculator models, and compares its KV cache at five contexts with this page's
// per-layer formula (bf16, windows credited). Writes src/out/cc_agree.json. Run from anywhere: node src/checks/cc_agree.mjs
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SRC = path.dirname(HERE);
const core = fs.readFileSync(path.join(SRC, '../../src/parts/33_js_cc_1core.js'), 'utf8');
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(core, ctx); const CC = ctx.window.CC;
const CCTYPES = new Set(['llama', 'qwen3', 'gemma3_text', 'gemma3', 'mistral', 'qwen2', 'olmo3', 'olmo2', 'gemma2', 'phi3', 'mistral3', 'mixtral',
  'gpt_oss', 'qwen3_moe', 'llama4_text', 'glm4_moe', 'minimax_m2', 'deepseek_v2', 'deepseek_v3', 'deepseek_v32', 'kimi_k2', 'nemotron_h',
  'falcon_h1', 'granitemoehybrid', 'jamba', 'qwen3_next', 'gpt2', 'gemma']);
const rows = JSON.parse(fs.readFileSync(path.join(SRC, 'out/gallery.json'), 'utf8'));
const Ts = [1, 1000, 4096, 32768, 131072];
const mine = (r, T) => { let s = 0; const own = r.shared ? r.L - r.shared : r.L; [...r.mix].forEach((c, i) => { if (i >= own) return; const p = (r.per && r.per[c]) || 0; s += p * (c === 'S' && r.W ? Math.min(T, r.W) : T) }); return s * (r.passes || 1) };
const out = []; let bad = 0;
for (const r of rows) {
  if (!r.repo || !r.mix || !CCTYPES.has(r.mt)) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, 'inputs/configs', r.repo.replace('/', '__') + '.json'), 'utf8'));
  let spec; try { spec = CC.normalise(raw) } catch (e) { out.push({ n: r.n, mt: r.mt, err: String(e) }); continue }
  const res = Ts.map(T => { const c = CC.cache(spec, T, 2, 4); const idx = (r.idx || 0) * T; return { T, cc: c.kv, page: mine(r, T) + idx, state_cc: c.state } });
  const ok = res.every(x => x.cc === x.page); if (!ok) bad++;
  out.push({ n: r.n, mt: r.mt, ok, res });
}
fs.writeFileSync(path.join(SRC, 'out/cc_agree.json'), JSON.stringify(out, null, 1));
for (const o of out) console.log((o.err ? 'ERR ' : o.ok ? 'ok  ' : 'DIFF') + ' ' + o.n + ' ' + o.mt + (o.err ? ' ' + o.err : o.ok ? '' : ' ' + JSON.stringify(o.res.map(x => [x.T, x.cc, x.page]))));
console.log('models', out.length, 'disagree', bad);
