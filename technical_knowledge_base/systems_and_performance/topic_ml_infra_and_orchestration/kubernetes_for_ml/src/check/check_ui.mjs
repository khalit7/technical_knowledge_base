// Every control of every tab at 390 px dark and 920 px light: no page errors, no NaN / undefined / null in visible
// text, no sideways scroll. Also: the builder's manifests equal the shell generators' output, and the cycle tab's
// JavaScript scores equal src/recompute.py on the recorded runs and 60 other sequences.
// usage (from the repo root): node <this file> <page folder>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const dir = process.argv[2], src = dir + '/src', f = 'file://' + dir + '/index.html';
const sh = (s, ...a) => execFileSync('sh', [src + '/k8s/' + s, ...a], { encoding: 'utf8' });
const fails = [];
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
try {
  for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.setViewport({ width, height: 900 });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    await page.goto(f);
    const check = async where => {
      const r = await page.evaluate(() => {
        const t = [...document.querySelectorAll('.tab')].find(x => !x.hidden);
        const txt = t ? t.innerText : '';
        const bad = (txt.match(/\bNaN\b|\bundefined\b|\bnull\b/g) || []);
        return { bad: bad.slice(0, 3), side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, tab: t && t.id };
      });
      if (r.bad.length) fails.push(scheme + ' ' + where + ' text: ' + r.bad.join(','));
      if (r.side) fails.push(scheme + ' ' + where + ' sideways scroll');
    };
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabs button')].map(b => b.dataset.t));
    let clicks = 0;
    for (const t of tabs) {
      await page.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t);
      await check(t + ' open');
      // every segmented button, then every animation stepped to its end and back
      const segs = await page.evaluate(t => [...document.querySelectorAll('#' + t + ' .seg')].map((s, i) => [i, s.querySelectorAll('button').length]), t);
      for (const [si, nb] of segs) for (let b = 0; b < nb; b++) {
        await page.evaluate((t, si, b) => document.querySelectorAll('#' + t + ' .seg')[si].querySelectorAll('button')[b].click(), t, si, b); clicks++;
        const n = await page.evaluate(t => {
          let c = 0; document.querySelectorAll('#' + t + ' button[aria-label="Next step"]').forEach(x => { for (let i = 0; i < 80; i++) { x.click(); c++ } });
          document.querySelectorAll('#' + t + ' button[aria-label="Previous step"]').forEach(x => { x.click(); c++ });
          document.querySelectorAll('#' + t + ' .an-play').forEach(x => { x.click(); x.click(); c += 2 });
          return c }, t); clicks += n;
        await check(t + ' seg ' + si + '/' + b);
      }
      // sliders: every value
      clicks += await page.evaluate(t => { let c = 0; document.querySelectorAll('#' + t + ' input[type=range]').forEach(r => { for (let v = +r.min; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); c++ } }); return c }, t);
      await check(t + ' sliders');
      // predict buttons and details
      clicks += await page.evaluate(t => { let c = 0; document.querySelectorAll('#' + t + ' .pr .opts button, #' + t + ' details summary').forEach(b => { b.click(); c++ }); return c }, t);
      await check(t + ' predicts');
    }
    // the scheduling cycle's own-sequence mode (Reading section 3, closed block)
    await page.evaluate(() => { document.querySelector('#tabs button[data-t="t-read"]').click(); document.getElementById('km-cyc-det').open = true });
    for (const v of ['1,1,1,1,4,4', '4,4,4,4', '3,3,3', 'x', '2,2,2,2,2,2,2,2,2,2']) {
      await page.evaluate(v => { document.querySelector('#km-cyc-src button[data-m="own"]').click(); const i = document.getElementById('km-cyc-seq'); i.value = v; i.dispatchEvent(new Event('input'));
        const b = document.querySelector('#km-cyc-ctl button[aria-label="Next step"]'); for (let k = 0; k < 60; k++) b.click() }, v); clicks++;
      await check('cycle own ' + v);
    }
    // the builder: every combination of layer, policy and event, and a few sizes
    await page.evaluate(() => document.querySelector('#tabs button[data-t="t-kmb"]').click());
    const combos = await page.evaluate(() => {
      const L = [...document.querySelectorAll('#km-b-layer option')].map(o => o.value), out = [];
      for (const l of L) { const s = document.getElementById('km-b-layer'); s.value = l; s.dispatchEvent(new Event('change'));
        for (const p of [...document.querySelectorAll('#km-b-pol option')].map(o => o.value)) for (const e of ['ok', 'crash', 'evict']) for (const n of ['1', '2', '4']) out.push([l, p, e, n]) }
      return out });
    for (const [l, p, e, n] of combos) {
      await page.evaluate((l, p, e, n) => { const set = (id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change')) };
        set('km-b-layer', l); set('km-b-pol', p); set('km-b-ev', e); set('km-b-n', n); set('km-b-g', n === '4' ? '4' : '2') }, l, p, e, n); clicks++;
      await check('builder ' + [l, p, e, n].join('/'));
    }
    if (errs.length) fails.push(scheme + ' errors: ' + errs.slice(0, 3).join(' | '));
    console.log(scheme, width, 'tabs', tabs.length, 'clicks', clicks);
    // equality checks once
    if (scheme === 'dark') {
      const crash = ['--steps', '200', '--crash-rank', '1', '--crash-step', '20', '--no-resume'];
      const cases = [
        ['indexed none', sh('train-indexed-job.sh', 'km-e1', 'none'), ['indexed', 'km-e1', 'none', '']],
        ['indexed exit13ok crash', sh('train-indexed-job.sh', 'km-e2c', 'exit13ok', ...crash), ['indexed', 'km-e2c', 'exit13ok', crash.join(' ')]],
        ['indexed exit13', sh('train-indexed-job.sh', 'km-e2b', 'exit13', ...crash), ['indexed', 'km-e2b', 'exit13', crash.join(' ')]],
        ['indexed disrupt0', sh('train-indexed-job.sh', 'km-e2d2', 'disrupt0', '--steps', '200', '--step-sleep-ms', '150'), ['indexed', 'km-e2d2', 'disrupt0', '--steps 200 --step-sleep-ms 150']],
        ['jobset plain', sh('train-jobset.sh', 'km-e3a', 'plain', '-'), ['jobset', 'km-e3a', 'plain', '']],
        ['jobset policy', sh('train-jobset.sh', 'km-e3b', 'policy', '-', '--steps', '200', '--step-sleep-ms', '150'), ['jobset', 'km-e3b', 'policy', '--steps 200 --step-sleep-ms 150']],
        ['jobset queue', sh('train-jobset.sh', 'km-q', 'plain', 'km-lq'), ['jobsetq', 'km-q', 'plain', '']]];
      for (const [nm, want, a] of cases) {
        const got = await page.evaluate(a => a[0] === 'indexed' ? KMB.indexed(a[1], a[2], { extra: a[3] }) : KMB.jobset(a[1], a[2], a[0] === 'jobsetq' ? 'km-lq' : '-', { extra: a[3] }), a);
        if (got !== want) fails.push('builder manifest differs: ' + nm);
      }
      const tj = fs.readFileSync(src + '/k8s/e12-trainjob.yaml', 'utf8').split('\n').filter(l => !l.startsWith('#')).join('\n');
      if (await page.evaluate(() => KMB.trainjob('km-tj')) !== tj) fails.push('builder manifest differs: trainjob');
      const cases2 = JSON.parse(fs.readFileSync(src + '/out/cases.json', 'utf8')), sc = JSON.parse(fs.readFileSync(src + '/out/scores.json', 'utf8'));
      const res = await page.evaluate((cases2, sc) => {
        let bad = 0, n = 0; const W = ['mi-kind-worker', 'mi-kind-worker2', 'mi-kind-worker3'];
        for (const c of cases2) { const s = KMCYC.simulate(c.tag, c.seq, false); s.forEach((st, i) => { n++;
          const tot = W.map(w => { const r = st.rows.find(x => x.node === w); return r.fits ? r.total : null });
          if (JSON.stringify(tot) !== JSON.stringify(c.totals[i]) || (st.bound || null) !== c.bound[i]) bad++ }) }
        for (const tag of ['e6spread', 'e6pack']) { const s = KMCYC.simulate(tag, [2, 1, 1, 2, 2, 4], true); s.forEach((st, i) => { n++;
          const py = sc[tag].steps[i]; W.forEach(w => { const a = st.rows.find(x => x.node === w), b = py.rows.find(x => x.node === w); if (a.fits !== b.fits || (a.fits && a.total !== b.total)) bad++ }) }) }
        return { bad, n } }, cases2, sc);
      console.log('cycle JS against Python:', res.n - res.bad, 'of', res.n, 'pod steps agree');
      if (res.bad) fails.push('cycle JS differs from Python on ' + res.bad + ' steps');
    }
    await page.close();
  }
} finally { await browser.close(); }
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'OK: no errors, no NaN/undefined/null, no sideways scroll, manifests and scores agree');
process.exit(fails.length ? 1 : 0);
