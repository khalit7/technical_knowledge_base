# Benchmark methodology: depth kept for a future child page

The old "Benchmark methodology" page (Notion 3c65c17b0d0d8143abd0e126338fb9dd, verbatim in `../live_methodology.md`) is folded into the root's Reading tab at overview level. This file keeps the depth the root does not hold, for a future child (a "Benchmark methodology" or "Human preference" child, or the evaluation topic), with the corrections found while folding it. Nothing here is lost: the verbatim source stays in `live_methodology.md`.

## Metrics, including the legacy ones
- Scoring metrics in use: accuracy, precision / recall / F1, exact match, pass@k, ROUGE and BLEU (legacy generation), perplexity (legacy language-model quality), Elo (preference), judge score, task success rate, pass^k (reliability).
- A child could explain each with one worked example, and the unbiased pass@k estimator from the Codex paper (arXiv 2107.03374).

## Protocol drift in detail
- Few-shot in the base-model era taught the format (MMLU 5-shot); instruct era: zero-shot chain of thought; OpenAI noted few-shot prompts degraded o1 on GPQA.
- Extraction: regex on "The answer is (X)" against log-probabilities over the options; lm-eval-harness, HELM and vendor harnesses legitimately disagree by points.
- Reasoning models: token budget and effort level (a model at high effort is a different system); tools (old page: HLE with and without search differ by 10 to 20 points; **corrected** by the Same model tab: 3.3 points for Opus 5.5 and 7.0 for Opus 5 in Anthropic's runs).

## Sampling, in depth
- Anthropic's "Adding error bars to evals": questions as a sample from a population, CLT-based confidence intervals, clustered standard errors for related questions, paired tests on shared items, power analysis. A child page could build a paired-test widget on real per-item results (the root has only the unpaired binomial widget).
- pass@1 vs maj@32 on AIME: a child could show it on real per-problem solve rates (MathArena publishes per-problem results).

## Contamination detection, in depth
- N-gram / substring overlap with the pretraining corpus (weak against paraphrase); perplexity or completion tests (verbatim completion from a prefix); fresh parallel sets (GSM1k: drops up to 13% for some families; GSM-Symbolic templating); temporal splits (SWE-rebench).
- Defence ladder: enclave evaluation (DeepMind pilot, Aug 2026, Gemini Flash Lite, Google Cloud Confidential Space; caveats: small model, Google's own enclave, does nothing about original public sources leaking into crawls) > private sets with an evaluation API (FrontierMath, HLE private split, SWE-bench Pro commercial split) > rolling live data pinned to dates (LiveCodeBench, MathArena, SWE-rebench) > canary strings (BIG-bench GUIDs, respected only by cooperating labs) > perturbation / templating > trust.

## Lifecycle numbers to verify and correct
- Old page: "MMLU 2020: ~32%" at launch. **Corrected**: the MMLU paper's largest GPT-3 scores 43.9% few-shot (about 20 points above chance); 32% is not the frontier figure.
- "ARC-AGI-2 went ~4% to ~85%+ in about a year"; "Terminal-Bench 1.0 lasted months": dated points belong to the Saturation timeline tab.
- "Terminal-Bench-Science 0.1 ... 52.6% one week later": **corrected** to five days (27 Aug to 1 Sep 2026, Fable 5.1's release); Artificial Analysis measured Fable 5.1 at 43.3%.

## Arenas, in depth (for a Human preference child)
- LMArena: anonymous pairwise battles, Bradley-Terry ratings; Arena-Hard distils hard arena prompts into an offline judge-graded proxy.
- The Leaderboard Illusion (arXiv 2504.20879): undisclosed private testing (Meta tested 27 Llama 4 variants pre-release, best-of-N retracted at will), unequal sampling rates favouring large proprietary labs, silent deprecation of open models, and arena data-access advantages (arena-vote data measurably trains models to win the arena). LMArena disputed parts (notably the open-model data-share calculation) and tightened its policy on variant testing (arena.ai/blog/our-response).
- Preference is not capability: votes reward confident, well-formatted, sycophantic answers; style-controlled ratings reorder the board; the 2025 GPT-4o sycophancy rollback.

## Gaming, in depth
- METR (5 Jun 2025): o3 reward-hacked in 39 of 128 RE-Bench runs (30.4%), 0.7% on HCAST, and in every trajectory of one RE-Bench task.
- Berkeley RDI (Apr 2026): FieldWorkArena scored message-sent, not answers; OSWorld gold answers on Hugging Face; GAIA answers public; BenchJack follow-up audits.

## Private vs public splits
- Hybrid best practice: public dev + private held-out (HLE, ARC-AGI semi-private, SWE-bench Pro), the private split measuring public-split overfitting; independent re-runners (Epoch, HAL, Artificial Analysis) as auditors; private in-house suites (a domain suite beside capability and safety axes).
