# Coverage of the old page "Pretraining corpora: lineage and current landscape"

Old text: the root's `src/read/old/01_pretraining_corpora.md` (Notion 3c65c17b0d0d81f382b6e75707d00663, last edited 2026-09-22), treated as unverified notes. Every claim below was checked against primary sources on 2026-10-14; where the page carries it is given.

## Best resources list
| Old claim | Status | Where now |
|---|---|---|
| FineWeb blog, FineWeb paper, DCLM, Nemotron-CC, Nemotron-CC-v2.1 card, Dolma paper, Olmo 3 release, HuggingFaceFW org | kept (links checked) | Further reading; v2.1 card in Lineage card for Nemotron-CC v2 and v2.1 |

## Lineage table
| Old claim | Status | Where now / correction |
|---|---|---|
| Common Crawl since 2008, roughly monthly WARC/WAT/WET, "hundreds of TB per snapshot, petabytes total" | verified, made precise | s1: about 83 TiB compressed WARC per 2026 crawl, 14 TiB WAT, 5.9 TiB WET; "more than 10 petabytes" (CC About) |
| C4 2019, ~175B tokens, ODC-BY, rules | corrected | 156B spaCy words (Dodge Table 1); 175B is RedPajama's count in a LLaMA-style tokenizer; rules as in T5 and TFDS code (s3, Lineage) |
| The Pile 2020, 825GB, ~300B tokens | corrected | 825.18 GiB; 300B is Pythia's training budget; Pythia gives 334B GPT-NeoX tokens; Books3 removal dated (s3) |
| ROOTS 1.6TB, 46 languages | verified | plus 13 programming languages, 62% curated / 38% OSCAR (Lineage) |
| RefinedWeb 600B released (5T built), ODC-BY, trafilatura and strict dedup | verified; "filtered + deduped web alone beats curated mixes" qualified | +0.5 and +0.2 over C4 in its own Table 4; MDR-processed C4 beat it (s3) |
| FineWeb 15T to 18.5T+, ODC-BY, per-snapshot MinHash | verified, versioned | v1.4.0 18,527.0B GPT-2 tokens, 111 crawls (s2, s3) |
| FineWeb-Edu 1.3T (score>=3), 5.4T (score>=2), Llama-3-70B annotator, "huge MMLU/ARC gains" | verified with numbers | MMLU 33 to 37, ARC 46 to 57 (vendor); measured reproduction of the classifier on the running example (s4) |
| DCLM-Baseline ~3.8T from 240T pool, CC-BY-4.0, OH-2.5+ELI5 classifier the biggest lever | verified | sizes disagree (3.8T paper, 4T card, 3,854.9B recount); Table 4 and 5 numbers (s3, s5) |
| Dolma 3T, ODC-BY, powered OLMo 1/2 | corrected | OLMo 2's web data is DCLM-Baseline (olmo-mix-1124), not Dolma's own web; ODC-By only since 2024-04-15 (Lineage, s9) |
| Nemotron-CC 6.3T (4.4T + 1.9T synthetic), CC-BY-4.0 | licence corrected | v1 is hosted by Common Crawl with only Common Crawl's terms on its page; no CC BY 4.0 found (Lineage) |
| FineWeb2 ~3T words, 1000+ languages | verified, made precise | over 3T words, 1,868 language-script pairs (s6) |
| Dolma 3 5.9T mix (+100B Dolmino, +50-100B Longmino) | verified | 5.93T mix from a 9.31T pool (s3, Lineage) |
| Nemotron-CC-v2/v2.1 +2.5T then +2.1T, "NVIDIA open license" | corrected | v2 is 5,868.0B (the "6.6T" is the whole NVIDIA collection); v2.1 adds 2,544.8B; licence is the NVIDIA Data Agreement for Model Training (training only, no redistribution), gated with manual approval (s3, s7) |
| FinePDFs 3T, FinePDFs-Edu 350B | verified | 2,918.79B; 350B+ (s6) |
| TxT360, Zyda-2, Ultra-FineWeb, Common Pile v0.1, Essential-Web v1.0, The Stack v2 descriptions | verified, details added | Lineage cards; Ultra-FineWeb's Apache tag flagged (s7) |

## "What separates the generations"
| Old claim | Status | Where now |
|---|---|---|
| WARC + trafilatura/resiliparse beat WET; "one of the largest single wins" | verified (plotted only in FineWeb; DCLM Table 3 numbers) | s3, s11 |
| DCLM: fastText on instruction-ish positives beats heuristics; FineWeb-Edu does the same for educational content | verified with Table 4 numbers | s3 |
| Per-snapshot MinHash beat global in FineWeb; RefinedWeb used suffix arrays | verified | s3 |
| Nemotron-CC: DCLM discards ~90%, bucket and rephrase, matters for 15T+ runs | verified | s3, s9 |
| Synthetic augmentation standard (1.9T synthetic) | verified | s3; depth on the Synthetic data page |
| "data improvements contributed 3.24x more compute-efficiency gain than architecture and optimisation combined" (2019 to 2025 decomposition on the root) | dropped here | the root's Reading agent traces this claim (its brief names it); not repeated on this child |
| C4 paper: unfiltered "worst on every single downstream task", 6.1TB, ~8x more than 745GB | corrected | worse than C4 on all 7 columns; worst of the six sets on 6 of 7 (Wikipedia 68.01 below 68.04 on SuperGLUE) (s3) |
| C4 repetition: 64 repeats harmless, 256 marginal, 1,024 costs ~4 GLUE and 4.6 SQuAD | verified (T5 Table 9: 83.28 to 79.55 GLUE, 80.88 to 76.27 SQuAD) | moved: owned by the T5 paper page and the Data mixing page (linked from s3 and the chooser) |

## "Current snapshot"
| Old claim | Status | Where now |
|---|---|---|
| "Independent head-to-head evaluations consistently rank Nemotron-CC-HQ and DCLM at the top" | corrected | only one third-party run trains on both (open-sci-ref: 0.66, 0.57, 0.56), lead mostly MMLU and CSQA; "consistently" not supported (s5) |
| Nemotron-CC-HQ +5.6 MMLU over DCLM at 8B | verified exactly (59.0 against 53.4, 1T tokens) | s3, s5 |
| "Darwin-CC style" evolved curation squeezes a bit more | verified, with licence question | Lineage (Darwin-CC), s7 |
| Frontier open stack composition | kept, sourced | s9 |

## "What to use for a 150-350M pretrain"
| Old claim | Status | Where now |
|---|---|---|
| FineWeb-Edu 1.3T cut; 50-500B tokens; SmolLM2-135M/360M 2T/4T; Chinchilla ~3-7B | verified | s9 correction box |
| "nanochat and most nanoGPT-scale speedruns standardized on exactly this corpus" | corrected | nanochat moved to ClimbMix-400B (commit 92d63d4, dataset.py lines 23 and 36); modded-nanogpt uses FineWeb 10B (commit 4ea6b93) (s9) |
| ~5-10% code, ~5% FineMath 4+, final 10-20% as anneal | kept as published practice | s9 |
| DCLM sample alternative; "50/50 FineWeb-Edu + DCLM mix (what SmolLM2 converged to)" | corrected | SmolLM2 chose 60/40 in stage 1 and 40/60 in stage 3 (s9) |
| Decontaminate before training; tokenizer on same distribution | kept, linked | s9 |
