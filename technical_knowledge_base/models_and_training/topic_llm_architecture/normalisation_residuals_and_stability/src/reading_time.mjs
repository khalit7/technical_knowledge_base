// Reading time of the rendered Reading tab, counted as html_utils/audit_pages.mjs counts (text outside script, style,
// svg, button and nav; words inside closed <details> apart), at 230 words a minute. Writes out/reading_time.json,
// which fill.py puts in the header subtitle. After a text change: sh build.sh; node <this>; sh build.sh.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/normalisation_residuals_and_stability/src/reading_time.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const DIR = path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/normalisation_residuals_and_stability');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.goto('file://' + path.join(DIR, 'index.html')); await new Promise(r => setTimeout(r, 500));
  const r = await p.evaluate(() => {
    const root = document.getElementById('t-read'); let core = 0, depth = 0;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement; if (!el || el.closest('script,style,svg,button,nav,[role=tablist]')) continue;
      const k = n.textContent.split(/\s+/).filter(Boolean).length; if (!k) continue;
      const det = el.closest('details'); if (det && !el.closest('summary')) depth += k; else core += k;
    }
    return { core, depth };
  });
  const out = { words_main: r.core, words_details: r.depth, minutes_main: Math.round(r.core / 230), minutes_details: Math.round(r.depth / 230) };
  fs.writeFileSync(path.join(DIR, 'src', 'out', 'reading_time.json'), JSON.stringify(out) + '\n'); console.log(JSON.stringify(out));
} finally { await b.close() }
