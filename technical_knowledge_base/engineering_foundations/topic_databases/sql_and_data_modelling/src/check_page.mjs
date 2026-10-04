// Click every control of the page at 390 px dark and 920 px light; grade every exercise solution in the page's own engine;
// compare the page's JavaScript with recompute_out.json; report errors, NaN/undefined text and sideways scroll.
// Run from this folder: node check_page.mjs   (needs `npm ci` in html_utils; python3 recompute.py first)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.join(here, '..', 'index.html'), shots = path.join(here, '..', '.shots'); fs.mkdirSync(shots, { recursive: true });
const RC = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const say = (ok, m) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + m) };
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.waitForFunction(() => window.SM && (SM.S.SQL || SM.S.fail), { timeout: 20000 });
  say(await p.evaluate(() => !!SM.S.SQL), `${scheme} ${width}: engine started (${await p.evaluate(() => SM.S.ms)} ms)`);
  // scroll through the Reading tab so every runnable box runs, then click everything
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await sleep(60) }
  await sleep(500);
  const n = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); let k = 0;
    const click = el => { el.click(); k++ };
    for (const el of document.querySelectorAll('#t-read .seg button, #t-read .chips button, #t-read .pr .opts button')) { click(el); await sleep(30) }
    for (const el of document.querySelectorAll('#t-read input[type=checkbox]')) { click(el); await sleep(30); click(el) }
    for (const c of document.querySelectorAll('#t-read .an-ctl')) { for (const s of ['f', 'f', 'b', 'p', 'p']) { const e = document.getElementById(c.id + '-' + s); if (e) { click(e); await sleep(40) } }
      const r = document.getElementById(c.id + '-s'); if (r) { r.value = r.max; r.dispatchEvent(new Event('input')); await sleep(40); r.value = 0; r.dispatchEvent(new Event('input')) } }
    for (const el of document.querySelectorAll('.rq .rq-run')) { click(el); await sleep(5) }
    for (const el of document.querySelectorAll('.rq .rq-reset')) { click(el) }
    for (const el of document.querySelectorAll('details')) el.open = true;
    return k });
  say(n > 80, `${scheme} ${width}: clicked ${n} Reading controls`);
  await sleep(800);
  // boxes: every runnable box shows a live result and the expected agreement
  const boxes = await p.evaluate(() => [...document.querySelectorAll('.rq[data-ex]')].map(e => ({ id: e.dataset.ex, live: !!e.querySelector('.rq-l .rq-lab') && e.querySelector('.rq-l .rq-lab').textContent.includes('live'), cmp: (e.querySelector('.rq-cmp') || {}).textContent || '' })));
  const pgOnly = await p.evaluate(() => Object.keys(SM_DATA.ex).filter(k => SM_DATA.ex[k].only === 'pg'));
  say(boxes.filter(x => !pgOnly.includes(x.id)).every(x => x.live), `${scheme}: ${boxes.length} example boxes, all non-Postgres-only ones ran live`);
  if (width === 920) console.log('     engines disagree in:', boxes.filter(x => x.cmp.includes('disagree')).map(x => x.id).join(', '));
  // exercises: every solution passes, a wrong answer fails
  await p.click('button[data-t=t-ex]'); await sleep(200);
  const ex = await p.evaluate(async () => { const out = []; const X = SM_DATA.xs; const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < X.length; i++) { document.querySelector('#ex-list button[data-i="' + i + '"]').click(); document.getElementById('ex-ed').value = X[i].sol; document.getElementById('ex-go').click(); await sleep(30);
      const ok = document.querySelector('#ex-verdict .verdict.ok') !== null;
      // and the stored offline expectation equals the live one
      const live = EXLAB.lastRows(EXLAB.runAll(X[i].sol)); const same = EXLAB.grade(live, X[i].exp, X[i].ordered).ok;
      out.push([X[i].id, ok, same]) }
    document.querySelector('#ex-list button[data-i="0"]').click(); document.getElementById('ex-ed').value = 'SELECT 1'; document.getElementById('ex-go').click(); await sleep(30);
    const wrongFails = document.querySelector('#ex-verdict .verdict.no') !== null;
    for (const id of ['ex-hintb', 'ex-solb', 'ex-next', 'ex-prev', 'ex-reset']) document.getElementById(id).click();
    for (const el of document.querySelectorAll('#ex-lv button')) { el.click(); await sleep(20) }
    document.getElementById('ex-clear').click();
    return { out, wrongFails } });
  say(ex.out.every(x => x[1]), `${scheme}: all ${ex.out.length} exercise solutions graded correct in the page` + (ex.out.filter(x => !x[1]).length ? ' (failed: ' + ex.out.filter(x => !x[1]).map(x => x[0]) + ')' : ''));
  say(ex.out.every(x => x[2]), `${scheme}: live expected results equal the offline Python-SQLite ones` + (ex.out.filter(x => !x[2]).length ? ' (differ: ' + ex.out.filter(x => !x[2]).map(x => x[0]) + ')' : ''));
  say(ex.wrongFails, `${scheme}: a wrong answer is graded wrong`);
  await p.screenshot({ path: path.join(shots, `my-ex-${scheme}-${width}.png`), fullPage: false });
  // ALTER tab controls
  await p.click('button[data-t=t-alter]'); await sleep(200);
  await p.evaluate(async () => { for (const el of document.querySelectorAll('#al-grp button')) { el.click() } document.querySelector('#al-grp button').click();
    const r = document.getElementById('al-rows'); for (const v of [5, 8, 10]) { r.value = v; r.dispatchEvent(new Event('input')) } const c = document.getElementById('al-only'); c.click(); c.click() });
  await p.screenshot({ path: path.join(shots, `my-alter-${scheme}-${width}.png`), fullPage: true });
  // page JS against recompute.py
  const js = await p.evaluate(() => ({ win: RD_WIN, bt: Object.fromEntries(Object.entries(RD_BT).map(([k, s]) => { const st = s[s.length - 1]; const C = 6; const used = st.leaves.reduce((a, l) => a + l.length, 0); return [k, { leaves: st.leaves.length, splits: st.splits, fill: Math.round(100 * used / (st.leaves.length * C)) }] })), norm: { N: RD_NORM.N, K: RD_NORM.K, BUG: RD_NORM.BUG }, M: SM_DATA.M }));
  say(JSON.stringify(js.win.vals) === JSON.stringify(RC.win) && JSON.stringify(js.win.ids) === JSON.stringify(RC.win_ids), `${scheme}: window animation values equal recompute.py`);
  say(JSON.stringify(js.bt) === JSON.stringify(RC.bt), `${scheme}: B-tree model equals recompute.py ${JSON.stringify(js.bt)}`);
  say(JSON.stringify(js.norm) === JSON.stringify(RC.norm), `${scheme}: normalisation counters equal recompute.py ${JSON.stringify(js.norm)}`);
  say(JSON.stringify(js.M) === JSON.stringify(RC.M), `${scheme}: numbers in the text equal recompute.py`);
  // every tab: NaN / undefined text, sideways scroll and its culprits
  for (const t of ['t-read', 't-ex', 't-alter', 't-more']) {
    await p.click(`button[data-t=${t}]`); await sleep(250);
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText; const W = innerWidth;
      const wide = [...el.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 1 && !e.closest('.tw,.tw2,pre,.hmwrap,.nav,.tabs') }).slice(0, 5).map(e => e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right));
      const q = [...el.querySelectorAll('button,span,td,b')].filter(e => e.children.length === 0 && e.textContent.trim() === '?').length;
      return { nan: /\bNaN\b/.test(txt) || q > 0, und: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > W, wide } }, t);
    say(!r.nan && !r.und, `${scheme} ${t}: no NaN, undefined or unfilled ? values`);
    say(!r.side, `${scheme} ${t}: no sideways scroll` + (r.side ? ' culprits ' + r.wide.join(' | ') : ''));
  }
  await p.click('button[data-t=t-read]'); await sleep(200);
  await p.screenshot({ path: path.join(shots, `my-read-${scheme}-${width}.png`), fullPage: true });
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  say(!errs.length && !box, `${scheme} ${width}: no script errors` + (errs.length || box ? ' ' + JSON.stringify(errs.concat(box ? [box] : [])) : ''));
  await p.close();
}
await b.close();
console.log(bad ? `${bad} problems` : 'all checks pass'); process.exit(bad ? 1 : 0);
