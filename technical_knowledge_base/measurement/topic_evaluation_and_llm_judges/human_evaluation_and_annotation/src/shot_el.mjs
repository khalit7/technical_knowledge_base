// Screenshot chosen Reading elements at 390 dark and 920 light: node src/shot_el.mjs <out dir> [selector ...]
// Run from the repository root.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page_ = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/human_evaluation_and_annotation/index.html');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const sels = process.argv.slice(3);
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page_); await new Promise(r => setTimeout(r, 400));
  for (const s of sels) { const el = await p.$(s); if (!el) { console.log('missing', s); continue }
    await el.screenshot({ path: path.join(out, `${s.replace(/\W/g, '')}_${width}.png`) }) }
  await p.close();
}
await b.close();
