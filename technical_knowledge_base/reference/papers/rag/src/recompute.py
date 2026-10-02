"""Every number this page derives from the paper, recomputed from tables.json and the paper's text.
Writes inputs/recompute.json (read by the page through mk_paper.py) and prints a report.
  python3 recompute.py
"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
os.system('cd "%s" && python3 mk_tables.py > /dev/null' % HERE)
T = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}
row = lambda t, m: next(r for r in T[t]['rows'] if r['m'] == m)['v']
ntest = {r['m']: r['v'][2] for r in T['t7']['rows']}


def se(p, n): return 100 * math.sqrt(p / 100 * (1 - p / 100) / n)


# 1. Table 1: margins and whether each "state of the art" clears the noise of its test set
t1 = T['t1']; cols = t1['cols']; others = [r for r in t1['rows'] if r['g'] != 'RAG']
n_of = {'NQ': ntest['Natural Questions'], 'TQA': ntest['TriviaQA'], 'WQ': ntest['WebQuestions'], 'CT': ntest['CuratedTrec'], 'TQA-Wiki': None}
sota = []
for j, c in enumerate(cols):
    rag = max(((r['v'][j], r['m']) for r in t1['rows'] if r['g'] == 'RAG' and r['v'][j] is not None))
    best = max(((r['v'][j], r['m']) for r in others if r['v'][j] is not None))
    d = round(rag[0] - best[0], 1); n = n_of[c]
    x = dict(col=c, rag=rag[0], rag_m=rag[1], best=best[0], best_m=best[1], delta=d, n=n)
    if n:
        s = math.sqrt(se(rag[0], n) ** 2 + se(best[0], n) ** 2)   # unpaired, an upper bound on the paired SE
        x.update(se_diff=round(s, 2), z=round(d / s, 2))
    sota.append(x)
R['t1_sota'] = sota
R['t1_rag_seq_vs_dpr_nq'] = round(row('t1', 'RAG-Seq.')[0] - row('t1', 'DPR')[0], 1)
R['t1_rag_seq_vs_t5ssm_nq'] = round(row('t1', 'RAG-Seq.')[0] - row('t1', 'T5-11B+SSM')[0], 1)
R['t1_tok_vs_seq_nq'] = dict(d=round(row('t1', 'RAG-Seq.')[0] - row('t1', 'RAG-Token')[0], 1),
                             se=round(math.sqrt(se(44.5, 3611) ** 2 + se(44.1, 3611) ** 2), 2))

# 2. Table 2: the deltas the text quotes
b, tk, sq, so = row('t2', 'BART'), row('t2', 'RAG-Tok.'), row('t2', 'RAG-Seq.'), row('t2', 'SotA')
R['t2'] = dict(msmarco_bleu=round(sq[3] - b[3], 1), msmarco_rouge=round(sq[2] - b[2], 1),
               fever3_gap=round(so[4] - tk[4], 1), fever2_gap=round(so[5] - tk[5], 1),
               jeop_qb1_tok_minus_bart=round(tk[1] - b[1], 1), jeop_qb1_seq_minus_bart=round(sq[1] - b[1], 1),
               jeop_b1_seq_minus_bart=round(sq[0] - b[0], 1), fever3_se=round(se(72.5, 10000), 2),
               msmarco_gap_to_gold_bleu=round(so[3] - sq[3], 1), msmarco_gap_to_gold_rouge=round(so[2] - sq[2], 1))

# 3. Table 4: rows should sum to 100%; the text's "both factual in a further 17%"
f = [r['v'][0] for r in T['t4']['rows']]; s_ = [r['v'][1] for r in T['t4']['rows']]
R['t4'] = dict(sum_fact=round(sum(f), 1), sum_spec=round(sum(s_), 1), pairs=452,
               rag_better_pairs=round(0.427 * 452, 1), bart_better_pairs=round(0.071 * 452, 1),
               fact_ratio=round(42.7 / 7.1, 1), spec_ratio=round(37.4 / 16.8, 1), text_both_factual=17, table_both_good=11.7, table_both_poor=17.7)

# 4. Table 6: learned retrieval against frozen and BM25, cell by cell
t6 = T['t6']; cmp = []
for fam in ('tok', 'seq'):
    L = next(r for r in t6['rows'] if r['f'] == fam and r['r'] == 'Learned')['v']
    for other in ('Frozen', 'BM25'):
        O = next(r for r in t6['rows'] if r['f'] == fam and r['r'] == other)['v']
        js = range(len(L)) if fam == 'tok' else range(8)   # FEVER columns are shared between the two families
        d = [round(L[j] - O[j], 1) for j in js]
        cmp.append(dict(fam=fam, vs=other, deltas=d, wins=sum(x > 0 for x in d), ties=sum(x == 0 for x in d), losses=sum(x < 0 for x in d),
                        small=sum(0 <= x < 1 for x in d)))
R['t6'] = cmp
R['t6_qa_gain_frozen_tok'] = [round(a - b_, 1) for a, b_ in zip(row('t6', 'RAG-Token')[:4], row('t6', 'RAG-Token-Frozen')[:4])]
R['t6_qa_gain_bm25_tok'] = [round(a - b_, 1) for a, b_ in zip(row('t6', 'RAG-Token')[:4], row('t6', 'RAG-Token-BM25')[:4])]

# 5. Index hot-swapping (§4.5): 82 leaders; which integer counts give the printed percentages, and their noise
hs = {}
for k, p in (('2016_on_2016', 70), ('2018_on_2018', 68), ('2018idx_2016leaders', 12), ('2016idx_2018leaders', 4)):
    c = round(p / 100 * 82); hs[k] = dict(pct=p, count=c, exact=round(100 * c / 82, 1), se=round(se(p, 82), 1))
R['hot_swap'] = hs

# 6. Appendix G and C: parameters, index size and memory
R['params'] = dict(listed_total=110 + 110 + 406, actually_trained=110 + 406, bart_text_2_3=400, bart_app_g=406, t5_11b=11000, t5_large=770, t5_large_nq=28.9)
R['index'] = dict(values_paper_728=round(21e6 * 728 / 1e9, 2), values_768=round(21e6 * 768 / 1e9, 2),
                  gb_fp32_768=round(21e6 * 768 * 4 / 1e9, 1), gb_fp16_768=round(21e6 * 768 * 2 / 1e9, 1), gb_8bit_768=round(21e6 * 768 / 1e9, 1),
                  paper_cpu_gb=100, paper_compressed_gb=36, words=21e6 * 100)
R['fever_retrieval'] = dict(top1_gold=71, top10_gold=90)
R['nq_answer_absent'] = 11.8
R['decoding'] = dict(qa_k_token=15, qa_k_seq=50, gen_k=10, beam=4, train_k=[5, 10])

os.makedirs(os.path.join(HERE, 'inputs'), exist_ok=True)
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for x in sota: print('T1', x)
    print('T2', R['t2']); print('T4', R['t4'])
    for x in cmp: print('T6', x)
    print('swap', hs); print('params', R['params']); print('index', R['index'])
