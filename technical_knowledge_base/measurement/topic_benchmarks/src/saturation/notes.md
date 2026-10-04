# Saturation timeline: sources and verbatim quotes (read 4 October 2026)

Every point in `data/saturation.json` names its source id; this file gives, per benchmark, the sentence or table row each hand-entered number comes from. Rows taken from tracker files (Epoch AI hub, ARC Prize, MathArena, EvalPlus, Artificial Analysis) are copied programmatically by `fetch_inputs.py` and `make_saturation.py`; their provenance is the file itself.

## Trackers and files
- **Epoch AI benchmarking hub**, `https://epoch.ai/data/benchmark_data.zip` (downloaded 4 Oct 2026, CC BY 4.0). Files used: gpqa_diamond, math_level_5, swe_bench_verified, frontiermath, frontiermath_tiers_1_3_v2, frontiermath_tier_4, frontiermath_tier_4_v2, hle_external, mmlu_external (Stanford CRFM rows only for the independent series), gsm8k_external (HELM rows), hella_swag_external, os_world_external, terminalbench_external, model_metadata (display names and release dates). `benchmark_metadata.csv` gives release dates used for FrontierMath Tier 4 (2025-07-11) and OSWorld 2.0 (2026-06-26).
- **ARC Prize**, `https://arcprize.org/media/data/leaderboard/v1.json`, `v2.json` (generated 2026-10-01T18:51Z), `v3.json` (2026-09-30T13:12Z). Leaderboard page: "ARC-AGI-3 results use either the Standard harness (carries forward model-selected notes throughout the environment) or the Provider Adapter harness (preserves reasoning state and compacts longer conversations so the model can reuse prior work)."
- **MathArena**, `https://matharena.ai/competition_tables/aime--aime_2025` and `aime--aime_2026`. The warning icon's tooltip: "Model was released after competition release."
- **EvalPlus**, `https://evalplus.github.io/results.json` (base HumanEval column, greedy pass@1).
- **Artificial Analysis** Terminal-Bench-Science 0.1 and Terminal-Bench 4.0 cells, as collected for Topic: llms (`models_and_training/topic_llms/src/data/bench_grid.json`, read 1 Oct 2026).

## ImageNet (ILSVRC)
- Results pages `https://image-net.org/challenges/LSVRC/<year>/results`. Top-5 classification error of the winning provided-data entry: 2010 NEC-UIUC 0.28191 ("flat_opt.txt 0.28191"), 2011 XRCE 0.25770, 2012 SuperVision 0.16422 ("Using only supplied training data"; 0.15315 "Using extra training data from ImageNet Fall 2011 release"), 2013 Clarifai 0.11743 ("Average of multiple models on original training data"; 0.11197 with outside data, dark grey), 2014 GoogLeNet 0.06656, 2015 MSRA 0.03567, 2016 Trimps-Soushen 0.02991, 2017 WMW 0.02251.
- Dates from the news lines: "September 3, 2010: Full results are available."; "Oct 26, 2011: Full results released!!"; "October 13, 2012: Full results are released."; "November 14, 2013: ILSVRC 2013 results are available!"; "August 18, 2014: Results are released."; "December 10, 2015: Results announced."; "September 26, 2016: Results announced."; "Jul 17, 2017: Results announced." and "Jul 26, 2017: We are passing the baton to Kaggle."
- Human: Russakovsky et al. (arXiv 1409.0575), Table 9 and text: "The human error was estimated to be 5.1%." Table 9 is "Human classification results on the ILSVRC2012-2014 classification test set" over 1,500 images.
- 2010 and 2011 used different test data from 2012 on, so they are separate series.

## GLUE and SuperGLUE
- GLUE v1 (arXiv 1804.07461v1, 20 Apr 2018), Table 5: "BiLSTM +ELMo 60.3" (single-task, best average). v3 (22 Feb 2019), Table 4: "+Attn, ELMo 70.0" (multi-task), footnote 3: "An earlier release of QNLI had an artifact where the task could be modeled and solved as an easier task than we describe here. We have since released an updated version of QNLI that removes this possibility."
- Human: Nangia and Bowman (1905.10425): "annotators robustly outperform the state of the art on six of the nine GLUE tasks and achieve an average score of 87.1."
- BERT (1810.04805): "On the official GLUE leaderboard, BERTLARGE obtains a score of 80.5, compared to OpenAI GPT, which obtains 72.8 as of the date of writing."
- MT-DNN-KD (1904.09482), Table 2: "MT-DNNKD ... 83.7", "Human Performance ... 87.1"; caption: "All the results are obtained from https://gluebenchmark.com/leaderboard on April 1, 2019." and "- denotes the missed result of the latest GLUE version."
- RoBERTa (1907.11692): "our model achieves a score of 88.5 on the public GLUE leaderboard, matching the 88.4 reported by Yang et al. (2019)."
- ALBERT (1909.11942): "the GLUE benchmark to 89.4".
- T5 (1910.10683): "We achieved a state-of-the-art average GLUE score of 90.3." and "For SuperGLUE, we improved upon the state-of-the-art by a large margin (from an average score of 84.6 (Liu et al., 2019c) to 88.9)... We nearly match the human performance of 89.8".
- SuperGLUE (1905.00537), Table 2: "BERT++ 71.5 ... Human (est.) 89.8".
- DeBERTa (2006.03654): "surpass the human performance on the SuperGLUE benchmark ... for the first time in terms of macro-average score (89.9 versus 89.8), and the ensemble DeBERTa model sits atop the SuperGLUE leaderboard as of January 6, 2021, outperforming the human baseline by a decent margin (90.3 versus 89.8)."
- ERNIE 3.0 (2107.02137): "achieves the first place on the SuperGLUE benchmark (July 3, 2021), surpassing the human performance by +0.8% (90.6% vs. 89.8%)."

## HellaSwag
- Zellers et al. (1905.07830), Table 1: "BERT-Large 46.7 47.3 ... Human 95.7 95.6"; text: "the resulting dataset of 70k problems is easy for humans (95.6% accuracy)".
- Later points: Epoch AI hub rows (lab and paper reports; mixed shots, mostly validation set) and Stanford HELM Classic rows (0-shot). GPT-4 95.3% (10-shot) is in the GPT-4 report's Table 2.

## MMLU
- Hendrycks et al. (2009.03300): "the 175 billion parameter GPT-3 model reaches a much higher 43.9% accuracy"; "we then estimate that expert-level accuracy is approximately 89.8%".
- Gopher (2112.11446), Table 5: "Gopher 5-shot 60.0%". Chinchilla (2203.15556): "Chinchilla reaches a state-of-the-art average accuracy of 67.5% on the MMLU benchmark". Flan-PaLM (2210.11416): "75.2% on five-shot MMLU", and "leverage CoT and self-consistency ... to achieve 75.2%". GPT-4 report Table 2: "MMLU [49] 86.4% ... 5-shot". OpenAI o1 page table row: "MMLU | pass@1 | 88.0 | 90.8 | 92.3" (GPT-4o, o1-preview, o1).
- HELM Lite 5-shot rows from the Epoch AI hub (Source "Stanford CRFM Leaderboard").

## GSM8K
- Cobbe et al. (2110.14168): "A bright middle school student should be able to solve every problem." (no human score).
- PaLM (2204.02311): "Using 8-shot chain-of-thought prompting in combination with an external calculator, PaLM 540B achieves a performance of 58%, which outperforms the prior SOTA of 55% from Cobbe et al. (2021)".
- GPT-4 report Table 2: "GSM-8K [60] 92.0%∗ ... 5-shot chain-of-thought"; the asterisk notes that part of the GSM8K training set was mixed into GPT-4's training.
- OpenAI o1 page: "Recent frontier models do so well on MATH and GSM8K that these benchmarks are no longer effective at differentiating models."

## MATH
- Hendrycks et al. (2103.03874): "large language models achieved accuracies ranging from 3.0% to 6.9%"; "a computer science PhD student who does not especially like mathematics attained approximately 40% on MATH, while a three-time IMO gold medalist attained 90%".
- Minerva (2206.14858), Table 3: "Minerva 540B 33.6% ... Minerva 540B, maj1@k 50.3% ... Published SOTA 6.9%".
- GPT-4: 42.5% (4-shot), GPT-4 report Table 2.
- OpenAI o1 page: "MATH | pass@1 | 60.3 | 85.5 | 94.8"; footnote 2: "Our evaluations used the same 500 problem test split found in https://arxiv.org/abs/2305.20050".
- MATH Level 5: Epoch AI runs.

## HumanEval
- Codex (2107.03374): "our model solves 28.8% of the problems, while GPT-3 solves 0% and GPT-J solves 11.4%"; "Using this method, we solve 70.2% of our problems with 100 samples per problem."
- GPT-4 report Table 2: "HumanEval [43] 67.0% ... 0-shot".
- EvalPlus base HumanEval: "GPT-4 (May 2023)" 88.4, "GPT-4-Turbo (April 2024)" 90.2, "GPT 4o (Aug 2024)" 92.7, "O1 Preview (Sept 2024)" 96.3. Dates: the month in EvalPlus's name (GPT-4 dated mid-May 2023, labelled as assumed); GPT-4-Turbo, GPT-4o and o1-preview matched to their API versions' release dates.
- Not used: Claude 3.5 Sonnet's 92.0% and Claude 3 Opus's 95.0% GSM8K are in images on Anthropic's pages, not in the text.

## GPQA Diamond
- Rein et al. (2311.12022), Table 2: "GPQA Diamond 198 81.3* 22.1* 97.0"; caption: "Validator accuracies on the main and diamond sets are biased" (selection depends on them). Table 5: "Few-Shot CoT GPT-4 38.7 39.7 38.8" (extended, main, diamond).
- Epoch AI GPQA page: "To compare their o1 model to humans, OpenAI recruited PhD-level experts to answer questions in GPQA Diamond, and found that they scored 69.7%." Also: "This strict scoring can potentially result in models achieving lower accuracy than randomly guessing".

## SWE-bench Verified
- OpenAI (13 Aug 2024): "On SWE-bench Verified, GPT-4o resolves 33.2% of samples, with the best performing open-source scaffold, Agentless, doubling its previous score of 16% on SWE-bench."; "the 500 samples that constitute SWE-bench Verified".
- Epoch AI: "Epoch evaluations of this benchmark use 484 samples that are validated on our infrastructure."; "we have previously estimated an error rate of 5-10%."

## ARC-AGI
- Chollet (1911.01547): dated November 5, 2019.
- ARC Prize, Announcing ARC-AGI-2 (24 Mar 2025): "Human panel (average) 64.2%" (ARC-AGI-1) and "60%" (ARC-AGI-2); "Human panel (at least 2 humans) 98%" and "100%"; "o3-preview-low (CoT + Search/Synthesis) 75.7%" and "4%"; "gpt-4.5 (Pure LLM) 10.3%" and "0.0%".
- ARC-AGI-3: ARC Prize blog index lists "03.25.26 - Announcing ARC-AGI-3". OfficeChai (26 Mar 2026) says "released ARC-AGI-3 on March 24, 2026" and "humans solve 100% of the environments", best model 0.37%. The ARC Prize date is used.
- GPT-6 Astra results page: "best observed ARC-AGI-3 Semi-Private result with the Standard harness ... was 62.7% at max reasoning for $26,098. With the Provider Adapter harness ... its best observed result was 99.9% at high reasoning for $18,817."
- Left out: Kaggle systems (type "Custom"): the file dates Icecuber to 2023-11-03 and NVARC to 2024-11-03, neither of which is when the system first appeared.

## Humanity's Last Exam
- Phan et al., arXiv v1 (24 Jan 2025), Table 1: "O1 9.1 ... D EEP S EEK -R1∗ 9.4"; "∗ Model is not multi-modal, evaluated on text-only subset."
- Later rows: Epoch AI hub external file (no per-row source column).

## FrontierMath
- Glazer et al. (2411.04872v1, 7 Nov 2024): "Current state-of-the-art AI models solve under 2% of problems".
- Epoch metadata: FrontierMath-2025-02-28-Private superseded by Tiers-1-3-v2 (2026-06-12); Tier-4-2025-07-01 (2025-07-11) superseded by Tier-4-v2 (2026-06-12).

## OSWorld
- Xie et al. (2404.07972): "While humans can accomplish over 72.36% of the tasks, the best model achieves only 12.24% success".
- Anthropic (22 Oct 2024): "Claude 3.5 Sonnet scored 14.9% in the screenshot-only category ... When afforded more steps to complete the task, Claude scored 22.0%."
- OSWorld-Verified rows: Epoch AI hub (source "OS World Website"), 100-step entries only; Claude Opus 4.5 66.3% from Anthropic's announcement (step budget not stated). agi-0's 65.4% is a 50-step entry and is not in the 100-step series.
- OSWorld 2.0 (Epoch hub, osworld-v2.xlang.ai): best at launch (26 Jun 2026) among models public then: Claude Opus 4.8 20.6% binary accuracy with batched tools, 18.5% standard. Later Claude Opus 5 31.4% binary, 68.3% partial score.

## AIME
- 2025: AIME I on 6 Feb, AIME II on 12 Feb 2025 (search results quoting AoPS and MAA). 2026: "February 5, 2026 (AIME I) and ... February 11, 2026 (AIME II)" (pw.live via search). Launch = the AIME II date, when all 30 problems exist.
- Release dates of the MathArena models come from the Epoch AI model metadata (o3-mini 2025-01-31, o4-mini 2025-04-16, Grok 4 2025-07-09, GLM-4.5 2025-08-03, GPT-5 2025-08-07, GPT-5.2 2025-12-11, Gemini 3 Pro 2025-11-18, Gemini 3.1 Pro 2026-02-19, GPT-5.4 2026-03-05, GPT-5.5 2026-04-23).

## Terminal-Bench family
- Blog index (tbench.ai/news): "Terminal-Bench 2.0 and Harbor Fri Nov 07 2025", "Terminal-Bench 2.1 Wed May 06 2026", "Terminal-Bench 3.0 Thu Jul 30 2026", "TERMINAL-BENCH-SCIENCE 0.1 Thu Aug 27 2026", "Terminal-Bench 4.0 Fri Aug 28 2026"; 1.0 on "Mon May 19 2025" with "As of launch we've created 80 tasks".
- GitHub releases of harbor-framework/terminal-bench: v3.0.0 2026-07-23T07:04Z, v4.0.0 2026-08-26T04:48Z. terminal-bench-science v0.1.0: 2026-08-26T10:24Z. The orchestrator's reconciled dates (TBS launch 27 Aug, TB 3.0 23 Jul, TB 4.0 26 Aug) are used.
- 2.1: "We're releasing Terminal-Bench 2.1 to fix issues in 28 of the 89 tasks in Terminal-Bench 2.0."; "Opus 4.6 (Claude Code) 58.0% 70.1% +12.1%".
- 3.0: "Our first release contains 74 tasks across 7 domains. The best models achieve ~34% on Terminal-Bench 3.0."; chart "GPT-5.6 Sol (Codex) 34.4% Fable 5 (Claude Code) 33.8%"; "Many Terminal-Bench tasks have become saturated".
- 4.0: "We removed 8 tasks: for saturation (2), refusals (2), public solutions (2), and unresolved quality or platform-compatibility issues (2). We considered a task "saturated" when all classes within all families of the latest generation of models solve it 5/5 times."; "We fixed 19 tasks"; "In the short term, this might be confusing as the community is used to major version updates being "sequels"."
- Terminal-Bench-Science 0.1 announcement: "Claude Opus 5 with Claude Code achieves the highest resolution rate at 30.0%", then GPT-5.6 Sol with Codex 22.4%, Claude Fable 5 with Claude Code 21.4%; 70 tasks.
- Anthropic, Claude Fable and Mythos 5.1: "Terminal-Bench-Science 0.1 from 24.7% to 52.6%". Anthropic, Opus 5.5 system card: "Astra ahead at 64.6% against Opus 5.5's 58.7%, with Opus 5 at 29.0%". Google's Gemini 4 Argon table (image, transcribed for Topic: llms): Astra 68.1, Fable 5.1 52.6, Opus 5.5 63.3.
- Terminal-Bench 2.0 rows: Epoch AI hub (leaderboard copies, with run dates and agents).

## Corrections to the old page
- "52.6% a week later (Claude Fable 5.1)": the figure is Anthropic's own; Fable 5.1 was public 5 days after launch; Artificial Analysis measured it at 43.3%.
- "64.6% for GPT-6 Astra ... 34.6 points of headroom in roughly seven weeks": 64.6% is Anthropic's figure, published 22 Sep (26 days after launch); Artificial Analysis measured 63.3% for Astra, public 3 Sep (7 days after launch).
- AIME "each vintage saturates within ~1 yr": AIME 2026 was at 98.3% on the day it existed (GPT-5.2, public two months earlier); AIME 2025 started at 86.7% and reached 100% after 10 months.
- "ARC-AGI-2 went ~4% to ~85%+ in about a year" holds: 4% at launch (24 Mar 2025), 84.6% on 12 Feb 2026 (Gemini 3 Deep Think), 95% on 2 Sep 2026.
- OSWorld 2.0 "Claude Opus 5 74.0%": the OSWorld 2.0 leaderboard copy in the Epoch hub gives Opus 5 31.4% binary accuracy and 68.3% partial score; the 74.0% matches neither (metric or version unconfirmed).
