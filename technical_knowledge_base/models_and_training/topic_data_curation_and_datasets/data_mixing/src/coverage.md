# Coverage of the old Notion page "Data mixing: domain weights, curricula, and continued-pretraining ratios"

Old text: the root's `src/read/old/03_data_mixing.md` (fetched read-only 2026-10-14, last edited 2026-09-24). Every claim was treated as an unverified note. The root's `src/read/coverage.md` section 03 covers the same claims at root depth; this file adds where this page carries each one.

| Old claim | Status | Source and correction | Where on this page |
|---|---|---|---|
| Corpus is a mixture over domains; proportions change ability at fixed compute | verified | DoReMi, RegMix Table 4 (up to 14.6% single-task spread) | Reading s0, s1 |
| Natural, uniform, "what The Pile did" are all suboptimal | verified as reported, with a caveat | DoReMi and RegMix beat a document-count "Pile baseline", not The Pile's own Table 1 mix; Pile-CC alone ties DoReMi in RegMix Table 4 | s3a correction box, s3c |
| Three families: proxy optimisation, predictive laws, online/staged | verified | as structured in s3, s4, s5 | s3 to s5 |
| Mixture "the cheapest large lever", tied to the 3.24x decomposition | dropped | the decomposition does not isolate mixture (root coverage) | none |
| Manual weights hard to beat | verified | Aioli Table 2: stratified sampling beats most methods in several settings | s3d |
| DoReMi: proxy with Group DRO, excess-loss weights, +6.5 points at 8B, task-agnostic | verified, extended | Algorithm 1, Table 1, §3.2; 8% of 8B FLOPs; code at doremi/trainer.py 252 to 259 | s3a, DoReMi tab |
| Data Mixing Laws: exponential form, nested with scaling laws | verified | arXiv 2403.16952 Eq. 7 and §4; 48% claim | s3b, fitter tab |
| RegMix: ~512 1M models, linear + LightGBM, matches DoReMi at ~10% compute, web beats Wikipedia | verified, reproduced | Table 2 refit from released runs (within 0.7 rho points); Table 4 FLOPs 3.5e18 vs 3.7e19 | s3c, fitter tab |
| AutoScale / Aioli / MDE: optimal weights shift with scale; many methods do not beat stratified | AutoScale and Aioli verified; MDE not found | arXiv 2407.20177, 2411.05735 | s3d |
| UtiliMax / MEDU (2025) | not verified | no primary source checked; named as unverified | s3d note |
| RegMix-D, Data Mixing Agent (2025-26) | not verified | same | s3d note |
| Re-fit weights rather than copy | verified | DoReMi 280M vs repo 120M weights (60.6% vs 13.8% Pile-CC); AutoScale | s8 mistakes |
| Repeat small sources up to ~4 epochs; returns decay after | verified, quantified | Muennighoff R*_D = 15.39; 4 epochs worth 3.73 | s2 |
| Tiny-proxy RegMix search at small scale | kept, made concrete | the page's own pending experiment | s7 |
| "Single-static-mixture era is over"; 2 to 4 stages | verified by examples | SmolLM2 (4), SmolLM3 configs (3), OLMo 2 (2) | s5 |
| Mid-training over the final 10 to 30% | corrected | OLMo 2 7B 50B of 4T (about 1.2%), Llama 3 final 40M tokens, SmolLM2 10%; not a rule | s5 |
| MiniCPM WSD + high-quality decay | verified | arXiv 2404.06395 §4, decay-stage SFT ablation | s5 |
| OLMo 2/3 Dolmino 100B | corrected | OLMo 2: 50B, 100B and 300B mixes (Table 13); the 100B Dolmino mix as a stage is Olmo 3's | s5 |
| SmolLM2/3 3-stage mixes, FineMath and Stack-Edu late | corrected | SmolLM2 has 4 stages; SmolLM3 configs 3 stages; FineMath 4+ enters in SmolLM2 stage 4 | s5 |
| Annealing as cheap dataset evaluation (Llama 3, OLMo) | verified | Llama 3 §3.1.3 | s5 |
| Long-context stage; Dolma 3 "Longmino" 50 to 100B | moved | long-context extension is owned by the Pretraining and Positional Encodings pages; Longmino size not rechecked: not quoted | none (linked via Pretraining) |
| Why staging works (low LR, no dilution) | kept as labelled hypothesis | OLMo 2 Table 11 split (Pretraining page) | s5 |
| 150-350M FineWeb-Edu recipe | dropped here | moved to the root (R11) as labelled advice | none |
| CPT degrades general ability without replay | verified | CPT page (Ibrahim et al.) | s6 |
| Replay folklore 10 to 50% | kept as labelled folklore | no source | s6 |
| CMR: power laws, critical ratio, fit on short runs | verified | arXiv 2407.17467 | s6 |
| CMR values "expressed as the general-data share" 29.8 to 47.8% | corrected | domain-data share (§3) | s6 correction box |
| "up to 20B CPT tokens" | not quoted | the CPT page derives 20.97B; not needed here | none |
| Larger models tolerate more domain data; closer domains higher CMR | verified | 36.7% academic vs 29.8% finance at 460M | s6 |
| Khalid has used CMR professionally | not repeated | kept on the root and CPT page | none |
| Data Mixing Agent, D-CPT-Law | D-CPT on the CPT page; Data Mixing Agent not verified | | s6 links CPT page |
| Cross-links (corpora, synthetic, Pretraining, Optimisers) | kept | | s5, Further reading |

Additional corrections found while building (not in the old page):
- DoReMi's and RegMix's "Pile baseline / Human" weights are document-count (nopack) weights, not The Pile's Table 1 (Wikipedia 9.19% vs 1.53%).
- The DoReMi README calls `--reweight_eps` the update rate (default 1); in the code it is the smoothing (1e-3) and `--reweight_eta` the step size.
- RegMix Table 2 MSE values (0.13, 0.04) do not reproduce from its released runs (0.024, 0.003); rho values reproduce within 0.7 points.
- T5's "repeat 64 times at no cost" does not generalise (Muennighoff).
