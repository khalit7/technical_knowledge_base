// node src/attn/check_controls.mjs <page index.html> [shots dir]   (run from the repo root)
// Clicks every control of the Attention lab at 390 px dark and 920 px light: every animation variant stepped to the
// last token, curve and bench toggles, every sink window, every model in the KV calculator with every context, batch and
// format, table rows, every drill option, all details opened. Fails on page errors, a visible #jsErr, NaN/undefined/
// Infinity in the tab text, or sideways scroll. Also checks that nothing autoplays under prefers-reduced-motion.
// One browser, closed at the end.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]); const shots = process.argv[3]; if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + page); await p.click('button[data-t=t-attn]'); await sleep(300);
    const check = async (what) => {
      const r = await p.evaluate(() => {
        const t = document.getElementById('t-attn'); const txt = t.innerText;
        const bad = (txt.match(/\b(NaN|undefined|Infinity)\b/g) || []);
        const side = document.documentElement.scrollWidth > innerWidth + 1;
        const box = document.getElementById('jsErr'); return { bad: bad.slice(0, 3), side, box: box.hidden ? '' : box.textContent };
      });
      if (r.bad.length || r.side || r.box) errs.push(`${what}: ${r.bad.join(',')} ${r.side ? 'sideways' : ''} ${r.box}`);
    };
    if (rm === 'reduce') {
      await p.evaluate(() => document.getElementById('at-an-card').scrollIntoView()); await sleep(3500);
      const i = await p.$eval('#at-an-ctl-s', e => e.value); if (i !== '0') errs.push('animation moved under reduced motion: step ' + i);
      console.log(scheme, width, rm, errs.length ? errs : 'clean'); fail += errs.length; await p.close(); continue;
    }
    // animation: every variant, stepped to the end, plus a short play
    for (const v of ['gqa4', 'gqa2', 'mqa', 'mla', 'swa']) {
      await p.click(`#at-an-seg button[data-m=${v}]`);
      const n = await p.$eval('#at-an-ctl-s', e => +e.max); for (let i = 0; i < n; i++) await p.click('#at-an-ctl-f');
      await check('anim ' + v);
      if (shots && (v === 'gqa2' || v === 'swa')) { await p.evaluate(() => document.getElementById('at-an-card').scrollIntoView()); await sleep(150); await p.screenshot({ path: path.join(shots, `${scheme}_${width}_anim_${v}.png`) }); }
    }
    await p.click('#at-an-ctl-b'); await p.click('#at-an-ctl-p'); await sleep(1800); await p.click('#at-an-ctl-p'); await check('anim play');
    for (const m of ['train', 'eval']) { await p.click(`#at-cv-seg button[data-m=${m}]`); await check('curves ' + m); }
    for (const m of ['gbps', 'ms']) { await p.click(`#at-bench-seg button[data-m=${m}]`); await check('bench ' + m); }
    for (const m of ['16', '64', '32']) { await p.click(`#at-sink-seg button[data-m="${m}"]`); await check('sink ' + m); }
    // calculator
    const models = await p.$$eval('#at-kv-model option', os => os.map(o => o.value));
    for (const m of models) { await p.select('#at-kv-model', m); await check('kv ' + m); }
    await p.select('#at-kv-model', 'gemma-3-27b');
    for (const [id, vals] of [['at-kv-ctx', ['0', '3', '6', '9']], ['at-kv-b', ['0', '5', '9']]]) for (const v of vals) {
      await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v); await check(id + '=' + v); }
    for (const id of ['at-kv-kvb', 'at-kv-wb', 'at-kv-gpu']) { const vs = await p.$$eval('#' + id + ' option', os => os.map(o => o.value)); for (const v of vs) { await p.select('#' + id, v); await check(id + '=' + v); } }
    const rows = await p.$$eval('#at-real tr[data-k]', t => t.map(r => r.dataset.k));
    for (const k of rows.slice(0, 5)) await p.click(`#at-real tr[data-k="${k}"]`);
    await check('real table');
    // drills: every option, then skip links
    const nb = await p.$$eval('#at-drills .at-opts button', bs => bs.length);
    for (let i = 0; i < nb; i++) await p.$$eval('#at-drills .at-opts button', (bs, i) => bs[i].click(), i);
    await check('drills');
    const unfilled = await p.$$eval('#at-drills .at-ans', as => as.filter(a => a.textContent.trim().length < 20).length);
    if (unfilled) errs.push(unfilled + ' drill answers empty');
    const ok = await p.$$eval('#at-drills .at-pr', ps => ps.filter(pr => !pr.querySelector('button[data-ok]')).length);
    if (ok) errs.push(ok + ' drills without a right answer');
    await p.evaluate(() => document.querySelectorAll('#t-attn details').forEach(d => d.open = true)); await check('details open');
    if (shots) {
      await p.select('#at-kv-model', 'llama-3.1-8b');
      for (const s of ['at-s1', 'at-s3', 'at-runs-card', 'at-s4', 'at-bench-card', 'at-sink-card', 'at-s7', 'at-kv-card', 'at-real', 'at-s9', 'at-mist', 'at-s10']) {
        await p.evaluate(id => document.getElementById(id).scrollIntoView(), s); await sleep(200);
        await p.screenshot({ path: path.join(shots, `${scheme}_${width}_${s}.png`) });
      }
    }
    console.log(scheme, width, errs.length ? errs.slice(0, 20) : 'clean'); fail += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(fail ? 1 : 0);
