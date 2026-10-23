// node technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/src/game/check_game.mjs [shots dir]
// Run from the repository root (puppeteer comes from html_utils). Checks the "Fit the model" tab (t-game):
//  1. nothing animates before interaction (normal and reduced motion), and opening the tab changes no move;
//  2. every level's stored reference solution fits, meets the brief, and has the lowest score of any winning
//     combination of moves (brute force over every card the level offers);
//  3. the game's per-user cache, weights and fit agree with the KV-cache calculator tab driven to the same settings;
//  4. at least one level cannot be won with the brief's GPUs and users (adding a GPU or cutting users is the answer);
//  5. every quoted quality number is still on the page it is credited to;
//  6. every card button in every level, at 390 px dark and 920 px light: no errors, no NaN / undefined, no sideways
//     scroll, no visible #jsErr. Screenshots of each solved level go to the shots dir if given.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const H = path.dirname(new URL(import.meta.url).pathname), PAGE = path.join(H, '../../index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 5. quoted numbers are still where they are credited
const read = d => fs.readdirSync(d).filter(f => /\.(html|js)$/.test(f)).map(f => fs.readFileSync(path.join(d, f), 'utf8')).join('\n');
const AV = read(path.join(H, '../../../attention_variants/src/parts'));
const BT = read(path.join(H, '../../../../../systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling/src/parts'));
const LCP = read(path.join(H, '../parts'));
for (const [txt, where, name] of [['MMLU MHA 45.2, GQA-8 41.2, MQA 37.9', AV, 'Attention variants'], ['MMLU 50.0 against 48.7', AV, 'Attention variants'],
  ['15.6K against 110.6K', AV, 'Attention variants'], ['17.49 ms, GQA-8 5.97 ms, absorbed MLA 3.43 ms, MQA 1.54 ms', AV, 'Attention variants'],
  ['15.18 with q8_0, and 19.42 with q4_0', BT, 'Batching'], ['0% of 16-token blocks freed', LCP, 'Long context'],
  ['minimal impact on perplexity', LCP, 'Long context'], ['at least one standard attention KV cache that is computed in the deeper layers', LCP, 'Long context'],
  ['48,068 bytes per token', LCP, 'Long context'], ['a pattern of 5 local layers for every global layer', AV, 'Attention variants'],
  ['reduces the cache memory usage by 8x', LCP, 'Long context'], ['5% of original pre-training compute', AV, 'Attention variants']])
  ok(where.includes(txt), `quote not found on ${name}: ${txt}`);

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  // 1. no animation before interaction
  for (const rm of ['no-preference', 'reduce']) {
    const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
    await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
    await p.goto('file://' + PAGE); await sleep(300);
    const before = await p.evaluate(() => JSON.stringify(FGU.st));
    await p.click('button[data-t=t-game]'); await sleep(900);
    const r = await p.evaluate(() => ({ anims: document.getAnimations().filter(a => document.getElementById('t-game').contains(a.effect && a.effect.target)).length,
      flash: document.querySelectorAll('#t-game .fg-flash').length, st: JSON.stringify(FGU.st), li: FGU.li }));
    ok(r.anims === 0 && r.flash === 0, `${rm}: ${r.anims} animations, ${r.flash} flashes before any click`);
    ok(r.st === before && r.li === 0, `${rm}: opening the tab changed the board`);
    await p.close();
  }
  // 2, 3, 4: references, calculator agreement, brute force
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.goto('file://' + PAGE); await sleep(300);
  const levels = await p.evaluate(() => FGL.map((L, i) => {
    const DES = L.cards.includes('des') && L.retrain ? ['cfg', 'mha', 'gqa8', 'mqa', 'mla'] : ['cfg'];
    if (L.cards.includes('win') && L.retrain) DES.push('swa', 'lg51');
    const KV = L.cards.includes('prec') ? [2, 1, 0.5625] : [2], KEEP = L.cards.includes('evict') ? [1, 0.5, 0.25, 0.125] : [1];
    const NS = [1, 2, 4, 8, 16].filter(n => n <= L.maxN);
    let min = Infinity, winsAtBrief = 0, minAt = null;
    for (const des of DES) for (const kvb of KV) for (const keep of KEEP) for (const n of NS) {
      const s = { des, kvb, keep, n, users: L.users }, e = FG.evaluate(L, s);
      if (e.win) { if (n === L.n) winsAtBrief++; if (e.score < min) { min = e.score; minAt = s; } }
    }
    const rs = FG.refState(L), re = FG.evaluate(L, rs);
    return { i, name: L.name, model: L.model, ctx: L.ctx, gpu: L.gpu, wdt: L.wdt, users: L.users, rs, win: re.win, fits: re.m.fits, score: re.score,
      unp: re.q.unp.length, min, minAt, winsAtBrief, one: LC.gb(re.m.one), W: re.m.W, need: re.m.need, cap: re.m.cap };
  }));
  for (const L of levels) {
    ok(L.win && L.fits, `level ${L.i + 1}: reference does not win`);
    ok(L.score <= L.min + 1e-9, `level ${L.i + 1}: a winning combination scores ${L.min} below the reference ${L.score}: ${JSON.stringify(L.minAt)}`);
    // the calculator tab, driven to the same settings
    await p.click('button[data-t=t-kv]');
    const c = await p.evaluate((L) => {
      const $ = id => document.getElementById(id), set = (id, v) => { $(id).value = String(v); $(id).dispatchEvent(new Event('change')); };
      set('kc-model', L.model); set('kc-des', L.rs.des); set('kc-kdt', L.rs.kvb); set('kc-keep', L.rs.keep); set('kc-gpu', L.gpu); set('kc-ngpu', L.rs.n); set('kc-wdt', L.wdt);
      $('kc-ctx').value = String(Math.log2(L.ctx)); $('kc-ctx').dispatchEvent(new Event('input'));
      const st = [...document.querySelectorAll('#kc-stats .stat')].map(s => [s.querySelector('.k').textContent, s.querySelector('.v').childNodes[0].textContent.trim()]);
      return { st, ngpuOk: $('kc-ngpu').value === String(L.rs.n), ctx: $('kc-ctxv').textContent };
    }, L);
    const seqV = c.st.find(s => s[0].startsWith('One sequence'))[1], fitV = +c.st.find(s => s[0] === 'Sequences that fit')[1].replace(/,/g, '');
    ok(c.ngpuOk, `level ${L.i + 1}: calculator has no ${L.rs.n}-GPU option`);
    ok(seqV === L.one, `level ${L.i + 1}: one user's cache ${L.one} in the game, ${seqV} in the calculator`);
    ok(fitV >= L.users, `level ${L.i + 1}: calculator fits ${fitV} sequences, the brief needs ${L.users}`);
    console.log(`level ${L.i + 1} ${L.name}: reference ${JSON.stringify(L.rs)} score ${L.score}${L.unp ? ' (+' + L.unp + ' unpriced)' : ''}, best possible ${L.min}; ` +
      `one user ${L.one} (calculator ${seqV}), calculator fits ${fitV} of ${L.users}; wins with the brief's GPUs and users: ${L.winsAtBrief}`);
  }
  ok(levels.some(L => L.winsAtBrief === 0), 'no level needs a GPU or fewer users');
  await p.close();
  // 6. every button, both themes and widths; screenshots of solved levels
  for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
    const q = await b.newPage(); const errs = [];
    q.on('pageerror', e => errs.push('pageerror ' + e.message)); q.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await q.setViewport({ width, height: 900 }); await q.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await q.goto('file://' + PAGE); await sleep(300); await q.click('button[data-t=t-game]'); await sleep(200);
    let clicks = 0;
    for (let i = 0; i < levels.length; i++) {
      await q.click(`#fg-lv button[data-l="${i}"]`);
      const n = await q.$$eval('#fg-cards button[data-c]', bs => bs.length);
      for (let k = 0; k < n; k++) { await q.evaluate(k => { const x = document.querySelectorAll('#fg-cards button[data-c]')[k]; if (x && !x.disabled) x.click(); }, k); clicks++; }
      const bad = await q.$eval('#t-game', el => (el.innerText.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/) || [''])[0]);
      const side = await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (bad || side) errs.push(`level ${i + 1}: ${bad} ${side ? 'sideways' : ''}`);
      await q.click('#fg-show'); await sleep(50);
      const won = await q.$eval('#fg-db', d => !d.hidden); if (!won) errs.push(`level ${i + 1}: no debrief after Show a solution`);
      if (shots) await q.screenshot({ path: path.join(shots, `game-L${i + 1}-${scheme}-${width}.png`), fullPage: true });
      await q.click('#fg-reset');
    }
    const box = await q.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
    console.log(scheme, width, clicks, 'card clicks', errs.length ? errs : 'clean'); errs.forEach(e => fails.push(e)); await q.close();
  }
} finally { await b.close(); }
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'check_game: all checks pass'); process.exit(fails.length ? 1 : 0);
