// Click every control of ../index.html at 390 dark and 920 light; compare the page's JavaScript numbers with expected.json
// (from recompute.py) and check that the numbers written in the text appear. Card screenshots go to ../.shots/check-*.png.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/statistics/src/check_page.mjs
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
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m) } };

// ---- numbers written in the text (MathML splits formulas, so read the plain text) ----
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const tex = [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m => m[1]).join(' ');
const both = text + ' ' + tex;
const f = (v, d) => (+v).toFixed(d);
const must = [
  f(E.tiny_mu, 3), f(E.tiny_sd, 3), f(E.tiny_se30, 3), f(E.tiny_hw30, 3), f(E.tiny_skew, 2), f(E.tiny_mle_var_n5, 3), f(E.tiny_var, 3),
  f(E.s1_mean_a, 3), f(E.s1_mean_b, 3), f(E.s1_se10, 3), f(E.replication_capture * 100, 1), f(E.grid_normal_5_pct * 100, 1), f(E.grid_normal_5_t * 100, 1), f(Math.max(E.dd_even_maxgap, E.dd_decay05_maxgap, E.dd_decay1_maxgap) * 100, 1), f(E.shrink_mse_half, 2).slice(0, 3),
  f(E.sv_mle, 0), f(E.sv_unb, 3), f(E.sv_s, 3), f(E.sv_se, 3), f(E.t7, 3), f(E.sv_ci_lo, 2), f(E.sv_ci_hi, 2), f(E.sv_s_bias_n2_normal, 3),
  f(E.t4, 3), f(E.t29, 3), f(E.se500, 3), f(E.se2000, 3), f(E.hw500_196, 3), f(E.hw500_2se, 3), f(E.be_C, 4), f(E.logn_skew, 2), 
  f(E.boot_p_left_out * 100, 1), f(E.boot_p_left_out_inf * 100, 1), String(E.boot_distinct_n3),
  f(E.boot_tiny30_H_plugin, 3), f(E.boot_tiny30_H_boot_mean, 3), f(-E.boot_tiny30_H_boot_bias, 3), f(E.boot_tiny30_H_boot_corrected, 3),
  f(E.coin_one, 3), f(E.coin_two, 3), f(E.mcn1_chi, 2), f(E.mcn1_p, 2), f(E.mcn2_p, 3), f(E.mcn2_cc, 2), f(E.mcn2_cc_p, 3), f(E.mcn2_exact, 3), f(E.chi_crit, 2),
  f(E.paired_se, 4), f(E.paired_hw, 3), f(E.unpaired_se, 4), f(E.unpaired_hw196, 3), f(E.z80, 4), f(E.n_power, 1), f(E.power_n30_d05 * 100, 1),
  f(E.perm_mean, 4), String(E.perm_count), f(E.perm_p, 4), f(E.perm_t, 3), f(E.perm_t_p, 3), f(E.fwer20, 2), f(E.bonf20, 4),
  f(E.markov_tiny, 3), f(E.markov_true, 3), f(E.hoeff500, 2), f(E.hoeff_n, 1), f(E.clt500, 3), f(E.exact500, 3), f(E.gen_single, 4), f(E.gen_million, 4), f(E.cos_sd_1024, 3),
  f(E.ens_rho05, 2), f(E.dd_even_best_over[0], 3), f(E.dd_even_best_under[0], 3), f(E.dd_decay1_best_under[0], 3), f(E.dd_decay1_best_over[0], 3), String(E.dd_decay1_best_under[1]),
  f(E.dd_samplewise_n30, 3), f(E.dd_samplewise_n55, 2), f(E.dd_samplewise_n80, 2), f(E.dd_samplewise_n200, 2), f(E.dd_smin['40'], 3), f(E.dd_smin['10'], 2), f(E.dd_smin['100'], 2), f(E.dd_even_ridge01_p40, 1),
  f(E.cv.cov_errxy * 100, 1), f(E.cv.cov_erravg * 100, 1), f(E.cv.err_avg_n, 3), f(E.cv.sd_est, 3), f(E.cv.mean_naive_se, 3), f(-E.cv.corr_est_errxy, 3),
  f(E.bayes_post_mean, 3), f(E.bayes_ci_lo, 3), f(E.bayes_ci_hi, 3), f(E.bayes_p_gt_half, 3), f(E.bf_ev0, 5), f(E.bf_ev1, 4), f(E.bf10, 2), f(E.bf_post_h0, 3),
  f(E.overlap_sep, 2), f(E.overlap_needed, 2), f(E.overlap_p, 4),
  f(E.grid_normal_30_t * 100, 1), f(E.grid_tiny_30_t * 100, 1), f(E.grid_lognormal_5_t * 100, 1), f(E.grid_lognormal_30_t * 100, 1), f(E.grid_lognormal_30_pct * 100, 1), f(E.grid_lognormal_30_bca * 100, 1),
  f(E.grid_t3_10_bca * 100, 1), f(E.grid_t3_10_t * 100, 1), String(E.anim.normal30.cov_t), String(E.anim.tiny30.cov_t), String(E.anim.lognormal5.cov_t), String(E.anim.lognormal5.cov_z),
  f(E.peek['10'] * 100, 1), f(E.peek['100'] * 100, 1)];
for (const s of must) ok(both.includes(s), 'text number ' + s);
// the entropy table
for (const n of ['5', '10', '30']) for (const k of ['plugin', 'mm']) ok(text.includes(f(E['ent_' + k + '_' + n].mean, 3)), 'entropy table mean ' + k + ' ' + n);
ok(text.includes(f(E.ent_plugin_10.bias, 3)) && text.includes(f(E.ent_mm_5.mse, 4)) && text.includes(f(E.ent_plugin_5.mse, 4)), 'entropy table bias and mse');
// unpaired corrected figure and percentile n = 5
ok(text.includes('6.2 points'), 'corrected 6.2 points');
ok(!/\bNaN\b|undefined/.test(text), 'NaN or undefined in static text');

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await new Promise(r => setTimeout(r, 500));
  const tag = scheme + '-' + width;
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await el.screenshot({ path: path.join(shots, 'check-' + name + '-' + tag + '.png') }) } };
  const click = async sel => { await p.$eval(sel, e => e.click()) };
  const scrub = async (id, v) => p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }, v);
  const txt = async sel => p.$eval(sel, e => e.textContent);
  const noBad = async (sel, m) => { const t = await txt(sel); ok(!/NaN|undefined|Infinity/.test(t), m + ': ' + t.slice(0, 80)) };

  // CLT: every population, every step
  for (const d of ['tiny', 'exponential', 'lognormal', 'pareto15']) {
    await click('#rd-clt-seg button[data-m="' + d + '"]');
    for (let i = 0; i < 6; i++) { await scrub('rd-clt-ctl-s', i); await noBad('#rd-clt-cnt', 'clt ' + d + ' ' + i) }
    const t = await txt('#rd-clt-cnt'); const tc = E.clt_tcov[d]['1000'];
    ok(t.includes((100 * tc).toFixed(1) + '%'), 'clt tcov at n 1000 ' + d);
  }
  await scrub('rd-clt-ctl-s', 3); await shot('#rd-clt-card', 'clt');
  // CI animation: every scenario and multiplier, at the last step
  for (const k of ['normal30', 'tiny30', 'lognormal5']) for (const m of ['t', 'z']) {
    await click('#rd-ci-seg button[data-m="' + k + '"]'); await click('#rd-ci-meth button[data-m="' + m + '"]');
    for (const s of [0, 1, 50]) { await scrub('rd-ci-ctl-s', s); await noBad('#rd-ci-cnt', 'ci ' + k + m + s) }
    await scrub('rd-ci-ctl-s', 100);
    const got = await p.$eval('#rd-ci-cnt .stat:nth-child(2) .v', e => +e.textContent);
    ok(got === E.anim[k]['cov_' + m], 'ci count ' + k + ' ' + m + ': page ' + got + ' expected ' + E.anim[k]['cov_' + m]);
    if (m === 't') { const lo = await p.$eval('#rd-ci-cnt .stat:nth-child(3) .v', e => e.textContent); ok(lo.startsWith(String(E.anim[k].miss_low_t) + ' '), 'ci misses below ' + k + ' ' + lo) }
    if (k === 'lognormal5' && m === 't') await shot('#rd-ci-card', 'ci-lognormal5');
    if (k === 'normal30' && m === 't') await shot('#rd-ci-card', 'ci-normal30');
  }
  // bootstrap
  for (const k of ['tiny30', 'lognormal10']) {
    await click('#rd-bs-seg button[data-m="' + k + '"]'); const t = await txt('#rd-bs-cnt');
    const bb = E['boot_' + k]; ok(t.includes(bb.boot_sd.toFixed(3)) && t.includes(bb.true_sd.toFixed(3)) && t.includes(bb.ci.bca[1].toFixed(3)), 'boot numbers ' + k);
    await shot('#rd-bs-card', 'boot-' + k);
  }
  // bounds: every n
  for (let i = 0; i <= 16; i++) { await scrub('rd-conc-n', i); await noBad('#rd-conc-cnt', 'conc ' + i) }
  await scrub('rd-conc-n', 10); { const t = await txt('#rd-conc-cnt'); ok(t.includes(E.exact500.toPrecision(3).replace(/0+$/, '')) && t.includes(E.hoeff500.toPrecision(3)) && t.includes(E.clt500.toPrecision(3)), 'conc at 500: ' + t) }
  await shot('#rd-conc-card', 'conc');
  // double descent inline
  for (const m of ['0.1', '0']) { await click('#rd-dd-seg button[data-m="' + m + '"]'); await noBad('#rd-dd-cnt', 'dd inline ' + m) }
  { const t = await txt('#rd-dd-cnt'); ok(t.includes(E.dd_even_sim_p10.toFixed(3)) && t.includes(E.dd_even_sim_p100.toFixed(3)), 'dd inline numbers: ' + t) }
  await shot('#rd-dd-card', 'dd-inline');
  // peek table
  { const t = await txt('#rd-peek-tab'); ok(t.includes((100 * E.peek['10']).toFixed(1) + '%'), 'peek table') }

  // CI and test lab: every population, n and method set
  await click('#tabs button[data-t="t-lab"]');
  for (const d of ['normal', 'tiny', 'exponential', 'lognormal', 't3', 'pareto25']) {
    await click('#lab-dist button[data-m="' + d + '"]');
    for (const n of ['5', '10', '20', '30', '50', '100', '200']) { await click('#lab-n button[data-m="' + n + '"]'); await noBad('#lab-tab', 'lab ' + d + n) }
  }
  await click('#lab-dist button[data-m="lognormal"]'); await click('#lab-n button[data-m="5"]');
  { const t = await txt('#lab-tab'); ok(t.includes((100 * E.grid_lognormal_5_t).toFixed(1) + '%') && t.includes((100 * E.grid_lognormal_5_bca).toFixed(1) + '%'), 'lab lognormal 5') }
  for (const m of ['z', 'pct']) await p.$eval('#lab-meth input[value="' + m + '"]', e => { e.click() });
  await noBad('#lab-tab', 'lab after unchecking'); await shot('#lab-card', 'lab');
  for (const m of ['z', 'pct']) await p.$eval('#lab-meth input[value="' + m + '"]', e => { e.click() });
  // Double descent lab
  await click('#tabs button[data-t="t-dd"]');
  for (const k of ['even', 'decay05', 'decay1']) {
    await click('#dd-beta button[data-m="' + k + '"]');
    for (const l of ['0', '0.01', '0.1', '1']) {
      await click('#dd-lam button[data-m="' + l + '"]');
      for (const pv of [1, 39, 40, 41, 100]) { await scrub('dd-p', pv); const t = await txt('#dd-cnt'); ok(!/NaN|undefined/.test(t), 'dd lab ' + k + l + pv + ': ' + t.slice(0, 60)) }
    }
    await click('#dd-lam button[data-m="0"]'); await scrub('dd-p', 10);
    const t = await txt('#dd-cnt'); ok(t.includes(E['dd_' + k + '_theory_p10'].toFixed(3)) && t.includes(E['dd_' + k + '_sim_p10'].toFixed(3)), 'dd lab p10 ' + k + ': ' + t);
  }
  await scrub('dd-p', 40); await shot('#dd-card', 'ddlab');
  await click('#tabs button[data-t="t-more"]'); await click('#tabs button[data-t="t-read"]');
  const box = await p.$eval('#jsErr', e => e.hidden); ok(box, 'error box hidden ' + tag);
  ok(errs.length === 0, 'console errors ' + tag + ': ' + errs.join(' | '));
  await p.close();
}
await b.close();
console.log('checks', checks, 'fails', fails);
process.exit(fails ? 1 : 0);
