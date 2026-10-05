// Click every control of ../index.html at 390 dark and 920 light; compare the page's JavaScript numbers with expected.json
// (from recompute.py) and check that the numbers written in the text appear. Screenshots go to ../.shots/check-*.png.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/probability/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const E = JSON.parse(fs.readFileSync(path.join(here, 'expected.json'), 'utf8'));
const file = path.resolve(here, '../index.html');
const html = fs.readFileSync(file, 'utf8');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m) } };
const near = (a, b, tol, m) => ok(Math.abs(+a - +b) <= tol, m + ': page ' + a + ' expected ' + b);

// numbers written in the text (MathML splits formulas, so check the plain text of the page)
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const must = [E.bayes_precision, E.umb_post, E.umb_corr, E.umb_cov, E.tiny_entropy, E.die_var, E.tot_var, E.binom_sd, E.pois_p3, E.beta22_sd,
  E.bce_spam_pos, E.bce_spam_neg, E.gauss_nll, E.laplace_nll, E.pois_nll, E.pois_model_part, E.ps_log_07, E.ps_log_09, E.ps_log_05,
  E.unb_var, E.ridge_mle, E.ridge_map, E.map_logit_coin, E.coin3_post_sd, E.coin3_tails_bayes, E.coin_neg_log_evidence, E.exp_invcdf_u05_l2,
  E.mc_entropy_sd, E.mc_entropy_se100, E.gauss_peak_sd01, E.p_within_1sd, E.Phi1,
  ...E.gumbel_g, ...E.gumbel_zg, ...E.exp_race_E, ...E.exp_race_ratio, ...E.topp09.slice(0, 2), ...E.temp_2, ...E.is_weights, ...E.bigram_add1, ...E.tiny_cov[0]];
const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(Math.max(2, (String(v).split('.')[1] || '').length))) : String(v);
for (const v of must) { const s = fmt(Math.abs(v)); ok(text.includes(s), 'text number ' + s) }
ok(!/\bNaN\b|undefined/.test(text), 'NaN or undefined in static text');

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  const tag = scheme + width;
  const click = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error('no ' + s); e.click() }, sel);
  const setRange = (sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }, sel, v);
  const ds = (sel, k) => p.$eval(sel, (e, k) => e.dataset[k], k);
  // ---- Reading: base rates
  near(await ds('#rd-br-dots', 'prec'), E.bayes_precision, 1e-9, tag + ' base-rate default');
  await setRange('#rd-br-f', 0.5); near(await ds('#rd-br-dots', 'prec'), E.br_fpr05, 1e-9, tag + ' fpr 0.5%');
  await setRange('#rd-br-f', 5); await setRange('#rd-br-b', 6); near(await ds('#rd-br-dots', 'prec'), E.br_base20, 1e-9, tag + ' base 20%');
  for (const id of ['#rd-br-b', '#rd-br-t', '#rd-br-f']) for (const v of ['0', '7', '50', '100', '20']) { await setRange(id, v) }
  ok(!/NaN|undefined/.test(await p.$eval('#rd-br-out', e => e.textContent)), tag + ' base-rate extremes');
  // ---- Reading: MVN
  ok(await ds('#rd-mvn-svg', 'eig') === E.mvn_eig.map(v => v.toFixed(2)).join(','), tag + ' mvn eigenvalues');
  near(await ds('#rd-mvn-svg', 'l21'), E.chol_L[1][0], 1e-9, tag + ' cholesky l21'); near(await ds('#rd-mvn-svg', 'l22'), E.chol_L[1][1], 1e-9, tag + ' cholesky l22');
  for (const [id, v] of [['#rd-mvn-r', '-0.95'], ['#rd-mvn-a', '2'], ['#rd-mvn-b', '0.3'], ['#rd-mvn-r', '0']]) await setRange(id, v);
  ok(!/NaN|undefined/.test(await p.$eval('#rd-mvn-out', e => e.textContent)), tag + ' mvn controls');
  // ---- Reading: coin, both modes, every step
  for (const m of ['bayes', 'mle']) {
    await click('#rd-coin-seg button[data-m="' + m + '"]');
    for (let i = 0; i < E.coin_steps.length; i++) {
      await setRange('#rd-coin-ctl-s', i); const s = E.coin_steps[i];
      if (m === 'bayes') {
        near(await ds('#rd-coin-svg', 'mean'), s.mean, 1e-9, tag + ' coin mean ' + i); near(await ds('#rd-coin-svg', 'lo'), s.lo, 1e-9, tag + ' coin lo ' + i);
        near(await ds('#rd-coin-svg', 'hi'), s.hi, 1e-9, tag + ' coin hi ' + i); near(await ds('#rd-coin-svg', 'cb'), s.cum_bayes, 1e-9, tag + ' coin loss ' + i)
      }
      ok(!/NaN|undefined/.test(await p.$eval('#rd-coin-card', e => e.textContent)), tag + ' coin text ' + m + i);
    }
  }
  for (const id of ['#rd-coin-ctl-b', '#rd-coin-ctl-f', '#rd-coin-ctl-p', '#rd-coin-ctl-p']) await click(id);
  // ---- Reading: sampler
  for (const m of ['inv', 'gum']) {
    await click('#rd-smp-seg button[data-m="' + m + '"]');
    await setRange('#rd-smp-ctl-s', 7); const fr = (await ds('#rd-smp-svg', 'freq')).split(',').map(Number);
    fr.forEach((v, i) => near(v, E.tiny_p[i], 0.012, tag + ' sampler ' + m + ' word ' + i));
    for (let i = 0; i < 8; i++) { await setRange('#rd-smp-ctl-s', i); ok(!/NaN|undefined/.test(await p.$eval('#rd-smp-card', e => e.textContent)), tag + ' sampler text ' + m + i) }
  }
  await p.screenshot({ path: path.resolve(here, '../.shots/check-read-' + tag + '.png') });
  // ---- Distribution explorer
  await click('button[data-t="t-dist"]');
  const keys = Object.keys(E.dx);
  for (const k of keys) {
    await click('#dx-seg button[data-m="' + k + '"]'); const x = E.dx[k];
    const mean = await ds('#dx-svg1', 'mean');
    if (Array.isArray(x.mean)) ok(mean === x.mean.map(v => v.toFixed(3)).join(','), tag + ' dx ' + k + ' mean ' + mean);
    else { near(mean, x.mean, 1e-4, tag + ' dx ' + k + ' mean'); near(await ds('#dx-svg1', 'var'), x.var, 1e-4, tag + ' dx ' + k + ' var') }
    if (x.loss !== undefined) {
      near(await ds('#dx-svg2', 'loss'), x.loss, 1.5e-3, tag + ' dx ' + k + ' loss');
      if (x.grad !== undefined) near(await ds('#dx-svg2', 'grad'), x.grad, 1.5e-3, tag + ' dx ' + k + ' grad');
      near(await ds('#dx-svg2', 'grad'), await ds('#dx-svg2', 'num'), 2e-3, tag + ' dx ' + k + ' analytic vs numerical');
    }
    // every slider to its min and max, then more samples
    const ids = await p.$$eval('#dx-ctl input, #dx-lctl input', es => es.map(e => [e.id, e.min, e.max]));
    for (const [id, mn, mx] of ids) { await setRange('#' + id, mn); await setRange('#' + id, mx) }
    if (await p.$('#dx-kv')) for (const v of ['0', '1', '2']) await p.select('#dx-kv', v);
    await click('#dx-draw'); await click('#dx-reset');
    const t = await p.$eval('#t-dist', e => e.textContent); ok(!/NaN|undefined|Infinity/.test(t), tag + ' dx ' + k + ' text after controls');
    if (k === 'cat' || k === 'gauss') await p.screenshot({ path: path.resolve(here, '../.shots/check-dist-' + k + '-' + tag + '.png'), fullPage: false });
  }
  // ---- Calibration
  await click('button[data-t="t-cal"]');
  for (const k of Object.keys(E.calib)) {
    await click('#cal-seg button[data-m="' + k + '"]'); await setRange('#cal-t', 10);
    near(await ds('#cal-svg', 'ece'), E.calib[k].T1.ece, 1e-4, tag + ' cal ' + k + ' ECE'); near(await ds('#cal-svg', 'nll'), E.calib[k].T1.nll, 1e-4, tag + ' cal ' + k + ' NLL');
    ok(await ds('#cal-svg', 'bestT') === E.calib[k].bestT, tag + ' cal ' + k + ' best T');
    for (const v of [0, 30, 11]) await setRange('#cal-t', v);
    ok(!/NaN|undefined/.test(await p.$eval('#t-cal', e => e.textContent)), tag + ' cal text ' + k);
  }
  await click('button[data-t="t-more"]');
  ok(errs.length === 0, tag + ' script errors: ' + errs.join(' | '));
  ok(await p.evaluate(() => document.getElementById('jsErr').hidden), tag + ' error box hidden');
  await p.close();
}
await b.close();
console.log('checks', checks, 'fails', fails);
process.exit(fails ? 1 : 0);
