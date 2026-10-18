// node src/calc/check_controls.mjs <page index.html> [shots dir]
// Clicks every control of the Config calculator tab at 390 px dark and 920 px light: every model, every attention
// variant, every comparison model, sliders, dtype selects, both animations to their last step, every drill, table rows,
// and a pasted config (valid and invalid). Fails on page errors, a visible #jsErr, NaN/undefined/Infinity in the tab text
// or sideways scroll. One browser, closed at the end.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]); const shots = process.argv[3]; if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fail = 0;
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + page); await p.click('button[data-t=t-calc]'); await new Promise(r => setTimeout(r, 300));
    const check = async (what) => {
      const r = await p.evaluate(() => {
        const t = document.getElementById('t-calc'); const txt = t.innerText;
        const bad = (txt.match(/\b(NaN|undefined|Infinity)\b/g) || []);
        const side = document.documentElement.scrollWidth > innerWidth + 1;
        const box = document.getElementById('jsErr'); return { bad: bad.slice(0, 3), side, box: box.hidden ? '' : box.textContent };
      });
      if (r.bad.length || r.side || r.box) errs.push(`${what}: ${r.bad.join(',')} ${r.side ? 'sideways' : ''} ${r.box}`);
    };
    if (rm === 'reduce') {
      await p.evaluate(() => document.getElementById('cc-moecard').scrollIntoView()); await new Promise(r => setTimeout(r, 3500));
      const i = await p.$eval('#cc-moectl-s', e => e.value); if (i !== '0') errs.push('MoE animation moved under reduced motion: step ' + i);
      console.log(scheme, width, rm, errs.length ? errs : 'clean'); fail += errs.length; await p.close(); continue;
    }
    const models = await p.$$eval('#cc-model option', os => os.map(o => o.value));
    for (const m of models) {
      await p.select('#cc-model', m);
      for (const v of ['cfg', 'mha', 'mqa']) { await p.select('#cc-var', v); }
      await p.select('#cc-var', 'cfg');
      // step both animations to the end
      for (const id of ['cc-anctl', 'cc-moectl']) { const n = await p.$eval('#' + id + '-s', e => +e.max); for (let i = 0; i < n; i++) await p.click('#' + id + '-f'); }
      await check('model ' + m);
    }
    const cmps = await p.$$eval('#cc-cmp option', os => os.map(o => o.value));
    await p.select('#cc-model', 'deepseek-v3');
    for (const c of cmps) { await p.select('#cc-cmp', c); } await check('compare all');
    for (const [id, vals] of [['cc-ctx', ['8', '12', '17', '20']], ['cc-b', ['0', '4', '8']]]) for (const v of vals) {
      await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v); await check(id + '=' + v); }
    for (const id of ['cc-wdt', 'cc-kdt']) { const vs = await p.$$eval('#' + id + ' option', os => os.map(o => o.value)); for (const v of vs) { await p.select('#' + id, v); await check(id + '=' + v); } }
    // play the context animation briefly
    await p.evaluate(() => document.getElementById('cc-ctxcard').scrollIntoView()); await p.click('#cc-anctl-p'); await new Promise(r => setTimeout(r, 2500)); await p.click('#cc-anctl-p'); await check('ctx play');
    // drills: one wrong pick and one Show me each
    const nd = await p.$$eval('#cc-drills .cc-pr', d => d.length);
    for (let i = 0; i < nd; i++) { await p.click(`#cc-drills .cc-pr[data-i="${i}"] button[data-j="0"]`); await p.click(`#cc-drills .cc-pr[data-i="${i}"] button[data-j="-1"]`); }
    await check('drills');
    // table rows
    const rows = await p.$$eval('#cc-val a[data-k]', as => as.map(a => a.dataset.k));
    for (const k of rows.slice(0, 6)) await p.click(`#cc-val a[data-k="${k}"]`);
    await check('table');
    // paste: valid edit and invalid text
    await p.evaluate(() => { document.querySelector('#cc-s-pick details').open = true; });
    await p.select('#cc-model', 'llama-3.1-8b'); await p.click('#cc-load');
    await p.$eval('#cc-paste', e => { e.value = e.value.replace('"num_key_value_heads": 8', '"num_key_value_heads": 32'); }); await p.click('#cc-run');
    const msg = await p.$eval('#cc-pmsg', e => e.textContent); if (!/Computed/.test(msg)) errs.push('paste valid: ' + msg);
    await p.$eval('#cc-paste', e => { e.value = '{"foo": 1'; }); await p.click('#cc-run');
    const msg2 = await p.$eval('#cc-pmsg', e => e.className); if (!/bad/.test(msg2)) errs.push('paste invalid not reported');
    await check('paste');
    // open all details and check again
    await p.evaluate(() => document.querySelectorAll('#t-calc details').forEach(d => d.open = true)); await check('details open');
    if (shots) {
      await p.select('#cc-model', 'deepseek-v3'); await p.select('#cc-cmp', 'llama-3.1-8b');
      for (const s of ['cc-s-pick', 'cc-s-where', 'cc-s-fm', 'cc-s-ctx', 'cc-s-moe', 'cc-s-drill', 'cc-s-check']) {
        await p.evaluate(id => document.getElementById(id).scrollIntoView(), s); await new Promise(r => setTimeout(r, 200));
        await p.screenshot({ path: path.join(shots, `${scheme}_${width}_${s}.png`) });
      }
    }
    console.log(scheme, width, errs.length ? errs.slice(0, 20) : 'clean'); fail += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(fail ? 1 : 0);
