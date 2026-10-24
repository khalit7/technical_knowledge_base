// Screenshot each Reading figure card at 390 dark and 920 light (after stepping steppers to a middle step).
// Run from the repo root: node <page>/src/shot_el.mjs <outdir>
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/storage_and_file_systems/index.html');
const out = process.argv[2] || '.';
const cards = ['rd-hero-card', 'rd-mq-card', 'rd-ftl-card', 'rd-vfs-card', 'rd-ra-card', 'rd-wb-card', 'rd-fs-card', 'rd-fe-card', 'rd-crash', 'rd-jb-card', 'rd-dp-card', 'rd-nfs-card'];
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await new Promise(r => setTimeout(r, 300));
  for (const c of cards) {
    const el = await p.$('#' + c); if (!el) { console.log('missing', c); continue; }
    await el.scrollIntoView();
    const f = await el.$('button[id$="-f"]'); if (f) for (let k = 0; k < 3; k++) await f.click();
    await el.screenshot({ path: `${out}/${c}-${scheme}-${width}.png` });
  }
  await p.close();
}
await b.close();
