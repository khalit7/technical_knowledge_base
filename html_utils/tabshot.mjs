// Open one tab of a page in headless Chrome, screenshot it, and report script errors and sideways scroll.
// usage: node html_utils/tabshot.mjs <page index.html> <tab id> [light|dark] [width] [out.png] [css selector to click first]
// Chrome comes with puppeteer (`npm ci` in html_utils); set CHROME_PATH to use another browser.
import puppeteer from 'puppeteer';
import path from 'node:path';

const [file, tab, scheme = 'light', width = '920', out = 'tab.png', click] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
  args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: +width, height: 900 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + path.resolve(file));
await p.click(`button[data-t=${tab}]`);
await new Promise(r => setTimeout(r, 300));
if (click) { await p.click(click); await new Promise(r => setTimeout(r, 200)) }
const el = await p.$(process.env.SEL || ('#' + tab));
await el.screenshot({ path: out });
const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
if (box) errs.push('error box shown: ' + box);
console.log('errors', errs, 'sideways', sw);
await b.close();
