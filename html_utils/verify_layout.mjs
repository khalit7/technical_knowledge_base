// Lead's independent check of a rebuilt page against the 2026-11-06 layout rules (split layout, stages, step lists, autoplay).
// usage: node html_utils/verify_layout.mjs <page folder> <out dir for screenshots, outside the repo>
// Reports: splits per tab (grid at 1400 means two columns), stages, step lists; problems: visuals outside a split,
// splits not two columns at 1400, a stage that does not autoplay or moves under reduced motion, step count != list items,
// errors, error box, sideways scroll. Lines ending "(check autoplay)" are info: a 2D animation still reading Play after
// 1.5 s; widgets (auto:false) and cards hidden behind a lesson toggle show this legitimately.
import puppeteer from 'puppeteer';
import path from 'node:path'; import fs from 'node:fs';
const [dir, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const file = 'file://' + path.resolve(dir, 'index.html'), sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = [], info = [];
for (const [w, scheme, rm] of [[1400, 'light', false], [390, 'dark', false], [1400, 'light', true]]) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: w > 1000 ? 900 : 844 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto(file); await sleep(500);
  const tabs = await p.$$eval('#tabs button, [role=tablist] button', bs => bs.map(b => b.dataset.t).filter(Boolean));
  for (const t of tabs) {
    await p.evaluate(t => { const b = document.querySelector(`[data-t="${t}"]`); b && b.click() }, t); await sleep(400);
    if (t === 't-more') continue;
    // layout: sections with a visual outside a split, splits per tab
    const lay = await p.evaluate(t => {
      const tab = document.getElementById(t); if (!tab) return null;
      const vis = 'svg, canvas, figure, img, .stg';
      const splits = tab.querySelectorAll('.s3sp').length;
      const loose = [...tab.querySelectorAll(vis)].filter(e => !e.closest('.s3sp') && !e.closest('details') && !e.closest('.pred') && !e.closest('nav') && !e.closest('button') && e.getBoundingClientRect().width > 120 && e.getBoundingClientRect().height > 60)
        .map(e => { const s = e.closest('section'); return (s && (s.id || (s.querySelector('h2,h3') || {}).textContent || '').slice(0, 40)) + ':' + e.tagName.toLowerCase() });
      const stages = [...tab.querySelectorAll('.stg')].map(s => s.id);
      const lists = [...tab.querySelectorAll('ol.sx')].length;
      const twoCol = [...tab.querySelectorAll('.s3sp')].filter(s => getComputedStyle(s).display === 'grid').length;
      return { splits, twoCol, loose: [...new Set(loose)].slice(0, 12), stages, lists, sideways: document.documentElement.scrollWidth > innerWidth };
    }, t);
    if (!lay) continue;
    if (!rm) info.push(`${w} ${scheme} ${t}: splits ${lay.splits} (grid ${lay.twoCol}), stages ${lay.stages.length}, step lists ${lay.lists}`);
    if (lay.sideways) problems.push(`${w} ${t}: sideways scroll`);
    if (w === 1400 && !rm && lay.loose.length) problems.push(`${t}: visuals outside a split: ${lay.loose.join(' | ')}`);
    if (w === 1400 && !rm && lay.splits && lay.twoCol !== lay.splits) problems.push(`${t}: ${lay.splits - lay.twoCol} splits not two columns at 1400`);
    // stages: autoplay (or not under reduced motion), list length, screenshot mid-way
    for (const id of lay.stages) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(2600);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (rm && fr > 0) problems.push(`reduced motion: ${id} moved`);
      if (!rm && fr === 0) problems.push(`${w} ${id}: did not autoplay`);
      if (!rm) {
        const n = await p.$eval(`#${id} input[type=range]`, e => +e.max + 1);
        const nl = await p.evaluate(id => { const sp = document.getElementById(id).closest('.s3sp'); const l = sp && sp.querySelector('ol.sx:not([hidden])'); return l ? l.children.length : -1 }, id);
        if (nl !== n) problems.push(`${id}: ${n} steps, ${nl} list items`);
        await p.evaluate(id => { const sp = document.getElementById(id).closest('.s3sp'); const l = sp.querySelector('ol.sx:not([hidden])'); l && l.children[Math.floor(l.children.length / 2)].click() }, id); await sleep(400);
        const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${id}-${w}-${scheme}.png` });
      }
    }
    // 2D animations driven by RD.anim or a page controller: play buttons inside a split that are not stage buttons
    const anims = await p.evaluate(t => [...document.getElementById(t).querySelectorAll('.s3sp .an-play')].filter(b => !b.closest('.stg')).map(b => b.id).filter(Boolean), t);
    for (const id of anims) {
      await p.$eval('#' + id, e => e.closest('.card, .s3side, .s3R').scrollIntoView({ block: 'center' })); await sleep(1500);
      const txt = await p.$eval('#' + id, e => e.textContent + ' ' + (e.closest('.card,.s3R') && e.closest('.card,.s3R').dataset.frames || ''));
      if (!rm && !/Pause|Replay/.test(txt)) info.push(`${w} 2D ${id}: after 1.5 s reads "${txt.trim()}" (check autoplay)`);
      if (rm && /Pause/.test(txt)) problems.push(`reduced motion: 2D ${id} playing`);
    }
    if (!rm) { const el = await p.$('#' + t); if (el) await p.screenshot({ path: `${out}/${t}-${w}-${scheme}-top.png` }) }
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) problems.push(`${w} ${scheme}: error box ${box}`);
  if (errs.length) problems.push(`${w} ${scheme}${rm ? ' rm' : ''}: errors ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await b.close();
info.forEach(x => console.log('  ' + x)); console.log('problems', problems.length); problems.forEach(x => console.log(' - ' + x));
