# Coverage of the old page's post-training half

Old page: "Synthetic data and post-training data" (Notion 3c65c17b0d0d8171b5d9e36e05b7a5d0, last edited 2026-09-22),
verbatim in the root's `src/read/old/04_synthetic_and_post_training.md`. Its synthetic-pretraining half, contamination
of synthetic sets and model collapse belong to the Synthetic data sibling (see its coverage.md). The post-training
sections were treated as unverified notes; every claim below was checked on 2026-10-15 (sources: notes/sources.md and
a second fact-check pass, quotes kept in the session report).

| Old claim | Verdict | Where now |
|---|---|---|
| Lineage Self-Instruct (2022) -> Alpaca (52k) -> Evol-Instruct/WizardLM -> UltraChat, OpenHermes-2.5 -> Magpie -> reasoning traces (OpenThoughts, OpenR1-Math-220k, s1K) | Verified; corrected: Alpaca was distilled from text-davinci-003 (old page: "GPT-3.5-distilled", loosely true, made exact) | Reading 2, lineage table (each with its paper or card) |
| LIMA: 1,000 hand-picked examples, superficial alignment hypothesis | Verified (Table 1 sums to 1,000; hypothesis quoted) | Reading 2 |
| Tulu 3 SFT about 940k across skills, deduplicated and decontaminated | Verified: 939,344 (Table 7), card metadata 939,343; composition measured from the full set | Reading 2 and 10 |
| Distillation from a strong teacher is the default; filter, dedup, decontaminate | Kept, with the terms of use and measured generator counts | Reading 3, 9 |
| SmolTalk is the open template for tiny chat models | Verified: 1M rows; 135M/360M used smol-smoltalk | Reading 2, 10 |
| Verify reasoning traces before training; s1K's 1k traces unlock test-time scaling | Verified (s1-32B "exceeds o1-preview on competition math by up to 27%"; budget forcing) | Reading 2, 4 (verification measured) |
| Human pairwise labels (HH) now rare; open standard is LLM-judged synthetic preferences; UltraFeedback 64k prompts, GPT-4 ratings | Verified; corrected: 63,967 prompts, four aspects (instruction following, truthfulness, honesty, helpfulness; old page listed three) | Reading 6 |
| On-policy beats off-policy | Verified, with size: Tulu 3 Figure 11, 60.0 off-policy vs 60.7 on-policy vs 61.2 combined (read from figure) | Reading 6 |
| Length bias in judged preferences; DPO amplifies it | Verified (Singhal et al. Table 5; Park et al. "twice as long") and measured on 8 sets | Reading 6, Pair inspector |
| RLVR = (prompt, verifier); math GSM8K, MATH, NuminaMath, DeepScaleR/DAPO-Math, Big-Math; math-verify | Verified with sizes | Reading 7 |
| Code: TACO, LiveCodeBench-style, KodCode with sandboxed tests | Verified (TACO 26,443; KodCode 447K); LiveCodeBench is an evaluation, dropped as a training pool | Reading 7; test strength measured |
| Precise IF: Tulu 3 built RLVR from GSM8K + MATH + constraints | Verified (Table 22) | Reading 7 |
| Guru ~92k verified prompts across six domains | Verified (arXiv 2506.14965) | Reading 7 |
| Agentic/SWE environments (SWE-Gym, R2E-style) | Verified; extended with SWE-rebench, SWE-smith, nebius trajectories, measured | Reading 8 |
| Difficulty filtering standard because GRPO gets zero gradient from all-same-reward groups | Verified; OLMo 3's cut measured in its data | Reading 7 |
| ToolGrad: 99.8% success across 16,000 APIs; Gemma 3 12B on 500 examples matched Gemini 2.5 Pro on unseen APIs | Corrected: 99.8% pass rate on ToolBench (16k+ APIs) vs 63.8%; 83.1 vs 83.2 on BFCL | Reading 8 |
| Terminal-Universe: 37,300 environments; +11.9 Terminal-Bench 2.1, +13.8 EvoCode-Bench v2 | Verified (paper: "37.3k task-sufficient environments"); the second gain kept in coverage only | Reading 8 |
| EnvHarness turns static corpora and applications into environments | Wrong: it wraps an existing static environment with plug-in components to reshape it, keeping its verifier | Reading 8, corrected |
| Repo-To-Skill / AREX-Skill: 5,000+ skills, 1,000 repos, 20 areas, 178 families; GPT-5.5 +134.3% MLE-bench, +34.4% PaperBench, +9.2% FrontierCS, +14.0% PassNet | Verified; relative gains (said) | Reading 8 (MLE-bench figure; others here) |
| Contamination of distilled and synthetic data; decontaminate with n-gram and embeddings | Kept and measured on 8 post-training sets with the Decontamination page's scanner | Reading 9 |
| Model collapse, accumulate vs replace, ToEdit | Owned by the Synthetic data sibling (ToEdit verified: ICML 2025) | Linked from Further reading |
| Small-model recipe (150-350M) | Kept as a suggestion, labelled as such | Reading 10 |
| Best resources: Tulu 3, LIMA | Kept | Further reading |
