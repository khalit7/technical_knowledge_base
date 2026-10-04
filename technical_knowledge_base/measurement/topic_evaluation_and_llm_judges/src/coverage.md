# Coverage of the old root page (src/live.md, fetched 2026-10-04, last edited 2026-09-23)

Every fact of the old written page, where the new page carries it, and corrections. "Reading" sections: rd-one (in one screen), rd-who (who grades), rd-cal (calibration), rd-stat (statistics), rd-fail (how it breaks), rd-choose (choosing). Data tabs: t-bias (Judge bias lab), t-harness (Same model, many harnesses), t-judges (Judge atlas); t-more is Further reading.

## Page furniture
| Old fact | Where now |
|---|---|
| Video: 7-minute narrated explainer, "an eval is a measuring instrument, and nobody calibrates theirs" (`<video>` tag) | Stays on the Notion page (not text); the new spine uses the same idea. Whether to keep the video is Khalid's call (it describes the old page). |
| "9 min read, +1h resources" | Replaced by the new reading time (Reading tab intro) and per-link times in t-more. |
| Scope line: methodology and tooling for evaluating LLMs and LLM-powered systems; datasets live in Topic: benchmarks | Header subtitle and rd-one intro, with the boundary to Topic: benchmarks linked. |
| Four `<page>` tags (Eval harnesses, Guardrails, LLM-as-judge, Production eval engineering) | Stay as child-page tags; each linked from its section's Go deeper note and from t-more with reading time. |

## Mermaid map of the space
| Node | Where now |
|---|---|
| Eval types: static benchmarks (loglikelihood / exact match), LLM-as-judge (pointwise / pairwise / rubric), human eval (expert gold, Arena-style preference), online A/B and shadow, regression gates (golden sets in CI) | rd-one, the five layers (cards in cost order) |
| Harnesses: lm-evaluation-harness, Inspect (AISI, agentic, sandboxed), lighteval, HELM maintenance mode, promptfoo / Braintrust | rd-choose table; HELM maintenance verified (below); depth: Eval harnesses child, t-harness |
| Judge patterns: single judge + rubric, juries / PoLL, reward models, agent-as-judge, meta-evals JudgeBench and RewardBench 2 | rd-who (modes, juries, reward models and agent-as-judge one line each); meta-evals in rd-cal and t-judges |
| Production engineering: golden sets and promotion paths, offline vs online, paired tests and power analysis, gold-label auditing | rd-one (regression gates and online layers), rd-stat, rd-fail (gold labels); depth: Production child |
| Guardrails: pre-call, during-call, post-call rails | rd-one (a runtime eval note) and t-more (Guardrails child) |
| Failure modes: judge biases (position, verbosity, self-preference), judge exploitation (null models, format tricks), truncation and plumbing bugs, contamination, gold-label noise | rd-fail, one subsection each |

The map itself is replaced by the five-layer cards and the section nav: the mermaid diagram was a table of contents.

## Map of the space (bullets)
| Old fact | Where now / correction |
|---|---|
| Five layers cheapest to most faithful; mature stacks run all five; each catches what the previous cannot | rd-one, with what each layer catches that the previous one cannot |
| Harnesses all run a dataset through a model and score it; differ in unit of work: declarative task (lm-eval-harness, reproducibility standard for model-card numbers), program with a sandbox (Inspect: AISIs, METR, Apollo; default for agentic or safety-facing), pretraining loop (lighteval), seven metrics (HELM), application config (promptfoo, Braintrust) | rd-choose table |
| HELM "in maintenance mode since June 2026: read it, do not build on it" | Verified: the HELM README says "HELM entered maintenance mode on June 1, 2026" (`read/inputs/helm_readme_maintenance_20261004.txt`) and its Maintenance Mode Policy (no new evaluations on the leaderboards; alternatives Inspect Evals, lighteval, lm-eval-harness, Evalchemy, Unitxt). Kept in rd-choose with both links. |
| Dividing question: "is this checkpoint good" vs "is this prompt, retrieval and tool configuration safe to ship" | rd-choose (lead) |
| Loglikelihood vs generative fault line; scores from different harnesses not comparable whatever the benchmark is called | rd-who, with a real case added: LLaMA-65B MMLU 0.637 (HELM), 0.488 (Harness, Jan 2023), 0.636 (original), Hugging Face, 23 June 2023; depth t-harness and the Harness child |
| Judge is a measurement instrument that happens to be a model; grading mode fixes bias profile: pointwise drifts; pairwise O(n^2) and position bias; rubric/reference-guided most reliable where references exist and localises the failed criterion | rd-who, with the grading-mode animation on MT-Bench's published counts (Tables 2 and 4) |
| Juries (PoLL) of small judges from different families beat one large judge on cost and human agreement | rd-who, with source numbers (kappa 0.763 vs GPT-4's 0.627 on KILT-NQ; "over seven times less expensive"). Scope added: measured on QA answer-correctness with references and Arena-Hard, not every task |
| Meta-evals (JudgeBench, RewardBench 2) are how you choose | rd-cal, last paragraph; t-judges |
| Judge choice is an empirical per-task decision calibrated against a human gold slice, never a default | rd-cal lead |
| Calibration: no judge number means anything until checked against human labels; ceiling is inter-annotator agreement, not 100% | rd-cal, chart of MT-Bench Table 5 |
| "on open-ended tasks two humans agree 75 to 85% of the time" | Corrected with a source: on MT-Bench, two expert humans agree 81% on non-tie votes and 63% when ties count (random 50% and 33%); GPT-4 pairwise agrees with humans 85% and 66% (Zheng et al. 2023, Table 5, first turn). The physics re-grading's PhD reviewers agreed on 140 of 196 double-reviewed cases (71.4%). The range depends on whether ties count. |
| A judge at 80% with your expert may be at ceiling | rd-cal |
| Self-consistency certifies nothing: reproducible and systematically wrong at once | rd-cal, now sourced: arXiv:2606.19544 (test-retest above 0.95 alongside position bias above 0.10 in two production judges; kappa 33 to 41 points below raw agreement on MT-Bench) |
| Gold slice, Cohen's kappa, TPR/FPR correction (linked to the judge child) | rd-cal: kappa formula with a worked always-pass example; TPR/FPR correction one sentence with arXiv:2511.21140; depth on the LLM-as-judge child |
| Failure modes: position, verbosity, self-preference; format exploitation; sycophancy toward confident phrasing; truncated completion scored as content failure; contaminated or mislabelled gold | rd-fail, with MT-Bench numbers (position 65.0 / 23.8 / 46.2% consistency; repetitive-list attack 8.7% GPT-4 vs 91.3%; self-enhancement GPT-4 +10%, Claude-v1 +25%, now quoted with Zheng's own caveat that the study "cannot determine" whether it is self-enhancement, beside t-bias's recount of +13.0 and +10.5 points and Panickssery et al.; position consistency 65.0% flagged as the near-identical hardest case, with t-bias's 83.6% on released leaderboard judgments) and null-model numbers (86.5% LC AlpacaEval 2.0, 83.0 Arena-Hard-Auto, 9.55 MT-Bench); depth t-bias |
| Most "model regressions" are eval bugs first; attribute every delta to model, judge or gold | rd-fail lead and the attribution animation (physics re-grading, 250 rejections: 143 benchmark errors, 95 grader errors, 12 model errors) |
| MOLE: "a model's stated refusal did not predict whether it actually declined" | Corrected (overstates the paper): 28 of 39 models completed most harmful objectives under a preamble saying the sandbox is harmless; refusal and completion rates correlate across models (Spearman -0.73); the best monitor (Claude Opus 4.7) caught 24 of 45 completed harms. Point kept: in agentic systems grade the actions, not the response string. rd-fail, linked to the MOLE paper page and Guardrails child. |
| Contamination handled by contract, attacked by the enclave pilot | rd-fail, contamination: one line plus link to Topic: benchmarks |

## Double-blind evaluation section
| Old fact | Where now |
|---|---|
| Google DeepMind, Aug 2026, with Singapore AISI, OpenMined, AVERI, MLCommons; Confidential Space enclave; lab never sees prompts, evaluator never sees weights; Gemini Flash Lite; blog publishes mechanism not scores | Owned by Topic: benchmarks (Reading, "What a number leaves out", contamination paragraph). Here: one line plus link in rd-fail, and the DeepMind blog in t-more. |
| Why it matters: non-contamination as a property of the execution environment; reusable private benchmark | Topic: benchmarks; one-line summary here |
| Caveats: small model pilot; Google's own enclave when Google is evaluated; does nothing about the crawl leak | Topic: benchmarks |
| Costs debuggability: nobody can read transcripts | Kept here in one clause (it is a harness property): rd-fail contamination line; Harness child owns depth |
| Stands with the SWE-Bench Pro audit as two 2026 attempts to make integrity checkable | Topic: benchmarks (Coding child owns SWE-bench Pro) |

## Checklist grading makes small judges viable (RocketEval)
Facts from the RocketEval paper page (verified 2026-10-03) override the old text.
| Old fact | Where now / correction |
|---|---|
| RocketEval, ICLR 2025, arXiv:2503.05142; small judges fail because they cannot hold a comprehensive analysis of a long response in one pass | rd-who (rubric mode) |
| Frontier model compiles each query once into 5 to 10 binary checklist questions; small judge answers each independently | rd-who. Correction: the released checklists hold 3 to 25 questions, not 5 to 10 |
| Moves judge scoring from quarterly sweep to per-merge gate | rd-choose |
| Debiases by construction: no item graded in sight of the others, so position and anchoring have no channel | rd-who |
| List-level only: small checklist judges rank a field almost right but are unreliable per response | rd-who and rd-choose: Gemma-2-2B Spearman 0.965 against Arena Elo vs GPT-4o 0.979 (one discordant pair of 66 more); single-verdict agreement 57.9% vs GPT-4o 66.6% and the 64.7% human-to-human level |
| "consistent with JudgeBench and RewardBench 2 putting even frontier judges at 60-70% on hard comparisons" | Corrected: JudgeBench v2 (Apr 2025) Table 2 has the Arena-Hard judge prompt at 56.6% with GPT-4o (random 50%) but 75.4% with o1-preview and 80.9% with o3-mini (high). The "60 to 70%" is stale for reasoning judges. rd-cal; the Judge atlas tab owns current figures. |
| Use for aggregate leaderboards, drift monitoring, distribution-level gates; never to adjudicate one item, gate one PR on one case, or generate preference labels | rd-choose |
| Prerequisite: checklist creation needs a frontier model to see every query (never the responses), cutting against the privacy argument | rd-choose |
| Costs, correlations, instance ceiling on the LLM-as-judge child | Go deeper notes link the RocketEval paper page and the child |

## Deep dives and Related
| Old fact | Where now |
|---|---|
| LLM-as-judge (11 min, +9h 35m): design, biases, calibration, ensembles, meta-evals, exploits | t-more, with what it covers |
| Eval harnesses (12 min, +5h 5m; the child page itself now says 13 min, +5h 20m): when to use which; contribution entry points | t-more (uses the child's own current times) |
| Production eval engineering (11 min, +4h 35m) | t-more |
| Guardrails (10 min, +2h 15m; the child itself now says 12 min, +2h 25m) | t-more (child's own times) |
| Related: Topic: benchmarks for the datasets | t-more, with its relevant tabs and children |
| Related: reward models and reward hacking, training-time mirror of judge exploitation (linked to Topic: llm-training-and-post-training) | rd-fail (one line) and t-more: Reward Hacking page, Topic: rl, Topic: llm-training-and-post-training |

## Corrections summary
1. Inter-annotator agreement "75 to 85%" replaced by sourced figures (63% with ties, 81% without, MT-Bench Table 5).
2. MOLE claim corrected as above.
3. JudgeBench "60 to 70% for frontier judges" stale: 80.9% for o3-mini (high) in JudgeBench v2.
4. RocketEval checklists: 3 to 25 questions in the released data, not 5 to 10.
5. HELM maintenance mode since 1 June 2026: confirmed, kept.
6. PoLL's advantage measured on QA correctness with references and Arena-Hard: scope stated.
