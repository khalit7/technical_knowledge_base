
## read (Reading agent, verified 2026-10-14 against primary sources)

Format: fact | source | note. arXiv numbers read from the arXiv HTML version (tables where stated).

### Data vs model decomposition
- Dwarkesh Patel and Jerry Han, "Pretraining progress is mostly data", 2026-09-08: data improvements 12.0x vs model improvements 3.7x compute-efficiency gain (ratio 3.24x), 2019 to 2025, at a 1e19 FLOPs budget; recipes GPT-2 (2019) to OLMo-2 (2025) crossed with corpora OpenWebText (2019) to UltraFineWeb (2025); OLMES 10-task eval; 88% of OLMES variance explained by additive model and data effects (7x7 grid at 3.16e18 FLOPs, one seed per cell). "Small models see significant gains from data quality" is the authors' reasoning; they trained only small models, so it is not a measured comparison across sizes. | https://www.dwarkesh.com/p/pretraining-progress-is-mostly-data | small-scale, independent (not a lab selling data)

### C4 / T5 (arXiv 1910.10683, Tables 8 and 9; also repo page reference/papers/t5 tables.json)
- C4 rules: keep lines ending in terminal punctuation; drop pages with fewer than 3 sentences; keep lines with at least 5 words; drop pages with any bad word; drop lines with "Javascript"; drop pages with "lorem ipsum"; drop pages with "{"; dedup any three-sentence span occurring more than once. Built from the April 2019 crawl, about 750 GB (Table 8: 745GB).
- Table 8: C4 745GB vs C4 unfiltered 6.1TB: unfiltered lower on GLUE 81.46 vs 83.28, SQuAD 78.78 vs 80.88, SGLUE 68.04 vs 71.36. The paper text says unfiltered is "the worst in every task", but on SuperGLUE Wikipedia (68.01) is lower than unfiltered (68.04): worst on 6 of 7 columns.
- Table 9 (T5-base, 2^35 tokens of training): repeats 64: GLUE 82.87, SQuAD 80.97; 256: 82.62, 79.78; 1,024: 79.55, 76.27; 4,096: 76.34, 70.92; full data: 83.28, 80.88.
- C4 size in tokens: 175B (Dolma paper, arXiv 2402.00159, Section 2); Pile 387B tokens in the same list; ROOTS about 400B.

### FineWeb (arXiv 2406.17557; HF card HuggingFaceFW/fineweb, card lastModified 2025-07-11)
- Paper: 15T tokens from 96 snapshots; ablation models 1.71B parameters (incl. embeddings), 28B-token ablations, 350B-token for larger checks.
- Card: more than 18.5T tokens; the dump table lists 110 distinct dumps (CC-MAIN-2021-43 is printed twice) summing to 18,305.9B GPT-2 tokens (18,526.9B if the duplicate row is counted), latest CC-MAIN-2025-26 (June 2025). Licence ODC-By 1.0.
- WET vs trafilatura-on-WARC: WET "retained too much boilerplate and menu text"; Fig. 1 shows trafilatura-WARC ahead (28B-token ablations).
- Base filtering = URL blocklist, fastText English score >= 0.65, Gopher (MassiveText) quality and repetition filters: about 36T tokens over 96 snapshots.
- MinHash: 5-grams, 112 hashes, 14 buckets of 8, targets 75% similarity; P(match) at similarity 0.7/0.75/0.8/0.85 = 56%/77%/92%/98.8%.
- Global dedup: removed up to 90% of the oldest snapshots; 4T tokens left; no gain at 350B tokens. On 2013-48 the kept 10% (~31B tokens) was worse than the removed 90% (171B after individual dedup of ~460B). Per-snapshot dedup chosen; lighter global methods (URL, line, 3-line dedup) were all worse.
- Custom filters: fraction of lines ending in punctuation <= 0.12 (10.14% tokens removed, vs 30% for C4's terminal-punctuation rule); fraction of characters in duplicated lines >= 0.1 (12.47% removed; MassiveText threshold 0.2); fraction of lines shorter than 30 chars >= 0.67 (3.73%); together ~22% removed, aggregate +~1% in 28B-token ablations.
- C4 filter ablation on 2019-18: terminal punctuation gives the biggest single boost but removes ~30% of tokens; curly bracket 2.8%; word lengths 4.3%.
- PII: emails and public IP addresses anonymised with regexes.
- FineWeb-Edu: Llama-3-70B-Instruct scored 460,000 pages from CC-MAIN-2024-10 on 0 to 5 (additive prompt, grade-school focus); linear regression head on frozen Snowflake-arctic-embed-m trained on 410,000, validated on 50,000; threshold 3, F1 82%; 1.3T tokens; scoring all of FineWeb took 6,000 H100 GPU hours. (Earlier blog and secondary sources say 450k; the paper says 460,000.) Card: 1.3T (score >= 3) and 5.4T (score >= 2, fineweb-edu-score-2). ODC-By.
- datatrove v0.10.1 (tag commit 1977fbb0f3c163d43cace334b073dda17fa3ef26): FineWebQualityFilter defaults line_punct_thr 0.12, short_line_thr 0.67, short_line_length 30, char_duplicates_ratio 0.01 (paper says 0.1), plus a fourth check new_line_ratio 0.3 ("list_ratio") not described in the paper; examples/fineweb.py uses the defaults and C4QualityFilter(filter_no_terminal_punct=False). GopherQualityFilter defaults: 50 to 100,000 words, mean word length 3 to 10, symbol/word <= 0.1, bullet lines <= 0.9, ellipsis lines <= 0.3, >= 80% of WORDS contain an alphabetic character, >= 2 stop words. (Pipeline lab owns the line-level citations.)

### DCLM (arXiv 2406.11794; HF card mlfoundations/dclm-baseline-1.0)
- DCLM-Pool 240T GPT-NeoX tokens, 200B documents, 370TB gzip, extracted with resiliparse. DCLM-baseline 3.8T tokens (paper); card says "4T token / 3B document". CC-BY-4.0.
- Table 3 (1B-1x): Core resiliparse 24.1, trafilatura 24.5, WET 20.7. Table 16: throughput resiliparse 4.55 vs trafilatura 0.56 MB/s/core (8.1x); average chars resiliparse 3,227, trafilatura 2,901, WET 6,580.
- fastText OH-2.5 + ELI5 positives vs RefinedWeb-reproduction negatives, keep top 10%: +3.5 Core over other choices; top 10% beat 15% and 20%.
- 7B on 2.6T tokens: 64% MMLU 5-shot; +6.6 points over MAP-Neo with 40% less compute.
- Decontamination (Table 7, 7B-2x): MMLU 51.8 -> 52.7 and HellaSwag 77.9 -> 78.4 after removing detected overlaps.
- Dedup used a Bloom-filter near-dup method (scales past 10TB) for DCLM-baseline.

### Nemotron-CC (arXiv 2412.02595)
- 6.3T tokens = 4.4T globally deduplicated original + 1.9T synthetic, from 99 snapshots CC-MAIN-2013-20 to 2024-30. jusText extractor (not trafilatura; +57.4% high-quality tokens with jusText and fewer heuristic filters).
- Ensemble of three classifiers (two FineWeb-Edu-style trained on Mistral 8x22B and Nemotron-340B annotations, plus DCLM fastText); scores to 20 buckets then 5 quality levels via annealing tests. FineWeb-Edu classifier not in the ensemble for licence reasons.
- Rephrasing with Mistral NeMo 12B Instruct: 336.3B tokens from low-quality docs, 1.5T from high-quality.
- 8B, 1T tokens: HQ subset (1.1T) +5.6 MMLU and +3.1 average over DCLM; full 6.3T matches DCLM MMLU with 4x more unique real tokens; 15T run (7.2T from Nemotron-CC) MMLU 70.3 vs Llama 3.1 8B 65.3 (NVIDIA's own harness). DCLM and FineWeb-Edu remove 90% of data.
- Nemotron-CC-v2 (HF card, 2025-08-18): 6,585.8B tokens, adds 8 snapshots 2024-2025, synthetic rephrasing Qwen3-30B-A3B (and Mistral-Nemo-12B). Nemotron-CC-v2.1 (card, created 2025-12-15): 2.5T new tokens (2,544.8B), CC-MAIN-2025-18/21/26 organic, Qwen3-30B-A3B for synthetic and translated. Licence NVIDIA Data Agreement for Model Training. Code rephrasing/transpiling is in Nemotron-Pretraining-Code-v2 (Qwen3 32B), not CC-v2.1.

### RefinedWeb (arXiv 2306.01116; card tiiuae/falcon-refinedweb)
- ~5,000 GT built, 600 GT public extract (card: 500 to 650 GT depending on tokenizer, 968M pages, 2.8TB); trafilatura; exact substring (> 50 consecutive tokens, Lee et al. implementation) plus MinHash 9,000 hashes, 5-grams, 20 buckets of 450; ~50% removed by dedup. ODC-By.

### Dedup evidence (Lee et al., arXiv 2107.06499)
- k = 50 tokens minimum exact substring; over 1% of tokens emitted unprompted by a C4-trained model are memorised; dedup cuts memorised emissions 10x (Table 4: XL original 1.926%, NearDup 0.189%, ExactSubstr 0.138%).
- Muennighoff et al. (arXiv 2305.16264): repeated data up to ~4 epochs gives insignificant downstream differences; meaningful gains up to ~16 epochs, then returns diminish fast; in their 84B-budget experiments perplexity filtering helped and deduplication did not help downstream.

### Dolma (arXiv 2402.00159; HF card allenai/dolma)
- 3T tokens, ODC-By (card), versions v1 2023-08-18, v1_5 2023-10-31 (OLMo-1B), v1_7 2024-04-15 (OLMo-7B-v1.7). Toolkit's Bloom filter used for URL, document and paragraph dedup and for decontamination by seeding with test examples. CCNet removes 84.2% (175.1TB -> 27.7TB).
- OLMo 2 pretraining (OLMo 2 1124 Mix, Table 4) is mostly DCLM-Baseline (3.71T tokens), not Dolma. Dolmino 1124 (Table 5/13): 50B, 100B, 300B samples. Table 9: OLMo 2 7B after 50B Dolmino tokens: average 53.0 -> 62.9, GSM8K 24.1 -> 67.5, MMLU 59.8 -> 63.7 (repo page reference/papers/olmo_2 tables.json).
- Dolma 3 (cards, ODC-By): pool 9.31T tokens; Dolma 3 Mix 5.93T (common_crawl 4.51T, olmOCR science PDFs 805B, Stack-Edu 409B, FineMath-3+ 151B, arXiv 50.9B, wiki 2.51B) used for Olmo 3 7B; Dolmino Mix 100B for stage 2 of Olmo 3 7B (largely synthetic math, code, QA, thinking).

### Others
- FinePDFs (card): ~3T tokens, 475M documents, 1,733 language-script pairs, 105 snapshots to Feb 2025, ODC-By. FinePDFs-Edu: 350B+ tokens, 69 languages, Qwen3 annotations, ModernBERT-large classifier.
- FineWeb2 (card): over 1000 languages, 96 snapshots 2013 to April 2024, ODC-By.
- Zyda-2 (card): 5T tokens, ODC-By. TxT360 (card): global dedup of 99 snapshots plus 14 curated sources. Essential-Web v1.0: 24T tokens with a 12-category FDC taxonomy (arXiv 2506.14111). Common Pile v0.1: 8TB openly licensed (arXiv 2506.05209). Ultra-FineWeb: Apache-2.0 card.
- SmolLM2 (arXiv 2502.02737): 1.7B on ~11T tokens; 360M on 4T; 135M on 2T; FineWeb-Edu vs DCLM at 350B tokens (Table 1) MMLU 37.5 vs 35.5, HellaSwag 60.1 vs 62.3; chose 60% FineWeb-Edu / 40% DCLM.
- DoReMi (arXiv 2305.10429): 280M proxy and reference; 8B main model; +6.5 points average few-shot accuracy over Pile default weights, baseline accuracy 2.6x faster; weight search costs 8% of the large run's compute.
- RegMix (arXiv 2407.01492): 512 models of 1M (non-embedding) parameters on 1B tokens; matches or beats DoReMi at 10% of compute; web (CC) correlates most with downstream, not Wikipedia; up to 14.6% single-task difference from mixture.
- Aioli (arXiv 2411.05735): no existing method consistently beats stratified sampling on average test perplexity; existing methods up to 6.9 points worse; Aioli +0.27 on 6 of 6.
- CMR (arXiv 2407.17467): mixture ratio is the DOMAIN-data share; predicted CMR 29.8%, 34.9%, 41.4%, 47.8% for 460M, 940M, 1.6B, 3.1B (Finance); Academic Papers CMR 36.7% vs Finance 29.8% at 460M; tolerance epsilon 0.05.
- WRAP (arXiv 2401.16380): rephrasing gives equivalent models with 5x less data or 3x less compute (Pile domains, their scale).
- BeyondWeb (arXiv 2508.10975, DatologyAI, a data-curation vendor): up to +5.1 pp over Cosmopedia and +2.6 pp over Nemotron-Synth (14-benchmark average); 3B on 180B tokens beats 8B on Cosmopedia at the same token budget.
- Cosmopedia (card): 30M+ samples by Mixtral-8x7B-Instruct, Apache-2.0; Cosmopedia v2 (smollm-corpus card): 39M+ documents. 25B-token figure is from the Cosmopedia blog (not rechecked here).
- Model collapse: Shumailov et al., Nature 2024; Gerstgrasser et al. (arXiv 2404.01413): replacing real data tends to collapse, accumulating synthetic data alongside real data avoids it.
- LIMA (arXiv 2305.11206): 65B LLaMa fine-tuned on 1,000 curated examples. s1K (arXiv 2501.19393): 1,000 questions selected from 59K.
- Tulu 3 (arXiv 2411.15124): SFT mixture 939,344 prompts (Table 7); decontamination by 8-gram matching on prompts, test instance flagged if >50% of its tokens have 8-gram matches with one training instance; training set removed if it overlaps more than 2% of an eval's instances; preference data on-policy, judged by GPT-4o-2024-0806, 354,192 pairs in the 8B mix. tulu-3-sft-mixture card licence ODC-By.
- UltraFeedback (card, MIT): 4 aspects: instruction-following, truthfulness, honesty, helpfulness (old page said 3).
- Guru (arXiv 2506.14965): 92K verifiable examples, six domains (math, code, science, logic, simulation, tabular).
- ToolGrad (Google Research blog 2026-09-10; arXiv 2508.04086): answer-first generation, 99.8% pass rate (figure caption), 16k+ ToolBench APIs, ToolGrad-500, Gemma-3 12B -> BFCL 83.1 vs Gemini 2.5 Pro 83.2.
- Terminal-Universe (arXiv 2609.04148, Qwen and Tsinghua): 37.3k environments from public trajectories; Qwen3.5-27B +11.9 Terminal-Bench 2.1, +13.8 EvoCode-Bench v2 MT@4 (abstract level).
- Llama 3 (arXiv 2407.21783, paper text in repo reference/papers/llama_3_herd/src/inputs/paper_v3.txt): final mix ~50% general knowledge, 25% math and reasoning, 17% code, 8% multilingual; annealing: LR linearly to 0 over the final 40M tokens at 128K context, upsampling very high quality sources; dataset value tested by annealing a 50%-trained 8B on 40B tokens with 30% new data / 70% default; annealing on GSM8K/MATH train sets lifted 8B validation by 24.0% / 6.4%, negligible at 405B.
- DCLM Table 4 (filtering approaches, Core / Extended): RefinedWeb reproduction 27.5/14.6; top 20% by PageRank 26.1/12.9; SemDedup 27.1/13.8; classifier on BGE features 27.2/14.0; AskLLM 28.6/14.3; perplexity filtering 29.0/15.0; top-k average logits 29.2/14.7; fastText OH-2.5+ELI5 30.2/15.4. Filtering model alone moves 7B (280B tokens) MMLU from 35% to 44%.
- Common Crawl CC-MAIN-2025-26 (announcement 2025-06-27): 2.38B pages, 389 TiB uncompressed, 100 segments, 100,000 WARC files; compressed WARC 82.73 TiB, WAT 15.62 TiB, WET 6.24 TiB. FineWeb's row for this dump: 419.6 GB, 152.4B GPT-2 tokens.
- FineWeb funnel (paper, GPT-2 tokens, 96 snapshots): base filtered ~36T; after per-snapshot MinHash ~20T; final 15T; FineWeb-Edu 1.3T.

### read: corrections and additions 2026-10-15 (after the labs)
- DoReMi's "baseline" (RegMix's "Human") is a document-count weighting from DoReMi's repo, not The Pile's Table 1 weights (mix2); the Reading tab now says so. DoReMi's +6.5 is one-shot on 5 generative tasks.
- OLMo 2's text calls mid-training "5 to 10% of training FLOPs", counting all souped mid-training runs; 50B / 4.05T = 1.2% is one run (mix).
- Nemotron-CC "recall around 10%" is Table 9's share of tokens labelled high quality (FineWeb-Edu 8%, DCLM 11%, ensemble 25%), not a recall; Table 8 intersection is 10.1% of the union (q).
- FineWeb's "kept 10% / removed 90%" of 2013-48: its own token counts give 31 / 491 = 6.3% (dp).
- RefinedWeb's two readings measured on the running example's pairs: 450 x 20 -> 363 candidates incl. all 308 >= 0.8; 20 x 450 -> 143, all identical (dedup).
- Dolma 3 web MinHash: 26 bands of 11; the formula gives 90.3% at 0.8 and 9.0% at 0.6, matching the README's 90% / 10%.
- FineWeb-Edu "F1 82%" matches a macro F1 (Quality lab: 0.85 macro, 0.72 positive class on 1,500 rows).
- Real page for the Reading animation: protectnmwater.org (CC-MAIN-2024-30 file 00000): in FineWeb and FineWeb-Edu (score 2.765625); FineWeb-Edu classifier 2.765 here; DCLM fastText 0.00164 (< 0.0181 cut); WET text removed by gopher_below_alpha_threshold (alpha 0.751 with spaCy-like tokens), trafilatura 0.801 passes.

### read: final pass 2026-10-16
- Reading now quotes: DoReMi on five domains (averaged weights web 2.6%, wiki 10.7%, code 37.9%, maths 38.5%, papers 10.3%; proxy 0.35 to 0.39 nats worse), WRAP rephrasing with Qwen3-4B (Medium length 1.02, numbers kept 93.7%, preamble 18.5%; Easy 0.52, 47.0%; FineWeb-Edu pass sources 8.5% vs 7.0 to 17.0%), the Qwen3-4B judge (67/55/53/66%), Qwen3-0.6B and 1.7B perplexity, SemDeDup on FineWeb 50k (0/7/49/242/569), D4 on FineWeb-Edu 50k (pruned median 3.02 vs 2.91), FineWeb 50k classifier overlap 16.0% (Spearman 0.41), IF_multi_constraints_upto5 22 copies in 21 rows.
