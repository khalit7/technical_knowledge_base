# Coverage: old notes checked (2026-10-15)

This page is new. Its subject was covered by section 2 "Model-based classifiers" of the old child
"Filtering, dedup, and the curation pipeline" (saved verbatim by the root in `../../src/read/old/02_filtering_dedup_pipeline.md`,
lines 47-64) and a few lines of the old "Pretraining corpora" page. Each claim, treated as unverified, and where this page carries it:

| Old claim | Verdict | Where now |
|---|---|---|
| DCLM: fastText, positives OpenHermes-2.5 + r/ELI5, keep top ~10% | Verified (DCLM Sec 4.4, App J; cut 0.018112 in `baselines_configs/fasttext_filter.yaml:8`) | s2, s3, s6 |
| "This single choice outperformed every other filtering strategy they tried" | Verified for the strategies in Table 4 (30.2 Core vs at most 29.2) | s12 |
| "the main reason DCLM-Baseline is strong" | Interpretation; kept as DCLM's own ablation numbers instead (Table 5: 41.0 vs 35.7 to 37.5) | s3 |
| FineWeb-Edu: Llama-3-70B scored **450k** docs | Corrected: the paper says 460,000 (410,000 train, 50,000 held out); 450k is the model card's figure | s5 |
| A small embedding regression head on Snowflake-arctic-embed, threshold ≥ 3, 1.3T tokens | Verified (paper Sec 4; card) | s5 |
| "Dramatic gains on MMLU/ARC/OpenBookQA ... mild losses on HellaSwag" | Partly verified: MMLU 33% to 37%, ARC 46% to 57% (Sec 4); a HellaSwag loss is shown by WebOrganizer Table 1 (57.5 to 56.0, 1B scale), not given as a number by FineWeb | s5, s11 |
| Nemotron-CC: ensemble of three classifiers, five tiers | Verified; added the mechanism (rank buckets 0-19, maximum, Table 2 grouping) and rebuilt it here | s5 |
| "Preserves ~4x more unique tokens at comparable quality" | Verified as Nemotron-CC's claim (full 6.3T matches DCLM MMLU with 4x more unique real tokens) | s10 |
| "low tiers get rephrased or downweighted, not discarded" | Verified (low-quality pages rephrased Wikipedia-style) | s10; owned by the synthetic data page |
| Perplexity filtering "mostly superseded ... both FineWeb and DCLM found classifier approaches strictly better" | Corrected: DCLM's Table 4 has perplexity filtering at 29.0 Core, second-best family after fastText (30.2) and above AskLLM; FineWeb does not test perplexity filtering. Ankner et al. 2024 show perplexity pruning helping when the band is chosen per pool | s7 |
| "Every classifier encodes a target distribution" | Verified and measured (typography, dialect, topic) | s4, s11 |
| "DCLM's optimizes instruction-flavored helpfulness" | Reworded: what is measured is a preference for instruction/Q&A style text (top words), not helpfulness | s4 |

New on this page, not in the old notes: fastText internals from source, the reference-set ablation rebuilt, GPT-3's
Pareto rule, the threshold-as-percentile problem, DSIR, LESS and MATES, small vs large models, measured bias, DCLM's benchmark design.

Facts shared with siblings: FACTS.md sections `q` (root Quality lab: DCLM cut, keep counts, Jaccard 14.4%, edu F1) and `read`
(DCLM Table 4, FineWeb, Nemotron-CC) are quoted as written there; this page's additions are appended under `qc`.
