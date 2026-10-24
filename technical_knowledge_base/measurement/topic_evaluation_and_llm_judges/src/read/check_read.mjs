// Exercise every Reading and Further reading control (rebuilt 2026-10-24: hero, statistics chart, attribution stepper) at 390 dark and 920 light; compare RD_CHECK with recompute.json.
// Run from the repo root: node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/src/read/check_read.mjs [shotdir]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_dir = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges');
const shots = process.argv[2] || path.join(os.tmpdir(), 'rd_shots'); fs.mkdirSync(shots, { recursive: true });
const want = JSON.parse(fs.readFileSync(path.join(page_dir, 'src/read/recompute.json')));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = [], actions = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: w, height: 900 });
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await pg.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) { } });
  await pg.goto('file://' + path.join(page_dir, 'index.html'));
  await pg.click('#tabs button[data-t="t-read"]');
  const scan = async (label) => {
    const r = await pg.evaluate(() => {
      const t = document.getElementById('t-read').innerText + document.getElementById('t-more').innerText;
      return { bad: /NaN|undefined|Infinity/.test(t) ? t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/)[0] : null,
        sx: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        err: (document.getElementById('jsErr') || {}).hidden === false };
    });
    if (r.bad) problems.push(`${w} ${label}: text ${r.bad}`);
    if (r.sx) problems.push(`${w} ${label}: sideways scroll`);
    if (r.err) problems.push(`${w} ${label}: error box shown`);
    actions++;
  };
  await scan('load');
  await pg.$eval('#rd-att-card', e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 3000));
  const st0 = await pg.$eval('#rd-att-ctl-s', e => +e.value); if (st0 !== 0) problems.push(`${w} attribution stepper moved by itself (${st0})`);
  // RD_CHECK against recompute.json
  const got = await pg.evaluate(() => window.RD_CHECK);
  const close = (a, b) => Math.abs(a - b) < 1e-6;
  for (const k of Object.keys(want.stat)) if (!close(got.stat[k], want.stat[k])) problems.push(`stat ${k} ${got.stat[k]} vs ${want.stat[k]}`);
  for (const b of Object.keys(want.attr)) for (const f of ['n', 'q', 'g', 'm']) if (got.attr[b][f] !== want.attr[b][f]) problems.push(`attr ${b} ${f}`);
  for (const b of ['all', 'HLE-Physics', 'PRISM-Physics', 'PHYBench', 'UGPhysics']) {
    await pg.select('#rd-att-b', b);
    for (let i = 0; i < 5; i++) {
      await pg.$eval('#rd-att-ctl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i);
      const cnt = await pg.$$eval('#rd-att-sq i', a => ({ n: a.length, m: a.filter(x => x.className === 'km').length, g: a.filter(x => x.className === 'kg').length, q: a.filter(x => x.className === 'kq').length }));
      const W = want.attr[b];
      if (cnt.n !== W.n) problems.push(`${w} attr ${b} squares ${cnt.n}`);
      if (i === 4 && (cnt.m !== W.m || cnt.g !== W.g || cnt.q !== W.q)) problems.push(`${w} attr ${b} final ${JSON.stringify(cnt)}`);
      await scan(`attr ${b} ${i}`);
      if (b === 'all' && (i === 0 || i === 4)) await (await pg.$('#rd-att-card')).screenshot({ path: path.join(shots, `attr_${i}_${w}.png`) });
    }
  }
  // play / pause / step buttons and speed
  for (const c of ['rd-att-ctl']) {
    for (const s of ['p', 'f', 'b', 'p']) { await pg.click(`#${c}-${s}`); await scan(`${c} ${s}`) }
    await pg.select(`#${c}-v`, '2'); actions++;
  }
  // hero figure drawn, with seven boxes
  const nb = await pg.$$eval('#rd-hero svg rect', a => a.length); if (nb !== 7) problems.push(`${w} hero boxes ${nb}`);
  await (await pg.$('#rd-hero-card')).screenshot({ path: path.join(shots, `hero_${w}.png`) });
  await (await pg.$('#rd-ci-card')).screenshot({ path: path.join(shots, `ci_${w}.png`) });
  // nav links and tab links inside reading
  const nav = await pg.$$eval('#rd-nav a', a => a.map(x => x.getAttribute('href')));
  for (const h of nav) { await pg.click(`#rd-nav a[href="${h}"]`); await scan('nav ' + h) }
  const tl = await pg.$$eval('#t-read a[data-tab]', a => [...new Set(a.map(x => x.dataset.tab))]);
  for (const t of tl) { await pg.click('#tabs button[data-t="t-read"]'); await pg.$eval(`#t-read a[data-tab="${t}"]`, e => e.click()); const vis = await pg.$eval('#' + t, e => !e.hidden); if (!vis) problems.push('tab link ' + t); actions++ }
  await pg.click('#tabs button[data-t="t-more"]'); await scan('more');
  const ext = await pg.$$eval('#t-read a[href^="http"], #t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).length);
  if (ext) problems.push(`${ext} external links without target/rel`);
  await pg.screenshot({ path: path.join(shots, `more_${w}.png`), fullPage: true });
  await pg.click('#tabs button[data-t="t-read"]');
  await pg.screenshot({ path: path.join(shots, `read_${w}.png`), fullPage: true });
  errs.forEach(e => problems.push(`${w} ${scheme}: ${e}`));
  await pg.close();
}
await browser.close();
console.log(`actions ${actions}, problems ${problems.length}`); problems.forEach(p => console.log(' - ' + p));
