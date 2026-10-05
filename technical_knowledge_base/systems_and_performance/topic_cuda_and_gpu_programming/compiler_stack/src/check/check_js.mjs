// The page's "Will it run?" logic (parts/31_js_run.js, window.CSRUN.decide) against src/code/compat.py's expected outcomes.
import fs from 'fs';
const here = new URL('.', import.meta.url).pathname;
const exp = JSON.parse(fs.readFileSync(here + '../out/compat_expected.json', 'utf8'));
const src = fs.readFileSync(here + '../parts/31_js_run.js', 'utf8').split('\n(function(){')[0];
const window = {}; new Function('window', src)(window);
let ok = 0, bad = [];
for (const c of exp.cases) {
  const r = window.CSRUN.decide(exp.fat[c.fat], c.cc, c.driver, 134, c.force, c.disable);
  const same = r.outcome === c.outcome && (r.image || null) === c.image && (r.code || null) === c.code;
  if (same) ok++; else bad.push([c, r.outcome, r.image, r.code]);
}
console.log(`compat: ${ok}/${exp.cases.length} cases agree with compat.py`); if (bad.length) { console.log(bad.slice(0, 5)); process.exit(1); }
