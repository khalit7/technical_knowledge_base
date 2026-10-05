// Screenshot one element of the Reading tab. Run from the repo root:
// node technical_knowledge_base/agents_and_retrieval/topic_protocols/src/read/shot.mjs <selector> <width> <dark|light> <out.png> [clicks...]
// clicks: CSS selectors clicked in order before the shot (e.g. "#rd-lay-ctl-f").
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const [sel, w, scheme, out, ...clicks] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: +w, height: 900 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('file://' + path.resolve(here, '../../index.html'));
await p.click('button[data-t=t-read]');
await new Promise(r => setTimeout(r, 300));
for (const c of clicks) { const [s, n] = c.split('*'); for (let i = 0; i < (+n || 1); i++) { await p.click(s); await new Promise(r => setTimeout(r, 60)); } }
const el = await p.$(sel);
await el.scrollIntoView();
await new Promise(r => setTimeout(r, 300));
await el.screenshot({ path: out });
const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('errors:', errs.length ? errs : 'none', 'sideways:', sw);
await b.close();
