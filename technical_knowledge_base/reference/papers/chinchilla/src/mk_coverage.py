"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Corrections are said in the 'where' text.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and properties
 ('Reading time line "9 min read, +~3h resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Hoffmann, Borgeaud, Mensch, Buchatskaya, Cai, Rutherford, de Las Casas, Hendricks, Welbl, Clark, ... Rae, Vinyals, Sifre', R + ', headline card (now the full author list)', ['Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch', 'Jack W. Rae, Oriol Vinyals, Laurent Sifre']),
 ('Lab: DeepMind', R + ', headline card', ['DeepMind']),
 ('Date: March 2022 (NeurIPS 2022)', R + ', headline card', ['March 2022', 'NeurIPS 2022']),
 ('Link arXiv:2203.15556 (~1h)', 'card and Further reading (now 1h 15m with the appendix)', ['https://arxiv.org/abs/2203.15556', '(1h 15m)']),
 ('Takeaway property (stays in the database)', 'stays in the database; also the card\'s "In one line"', ['Compute-optimal training scales params and tokens equally (about 20 tokens/param)']),
 # resources
 ("Chinchilla's wild implications (nostalgebraist, ~30 min)", 'Further reading, Best resources', ['https://www.lesswrong.com/posts/6Fpvch8RR29qLEWNH/chinchilla-s-wild-implications', 'reframes scaling as data-bound rather than parameter-bound', '(30 min)']),
 ('Chinchilla data-optimal scaling laws: in plain English (Alan Thompson, ~15 min)', 'Further reading, Best resources', ['https://lifearchitect.ai/chinchilla/', 'with tables applying it to real model sizes', '(15 min)']),
 ('Chinchilla scaling: a replication attempt (Epoch AI, Besiroglu et al. 2024, ~30 min): refits Approach 3 from extracted data, finds fitting bugs, corrected fit agrees', 'Further reading; the whole Refit tab; How much of this to believe', ['https://epoch.ai/publications/chinchilla-scaling-a-replication-attempt', 'The essential critique', 'Refit Approach 3']),
 ('Beyond Chinchilla-Optimal (Sardana et al., MosaicML 2023, ~45 min): inference cost, why everyone overtrains', 'Further reading; Why it matters; Then and now animation', ['https://arxiv.org/abs/2401.00448', 'formalising why everyone now overtrains past the Chinchilla point', '(45 min)']),
 # problem
 ('2022: scaling parameters with data roughly constant: GPT-3 175B, Jurassic-1 178B, Gopher 280B, MT-NLG 530B on about 300B tokens', R + ', Problem (Table 1 rebuilt; MT-NLG was 270B tokens, LaMDA 168B)', ['roughly 300 billion tokens', 'Jurassic', 'MT-NLG 530B', '270 Billion']),
 ('Kaplan: 10x compute, model 5.5x, data 1.8x (N_opt ~ C^0.73, D_opt ~ C^0.27)', R + ', Problem (the paper\'s 5.5x and 1.8x, recomputed 5.4x and 1.9x)', ['the model should grow 5.5× and the data only 1.8×', 'give 5.4× and 1.9×']),
 ('Question: fixed FLOP budget C, minimise L(N, D) subject to FLOPs(N, D) ~= 6ND = C', R + ', Problem (Eq. 1)', ['given a fixed FLOP budget C , which model size N and token count D minimise the final pretraining loss']),
 ("Kaplan's flaw: fixed LR schedule length, intermediate losses overestimate, bias toward bigger model less data", R + ', Problem, with the learning-rate slider; qualified by Porian et al. in Believe it?', ['One learning-rate schedule for every run', 'its loss overestimates what a run whose schedule ends at D', 'matching the schedule mattered little']),
 ('Chinchilla matches the cosine horizon to each run (decay 10x over about D tokens)', R + ', Problem, Setup, Approach 1', ['decay 10× over about D tokens', 'cycle matched to the run\'s tokens']),
 ('Larger models: most above 500M against Kaplan\'s mostly sub-100M', R + ', Problem', ['Most runs here have over 500M parameters', 'most of Kaplan\'s had under 100M']),
 # method
 ('Over 400 Transformer LMs, 70M to 16B, 5B to over 500B tokens of MassiveText', R + ', Setup. Corrected: the abstract says 5 to 500B tokens and §1 "over 400B"; "over 500B" appears nowhere', ['over 400 dense Transformer language models', '5B to 500B tokens (the abstract; §1 says "over 400B")', 'MassiveText']),
 ('Approach 1: per N, 4 runs with cosine horizons spanning 16x; interpolate smoothed loss curves; lower envelope of loss vs FLOPs; power laws: 0.50 / 0.50', R + ', Approach 1', ['train 4 runs whose cosine horizons span 16×', 'lower envelope of all the curves', 'N opt ∝ C 0.50 and D opt ∝ C 0.50']),
 ('Approach 2: 9 budgets 6e18 to 3e21, vary size, parabola per budget, valley minimum, power laws through minima: 0.49 / 0.51', R + ', Approach 2 (Figure 3 rebuilt from extracted points, which give 0.51)', ['Fix 9 budgets from 6 × 10 18 to 3 × 10 21 FLOPs', 'Fit a parabola to each valley', 'a = 0.49, b = 0.51']),
 ('Approach 3: L(N, D) = E + A/N^alpha + B/D^beta on all final losses; E text entropy, N term finite capacity, D term finite data/steps', R + ', Approach 3', ['L̂ ( N , D ) = E + A / N α + B / D β', 'the entropy of natural text', 'what a finite number of single-epoch optimisation steps loses']),
 ('Approach 3 fitting: Huber (delta 1e-3) on log-loss with L-BFGS', R + ', Approach 3; Refit tab', ['Huber loss (δ = 10 −3 , robust to outliers)', 'by L-BFGS from a grid of 4,500 starts']),
 ('Fitted values E 1.69, A 406.4, B 410.7, alpha 0.34, beta 0.28', R + ', Approach 3 (Eq. 10); Refit tab', ['1.69 + 406.4/ N 0.34 + 410.7/ D 0.28']),
 ('Minimising under 6ND = C: a = alpha/(alpha+beta), b = beta/(alpha+beta), giving 0.46 / 0.54', R + ', Approach 3. Corrected: Eq. 4 has a = beta/(alpha+beta) and b = alpha/(alpha+beta) (the model exponent comes from the data exponent); 0.46 comes from the unrounded constants, the rounded ones give 0.452', ['a = β/(α+β)', 'b = α/(α+β)', 'So the model exponent comes from the data exponent', 'give 0.452 and 0.548']),
 ('All three agree: scale parameters and tokens equally, against Kaplan 0.73 / 0.27', R + ', The answer', ['All three approaches say parameters and tokens should grow in equal proportion with compute', 'against Kaplan\'s 0.73/0.27']),
 ('Table 3: about 20 tokens per parameter (1B/20.2B, 67B/1.5T, 175B/3.7T, 280B/5.9T)', R + ', The answer; Tables tab Table 3 rebuilt', ['about 20 tokens per parameter, roughly constant with scale', '1B parameters wants 20.2B tokens', '67B wants 1.5T', '175B wants 3.7T', '280B wants 5.9T']),
 ('Chinchilla 70B on 1.4T tokens (exactly 20 t/p), Gopher\'s budget 5.76e23, 4x smaller, 4x more data', R + ', Same budget animation; Chinchilla, the test; card', ['70B on 1.4T tokens, exactly 20 tokens per parameter', '5.76 × 10 23']),
 ('Differences from Gopher: AdamW (better final loss and downstream)', R + ', Chinchilla, the test; Believe it?', ['AdamW instead of Adam', 'improves the language-modelling loss and downstream results after fine-tuning']),
 ('SentencePiece tokenizer without NFKC (helps maths and chemistry)', R + ', Chinchilla, the test', ['without NFKC normalisation', 'it helps mathematics and chemistry']),
 ('bfloat16 forward/backward, float32 optimizer-state copy of weights', R + ', Chinchilla, the test', ['forward and backward in bfloat16 with a float32 copy of the weights']),
 ('Higher max LR, 1e-4 against Gopher\'s 4e-5', R + ', Chinchilla, the test (Table 4 rebuilt)', ['peak learning rate 1 × 10 −4 against Gopher\'s 4 × 10 −5']),
 ('Trained on TPUv3/v4 with JAX and Haiku', R + ', Chinchilla, the test', ['Trained on TPUv3 and TPUv4 with JAX and Haiku']),
 # results
 ('Beats Gopher, GPT-3, Jurassic-1, MT-NLG across the board at same or less compute', R + ', Results', ['Chinchilla beats Gopher (280B), GPT-3 (175B), Jurassic-1 (178B) and MT-NLG (530B)']),
 ('MMLU 67.6% 5-shot, +7.6 over Gopher 60.0, above GPT-3 43.9 and the June 2023 forecast 63.4; first model above 90% on four subtasks', R + ', Results; card; Tables tab', ['67.6% 5-shot average', 'Gopher\'s 60.0%', 'GPT-3\'s 43.9%', 'June 2023 forecast of 63.4%', 'above 90% on four tasks']),
 ('BIG-bench 65.1 against 54.4 (+10.7), better on 58 of 62', R + ', Results (per-task chart rebuilt from Table A7)', ['65.1% against 54.4% (+10.7), better on 58 of 62']),
 ('Language modelling: lower bpb on every Pile subset; WikiText-103 7.16 against 7.75, leakage caveat', R + ', Results', ['lower bits per byte than Gopher on every subset of The Pile', 'WikiText-103 perplexity 7.16 against 7.75', 'train/test leakage']),
 ('LAMBADA 77.4 (74.5 Gopher, 76.6 MT-NLG); RACE-h/m over 10 points better', R + ', Results', ['LAMBADA 77.4% zero-shot (Gopher 74.5, MT-NLG 76.6)', 'over 10 points above Gopher']),
 ('Natural Questions closed-book SOTA 31.5 5-shot, 35.5 64-shot against Gopher 24.5 / 28.2', R + ', Results; Tables tab (the text\'s 21% and 28% noted)', ['Natural Questions 31.5% 5-shot and 35.5% 64-shot', 'Gopher 24.5% and 28.2%']),
 ('TruthfulQA 43.6% 0-shot against Gopher 29.5%', R + ', Results', ['43.6%, 58.5%, 66.7% at 0, 5, 10 shots against Gopher\'s 29.5%']),
 ('4x smaller: inference and fine-tuning cost 4x lower, the win is not only at training time', R + ', Results; card', ['costs about a quarter as much to fine-tune and to serve, so the gain is not only at training time']),
 ('Extrapolation: Gopher should have had 6.8T tokens (17x its 300B)', R + ', The answer (callout). Corrected: 6.8T is the text\'s figure for a 280B model at about 1e25 FLOPs and is 23x Gopher\'s 300B; Table 3 says 5.9T (20x); 17.2 is Table 3\'s FLOPs in Gopher units, not a token multiple', ['6.8T tokens', '6.8T would be 23×', 'which is 20× Gopher\'s 300B']),
 ('A 1T-parameter model is only optimal past 1e26 FLOPs', R + ', The answer', ['a 1-trillion-parameter model is only worth training above about 10 26 FLOPs']),
 ('IsoFLOP analysis replicated on C4 and GitHub code: same equal scaling', R + ', The answer; Then and now replications table', ['on C4 gives 0.50/0.50 and on GitHub code 0.53/0.47']),
 ('Stated limitations: only two comparable large runs; power-law frontier assumed but concavity suggests optimal size overestimated; single epoch', R + ', Believe it? (each with the authors\' own statement credited)', ['Only Chinchilla and Gopher are compared at scale', 'A power-law frontier is assumed', 'large optimal models may still be overestimated', 'Single epoch, except the test']),
 # why it matters
 ('Reset pretraining budgeting; ended "parameters are all that matter"; data-bound; dataset scale and quality first-class', R + ', Why it matters', ['This paper reset how the field budgets pretraining', '"parameters are all that matter"', 'progress became data-bound']),
 ('Direct line to the 15T-token corpora of 2024-2025 and data-curation research', R + ', Why it matters', ['the 15T-token corpora of 2024 and 2025']),
 ('Rule of thumb 20 t/p with N and D doubled together as budget doubles', R + ', The answer. Corrected: doubling the model means doubling the tokens; doubling the budget grows each by about 1.41x', ['for every doubling of model size the number of training tokens should also be doubled', 'doubling the budget grows each by √2 ≈ 1.41']),
 ('Lasting lessons: match the LR schedule to the horizon; IsoFLOP sweeps of small models before the big run; the L(N, D) form reused', R + ', Why it matters', ['match the schedule to the run, run IsoFLOP sweeps of small models', 'a form later work reuses constantly']),
 ('Approach 3 fit had bugs (Besiroglu et al., arXiv:2404.10102): averaged Huber losses instead of summing, early termination; implausibly tight CIs; corrected a and b about 0.5, about 20 t/p; headline robust, constants not reusable', R + ', Believe it? (reproduced live in the Refit tab); verdict; card', ['the Huber losses were averaged instead of summed', 'Implausibly tight intervals', 'so a = 0.51 and about 20 tokens per parameter', 'Do not reuse the Approach 3 constants', '2404.10102']),
 ('Chinchilla-optimal is not deployment-optimal; with lifetime inference a smaller model trained past 20 t/p is cheaper (Sardana et al., arXiv:2401.00448)', R + ', Why it matters; Then and now animation', ['Chinchilla-optimal is not deployment-optimal', 'a smaller model trained far past 20 tokens per parameter costs less overall']),
 ('Standard practice: Llama 2 7B ~290 t/p, Llama 3 8B ~1875 t/p (15T tokens), Gemma 2 9B ~890 t/p', R + ', Why it matters (predict question); Then and now timeline (Llama 2 7B is 286)', ['Llama 2 7B had 286', 'Gemma 2 9B 889', '1,875']),
 ('Loss in D flattens but keeps improving; overtraining trades training compute for a permanently cheaper model', R + ', Why it matters', ['overtraining trades extra training compute for a permanently cheaper model']),
 ('Read Chinchilla as the compute-optimal anchor to deviate from once inference is counted', R + ', Using this today', ['Read Chinchilla as the compute-optimal anchor from which you deviate toward more data once inference is counted']),
 # connections
 ('Scaling Laws (2020): the Kaplan result corrected; LR-schedule handling and model-size range', 'Connections; Problem; Further reading', ['3c65c17b0d0d81b08a1debb0c15cd252', 'the Kaplan result this paper corrects']),
 ('GPT-3 (2020): archetypal under-trained model, 175B on 300B, frontier says 3.7T', 'Connections; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', '175B on 300B tokens where Table 3 says 3.7T']),
 ('Llama 3 (2024): deliberate overtraining for inference economics', 'Connections; Then and now; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', 'deliberately overtrained smaller models']),
 ('DeepSeek-V3 (2024): heavily overtrained MoE; MoE needs its own scaling treatment', 'Connections; Then and now timeline; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'heavily overtrained mixture of experts', 'MoE needs its own scaling treatment']),
 ('Switch Transformer (2021): sparse models change N; related work flags MoE fixed-token-count flaw', 'Connections; Further reading', ['3c65c17b0d0d81a8b541c9babbf40c94', 'shared Kaplan\'s fixed-token-count flaw']),
 ('Topics: llm-training-and-post-training (pretraining budgets, scaling laws), data-curation-and-datasets', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f', 'the result that made dataset scale the binding constraint']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': [o['fact'] for o in out if 'Corrected' in o['where']], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
