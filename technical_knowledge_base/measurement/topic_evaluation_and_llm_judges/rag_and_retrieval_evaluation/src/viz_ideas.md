# Visualisation ideas: RAG and retrieval evaluation

Scored 1 to 5 on teaching value (T), real data (D), not already on a sibling or the root (N).

| Idea | T | D | N | Placement | Status |
|---|---|---|---|---|---|
| Before/after: one real question through retrieve then generate, scored end to end, then split into the retrieval half (MS MARCO `is_selected`, SciFact qrels) and the generation half (RAGTruth spans); second case where retrieval failed, fixed by swapping to the hybrid | 5 | 5 | 5 | Reading, rd-halves | built (24_js_anim.js) |
| Outcome bars: 264 RAGTruth questions x 6 models, retrieval identical (hit@3 = 1 by MS MARCO marks), outcomes differ only by generator | 4 | 5 | 5 | Reading, rd-halves | built (23_js_xtab.js) |
| Rank-list calculator: click grades on ten slots; recall, precision, hit, RR, nDCG (linear or exponential gain), context precision; presets from the old page's worked example and the padding case | 5 | 2 (worked example, labelled) | 4 | Reading, rd-ret | built (22_js_calc.js) |
| Real-run table with reproduction line (Anserini, MTEB) | 4 | 5 | 5 | Reading, rd-real | built (25_js_real.js) |
| Score a real retrieval run: five systems x three BEIR sets, any cutoff, two gains; per-query browser of disagreements | 4 | 5 | 5 | tab t-run | built (31_js_run.js) |
| RAGTruth span explorer: eight questions, six answers, spans by type with annotator notes, implicit_true, response-level vs span-level view; whole-set table; detector F1s | 4 | 5 | 5 | tab t-spans | built (32_js_spans.js) |
| Framework disagreement on the same answer (RAGAS vs DeepEval vs TruLens scores computed live) | 4 | 1 | 5 | | rejected: needs judge calls we cannot make offline in the page; written as a table with the Kenneth Williams case instead |
| Long context vs RAG cost/accuracy curve | 3 | 2 | 2 | | rejected: owned by the Long-context benchmarks page and the RAG topic's cost table |
| Sample-size calculator for retrieval comparisons | 3 | 2 | 1 | | rejected: owned by Eval statistics |
| TREC RAG nugget scoring animation | 3 | 2 | 4 | | rejected for now: judgments of one topic would be needed; described in rd-fw with dated numbers |

| Hero: five objects and the metric comparing each pair (arc diagram; list at phone width) | 5 | 3 (definitions) | 5 | Reading top | built 2026-10-24 (26_js_figs.js) |
| Recall@k curves k = 1..100, prompt k and reranker depth marked, three sets | 5 | 5 | 5 | Reading, rd-ret | built 2026-10-24 (25_js_curve.js) |
| Faithfulness stepper: one real answer, claims, verdicts, each tool's rule (Mistral contradiction, Llama-2-13B unsupported) | 5 | 4 (real answers; split and verdicts ours) | 5 | Reading, rd-faith | built 2026-10-24 (26_js_faith.js) |
| Citation accuracy diagram (ALCE rules on three statements) | 3 | 1 (illustrative) | 5 | Reading, rd-cite | built 2026-10-24 |
| Agreement with people: RAGChecker correlations against the human ceiling; TREC tau for runs against topics | 4 | 5 (published) | 5 | Reading, rd-agree | built 2026-10-24 |
| Triage chain for a wrong answer (replaces the bucket list) | 4 | 2 | 3 | Reading, rd-halves | built 2026-10-24; the measured split stays on the retrieval pipeline page |
| Paired per-query comparison with bootstrap intervals | 5 | 5 | 4 | Reading, rd-cmp | built 2026-10-24 (28_js_paired.js, paired.py); sample size stays on Eval statistics |
| A second rank-list calculator for the metric definitions | 2 | 2 | 1 | | rejected 2026-10-24: Evaluation metrics section 6 owns one; ours stays only as the context-precision widget |
| Real photos or a paper's figure | 1 | | | | rejected: nothing physical to show; every mechanism here is drawn better as a diagram |

## Methodology gaps noticed
- No rule yet for mixing two datasets in one animation: here the case selector keeps each case on one dataset and says so.
- Human readings (end-to-end correctness of six answers; verdicts on two generated answers) are stated in the captions and src/README.md rather than hidden in code.
