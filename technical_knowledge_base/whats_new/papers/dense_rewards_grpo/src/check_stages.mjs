// Layout and motion check for this page's two step animations (no 3D stages: nothing here is spatial; see viz_ideas.md).
// At 1400 light, 920 light and 390 dark: every split is two columns at 1400 and stacked below 1100; each animation card sits in the right
// column of a split whose left column holds its step list; it plays once half in view, pauses while off screen (its step does not change),
// resumes on return, stops at its last step, and never moves under reduced motion. Fig. 2's step list quotes the credits the figure draws.
// usage (from the repo root, with CHROME_PATH set): node technical_knowledge_base/whats_new/papers/dense_rewards_grpo/src/check_stages.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html') + '#t-read';
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const problems = []; const wait = ms => new Promise(r => setTimeout(r, ms));
const ANIMS = [['drYard', 'sx-yard', 4], ['drMC', 'sx-mc', 6]];
for (const [scheme, width, rm] of [['light', 1400, false], ['light', 920, false], ['dark', 390, false], ['light', 1400, true]]) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}${rm ? ' reduced-motion' : ''}`;
  const lay = await p.evaluate(() => [...document.querySelectorAll('#t-read .s3sp')].map(s => getComputedStyle(s).display));
  if (width === 1400 && lay.some(d => d !== 'grid')) problems.push(`${tag}: ${lay.filter(d => d !== 'grid').length} splits not two columns`);
  if (width < 1100 && lay.some(d => d === 'grid')) problems.push(`${tag}: a split is two columns below 1100`);
  const step = id => p.$eval('#' + id + 'Ctl-s', e => +e.value);
  for (const [id, list, n] of ANIMS) {
    const ok = await p.evaluate((id, list) => { const c = document.getElementById(id), sp = c.closest('.s3sp'); return !!sp && !!c.closest('.s3R') && !!sp.querySelector('.s3L #' + list) }, id, list);
    if (!ok) problems.push(`${tag}: ${id} is not in the right column of the split that holds ${list}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    if (rm) { await wait(4000); if (await step(id) !== 0) problems.push(`${tag}: ${id} moved under reduced motion`); continue }
    // off screen it pauses
    await p.evaluate(() => window.scrollTo(0, 0)); const s0 = await step(id); await wait(5000);
    if (await step(id) !== s0) problems.push(`${tag}: ${id} kept stepping off screen`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(800);
    for (let k = 0; k < n + 2 && await step(id) < n - 1; k++) await wait(4300);
    if (await step(id) !== n - 1) problems.push(`${tag}: ${id} did not reach its last step`);
    const t = await p.$eval('#' + id + 'Ctl-p', e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: ${id} still playing at its last step`);
  }
  if (width === 1400 && !rm) {
    const F2 = await p.evaluate(() => window.DR_FIG2), txt = await p.$eval('#sx-mc', e => e.innerText);
    const vals = F2.ph.slice(1, 6).map(v => v === 1 ? '4/4' : (v * 4) + '/4');
    for (const v of vals) if (!txt.includes(v)) problems.push('Fig. 2 list lacks value ' + v);
  }
  if (errs.length) problems.push(`${tag}: ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('check_stages:', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
