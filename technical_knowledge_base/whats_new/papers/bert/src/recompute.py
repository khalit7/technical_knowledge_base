import math
"""Recompute every derived number the page shows from the paper's tables and the released configs.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a summary.
  python3 recompute.py
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
CF = json.load(open(os.path.join(HERE, 'inputs', 'hf_configs.json')))
f = float
R = {}

# ---- Table 1: the Average column is the mean of the nine printed numbers (MNLI m and mm both count) ----
t1 = TB['t1']; avg = {}
for r in t1['rows']:
    vals = [f(x) for x in r['v'][:9]]
    avg[r['n']] = {'printed': f(r['v'][9]), 'recomputed': round(sum(vals) / 9, 2)}
R['glue_average'] = avg
R['glue_gain_over_gpt'] = {'base': round(f(t1['rows'][3]['v'][9]) - f(t1['rows'][2]['v'][9]), 1), 'large': round(f(t1['rows'][4]['v'][9]) - f(t1['rows'][2]['v'][9]), 1),
                           'official_score': round(80.5 - 72.8, 1), 'mnli_m': round(86.7 - 82.1, 1)}

# ---- parameters from the configuration (embeddings + L layers + pooler; MLM and NSP heads are extra) ----
def bert_params(L, H, V=30522, P=512, ff=None, pooler=True):
    ff = ff or 4 * H
    emb = V * H + P * H + 2 * H + 2 * H                      # token, position, segment embeddings and their LayerNorm
    layer = 4 * (H * H + H) + 2 * H + (H * ff + ff) + (ff * H + H) + 2 * H
    return emb + L * layer + ((H * H + H) if pooler else 0)
def heads(H, V=30522):
    return (H * H + H) + 2 * H + V + (2 * H + 2)                # MLM transform + LayerNorm + output bias (decoder tied), NSP layer
B = CF['google-bert/bert-base-uncased']; Lg = CF['google-bert/bert-large-uncased']
R['params'] = {
 'base_30522': bert_params(B['num_hidden_layers'], B['hidden_size'], B['vocab_size']),
 'large_30522': bert_params(Lg['num_hidden_layers'], Lg['hidden_size'], Lg['vocab_size']),
 'base_30000': bert_params(12, 768, 30000), 'large_30000': bert_params(24, 1024, 30000),
 'base_heads': heads(768), 'large_heads': heads(1024),
 'paper': {'base': 110e6, 'large': 340e6}, 'modernbert_table2': {'base': 110e6, 'large': 330e6},
}
g = CF['openai-community/openai-gpt']
H = g['n_embd']; R['params']['gpt1'] = g['vocab_size'] * H + g['n_positions'] * H + g['n_layer'] * (4 * (H * H + H) + 2 * H + 2 * (H * 4 * H) + 4 * H + H + 2 * H)
R['t6_params'] = [bert_params(int(r['v'][0]), int(r['v'][1])) for r in TB['t6']['rows']]
# a 512-token encoder of Vaswani et al. (L=6, H=1024, A=16) "100M parameters for the encoder": layers only, no embeddings
R['vaswani_big_encoder_layers'] = 6 * (4 * (1024 * 1024 + 1024) + 2 * 1024 + 1024 * 4096 + 4096 + 4096 * 1024 + 1024 + 2 * 1024)

# ---- pretraining arithmetic (appendix A.2) ----
steps, bs = 1_000_000, 256
R['tokens_per_batch_nominal'] = bs * 512                    # the paper rounds 131,072 to "128,000 tokens/batch"
R['epochs_nominal'] = round(steps * 128_000 / 3.3e9, 1)    # the paper's own arithmetic: "approximately 40 epochs"
seq_tokens = 0.9 * steps * bs * 128 + 0.1 * steps * bs * 512  # IF the batch stays 256 sequences at length 128 (the paper does not say)
R['tokens_with_schedule'] = seq_tokens
R['passes_with_schedule'] = round(seq_tokens / 3.3e9, 1)
R['masking'] = {'predicted': 15, 'mask': 15 * .8, 'random': 15 * .1, 'same': 15 * .1}

# ---- Tables 2 to 5 and 7: the margins the text quotes ----
R['squad11'] = {'over_top': round(93.2 - 91.7, 1), 'single_vs_top_ensemble': round(91.8 - 91.7, 1),
                'no_triviaqa_loss': {'single_dev_f1': round(91.1 - 90.9, 1), 'ensemble_dev_f1': round(92.2 - 91.8, 1), 'single_dev_em': round(84.2 - 84.1, 1), 'ensemble_dev_em': round(86.2 - 85.8, 1)}}
R['squad20_gain'] = round(83.1 - 78.0, 1)
R['swag'] = {'over_esim_elmo': round(86.3 - 59.2, 1), 'over_gpt': round(86.3 - 78.0, 1)}
t5 = {r['n']: [f(x) for x in r['v']] for r in TB['t5']['rows']}
R['t5_effects'] = {'cols': TB['t5']['cols'],
                   'nsp': [round(a - b, 1) for a, b in zip(t5['BERT-Base'], t5['No NSP'])],
                   'bidirectional': [round(a - b, 1) for a, b in zip(t5['No NSP'], t5['LTR & No NSP'])],
                   'bilstm_recovers': [round(a - b, 1) for a, b in zip(t5['+ BiLSTM'], t5['LTR & No NSP'])],
                   'base_vs_ltr': [round(a - b, 1) for a, b in zip(t5['BERT-Base'], t5['LTR & No NSP'])]}
R['ner_feature_gap'] = round(96.4 - 96.1, 1)
R['ner_vs_cse'] = round(92.8 - 93.1, 1)

# ---- Figure 5 decoded from its vector coordinates ----
F5 = TB['fig5']
dec = lambda ys: [round(75 + y / 378.68 * 10, 2) for y in ys]
xs = [round(x / 536.16 * 1000, 1) for x in F5['svg_x']]
mlm, ltr = dec(F5['mlm_svg_y']), dec(F5['ltr_svg_y'])
R['fig5'] = {'steps_k': xs, 'mlm': mlm, 'ltr': ltr}
i4, i6 = xs.index(400.0), xs.index(600.0)
m500 = (mlm[i4] + mlm[i6]) / 2
R['fig5']['mlm_500k_interp'] = round(m500, 2); R['fig5']['gain_500k_to_1m'] = round(mlm[-1] - m500, 2)


# ---- How big is the noise? Binomial standard errors from the split sizes (inputs/glue_sizes.json) ----
GS = json.load(open(os.path.join(HERE, 'inputs', 'glue_sizes.json')))
se = lambda acc, n: 100 * math.sqrt(acc / 100 * (1 - acc / 100) / n)
t5r = t5
R['noise'] = {'t5_dev': {}, 't1_test': {}}
for col, key, split in (('MNLI-m', 'mnli', 'validation_matched'), ('QNLI', 'qnli', 'validation'), ('MRPC', 'mrpc', 'validation'), ('SST-2', 'sst2', 'validation')):
    i = TB['t5']['cols'].index(col); a = t5r['BERT-Base'][i]; n = GS[key][split]
    d = round(t5r['BERT-Base'][i] - t5r['No NSP'][i], 1)
    R['noise']['t5_dev'][col] = {'n': n, 'se': round(se(a, n), 2), 'se_diff': round(math.sqrt(2) * se(a, n), 2), 'nsp_effect': d,
                                 'z': round(d / (math.sqrt(2) * se(a, n)), 1)}
    b = round(t5r['No NSP'][i] - t5r['LTR & No NSP'][i], 1)
    R['noise']['t5_dev'][col].update({'bidir_effect': b, 'bidir_z': round(b / (math.sqrt(2) * se(a, n)), 1)})
# Table 1 (GLUE test, accuracy columns only): BERT-Large against OpenAI GPT
t1r = {r['n']: [f(x) for x in r['v']] for r in TB['t1']['rows']}
for col, key, split in (('MNLI-m', 'mnli', 'test_matched'), ('MNLI-mm', 'mnli', 'test_mismatched'), ('QNLI', 'qnli', 'test'), ('SST-2', 'sst2', 'test'), ('RTE', 'rte', 'test')):
    i = TB['t1']['cols'].index(col); a = t1r['BERT-Large'][i]; n = GS[key][split]; d = round(a - t1r['OpenAI GPT'][i], 1)
    R['noise']['t1_test'][col] = {'n': n, 'se_diff': round(math.sqrt(2) * se(a, n), 2), 'gain_over_gpt': d, 'z': round(d / (math.sqrt(2) * se(a, n)), 1)}
# Table 8 (MNLI-m dev): the spread across the six masking mixes against the noise of one run
t8 = [f(r['v'][3]) for r in TB['t8']['rows']]
R['noise']['t8_mnli'] = {'min': min(t8), 'max': max(t8), 'spread': round(max(t8) - min(t8), 1), 'se_diff': R['noise']['t5_dev']['MNLI-m']['se_diff']}

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    p = R['params']
    print('GLUE averages', {k: v for k, v in avg.items()})
    print('gains', R['glue_gain_over_gpt'])
    print('params base %.1fM large %.1fM (30,000 vocab: %.1fM, %.1fM); heads %.2fM; GPT-1 %.1fM' % (p['base_30522'] / 1e6, p['large_30522'] / 1e6, p['base_30000'] / 1e6, p['large_30000'] / 1e6, p['base_heads'] / 1e6, p['gpt1'] / 1e6))
    print('Table 6 params', [round(x / 1e6, 1) for x in R['t6_params']], 'Vaswani big encoder layers %.1fM' % (R['vaswani_big_encoder_layers'] / 1e6))
    print('epochs nominal', R['epochs_nominal'], 'tokens with schedule %.1fB' % (seq_tokens / 1e9), 'passes', R['passes_with_schedule'])
    print('Table 5 effects', R['t5_effects'])
    print('Figure 5', R['fig5'])
    print('noise', R['noise'])
    print('squad', R['squad11'], R['squad20_gain'], R['swag'], R['ner_feature_gap'], R['ner_vs_cse'])
