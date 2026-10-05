// Exercise every control of the Toolchain atlas tab at 390 dark and 920 light.
import { createRequire } from 'module';
const require = createRequire('/Users/khalid/technical_knowledge_base/html_utils/package.json');
const puppeteer = require('puppeteer');
const PAGE = 'file:///Users/khalid/technical_knowledge_base/technical_knowledge_base/engineering_foundations/topic_programming_languages/index.html';
const OUT = process.argv[2] || '/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/tools_walk/shots';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = [];
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.setViewport({ width: w, height: 900 });
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.click('#tabs button[data-t="t-tools"]');
  await sleep(300);
  await page.click('#ta-views button[data-v="atlas"]');
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const t = document.getElementById('t-tools');
      const txt = t.innerText.replace(/considered-undefined|address, undefined or thread|=undefined|undefined-behavior/g, "");
      const bad = /\bNaN\b|\bundefined\b(?! behavio)|\[object Object\]/.exec(txt);
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const err = document.getElementById('jsErr');
      return { bad: bad ? txt.slice(Math.max(0, bad.index - 60), bad.index + 40) : null, side: sw > cw + 1 ? sw + '>' + cw : null, jserr: err && !err.hidden ? err.textContent : null };
    });
    if (r.bad) problems.push(`${w} ${label}: text "${r.bad}"`);
    if (r.side) problems.push(`${w} ${label}: sideways scroll ${r.side}`);
    if (r.jserr) problems.push(`${w} ${label}: jsErr ${r.jserr}`);
  };
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${w}-${scheme}-${name}.png`, fullPage: false }); };
  await check('initial');
  // Atlas: click every cell
  const cells = await page.$$eval('#ta-grid td.ta-c', tds => tds.map(td => td.dataset.j + '|' + td.dataset.l));
  for (const c of cells) {
    const [j, l] = c.split('|');
    await page.click(`#ta-grid td.ta-c[data-j="${j}"][data-l="${l}"]`);
    await check('cell ' + c);
  }
  await page.evaluate(() => document.getElementById('ta-grid').scrollIntoView());
  await shot('atlas');
  await page.click('#ta-grid td.ta-c[data-j="types"][data-l="py"]');
  await page.evaluate(() => document.getElementById('ta-det').scrollIntoView());
  await shot('detail-types-py');
  // language chips
  for (const l of ['cpp', 'ts', 'rs']) { await page.click(`#ta-langs button[data-l="${l}"]`); await check('chip off ' + l); }
  await page.evaluate(() => document.getElementById('ta-grid').scrollIntoView());
  await shot('atlas-one-lang');
  await page.click('#ta-langs button[data-l="py"]'); // last one cannot be removed
  for (const l of ['cpp', 'ts', 'rs']) { await page.click(`#ta-langs button[data-l="${l}"]`); }
  // group select and search
  for (const g of ['Set up', 'Write', 'Check and run', 'Share', '']) { await page.select('#ta-grp', g); await check('group ' + g); }
  for (const q of ['ruff', 'napi', 'cmake', 'zzzz', '']) {
    await page.evaluate(q => { const i = document.getElementById('ta-q'); i.value = q; i.dispatchEvent(new Event('input')); }, q);
    await check('search ' + q);
    if (q === 'napi') { await page.evaluate(() => document.getElementById('ta-grid').scrollIntoView()); await shot('search-napi'); }
  }
  // Compare
  await page.click('#ta-views button[data-v="cmp"]'); await check('cmp');
  const jobs = await page.$$eval('#ta-cj option', o => o.map(x => x.value));
  for (const j of jobs) { await page.select('#ta-cj', j); await check('cmp ' + j); }
  for (const [a, b] of [['cpp', 'rs'], ['ts', 'py'], ['rs', 'rs']]) { await page.select('#ta-ca', a); await page.select('#ta-cb', b); await page.select('#ta-cj', 'ffi'); await check('cmp ' + a + b); }
  await page.select('#ta-ca', 'py'); await page.select('#ta-cb', 'rs'); await page.select('#ta-cj', 'project');
  await page.evaluate(() => document.getElementById('ta-cmp').scrollIntoView()); await shot('compare');
  // Walkthroughs
  await page.click('#ta-views button[data-v="walk"]'); await sleep(400); await check('walk');
  const nw = await page.$$eval('#ta-wsel button', b => b.length);
  for (let k = 0; k < nw; k++) {
    await page.evaluate(k => document.querySelector(`#ta-wsel button[data-m="${k}"]`).click(), k);
    const ns = await page.$$eval('#ta-wsteps button', b => b.length);
    for (let s = 0; s < ns; s++) { await page.evaluate(s => document.querySelector(`#ta-wsteps button[data-k="${s}"]`).click(), s); await check(`walk ${k} step ${s}`); }
    await page.click('#ta-wb'); await page.click('#ta-wf');
    await page.evaluate(() => document.getElementById('ta-wcard').scrollIntoView());
    await shot('walk' + k);
  }
  await page.click('#ta-wsel button[data-m="0"]');
  await page.click('#ta-wp'); await sleep(3500); await check('walk playing');
  await page.select('#ta-wv', '2'); await sleep(1500); await page.click('#ta-wp');
  await page.evaluate(() => { const s = document.getElementById('ta-ws'); s.value = 2; s.dispatchEvent(new Event('input')); }); await check('walk scrub');
  // Timeline
  await page.click('#ta-views button[data-v="time"]'); await sleep(200); await check('time');
  await page.evaluate(() => document.getElementById('ta-tl').scrollIntoView()); await shot('timeline');
  for (const f of ['2015', '2020', '2023']) {
    await page.select('#ta-tfrom', f);
    const ids = await page.$$eval('#ta-tl g.dot', g => g.map(x => x.dataset.id));
    for (const id of ids) { await page.evaluate(id => document.querySelector(`#ta-tl g.dot[data-id="${id}"]`).dispatchEvent(new MouseEvent('click', {bubbles: true})), id); await check(`time ${f} ${id}`); }
    if (f === '2015') { await page.evaluate(() => document.getElementById('ta-tl').scrollIntoView()); await shot('timeline-2015'); }
  }
  for (const l of ['py', 'cpp', 'rs', 'es']) { await page.click(`#ta-tlanes button[data-l="${l}"]`); await check('lane off ' + l); }
  await page.click('#ta-tlanes button[data-l="ts"]');
  for (const l of ['py', 'cpp', 'rs', 'es']) { await page.click(`#ta-tlanes button[data-l="${l}"]`); }
  await page.$$eval('#ta-tlist details', d => d.forEach(x => x.open = true)); await check('time lists');
  // Corrections
  await page.click('#ta-views button[data-v="corr"]'); await check('corr');
  const ks = await page.$$eval('#ta-cf button', b => b.map(x => x.dataset.k));
  for (const k of ks) { await page.click(`#ta-cf button[data-k="${k}"]`); await check('corr ' + k); }
  await page.click('#ta-cf button[data-k="all"]');
  await page.evaluate(() => document.getElementById('ta-corr').scrollIntoView()); await shot('corrections');
  // clipped text check: any element inside t-tools wider than its scroll container
  const clip = await page.evaluate(() => {
    const out = []; const t = document.getElementById('t-tools'); const tw = t.getBoundingClientRect().right + 1;
    t.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > tw && !el.closest('.ta-gw,pre,.ta-cmd,svg,.ta-cmp pre')) out.push(el.tagName + '.' + el.className + ' ' + Math.round(r.right)); });
    return out.slice(0, 8);
  });
  if (clip.length) problems.push(`${w} overflow: ${clip.join(', ')}`);
  for (const e of errs) problems.push(`${w} ${e}`);
  await page.close();
}
await browser.close();
console.log(problems.length ? problems.join('\n') : 'OK: no errors, NaN, undefined or sideways scroll');
