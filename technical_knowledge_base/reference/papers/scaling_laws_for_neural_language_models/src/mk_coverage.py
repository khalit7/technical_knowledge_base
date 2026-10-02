"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and properties
 ('Reading time line "8 min read, +~4h resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Kaplan, McCandlish (equal contribution), Henighan, Brown, Chess, Child, Gray, Radford, Wu, Amodei', R + ', headline card', ['Jared Kaplan, Sam McCandlish (equal contribution)', 'Tom Henighan', 'Tom B. Brown', 'Benjamin Chess', 'Rewon Child', 'Scott Gray', 'Alec Radford', 'Jeffrey Wu', 'Dario Amodei']),
 ('Lab: OpenAI / Johns Hopkins', R + ', headline card', ['OpenAI, Johns Hopkins University']),
 ('Date: January 2020', R + ', headline card', ['January 2020']),
 ('Link arXiv:2001.08361 (~1h 30m, long paper)', 'card and Further reading', ['https://arxiv.org/abs/2001.08361', '(1h 30m)']),
 ('Takeaway property (stays in the database)', 'stays in the database; also the card\'s "In one line"', ['LM loss follows smooth power laws in N, D, and C over 6+ orders of magnitude']),
 # resources
 ('Scaling Laws, Carefully (Lilian Weng, ~50 min)', 'Further reading, Best resources', ['https://lilianweng.github.io/posts/2026-06-24-scaling-laws/', 'with the fitting pitfalls spelled out', '(50 min)']),
 ('Scaling Laws for LLM Pretraining (Jonas Vetterle, ~25 min)', 'Further reading, Best resources', ['https://www.jonvet.com/blog/llm-scaling-laws', 'good for building intuition before running a sweep', '(25 min)']),
 ('Resolving Discrepancies (Porian et al. 2024, ~45 min): which choices moved the exponents', 'Further reading, Best resources (description now names the three causes); also Why it matters and Then and now', ['https://arxiv.org/abs/2406.19146', 'the forensic reconciliation of Kaplan and Chinchilla', '(45 min)']),
 ("Chinchilla's wild implications (nostalgebraist, ~30 min)", 'Further reading, Best resources', ['https://www.lesswrong.com/posts/6Fpvch8RR29qLEWNH/chinchilla-s-wild-implications', 'data as the binding constraint', '(30 min)']),
 # problem
 ('Early 2020: no quantitative answer to 10x compute, nor how to split it between model, data, training', R + ', Problem', ['how language model loss would improve if you spent 10× more compute']),
 ('Architecture papers tuned shape at fixed scale; nobody mapped loss across orders of magnitude in N, D, C or the budget question (N, D, batch, steps)', R + ', Problem', ['Architecture papers tuned shape (depth, width, heads) at a fixed scale', 'which N , D , batch size and step count give the lowest loss']),
 # method
 ('Decoder-only Transformers on WebText2 (22.9B BPE tokens, vocab 50257, context 1024); loss = test cross-entropy in nats/token', R + ', Method (2.29 × 10^10 tokens as §2.3 prints)', ['decoder-only Transformers', 'vocabulary 50,257', 'cross-entropy in nats per token over a 1024-token context', '2.29 × 10 10 tokens']),
 ('Sweep: N 768 to 1.5B non-embedding, D 22M to 23B, depth/width/heads, context, batch; LSTMs for comparison', R + ', Method', ['N from 768 to 1.5B non-embedding parameters', 'D from 22M to 23B tokens', 'LSTMs and Universal Transformers for comparison']),
 ('N counts non-embedding params only, N ~= 12 n_layer d_model^2; including embeddings obscures trends (depth appears to matter)', R + ', Method; toy sweep "all parameters" toggle', ['counts non-embedding parameters only', 'depth seems to matter', '12 n layer d model 2']),
 ('C ~= 6NBS non-embedding FLOPs (2N forward, 4N backward); C ~= 6ND for one epoch', R + ', Method', ['C ≈ 6 NBS', '= 6 ND for one pass', '2 N per token forward, twice that backward']),
 ('Constants N_c, D_c, C_c tokenizer-dependent; exponents the transferable content', R + ', Three power laws', ['the exponents are the transferable content', 'no fundamental meaning']),
 ('L(N) = (N_c/N)^0.076, N_c ~= 8.8e13; doubling N multiplies loss by 2^-0.076 ~= 0.95', R + ', Three power laws; predict question; card', ['8.8 × 10 13 parameters', 'doubling N multiplies the loss by 0.95']),
 ('L(D) = (D_c/D)^0.095, D_c ~= 5.4e13 tokens (large model, early stopping)', R + ', Three power laws', ['5.4 × 10 13 tokens', 'stopped when test loss stops falling']),
 ('L(C_min) = (C_c/C_min)^0.050, C_c ~= 3.1e8 PF-days (optimal N, batch below critical)', R + ', Three power laws', ['3.1 × 10 8 PF-days', 'a batch well below the critical batch']),
 ('Joint L(N,D) = [(N_c/N)^(a_N/a_D) + D_c/D]^a_D with a_N 0.076, a_D 0.103', R + ', Overfitting; Tables tab Table 2', ['α N = 0.076, α D = 0.103', 'A single equation joins the two limits and the overfitting between them']),
 ('Overfitting penalty depends only on N^0.74/D; D >~ 5e3 N^0.74 to stay below run-to-run noise', R + ', Overfitting; card; Figure 9 rebuilt', ['depends only on N 0.74 / D', '(5 × 10 3 ) N 0.74 tokens']),
 ('Training curves L(N,S) = (N_c/N)^a_N + (S_c/S_min)^a_S, a_S ~= 0.76, S_c ~= 2.1e3; extrapolate final loss from early curve after warmup', R + ', Training curves; animation', ['α S = 0.76', 'S c = 2.1 × 10 3', 'the early part of a curve predicts its end']),
 ('Critical batch depends only on the loss: B_crit = B*/L^(1/a_B), B* ~= 2e8 tokens, a_B ~= 0.21, roughly 1-2M tokens near convergence', R + ', Training curves (with the recomputed 1.1M at L 3.0 and 4.0M at L 2.3)', ['it depends only on the loss, not on N', '(2 × 10 8 tokens) / L 1/0.21', 'roughly 1-2 million tokens at convergence for the largest models']),
 ('Below B_crit compute-efficient; above it wall-clock time bought with wasted FLOPs', R + ', Training curves; batch explorer', ['Below B crit training is compute-efficient; above it, wall-clock time is bought with wasted FLOPs']),
 ('Compute-optimal allocation N ~ C^0.73, B ~ C^0.24, S ~ C^0.03, D ~ C^0.27', R + ', Spending compute; Tables tab Table 6', ['N opt = 1.3 × 10 9 C min 0.73', 'B ∝ C min 0.24', 'S min ∝ C min 0.03', 'D opt ∝ C min 0.27']),
 ('10x compute: about 5x model, 2x data, serial steps nearly flat', R + ', Spending compute; predict question; card', ['10× compute means about 5× the model and 2× the data', 'not more steps']),
 ('Shape is second-order: 40x aspect ratio moves loss a few percent', R + ', Three power laws', ['the aspect ratio can vary 40× for a few percent of loss']),
 # results
 ('Smooth power law in N, D, C_min over 6-8 orders of magnitude, no deviation at the top; shape and hyperparameters barely matter', R + ', Results', ['over six to eight orders of magnitude, with no deviation at the top']),
 ('Larger models strictly more sample-efficient: any target loss in fewer steps and tokens', R + ', Results; Training curves', ['Larger models are strictly more sample-efficient', 'larger models reach any loss in fewer steps and tokens']),
 ('Compute-efficient: very large models stopped far short of convergence, opposite of then-standard practice', R + ', Results; animation', ['very large models stopped far short of convergence', 'the opposite of the then-standard practice of converging small models']),
 ('Transfer to Books, Wikipedia, Common Crawl tracks WebText2 loss with a constant offset; in-distribution loss a good proxy', R + ', Three power laws; Results', ['a roughly constant offset', 'in-distribution loss is a good proxy']),
 ('L(C_min) and L(D(C_min)) intersect at C* ~ 1e4 PF-days, N* ~ 1e12, L* ~ 1.7 nats/token; laws must break down or all information extracted', R + ', Spending compute (Figure 15 rebuilt, crossing recomputed); Results', ['C * ~ 10 4 PF-days', 'N * ~ 10 12 parameters', 'L * ~ 1.7 nats/token', 'where models have extracted all its reliable information']),
 # why it matters
 ('Made scale a quantitative engineering discipline', R + ', Why it matters', ['This paper made scale a quantitative engineering discipline']),
 ('Justified GPT-3 (trained "significantly short of convergence")', R + ', Why it matters. Corrected: that phrase is not in the GPT-3 paper; replaced by GPT-3 Figure 2.2\'s own sentence citing this paper', ['much larger models on many fewer tokens than is typical']),
 ('Loss-vs-compute extrapolation as the planning tool; popularised C ~= 6ND, critical batch, power-law fitting', R + ', Why it matters', ['loss-against-compute extrapolation the planning tool', 'the critical batch and power-law fitting as standard vocabulary']),
 ('Chinchilla redid the sweep with LR schedule matched to run length: N_opt ~ C^0.5, D_opt ~ C^0.5, D ~= 20N', R + ', Why it matters; Then and now', ['redid the sweep with each cosine schedule matched to its run\'s length', 'about 20 tokens per parameter']),
 ('Gopher-class models roughly 4x oversized; 70B Chinchilla on 1.4T tokens beat 280B Gopher at equal compute', R + ', Why it matters; Then and now animation', ['about 4× smaller on 4× more tokens', '70B Chinchilla on 1.4T tokens beat 280B Gopher at equal compute']),
 ('Discrepancy: fixed 2.5e5-step schedule and fixed warmup (undertraining small models, flattering large N)', R + ', How much to believe; Why it matters', ['The allocation rests on one schedule', 'a warmup too long for small models']),
 ('Discrepancy: counted only non-embedding params and FLOPs (embeddings a large fraction at small scale)', R + ', Why it matters. Corrected per Porian et al. §3.2: the cost that matters is the output layer, not the input embeddings', ['uncounted output-layer compute (not the input embeddings)']),
 ('Discrepancy: did not retune optimizer hyperparameters across scales', R + ', Why it matters; Then and now table', ['optimiser settings not retuned per size']),
 ('Correcting these moves the allocation exponent from ~0.73-0.88 to ~0.5', R + ', Why it matters; Then and now table', ['from about 0.73 to 0.88 down to about 0.5']),
 ('Planning today: D ~= 20N start, overtrain past it for inference (Llama-style)', R + ', Using this today', ['Start from Chinchilla\'s D ≈ 20 N as the compute-optimal point', 'overtrain past it when inference cost matters']),
 ('Planning today: always decay LR to near zero exactly at the planned budget', R + ', Using this today. Corrected: Porian et al. find matched decay barely moves the exponent but still lowers the loss', ['decay the learning rate at the planned budget', 'barely moves the exponent']),
 ('Planning today: fit on total parameters', R + ', Using this today. Corrected: count the output layer (Porian et al. define N as all linear layers including the head, excluding embeddings)', ['Count the output layer in N and C']),
 ('Survived: power-law form, shape insensitivity, sample efficiency, critical batch, L(N,D) overfitting law', R + ', Why it matters; verdict; Then and now "Survived"', ['survived and remain the working toolkit']),
 # connections
 ('Chinchilla (2022): direct successor, equal N and D scaling (~20 tokens/param)', 'Connections; Further reading', ['3c65c17b0d0d8116b7ddffba5c599f3f', 'the direct successor']),
 ('GPT-3 (2020): first frontier model on these prescriptions', 'Connections; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', 'the first frontier model built on these prescriptions']),
 ('Attention Is All You Need (2017): parallelism made the compute scales reachable', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'whose parallelism made these compute scales reachable']),
 ('Llama 3 and DeepSeek-V3 (2024): deliberate overtraining for cheaper inference', 'Connections; Then and now; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', '3c65c17b0d0d815fb8dac9ba1e35ab81', 'deliberately overtraining far beyond compute-optimal']),
 ('Topics: llm-training-and-post-training, data-curation-and-datasets, ml-fundamentals (with their notes)', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f', '3c65c17b0d0d81d796ccc0a293218c57', 'power-law fitting, overfitting']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
