// Reading time of the rendered Reading tab: words outside closed <details> at 200 a minute, details counted apart.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/src/reading_time.mjs
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.goto('file://' + path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/index.html'));
  await new Promise(r => setTimeout(r, 500));
  const r = await p.evaluate(() => { const t = document.getElementById('t-read'); const words = s => (s.match(/\S+/g) || []).length;
    for (const d of t.querySelectorAll('details')) d.open = true; let det = 0; for (const d of t.querySelectorAll('details')) { const s = d.querySelector('summary'); det += words(d.innerText) - (s ? words(s.innerText) : 0) }
    const all = words(t.innerText); return { all, det } });
  const main = r.all - r.det; console.log(JSON.stringify({ words_main: main, words_details: r.det, minutes_main: Math.round(main / 200), minutes_details: Math.round(r.det / 200) }));
} finally { await b.close() }
