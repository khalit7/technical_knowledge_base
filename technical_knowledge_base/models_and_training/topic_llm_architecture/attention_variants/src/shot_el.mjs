// Screenshot one element: node shot_el.mjs <tab id> <css selector> <width> <dark|light> <out.png>
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [tab, sel, w, scheme, out] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/index.html'));
  await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 400));
  const el = await p.$(sel); await el.scrollIntoView(); await el.screenshot({ path: out }); } finally { await b.close() }
