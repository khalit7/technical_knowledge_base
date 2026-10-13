# Merge of the old "RAG evaluation" page (2026-10-13)

Old page: "RAG evaluation", Notion `3c65c17b0d0d8165a5e7ca3deb4a468d`, child of Topic: rag-and-retrieval, retired in favour of this page.

Source copy: re-fetched read-only on 2026-10-13; Notion reports it "as of 2026-09-30T16:16:51.338Z" (last edit), the same edit timestamp and the same content as `src/live.md`, saved verbatim on 2026-10-04 by `save_live.py`. That copy is reused rather than duplicated into `inputs/old_rag_evaluation_child.md`. `coverage.json` already maps all 56 of its facts; this table re-checks them against the current `index.html`.

Places on this page: `rd-*` are Reading sections (one screen, halves, ret, real, gen, fw, judge, bench, long, build, agent, mist), `t-run` is Score a real retrieval run, `t-more` is Further reading.

| # | Old claim | Verdict | Where, or why |
|---|---|---|---|
| 1 | Header: 14 min read, +1h 27m resources | covered (replaced) | This page's own reading time (rd-one) and per-link times in t-more |
| 2 | RAG fails in two places; one end-to-end score cannot tell which | covered | rd-one lead; rd-halves and its before/after animation |
| 3 | Measure the halves separately, then end to end | covered | rd-one lead and table |
| 4 | Retrieval half: classical IR metrics, cheap, deterministic, reproducible given labels | covered | rd-ret |
| 5 | Generation half: LLM judge, no chunk labels, inherits judge variance, bias, drift | covered | rd-gen intro; rd-judge |
| 6 | End to end: small human-labelled golden set plus failure buckets | covered | rd-build |
| 7 | The one idea: was the gold chunk in the prompt? | covered | rd-one "The one habit" box; animation step |
| 8 | Definitions: query, chunk, binary and graded labels (3/2/1/0), gold set Rel(q), cutoff k, reference answer, claim, golden set | covered | rd-ret first paragraph and symbol list; rd-gen; rd-build steps 2 and 5 |
| 9 | Metrics per query, averaged over the set (Pinecone) | covered | rd-ret; Pinecone link in t-more |
| 10 | recall@k formula; most important retrieval number; several cutoffs | covered | rd-ret formula and recall bullet |
| 11 | recall undefined with no gold chunks; score abstention | covered | rd-ret; rd-mist last item |
| 12 | precision@k formula; noise distracts; raising k raises recall, usually lowers precision | covered | rd-ret precision bullet |
| 13 | MRR formula; toy ranks 2, 1, 5 give 0.567 | covered (example replaced) | rd-ret formula and bullet; the calculator's live RR and MRR on real BEIR runs (t-run) replace the toy average |
| 14 | nDCG@k formula, discounts 1, 1.585, 2, IDCG, linear vs 2^rel - 1 gain | covered | rd-ret formula block; calculator gain toggle; rd-mist |
| 15 | nDCG is the standard for comparing rerankers | covered | rd-ret nDCG bullet |
| 16 | Worked example before reranking: recall 0.667, precision 0.4, RR 1/2, DCG 1.693, IDCG 4.762, nDCG 0.355 | covered | rd-ret worked example; calculator preset "First stage" (recompute.py) |
| 17 | After reranking: recall 1, precision 0.6, RR 1, nDCG 0.985 | covered | rd-ret; calculator preset "After reranking" |
| 18 | Reranker rescues A only if the first stage had it in its top 20; measure recall at reranker depth, then nDCG after | covered | rd-ret; rd-real; rd-mist |
| 19 | RAGAS four core metrics (Es et al. 2023); "RAG triad" is TruLens's name for three of them | covered | rd-gen; rd-fw table |
| 20 | Faithfulness formula; Einstein 14 vs 20 March 1879 example, 0.5 | covered | rd-gen Faithfulness |
| 21 | Answer relevance by reverse generation, N = 3, cosine; says nothing about truth | covered | rd-gen (plus the noncommittal rule from RAGAS source) |
| 22 | Context precision formula; padding below does not lower it; 1 hit + 9 misses = 1.0 vs precision@10 0.1; 0.5 and 0.917 on the worked example | covered | rd-gen; calculator "One hit, nine misses" preset; recompute.py |
| 23 | Context recall formula; 3 of 4 claims = 0.75 | covered | rd-gen Context recall |
| 24 | Judge caveats: pin, calibrate on a hand-labelled sample, kappa, TPR/FPR correction | covered (link) | rd-judge; rd-mist; method owned by LLM-as-judge, linked |
| 25 | High faithfulness on a stale source; add freshness and source checks | covered | rd-gen "Not correctness"; animation last step (real case); rd-build source check |
| 26 | RAGAS "most adopted" | dropped | Unsourced popularity claim; rd-fw describes RAGAS by what it computes |
| 27 | RAGAS synthetic testset generation | covered | rd-fw; rd-build step 3 |
| 28 | DeepEval pytest-style assertions, CI ergonomics | covered (link) | rd-fw (threshold 0.5); CI gating owned by Eval harnesses and Production eval engineering, linked |
| 29 | TruLens triad plus tracing | covered | rd-fw table |
| 30 | ARES: synthetic data, fine-tuned light judges, PPI over "a few hundred" annotations | covered (made precise) | rd-fw table and agreement paragraph give the paper's figure (about 150 labels, DeBERTa-v3-Large judges) |
| 31 | Platforms (Langfuse, Braintrust, Arize Phoenix, Patronus) on real traffic | dropped here (owned elsewhere) | App-level tools are on Eval harnesses, online evaluation on Production eval engineering (both name Langfuse, Braintrust, Phoenix), linked in t-more. Patronus appears here as the Lynx/HaluBench source in rd-bench |
| 32 | A few hundred good examples beat ten thousand synthetic | covered | rd-build lead |
| 33 | Golden set steps 1 to 5 (mine real queries; label chunk IDs and reference, SME bottleneck; synthetic bootstrap then human filter; hard negatives: unanswerable, multi-hop, ambiguous, near-duplicate; version, re-label, never tune on held-out) | covered | rd-build steps 1 to 5 (plus pooling and a 2026 measurement) |
| 34 | Promotion, CI gates, label-noise audit | covered (link) | rd-build closing paragraph links Production eval engineering, Eval statistics, Human evaluation |
| 35 | Failure buckets: retrieval miss (incl. corpus gap), ranking miss, generation miss, grounding-refusal miss and inverse | covered | rd-build "Bucket every failure" (source miss added) |
| 36 | Recall-first triage, then check the candidate list to split retrieval from ranking | covered | rd-one; rd-ret; rd-build |
| 37 | Agentic RAG: per-call metrics plus trajectory checks (when to retrieve, reformulation, loops to sufficiency, citations verified) | covered | rd-agent; links Agent and trajectory evaluation |
| 38 | Which-metric-when table (needs, cost, answers, blind to) | covered (reorganised) | rd-one "In one screen" table, by question, with citations and correctness added |
| 39 | Deterministic metrics first, judged where labelling is impractical, calibrate first | covered | rd-one; rd-judge |
| 40 | Eight common mistakes | covered | rd-mist holds all eight, plus three more (faithfulness across frameworks, recall across papers, two BM25s) |
| 41 | See also links (RAG topic, retrieval pipeline, advanced and agentic RAG, LLM-as-judge, Production eval engineering) | covered | t-more; RAG topic also linked twice at the top of Reading (rd-one note, rd-halves "where an answer gets lost") |
| 42 | Best resources: RAGAS docs, Atlan 2026, FutureAGI 2026, Pinecone | covered | t-more |
| 43 | Further reading: RAGAS paper, ARES paper, TruLens RAG triad | covered | t-more |

## Result
43 rows: 41 covered (several made more precise or replaced by real-data versions), 2 dropped (an unsourced popularity claim; platforms owned by sibling pages). Nothing is worth adding, so the page is unchanged. The requested link to Topic: rag-and-retrieval for where answers get lost is already near the top of Reading: the rd-one note links the topic, and the rd-halves paragraph links it for its "where an answer gets lost" section.
