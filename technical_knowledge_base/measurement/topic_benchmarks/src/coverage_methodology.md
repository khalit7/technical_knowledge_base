# Coverage of "Benchmark methodology: how benchmarks are used, misused, and die" (src/live_methodology.md), folded into the root

Notion 3c65c17b0d0d8143abd0e126338fb9dd, fetched 2026-10-04 (last edited 2026-09-24). Every fact is carried in the Reading tab at overview level (section id in brackets), in a data tab, or kept for a future child page in `for_children/methodology_depth.md` (nothing dropped). After publishing, the Notion page should be marked "TO DELETE: folded into Topic: benchmarks, Reading tab" and siblings that link it repointed (the three children and Topic: evaluation-and-llm-judges link it; their pages are not migrated yet).

| Fact | Where |
|---|---|
| 9 min read · +3h resources | Superseded (folded) |
| Resources: IBM primer, Leaderboard Illusion, LMArena response, Simon Willison summary, GSM1k, Anthropic error bars, BetterBench, Berkeley RDI | Further reading (Best resources), all with times |
| Basic protocol: sample data, testing (zero/few-shot, CoT, tools, effort, scaffold), scoring metrics list (accuracy, P/R/F1, exact match, pass@k, ROUGE/BLEU, perplexity, Elo, judge score, task success, pass^k) | Reading (rd-num opening); legacy metrics (P/R/F1, ROUGE/BLEU, perplexity) kept in methodology_depth.md; BLEU/chrF named in rd-fam Multilingual |
| Protocol tuple (dataset version, shots, CoT, tools, sampling, extraction, scaffold, judge) | Reading (rd-num tuple chips, plus who ran it and date) |
| Harness details link (Eval harnesses page) | Reading (rd-num deepnote) and Further reading |
| Few-shot in base-model era (MMLU 5-shot), zero-shot CoT in instruct era; few-shot hurt o1 on GPQA | Reading (rd-num, Shots) |
| Answer extraction (regex vs logprob) changes MMLU; harnesses disagree by points | Reading (rd-num, Answer extraction) |
| Reasoning models: token budget and effort make a different system; HLE with vs without search 10 to 20 points | Reading (rd-num tuple: effort; rd-how item 3); HLE: **corrected** by tab same to 3.3 (Opus 5.5) and 7.0 (Opus 5) points in Anthropic's runs |
| Sampling: temperature > 0 needs repeated runs; AIME single-run SE several points; 2-point SWE-bench delta on 500 within noise; Anthropic: questions as population sample, CLT CIs, paired tests | Reading (rd-num Sampling with widget; 7.3-point SE and ±4.0 derived and checked in read/recompute.py) |
| Inflation tricks: best-of-N, maj@k vs pass@1, with vs without tools | Reading (rd-num Sampling, last paragraph; rd-wrong) |
| Detection heuristics: n-gram overlap (weak vs paraphrase), completion tests, fresh parallel sets (GSM1k up to 13% drops; GSM-Symbolic), temporal splits (SWE-rebench) | Reading (rd-num Contamination); GSM-Symbolic in rd-fam Math |
| Enclave evaluation above all defences (piloted Aug 2026 on one small model; direction not a product) | Reading (rd-num Contamination: DeepMind, Gemini Flash Lite, from Topic: evaluation-and-llm-judges) |
| Defence ranking: private sets with API (FrontierMath, HLE private, SWE-bench Pro commercial) > live pinned (LiveCodeBench, MathArena, SWE-rebench) > canary strings (BIG-bench GUIDs, cooperating labs) > perturbation > trust | Reading (rd-num Contamination); "BIG-bench GUIDs" wording in depth file |
| Lifecycle: launch (MMLU 2020 ~32%; ARC-AGI-2 2025 ~4%) | Reading (rd-life). **Corrected**: MMLU launched with GPT-3 at 43.9% (paper); ~32% is not the frontier figure. ARC-AGI-2 ~4%: to verify in tab sat |
| Discriminative years 2 to 4, now often under 18 months (ARC-AGI-2 ~4% to ~85%+ in a year; TB 1.0 lasted months); TB-Science 30.0 to 52.6 in a week | Reading (rd-life: under 18 months, TB-Science corrected to five days); ARC-AGI-2 and TB 1.0: to verify in tab sat |
| AA v4.2 dropping GPQA as stage 5 in public; private 40% | Reading (rd-life) |
| Saturation (MMLU ~92%, SWE-bench Verified ~97%, GPQA ~96%), zombie phase, replacement chains (MMLU to Pro to GPQA to HLE; SWE-bench to Verified to Pro; ARC 1 to 2 to 3; static to live, static to interactive) | Reading (rd-life stages and replacement paragraph; animation uses o1's 92.3%); 97% and 96% in atlas/sat (to verify) |
| Implication: pin versions, rotate yearly, private regression set | Reading (rd-life, last paragraph) |
| Goodhart quote; training on the test; overfitting format (MCQ letters, arena verbosity, AlpacaEval LC) | Reading (rd-game) |
| Scaffold shopping; ARC-AGI-3 62.7 vs 99.9; Hyper-tau 23.9 vs 82.2; latent-state lesson | Reading (rd-game, rd-num Harness, rd-num Subject) |
| Reward hacking inside the eval (Berkeley RDI 8 benchmarks; METR o3 ~30%); evaluator isolation | Reading (rd-game; METR made precise: 39 of 128 RE-Bench runs, 30.4%, against 0.7% on HCAST) |
| Selective reporting | Reading (rd-game) |
| Private vs public: public dies by leakage, private unauditable, FrontierMath funding; hybrid (HLE, ARC semi-private, SWE-bench Pro) with private split measuring overfitting; independent re-runners (Epoch, HAL, AA) | Reading (rd-num Split) |
| Private in-house benchmarks stay discriminative | Reading (rd-game, last paragraph) |
| LMArena mechanics (pairwise, Bradley-Terry), Arena-Hard proxy, contamination-free, measures preference | Reading (rd-fam Human preference) |
| Leaderboard Illusion: private testing (Meta 27 Llama 4 variants), unequal sampling, silent deprecation of open models, data-access advantage; LMArena disputed parts and tightened policy | Reading (rd-game: private testing, 27 variants, response link); unequal sampling, deprecation, data access and the dispute: depth file (for a Human preference child) |
| Preference is not capability; style effects; GPT-4o sycophancy rollback 2025 | Reading (rd-fam Human preference) |
| Practical read: one noisy signal, category filters, style control | Reading (rd-fam, rd-wrong) |
| Misuse checklist (same protocol, error bars, version pinned incl. TB 2.x vs 4.0 and AIME year, saturated deltas, reproducibility discount) | Reading (rd-how checklist and rd-wrong) |
| Cross-links: evaluation-and-llm-judges, Reward Hacking | Further reading |

## Update after the child pages were built (4 October 2026)
- GSM1k: "up to 13% drops" is the paper's v1; v4 says up to 8% (Reading rd-num Contamination now says so).
- HLE with and without search: the tools effect is set-specific (3.3 to 7.0 points on full HLE in Anthropic's runs; 19.3 to 32.2 on HLE-Diamond in the maintainers'); tab same and atlas carry both.
- LMArena is now Arena (renamed 28 January 2026); Arena-Hard v2 is dormant, not an active proxy. Depth on the Human preference and arenas child.
