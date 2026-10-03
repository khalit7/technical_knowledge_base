// Runs parts/22_js_algos.js in Node and compares it with inputs/ref_algos.json (the library and the course's reference code).
// Run from src/:  node check_algos.mjs
import fs from 'fs';
globalThis.window = globalThis;
eval(fs.readFileSync('parts/22_js_algos.js', 'utf8'));
const A = globalThis.TOKALG, R = JSON.parse(fs.readFileSync('inputs/ref_algos.json', 'utf8'));
let ok = 0, bad = 0; const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function t(name, a, b) { if (eq(a, b)) ok++; else { bad++; console.log('MISMATCH', name, '\n  js :', JSON.stringify(a).slice(0, 400), '\n  ref:', JSON.stringify(b).slice(0, 400)); } }
for (const [name, c] of Object.entries(R.corpora)) {
  const b = A.bpeTrain(c.corpus, 40);
  t(name + ' bpe merges', b.merges, c.bpe.merges);
  t(name + ' bpe encode', R.test.map(s => A.bpeEncode(s, b.merges).flat()), c.bpe.enc);
  const w = A.wpTrain(c.corpus, name === 'hug' ? 12 : 70);
  t(name + ' wp vocab', w.vocab, c.wp.vocab);
  t(name + ' wp encode', R.test.map(s => A.wpEncode(s, w.vocab)), c.wp.enc);
  // library WordPiece flattens and gives [UNK] per word as well
  t(name + ' wp encode = library', R.test.map(s => A.wpEncode(s, w.vocab).flat()), c.wp.lib_enc);
  const u = A.ugTrain(c.corpus, name === 'hug' ? 10 : 100);
  t(name + ' ug vocab', [...u.model.keys()], c.ug.vocab);
  t(name + ' ug rounds', u.rounds.map(r => r.vocab.length), c.ug.rounds);
  t(name + ' ug encode', R.test.map(s => A.ugEncode(s, u.model)), c.ug.enc);
  const libU = c.ug.lib_enc.map((x, i) => x), mine = R.test.map(s => A.ugEncode(s, u.model).flat());
  // the library emits one <unk> per unknown character run where the course gives <unk> for the whole word; compare only sentences without <unk>
  R.test.forEach((s, i) => { if (!mine[i].includes('<unk>')) t(name + ' ug encode = library #' + i, mine[i], libU[i]); });
}
console.log(`check_algos: ${ok} match, ${bad} mismatch`);
process.exit(bad ? 1 : 0);
