// Numbers quoted in the Reading tab's new figures (hero, penalties), computed with the page's own sampler
// (parts/25_js_sampler.js) on the page's own data (parts/22_js_data.js). usage: node src/reading_numbers.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const ctx = { window: {}, console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['22_js_data.js', '25_js_sampler.js']) vm.runInContext(fs.readFileSync(path.join(here, 'parts', f), 'utf8'), ctx);
const { SD } = ctx; const P = SD.LAB.prompts; const pct = v => (v * 100).toFixed(1) + '%';
const story = P.find(p => p.k === 'story').pos[1];
const E = SD.entries(story);
const base = { k: 0, p: 1, minp: 0, typ: 1, order: 'first' };
for (const T of [1, 1.5]) {
  const R = SD.run(E, { ...base, T });
  console.log(`story pos 2, T ${T}: top token ${JSON.stringify(E[0].t)} p=${pct(R.pre[0])}, mass outside top 12 ${pct(1 - R.pre.slice(0, 12).reduce((a, b) => a + b, 0))}`);
}
const Rm = SD.run(E, { ...base, T: 1.5, minp: 0.1 }), Rp = SD.run(E, { ...base, T: 1.5, p: 0.9 });
console.log(`story T 1.5: min-p 0.1 keeps ${Rm.kept}, top token after renormalising ${pct(Rm.fin[0])}; top-p 0.9 keeps ${Rp.kept}`);
// penalties on the pattern prompt, position 7 (as the lab applies them: repetition on context counts, presence/frequency on generated counts)
const pat = P.find(p => p.k === 'pattern'), pos = pat.pos[6];
function lab(cfg) {
  const E = SD.entries(pos);
  const E2 = E.map((e, i) => { if (e.tail) return e; let l = e.l; const cr = pos.c[i], cg = pos.g[i];
    if (cr > 0 && cfg.rep !== 1) l = l > 0 ? l / cfg.rep : l * cfg.rep; if (cg > 0) l -= cfg.pres + cfg.freq * cg; return { ...e, l, c: 0 }; });
  return { E, R: SD.run(E2, { ...base, T: 1 }) };
}
console.log('pattern context:', JSON.stringify(pos.s));
for (const [name, cfg] of [['none', { rep: 1, pres: 0, freq: 0 }], ['repetition 1.3', { rep: 1.3, pres: 0, freq: 0 }], ['frequency 1', { rep: 1, pres: 0, freq: 1 }]]) {
  const { E, R } = lab(cfg);
  console.log(name, E.slice(0, 4).map((e, i) => `${JSON.stringify(e.t)} l=${e.l.toFixed(2)} ctx=${pos.c[i]} gen=${pos.g[i]} p=${pct(R.fin[i])}`).join(' | '));
}
