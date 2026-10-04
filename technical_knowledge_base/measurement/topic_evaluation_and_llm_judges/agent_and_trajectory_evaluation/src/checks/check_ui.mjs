// Click every control on every tab at 390 dark and 920 light; fail on script errors, NaN/undefined text, sideways scroll;
// compare the page's computations (window.ATJ_OUT, window.ATJ_MATCH5) with src/recompute.json; save screenshots.
// Run from the repo root: node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/agent_and_trajectory_evaluation/src/checks/check_ui.mjs [shotdir]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/agent_and_trajectory_evaluation');
const shots = process.argv[2] || path.join(os.tmpdir(), 'atj_shots'); fs.mkdirSync(shots, { recursive: true });
const REF = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'recompute.json')));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: w, height: 900 });
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await pg.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) { } });
  await pg.goto('file://' + path.join(dir, 'index.html'));
  const scan = async (label) => {
    const r = await pg.evaluate(() => {
      const t = [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.innerText).join(' ');
      const m = t.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      return { bad: m ? m[0] : null, sx: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        err: (document.getElementById('jsErr') || {}).hidden === false };
    });
    if (r.bad) problems.push(`${w} ${label}: text ${r.bad}`);
    if (r.sx) problems.push(`${w} ${label}: sideways scroll`);
    if (r.err) problems.push(`${w} ${label}: error box shown`);
    actions++;
  };
  // numbers against recompute.json (once)
  if (w === 390) {
    const o = await pg.evaluate(() => ({ out: window.ATJ_OUT, m5: window.ATJ_MATCH5 }));
    for (const k of ['gpt52', 'opus45']) for (const f of Object.keys(REF[k])) if (JSON.stringify(o.out[k][f]) !== JSON.stringify(REF[k][f])) problems.push(`calc ${k}.${f}: page ${JSON.stringify(o.out[k][f])} python ${JSON.stringify(REF[k][f])}`);
    for (const f of ['agree_msg_state', 'agree_state_steps', 'agree_msg_steps', 'agree_state_writes', 'tasks_0_of_8', 'tasks_8_of_8', 'tasks_mixed', 'devai_cost_share', 'devai_time_share', 'statem_after_flags'])
      if (JSON.stringify(o.out[f]) !== JSON.stringify(REF[f])) problems.push(`calc ${f}: page ${JSON.stringify(o.out[f])} python ${JSON.stringify(REF[f])}`);
    let n = 0; for (const k of Object.keys(REF.match5)) { n++; if (o.m5[k] !== REF.match5[k]) problems.push(`match5 ${k}: page ${o.m5[k]} python ${REF.match5[k]}`) }
    console.log('compared', n, 'matcher verdicts and', Object.keys(REF.gpt52).length * 2 + 10, 'computed values');
  }
  await scan('load');
  await pg.screenshot({ path: path.join(shots, `read_top_${w}.png`) });
  // animation: every case, every lens, step to the end
  const cases = await pg.$$eval('#an-case option', os => os.map(o => o.value));
  for (const c of cases) {
    await pg.select('#an-case', c);
    for (const l of ['all', 'msg', 'state', 'steps']) {
      await pg.click(`#an-lens button[data-l="${l}"]`);
      const n = await pg.$eval('#an-scrub', e => +e.max);
      for (let j = 0; j < n; j += Math.max(1, Math.floor(n / 6))) { await pg.click('#an-fwd'); await scan(`anim ${c} ${l} ${j}`) }
      await pg.evaluate(() => window.ATJ_ANIM.end()); await scan(`anim ${c} ${l} end`);
    }
    await pg.click('#an-lens button[data-l="all"]');
    await pg.evaluate(() => window.ATJ_ANIM.end());
    const el = await pg.$('#an'); await el.screenshot({ path: path.join(shots, `anim_${c.replace(/\//g, '_')}_${w}.png`) });
  }
  await pg.click('#an-back'); await pg.click('#an-play'); await wait(1200); await pg.click('#an-play'); await scan('anim play');
  await pg.$eval('#an-scrub', e => { e.value = 3; e.dispatchEvent(new Event('input')) }); await scan('anim scrub');
  // task strip
  const tasks = await pg.$$('#taskStrip button'); for (const b of tasks.slice(0, 50)) { await b.click(); actions++ } await scan('task strip');
  for (const id of ['nullBars', 'taskStrip', 'costBars']) { const e = await pg.$('#' + id); await e.screenshot({ path: path.join(shots, `${id}_${w}.png`) }) }
  // grade tab
  await pg.click('#tabs button[data-t="t-grade"]'); await scan('grade');
  await pg.screenshot({ path: path.join(shots, `grade_${w}.png`), fullPage: true });
  const gs = ['msg', 'state', 'steps', 'writes', 'reward'];
  for (const a of gs) for (const b of gs) {
    await pg.select('#gr-a', a); await pg.select('#gr-b', b);
    for (const c of ['11', '10', '01', '00']) {
      await pg.click(`#gr-m22 button[data-c="${c}"]`);
      const t = await pg.$('#gr-list .tlist button'); if (t) { await t.click(); }
      await scan(`grade ${a} ${b} ${c}`);
    }
  }
  for (const m of ['gpt52', 'opus45', 'all']) for (const t of ['change', 'null', 'all']) { await pg.select('#gr-m', m); await pg.select('#gr-t', t); await pg.click('#gr-m22 button[data-c="10"]'); await scan(`grade filter ${m} ${t}`) }
  // jump from a case to the animation
  await pg.select('#gr-a', 'state'); await pg.select('#gr-b', 'msg'); await pg.click('#gr-m22 button[data-c="01"]');
  const cs = await pg.$('#gr-list .tlist button.cs'); if (cs) { await cs.click(); const go = await pg.$('#gr-go'); if (go) { await go.click(); await scan('jump to anim') } else problems.push('no jump button'); } else problems.push('no case trial in state 0 / msg 1 cell');
  // match tab
  await pg.click('#tabs button[data-t="t-match"]'); await scan('match');
  for (const m of ['gpt52', 'opus45']) for (const wr of ['0', '1']) for (const s of ['agree', 'pass']) {
    await pg.select('#mt-m', m); await pg.select('#mt-w', wr); await pg.select('#mt-s', s);
    const nc = (await pg.$$('#mt-grid td[data-m]')).length; for (let q = 0; q < nc; q++) { const c = (await pg.$$('#mt-grid td[data-m]'))[q]; await c.click(); actions++ }
    await scan(`match ${m} ${wr} ${s}`);
  }
  await pg.screenshot({ path: path.join(shots, `match_${w}.png`), fullPage: true });
  await pg.click('#tabs button[data-t="t-more"]'); await scan('more');
  await pg.screenshot({ path: path.join(shots, `more_${w}.png`), fullPage: true });
  // internal links
  await pg.click('#tabs button[data-t="t-read"]');
  const nl = (await pg.$$('#t-read a[data-tab]')).length; for (let q = 0; q < nl; q++) { const l = (await pg.$$('#t-read a[data-tab]'))[q]; await l.click(); await scan('data-tab link'); await pg.click('#tabs button[data-t="t-read"]') }
  if (errs.length) problems.push(`${w}: errors ${errs.join(' | ')}`);
  await pg.close();
}
await browser.close();
fs.writeFileSync(path.join(dir, 'src', 'checks', 'check_ui.log'), (problems.length ? problems.join('\n') : 'OK') + `\nactions ${actions}\n`);
console.log(problems.length ? problems.join('\n') : 'OK', '\nactions', actions, '\nshots in', shots);
