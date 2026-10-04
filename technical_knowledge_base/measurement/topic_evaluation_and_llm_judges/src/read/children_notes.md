# Notes on the four old child pages (fetched read only, 2026-10-04)

Facts the Reading tab leans on or links to. Old pages are the floor; corrected facts from paper pages override them.

## LLM-as-judge: design, biases, calibration, reliability (3c65c17b0d0d810ba2a2ecc08c4c233b; 11 min read, +9h 35m resources)
- Three modes. Pointwise: absolute scale, drifts (a 7/10 today is not a 7/10 next month); prefer binary or 1-3 anchored levels over 1-10 (noise past about 4 levels). Pairwise: higher human agreement on open-ended quality; position bias (run both orders), tie inflation, O(n^2) to rank many. Rubric/reference-guided: most reliable where references exist, localises which criterion failed; decomposed per-criterion binary checks beat one holistic score.
- Defaults: reason then score, structured verdict, temperature 0, pin judge model and prompt version, log rationale.
- Biases: position (judge choice matters more than task), verbosity (fix: AlpacaEval 2.0 LC or rubric penalty), self-preference (Panickssery et al. arXiv:2404.13076: linear relation between self-recognition and self-preference), sycophancy/authority, format exploitation (null model: 86.5% LC win rate on AlpacaEval 2.0, 83.0 on Arena-Hard-Auto, arXiv:2410.07137), truncation blindness (assert finish_reason == stop; infra bucket).
- Cohere North Small Translate example: 83.6 WMT26 (50 languages), agentic 84.36, DeepL NextGen 81.37, Google Translate 68.20, judge GPT-5.6 Sol (vendor measurements).
- RocketEval: checklist 5 to 10 binary questions; P(Yes)/(P(Yes)+P(No)); Qwen2-1.5B 36.4% CoT vs 40.1% direct, 70.3% with GPT-4o analysis; $27.70 Gemma-2-2B vs $3,400 GPT-4o for 1,000 WildBench tests; Spearman with Arena Elo 0.965 vs 0.979 (Mistral-Nemo 0.986); instance agreement 57.9% vs 66.6% vs 64.7% human ceiling. (Check against the paper page.)
- Calibration: Critique Shadowing (Hamel Husain); report Cohen's kappa not raw accuracy; inter-annotator 75 to 85% on open-ended tasks; TPR/FPR correction (arXiv:2511.21140); reliability vs validity (arXiv:2606.19544: self-consistent yet systematically wrong).
- Juries: PoLL (arXiv:2404.18796) beats single GPT-4 judge at about 7 to 8x lower cost; RoPoLL (arXiv:2606.30931) geometric median; escalation cheap jury, frontier judge, human.
- Meta-evals: JudgeBench (arXiv:2410.12784; corrected 2026-10-04 against the paper, the old page's "about 64%" for the best frontier judges was stale): with the Arena-Hard judge prompt GPT-4o scores 56.57%, o3-mini (high) 80.9% (v2 Table 2); multi-agent debate does not buy points there: ChatEval (GPT-4o) scores 34.0% against 56.57% for single GPT-4o (v2 Table 1; src/judges/inputs/judgebench_v2_T1.tsv); RewardBench 2 (arXiv:2506.01937).
- Fine-tuned judges (Prometheus 2, Glider, Selene, JudgeLM), reward models, agent-as-judge.
- Operational checklist of 7 items.

## Eval harnesses (3c65c17b0d0d81ea9cd5eb65795ff5c9; 13 min read, +5h 20m resources)
- lm-evaluation-harness: YAML tasks, LM interface loglikelihood / loglikelihood_rolling / generate_until; backend of the archived Open LLM Leaderboard v1/v2. Loglikelihood: argmax over options (acc_norm), deterministic, base models, API models without logprobs cannot run them. generate_until: regex extraction, every regex a potential bug ("model X dropped 20 points"). MCQA moving from loglikelihood to generative CoT; never compare across formats. --apply_chat_template, few-shot formatting change scores.
- Inspect (UK AISI): Task = dataset + solver + scorer; sandboxes (Docker, k8s, Proxmox); inspect view transcripts; used by AISIs, METR, Apollo. inspect_evals contribution path.
- HELM: seven metrics (accuracy, calibration, robustness, fairness, bias, toxicity, efficiency); claimed "maintenance mode 2026-06-01" (to verify).
- lighteval: 1000+ tasks, nanotron, HF hub.
- promptfoo (OSS, YAML, red-teaming), Braintrust (commercial, Eval() SDK, online scoring). Alternatives Langfuse, Phoenix, Weave.
- Enclave evaluation costs debuggability: no transcripts, so a bad score cannot be attributed between capability, broken extraction filter, truncation.
- Boundary rule: model-level harness = "is this checkpoint good"; app-level = "is this system change safe to ship".

## Production eval engineering (3c65c17b0d0d81b39ad9e96193d21adc; 11 min read, +4h 35m resources)
- Promotion path: offline gate on frozen golden sets, cost/latency gate, shadow deployment, canary/A-B with auto-rollback; champion/challenger.
- Golden sets 100 to 500 items per surface; every incident becomes a test; refresh; version.
- Offline vs online divergence is an alarm on the offline set.
- Statistics (Miller, arXiv:2411.00640): SEM = s/sqrt(n); n=100 at p=0.7 gives SEM about 4.6 points; n=1000 gives 1.4. Paired tests (McNemar), K resamples, clustered SEs, multiple comparisons. Worked example: 78% on 300 items, unpaired SE of difference 3.4 points.
- Gold-label auditing: MMLU-Redux about 6.5% of items with an error of some kind (virology 57%), GSM8K about 5%, PlatinumBench. Three fallible components (model, judge, gold): attribute every delta before acting.

## Guardrails (3c65c17b0d0d819bbfa5dffa9246c297; 12 min read, +2h 25m resources)
- Pre-call, during-call, post-call rails; guard models (Llama Guard 3/4, Prompt Guard 2, Granite Guardian, Qwen3Guard, ShieldGemma, WildGuard, Aegis); NeMo Guardrails, Guardrails AI, LLM Guard, cloud-managed.
- Evaluate guardrails as classifiers; conformal risk control (CRC Monitor) for thresholds.
- MOLE claim on this page ("stated refusal did not predict", "72% of 39") overstated: corrected reading in coverage.md.
