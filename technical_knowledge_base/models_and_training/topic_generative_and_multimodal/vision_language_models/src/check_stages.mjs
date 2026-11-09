// The 2026-11-06 rollout checks for Vision-language models (2026-11-09): the seven 3D stages (Fig. 1 to Fig. 7) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off
// screen and never move under reduced motion; no errors, NaN,
// undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the step lists' numbers equal what the scenes
// draw (recomputed here from window.VM_DATA). Adapted from Native multimodal and any-to-any models.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/vision_language_models/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-conn', 'sx-conn'], ['stg-res', 'sx-res'], ['stg-ocr', 'sx-ocr'], ['stg-gr', 'sx-gr'], ['stg-vid', 'sx-vid'], ['stg-prune', 'sx-prune']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // flows and timers stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const runs = STAGES.map(([id, lid]) => [id, lid, null]);
  for (const [id, lid, mode] of runs) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} is hidden while it drives ${id}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${mode ? '-' + mode : ''}-s${k + 1}-mid-${scheme}-${width}.png` });
        await wait(3400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${mode ? '-' + mode : ''}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists quote what the scenes draw: each number recomputed from VM_DATA
    const r = await p.evaluate(() => { const out = [], D = window.VM_DATA, li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) }, c = n => Math.round(n).toLocaleString('en-GB');
      const im = k => D.saw.images.find(x => x.key === k), cat = im('p01_cat'), cs = cat.smol[0], cq = cat.qwen.find(x => x.budget === '256');
      need('sx-hero', 2, c(cs.views * 1024)); need('sx-hero', 3, c(cs.imgTok) + ' image tokens'); need('sx-hero', 3, String(cq.imgTok));
      need('sx-hero', 4, c(cs.promptTok) + '-token prompt'); need('sx-hero', 4, '0 to ' + c(cs.promptTok - 1)); need('sx-hero', 4, 'reads ' + cq.promptTok + ' tokens'); need('sx-hero', 4, 'end at ' + cq.lastPos);
      need('sx-conn', 3, c(cs.views * 1024)); need('sx-conn', 3, c(cs.imgTok) + ' in all'); need('sx-conn', 4, cq.imgTok + ' tokens');
      const ro = im('rocket_native'), rs = ro.smol[0], rq = ro.qwen.find(x => x.budget === 'native'), L = rs.segs.filter(x => x[0] === 'img').pop();
      need('sx-res', 1, c(rs.resized[1]) + ' × ' + c(rs.resized[0])); need('sx-res', 2, c(rs.imgTok) + ' image tokens'); need('sx-res', 2, 'position ' + (L[1] + L[2])); need('sx-res', 2, rs.promptTok + ' tokens in all');
      need('sx-res', 3, rq.resized[0] + ' × ' + rq.resized[1]); need('sx-res', 3, c(rq.thw[1] * rq.thw[2]) + ' patches'); need('sx-res', 4, rq.imgTok + ' image tokens'); need('sx-res', 4, 'position ' + rq.posAfter[0]); need('sx-res', 4, 'not ' + (rq.firstIdx + rq.imgTok));
      const oc = (w, b) => D.runs[w].ocr.rows.filter(x => x.font_px === 20 && x.budget === b), ex = r => r.filter(x => x.exact).length;
      need('sx-ocr', 0, 'all ' + ex(oc('qwen', '1024')) + ' codes'); need('sx-ocr', 1, ex(oc('qwen', '256')) + ' of 3'); need('sx-ocr', 2, ex(oc('qwen', '64')) + ' of 3'); need('sx-ocr', 3, ex(oc('smol', '64')) + ' of 3'); need('sx-ocr', 4, ex(oc('smol', '1088')) + ' of 3');
      const h = D.syn.ocr.find(x => x.font === 20).h; need('sx-ocr', 0, h + ' pixels tall'); need('sx-ocr', 2, h / 4 + ' pixels'); need('sx-ocr', 4, h * 2 + ' pixels');
      const g = D.syn.ground.find(x => x.key === 'gr_02'), t = g.objects.find(o => o.obj === 'red circle').box, bq = D.groundParsed['qwen:gr_02:red circle'];
      const iou = (a, b) => { const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])), I = ix * iy; return I / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - I) };
      need('sx-gr', 2, 'IoU ' + iou(bq.k1000, t).toFixed(2)); need('sx-gr', 3, 'IoU ' + iou(bq.orig, t).toFixed(2)); need('sx-gr', 4, 'IoU ' + iou(bq.resized, t).toFixed(2));
      const bb = a => '[' + a.match(/"bbox_2d":\s*\[([^\]]*)\]/)[1] + ']';
      need('sx-gr', 1, bb(D.runs.qwen.ground.rows.find(x => x.key === 'gr_02' && x.obj === 'red circle').answer)); need('sx-gr', 5, bb(D.runs.smol.ground.rows.find(x => x.key === 'gr_02' && x.obj === 'red circle').answer));
      const V = D.runs.qwen.video, vr = V.rows.find(x => x.key === 'vid_red_left_to_right' && x.mode === 'video'), vf = V.rows.find(x => x.key === 'vid_red_left_to_right' && x.mode !== 'video');
      need('sx-vid', 2, '[' + vr.grid_thw.join(', ') + ']'); need('sx-vid', 3, vr.video_tokens + ' video tokens'); need('sx-vid', 3, vr.prompt_tokens + ' prompt tokens'); need('sx-vid', 5, vr.answer); need('sx-vid', 5, vf.answer);
      const sts = V.prompt_example.match(/<[\d.]+ seconds>/g); need('sx-vid', 4, sts[0]); need('sx-vid', 4, sts[sts.length - 1]);
      const RDc = D.runs.smol.reduce, per = new Array(17).fill(0); RDc.attn_keep_cat.kept.forEach(i => per[Math.floor(i / 64)]++);
      need('sx-prune', 0, RDc.right.full + ' of'); need('sx-prune', 1, (per[0] + per[1] + per[2] + per[3]) + ' of them'); need('sx-prune', 1, 'only ' + per[16]); need('sx-prune', 1, RDc.right['attention 25%'] + ' of 30');
      need('sx-prune', 2, RDc.right['pool 2x2'] + ' of 30'); need('sx-prune', 3, RDc.right['tiles only'] + ' of 30');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
