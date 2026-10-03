// Find text that is cut off: text whose real extent runs past an ancestor that hides overflow, or past the viewport.
// Sideways-scroll checks miss this, because clipped text makes no scrollbar. Scroll containers (overflow auto/scroll) are fine.
// usage: node html_utils/clipcheck.mjs <page index.html> [light|dark] [width]
// Prints one line per tab: "<tab> clipped N" and up to five examples; exits 1 if anything is clipped.
import puppeteer from 'puppeteer';
import path from 'node:path';

const [file, scheme = 'dark', width = '390'] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined,
  args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const p = await b.newPage();
await p.setViewport({ width: +width, height: 900 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + path.resolve(file));
const tabs = await p.$$eval('button[data-t]', bs => [...new Set(bs.map(b => b.dataset.t))]);
let bad = 0;
for (const t of tabs) {
  await p.click(`button[data-t=${t}]`);
  await new Promise(r => setTimeout(r, 400));
  const found = await p.evaluate(() => {
    const out = [], vw = document.documentElement.clientWidth;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest('[hidden],script,style') || !el.getClientRects().length) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rects = [...r.getClientRects()].filter(x => x.width > 0);
      if (!rects.length) continue;
      const right = Math.max(...rects.map(x => x.right)), left = Math.min(...rects.map(x => x.left));
      let lim = vw, skip = false;
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a), ox = cs.overflowX;
        if (ox === 'auto' || ox === 'scroll' || cs.textOverflow === 'ellipsis') { skip = true; break }
        if ((ox === 'hidden' || ox === 'clip') && !(a instanceof SVGElement)) lim = Math.min(lim, a.getBoundingClientRect().right);
      }
      if (skip) continue;
      if (right > lim + 1 || left < -1) out.push(`${el.tagName.toLowerCase()} "${n.textContent.trim().slice(0, 50)}" right ${Math.round(right)} > ${Math.round(lim)}`);
    }
    // boxes (cards, panels, charts) that run past the viewport, outside any scroll container
    for (const el of document.querySelectorAll('body *')) {
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
      if (el.closest('[hidden],script,style') || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
      let a = el.parentElement, scroller = false;
      for (; a && a !== document.documentElement; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { scroller = true; break }
      }
      if (!scroller) { out.push(`box <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}> spans ${Math.round(r.left)} to ${Math.round(r.right)}, viewport ${vw}`); if (out.length > 40) break }
    }
    return out;
  });
  bad += found.length;
  console.log(`${t} clipped ${found.length}`); found.slice(0, 5).forEach(f => console.log('  ' + f));
}
await b.close();
process.exit(bad ? 1 : 0);
