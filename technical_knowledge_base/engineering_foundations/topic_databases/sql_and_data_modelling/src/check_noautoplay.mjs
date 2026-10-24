// Scroll every Reading animation into view, press each mode button, wait, and confirm no step slider moved (nothing plays before the reader acts).
// Run from the repository root: node technical_knowledge_base/engineering_foundations/topic_databases/sql_and_data_modelling/src/check_noautoplay.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
await p.goto('file://' + path.join(here, '..', 'index.html'));
let bad = 0;
for (const id of await p.$$eval('#t-read .an-ctl', es => es.map(e => e.id))) {
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(300);
  await p.evaluate(id => { const card = document.getElementById(id).closest('.card'); card.querySelectorAll('.seg button').forEach(x => x.click()) }, id);
  await sleep(3000);
  const v = await p.$eval('#' + id + '-s', s => +s.value); console.log(id, 'step', v); if (v !== 0) bad++;
}
await b.close(); console.log(bad ? bad + ' animations moved on their own' : 'nothing autoplays'); process.exit(bad ? 1 : 0);
