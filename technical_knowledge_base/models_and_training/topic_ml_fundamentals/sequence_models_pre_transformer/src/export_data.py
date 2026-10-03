# Writes parts/21_js_data.js from the offline results (run by build.sh).
#   inputs/glove_subset.json, inputs/glove_eval.json, inputs/glove_questions_subset.json  (glove_subset.py)
#   model/runs/memory_results.json, memory_weights.json                                    (model/train_memory.py)
#   model/runs/seq2seq_results.json, seq2seq_weights.json                                  (model/train_seq2seq.py)
import json, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))

g = J('inputs', 'glove_subset.json')
ev = J('inputs', 'glove_eval.json')
gq = J('inputs', 'glove_questions_subset.json')
# a fixed, stratified sample of the analogy test for the in-browser run: 40 questions per section
rnd = random.Random(2014)
by = {}
for q in gq['q']: by.setdefault(q[0], []).append(q)
sample = []
for s in sorted(by): sample += rnd.sample(by[s], min(40, len(by[s])))
glove = {'w': g['words'], 'b': g['int8_b64'], 'd': g['dim'], 'secs': gq['sections'], 'q': sample,
         'ev': {k: ev[k] for k in ['n_questions_file', 'n_questions_covered', 'full_exclude', 'full_include',
                                   'top30k_exclude', 'include_top_answer', 'subset', 'presets_full_vocab']}}

mr = J('model', 'runs', 'memory_results.json')
mw = J('model', 'runs', 'memory_weights.json')
LENS = mr['eval_lengths']
# best learning rate per (cell, training length): highest mean accuracy over seeds and test lengths
summ = {}
for kind in ['rnn', 'gru', 'lstm']:
    for tmax in [10, 20, 50, 100]:
        best = None
        for lr in mr['lrs']:
            rs = [r for r in mr['runs'] if r['kind'] == kind and r['tmax'] == tmax and r['lr'] == lr]
            m = sum(sum(r['acc']) for r in rs) / (len(rs) * len(LENS))
            if best is None or m > best[0]: best = (m, lr, rs)
        allr = {str(lr): [r['acc'] for r in mr['runs'] if r['kind'] == kind and r['tmax'] == tmax and r['lr'] == lr] for lr in mr['lrs']}
        r0 = [r for r in best[2] if r['seed'] == 0][0]
        summ['%s_%d' % (kind, tmax)] = {'lr': best[1], 'acc': [r['acc'] for r in best[2]]}
        if tmax == 50: summ['%s_%d' % (kind, tmax)]['gi'] = r0['grad_init']  # gradient reaching step k, untrained net
        # runs (of 9: 3 learning rates x 3 seeds) that solve the task at every test length
        summ['%s_%d' % (kind, tmax)]['solved'] = sum(min(a) >= 0.99 for v in allr.values() for a in v)
        summ['%s_%d' % (kind, tmax)]['solved_in_range'] = sum(min(x for x, T in zip(a, LENS) if T <= tmax) >= 0.99 for v in allr.values() for a in v)
ANIM_T = 50
models = {}
for kind in ['rnn', 'gru', 'lstm']:
    lr = summ['%s_%d' % (kind, ANIM_T)]['lr']
    models[kind] = {'lr': lr, 'w': mw['%s_%d_%g' % (kind, ANIM_T, lr)]}
mem = {'H': mr['H'], 'sym': mr['symbols'], 'steps': mr['steps'], 'batch': mr['batch'], 'clip': mr['clip'], 'lrs': mr['lrs'],
       'lens': LENS, 'anim_tmax': ANIM_T, 'models': models, 'summ': summ}
# the plain RNN that latched: trained on short sequences, it can hold the key at any length
mem['short_rnn'] = {'w': mw['rnn_10_0.003'], 'acc': [r['acc'] for r in mr['runs'] if r['kind'] == 'rnn' and r['tmax'] == 10 and r['lr'] == 0.003]}

sr = J('model', 'runs', 'seq2seq_results.json')
sw = J('model', 'runs', 'seq2seq_weights.json')
s2s = {'E': sr['E'], 'H': sr['H'], 'A': sr['A'], 'train': sr['train_lengths'], 'steps': sr['steps'], 'batch': sr['batch'],
       'lr': sr['lr'], 'lens': sr['eval_lengths'], 'runs': [{k: r[k] for k in r if k != 'loss'} for r in sr['runs']],
       'fixed': sw['fixed'], 'attention': sw['attention']}

out = '// ---- Data (written by export_data.py; do not edit by hand) ----\nwindow.SQ={glove:%s,\nmem:%s,\ns2s:%s};\n' % (
    json.dumps(glove, separators=(',', ':')), json.dumps(mem, separators=(',', ':')), json.dumps(s2s, separators=(',', ':')))
open(os.path.join(HERE, 'parts', '21_js_data.js'), 'w').write(out)
print('21_js_data.js', len(out), 'bytes; best lr, solved (all lengths / within training range) of 9', {k: (v['lr'], v['solved'], v['solved_in_range']) for k, v in summ.items()})
