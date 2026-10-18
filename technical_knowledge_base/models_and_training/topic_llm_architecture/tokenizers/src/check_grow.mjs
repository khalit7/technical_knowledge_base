// Runs the Grow tab's BPE encoder (parts/31_js_tk_grow.js) in Node and compares it with the real library at 13 merge counts
// (out/grow_check.json from bpe/grow_check.py). Run from src/: node check_grow.mjs
import fs from 'node:fs';
globalThis.window = globalThis; globalThis.document = { getElementById: () => null };
eval(fs.readFileSync('parts/22_js_tk_2new.js', 'utf8')); eval(fs.readFileSync('parts/31_js_tk_grow.js', 'utf8'));
const ref = JSON.parse(fs.readFileSync('out/grow_check.json', 'utf8')), text = window.TKN.bpe.run.text;
let ok = 0, bad = 0;
for (const [k, v] of Object.entries(ref.k)) {
  for (const [nm, s, want] of [['run', text, v.run], ['extra', ref.extra, v.extra]]) {
    const got = window.TKG.encode(s, +k);
    if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('MISMATCH k', k, nm, got.length, want.length); }
  }
}
console.log('check_grow:', ok, 'match,', bad, 'mismatch'); process.exit(bad ? 1 : 0);
