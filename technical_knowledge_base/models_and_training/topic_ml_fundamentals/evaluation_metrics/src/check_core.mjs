// Checks the page's metric engine (parts/31_js_core.js) against recompute.py (scikit-learn) and the libraries
// (sacrebleu, rouge-score, NLTK, bert-score) via inputs/text_presets.json. Run from src/: node check_core.mjs
import fs from 'fs'; import vm from 'vm';
const ctx = { window: {}, Math, Map, Set, Array, Object, String, Number, RegExp, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['parts/30_js_data.js', 'parts/31_js_core.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const { EM, MX } = ctx; const R = JSON.parse(fs.readFileSync('inputs/recompute.json')); const T = JSON.parse(fs.readFileSync('inputs/text_presets.json'));
let bad = 0, ok = 0; const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol || Number.isNaN(a)) { bad++; console.log('MISMATCH', what, a, b) } else ok++ };
for (const sub of ['all', 'rare']) {
  const idx = MX.sst(sub === 'rare'); const y = idx.map(i => +EM.sst2.y[i]);
  for (const m of ['lr', 'nb', 'nbc']) {
    const pa = MX.prob(EM.sst2.logit[m]), p = idx.map(i => pa[i]), c = MX.confusion(y, p, 0.5), r = MX.rates(c), ref = R.sst2[sub][m];
    for (const k of ['tp', 'fp', 'tn', 'fn']) near(c[k], ref[k], 0, sub + m + k);
    for (const k of ['acc', 'prec', 'f1', 'mcc', 'spec', 'bacc']) near(r[k], ref[k], 1e-9, sub + m + k); near(r.rec, ref.rec, 1e-9, sub + m + 'rec');
    near(MX.auc(y, p), ref.auc, 1e-9, sub + m + 'auc'); near(MX.curves(y, p).ap, ref.ap, 1e-9, sub + m + 'ap');
    near(MX.brier(y, p), ref.brier, 1e-9, sub + m + 'brier'); near(MX.logloss(y, p), ref.logloss, 1e-6, sub + m + 'logloss'); near(MX.reliability(y, p).ece, ref.ece, 1e-9, sub + m + 'ece');
  }
}
const G = MX.multi(EM.glass.cm); for (const a of ['macro', 'micro', 'weighted']) for (const k of ['p', 'r', 'f']) near(G[a][k], R.glass[a][k], 1e-12, 'glass ' + a + k);
G.per.forEach((c, i) => near(c.f, R.glass.per_class_f1[i], 1e-12, 'glass f1 ' + i));
for (const [key, v] of Object.entries(R.ppl)) { const [m, t] = key.split('/'); const lp = EM.ppl.models[m].scores[t].lp, nll = -lp.reduce((a, b) => a + b, 0);
  near(Math.exp(nll / lp.length), v.ppl_token, 1e-6 * v.ppl_token, key + ' ppl'); near(nll / Math.LN2 / EM.ppl.texts[t].bytes, v.bpb, 1e-9, key + ' bpb') }
// Porter stemmer against NLTK (MARTIN_EXTENSIONS)
let pbad = 0; for (const [w, s] of Object.entries(T.porter)) if (MX.stem(w) !== s) { pbad++; console.log('STEM', w, MX.stem(w), s) }
pbad ? bad += pbad : ok++;
for (const c of T.cands) {
  const b = MX.bleu(c.text, T.ref); near(b.score, c.bleu, 1e-9, c.key + ' bleu'); near(b.bp, c.bleu_bp, 1e-12, c.key + ' bp');
  near(MX.chrf(c.text, T.ref).score, c.chrf, 1e-9, c.key + ' chrf');
  near(MX.rougeN(c.text, T.ref, 1).f, c.rouge.rouge1.f, 1e-12, c.key + ' r1'); near(MX.rougeN(c.text, T.ref, 2).f, c.rouge.rouge2.f, 1e-12, c.key + ' r2');
  near(MX.rougeL(c.text, T.ref).f, c.rouge.rougeL.f, 1e-12, c.key + ' rL');
  near(MX.meteor(c.text, T.ref).score, c.meteor_stem, 1e-12, c.key + ' meteor');
  const bs = MX.bertscore(c.bertscore.sim); near(bs.F, c.bertscore.F, 2e-3, c.key + ' bertscore F (3-decimal matrix)'); near(bs.P, c.bertscore.P, 2e-3, c.key + ' bertscore P'); near(bs.R, c.bertscore.R, 2e-3, c.key + ' bertscore R');
  near(MX.rescale(c.bertscore.F, T.bertscore.baseline.F), c.bertscore.F_rescaled, 1e-6, c.key + ' rescaled');
}
const FZ = JSON.parse(fs.readFileSync('inputs/text_fuzz.json')); let fz = 0;
for (const c of FZ) { const n0 = bad;
  near(MX.bleu(c.hyp, c.ref).score, c.bleu, 1e-9, 'fuzz bleu: ' + c.hyp); near(MX.chrf(c.hyp, c.ref).score, c.chrf, 1e-9, 'fuzz chrf: ' + c.hyp);
  near(MX.rougeN(c.hyp, c.ref, 1).f, c.r1, 1e-12, 'fuzz r1'); near(MX.rougeN(c.hyp, c.ref, 2).f, c.r2, 1e-12, 'fuzz r2'); near(MX.rougeL(c.hyp, c.ref).f, c.rl, 1e-12, 'fuzz rL');
  near(MX.meteor(c.hyp, c.ref).score, c.met, 1e-12, 'fuzz meteor: ' + c.hyp + ' || ' + c.ref); if (bad === n0) fz++ }
console.log('fuzz pairs matching on all six scores: ' + fz + ' of ' + FZ.length);
console.log('check_core: ok ' + ok + ', mismatches ' + bad); process.exit(bad ? 1 : 0);
