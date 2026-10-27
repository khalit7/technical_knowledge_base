# Coverage of the old Notion pages

The old root and its four children are saved verbatim in `old/` (fetched read-only 2026-10-14). Khalid asked that they be treated as unverified notes. Every claim is listed here with its fate: **verified** (checked against the source named), **corrected** (the old text was wrong or imprecise; the correction and its source), **dropped** (with the reason), or **moved** (kept for a child page or a lab tab, which owns it; status still given). "Where" names the Reading section (R1 to R12, see `README.md` in this folder) or the tab that now carries it.

Sources were read in their arXiv HTML versions (tables where stated) and in the Hugging Face dataset cards on 2026-10-14. The full list of verified facts, with numbers, is under "read" in the topic's shared FACTS file (copied into `facts.md` here).

## 00 Root: Topic: data-curation-and-datasets

| Old claim | Status | Source and correction | Where |
|---|---|---|---|
| 6-minute narrated video | kept as is | Leave it on the Notion page; Khalid decides (it describes the old page) | Notion `<video>` tag stays |
| Data decisions move benchmarks more than most architecture decisions at fixed compute (2023 to 2026) | verified, reworded | Supported at small scale by Patel and Han (2026) and by every ablation table below; stated with its scale caveat | R1 |
| Dwarkesh decomposition: data 3.24x more compute-efficiency gain than model, 2019 to 2025 | verified, qualified | Dwarkesh Patel and Jerry Han, 2026-09-08: 12.0x (data) vs 3.7x (model) at 1e19 FLOPs; recipes GPT-2 to OLMo-2 crossed with corpora OpenWebText to UltraFineWeb; OLMES. Small-scale runs, limited tuning, authors' own caveats | R1 |
| The two contributions are largely independent | verified | 88% of OLMES variance explained additively, 7x7 grid at 3.16e18 FLOPs, one seed per cell; the authors say it "hints" | R1 |
| "Small models gain most from data quality" as a sub-finding | corrected | The authors argue it; they trained only small models, so it is not a measured comparison across sizes. Reworded as their argument | R1 |
| NeoHorse-1 as the "practical counterpart" | moved | Linked from Further reading (paper page 3db5c17b0d0d81e3b105e033a359ad24); not repeated | Further reading |
| Mermaid map of the space | replaced | Redrawn as the clickable pipeline map in R0 (same nodes plus storage) | R0 |
| Lineage C4 (2019) -> Pile (2020) -> RefinedWeb (2023) -> FineWeb/DCLM (2024) -> Dolma 3, Nemotron-CC v2/v2.1 (2025 to 2026) | verified, dates corrected | Nemotron-CC-v2 2025-08-18, v2.1 2025-12-15 (cards); Dolma 3 2025 (Olmo 3) | R2 |
| Model-based classifiers separate the generations | verified | FineWeb-Edu, DCLM, Nemotron-CC ablations | R2, R5 |
| Nemotron-CC keeps ~4x more unique tokens at comparable quality | verified | arXiv 2412.02595 abstract: full 6.3T matches DCLM on MMLU with 4x more unique real tokens | R5, R7 |
| For a 150 to 350M pretrain, FineWeb-Edu plus a small code and math sprinkle is the sane default | kept as advice, labelled | Consistent with SmolLM2 (arXiv 2502.02737), which chose 60% FineWeb-Edu / 40% DCLM at 1.7B; labelled as a starting point to ablate | R11 |
| Pipeline order: URL, extraction, LID, heuristics, model quality, dedup, decontamination, PII, cheapest first | verified with a nuance | FineWeb runs PII last (formatter) and dedup before PII; Dolma dedups URLs first; order is mostly cost | R3 |
| Two stages move almost all of it: WARC extraction and the quality classifier | verified, qualified | DCLM Table 3 (WET 20.7 vs 24.1/24.5 Core) and DCLM's classifier (+3.5 Core); FineWeb Fig. 1 | R3, R5 |
| FineWeb and DCLM published ablations for every stage | verified | Both papers | R3 |
| DoReMi: Group DRO proxy, excess loss vs reference | verified | arXiv 2305.10429 | R7 |
| Data Mixing Laws: loss as a function of proportions, nested in scaling laws | verified (abstract level) | arXiv 2403.16952 | R7 |
| RegMix: regression over tiny runs | verified | arXiv 2407.01492: 512 x 1M-parameter models on 1B tokens | R7 |
| Mid-training over the last 10 to 30% of tokens upweighting math, code, instruction data while LR decays | verified with examples, range labelled as typical | OLMo 2: 50B Dolmino tokens after 4T (about 1.2%) for 7B; Llama 3 anneals the last 40M tokens; so "10 to 30%" is not a rule: corrected to "a short final stage, from about 1% to a few tens of percent of tokens" | R7 |
| Why it works: scarce tokens not diluted, low LR | kept as the standard explanation, labelled as a hypothesis | No controlled proof found; labelled "the usual explanation" | R7 |
| Long-context stage often follows | verified | Dolma 3 has a long-context stage (Longmino); sizes not rechecked, so not quoted | R7 |
| CMR scaling law: power laws from probe runs, solve for the largest domain fraction | verified | arXiv 2407.17467 | R7 |
| Synthetic category exists because the crawl is finite | kept as framing | Nemotron-CC and Muennighoff frame it the same way | R8 |
| Generation from scratch (Phi) narrows style and shapes skills to benchmarks | verified as a common critique, labelled | Phi reports (arXiv 2306.11644, 2309.05463) describe the method; the "benchmark-shaped" critique is widespread but not measured in a single source: labelled as critique | R8 |
| Rephrasing went mainstream | verified | WRAP (arXiv 2401.16380), Nemotron-CC, BeyondWeb, Dolma 3 Dolmino (synthetic QA, math) | R8 |
| SFT moved from self-instruct to curated distillation plus verified reasoning traces | verified | Tulu 3, s1K, OpenThoughts lineage | R9 |
| Preference data mostly on-policy and judged by a model | verified for the open recipes | Tulu 3: on-policy plus off-policy completions, GPT-4o judge | R9 |
| RLVR dataset is (prompt, verifier) pairs | verified | Tulu 3 Section 6 | R9 |
| Model collapse real but assumes replacement; accumulation, grounding and filtering avoid it | verified | Shumailov et al. Nature 2024; Gerstgrasser et al. arXiv 2404.01413 | R8 |
| Environments: invert generation (verified tool chain first), reconstruct environments from trajectories | verified | ToolGrad (Google Research blog 2026-09-10), Terminal-Universe (arXiv 2609.04148) | R9 |
| Tool table: datatrove, Dolma toolkit, NeMo Curator, Spark/Ray | verified at overview level; status and dates owned by the Tool map | GitHub repos; datatrove v0.10.1 tag read | R10, Tool map |
| "Spark/Ray custom is what most industrial teams actually run (e.g. RefinedWeb)" | corrected | RefinedWeb's MDR is a custom pipeline; the paper does not say Spark or Ray. "Most industrial teams" is unsourced: dropped | R10 |
| NeMo Curator uses RAPIDS cuDF on GPUs | verified at overview level | NVIDIA-NeMo/Curator README (Tool map owns details) | R10 |
| Child pages and reading times | moved | Children to be proposed to Khalid; old times dropped | R12 |
| Related topics links | kept | Ids checked in pages.json. Note: 3c65c17b0d0d814f82cffd0d5c0dd5ba is the Pretraining child page, not the training topic root (3c65c17b0d0d81b6876ee72b7056793b) | Further reading |
| Best entry points with times | kept, re-timed | Further reading | Further reading |

## 01 Pretraining corpora: lineage and current landscape

| Old claim | Status | Source and correction | Where |
|---|---|---|---|
| Common Crawl since 2008, monthly snapshots, WARC/WAT/WET, hundreds of TB per snapshot | verified (overview) | commoncrawl.org; per-crawl sizes are on each crawl's announcement; the Pipeline lab owns the measured slice | R2 |
| C4 2019, ~175B tokens, ODC-BY, rules (terminal punctuation, bad words, 3 sentences) | verified | T5 paper Section 2.2; 175B from Dolma paper; licence ODC-By (allenai/c4 card) | R2, R4 |
| The Pile 2020, 825GB, ~300B tokens, 22 sources, Books3 removed | verified with tokenizer caveat | Pile paper 825 GiB, 22 sources; 387B tokens in the Dolma paper's count, about 300B with GPT-NeoX; Books3 takedown 2023 (public record) | R2 |
| ROOTS 2022, 1.6TB, 46 languages | verified | BLOOM/ROOTS paper (46 natural languages, 1.6TB); Dolma counts about 400B tokens | Corpus table (Tool map) |
| RefinedWeb 2023, 600B released (5T built), ODC-BY, trafilatura + strict dedup; "filtered web alone beats curated mixes" | verified | arXiv 2306.01116: ~5,000 GT built, 600 GT public; DCLM Table 2 also found RefinedWeb best among older sets | R2 |
| FineWeb 2024, 15T -> 18.5T+ tokens, ODC-BY, per-snapshot MinHash | verified | Paper 15T/96 snapshots; card 18.5T; its table lists 110 distinct dumps through CC-MAIN-2025-26 (CC-MAIN-2021-43 appears twice; 18,305.9B summed once) | R2 |
| FineWeb-Edu 1.3T (score >= 3), 5.4T (>= 2); Llama-3-70B annotations; MMLU/ARC gains | verified | Paper and cards | R5 |
| DCLM-Baseline ~3.8T from a 240T pool, CC-BY-4.0, OH-2.5 + ELI5 fastText the biggest lever | verified | arXiv 2406.11794 | R5 |
| Dolma 2023 to 2024, 3T tokens, ODC-BY, "powered OLMo 1/2" | corrected | Dolma powered OLMo 1 (v1_5) and OLMo-7B-v1.7; OLMo 2's pretraining mix is 95% DCLM-Baseline (OLMo 2 Table 4). Licence: ODC-By on the card now | R2 |
| Nemotron-CC 2024, 6.3T = 4.4T organic + 1.9T synthetic, CC-BY-4.0, ensemble + buckets, rephrase low quality | verified; licence moved to Tool map | arXiv 2412.02595 | R5, R8 |
| FineWeb2 2024 to 2025, ~3T words, 1000+ languages, ODC-BY | verified except the word count | Card: over 1000 languages, 96 snapshots; the 3T-word figure was not found on the card: dropped | Tool map |
| Dolma 3 2025, 5.9T mix + 100B Dolmino + 50 to 100B Longmino, olmOCR PDFs | verified except Longmino size | Cards: Mix 5.93T, Dolmino 100B, olmOCR science PDFs 805B in the mix; Longmino size not rechecked: not quoted | R2, R7 |
| Nemotron-CC v2/v2.1: +2.5T then +2.1T; synthetic via Qwen3-32B; code rephrasing/transpiling; NVIDIA open license | corrected | Cards: v2 is 6.6T in total (2025-08-18); v2.1 adds 2.5T new tokens (2025-12-15); synthetic by Qwen3-30B-A3B; code rephrasing and transpiling are in Nemotron-Pretraining-Code-v2 (Qwen3 32B); licence "NVIDIA Data Agreement for Model Training" | R2, Tool map |
| FinePDFs 3T / FinePDFs-Edu 350B, ODC-BY | verified | Cards | R2 |
| TxT360, Zyda-2 (5T), Ultra-FineWeb, Common Pile v0.1 (8TB), Essential-Web (24T, 12-category taxonomy), The Stack v2 (900B+) | verified except The Stack v2 size | Cards and papers; The Stack v2 card gated: moved to Tool map unverified | Tool map |
| Five levers separate generations: extraction, model filtering, dedup, not over-filtering, synthetic | verified | Each has its own source above | R2 summary |
| The corpus generations are "most of what the 3.24x measures" | corrected | The decomposition crosses yearly recipes with yearly corpora; it does not attribute the gain to particular levers. Dropped as stated | R1 |
| C4 paper: unfiltered 6.1TB (~8x of 745GB) scored worst on every task | corrected | Table 8: worst on 6 of 7 columns; on SuperGLUE Wikipedia (68.01) is below unfiltered (68.04). The paper's text says "every task" and its table disagrees slightly | R4 |
| C4 repetition: 64 harmless, 256 marginal, 1,024 costs ~4 GLUE and 4.6 SQuAD, training loss falls | verified | Table 9: GLUE 83.28 -> 79.55, SQuAD 80.88 -> 76.27 | R7 |
| "A corpus is large enough if you repeat it a few dozen times at most" | corrected | That was T5-base at 2^35 tokens. Muennighoff et al. find ~4 epochs as good as fresh data and returns diminishing fast after ~16 | R7 |
| Independent evaluations rank Nemotron-CC-HQ and DCLM top; Nemotron-CC-HQ +5.6 MMLU over DCLM in NVIDIA's matched 8B ablations | corrected | The +5.6 is NVIDIA's own result (8B, 1T tokens), not independent; labelled vendor. "Independent head-to-heads consistently rank" is unsourced: dropped | R5 |
| "Darwin-CC style automated pipeline search squeezes a bit more" | dropped | No primary source found | none |
| Frontier open stack is a composition (web + PDFs + code + math + mid-training mix) | verified by example | Dolma 3 Mix table | R2 |
| 150 to 350M recipe: FineWeb-Edu 1.3T, 50 to 500B tokens, SmolLM2-135M/360M on 2T/4T, Chinchilla ~3 to 7B tokens, sample-100BT/350BT | verified, moved | SmolLM2 paper (135M: 2T, 360M: 4T); Chinchilla 20 tokens per parameter gives 3B to 7B; FineWeb-Edu sample configs on the card | R11 |
| nanochat and speedruns standardised on FineWeb-Edu | moved, not verified here | For the child page | none on root |
| Sprinkle 5 to 10% code, ~5% math, mostly in the last 10 to 20% | kept as labelled advice | SmolLM2's staged mixes; labelled as a starting point | R11 |
| SmolLM2 converged to a 50/50 FineWeb-Edu + DCLM mix | corrected | SmolLM2 Table 1 and text: 60% FineWeb-Edu, 40% DCLM | R5 |
| Decontaminate before training | verified | Tulu 3, DCLM practice | R6 |

## 02 Filtering, dedup, and the curation pipeline

| Old claim | Status | Source and correction | Where |
|---|---|---|---|
| FineWeb ablations with 1.8B-parameter proxy runs | corrected | 1.71B parameters including embeddings, 28B tokens per ablation (FineWeb paper Section 3.1) | R3 |
| Order matters mostly for cost; dedup after filtering; decontamination last | verified as practice | FineWeb and DCLM pipelines | R3 |
| WET worse than WARC re-extraction even after filtering; do not train on WET | verified | FineWeb Fig. 1; DCLM Table 3 (WET 20.7 vs resiliparse 24.1 Core) | R3 |
| trafilatura best quality, slower | verified | DCLM Table 16: 0.56 MB/s/core | R3 |
| resiliparse ~4x faster, slightly more boilerplate, comparable quality | corrected | 4.55 vs 0.56 MB/s/core: about 8x faster (DCLM Table 16); comparable Core (24.1 vs 24.5) | R3 |
| PDFs need Docling, olmOCR, marker | verified at overview level | Dolma 3 uses olmOCR; FinePDFs card | R2 |
| C4 rules | verified | T5 Section 2.2 | R4 |
| Gopher rules: 50 to 100k words, mean word length 3 to 10, symbol ratios, bullet/ellipsis, ">= 80% lines with an alphabetic character", stop words | corrected | It is 80% of WORDS containing an alphabetic character (Gopher paper; datatrove gopher_quality_filter.py at v0.10.1, line 113 to 119) | R4 |
| FineWeb's three custom filters, ~+1% aggregate | verified with thresholds | <= 0.12 punctuation lines, >= 0.1 duplicated-line characters, >= 0.67 short lines; ~22% removed; +~1%. datatrove's default char-dup threshold is 0.01, not 0.1 (flagged to the Pipeline lab) | R4, Pipeline lab |
| DCLM fastText, OH-2.5 + ELI5, keep top ~10%; beat every other strategy | verified | DCLM Section 4.4 | R5 |
| FineWeb-Edu: 450k docs annotated by Llama-3-70B-Instruct, Snowflake-arctic-embed regression head, >= 3 gives 1.3T | corrected count | Paper: 460,000 (410k train, 50k validation); head is a linear regression on frozen Snowflake-arctic-embed-m | R5 |
| FineWeb-Edu: big MMLU/ARC/OBQA gains, mild HellaSwag losses | verified | FineWeb paper Section 4; threshold 3 chosen as the trade-off with HellaSwag | R5 |
| Nemotron-CC: three-classifier ensemble, 5 tiers, rephrase or downweight low tiers | verified | 20 buckets merged to 5 levels | R5 |
| Perplexity filtering (CCNet KenLM on Wikipedia) mostly superseded; both FineWeb and DCLM found classifiers strictly better | corrected | DCLM compared a perplexity filter (154M model) and found fastText OH-2.5+ELI5 better; FineWeb did not test perplexity filtering. Muennighoff found perplexity filtering helpful in their setting | R5 |
| Every classifier encodes a target distribution | verified | SmolLM2 Table 1 (Edu wins MMLU/ARC, DCLM wins HellaSwag/CSQA) | R5 |
| Dedup wastes compute, amplifies memorisation (Lee et al.) | verified | Lee et al.: over 1% of emitted tokens memorised, 10x fewer after dedup | R4 |
| Exact dedup by hashing documents or URLs | verified | Standard; Dolma URL dedup | R4 |
| MinHash + LSH: FineWeb 5-grams, 112 hashes, 14 buckets of 8, ~75% | verified | FineWeb Appendix: 56%, 77%, 92%, 98.8% at 0.7, 0.75, 0.8, 0.85 | R4, Dedup lab |
| Per-snapshot beat global dedup; global kept the oldest copy; survivors were boilerplate | verified | FineWeb Section 3.4 | R4 |
| Suffix arrays: remove any 50+ token span; RefinedWeb ran both | verified | Lee et al. k = 50; RefinedWeb > 50 consecutive tokens plus MinHash | R4 |
| Bloom-filter dedup in Dolma (Rust, paragraph level, approximate) | verified | Dolma paper Section 4.1; DCLM used a modified Bloom filter for DCLM-baseline | R4 |
| Semantic dedup: SemDeDup, D4, NeMo Curator; smaller gains, used for synthetic and SFT | verified at overview level, gain size labelled as unconfirmed | SemDeDup arXiv 2303.09540; Dedup lab owns measurement | R4 |
| Dedup counts as upsampling policy (TxT360, FineWeb2 rehydration) | verified | TxT360 card (keeps duplicate counts); FineWeb2 card | R4 |
| GPT-3 used 13-grams; most groups 10 to 13 grams | verified for GPT-3; corrected the range | GPT-3 13-grams; Tulu 3 and Llama 3 use 8-grams | R6 |
| DCLM found gains not from contamination | verified | DCLM Table 7 | R6 |
| Over-aggressive decontamination removes good data; log and eyeball | kept as practice | Pipeline lab measures it | R6 |
| PII: FineWeb regex-anonymises emails and public IPs | verified | FineWeb paper Appendix | R3 |
| Presidio-style NER, NeMo Curator PII module; opt-out honouring | verified at overview level | Tool map owns | R3 |
| What moves the needle 1 to 5 | verified per item above; item 2 ("classifier choice dominates dedup-method choice", DCLM) | verified: DCLM's filtering model range 35% to 44% MMLU vs smaller dedup differences | R11 |
| For a FineWeb-Edu run the corpus already did all this; datatrove's example reproduces it | verified | examples/fineweb.py at v0.10.1 | R11 |

## 03 Data mixing

| Old claim | Status | Source and correction | Where |
|---|---|---|---|
| Natural, uniform or Pile proportions are all suboptimal | verified as reported | DoReMi vs Pile weights; RegMix vs human selection | R7 |
| Mixture is "the cheapest large lever" tied to the 3.24x | dropped | The decomposition does not isolate mixture | none |
| Manual weights: baseline surprisingly hard to beat | verified (Aioli: stratified sampling hard to beat) | arXiv 2411.05735 | R7 |
| DoReMi +6.5 points at 8B over Pile weights; task-agnostic | verified | arXiv 2305.10429 (280M proxy) | R7 |
| Data Mixing Laws: exponential form, nested with scaling laws | verified (abstract level) | arXiv 2403.16952 | R7 |
| RegMix ~512 tiny (1M) models, linear + LightGBM; matches DoReMi at ~10% compute; web over Wikipedia | verified | arXiv 2407.01492 | R7 |
| Aioli: many methods do not beat stratified sampling | verified | arXiv 2411.05735 | R7 |
| AutoScale, MDE, UtiliMax/MEDU, RegMix-D, Data Mixing Agent | moved, not verified here | For the Mixing lab or a child page | Mixing lab |
| Re-fit rather than copy weights; small sources can repeat ~4 epochs | verified | Muennighoff et al. | R7 |
| Standard 2025 to 2026 recipe: 2 to 4 stages | verified by examples | OLMo 2, Olmo 3, SmolLM2 (4 stages) | R7 |
| Evidence: MiniCPM WSD, Llama 3 annealing, OLMo Dolmino 100B, SmolLM2/3 | corrected for OLMo 2 | OLMo 2 Dolmino samples 50B/100B/300B; the 100B Dolmino mix is Olmo 3's | R7 |
| Annealing as a cheap way to evaluate a dataset (Llama 3, OLMo) | verified | Llama 3 paper Section 3.1.3; Nemotron-CC used annealing to rank buckets | R7 |
| Why staging works | labelled hypothesis | see root row | R7 |
| 150 to 350M FineWeb-Edu recipe | moved to R11, labelled advice | | R11 |
| CPT replay ratio folklore 10 to 50% general | kept as labelled folklore | No source | R7 |
| CMR: power laws in ratio and tokens; definition; predicted CMR "expressed as the general-data share" 29.8%, 34.9%, 41.4%, 47.8% | corrected | The ratio is the DOMAIN-data share (arXiv 2407.17467 Section 3: "the mixture ratio of the domain-specific data"); larger models tolerate more domain data; closer domains allow more | R7 |
| "Up to 20B CPT tokens" | dropped | Not found as stated | none |
| Khalid has used CMR professionally | kept | Personal note, kept as one clause | R7 |
| D-CPT-Law, Data Mixing Agent | moved | Mixing lab or child page | Mixing lab |

## 04 Synthetic data and post-training data

| Old claim | Status | Source and correction | Where |
|---|---|---|---|
| Phi line: textbooks; small models punch above weight | verified | Phi-1 and Phi-1.5 reports | R8 |
| Cosmopedia ~39M documents, ~25 to 27B tokens, Mixtral-8x7B, seeded on web topics, used in SmolLM | corrected | v1: 30M+ samples, about 25B tokens (Cosmopedia card and blog); v2: 39M+ documents (smollm-corpus card) | R8 |
| Persona Hub diversity control | moved | child page | none |
| WRAP lineage; grounding preserves information diversity | verified | arXiv 2401.16380 (5x less data or 3x less compute at their scale) | R8 |
| Nemotron-CC 1.9T synthetic; v2.1 2.1T with Qwen3-32B incl. code | corrected | see 01 | R8 |
| BeyondWeb lessons | verified, labelled vendor | DatologyAI, a curation vendor | R8 |
| Rephrased slices reported for Kimi K2, Qwen 2.5+, GPT-5-class | corrected | Kimi K2 and Qwen 2.5 reports describe synthetic or rephrased data; "GPT-5-class" has no public source: dropped | R8 |
| SFT lineage: Self-Instruct, Alpaca 52k, Evol-Instruct, UltraChat, OpenHermes-2.5, Magpie, reasoning traces | verified at overview level | Magpie arXiv 2406.08464 (prompt with template header only); s1K | R9 |
| LIMA 1,000 examples; superficial alignment hypothesis | verified | arXiv 2305.11206 | R9 |
| Tulu 3 SFT ~940k, deduplicated and decontaminated | verified | 939,344 (Table 7); 8-gram decontamination | R9 |
| Distillation default for small models; SmolTalk template | verified | SmolLM2 paper | R9 |
| s1K: 1k verified traces unlock test-time scaling | verified | arXiv 2501.19393 | R9 |
| UltraFeedback 64k prompts, GPT-4 ratings across helpfulness/honesty/instruction-following | corrected | Four aspects: instruction-following, truthfulness, honesty, helpfulness (card) | R9 |
| On-policy beats off-policy; length bias | verified for Tulu 3 | Tulu 3 Section 5 | R9 |
| RLVR math/code/IF sources; Tulu 3 RLVR = GSM8K + MATH + constraints | verified | Tulu 3 Section 6 | R9 |
| Guru ~92k across domains | verified | arXiv 2506.14965 | R9 |
| Difficulty filtering because GRPO gets zero gradient from all-same-reward groups | verified (mechanism) | Follows from the group-normalised advantage; RL topic owns it | R9 |
| ToolGrad 99.8%, 16,000 APIs, Gemma 3 12B on 500 examples matched Gemini 2.5 Pro | verified, sharpened | Google Research blog 2026-09-10: BFCL 83.1 vs 83.2 | R9 |
| Terminal-Universe: 37,300 environments; +11.9 Terminal-Bench 2.1, +13.8 EvoCode-Bench v2 MT@4 | verified (abstract) | arXiv 2609.04148 | R9 |
| EnvHarness | dropped from root | Not verified; for a child page | none |
| Repo-To-Skill AREX library: 5,000+ skills, 1,000 repos, MLE-bench +134.3% etc. | verified | Repo's paper page (whats_new/papers/repo_to_skill) | R9 (one line), Further reading |
| Contamination laundering through distillation | verified as a known risk | Tulu 3 found and removed contaminated public sets | R6 |
| Model collapse: Shumailov; Gerstgrasser accumulation; ToEdit | verified except ToEdit (moved) | | R8 |
| Post-2023 crawls fill with AI text | kept, labelled as a concern without a measured rate | | R8 |
| Small-model post-training recipe | moved | child page | none |

## Update 2026-10-15 (after the lab tabs)
- The Reading tab's own first draft was corrected in three places by the labs: DoReMi's gain is over a document-count baseline, not The Pile's Table 1 weights; Nemotron-CC's "10% recall" is a token share (Table 9) and the classifiers' overlap is Table 8's 10.1%; FineWeb's "10% kept" is 6.3% by its own token counts.
- The illustrative page in section 3 was replaced by a real Common Crawl page measured by the Pipeline and Quality labs.
- The RefinedWeb band reading is now backed by a measurement (Dedup lab).
