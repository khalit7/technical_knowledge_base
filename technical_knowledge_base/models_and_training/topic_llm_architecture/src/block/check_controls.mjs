// Block lab: click every control of #t-block at 390 px dark and 920 px light, step every animation to its end,
// fail on page errors, NaN/undefined/Infinity in the tab text, a visible #jsErr, or sideways scroll; screenshots to
// <page>/.shots/bl_*.png; a reduced-motion pass confirms nothing autoplays.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/src/block/check_controls.mjs <index.html>
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page_ = path.resolve(process.argv[2]); const shots = path.join(path.dirname(page_), '.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.goto('file://' + page_); await p.click('button[data-t=t-block]'); await sleep(300);
    const check = async (what) => {
      const r = await p.evaluate(() => { const t = document.getElementById('t-block');
        return { bad: (t.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/g) || []).join(','), side: document.documentElement.scrollWidth > innerWidth,
          box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent } });
      if (r.bad || r.side || r.box) errs.push(`${what}: ${r.bad} ${r.side ? 'sideways' : ''} ${r.box}`);
    };
    // every select option
    for (const id of ['bl-one-model', 'bl-walk-model', 'bl-walk-layer', 'bl-fl-model']) {
      const vals = await p.$$eval('#' + id + ' option', os => os.map(o => o.value));
      for (const v of vals) { await p.select('#' + id, v); await check(id + '=' + v); }
      await p.select('#' + id, vals[0]);
    }
    // walkthrough: every step for every block
    for (const L of ['0', '4']) { await p.select('#bl-walk-layer', L);
      for (let i = 0; i < 14; i++) { await p.$eval('#bl-walk-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await check('walk ' + L + ' step ' + i);
        if (L === '0' && (i === 0 || i === 4 || i === 13)) await p.$eval('#bl-walk', e => e.scrollIntoView()) , await (await p.$('#bl-walk')).screenshot({ path: path.join(shots, `bl_walk_${i}_${scheme}.png`) }); } }
    // flops: modes and slider
    for (const m of ['prefill', 'decode']) { await p.click(`#bl-fl-mode button[data-m=${m}]`);
      for (const v of ['7', '10', '13', '17', '20']) { await p.$eval('#bl-fl-slider', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check('flops ' + m + ' ' + v); } }
    await (await p.$('#bl-fl')).screenshot({ path: path.join(shots, `bl_flops_${scheme}.png`) });
    // norms animation
    for (const w of ['init', 'trained']) for (const k of ['median', 'token']) { await p.click(`#bl-nm-when button[data-m=${w}]`); await p.click(`#bl-nm-which button[data-m=${k}]`);
      const n = await p.$eval('#bl-nm-ctl-s', e => +e.max); for (let i = 0; i <= n; i++) { await p.$eval('#bl-nm-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); } await check('norm ' + w + k); }
    await (await p.$('#bl-nm')).screenshot({ path: path.join(shots, `bl_norm_${scheme}.png`) });
    for (const sel of ['#bl-lc-pick', '#bl-gn-pick']) { const ms = await p.$$eval(sel + ' button', bs => bs.map(x => x.dataset.m));
      for (const m of ms) { await p.click(`${sel} button[data-m="${m}"]`); await check(sel + m); } }
    await (await p.$('#bl-lc-svg')).screenshot({ path: path.join(shots, `bl_loss_${scheme}.png`) });
    await (await p.$('#bl-gn-svg')).screenshot({ path: path.join(shots, `bl_grad_${scheme}.png`) });
    // play/pause buttons and speed
    for (const c of ['bl-walk-ctl', 'bl-nm-ctl']) { await p.click('#' + c + '-p'); await sleep(200); await p.click('#' + c + '-p'); await p.click('#' + c + '-f'); await p.click('#' + c + '-b'); await p.select('#' + c + '-v', '2'); }
    // drills
    const nd = await p.$$eval('#t-block .bl-pr', x => x.length);
    for (let i = 0; i < nd; i++) await p.evaluate(i => document.querySelectorAll('#t-block .bl-pr')[i].querySelector('.bl-opts button').click(), i);
    await check('drills');
    await p.screenshot({ path: path.join(shots, `bl_full_${scheme}.png`), fullPage: true });
    console.log(scheme, width, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
  }
  // reduced motion: nothing autoplays
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page_); await p.click('button[data-t=t-block]'); await p.$eval('#bl-walk', e => e.scrollIntoView()); await sleep(4000);
  const s = await p.$eval('#bl-walk-ctl-s', e => e.value); console.log('reduced motion: walk step after 4 s =', s, s === '0' ? 'ok' : 'AUTOPLAYED'); if (s !== '0') fails++;
  await p.close();
} finally { await b.close(); }
console.log(fails ? 'FAIL ' + fails : 'ALL CLEAN'); process.exit(fails ? 1 : 0);
