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
 # header
 ('Reading time line "11 min read, +4h 12m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Raffel, Shazeer, Roberts, Lee, Narang, Matena, Zhou, Li, Liu (Google)', R + ', headline card', ['Colin Raffel', 'Noam Shazeer', 'Adam Roberts', 'Katherine Lee', 'Sharan Narang', 'Michael Matena', 'Yanqi Zhou', 'Wei Li', 'Peter J. Liu', 'Google']),
 ('Date: October 2019 (arXiv v1); JMLR 21(140), 2020', R + ', headline card', ['October 2019', 'JMLR 21(140), 2020']),
 ('Link arXiv:1910.10683 (~1h 30m; 53 pages, read it as a survey)', 'card and Further reading', ['https://arxiv.org/abs/1910.10683', '(1h 30m)', '53 pages: read it as a survey rather than a paper']),
 ('Link code and checkpoints repo (~20 min)', 'card and Further reading', ['https://github.com/google-research/text-to-text-transfer-transformer', 'about 20 minutes for the README and entry path']),
 ('Link C4 on TensorFlow Datasets (~5 min)', 'Further reading, Best resources', ['https://www.tensorflow.org/datasets/catalog/c4', '(5 min)']),
 # resources
 ('Google AI blog Exploring Transfer Learning with T5 (Feb 2020, ~12 min): authors\' own short framing', 'Further reading', ['https://research.google/blog/exploring-transfer-learning-with-t5-the-text-to-text-transfer-transformer/', 'the authors\' own short framing', '(12 min)']),
 ('HF T5 model docs (~25 min): sentinel-token convention, input/target format', 'Further reading; Corrupt a sentence (sentinel names toggle)', ['https://huggingface.co/docs/transformers/model_doc/t5', 'sentinel-token convention', '(25 min)', 'extra_id_']),
 ('Released checkpoints (~10 min): T5 1.1 (span corruption only, no multi-task, GeGLU) and LM-adapted; nobody should start from originals', 'Further reading; Why it matters (T5 1.1 changes from the file itself)', ['released_checkpoints.md', 'LM-adapted variants', 'almost nobody should start from the original checkpoints', 'GeGLU']),
 ('mT5 (2020, ~45 min): same recipe on 101 languages via mC4, answer to the weakest result', 'Further reading; Results; Why it matters', ['https://arxiv.org/abs/2010.11934', '101 languages via mC4', 'mT5 was the direct follow-up']),
 ('Flan-T5 (2022, ~45 min): prefixes replaced by instructions across 1,800+ tasks', 'Further reading; Why it matters (1.8K tasks, as the paper states it)', ['https://arxiv.org/abs/2210.11416', '1.8K tasks']),
 # problem
 ('Pretrain-then-fine-tune worked but field fragmented: objective (BERT MLM, GPT LM, XLNet permutation), architecture (encoder-only, decoder-only, prefix LM), corpus (Wiki+BooksCorpus, WebText, CC-News), fine-tuning, evaluation', R + ', Problem', ["BERT's masked language modelling", "XLNet's permutation objective", 'Wikipedia plus BooksCorpus, WebText, CC-News', 'fine-tuning scheme and evaluation protocol']),
 ('Each release changed several axes at once, so gains could not be attributed', R + ', Problem', ['so no gain could be attributed to any one axis']),
 ('Goal explicitly not a new method: one framework, swappable components, hold the rest constant, ablation grid at scale', R + ', Problem', ['The goal is explicitly not a new method', 'swappable component of one fixed pipeline']),
 ('Secondary problem: no standard large clean pretraining corpus; data sets a side effect of model releases, often unpublished', R + ', Problem', ['no standard large clean pretraining corpus', 'often were never published']),
 # method: text to text
 ('Every task text in, text out; maximum likelihood, teacher forcing, cross entropy; greedy decoding', R + ', Idea', ['plain maximum likelihood (teacher forcing, cross-entropy) and greedy decoding']),
 ('Task prefix: translate English to German: That is good. -> Das ist gut.', R + ', Idea; text-to-text widget', ['translate English to German: That is good.', 'Das ist gut.']),
 ('Classification emits the label as a word: MNLI outputs "entailment"', R + ', Idea', ['MNLI outputs the literal string']),
 ('STS-B (1 to 5) rounded to 0.2, emitted as string, 21-class', R + ', Idea, with the live rounding box', ['rounded to the nearest 0.2', '21-class classification problem']),
 ('Winograd (WNLI, WSC, DPR): pronoun marked with asterisks, model generates the noun phrase', R + ', Idea', ['mark the ambiguous pronoun with asterisks', '*they*']),
 ('Payoff: one model, loss, decoding, hyperparameter set covers translation, summarisation, QA, classification; why ablations comparable', R + ', Idea', ['one model, one loss, one decoding procedure and one hyperparameter set', 'the only reason the ablations that follow are comparable']),
 # baseline model
 ('Encoder-decoder, each stack BERT-Base: 12 blocks, d_model 768, d_ff 3072, 12 heads; ~220M, twice BERT-Base', R + ', Baseline; parameter recount in the grid tab (222.9M)', ['12 blocks', '768', '3072', '12 heads', 'About 220 million parameters', 'twice BERT-Base because there are two stacks']),
 ('Rescale-only layer norm (no bias, no mean subtraction) = later RMSNorm', R + ', Baseline', ['Rescale-only layer norm', 'no mean subtraction', 'RMSNorm']),
 ('Layer norm outside the residual path', R + ', Baseline', ['Outside the residual path']),
 ('Relative position: one learned scalar per logit, 32 buckets, log ranges to 128, shared across layers', R + ', Baseline, with the bucket chart from T5\'s own function', ['one learned scalar added to each attention logit', '32 buckets', 'up to an offset of 128', 'shared across layers']),
 ('Adafactor: factorises second moment into row and column vectors', R + ', Baseline: Training', ['Adafactor', 'row and column vectors']),
 ('Inverse-square-root learning-rate schedule', R + ', Baseline: Training, with chart', ['inverse square root decay']),
 ('SentencePiece 32k shared, English mixed 10:1:1:1 with German, French, Romanian', R + ', Baseline: Training', ['32,000 wordpieces shared by input and output', '10:1:1:1']),
 ('2^19 steps at 2^16 tokens per batch, about 34B tokens', R + ', Baseline: Training', ['≈ 34B']),
 ('Quarter of BERT budget, a sixtieth of RoBERTa (chosen to afford dozens of variants)', R + ', Baseline: Training (corrected: a sixty-fourth, 2.2T / 2^35 = 64.0, the paper says 1/64)', ['a sixty-fourth of RoBERTa', 'dozens of variants are affordable']),
 ('Fine-tuning 2^18 steps per task, best checkpoint on validation', R + ', Baseline: Training', ['steps per task at a constant 0.001, best validation checkpoint']),
 # span corruption
 ('Span corruption: 15% sampled; consecutive runs -> one unique sentinel; target = dropped spans with sentinels, final sentinel', R + ', Span corruption, with Figure 2 computed; Corrupt a sentence tab', ['Sample 15% of tokens', 'one sentinel unique within the example', 'closed by a final sentinel']),
 ('Contrast with BERT MLM: target is only the missing text; shorter decoder sequences, cheaper', R + ', Span corruption; cost chart in Corrupt a sentence', ['the target is the missing text, not the whole sequence', 'decoder sequences stay short']),
 ('Final recipe: contiguous spans of mean length 3, shorter still', R + ', Span corruption; Final models', ['corrupts contiguous spans of mean length 3']),
 # ablations
 ('Architecture: encoder-decoder + denoising wins on every task', R + ', Architectures', ['the encoder-decoder with denoising wins on every task']),
 ('Shared enc-dec parameters cost almost nothing (82.81 vs 83.28), halves params; halving depth hurts', R + ', Architectures predict reveal; grid', ['82.81', 'halving the depth hurts']),
 ('Prefix LM (fully visible over input, causal over target) below shared enc-dec: cross-attention worth having', R + ', Architectures, mask animation and reveal', ['fully visible over the input', 'the prefix LM lands below the shared encoder-decoder']),
 ('Plain causal LM far behind (GLUE 74.70, SQuAD 61.14)', R + ', Architectures', ['74.70', '61.14']),
 ('Objective: denoising > LM > deshuffling, the only large gap', R + ', Objectives', ['Denoising beats language modelling beats deshuffling, and that is the only large gap']),
 ('Denoising variants (BERT-style, MASS-style, sentinel spans, drop) about the same', R + ', Objectives', ['MASS-style masking, replacing spans with sentinels and dropping corrupted tokens all perform about the same']),
 ('Corruption 10/15/25% indistinguishable, 50% hurts; span 2/3/5 same, 10 slightly worse', R + ', Objectives', ['10%, 15% and 25% are indistinguishable; 50% hurts', 'mean spans of 2, 3 and 5 are indistinguishable, 10 slightly worse']),
 ('Choose denoising variants on cost, not quality; further tinkering unlikely to pay', R + ', Objectives; How much to believe (UL2 revised it)', ['choose among denoising variants on cost, not quality, and further tinkering here is unlikely to pay']),
 ('C4: 745GB, one month (April 2019) of Common Crawl', R + ', Data', ['about 750 GB of English (745 GB', 'April 2019']),
 ('C4 filters: terminal punctuation lines; pages under 5 sentences; curly brace; placeholder/offensive; repeated three-sentence span; English p >= 0.99', R + ', Data (corrected: fewer than 3 sentences per page, and lines of at least 5 words, §2.2; full list incl. Javascript, policy lines, citation markers)', ['terminal punctuation', 'fewer than 3 sentences', 'at least 5 words', 'curly bracket', 'lorem ipsum', 'Bad Words', 'three-sentence span', 'probability at least 0.99', 'Javascript']),
 ('Unfiltered: 6.1TB and worst on every task, cleanest data lesson', R + ', Data predict reveal; grid', ['6.1 TB', 'worst on every task, the paper\'s cleanest data lesson']),
 ('In-domain beats C4 where domains match: Wiki+TBC SuperGLUE 73.24 via MultiRC (fiction); unsurprising and unhelpful for a general model', R + ', Data reveal; grid note', ['73.24', 'MultiRC', 'fiction', 'Unsurprising but also unsatisfying']),
 ('Repetition: 64 harmless; 1,024 costs about 4 GLUE and 4.6 SQuAD; training loss falls (memorisation)', R + ', Data: Repetition (3.7 GLUE, recomputed: 83.28 - 79.55)', ['64 repeats is harmless', '1,024 repeats costs 3.7 GLUE points and 4.6 on SQuAD', 'the memorisation signature']),
 ('Fine-tuning: all parameters wins; adapters (dense-ReLU-dense after FFN, only those and norms trained) need inner dim scaled to task; gradual unfreezing loses a little, buys speed', R + ', Fine-tuning and mixing; grid note', ['updating all parameters wins', 'dense-ReLU-dense blocks after each feed-forward network', 'gradual unfreezing costs a little accuracy and buys some speed']),
 ('Multi-task = mixing data sets, no task-specific heads', R + ', Fine-tuning and mixing', ['with no task-specific heads it is just mixing data sets']),
 ('Equal mixing disaster; examples-proportional with cap K sweet spot; temperature T=2 reasonable', R + ', Fine-tuning and mixing, with the mixing calculator', ['equal mixing is a disaster', 'sweet spot', 'is a reasonable single knob']),
 ('Multi-task alone loses; multi-task pretraining then fine-tuning matches; leave-one-out barely hurts: mild interference', R + ', Fine-tuning and mixing', ['Multi-task training alone loses', 'matches plain pretraining', 'task interference is mild']),
 ('Scaling with 4x compute: 4x steps, 4x batch, 2x model 2x steps, 4x model all help; size slightly bigger bump; 2x2x indistinguishable from 4x size', R + ', Scaling predict reveal', ['Everything helps', 'size gives a slightly bigger bump than time alone', '2× size for 2× steps is indistinguishable from 4× size']),
 ('Ensembling four models orthogonal, beats every single-model route on summarisation and translation', R + ', Scaling reveal; grid note (CNN/DM, EnDe, EnRo)', ['Ensembling four models is an orthogonal win that beats every single-model route on summarisation and translation']),
 ('Final: span corruption mean 3, C4, multi-task pretraining then fine-tuning, 1M steps at 2^11 x 512, ~1T tokens, 32x', R + ', Final models (with the 2^20 note)', ['1M steps at a batch of 2', 'about 1 trillion', 'about 32×']),
 ('Five sizes: Small 60M, Base 220M, Large 770M, 3B, 11B', R + ', Final models; recount (Large counts to 737.7M)', ['Small 60M, Base 220M, Large 770M, 3B and 11B', '737.7M']),
 ('Two largest scale d_ff (16,384, 65,536) and heads, not depth, because TPUs like large dense matmuls', R + ', Final models', ['16,384 and 65,536', 'most efficient for large dense matrix multiplications']),
 # results
 ('GLUE 90.3 for T5-11B, SOTA', R + ', Results; grid Table 14', ['GLUE</b> 90.3']),
 ('SuperGLUE 88.9 against human 89.8; stood until DeBERTa passed human early 2021 with 1.5B model', R + ', Results; Why it matters (DeBERTa 89.9 against 89.8, January 2021)', ['88.9', '89.8', 'January 2021', '1.5B DeBERTa']),
 ('SQuAD about 90 EM and 96 F1, SOTA', R + ', Results (corrected to the table: 91.26 EM, 96.22 F1, validation set)', ['91.26 exact match and 96.22 F1']),
 ('CNN/Daily Mail SOTA', R + ', Results (significant only on ROUGE-2)', ['CNN/Daily Mail</b> state of the art']),
 ('WMT: not SOTA on any pair; English-only pretraining, no backtranslation; mT5 the follow-up', R + ', Results', ['state of the art on no pair', 'English-only pretraining', 'backtranslation']),
 ('Benchmarks least durable; the ablation table aged well; cited for negative findings', R + ', Results', ['The benchmark numbers are the least durable part', 'corruption rate barely matters, denoising variants barely differ, multi-task alone underperforms']),
 # why it matters
 ('C4 became infrastructure: first large web corpus released with its cleaning pipeline; pretrained unrelated models', R + ', Why it matters (softened: "first" unconfirmed; FineWeb calls it "one of the first"; LLaMA 1 15% C4)', ['C4 became infrastructure', 'one of the first large scale LLM training datasets', '15% C4']),
 ('Filtering heuristics the template for The Pile, RefinedWeb, Dolma, FineWeb; filtering beats volume assumed', R + ', Why it matters (RefinedWeb, Dolma, FineWeb sourced; The Pile only compares with C4, so not listed)', ['RefinedWeb tabulates them', 'Dolma reuses some', 'That filtering beats raw volume is now assumed']),
 ('Span corruption default enc-dec objective: mT5, ByT5, LongT5, UL2', R + ', Why it matters (corrected: LongT5 uses PEGASUS principle-sentence generation instead)', ['Span corruption became the default encoder-decoder objective', 'Not LongT5', 'PEGASUS']),
 ('Text-to-text universal, prefigured instruction tuning; FLAN and Flan-T5 replaced prefixes with instructions', R + ', Why it matters', ['Text to text prefigured instruction tuning', 'FLAN', 'Flan-T5']),
 ('Encoder-decoder finding lost: in-context learning with GPT-3, simpler serving (one KV cache), prompt-and-continue', R + ', Why it matters', ['The encoder-decoder finding lost', 'one KV cache, no encoder pass', 'prompt-and-continue']),
 ('Ettin (2025): modern compute-matched rerun, split task-dependent', R + ', Why it matters (corrected: Ettin compares encoder-only and decoder-only, not an encoder-decoder; Encoder-Decoder Gemma added as the closer rerun)', ['Ettin (2025) finds encoder-only against decoder-only task-dependent, without testing an encoder-decoder', 'Encoder-Decoder Gemma']),
 ('Architectural details leaked: rescale-only norm, relative position bias, Adafactor; RPB in T5 descendants and retrieval encoders', R + ', Why it matters (retrieval-encoder claim dropped as unsourced)', ['Rescale-only norm outside the residual path, the shared relative position bias and Adafactor were popularised here']),
 ('Checkpoints load-bearing in 2026: size ladder names Flan-T5; T5 encoder conditions Imagen, SD3, Flux', R + ', Why it matters', ['The size ladder (Small to XXL) still names Flan-T5', 'Imagen', 'Stable Diffusion 3', 'FLUX.1']),
 # connections
 ('BERT: modified BERT MLM; architecture ablation tests encoder-only assumption', 'Connections; Further reading', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', 'controlled test of BERT']),
 ('GPT-3: seven months later, opposite way, in-context learning; fork in the road', 'Connections; Why it matters; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', 'seven months later', 'fork in the road']),
 ('Switch Transformer: T5-Base/Large on C4 with span corruption as dense control, 7x speedup', 'Connections; Further reading', ['3c65c17b0d0d81a8b541c9babbf40c94', '7× faster against them']),
 ('Ettin: modern compute-matched encoder vs decoder comparison', 'Connections; Further reading', ['3c65c17b0d0d81139cffea35080afe2b']),
 ('Chinchilla: T5 scaling asks size or steps informally at fixed 4x; Chinchilla fits a law', 'Connections; Further reading', ['3c65c17b0d0d8116b7ddffba5c599f3f', 'fitted law']),
 ('RAG: contemporaneous counterpoint, facts in a swappable index', 'Connections; Further reading', ['3c65c17b0d0d816c889decc342a7ad39', 'swappable index']),
 ('Topics: llm-training-and-post-training, data-curation-and-datasets, llms', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f', '3c65c17b0d0d812d9e00f6ec89965286', 'the encoder-decoder lineage']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Casts every NLP task as text in, text out']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:34)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
