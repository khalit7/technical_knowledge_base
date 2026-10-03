// Exercise every control of the Pretraining page and screenshot the main cards.
// usage: node src/check_page.mjs <out dir> [dark] [width]   (run from html_utils for puppeteer: NODE_PATH=../html_utils/node_modules)
import puppeteer from 'puppeteer';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || '.'; const dark = process.argv[3] === 'dark'; const W = +(process.argv[4] || 920);
const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: W, height: 900 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('file://' + path.join(here, '..', 'index.html'));
const bad = async (label) => { const t = await p.evaluate(() => document.body.innerText); for (const w of ['NaN', 'undefined', 'Infinity']) if (t.includes(w)) errs.push(label + ': text contains ' + w); };
const shot = async (sel, name) => { const e = await p.$(sel); if (!e) { errs.push('missing ' + sel); return } await e.scrollIntoView(); await new Promise(r => setTimeout(r, 150)); await e.screenshot({ path: path.join(out, name + (dark ? '-dark' : '') + '-' + W + '.png') }); };
const clickAll = async (sel, after) => { const n = await p.$$eval(sel, x => x.length); for (let i = 0; i < n; i++) { await p.$$eval(sel, (x, i) => x[i].click(), i); if (after) await after(i); } return n; };
const steps = async (ctl) => { for (let i = 0; i < 8; i++) await p.click('#' + ctl + '-f'); for (let i = 0; i < 8; i++) await p.click('#' + ctl + '-b'); await p.click('#' + ctl + '-p'); await new Promise(r => setTimeout(r, 300)); await p.click('#' + ctl + '-p'); };
// Reading
await clickAll('#ob-mode button', async () => { await steps('ob-ctl'); await p.click('#ob-ctl-f'); await p.click('#ob-ctl-f'); await p.click('#ob-ctl-f'); });
await shot('#ob-card', 'obj');
await clickAll('#rn-mode button', async (i) => { await steps('rn-ctl'); for (let k = 0; k < 2; k++) await p.click('#rn-ctl-f'); await shot('#rn-card', 'run' + i); });
await shot('#t5-card', 't5');
await clickAll('#as-mode button'); await p.click('#as-mode button'); await shot('#as-card', 'anneal0');
await p.click('#as-q button[data-a="half"]'); await shot('#rd-ann', 'anneal1');
await bad('read');
// Toy
await p.click('#tabs button[data-t="t-toy"]'); await new Promise(r => setTimeout(r, 200));
await clickAll('#ty-met button', async (i) => { await clickAll('#ty-view button'); await clickAll('#ty-seed button'); });
await p.click('#ty-met button[data-m="m_answer"]'); await p.click('#ty-view button[data-v="all"]'); await p.click('#ty-seed button[data-s="-1"]');
await shot('#ty-plot', 'toyplot'); await shot('#ty-grid', 'toygrid');
await p.click('#ty-met button[data-m="m_operand"]'); await p.click('#ty-view button[data-v="br"]'); await shot('#ty-plot', 'toyplot_op');
await steps('ty-ctl'); await p.click('#ty-ctl-f'); await shot('#ty-card', 'toyheat1');
await clickAll('#ty-br button', async (i) => { await shot('#ty-card', 'toyheat_br' + i); });
await shot('#ty-find', 'toyfind');
await bad('toy');
// Speed
await p.click('#tabs button[data-t="t-speed"]'); await new Promise(r => setTimeout(r, 200));
await steps('sp-ctl'); for (let i = 0; i < 40; i++) await p.click('#sp-ctl-f');
await clickAll('#sp-chips button'); await p.$$eval('#sp-plot circle', x => x[3].dispatchEvent(new MouseEvent('click', { bubbles: true })));
await shot('#sp-card', 'speed'); await shot('#sp-share', 'share');
await clickAll('#sp-chips button'); await bad('speed');
await p.click('#tabs button[data-t="t-more"]'); await bad('more');
const shown = await p.evaluate(() => { const e = document.getElementById('jsErr'); return e.hidden ? '' : e.textContent });
if (shown) errs.push('errbox: ' + shown);
console.log('errors', JSON.stringify(errs));
await b.close();
