// Exercise every control of the page in both themes and three widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll, overlapping SVG labels,
// the two step animations (Fig. 1 and Fig. 2, RD.anim) playing once half in view, stopping on a reader control, not moving under reduced motion,
// one step-list item per step, every closed block opened, and prose numbers against the figures' data and inputs/recompute.json.
// Element screenshots go to <page>/.shots/.
// usage (from the repo root, with CHROME_PATH set): node technical_knowledge_base/whats_new/papers/dense_rewards_grpo/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html') + '#t-read';
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs/recompute.json')));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ANIMS = [['drYard', 'sx-yard', 4], ['drMC', 'sx-mc', 6]];
for (const [scheme, width, rm] of [['light', 1400, false], ['light', 920, false], ['dark', 390, false], ['light', 1400, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto(file); await wait(400);
  const tag0 = `${scheme} ${width}${rm ? ' reduced-motion' : ''}`;
  const audit = async where => {
    const r = await p.evaluate(() => {
      const small = [], over = [];
      document.querySelectorAll('.tab:not([hidden]) svg').forEach(svg => {
        const ts = [...svg.querySelectorAll('text')].filter(t => t.getBoundingClientRect().width > 0);
        ts.forEach(t => { const m = svg.getScreenCTM(); const fs = parseFloat(getComputedStyle(t).fontSize) * (m ? m.a : 1); if (fs < 10.95) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1)) });
        for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
          const a = ts[i].getBoundingClientRect(), c = ts[j].getBoundingClientRect();
          const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ox > 3 && oy > 4) over.push(ts[i].textContent.slice(0, 20) + ' / ' + ts[j].textContent.slice(0, 20));
        }
        const sb = svg.getBoundingClientRect(), host = svg.parentElement.getBoundingClientRect();
        if (sb.right > host.right + 1) over.push('svg wider than its box: ' + (svg.getAttribute('aria-label') || '').slice(0, 30));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = vis.match(/.{0,30}\b(NaN|undefined|Infinity|null)\b.{0,30}/g) || [];
      const box = document.getElementById('jsErr');
      return { small: [...new Set(small)].slice(0, 6), over: [...new Set(over)].slice(0, 6), bad, side: document.documentElement.scrollWidth > innerWidth, eb: box && !box.hidden ? box.textContent : '' };
    });
    const tag = `${tag0} ${where}`;
    if (r.small.length) problems.push(`${tag}: text under 11px: ${r.small.join(' | ')}`);
    if (r.over.length) problems.push(`${tag}: overlapping labels: ${r.over.join(' | ')}`);
    if (r.bad.length) problems.push(`${tag}: ${r.bad.join(' | ')}`);
    if (r.side) problems.push(`${tag}: sideways scroll`);
    if (r.eb) problems.push(`${tag}: error box: ${r.eb}`);
  };
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++; await wait(80) };
  const shot = async (id, name) => { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `${name}-${scheme}-${width}.png`) }) };
  const step = id => p.$eval('#' + id + 'Ctl-s', e => +e.value);
  const playTxt = id => p.$eval('#' + id + 'Ctl-p', e => e.textContent);
  // nothing moves before it is in view; each animation plays once at least half in view (never under reduced motion)
  for (const [id, list, n] of ANIMS) {
    if (await step(id) !== 0) problems.push(`${tag0}: ${id} moved before it was in view`);
    const items = await p.$eval('#' + list, e => e.children.length);
    if (items !== n) problems.push(`${tag0}: ${id} has ${n} steps but ${items} list items`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await playTxt(id);
    if (rm && /Pause/.test(t)) problems.push(`${tag0}: ${id} plays under reduced motion`);
    if (!rm && !/Pause/.test(t)) problems.push(`${tag0}: ${id} did not start when half in view (button "${t}")`);
    if (!rm) { await wait(4600); if (await step(id) < 1) problems.push(`${tag0}: ${id} did not advance`); await shot(id, id + '-auto') }
    else { await wait(4500); if (await step(id) !== 0) problems.push(`${tag0}: ${id} advanced under reduced motion`) }
    // a reader control stops it for good
    await clk('#' + id + 'Ctl-f'); const s1 = await step(id); await wait(4500);
    if (await step(id) !== s1) problems.push(`${tag0}: ${id} kept moving after a reader control`);
    // every step through the list, audited and shot
    for (let i = 0; i < n; i++) { await p.$eval('#' + list, (e, i) => e.children[i].click(), i); actions++; await wait(rm ? 80 : 760); await audit(`${id} step ${i + 1}`); if (width !== 920) await shot(id, `${id}-s${i + 1}`) }
    const cur = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag0}: ${id} list marks item ${cur + 1} at the last step`);
  }
  // Fig. 1's yardstick buttons
  for (const m of [2, 0, 3, 1]) { await clk(`#drYardM button[data-m="${m}"]`); await wait(rm ? 60 : 760); if (await step('drYard') !== m) problems.push(`${tag0}: yardstick button ${m} did not move the animation`); await audit('yardstick ' + m) }
  // static figures
  for (const id of ['drBud', 'drOver', 'drCand']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200); await audit(id); await shot(id, id) }
  await p.$$eval('details', ds => ds.forEach(d => d.open = true)); actions++;
  await audit('read, every block open');
  await shot('hero', 'card');
  if (width === 920) {
    const txt = await p.$eval('#t-read', e => e.innerText);
    const F1 = await p.evaluate(() => window.DR_FIG1), F4 = await p.evaluate(() => window.DR_FIG4);
    const sx = await p.$eval('#sx-yard', e => e.innerText);
    const fmt = v => Math.abs(v).toFixed(1);
    for (const [ri, ci] of [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [0, 1], [1, 1], [5, 1], [6, 1], [7, 1], [7, 2], [2, 3], [4, 3], [3, 3]])
      if (!sx.includes(fmt(F1[ri].v[ci][0]))) problems.push(`Fig. 1 list lacks ${F1[ri].n} step ${ci + 1}: ${fmt(F1[ri].v[ci][0])}`);
    for (const r of F4) if (!txt.includes(r[1].toFixed(1))) problems.push('prose lacks Fig. 4 value ' + r[1]);
    const F2 = await p.evaluate(() => window.DR_FIG2), mcl = await p.$eval('#sx-mc', e => e.innerText);
    for (const v of F2.credit) { const s = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2).replace(/^0\.00$/, '0'); if (!mcl.includes(s === '0' ? ' 0 ' : s)) problems.push('Fig. 2 list lacks credit ' + s) }
    for (const w of [RC.agree + ' of ' + RC.n, (Math.min(...Object.values(RC.roll)) / 1000).toFixed(1) + 'k to ' + (Math.max(...Object.values(RC.roll)) / 1000).toFixed(1) + 'k'])
      if (!txt.includes(w)) problems.push('prose lacks recompute value ' + w);
  }
  // the tables tab
  await clk('#tabs button[data-t="t-tables"]'); await wait(200); await audit('tables open');
  const nb = await p.$$eval('#drBlk option', o => o.length);
  for (let i = 0; i < nb; i++) { await p.$eval('#drBlk', (e, i) => { e.selectedIndex = i; e.dispatchEvent(new Event('change')) }, i); actions++; await audit('block ' + i) }
  const rcs = await p.$eval('#drRcSum', e => e.innerText); if (!rcs.includes(RC.agree + ' of ' + RC.n)) problems.push('tables summary ' + rcs);
  await clk('#tabs button[data-t="t-more"]'); await wait(200); await audit('more open');
  await clk('#tabs button[data-t="t-read"]'); await wait(200);
  if (errs.length) problems.push(`${tag0}: ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('check_page:', actions, 'actions;', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
