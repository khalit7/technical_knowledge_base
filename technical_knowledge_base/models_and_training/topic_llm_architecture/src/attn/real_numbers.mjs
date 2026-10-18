// node src/attn/real_numbers.mjs : KV numbers of real models quoted in the Attention lab's prose, computed with the
// Config calculator's own code (parts/33_js_cc_0data.js and 33_js_cc_1core.js), bf16 cache, fp32 SSM state, windows credited.
// Writes out/real_numbers.json; check_data.py compares the page's prose against it.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const parts = path.join(here, '..', 'parts');
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['33_js_cc_0data.js', '33_js_cc_1core.js']) vm.runInContext(fs.readFileSync(path.join(parts, f), 'utf8'), ctx);
const CC = ctx.window.CC, M = ctx.window.CCD.models;
const out = {};
for (const m of M) {
  const s = CC.normalise(m.cfg), p = CC.params(s);
  const c1 = CC.cache(s, 1, 2, 4), c128 = CC.cache(s, 131072, 2, 4);
  let nw = 0, na = 0; for (const l of s.layers) for (const k of ['mix', 'mix2']) { const x = l[k]; if (x && (x.t === 'attn' || x.t === 'mla')) { na++; if (x.win) nw++; } }
  // full cost at 131,072 (no windows credited)
  const nowin = Object.assign({}, s, { layers: s.layers.map(l => Object.assign({}, l, { mix: l.mix && l.mix.t === 'attn' ? Object.assign({}, l.mix, { win: 0 }) : l.mix })) });
  out[m.key] = { label: m.label, total_params: p.total, attn_layers: na, windowed_layers: nw, kv_per_token_bf16: c1.kv,
    kv_131072_credited: c128.kv, state_per_seq_fp32: c128.state, total_131072: c128.total, kv_131072_full: CC.cache(nowin, 131072, 2, 4).kv };
}
fs.writeFileSync(path.join(here, 'out', 'real_numbers.json'), JSON.stringify(out, null, 1));
const G = 2 ** 30, K = 1024;
for (const k of ['llama-3.1-8b', 'llama-3.1-70b', 'gemma-3-27b', 'gpt-oss-120b', 'gpt-oss-20b', 'deepseek-v3', 'deepseek-v3.2', 'nemotron-h-8b', 'qwen3-next-80b-a3b', 'qwen3-8b', 'mistral-7b-v0.1', 'falcon-h1-7b', 'granite-4.0-h-small', 'jamba-v0.1']) {
  const r = out[k]; console.log(k, 'perTok KiB', (r.kv_per_token_bf16 / K).toFixed(2), 'at128k credited GiB', (r.kv_131072_credited / G).toFixed(2), 'full GiB', (r.kv_131072_full / G).toFixed(2), 'state MiB', (r.state_per_seq_fp32 / 2 ** 20).toFixed(1), 'params B', (r.total_params / 1e9).toFixed(2), 'attn', r.attn_layers, 'win', r.windowed_layers);
}
