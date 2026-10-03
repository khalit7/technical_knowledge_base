// Exercise every control of the PEFT page in light 920 px and dark 390 px; screenshot each card; report errors and NaN/undefined text.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/peft/src/check_page.mjs [outdir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => problems.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} document.querySelector('button[data-t=t-read]').click() });
  const bad = async where => { const t = await p.evaluate(() => document.body.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity|null%).{0,40}/); if (m) problems.push(scheme + ' ' + where + ': ' + m[0]); };
  const click = async (sel, where) => { const els = await p.$$(sel); for (const e of els) { await e.evaluate(x => { x.scrollIntoView({ block: 'center' }); x.click() }); actions++; await wait(60); await bad(where + ' ' + sel) } };
  const shot = async (sel, name) => { const e = await p.$(sel); if (e) { const vis = await e.evaluate(x => [x.getBoundingClientRect().height, [...document.querySelectorAll('.tab')].filter(t=>!t.hidden).map(t=>t.id).join()]); if (!vis[0]) { problems.push(scheme + ' hidden ' + sel + ' ' + vis); return } await e.evaluate(x => x.scrollIntoView({ block: 'start' })); await wait(150); await e.screenshot({ path: path.join(out, name + '-' + scheme + '.png') }) } };
  // reading: matrix animation, both modes, every step, every rank
  for (const m of ['lora', 'full']) {
    await click(`#mxM button[data-m=${m}]`, 'mx');
    for (const r of ['1', '4', '16', '64']) { await p.select('#mxR', r); actions++;
      for (let i = 0; i < 5; i++) { await click('#mxCtl-f', 'mx step') } }
    await shot('#mx', 'mx-' + m);
    await click('#mxCtl-b', 'mx back');
  }
  await p.select('#mxR', '16');
  for (const m of ['r90', 'rel', 'e16']) { await click(`#hmM button[data-m=${m}]`, 'hm') }
  const cells = await p.$$('#hmP rect[data-i]'); for (const i of [0, 7, 100, 209]) { await cells[i].evaluate(x => x.dispatchEvent(new MouseEvent('click', { bubbles: true }))); actions++; await bad('hm cell') }
  await shot('#hm', 'hm');
  for (const m of ['code_cpt', 'math_cpt', 'code_ift', 'math_ift']) { await click(`#bdM button[data-m=${m}]`, 'bd'); for (let i = 0; i < 8; i++) await click('#bdCtl-f', 'bd step') }
  await shot('#bd', 'bd');
  for (const m of ['lora', 'dora']) { await click(`#drM button[data-m=${m}]`, 'dr'); for (let i = 0; i < 6; i++) await click('#drCtl-f', 'dr step'); await shot('#dr', 'dr-' + m) }
  for (const s of ['S1', 'S2', 'S4']) await click(`#slS button[data-s=${s}]`, 'sl');
  await shot('#sl', 'sl');
  // scrubbers and play
  await click('#mxCtl-p', 'play'); await wait(300); await click('#mxCtl-p', 'pause');
  // parameter tab
  await click('button[data-t=t-count]', 'tab');
  const pres = await p.$$('#pcRep button[data-p]');
  for (let i = 0; i < pres.length; i++) { await pres[i].evaluate(x => x.click()); actions++; await wait(50); await bad('preset ' + i);
    problems.push('INFO ' + scheme + ' preset ' + i + ': ' + await p.$eval('#pcRepOut', e => e.innerText)) }
  for (const m of ['Llama 3 8B', 'Qwen3-8B', 'Mistral 7B v0.3', 'Qwen3-30B-A3B', 'LLaMA 7B', 'LLaMA 13B', 'GPT-3 175B', 'SmolLM2-135M']) {
    await p.select('#pcM', m); actions++; await bad('model ' + m);
    for (const v of ['0', '5', '10']) { await p.$eval('#pcR', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); actions++; await bad('rank ' + v) }
  }
  await click('#pcQV', 'qv'); await click('#pcAll', 'all'); await click('#pcT input[data-t=gate]', 'tg');
  await click('#pcVs', 'vs');
  for (const id of ['#pcB', '#pcN', '#pcV']) { await p.$eval(id, e => { e.value = '0'; e.dispatchEvent(new Event('input')) }); actions++; await bad(id) }
  await p.select('#pcM', 'Llama 3 8B'); await click('#pcAll', 'all');
  const lib = await p.$$eval('#pcTab .warn', es => es.length); if (lib) problems.push(scheme + ' PEFT mismatch shown ' + lib);
  await shot('#pc', 'pc');
  await click('button[data-t=t-more]', 'tab');
  const links = await p.$$eval('#t-more a', as => as.filter(a => !(a.target === '_blank' && a.rel.includes('noopener'))).length); if (links) problems.push('links without target ' + links);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) problems.push(scheme + ' sideways scroll');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) problems.push('error box: ' + box);
  await p.close();
}
await b.close();
const real = problems.filter(x => !x.startsWith('INFO'));
console.log(problems.filter(x => x.startsWith('INFO')).join('\n'));
console.log('actions', actions, 'problems', real.length); real.forEach(x => console.log('  ' + x));
