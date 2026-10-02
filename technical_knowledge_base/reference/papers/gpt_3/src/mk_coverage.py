"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
TT = "The paper's tables tab"
C = [
 # header
 ('Reading time line "10 min read, +~4h 40m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Brown, Mann, Ryder, Subbiah, Kaplan and 26 others (OpenAI)', R + ', headline card (all 31 named)', ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder', 'Melanie Subbiah', 'Jared Kaplan', '(31 authors)', 'OpenAI']),
 ('Date: May 2020 (arXiv v1); NeurIPS 2020 best paper', R + ', headline card (the award is listed as Outstanding Paper on the NeurIPS awards page)', ['May 2020', 'arXiv v1 28 May 2020', 'NeurIPS 2020 (Outstanding Paper award)']),
 ('Link arXiv:2005.14165 (~3h, very long paper)', 'card and Further reading', ['https://arxiv.org/abs/2005.14165', '(3h)', 'very long']),
 ('Link OpenAI API announcement (~10 min)', 'Further reading; Why it matters (dated 11 June 2020 from the archived post)', ['https://openai.com/index/openai-api/', '11 June 2020', '(10 min)']),
 ('No weights released (API only)', 'Further reading (code entry); Why it matters (Closed weights)', ['no code and no weights (API only)', 'Released only through the API']),
 # resources
 ('Jay Alammar, How GPT-3 Works (~20 min): visual intuition for architecture and prompt-as-conditioning', 'Further reading', ['https://jalammar.github.io/how-gpt3-works-visualizations-animations/', 'prompt-as-conditioning', '(20 min)']),
 ('Samuel Albanie GPT-3 digest (~30 min): slide-style walkthrough incl. eval protocol and contamination', 'Further reading', ['https://samuelalbanie.com/digests/2022-07-gpt-3/', 'dense slide-style walkthrough', '(30 min)']),
 ('freeCodeCamp review (~25 min): end-to-end review of results and significance', 'Further reading', ['https://www.freecodecamp.org/news/ai-paper-review-language-models-are-few-shot-learners-gpt-3/', '(25 min)']),
 ('Sik-Ho Tsang review (~15 min): per-benchmark summary with key tables', 'Further reading', ['https://sh-tsang.medium.com/review-gpt-3-language-models-are-few-shot-learners-ff3e63da944d', '(15 min)']),
 # problem
 ('BERT-style pretrain then fine-tune needed thousands to hundreds of thousands of labelled examples per task', R + ', Problem', ['thousands to hundreds of thousands of examples specific to that task']),
 ('Limits applicability', R + ', Problem', ['Applicability.']),
 ('Fine-tuning on narrow distributions exploits spurious correlations; benchmark scores exaggerate', R + ', Problem', ['Spurious correlations.', 'may exaggerate actual performance on the underlying task']),
 ('Humans learn from a brief instruction or a couple of demonstrations', R + ', Problem', ['A brief directive in natural language', 'a tiny number of demonstrations']),
 ('GPT-2 hinted at in-context learning but far below fine-tuning (4% on Natural Questions)', R + ', Problem', ['in-context learning', '4% on Natural Questions']),
 ('The bet: ICL absorbs skills in pretraining and recognises tasks at inference; loss scales smoothly (Kaplan), so ICL should improve with scale', R + ', Problem', ['The bet:', 'might show similarly strong gains with scale', 'Kaplan et al. 2020']),
 # method
 ('No architectural novelty; contribution is scale plus systematic study of an evaluation paradigm', R + ', Idea', ['There is deliberately no architectural novelty']),
 ('Task in the prompt: instruction + K demonstrations, then a final context; no gradient updates ever', R + ', Idea; animation', ['K demonstrations', 'No gradient updates, ever.']),
 ('Zero-shot (instruction only), one-shot (K=1), few-shot (10 to 100, what fits in 2048)', R + ', Idea', ['Few-shot', 'typically 10 to 100', '2,048-token window', 'One-shot', 'Zero-shot']),
 ('Outer loop SGD produces inner-loop learner adapting in the forward pass (Figure 1.1)', R + ', Idea (Why call it learning); animation step 7', ['outer loop of gradient descent that produces an inner-loop learner', 'Figure 1.1']),
 ('One-shot and zero-shot fairest comparison to humans', R + ', Idea', ['the fairest comparisons to human performance']),
 ('Architecture same as GPT-2: decoder-only, pre-norm, modified init, BPE', R + ', Model', ['decoder-only Transformer', 'modified initialisation, pre-normalisation and reversible byte-level BPE']),
 ('Alternating dense and locally banded sparse attention (Sparse Transformer)', R + ', Model', ['alternating dense and locally banded sparse attention patterns', 'Sparse Transformer']),
 ('Eight sizes 125M to 175B', R + ', Model; tables tab parameter recount', ['Eight sizes', 'from 125M to 175B']),
 ('175B: 96 layers, d_model 12288, 96 heads of 128, context 2048, batch 3.2M, LR 0.6e-4 cosine', R + ', Model; Training (cosine in the recipe)', ['96 layers', '12,288', '96 heads of 128 dimensions', 'batch 3.2M tokens', '0.6 × 10⁻⁴', 'cosine decay']),
 ('Model parallelism along depth and width on V100s, Microsoft cluster', R + ', Training and compute', ['within each matrix multiply and ... across the layers', 'V100 GPUs', 'provided by Microsoft']),
 # data
 ('All models see 300B tokens', R + ', Model and Data', ['every one is trained for 300 billion tokens']),
 ('Common Crawl filtered: 410B tokens, 60% of mix', R + ', Data chart; tables tab Table 2.2', ['Common Crawl is 82% of the data but 60% of the mix', '410']),
 ('45TB compressed plaintext filtered to 570GB with a quality classifier against high-quality reference corpora', R + ', Data; tables tab Appendix A detail', ['45 TB of compressed plaintext became 570 GB', 'classifier trained to tell curated text']),
 ('Document-level fuzzy deduplication', R + ', Data', ['Fuzzy deduplication']),
 ('WebText2 19B 22%, Books1 12B 8%, Books2 55B 8%, Wikipedia 3B 3%', 'Data chart and tables tab Table 2.2 (from tables.json)', ['WebText2', 'Books1', 'Books2', 'Wikipedia', '"19 billion"', '"55 billion"', '"22%"']),
 ('Quality-weighted sampling: CC and Books2 under one epoch (0.44, 0.43), Wikipedia 3.4; trade overfitting for quality', R + ', Data (epoch recount in tables tab shows WebText2, Books1, Wikipedia do not follow)', ['quality-weighted, not size-proportional', '0.44 and 0.43 epochs', 'Wikipedia 3.4 times', 'a small amount of overfitting in exchange for higher quality training data']),
 ('Roughly 93% English by word count', R + ', Data', ['93% of the data is English']),
 # compute
 ('About 3640 petaflop/s-days for 175B (roughly 3.1e23 FLOPs)', R + ', Training and compute (recomputed 3,637; 3.14 × 10²³)', ['3,637 petaflop/s-days', '3.14 × 10²³']),
 ('An order of magnitude beyond T5-11B', R + ', Training and compute (9.5 times, recomputed)', ['9.5 times T5-11B']),
 ('Following scaling laws: much larger models on fewer tokens; Chinchilla later showed far from compute-optimal', R + ', Training and compute; Why it matters chart', ['train much larger models on many fewer tokens than is typical', 'Chinchilla later argued for about 20']),
 # evaluation
 ('Multiple choice by per-token likelihood; some tasks normalised by unconditional probability given "Answer: "', R + ', Evaluation', ['normalised per token', 'answer_context the string "Answer: " or "A: "']),
 ('Free-form generation: beam search width 4', R + ', Evaluation', ['beam search, width 4']),
 ('Contamination study flags 13-gram overlaps; filtering bug; Section 4 quantifies residual effect', R + ', Data and Contamination', ['a bug in the filtering caused us to ignore some overlaps', 'N -gram', 'at most 13']),
 ('Contamination mostly negligible; PIQA and Winograd asterisks; Wikipedia-derived LM benchmarks dropped', R + ', Contamination, with Figure 4.2 rebuilt', ['PIQA', 'Winograd', 'keep an asterisk', 'not reported']),
 # results
 ('Headline pattern: zero-shot grows steadily, few-shot faster; gap widens (Figure 1.3)', R + ', The scaling pattern (recomputed from Table H.1, predict reveal)', ['The headline pattern matters more than any single number.', 'few-shot', 'the gap widens']),
 ('Larger models are better in-context learners, not just better language models', R + ', The scaling pattern', ['larger models are more proficient meta-learners']),
 ('Validation loss continues the Kaplan power law over two more orders of magnitude', R + ', The scaling pattern; Refit tab loss card', ['for an additional two orders of magnitude with only small deviations']),
 ('PTB perplexity 20.5 vs 35.8', R + ', Task by task', ['perplexity 20.5 against 35.8']),
 ('LAMBADA 86.4% few-shot, +18 over prior SOTA; fill-in-the-blank prompt format demonstrates what prompting buys', R + ', Task by task (18.4 recomputed)', ['86.4% few-shot, 18.4 points above the previous best', 'is itself a demonstration of what prompting buys']),
 ('TriviaQA 71.2% few-shot beats fine-tuned closed-book T5 and fine-tuned open-domain RAG over 21M documents', R + ', Task by task; headline card', ['71.2% few-shot beats not only fine-tuned closed-book T5', 'retrieves over 21M documents']),
 ('Natural Questions well below fine-tuned SOTA (29.9 vs 36.6)', R + ', Task by task (36.6 is closed-book T5+SSM; open-domain RAG 44.5 added)', ['29.9 against 36.6 closed-book']),
 ('Translation few-shot into English beats unsupervised NMT: Fr-En 39.2, De-En 40.6, Ro-En 39.5; never trained for; only 7% non-English; out of English weaker', R + ', Task by task', ['Fr→En 39.2, De→En 40.6, Ro→En 39.5', 'only 7% of the data is not English', 'out of English it is much weaker']),
 ('SuperGLUE 71.8 few-shot with 32 examples, no gradient updates, above BERT-Large 69.0; fewer than 8 examples suffice; below SOTA 89.0', R + ', Task by task', ['71.8 few-shot with 32 examples per task', 'BERT-Large (69.0)', 'less than eight total examples per task', '89.0']),
 ('Synthetic: 100% 2-digit addition, 98.9% 2-digit subtraction, 80.2% 3-digit addition few-shot', R + ', Synthetic tasks (corrected: Table 3.9 says 80.4, the text 80.2)', ['2-digit addition 100%', 'subtraction 98.9%', '3-digit addition 80.4% (the text says 80.2)']),
 ('Sharp jump between 13B and 175B; 13B solves 2-digit addition about half the time', 'Synthetic tasks predict reveal (arithmetic chart); tables tab detail', ['8.4%', 'even 13B solves 2-digit addition and subtraction only about half the time']),
 ('Overlap search shows answers essentially not memorised', R + ', Synthetic tasks', ['Not memorised, the authors argue', '17 of 2,000']),
 ('Word unscrambling and using a novel word after one definition work; near zero for small models', R + ', Synthetic tasks', ['Word manipulation', 'using a made-up word', 'near zero for small models']),
 ('Human detection of ~500-word news articles at about 52%', R + ', Synthetic tasks (corrected: 52% for about 200-word articles, and again 52% for about 500 words)', ['52%', 'for about 500-word articles, again 52%']),
 ('Clear failures: WiC 49.4% (chance), ANLI near chance until 175B, weak QuAC, RACE, DROP', R + ', Task by task', ['WiC', 'at 49.4%, chance', 'shows signs of life', 'QuAC', 'RACE', 'DROP']),
 ('Comparison tasks are the consistent weak spot', R + ', Task by task', ['The consistent weak spot']),
 # limitations
 ('Text synthesis repeats, loses coherence, contradicts itself', R + ', Limitations', ['still sometimes repeat themselves semantically', 'contradict themselves']),
 ('Comparison tasks weak plausibly because unidirectional decoder cannot look back and compare', R + ', Limitations', ['looking back and comparing two pieces of content']),
 ('Objective weights every token equally; predicts text rather than acting toward goals', R + ', Limitations', ['weights every token equally', 'goal-directed actions']),
 ('Pretraining wildly sample-inefficient vs a human lifetime', R + ', Limitations', ['Sample efficiency', 'lifetime']),
 ('Ambiguous whether few-shot learns from scratch or recognises tasks learned in pretraining', R + ', Limitations; Idea; Why it matters', ['Learning or recognising?', 'from scratch']),
 ('175B expensive and awkward to serve; distillation at this scale untried', R + ', Limitations', ['expensive and inconvenient to perform inference on', 'distillation at this scale is untried']),
 ('Standard caveats: poor interpretability, imperfect calibration, inherited data biases', R + ', Limitations; Broader impacts', ['hard to interpret', 'not well calibrated', 'inherits the biases of its data']),
 # why it matters
 ('The paper that made prompting the interface to NLP; one frozen model for arbitrary tasks', R + ', Why it matters', ['Prompting became the interface to NLP.', 'one frozen model served arbitrary tasks specified in natural language']),
 ('Validated scaling hypothesis at 10x previous largest dense model; triggered scale race (Gopher, PaLM, Chinchilla, LLaMA)', R + ', Why it matters (sourced from Chinchilla Table 1 and PaLM; LLaMA in the chart)', ['It validated the scaling bet', '10 times the previous largest dense model', 'Gopher (280B)', 'PaLM', 'LLaMA']),
 ('Introduced zero/one/few-shot evaluation as standard protocol', R + ', Why it matters', ['Zero-, one- and few-shot became the evaluation protocol']),
 ('ICL as ability emerging with scale; seeded emergent-capabilities literature', R + ', Why it matters (with Wei et al. 2022 and the Schaeffer et al. critique)', ['emergent abilities', 'https://arxiv.org/abs/2206.07682', 'https://arxiv.org/abs/2304.15004']),
 ('Made data curation (filtering, dedup, contamination) first-class', R + ', Why it matters', ['data curation (filtering, deduplication, contamination analysis) became part of the method']),
 ('API-only release started the closed-weights frontier-lab era', R + ', Why it matters (Closed weights; davinci shutdown dates added)', ['Closed weights.', '4 January 2024', '28 September 2026']),
 ('GPT-3 could not follow instructions reliably or stay factual and harmless; InstructGPT RLHF built to fix it', R + ', Why it matters', ['did not follow instructions reliably or stay factual and harmless', 'despite having over 100x fewer parameters']),
 ('Params-heavy, tokens-light ratio corrected by Chinchilla', R + ', Why it matters, with tokens-per-parameter chart', ['parameters-heavy, tokens-light recipe', 'Training tokens per parameter']),
 ('Whether few-shot learns at inference or locates pretrained abilities remains active research', R + ', Why it matters (Min et al. 2022, Olsson et al. 2022)', ['The open question is still open.', 'barely hurts performance', 'induction heads']),
 # connections
 ('Attention Is All You Need: decoder half scaled 3 orders of magnitude', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'decoder half of the Transformer scaled about three orders of magnitude']),
 ('Scaling laws: direct motivation (Kaplan co-author), extends power law two more orders, sized models', 'Connections; Further reading', ['3c65c17b0d0d81b08a1debb0c15cd252', 'the direct motivation (Kaplan is a co-author)']),
 ('Chinchilla: 175B on 300B heavily undertrained; rebalanced ratio', 'Connections; Further reading', ['3c65c17b0d0d8116b7ddffba5c599f3f', 'heavily undertrained']),
 ('BERT: rival paradigm displaced for generation; comparison failures partly from lacking bidirectionality', 'Connections; Further reading', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', 'lacking bidirectionality']),
 ('InstructGPT: RLHF on GPT-3 to fix instruction-following and alignment gaps', 'Connections; Further reading', ['3c65c17b0d0d8180b958d8299996a063', 'RLHF on GPT-3 to fix the instruction-following and alignment gaps']),
 ('Megatron-LM and ZeRO: model-parallel training techniques for 100B+ dense training', 'Connections; Further reading', ['3c65c17b0d0d8133ae92fbe90a1f308e', '3c65c17b0d0d81879a7ed90bca007699', '100B-plus dense training feasible']),
 ('Topics: llms (GPT lineage), llm-training-and-post-training (pretraining at scale, scaling laws), data-curation-and-datasets (CC filtering, dedup, quality-weighted mixing, contamination)', 'Connections; Further reading, Topics', ['3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f', 'the GPT lineage', 'quality-weighted mixing']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Scaling a plain GPT decoder to 175B params']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:35)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
