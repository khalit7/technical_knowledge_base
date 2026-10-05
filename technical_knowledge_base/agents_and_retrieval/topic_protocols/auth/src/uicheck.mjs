// Click every control of ../index.html at 390 px dark and 920 px light; fail on script errors, NaN or undefined in visible
// text, or sideways scroll. Saves element screenshots to OUTDIR and the browser-computed values recompute.py checks.
// usage: node src/uicheck.mjs OUTDIR   (run from anywhere; puppeteer is resolved from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const OUT = process.argv[2] || '/tmp/auth-ui'; fs.mkdirSync(OUT, { recursive: true });
const file = 'file://' + path.resolve(here, '..', 'index.html');
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = []; let clicks = 0; let values = null;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await sleep(300);
  const check = async where => {
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join('\n');
      const bad = (t.match(/.{0,40}\b(NaN|undefined|null)\b.{0,40}/g) || []).filter(s => !/null\)|"null"|== null|body: null|\(empty body\)|\/dev\/null/.test(s));
      return { bad, side: document.documentElement.scrollWidth > innerWidth, box: !document.getElementById('jsErr').hidden };
    });
    if (r.bad.length) problems.push(`${scheme} ${where}: text ${JSON.stringify(r.bad.slice(0, 3))}`);
    if (r.side) problems.push(`${scheme} ${where}: sideways scroll`);
    if (r.box) problems.push(`${scheme} ${where}: error box shown`);
  };
  for (const tab of ['t-read', 't-mcpflow', 't-jwt', 't-more']) {
    await p.click(`button[data-t=${tab}]`); await sleep(250); await check(tab);
    const n = await p.$$eval(`#${tab} button, #${tab} input[type=checkbox], #${tab} select, #${tab} input[type=range]`, els => els.length);
    for (let i = 0; i < n; i++) {
      const kind = await p.evaluate((tab, i) => {
        const el = document.querySelectorAll(`#${tab} button, #${tab} input[type=checkbox], #${tab} select, #${tab} input[type=range]`)[i];
        if (!el || el.offsetParent === null) return 'hidden';
        if (el.tagName === 'SELECT') { el.value = el.options[el.options.length - 1].value; el.dispatchEvent(new Event('change')); return 'select'; }
        if (el.type === 'range') { el.value = el.max; el.dispatchEvent(new Event('input')); return 'range'; }
        if (el.dataset.a === 'play') return 'skip';
        el.click(); return 'click';
      }, tab, i);
      if (kind !== 'hidden' && kind !== 'skip') clicks++;
    }
    await sleep(150); await check(tab + ' after clicks');
  }
  // text inputs: key checker, SigV4 inputs, tamper box
  await p.click('button[data-t=t-read]'); await sleep(100);
  await p.evaluate(() => { const k = document.getElementById('keyIn'); k.value = k.value.slice(0, 10) + 'Z' + k.value.slice(11); k.dispatchEvent(new Event('input'));
    const g = document.getElementById('sgP'); g.value = '/x'; g.dispatchEvent(new Event('input')); });
  await check('inputs');
  if (scheme === 'light') {
    // screenshots of the main widgets in fixed states
    await p.goto(file); await sleep(300);
    const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(OUT, name + '.png') }); };
    for (const m of ['implicit', 'nopkce', 'pkce']) {
      await p.click(`#oaA [data-m=${m}]`); await p.evaluate(() => { const s = document.querySelector('#oaA [data-a=scrub]'); s.value = s.max; s.dispatchEvent(new Event('input')); });
      await sleep(900); await shot('#oaA', 'oauth-' + m);
    }
    await shot('#sgCalc', 'sigv4'); await shot('#rdRot', 'rotation'); await shot('#rdDev', 'device'); await shot('#rdDisc2', 'discovery'); await shot('#rdAlgs', 'algs'); await shot('#rdPass', 'passthrough');
    await p.click('button[data-t=t-mcpflow]'); await sleep(200);
    await p.evaluate(() => { const s = document.querySelector('#mfA [data-a=scrub]'); s.value = 3; s.dispatchEvent(new Event('input')); }); await shot('#mfA', 'mf-step4');
    for (const m of ['strict', 'naive', 'xchg']) {
      await p.click(`#mfB [data-p=${m}]`); await p.evaluate(() => { const s = document.querySelector('#mfB [data-a=scrub]'); s.value = s.max - 1; s.dispatchEvent(new Event('input')); });
      await sleep(300); await shot('#mfB', 'mf-' + m);
    }
    await p.click('button[data-t=t-jwt]'); await sleep(200);
    for (const m of ['strict', 'noaud', 'naive']) { await p.click(`[data-pre=${m}]`); await sleep(100); await shot('#jl', 'jwt-' + m); }
    values = await p.evaluate(() => ({
      tamperToken: AU.tamperToken, sigOk: AU.sigOk, pkce: document.getElementById('rdPkceC').textContent,
      keyOk: AU.keyCheck(AUTHDATA.small.apikey.example).ok, typoOk: AU.keyCheck(AUTHDATA.small.apikey.typo).ok,
      jwtStrict: (() => { Object.assign(AU.jwtPol, { pin: true, typ: true, iss: true, aud: true, time: true, scope: true, lee: 30 }); return Object.fromEntries(AUTHDATA.jwt.cases.map(c => [c.id, AU.jwtVerify(c).status])); })(),
      ucBits: document.getElementById('rdUcBits').textContent, keyBits: document.getElementById('rdKeyBits').textContent,
      crackSpace: document.getElementById('rdCrackSpace').textContent
    }));
  }
  if (errs.length) problems.push(`${scheme}: errors ${JSON.stringify(errs.slice(0, 5))}`);
  await p.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'browser_values.json'), JSON.stringify(values, null, 1));
console.log(`controls exercised ${clicks}; problems ${problems.length}`);
problems.forEach(x => console.log('PROBLEM', x));
process.exit(problems.length ? 1 : 0);
