"""Build parts/31_js_bias_data.js (window.JB_DATA) from inputs/*.json and the published figures typed below.
Every published figure carries its source, table and date; every recount names the released file it came from.
Run after mtbench.py, alpaca.py, arenahard.py, extract_pairs.py.  python3 mk_data.py
"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs')
L = lambda f: json.load(open(os.path.join(I, f)))
pairs, mt, ae, ah = L('pairs.json'), L('mtbench_summary.json'), L('alpaca_summary.json'), L('arenahard_summary.json')
D = pairs['dice']
QUOTES = {  # verbatim substrings of each released judgment (checked below)
 'gpt-4-1106-preview': ["Assistant B's answer is significantly better as it correctly calculates the confidence interval",
                        "Assistant B's answer is closer to the correct confidence interval despite the slight error in the margin of error calculation"],
 'claude-3-opus-20240229': ["The correct interval, as provided by Assistant B and me, is approximately (346.65, 353.35).",
                            "Assistant A's answer is correct and matches my own."],
 'claude-3-5-sonnet-20240620': ["Given that Assistant A provided the correct answer and explanation, while Assistant B made a significant error in the final calculation",
                                "The error in Assistant A's answer outweighs the additional context provided about the Central Limit Theorem."],
 'gemini-1.5-pro-api-0514': ["No corrections are needed for the calculations or results.",
                             "Assistant A demonstrates greater precision in its calculations"],
 'llama-3-70b-instruct': ["Assistant A's answer is correct and well-structured.",
                          "Assistant A's answer is more helpful, relevant, and concise."],
}
OWN = {  # the judge's own worked answer inside its judgment (Arena-Hard's prompt asks for it first); substring checks below
 'gpt-4-1106-preview': ['346.65 to 353.35', '(316.527, 383.473)'],
 'claude-3-opus-20240229': ['(346.65, 353.35)', '(346.65, 353.35)'],
}
judges = []
for j, qs in QUOTES.items():
    g = D['judges'][j]
    for k in range(2): assert qs[k] in g[k]['judgment'], (j, k)
    if j in OWN:
        for k in range(2): assert OWN[j][k] in g[k]['judgment'], (j, k, 'own')
    judges.append(dict(id=j, scores=[g[0]['score'], g[1]['score']], quotes=qs, own=OWN.get(j)))
dice = dict(prompt=D['prompt'], uid=D['uid'], baseline=D['baseline'], candidate=D['candidate'],
            a_base=D['answer_baseline'], a_cand=D['answer_candidate'], judges=judges)
# gold label for the dice pair: the exact distribution of the sum of 100 fair dice (integer convolution)
from fractions import Fraction
dist = [1]
for _ in range(100):
    nxt = [0] * (len(dist) + 6)
    for i, c in enumerate(dist):
        for f in range(1, 7): nxt[i + f] += c
    dist = nxt
tot = 6 ** 100; acc = 0; lo = hi = None
for s_, v in enumerate(dist):
    acc += v
    if lo is None and Fraction(acc, tot) >= Fraction(25, 1000): lo = s_
    if hi is None and Fraction(acc, tot) >= Fraction(975, 1000): hi = s_
dice['gold'] = dict(lo=lo, hi=hi, cover=round(100 * sum(dist[lo:hi + 1]) / tot, 2),
                    cand_cover=round(100 * sum(dist[347:354]) / tot, 1), base_cover=round(100 * sum(dist[317:384]) / tot, 2))
ocean = pairs['ocean']
# ---- published figures (typed from the papers; recompute.py re-derives every difference shown) ----
Z = dict(cite='Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena', url='https://arxiv.org/abs/2306.05685', ver='arXiv v4, 24 Dec 2023 (NeurIPS 2023)')
W = dict(cite='Wang et al., Large Language Models are not Fair Evaluators', url='https://arxiv.org/abs/2305.17926', ver='arXiv v2, 30 Aug 2023 (ACL 2024)')
S = dict(cite='Shi et al., Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge', url='https://arxiv.org/abs/2406.07791', ver='arXiv v9, 11 Nov 2025')
P = dict(cite='Panickssery et al., LLM Evaluators Recognize and Favor Their Own Generations', url='https://arxiv.org/abs/2404.13076', ver='arXiv v1, 15 Apr 2024 (NeurIPS 2024)')
A = dict(cite='Dubois et al., Length-Controlled AlpacaEval', url='https://arxiv.org/abs/2404.04475', ver='arXiv v2, 10 Mar 2025 (COLM 2024)')
V = dict(cite='Verga et al., Replacing Judges with Juries (PoLL)', url='https://arxiv.org/abs/2404.18796', ver='arXiv v2, 1 May 2024')
AH = dict(cite='Arena-Hard-Auto v0.1 released judgments (Li et al.)', url='https://huggingface.co/datasets/lmarena-ai/arena-hard-auto', ver='judged 2024; files read 4 Oct 2026')
MTR = dict(cite='MT-Bench released GPT-4 pairwise judgments (FastChat)', url='https://huggingface.co/spaces/lmsys/mt-bench/tree/main/data/mt_bench/model_judgment', ver='released 2023; files read 4 Oct 2026')
AER = dict(cite='AlpacaEval 2 released annotations and leaderboard', url='https://github.com/tatsu-lab/alpaca_eval', ver='files read 4 Oct 2026')
pos_panels = [
 dict(src=Z, where='Table 2, default prompt', setup='80 MT-Bench first-turn questions, two similar answers from GPT-3.5 (temperature 0.7), each judged in both orders', kind='pub',
      rows=[dict(j='GPT-4', c=65.0, f=30.0, s=5.0, e=0.0), dict(j='GPT-3.5', c=46.2, f=50.0, s=1.2, e=2.5), dict(j='Claude-v1', c=23.8, f=75.0, s=0.0, e=1.2)]),
 dict(src=AH, where="this page's recount (arenahard.py)", setup='500 Arena-Hard prompts, each model against GPT-4-0314, both orders; verdicts reduced to their sign; models per judge: '
      + ', '.join('%s %d' % (k, v['models']) for k, v in sorted(ah['judges'].items())), kind='recount',
      rows=[dict(j=k, c=v['consistent'], f=v['primacy'], s=v['recency'], e=0.0, n=v['n']) for k, v in sorted(ah['judges'].items(), key=lambda kv: -kv[1]['consistent'])]),
 dict(src=MTR, where="this page's recount (mtbench.py)", setup='GPT-4 judging 30 models against GPT-3.5-turbo on all 160 MT-Bench turns, both orders (4,800 judgments; the leaderboard file, not Table 2\'s set)', kind='recount',
      rows=[dict(j='GPT-4 (all)', c=mt['released_pair_file']['all']['pct']['consistent'], f=mt['released_pair_file']['all']['pct']['first'], s=mt['released_pair_file']['all']['pct']['second'], e=mt['released_pair_file']['all']['pct']['error'], n=4800)]),
]
shi = [('Claude-3.5-Sonnet', .82), ('GPT-4', .82), ('Llama-3.3-70B', .80), ('Llama-3.1-405B', .77), ('GPT-4o', .76), ('o1-mini', .76), ('GPT-4-Turbo', .75),
       ('Claude-3-Opus', .70), ('GPT-3.5-Turbo', .70), ('Llama-3.1-8B', .69), ('Gemini-1.5-flash', .67), ('Gemini-1.5-pro', .62), ('Claude-3-Sonnet', .59),
       ('Claude-3-Haiku', .57), ('Gemini-1.0-pro', .57)]
pos_panels.append(dict(src=S, where='Table 2, MTBench pairwise, position consistency PC (mean over candidates and tasks)', setup='15 judges, MT-Bench answers of about 40 models; PC only (primacy and recency split not given as shares)', kind='pub',
                       rows=[dict(j=a, c=round(100 * b, 1), dp=0) for a, b in shi]))
wang = dict(src=W, where='Table 2', rows=[dict(j='GPT-4', pair='Vicuna-13B vs ChatGPT', w1=51.3, w2=23.8, conflict='37 / 80 (46.3%)'),
    dict(j='GPT-4', pair='Vicuna-13B vs Alpaca-13B', w1=92.5, w2=92.5, conflict='4 / 80 (5.0%)'),
    dict(j='ChatGPT', pair='Vicuna-13B vs ChatGPT', w1=2.5, w2=82.5, conflict='66 / 80 (82.5%)'),
    dict(j='ChatGPT', pair='Vicuna-13B vs Alpaca-13B', w1=37.5, w2=90.0, conflict='42 / 80 (52.5%)')])
length = dict(
  zheng=dict(src=Z, where='Table 3, "repetitive list" attack on 23 answers (failure = the padded answer judged better)', rows=[dict(j='Claude-v1', v=91.3), dict(j='GPT-3.5', v=91.3), dict(j='GPT-4', v=8.7)]),
  alpaca=dict(src=AER, paper=A, where='leaderboard rows gpt4_1106_preview_concise and _verbose; raw win rates recounted from the 805 released annotations (alpaca.py)',
              concise=dict(raw=ae['concise']['win_rate'], lc=ae['concise']['lb_lc_win_rate'], chars=ae['concise']['lb_avg_length']),
              verbose=dict(raw=ae['verbose']['win_rate'], lc=ae['verbose']['lb_lc_win_rate'], chars=ae['verbose']['lb_avg_length']),
              baseline_chars=ae['concise']['mean_len_baseline'], flips=ae['pairs']['verbose_wins_concise_loses'], n=ae['pairs']['n']))
mtw = mt['win_rate_no_ties']
selfp = dict(
  zheng=dict(src=Z, where='Section 3.3 and Figure 2(b)', quote='GPT-4 favors itself with a 10% higher win rate; Claude-v1 favors itself with a 25% higher win rate. However, they also favor other models and GPT-3.5 does not favor itself.'),
  mt=dict(src=MTR, where="this page's recount on the 3,355 released expert votes and GPT-4's pairwise verdicts for the same six models (win rate without ties; GPT-4 restricted to the question, turn and pair keys humans also judged)",
          rows=[dict(m=m, human=mtw['human'][m]['rate'], gpt4=mtw['gpt4_pair_matched'][m]['rate'], nh=mtw['human'][m]['games'], ng=mtw['gpt4_pair_matched'][m]['games']) for m in
                ['gpt-4', 'claude-v1', 'gpt-3.5-turbo', 'vicuna-13b-v1.2', 'alpaca-13b', 'llama-13b']]),
  pan=dict(src=P, where='Table 7 (no fine-tuning), pairwise self-preference score: 0.5 = no preference; summaries of 1,000 articles each, against human and other-model summaries, both orders averaged',
           rows=[dict(j='GPT-4', xsum=0.705, cnn=0.912), dict(j='GPT-3.5', xsum=0.582, cnn=0.431), dict(j='Llama-2-7b', xsum=0.511, cnn=0.505)]),
  ah=dict(src=AH, where="this page's recount: each judge's win rate for a model minus the mean of the other four judges' for the same model (8 models judged by all five)",
          models=ah['common_models'], rows=[dict(j=k, fam=ah['judges'][k]['family'], same=v['same_family_mean'], other=v['other_family_mean'],
          cells=[dict(m=r['model'], fam=r['family'], d=r['delta'], own=r['own'], oth=r['others']) for r in v['rows']]) for k, v in sorted(ah['self_pref'].items())]))
mitig = [
 dict(t='Few-shot judge prompt', what='GPT-4 position consistency (same winner in both orders), zero-shot against few-shot', unit='% consistent', before=65.0, after=77.5, better='up', src=Z, where='Table 13'),
 dict(t='Few-shot judge prompt', what='Claude-v1 position consistency, zero-shot against few-shot', unit='% consistent', before=23.8, after=63.7, better='up', src=Z, where='Table 13'),
 dict(t='Swap and average (BPC) plus evidence first (MEC)', what='GPT-4 accuracy against the human majority vote, 80 Vicuna questions', unit='% accuracy', before=52.7, after=62.5, better='up', src=W, where='Table 4 (humans averaged 71.7%)'),
 dict(t='Reference answer', what='GPT-4 judge failure rate on 10 math questions, both orders', unit='failures of 20', before=14, after=3, better='down', src=Z, where='Table 4 (default against reference-guided)'),
 dict(t='Length control', what='GPT-4 Turbo verbose minus concise win rate, same model and judge', unit='points of win rate', before=round(ae['verbose']['win_rate'] - ae['concise']['win_rate'], 1),
      after=round(ae['verbose']['lb_lc_win_rate'] - ae['concise']['lb_lc_win_rate'], 1), better='down', src=AER, where='raw against length-controlled win rates'),
 dict(t='Jury of three small judges (PoLL)', what="Cohen's kappa with humans, KILT Natural Questions, single GPT-4 against the panel", unit='kappa', before=0.627, after=0.763, better='up', src=V, where='Table 1; the panel costs 7 to 8 times less (Section 4.5)'),
]
out = dict(dice=dice, ocean=ocean, pos=pos_panels, wang=wang, length=length, selfp=selfp, mitig=mitig)
js = '// generated by src/bias/mk_data.py from src/bias/inputs/*.json; do not edit by hand\nwindow.JB_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
assert chr(0x2014) not in js
P_ = os.path.join(H, '..', 'parts', '31_js_bias_data.js'); open(P_, 'w').write(js); print(len(js))
