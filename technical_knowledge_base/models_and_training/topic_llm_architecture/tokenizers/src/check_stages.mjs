// The 2026-11-06 rollout checks for Tokenizers (2026-11-10), adapted from Positional encodings' check_stages.mjs: the five 3D stages (Fig. 1 the
// sentence through the tokenizer, Fig. 2 BPE trained on the running story, Fig. 3 encoding one word, Fig. 4 the vocabulary tables, Fig. 5 the
// language tax) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen
// and never move under reduced motion; the BLT patch animation (2D, RD.anim) plays in view with one list item per step; the two widgets (merge
// replay, three trainers) never play by themselves; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one
// below 1100 px; the numbers written in the step lists are what the page's data and engines give.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/tokenizers/src/check_stages.mjs [shots dir] [--all] [--only=stg-x] [--fast]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all'), FAST = args.includes('--fast');
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-bpe', 'stg-enc', 'stg-voc', 'stg-tax'].filter(s => !only || s === only);
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of (FAST ? [['light', 1400]] : [['light', 1400], ['light', 920], ['dark', 390]])) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity|pending)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  // only the stages that are off screen now
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx, noshot) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && !noshot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4), '');
  if (!only) { // the BLT patch rows (2D, RD.anim): one list item per step, plays by itself once in view; the two widgets never play
    const r = await p.evaluate(() => [document.getElementById('sx-patch').children.length, +document.getElementById('tk-patchCtl-s').max + 1]);
    if (r[0] !== r[1]) problems.push(`${tag}: patch animation has ${r[1]} steps but ${r[0]} list items`);
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); await p.$eval('#tk-patch', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const pl = await p.$eval('#tk-patchCtl-p', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: patch animation did not play in view (${pl})`);
    if (shoot) await (await p.$('#tk-patch')).screenshot({ path: `${shots}/x-tk-patch-${scheme}-${width}.png` });
    for (const w of ['tk-grow', 'tk-trn']) { await p.$eval('#' + w, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#' + w + 'Ctl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push(`${tag}: widget ${w} plays by itself`); }
  }
  if (width === 1400 && !only) { // the numbers the step lists write are what the page's data and engines give
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const N = TKN, P = N.pipe, f = v => v.toLocaleString('en-US');
      // Fig. 1
      const nb = P.words.reduce((s, w) => s + w.bytes.length, 0), ids = P.ids_from_library;
      if (TKG.encode(P.sentence, N.bpe.n_merges).join() !== ids.join()) out.push('hero: page encoder differs from the library ids');
      need('sx-hero', 0, P.sentence.length + ' characters'); need('sx-hero', 1, nb + ' bytes'); need('sx-hero', 2, P.words.length + ' chunks');
      need('sx-hero', 3, ids.length + ' tokens'); need('sx-hero', 4, '[' + ids.join(', ') + ']'); need('sx-hero', 4, (nb / ids.length).toFixed(1) + ' times');
      need('sx-hero', 6, (2 * 4096 * 256 / 1e6).toFixed(2) + 'M FLOPs');
      // Fig. 2: the page's trainer on the running story
      const T = TOKALG.bpeTrain([N.bpe.run.text], 32), H = T.hist, sh = s => s.replace(/Ġ/g, ' ');
      need('sx-bpe', 0, N.bpe.run.bytes + ' bytes'); need('sx-bpe', 1, '"' + sh(H[0].a + H[0].b) + '" ' + H[0].c + ' times'); need('sx-bpe', 1, 'to ' + H[0].total + ' symbols');
      need('sx-bpe', 2, H[2].total + ' symbols'); need('sx-bpe', 3, H[9].total + ' symbols'); need('sx-bpe', 4, H[12].total + ' symbols'); need('sx-bpe', 5, 'to ' + H[31].total + ' symbols');
      if (sh(H[12].a + H[12].b) !== 'Roxy') out.push('bpe: merge 13 is not Roxy');
      const ch = TOKALG.pretok.byteLevel(P.sentence), n32 = ch.reduce((s, w) => s + TOKALG.bpeApply(w, T.merges, 32).length, 0); need('sx-bpe', 5, n32 + ' tokens');
      // Fig. 3
      const E = TKS_ENC.W1; need('sx-enc', 5, 'id ' + E[E.length - 1].ids[0]); if (E[E.length - 1].ids[0] !== P.ids_from_library[6]) out.push('enc: climb id differs from the library');
      const rk = E.slice(0, -1).map(s => s.pairs[s.best] + 1); [20, 45, 237, 748, 758].forEach((r, i) => { if (rk[i] !== r) out.push('enc: merge ' + i + ' is ' + rk[i]) });
      if (TKS_ENC.W2[0].pairs.some(r => r >= 0)) out.push('enc: Roxy has a ranked pair');
      // Fig. 4
      const pc = v => Math.round(100 * v) + '%'; TKS_VOC.forEach((m, i) => need('sx-voc', i, pc(m.share))); need('sx-voc', 5, pc(TKS_VOC[5].flops));
      need('sx-voc', 0, N.compare.running.ours + ' tokens'); need('sx-voc', 1, N.compare.running.gpt2 + ' tokens'); need('sx-voc', 3, pc(TKS_VOC[3].flops));
      // Fig. 5
      const X = TKS_TAX, nm = { fra_Latn: 'French', rus_Cyrl: 'Russian', zho_Hans: 'Chinese', hin_Deva: 'Hindi', tam_Taml: 'Tamil', mya_Mymr: 'Burmese' };
      need('sx-tax', 0, X.cnt('eng_Latn', 'gpt2') + ' tokens'); need('sx-tax', 0, X.by('eng_Latn') + ' bytes');
      Object.entries(nm).forEach(([c, n]) => need('sx-tax', 1, n + ' ' + X.cnt(c, 'gpt2')));
      need('sx-tax', 1, X.prem('tam_Taml', 'gpt2').toFixed(1)); need('sx-tax', 1, X.prem('mya_Mymr', 'gpt2').toFixed(1));
      [[2, 'cl100k', ['tam_Taml', 'hin_Deva', 'rus_Cyrl']], [3, 'o200k', ['tam_Taml', 'hin_Deva', 'mya_Mymr']], [4, 'gemma3', ['tam_Taml', 'zho_Hans', 'mya_Mymr']]].forEach(([k, t, cs]) =>
        cs.forEach(c => { need('sx-tax', k, nm[c] + ' ' + X.cnt(c, t)); need('sx-tax', k, '(' + X.prem(c, t).toFixed(2)) }));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  if (!only) { await audit('end'); for (const t of ['t-lang', 't-voc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) } await p.click('#tabs button[data-t="t-read"]'); }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  if (!only) { for (const w of ['tk-patch', 'tk-grow', 'tk-trn']) { await p.$eval('#' + w, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#' + w + 'Ctl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: ' + w + ' plays by itself'); } }
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
