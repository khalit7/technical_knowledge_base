# Recompute every number the page states, from the offline results and the papers' printed values,
# and check the page's own outputs (model/runs/page_dump.json, written by check_page.mjs) against them.
# Run from src/: uv run --no-project --with numpy python recompute.py   -> inputs/recompute.json
import json, math, os, base64, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
out, fails = {}, []


def check(name, got, want, tol=0.0005):
    ok = abs(got - want) <= tol
    out[name] = {'got': got, 'want': want, 'ok': ok}
    if not ok: fails.append(name)


# ---- GloVe (glove_subset.py measured these on the full 400,000-word vocabulary)
ev = J('inputs', 'glove_eval.json')
it = ev['include_top_answer']; n = ev['full_include']['n']
check('glove excluded total', ev['full_exclude']['total'], 0.4622)
check('glove not excluded total', ev['full_include']['total'], 0.3043)
check('glove top30k excluded', ev['top30k_exclude']['total'], 0.4969)
check('glove question word as answer share', (it['a'] + it['b'] + it['c']) / n, 0.4754)
an = {tuple(a['q']): a['top'] for a in ev['presets_full_vocab']['analogy']}
out['king-man+woman top two'] = an[('man', 'king', 'woman')][:2]
out['man:doctor::woman, not excluded / excluded'] = [an[('man', 'doctor', 'woman')][0][0], [w for w, _ in an[('man', 'doctor', 'woman')] if w not in ('man', 'doctor', 'woman')][0]]
out['man:programmer::woman excluded'] = [w for w, _ in an[('man', 'programmer', 'woman')] if w not in ('man', 'programmer', 'woman')][0]
# GloVe paper Table 2 values quoted on the page (transcribed): 6B 300d GloVe 71.7, SG+ 69.1, CBOW+ 65.7; 1.6B 100d GloVe 60.3
out['glove table 2 (transcribed)'] = {'GloVe 300d 6B': 71.7, 'SG 300d 6B': 69.1, 'CBOW 300d 6B': 65.7, 'GloVe 100d 1.6B': 60.3}
# the page's in-browser test: recompute the same 560-question sample on the same int8 vectors
g = J('inputs', 'glove_subset.json')
raw = np.frombuffer(base64.b64decode(g['int8_b64']), dtype=np.int8).astype(np.float64).reshape(-1, 50)
X = raw / np.linalg.norm(raw, axis=1, keepdims=True)
data = open(os.path.join(HERE, 'parts', '21_js_data.js')).read()
sample = json.loads(re.search(r'"q":(\[\[.*?\]\]),"ev"', data).group(1))
okx = oki = 0
for s, a, b, c, d in sample:
    v = X[b] - X[a] + X[c]; sims = X @ v
    oki += int(np.argmax(sims) == d)
    sims[[a, b, c]] = -9; okx += int(np.argmax(sims) == d)
out['in-page test sample'] = {'n': len(sample), 'excluded': okx / len(sample), 'not_excluded': oki / len(sample)}
dump_p = os.path.join(HERE, 'model', 'runs', 'page_dump.json')
if os.path.exists(dump_p):
    vt = J('model', 'runs', 'page_dump.json').get('vt', '')
    m = re.findall(r'(\d+\.\d)%', vt)
    if m:
        check('page test excluded = recompute', float(m[0]) / 100, round(okx / len(sample), 3), 0.0006)
        check('page test not excluded = recompute', float(m[1]) / 100, round(oki / len(sample), 3), 0.0006)

# ---- recurrent cells: parameter counts and gate arithmetic
nU, mI = 8, 9
lstm_rec, gru_rec = 4 * nU * (nU + mI + 2), 3 * nU * (nU + mI + 2)
check('toy LSTM recurrent params', lstm_rec, 608, 0); check('toy GRU recurrent params', gru_rec, 456, 0)
check('GRU/LSTM ratio', gru_rec / lstm_rec, 0.75, 0)
check('toy LSTM total with readout', lstm_rec + nU * 4 + 4, 644, 0)
check('toy GRU total with readout', gru_rec + nU * 4 + 4, 492, 0)
check('toy RNN total with readout', nU * mI + nU * nU + 2 * nU + nU * 4 + 4, 188, 0)
check('0.9^50', 0.9 ** 50, 0.005, 0.0003)
check('sigma(1)', 1 / (1 + math.exp(-1)), 0.731, 0.0005)
out['sigma(1)^50'] = (1 / (1 + math.exp(-1))) ** 50
check('Sutskever numbers per sentence (4 layers x 1000 cells x (h, c))', 4 * 1000 * 2, 8000, 0)

# ---- memory task results
mr = J('model', 'runs', 'memory_results.json'); L = mr['eval_lengths']
def solved(kind, tmax, in_range):
    rs = [r for r in mr['runs'] if r['kind'] == kind and r['tmax'] == tmax]
    return sum(min(a for a, T in zip(r['acc'], L) if (T <= tmax or not in_range)) >= 0.99 for r in rs)
out['solved in range of 9'] = {k: [solved(k, t, True) for t in [10, 20, 50, 100]] for k in ['rnn', 'gru', 'lstm']}
out['solved at all lengths of 9'] = {k: [solved(k, t, False) for t in [10, 20, 50, 100]] for k in ['rnn', 'gru', 'lstm']}
check('plain RNN up to 10 solved in range', solved('rnn', 10, True), 6, 0)
check('plain RNN up to 10 solved at all lengths', solved('rnn', 10, False), 2, 0)
check('plain RNN up to 50 and 100 solved', solved('rnn', 50, True) + solved('rnn', 100, True), 0, 0)
check('LSTM solved in range, of 36', sum(solved('lstm', t, True) for t in [10, 20, 50, 100]), 35, 0)
check('GRU solved in range, of 36', sum(solved('gru', t, True) for t in [10, 20, 50, 100]), 36, 0)
g50 = {r['kind']: r['grad_init'][-51] for r in mr['runs'] if r['tmax'] == 50 and r['seed'] == 0 and r['lr'] == 0.01}
out['gradient 50 steps back, untrained, log10'] = g50
check('LSTM minus RNN, orders of magnitude', g50['lstm'] - g50['rnn'], 5.7, 0.05)

# ---- seq2seq results (mean of two seeds)
sr = J('model', 'runs', 'seq2seq_results.json'); SL = sr['eval_lengths']
def mean(model, key, l):
    rs = [r for r in sr['runs'] if r['model'] == model]
    return sum(r[key][SL.index(l)] for r in rs) / len(rs)
for name, model, l, want in [('fixed 6 digits whole', 'fixed', 6, .964), ('fixed 12 digits whole', 'fixed', 12, .039),
                             ('fixed 10 digits whole', 'fixed', 10, .244), ('reversed 10 digits whole', 'fixed_reversed', 10, .68),
                             ('attention 20 digits whole', 'attention', 20, 1.0), ('attention 22 digits whole', 'attention', 22, .927),
                             ('attention 26 digits whole', 'attention', 26, .013)]:
    check(name, round(mean(model, 'seq_acc', l), 4), want, 0.0006)
out['seq2seq params'] = {r['model']: r['params'] for r in sr['runs'] if r['seed'] == 0}
fx = [r for r in sr['runs'] if r['model'] == 'fixed' and r['seed'] == 0][0]
out['fixed seed 0 int8 (caption)'] = {'6': fx['seq_acc_int8'][SL.index(6)], '10': fx['seq_acc_int8'][SL.index(10)],
                                      'first zero length > 6': next(l for l in SL if l > 6 and fx['seq_acc_int8'][SL.index(l)] == 0)}
if os.path.exists(dump_p):
    s2s = J('model', 'runs', 'page_dump.json').get('s2s', [])
    check('page seq2seq outputs equal PyTorch on all references', sum(r['same'] for r in s2s), len(s2s), 0)
    check('page seq2seq max abs difference below 1e-5', float(max(max(r['hT_maxdiff'], r['att_maxdiff']) for r in s2s) < 1e-5), 1.0, 0)

# ---- papers' numbers quoted (transcribed) and derived
out['Bahdanau Table 1 (transcribed)'] = {'RNNencdec-30': 13.93, 'RNNsearch-30': 21.50, 'RNNencdec-50': 17.82, 'RNNsearch-50': 26.75, 'RNNsearch-50*': 28.45, 'Moses': 33.30}
out['Sutskever (transcribed)'] = {'ensemble BLEU': 34.81, 'SMT baseline': 33.30, 'reversal BLEU': [25.9, 30.6], 'reversal perplexity': [5.8, 4.7], 'params': '384M'}
check('WaveNet Figure 2 receptive field (4 layers, filter 2)', 4 + 2 - 1, 5, 0)
check('WaveNet 4 dilated layers', 1 + sum(2 ** l for l in range(4)), 16, 0)
check('WaveNet block 1..512', 1 + sum(2 ** l for l in range(10)), 1024, 0)
check('240 ms at 16 kHz in samples', 0.240 * 16000, 3840, 0)
out['WaveNet Table 1 MOS (transcribed)'] = {'WaveNet': [4.21, 4.08], 'best earlier': [3.86, 3.79], 'natural 16-bit': [4.55, 4.21]}

json.dump({'checks': out, 'failures': fails}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, default=float)
print('checks', len([v for v in out.values() if isinstance(v, dict) and 'ok' in v]), 'failures', fails)
print('in-page test sample', out['in-page test sample'])
