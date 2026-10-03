// Click every control of the Open recipes compared tab at 390 px dark and 920 px light:
// no console errors, no NaN / undefined / null in the text, no sideways page scroll.
// Section screenshots go to ../../.shots/rc-*.png (gitignored).
// usage: node src/recipes/check_recipes.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots');
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-recipes]');
  await wait(300);
  const probs = [];
  const check = async label => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-recipes').innerText;
      const m = t.match(/.{0,30}\b(NaN|undefined|null|Infinity)\b.{0,30}/);
      const box = document.getElementById('jsErr');
      return { bad: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.bad) probs.push(label + ': text "' + r.bad + '"');
    if (r.side) probs.push(label + ': sideways scroll');
    if (r.box) probs.push(label + ': error box ' + r.box);
  };
  const clickAll = async (sel, label, each) => {
    const n = await p.$$eval(sel, es => es.length);
    for (let i = 0; i < n; i++) {
      const es = await p.$$(sel);
      if (!es[i]) continue;
      await es[i].evaluate(e => e.scrollIntoView({ block: 'center' }));
      await es[i].click();
      await wait(each || 30);
      await check(label + ' #' + i);
    }
    return n;
  };
  let clicks = 0;
  await check('initial');
  for (const s of ['#rc-w button', '#rc-b button', '#rc-st button', '#rc-col button', '#rc-era button']) {
    clicks += await clickAll(s, s);
  }
  // reset filters to all, then every sort header twice
  for (const s of ['#rc-w button[data-v=all]', '#rc-b button[data-v=all]', '#rc-st button[data-v=all]']) { await p.click(s); }
  for (let k = 0; k < 2; k++) clicks += await clickAll('#rc-wrap .rcsb', 'sort');
  // every cell of three rows, every model name
  const cells = await p.$$eval('#rc-wrap td[data-c]', es => es.length);
  for (let i = 0; i < cells; i += 7) { const es = await p.$$('#rc-wrap td[data-c]'); await es[i].click(); clicks++; await check('cell ' + i); }
  clicks += await clickAll('#rc-wrap .nm', 'model');
  // compare: tick and untick
  const boxes = await p.$$eval('#rc-wrap input[data-c]', es => es.length);
  for (let i = 0; i < Math.min(boxes, 6); i++) { const es = await p.$$('#rc-wrap input[data-c]'); await es[i].click(); clicks++; await check('tick ' + i); }
  await p.click('#rc-clr'); await check('clear');
  for (const i of [0, 9, 17]) { const es = await p.$$('#rc-wrap input[data-c]'); await es[i].click(); }
  // animation: every story, every branch, step, back, scrubber, play
  const stories = await p.$$eval('#rc-an-s button', es => es.length);
  for (let s = 0; s < stories; s++) {
    await (await p.$$('#rc-an-s button'))[s].click(); await wait(50); await check('story ' + s);
    const br = await p.$$eval('#rc-an-b button', es => es.length);
    for (let j = 0; j < Math.max(1, br); j++) {
      if (br) { await (await p.$$('#rc-an-b button'))[j].click(); }
      await p.click('#rc-an-back'); await p.click('#rc-an-back'); await p.click('#rc-an-fwd'); await wait(800);
      await p.$eval('#rc-an-scr', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
      await check('story ' + s + ' branch ' + j);
      clicks += 4;
    }
  }
  await p.select('#rc-an-sp', '2');
  await p.$eval('#rc-an-svg', e => e.scrollIntoView({ block: 'center' }));
  await p.click('#rc-an-play'); await wait(2500); await check('playing');
  await p.click('#rc-an-play'); clicks += 2;
  clicks += await clickAll('#rc-corr summary', 'correction');
  await check('end');
  // screenshots of each section in its final state
  await p.$eval('#rc-an-scr', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
  for (const [id, name] of [['rc-wrap', 'grid'], ['rc-cmp', 'cmp'], ['rc-tok', 'tok'], ['rc-disc', 'disc'], ['rc-seq', 'seq'], ['rc-an-svg', 'anim'], ['rc-share', 'share'], ['rc-det', 'det']]) {
    const el = await p.$('#' + id);
    await el.screenshot({ path: path.join(shots, 'rc-' + name + '-' + scheme + '-' + width + '.png') });
  }
  const all = probs.concat(errs.map(e => 'console: ' + e));
  console.log(scheme, width, 'clicks', clicks, all.length ? 'PROBLEMS\n  ' + all.slice(0, 20).join('\n  ') : 'ok');
  if (all.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
