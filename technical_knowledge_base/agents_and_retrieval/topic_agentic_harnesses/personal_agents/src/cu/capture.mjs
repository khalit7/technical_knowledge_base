// Capture the fake booking page two ways (screenshot and accessibility tree), before and after a cookie banner loads.
// usage, from the repo root: node <page>/src/cu/capture.mjs
// Writes src/cu/out/cu.json (element boxes, the click point, what lies under it after the shift, the accessibility tree)
// and src/cu/out/state_{plain,banner}.png (converted to ../img/*.webp by capture.sh). Headless Chrome via html_utils' puppeteer.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(HERE, '../../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const W = 600, H = 440;
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await p.goto('file://' + path.join(HERE, 'form.html'));
const boxes = () => p.evaluate(() => [...document.querySelectorAll('button,input,h1')].map(e => {
  const r = e.getBoundingClientRect(); return { name: e.getAttribute('aria-label') || e.textContent.trim(), tag: e.tagName.toLowerCase(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}));
const out = { viewport: [W, H], browser: await b.version(), puppeteer: R('puppeteer/package.json').version };
out.plain = await boxes();
await p.screenshot({ path: path.join(HERE, 'out', 'state_plain.png') });
// the accessibility tree a browser agent would read, flattened with a ref per node (the shape Playwright MCP's snapshot gives)
const snap = await p.accessibility.snapshot({ interestingOnly: true });
const lines = []; let n = 0;
(function walk(node, d) { if (!node) return; if (node.role !== 'RootWebArea') { n++; lines.push('  '.repeat(d) + '- ' + node.role + (node.name ? ' "' + node.name + '"' : '') + ' [ref=e' + n + ']'); }
  (node.children || []).forEach(c => walk(c, node.role === 'RootWebArea' ? d : d + 1)); })(snap, 0);
out.ax = lines;
const target = out.plain.find(e => e.name === 'Thu 8 Oct, 10:00');
out.click = [target.x + Math.round(target.w / 2), target.y + Math.round(target.h / 2)];
await p.evaluate(() => document.body.classList.add('banner'));
out.banner = await boxes();
out.under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.getAttribute('aria-label') || e.textContent.trim()) : null; }, out.click);
out.shift = out.banner.find(e => e.name === 'Thu 8 Oct, 10:00').y - target.y;
await p.screenshot({ path: path.join(HERE, 'out', 'state_banner.png') });
await b.close();
fs.writeFileSync(path.join(HERE, 'out', 'cu.json'), JSON.stringify(out, null, 1) + '\n');
console.log('click', out.click, 'shift', out.shift, 'under after shift:', out.under); console.log(lines.join('\n'));
