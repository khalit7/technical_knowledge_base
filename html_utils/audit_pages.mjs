// Measure what a reader actually gets on each page, tab by tab, from the rendered DOM.
// usage: node html_utils/audit_pages.mjs <out.jsonl> <page folder>...
// One JSON line per page: for every tab, core words (outside closed <details>), depth words (inside them),
// counted on one pass with default modes: a step list (ol.sx) hidden at load because its figure shows another
// mode's list is left out (Khalid, 2026-11-16); core_all/depth_all still count those lists (the measure before).
// h2 sections, visuals drawn (svg, canvas, img at least 120x80 px at 920 px wide) and controls (sliders, selects, non-tab buttons).
// Visuals are counted after the tab opens, so charts drawn by script count. Summarise with audit_pages.py.
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const [out, ...dirs] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined,
  args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const fd = fs.openSync(out, 'w');
for (const d of dirs) {
  const f = path.resolve(d, 'index.html');
  if (!fs.existsSync(f)) continue;
  const p = await b.newPage();
  await p.setViewport({ width: 920, height: 900 });
  try {
    await p.goto('file://' + f, { waitUntil: 'load', timeout: 30000 });
    const tabs = await p.$$eval('button[data-t]', bs => [...new Set(bs.map(b => b.dataset.t))]);
    const res = { page: d, bytes: fs.statSync(f).size, tabs: [] };
    for (const t of (tabs.length ? tabs : [null])) {
      if (t) { await p.$eval(`button[data-t="${t}"]`, b => b.click()); await new Promise(r => setTimeout(r, 350)); }  // DOM click: part bars hide some tab buttons
      res.tabs.push(await p.evaluate((t) => {
        const root = t ? document.getElementById(t) : document.body;
        if (!root) return { tab: t, missing: true };
        // MathML: the TeX in <annotation> is never shown, and each symbol is its own text node, so a formula
        // counts as its visible characters / 6 (one average word plus space), not one word per symbol.
        // A figure with mode toggles keeps one static step list per mode and hides all but the default one:
        // an ol.sx that is itself hidden (attribute or display:none) while a list of the same figure is shown.
        // Lists hidden only because a wrapper is (a closed reveal, an answer) are not modes and still count.
        const off = new Set();
        const shown = ol => !ol.hidden && getComputedStyle(ol).display !== 'none';
        for (const ol of root.querySelectorAll('ol.sx')) {
          if (shown(ol)) continue;
          for (let f = ol.parentElement; f && root.contains(f); f = f.parentElement) {
            const sib = [...f.querySelectorAll('ol.sx')].filter(o => o !== ol);
            if (!sib.length) continue;
            if (sib.some(shown)) off.add(ol);
            break;
          }
        }
        let core = 0, depth = 0, coreAll = 0, depthAll = 0;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const el = n.parentElement;
          if (!el || el.closest('script,style,svg,button,nav,[role=tablist],annotation,annotation-xml')) continue;
          const k = el.closest('math') ? n.textContent.replace(/\s+/g, '').length / 6
            : n.textContent.split(/\s+/).filter(Boolean).length;
          if (!k) continue;
          const det = el.closest('details');
          const inDet = det && !el.closest('summary') && root.contains(det);
          if (inDet) depthAll += k; else coreAll += k;
          const sx = el.closest('ol.sx');
          if (sx && off.has(sx)) continue;
          if (inDet) depth += k; else core += k;
        }
        core = Math.round(core); depth = Math.round(depth); coreAll = Math.round(coreAll); depthAll = Math.round(depthAll);
        let vis = 0;
        for (const v of root.querySelectorAll('svg,canvas,img')) {
          if (v.tagName.toLowerCase() === 'svg' && v.parentElement.closest('svg')) continue;
          if (v.closest('button')) continue;
          const r = v.getBoundingClientRect();
          if (r.width >= 120 && r.height >= 80) vis++;
        }
        const ctl = root.querySelectorAll('input[type=range],select').length
          + [...root.querySelectorAll('button')].filter(x => !x.dataset.t).length;
        const title = t ? (document.querySelector(`button[data-t="${t}"]`)?.textContent || t).trim() : 'page';
        return { tab: t, title, core, depth, core_all: coreAll, depth_all: depthAll, modes_off: off.size, h2: root.querySelectorAll('h2').length, vis, ctl };
      }, t));
    }
    fs.writeSync(fd, JSON.stringify(res) + '\n');
  } catch (e) { fs.writeSync(fd, JSON.stringify({ page: d, error: String(e).slice(0, 200) }) + '\n'); }
  await p.close();
}
fs.closeSync(fd);
await b.close();
