// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll;
// screenshots each visual; and checks the Alert lab's JavaScript against src/recompute_out.json.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/observability/src/check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '..', 'index.html');
const out = process.argv[2] || path.resolve(here, '..', '.shots', 'ui');
fs.mkdirSync(out, { recursive: true });
const ref = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file);
  await sleep(300);
  await p.click('button[data-t=t-read]'); await sleep(200);
  const bad = async label => {
    const r = await p.evaluate(() => {
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box) { problems++; console.log(scheme, width, label, JSON.stringify(r)) }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({ path: path.join(out, `${name}-${scheme}-${width}.png`) }) } else { problems++; console.log('missing', sel) } };
  const clickAll = async (sel, label, after) => { const n = await p.$$eval(sel, x => x.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(40); await bad(label + ' ' + i); if (after) await after(i) } return n };
  const setRange = async (id, v) => p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v === 'min' ? e.min : v === 'max' ? e.max : v; e.dispatchEvent(new Event('input')) }, id, v);
  // ---- Reading ----
  await shot('#s-one', 'onescreen');
  await shot('#s-logs', 'logs');
  await clickAll('#pc-seg button', 'pc', async i => { if (i === 1) await shot('#pc-card', 'pc-incident') });
  for (const v of ['min', 'max', 900, 990]) { await setRange('hq-p', v); await sleep(30); await bad('hq ' + v) }
  await shot('#hq-card', 'hq');
  await shot('#pq-table', 'pq');
  for (const id of ['cd-r', 'cd-s', 'cd-i', 'cd-b']) for (const v of ['min', 'max']) { await setRange(id, v); await bad('cd ' + id + v) }
  await clickAll('#cd-seg button', 'cd');
  await shot('#cd-card', 'cd');
  await clickAll('#tr-typ .r', 'typ wf');
  await shot('#s-tr .card', 'typ');
  await clickAll('#tp-view span[data-k]', 'tp');
  for (const v of ['00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', '00-00000000000000000000000000000000-b7ad6b7169203331-01', 'ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', '00-0AF7651916CD43DD8448EB211C80319C-b7ad6b7169203331-01', 'garbage']) {
    await p.evaluate(v => { const e = document.getElementById('tp-in'); e.value = v; e.dispatchEvent(new Event('input')) }, v); await bad('tp ' + v)
  }
  await shot('#tp-card', 'tp');
  await shot('#sp-bars', 'samp'); await shot('#pf-flame', 'flame'); await shot('#pf-bench', 'bench');
  for (const m of ['a', 'b']) {
    await p.evaluate(m => document.querySelector('#ix-seg button[data-m=' + m + ']').click(), m); await sleep(50);
    const n = await p.$eval('#ix-ctl input[type=range]', x => +x.max + 1);
    await p.evaluate(() => { const s = document.getElementById('ix-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) });
    for (let i = 0; i < n; i++) { if (i) await p.evaluate(() => document.getElementById('ix-ctl-f').click()); await sleep(40); await bad('ix ' + m + i); if (i === 1 || i === 3 || i === 5) await shot('#ix-card', `ix-${m}-${i}`) }
    await p.evaluate(() => { document.getElementById('ix-ctl-b').click(); document.getElementById('ix-ctl-p').click(); document.getElementById('ix-ctl-p').click(); const s = document.getElementById('ix-ctl-v'); s.value = '2'; s.dispatchEvent(new Event('change')) });
  }
  await shot('#db-grid', 'dash');
  await shot('#tc-table', 'cost');
  await p.evaluate(() => document.querySelectorAll('#s-mist details').forEach(d => d.open = true));
  await shot('#s-mist', 'mist'); await shot('#s-gl', 'gloss');
  await bad('read');
  // ---- Alert lab ----
  await p.click('button[data-t=t-alab]'); await sleep(300);
  // engine check against Python
  const mism = await p.evaluate(ref => {
    const bad = [];
    for (const [k, v] of Object.entries(ref.lab)) {
      const [scen, slo] = k.split('|'); const r = ALAB.run(scen, +slo);
      if (Math.abs(r.budget_spent - v.budget_spent) > 1e-9) bad.push(k + ' budget');
      for (const [ap, a] of Object.entries(v.alerts)) for (const [sev, s] of Object.entries(a)) {
        const j = r.alerts[ap][sev]; if (!j || j.fires !== s.fires) { bad.push(k + ' ' + ap + ' ' + sev + ' fires'); continue }
        if (s.fires) for (const f of ['detect_s', 'reset_s', 'notifications', 'spent_at_detect']) if (Math.abs(j[f] - s[f]) > 1e-9) bad.push(k + ' ' + ap + ' ' + sev + ' ' + f + ' ' + j[f] + ' vs ' + s[f]);
      }
    }
    return bad;
  }, ref);
  if (mism.length) { problems++; console.log('ALAB mismatch', mism.slice(0, 10)) } else if (width === 390) console.log('alert lab JS matches recompute.py on', Object.keys(ref.lab).length, 'runs');
  const slos = await p.$$eval('#al-slo option', x => x.map(o => o.value));
  for (const s of slos) { await p.evaluate(s => { const e = document.getElementById('al-slo'); e.value = s; e.dispatchEvent(new Event('change')) }, s); await sleep(60); await bad('slo ' + s) }
  await p.evaluate(() => { const e = document.getElementById('al-slo'); e.value = '0.999'; e.dispatchEvent(new Event('change')) });
  for (const s of ['0.02', '0.1', '0.05']) { await p.evaluate(s => { const e = document.getElementById('al-sig'); e.value = s; e.dispatchEvent(new Event('change')) }, s); await sleep(40); await bad('sig ' + s) }
  await clickAll('#al-scen button', 'scen', async i => { if (i === 0 || i === 2 || i === 5) await shot('#al-chart', 'al-chart-' + i) });
  await clickAll('#al-view button', 'view'); await clickAll('#al-rsel button', 'rsel');
  await p.evaluate(() => document.querySelector('#al-scen button').click()); await sleep(50);
  await shot('#al-table', 'al-table'); await shot('#al-mx', 'al-mx'); await shot('#al-rule', 'al-rule'); await shot('#al-repro', 'al-repro');
  await bad('alab');
  // ---- Real telemetry ----
  await p.click('button[data-t=t-real]'); await sleep(300);
  await clickAll('#rl-quick button', 'quick');
  const dots = await p.$$eval('#rl-scat .tdot', x => x.length);
  for (let i = 0; i < dots; i += 4) { await p.evaluate(i => document.querySelectorAll('#rl-scat .tdot')[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await sleep(30); await bad('dot ' + i) }
  await shot('#rl-scat', 'rl-scat'); await shot('#rl-trace', 'rl-trace');
  await clickAll('#rl-seg button', 'rl-seg', async i => { await sleep(100); if (i === 1) { await clickAll('#rl-fmt button', 'fmt'); await shot('#rl-met', 'rl-met') } if (i === 2) await shot('#rl-pq', 'rl-pq'); if (i === 3) { await clickAll('#rl-cfgsel button', 'cfg'); await shot('#rl-cfg', 'rl-cfg') } });
  await bad('real');
  // ---- Further reading ----
  await p.click('button[data-t=t-more]'); await sleep(200); await shot('#t-more', 'more'); await bad('more');
  const ext = await p.$$eval('a[href^="http"]', as => as.filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).length);
  if (ext) { problems++; console.log('external links without target/rel:', ext) }
  if (errs.length) { problems++; console.log(scheme, width, 'errors', errs.slice(0, 5)) }
  await p.close();
}
await b.close();
console.log('problems', problems);
