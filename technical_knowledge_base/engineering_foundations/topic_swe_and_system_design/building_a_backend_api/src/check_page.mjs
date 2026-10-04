// Click every control at 390 px dark and 920 px light; check no errors, NaN, undefined or sideways scroll;
// compare the page's numbers with recompute.py; save element screenshots to ../.shots/.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/building_a_backend_api/src/check_page.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/building_a_backend_api');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(execSync('python3 recompute.py', { cwd: path.join(base, 'src') }).toString());
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const eq = (a, b, l) => { if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(l + ': page ' + JSON.stringify(a) + ' vs recompute ' + JSON.stringify(b)) };
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + path.join(base, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tab = async t => { await p.click('#tabs button[data-t="' + t + '"]'); await sleep(150) };
  const check = async label => {
    actions++;
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab')].map(x => x.innerText).join(' ');
      return { bad: /\bNaN\b|undefined|Infinity/.test(t), side: document.documentElement.scrollWidth > innerWidth, err: document.getElementById('jsErr').hidden === false };
    });
    if (r.bad) problems.push(w + ' ' + label + ': NaN/undefined in text');
    if (r.side) problems.push(w + ' ' + label + ': sideways scroll');
    if (r.err) problems.push(w + ' ' + label + ': error box shown');
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(100); await el.screenshot({ path: path.join(shots, 'el-' + name + '-' + w + '.png') }) } };
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await check(sel + ' ' + i) } };
  const toEnd = async ctl => { for (let i = 0; i < 12; i++) await p.evaluate(c => document.getElementById(c + '-f').click(), ctl) };
  await tab('t-read'); await check('load');
  // derived numbers in text
  const dv = await p.evaluate(() => ({ off: +document.querySelector('[data-v="pg.deep_off"]').textContent, ks: +document.querySelector('[data-v="pg.deep_ks"]').textContent }));
  eq(dv.off, ref.deep_off, 'deep offset ms'); eq(dv.ks, ref.deep_ks, 'deep keyset ms');
  const note = await p.$eval('#rd-pg-note', e => e.textContent); if (!note.includes(ref.ratio.toLocaleString('en-US'))) problems.push('ratio ' + ref.ratio + ' not in note');
  // anatomy: every exchange and a click on each line of the first
  for (const k of ['create', 'create_invalid', 'create_noauth', 'get_missing']) { await p.click('#rd-anat-seg button[data-m="' + k + '"]'); await sleep(30); await check('anat ' + k) }
  const nl = await p.$$eval('#rd-anat-res .ln', a => a.length);
  for (let i = 0; i < nl; i++) { await p.evaluate(i => document.querySelectorAll('#rd-anat-res .ln')[i].click(), i); const x = await p.$eval('#rd-anat-x', e => e.textContent); if (x.length < 20) problems.push('anat line ' + i + ' no explanation') }
  await shot('#rd-anat', 'anat');
  // drift animation
  for (const m of ['off', 'ks']) { await p.click('#rd-dr-seg button[data-m="' + m + '"]'); await toEnd('rd-dr-ctl'); await check('drift ' + m);
    const c = await p.$$eval('#rd-dr-cnt .stat .v', a => a.map(x => +x.textContent)); eq({ shown: c[0], dups: c[1], miss: c[2], read: c[3] }, ref.drift[m], 'drift ' + m); await shot('#rd-dr-card', 'drift-' + m) }
  await shot('#rd-pg-card', 'pgbars');
  // idempotency animation, all scenarios and modes, stepping through every step
  for (const s of ['lost', 'conc', 'diff']) for (const m of ['before', 'after']) {
    await p.click('#rd-id-scn button[data-m="' + s + '"]'); await p.click('#rd-id-seg button[data-m="' + m + '"]');
    for (let i = 0; i < 9; i++) { await p.evaluate(() => document.getElementById('rd-id-ctl-f').click()); await check('idem ' + s + m + i) }
    const c = await p.$$eval('#rd-id-cnt .stat .v', a => a.map(x => x.textContent)); eq(+c[2], ref.idem_charged[s][m], 'idem charged ' + s + ' ' + m);
    if (s === 'lost' || (s === 'conc' && m === 'after')) await shot('#rd-id-card', 'idem-' + s + '-' + m);
  }
  // JWT
  const jw = await p.evaluate(() => Object.fromEntries(Object.entries(window.__JWT.toks).map(([k, t]) => [k, [window.__JWT.naive(t)[0], window.__JWT.strict(t)[0]]])));
  eq(jw, { ok: [true, true], tamper: [false, false], none: [true, false] }, 'jwt naive/strict');
  await clickAll('#rd-jwt-seg button'); await shot('#rd-jwt-card', 'jwt');
  // webhook
  eq(await p.evaluate(() => window.__WH_OK), true, 'webhook signature verifies');
  eq(await p.evaluate(() => window.API_DATA.webhook.signature), ref.webhook_sig, 'webhook signature vs python');
  await p.evaluate(() => { const b = document.getElementById('rd-wh-body'); b.value = b.value.replace('msg_123', 'msg_124'); b.dispatchEvent(new Event('input')) });
  eq(await p.evaluate(() => window.__WH_OK), false, 'tampered webhook rejected'); await check('webhook tamper'); await shot('#rd-wh-card', 'webhook');
  await p.click('#rd-wh-reset'); eq(await p.evaluate(() => window.__WH_OK), true, 'webhook reset');
  // SSE replay
  await toEnd('rd-sse-ctl'); eq(await p.$eval('#rd-sse-ui', e => e.textContent.trim()), 'Here is a short reply.', 'sse final text'); await check('sse'); await shot('#rd-sse-card', 'sse');
  // versions
  await clickAll('#rd-ver-seg button'); await shot('#rd-ver-card', 'ver');
  // all anim play buttons and speed selects
  await clickAll('.an-play'); await sleep(300); await clickAll('.an-play');
  // nav links
  await clickAll('#rd-nav a');
  // wire lab
  await tab('t-wire'); await clickAll('#wl-list button');
  const wl = await p.$$eval('#wl-res .ln', a => a.length); for (let i = 0; i < wl; i++) await p.evaluate(i => document.querySelectorAll('#wl-res .ln')[i].click(), i);
  await check('wire lines'); await shot('#t-wire .card', 'wire');
  // breaking quiz: answer each "safe" then reset, then answer correctly
  await tab('t-break');
  const nq = await p.$$eval('#bk-list .q', a => a.length);
  for (let i = 0; i < nq; i++) await p.evaluate(i => document.querySelectorAll('#bk-list .q')[i].querySelector('button[data-k="safe"]').click(), i);
  await check('quiz answered'); const sc = await p.$eval('#bk-score', e => e.textContent); if (!sc.includes('Answered ' + nq + ' of ' + nq)) problems.push('quiz score ' + sc);
  await shot('#bk-list', 'quiz'); await p.click('#bk-reset'); await check('quiz reset');
  // further reading: links
  await tab('t-more');
  const bad = await p.$$eval('#t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).length); if (bad) problems.push(bad + ' links without target/rel');
  await check('more');
  await p.close();
}
await browser.close();
console.log(JSON.stringify({ actions, problems }, null, 1));
