// node src/wall/check_wall.mjs <page index.html>: runs the built page's window.CC and window.WL (Memory wall) and
// (1) requires every model's default cache to equal the root calc.py results at 4K, 32K and 128K tokens,
// (2) writes the worked examples the Reading tab quotes to src/wall/out/examples.json.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell' });
try {
  const p = await b.newPage(); await p.goto('file://' + path.resolve(process.argv[2]));
  const res = await p.evaluate(() => {
    const D = WLD.models, out = { mismatches: [], checked: 0, ex: {} };
    D.forEach((m, i) => { for (const c of ['4096', '32768', '131072']) { out.checked++; const v = CC.cache(WL.specs[i], +c, 2, 4).total; if (v !== m.ref[c].total) out.mismatches.push([m.key, c, v, m.ref[c].total]); } });
    const AS = { kvh: 'cfg', lay: 'cfg', win: 1024, kdt: 2, keep: 1 };
    const cap = (gb, n) => gb * 1e9 * n * 0.92;
    function scen(key, ctx, lv, gpu, n, wbytes) {
      const i = D.findIndex(m => m.key === key), s = WL.redesign(WL.specs[i], lv), ps = WL.perSeq(s, ctx, lv);
      const room = cap(gpu, n) - WL.params[i].total * wbytes;
      return { model: key, ctx, lv, gpu, n, wbytes, weights: WL.params[i].total * wbytes, per_seq: ps.total, per_tok: ps.kv / ctx, fit: Math.floor(room / ps.total),
        prefill_attn_share: (() => { const f = CC.flops(s, ctx); return f.prefill_attn / f.prefill })() };
    }
    const e = out.ex;
    e.l8_cfg = scen('llama-3.1-8b', 131072, AS, 80, 1, 2);
    e.l8_fp8 = scen('llama-3.1-8b', 131072, { ...AS, kdt: 1 }, 80, 1, 2);
    e.l8_lg = scen('llama-3.1-8b', 131072, { ...AS, lay: '5', win: 1024 }, 80, 1, 2);
    e.l8_lg_fp8 = scen('llama-3.1-8b', 131072, { ...AS, lay: '5', win: 1024, kdt: 1 }, 80, 1, 2);
    e.l8_mqa = scen('llama-3.1-8b', 131072, { ...AS, kvh: '1' }, 80, 1, 2);
    e.l70_cfg = scen('llama-3.1-70b', 131072, AS, 80, 8, 2);
    e.l70_lg_fp8 = scen('llama-3.1-70b', 131072, { ...AS, lay: '5', win: 1024, kdt: 1 }, 80, 8, 2);
    e.l70_mha = scen('llama-3.1-70b', 131072, { ...AS, kvh: 'mha' }, 80, 8, 2);
    e.g27_cfg = scen('gemma-3-27b', 131072, AS, 80, 1, 2);
    e.g27_glob = scen('gemma-3-27b', 131072, { ...AS, lay: 'global' }, 80, 1, 2);
    e.ds_cfg = scen('deepseek-v3', 131072, AS, 141, 8, 1);
    e.l8_cfg_1m = scen('llama-3.1-8b', 1048576, AS, 80, 1, 2);
    e.l8_lg_32k = scen('llama-3.1-8b', 32768, { ...AS, lay: '5', win: 1024 }, 80, 1, 2);
    e.l8_cfg_32k = scen('llama-3.1-8b', 32768, AS, 80, 1, 2);
    return out;
  });
  fs.mkdirSync('technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/src/wall/out', { recursive: true });
  fs.writeFileSync('technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/src/wall/out/examples.json', JSON.stringify(res, null, 1));
  console.log('checked', res.checked, 'mismatches', res.mismatches.length);
  for (const [k, v] of Object.entries(res.ex)) console.log(k, (v.per_tok / 1024).toFixed(2), 'KiB/tok', (v.per_seq / 1e9).toFixed(2), 'GB/seq fit', v.fit, 'attn', (100 * v.prefill_attn_share).toFixed(1), 'w', (v.weights / 1e9).toFixed(2));
  if (res.mismatches.length) process.exitCode = 1;
} finally { await b.close(); }
