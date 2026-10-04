# Coverage of the old root page (src/live.md, fetched 2026-10-04, page last edited 2026-10-01)

Each fact of the old Topic: benchmarks page and where the HTML carries it. "Reading" means the Reading tab (section id in brackets); "atlas", "sat", "same" are the data tabs (Benchmark atlas, Saturation timeline, Same model, many numbers). "Carried by tab X" was checked against that tab's files (`data/atlas.json`, 93 rows, read 2026-10-04 10:15); "to verify in tab X" means the tab agent had not yet written that part when this file was made, and the assembler should confirm it. Corrections are marked **corrected**.

## Header, video, frontier list
| Fact | Where |
|---|---|
| Narrated 6-minute video, re-cut 23 Sep 2026, and its "does not cover" note | Not carried: Khalid will delete the video (task brief) |
| 20 min read · +4h 13m resources | Replaced by this page's own times (Reading about 18 min) |
| Anything above ~90% stops discriminating; most pre-2024 static benchmarks saturated, contaminated or both | Reading (rd-over, rd-life) |
| Active frontier list as of Sep 2026 (HLE, ARC-AGI-3, FrontierMath upper tiers, SWE-bench Pro, Terminal-Bench 4.0, Terminal-Bench-Science, Real-SWE, OSWorld-Verified, tau2-bench, live sets) | Reading (rd-fam "Active" lines, rd-how card list); atlas status column |

## "The active frontier, and what each one hides"
| Fact | Where |
|---|---|
| HLE: answer key is the ceiling, LLM judge part of the instrument; FutureHouse ~29% chem/bio contradicted; Scale ~18% expert disagreement; same-harness deltas mean more; search moves the number 10 to 20 points | Reading (rd-num Answer key: 29 ± 3.7% verified at FutureHouse, judge, deltas). Scale ~18% and tools 10 to 20 points: to verify in tab same (harness/tools spread) and atlas HLE row; full errata on the Knowledge and reasoning child |
| ARC-AGI-3: novel environments limit contamination, harness replaces it as confound | Reading (rd-num Harness, rd-fam Knowledge) |
| FrontierMath: programmatic checking, privacy, governance (OpenAI funding, late disclosure), quote Epoch's holdout; only 50-problem Tier 4 discriminates | Reading (rd-num Split: governance; rd-fam Math: Tier 4); atlas rows FrontierMath Tiers 1-3 and Tier 4 |
| SWE-bench Pro: scores model plus scaffold; public / standardised harness / vendor / private span 47 to 80% | Reading (rd-num Split, verified Opus 4.1 22.7 to 17.8 private drop added); 47 to 80 readings to verify in tab same |
| Terminal-Bench 4.0: version reset, recalibrated time/CPU/memory, not comparable with 2.x | Reading (rd-num Version), **corrected**: 3.0 exists (23 Jul 2026) and 4.0 was tagged 26 Aug 2026, not September; atlas row Terminal-Bench 4.0 (atlas has no 3.0 row: flagged to assembler) |
| Terminal-Bench-Science 0.1: deliberately unsaturated, sharpest measure of consumption speed | Reading (rd-life animation, now case) |
| OSWorld-Verified: ~300 broken tasks or checkers; plateau is a bug report until proven otherwise; headroom nearly gone; gold answers fetchable | Reading (rd-num Version: 300 broken; rd-game: gold answers fetchable); "plateau is a bug report" folded into Version paragraph wording "were flattening scores"; atlas OSWorld rows |
| tau2-bench: pass^k definition, pass^8 far below pass^1, simulated user is a model | Reading (rd-fam Agentic: pass^k); simulated-user caveat on the Agentic child and atlas tau2 row (to verify in atlas notes) |
| LiveCodeBench: release dates, recent windows saturating, contest problems narrow; LCB Pro answers the first | Reading (rd-fam Coding); atlas rows |
| AIME under MathArena: the protocol is the benchmark; vintage near-solved within a year; pass@1 vs maj@32; binomial error bar on 30 items | Reading (rd-num Sampling, with the error-bar widget; 7.3-point SE at 80% derived) |
| SWE-rebench: calendar decontamination; pre-cutoff repositories score better; monthly refresh cannot support time series; honesty check not headline | Reading (rd-num Contamination) |

## Taxonomy mindmap
| Fact | Where |
|---|---|
| Families: knowledge, math, coding, agentic, long context, reasoning, instruction following, human preference, safety, multimodal, multilingual, tool use, classic era, with members | Reading (rd-fam: ten families plus classic era; reasoning folded into Knowledge and reasoning; instruction following folded into Human preference and instruction following); atlas family filter |

## Master table (Status legend and 73 rows)
| Fact | Where |
|---|---|
| Status legend (active, saturating, saturated, contaminated, retired) | Reading (rd-life stages); atlas enums |
| Every row: year, measures, format/metric, status Sep 2026 | Carried by tab atlas (all rows present by name in `data/atlas.json`: MMLU through ImageNet, 93 rows) |
| Scores inside rows (GPQA Astra 96.0%, Muse Spark 1.3 94%; GDP.pdf Astra 33.2, Sol 28.2, Fable 5.1 26.2; HLE ~46% no-tools, 55 to 65% with tools; SWE-bench Verified ~97%; Pro ~59 to 80%; SWE-Bench Pro v2 ~23% public; TB 4.0 Opus 5.5 66.4, Astra 57.9, Fable 5.1 55.8, Opus 5 52.3, Grok 4.7 38.0; TB-Science 30.0 / 52.6 / 64.6 / Opus 5.5 58.7; Real-SWE Fable 5.1 38.8; Phi-Bench 36.53; OSWorld 2.0 Opus 5.5 81.8, Opus 5 74.0, Astra 72.6, Sol 60.5; Hyper-tau 23.9 vs 82.2; AutomationBench 1.0.6 Sol 33.2% $0.27, Opus 5 26.9%; Agents' Last Exam Sol 56.4%; GDPval-AA Opus 5.5 1846, Opus 5 1708, Astra 1542; Vals 54 vs 38.7; ARC-AGI-1 67 cents 44%; ARC-AGI-2 high-60s to low-90s; ARC-AGI-3 ~30% default, 95.5, 100, 62.7 vs 99.9; LMArena cluster ~1510 to 1525) | Dated scores: to verify in tab sat (frontier over time) and tab same (spreads); Reading carries GDP.pdf 33.2 (rd-fam Long context), GPQA 96.0 (rd-life), TB-Science 30.0/52.6/64.6/58.7 (rd-life), TB 4.0 Opus 5.5 66.4 and Grok 38.0 with AA's re-runs (rd-num Harness), Real-SWE 38.8 (rd-num Contamination), Phi-Bench 36.53 as mean reward (rd-num Subject), Hyper-tau (rd-num Subject), Vals (rd-num Harness), 67 cents (rd-num Harness), ARC-AGI-3 62.7/99.9/95.5 (rd-num Harness). **Corrected**: SWE-Bench Pro v2's "about 23% on the public set" is not supported by Scale's V2 blog or leaderboard (22 Sep 2026); the Reading tab does not repeat it; flagged to tab same/atlas |
| SWE-Bench Pro v2 failure shape (smaller models collapse on multi-file) | Atlas row SWE-Bench Pro v2 (to verify); not found in Scale's V2 blog, flagged |
| AutomationBench unversioned figures elsewhere in KB should not be quoted beside 1.0.6 | Atlas row AutomationBench (to verify); Reading mentions AutomationBench-AA only as the index component |

## "What a benchmark number conceals"
| Fact | Where |
|---|---|
| Harness-sensitive number without harness carries no information; ARC-AGI-3 read as 30% through mid-2026; Nvidia AVO 100% (21 Aug); Prime Agent 95.5% (24 Aug); StateM on Terminal-Bench 2.1 | Reading (rd-num Harness). **Corrected** with the Prime Agent page: 95.5% is the public set and best of three runs; "30% to 95.5%" is not like for like; Nvidia's set unconfirmed (Nvidia not repeated in Reading; to verify in tab same) |
| ARC Prize two labelled harnesses: Astra 62.7% for $26,098 standard, 99.9% for $18,817 Provider Adapter; adapter keeps opaque reasoning state, compacts conversations, 3.66x faster, 49% fewer tokens; different questions; neutral harness cannot reach latent capability; humans ~$12.78 per game | Reading (rd-num Harness: all but the dollar cents and the $12.78, which are in the ARC Prize link; exact costs to verify in tab same) |
| Cost axis five orders of magnitude: 67 cents, 1.5 h on one RTX 5090, 44% ARC-AGI-1, 7% ARC-AGI-2, matching TRM and HRM | Reading (rd-num Harness, 67 cents and 44%); details (RTX 5090, 7%, TRM/HRM) on the Knowledge and reasoning child and in Further reading's write-up link |
| Harness moves the bill more than the score: 21 pairs (7 models x 3 harnesses, Sep 2026); EdgeBench 51 tasks with cost per hour; SoL-Pi 44.7 to 49.0% fewer tokens at parity | Reading (rd-num Harness). **Corrected** with the SoL-Pi page: not "at parity", 2.5 to 2.8 points below baseline; EdgeBench has 134 tasks of which 51 are public |
| Retrieval: Astra for Law (17 Sep 2026) 54% vs 38.7% with web search, 40% relative, index of 230M+ URLs on CourtListener, 99.9% of US precedential case law | Reading (rd-num Harness: 54, 38.7, 230M index, 200-question set, significance derived 3.1 SE); CourtListener and 99.9% coverage in the TNW link; pointer to Topic: rag-and-retrieval in Further reading |
| SchrodingerRepo: four transformations; degrades performance and raises interaction cost; exploration and localisation dominant; 6 to 14 points attributed to aggregator; third sensitivity; SWE-rebench answers by calendar, this by construction; transforming keeps time series | Reading (rd-num Contamination). **Corrected** with the paper page: the paper itself states 6.0 to 14.4 points (Table I); the top end is a 300-instance leaked subset; "consistently" holds for Pass@1 on Verified only |
| No major model release reports calibration (arXiv 2609.26489) | Reading (rd-num Subject, last paragraph) |
| WhatWorkedBench: right settings, wrong causal beliefs (arXiv 2609.27490) | Reading (rd-num Subject, last paragraph) |

## "Benchmarks whose subject is the surrounding system"
| Fact | Where |
|---|---|
| Cluster: HarnessDev (harness), Phi-Bench (infrastructure), MOLE (monitor), Real-SWE (private code), Hyper-tau (pairing), Emergence World (16 days) | Reading (rd-num Subject) |
| Real-SWE: Specific Labs, ten licensed tasks, eight pairs, 640 rollouts, native harness, ~20 points below TB 4.0, licensing as defence | Reading (rd-num Contamination: 17.0 and 24.1 points derived for Fable 5.1 and Astra, mean 20.6); 640 rollouts and pairs on the Math and coding child and atlas row |
| Phi-Bench: 85 tasks, nine categories, three formats, Opus 5 36.53%, hardware and edge 5.4% | Reading (rd-num Subject). **Corrected**: 36.53% is a mean reward; 5.4% on hardware and edge belongs to Qwen3.7 Max, not the best model (Phi-Bench page) |
| MOLE: 150 accounts, nine services, 30 workdays, 12 threats, ~20B tokens, 72% of 39 complete most harmful objectives, stated refusal does not predict declining, best monitors miss ~half, search improves monitor 49 to 64% | Reading (rd-num Subject). **Corrected** with the MOLE page: the refusal claim is not what was measured (refusal and completion correlate, Spearman -0.73); the 72% (28 of 39) was under a role-play instruction not to refuse. Monitor-search gain on the MOLE page |
| Hyper-tau-bench (Sierra, 8 Sep 2026): Opus 5 max reasoning 23.9% alone, 82.2% paired, 3.4x | Reading (rd-num Subject; 3.44 derived) |
| Emergence World: eight worlds of ten agents, 16 days, 850,000+ calls, ~50B tokens, three stress tests, none resilient, detection did not ensure containment, 46 hours, uninjected failures; read with MOLE | Reading (rd-num Subject, uninjected failures, duration argument). **Corrected** with the paper page: six worlds ran 16 days, Mixed 21, Grok ended on day 4; "46 hours" is one agent retrying a link after the campaign, not a measured detection-to-stop delay (so the Reading tab does not repeat it) |
| Physics re-grading: wrong keys, ambiguous questions, grader bugs behind most failures; near-saturated when corrected; residual is a mixture; harder human-written exams | Reading (rd-num Answer key, with the paper page's numbers: 143 / 95 / 12 of 250, 95.2%, before and after scores as upper estimates) |
| Goodfire: reward hacking has a legible activation signature; caveat on false positives | Reading (rd-game) |
| Atria Dawn Preview (14 Sep): "highest on five of 16" unnamed; 59.6% vs Claude 74.7% SWE-bench Pro; Step 5 Preview (20 Sep): DeepSWE v1.1 67.7% vs 74.0 to 74.1% | Reading (rd-wrong last item: both carried in the vendor's wording); the two numbers to verify in tab same or atlas (DeepSWE row exists in atlas) |

## "How to read the landscape"
| Fact | Where |
|---|---|
| Three questions (when, harness, answer key) with TB-Science 22 points in seven days, 62.7 vs 99.9, HLE 29% | Reading (rd-over key box). **Corrected**: TB-Science 30.0 to 52.6 took five days (27 Aug to 1 Sep), and the 34.6 points took 26 days, not "roughly seven weeks" |
| What model cards lead with | Reading (rd-how) |
| Distrust single headline numbers (SWE-bench Pro 47 to 80) | Reading (rd-num Split; rd-how) |
| Berkeley RDI near-perfect on 8 agent benchmarks by reward hacking | Reading (rd-game, rd-wrong) |
| Durable designs (private or rotating, live pinned to dates, interactive, paired human baselines) | Reading (rd-life) |
| AA v4.2 (4 Sep): GPQA dropped as saturated (quote), AA-Briefcase and GDP.pdf added, private 40% double previous; reranked lab order (Anthropic, OpenAI +85 Elo over Sol, Meta, SpaceXAI, Moonshot, Zhipu, Google) | Reading (rd-life aggregator paragraph; rd-num Index version). Lab order and Elo: to verify in tab same or Topic: llms (not repeated: model ranking belongs to Topic: llms) |
| v4.3 (7 Sep): TB 2.1 to 4.0, tau3-Banking replaced by AutomationBench-AA, private 40 to 45%; v4.3.2 (19 Sep) re-anchored GDPval-AA Elo; only v4.3 shown; pre-4 Sep launch scores (GLM-5.3-Flash, Gemini 3.8 Flash, Muse Spark 1.3) on an older scale | Reading (rd-num Index version: all verified at artificialanalysis.ai except the 19 Sep date and the GDPval-AA re-anchoring, which the AA pages fetched do not state; Reading says "current release is v4.3.2" only) |
| Saturation lifecycle in weeks; lifecycle in Benchmark methodology | Reading (rd-life, methodology folded in) |
| Carry unverifiable figures in source wording; tau^tau-Bench story | Reading (rd-wrong last item) |

## Deep dives and best resources
| Fact | Where |
|---|---|
| Three children with times and coverage; methodology child (folded); harnesses and LLM-as-judge live on Topic: evaluation-and-llm-judges | Further reading (children with current times 11, 10, 12 min from their pages; fold note; neighbouring topics) |
| Epoch AI hub, Artificial Analysis, LMArena, Scale leaderboards, HELM, BetterBench with times | Further reading (Best resources) |
| Links: arXiv 2608.23552, ARC Prize blog, TNW, mvakde write-up, arXiv 2609.27891, 2609.26489, 2609.27490, Real-SWE, Sierra, arXiv 2609.17320, 2609.13009, Goodfire, AA v4.2, AA leaderboard | Reading inline links and Further reading (TNW Astra-ARC article replaced by ARC Prize primary; AA leaderboard via methodology page) |

## Reconciliation with the finished data tabs (orchestrator, 2026-10-04)
The Same model, many numbers tab (`same/README.md`) and the Saturation timeline verified these; the Reading tab now agrees:
- ARC-AGI-3 62.7% vs 99.9% mixes max (standard) and high (adapter) effort; equal effort: 62.7 vs 98.6 (max), 54.8 vs 99.9 (high). Reading rd-over, rd-num Harness, rd-wrong; Further reading.
- Prime Agent "30% to 95.5%" compares different harnesses on different game sets. Reading rd-num Harness; Further reading.
- SWE-Bench Pro V2 "about 23%" is wrong (V2 leaderboard: Opus 5 99.4%, 638 of 642); "47 to 80%" mixed models and versions (47.1% is Opus 4.6 on the v1 commercial set) and is no longer used as one benchmark's spread. Reading rd-num Split.
- HLE tools effect: 3.3 points (Opus 5.5) and 7.0 (Opus 5) in Anthropic's runs, not 10 to 20: carried by tab same; Reading does not state a figure.
- OSWorld 2.0 Opus 5 74.0% is partial credit (strict 37.2%; maintainers 68.3% / 31.4%). Reading rd-num Version.
- Astra for Law also adds legal-analysis instructions and uses OpenAI's private validation set. Reading rd-num Harness (the derived 3.1 SE is now conditional and the index effect is not isolated).
- Real-SWE (read 2026-10-04): GPT-6 Astra 46.25%, Fable 5.1 45.00%, not "Fable 5.1 leads at 38.8%"; the "roughly 20 points below Terminal-Bench 4.0" is now 11.65 and 10.8 points against lab TB 4.0 figures. Reading rd-num Contamination.
- Terminal-Bench-Science AA re-runs 63.3% (Astra) and 43.3% (Fable 5.1) against lab 64.6% and 52.6%. Reading rd-life text and animation captions, linking the Saturation timeline.
- AIME 2026 was at 98.3% on the day it existed, so "each vintage saturates within about a year" is wrong: carried by tab sat; the Reading tab makes no within-a-year claim.

## Update after the seven child pages were built (4 October 2026, later the same day)
Rows above that this pass changed; where a row above disagrees, this section wins.
| Fact | Where now |
|---|---|
| "Child page planned" for long context, multimodal, safety, human preference | Every family's Go deeper note links its child with its reading time (rd-fam); Further reading lists all seven children with reading times. Multilingual translation, the classic era and aggregators stay root-only (said in rd-fam and Further reading). |
| Old "Math and coding benchmarks" page (3c65c17b0d0d8146b127fe43f5761bf0) | Replaced everywhere by Math benchmarks (3ef5c17b0d0d81ec942edf0040a2f596) or Coding benchmarks (3ef5c17b0d0d81bfa09ad4ba5eef0c4e): Reading, Further reading, atlas tab text and owner column (unused "mc" source removed). |
| GDP.pdf "Astra 33.2" | Corrected in Reading (rd-fam Long context) to 34.2% (Surge harness) and 32.2% (Artificial Analysis), both read 4 Oct 2026; 33.2% is AA's v4.2-launch figure (atlas row keeps it, labelled). |
| FrontierMath "only 50-problem Tier 4 discriminates" | Corrected: v2 sizes 295 (285 private) and 43 (41 private); Tier 4 v2 at 100% (GPT-6.1 Sol max, Epoch, 29 Sep 2026). Reading rd-fam Math; atlas FrontierMath rows (source: Epoch v2 changelog). Saturation data already agreed. |
| HLE tools "10 to 20 points" | Qualified as set-specific: 3.3 to 7.0 points on full HLE (Anthropic, HLE sources blocklisted); 19.3 to 32.2 on HLE-Diamond (maintainers, 22 Sep 2026). Atlas HLE row (corrections and an issue) and tab same (HLE case note and correction). |
| SWE-bench Verified "~97%" | Confirmed independently: Vals AI bash-only, Claude Opus 5 97.0%, eight models 93.4 to 97.0%, updated 1 Sep 2026. Atlas headline reading (Epoch's 83.5% kept as a separate reading); Reading rd-fam Coding. |
| Terminal-Bench 4.0 task count | 66, counted from the 66 task folders of v4.0.0 (board: 330 trials, 5 per task); no longer "derived from release notes". Atlas tb4 row. |
| Terminal-Bench 2.x StateM issue | Reworded against the StateM paper page: GPT-5.5 83.1% to 92.1%, 95.3% raw with GPT-5.6 Sol; 13 judge flags of 424 rewarded trajectories, four harness cheating; closed unmerged 19 Sep 2026. Atlas tb2 row. |
| Long-context and multimodal statuses | Reading rd-fam: long context Active GDP.pdf, MRCR (independent runs), NoLiMa; Saturating AA-LCR; retired, dormant or saturated NIAH, RULER, LongBench v2, Fiction.LiveBench. Multimodal Active Video-MME-v2, CharXiv, ZeroBench, GDP.pdf; Saturating MMMU-Pro and the video sets; Saturated MMMU, MathVista, ChartQA, DocVQA. Atlas MRCR status now active; NIAH row gains Claude 2.1 27% to 98% (Anthropic, 6 Dec 2023). |
| Safety Active list; HarmBench/StrongREJECT | StrongREJECT dropped from Active; HarmBench, AgentHarm, StrongREJECT listed as research staples off frontier cards. Atlas harmbench reading cites the GPT-5.2 card (11 Dec 2025); correction reworded. One sentence on dangerous-capability and scheming/evaluation-awareness evals (rd-fam Safety). |
| MOLE "role-play instruction not to refuse" | Reworded to the children's reading: a preamble saying the sandbox is harmless; refusal and completion correlate across models (Spearman -0.73); best monitor 24 of 45 (Reading rd-game). |
| Preference: Arena-Hard v2 Active; GDPval-AA under preference; LMArena | Arena-Hard v2 dormant (newest entries Apr 2025); GDPval-AA only under Agentic; LMArena renamed Arena on 28 Jan 2026 (said once, then "Arena"), text board 413 models on 2 Oct 2026, style control default, factuality toggle since 14 Jul 2026, Agent Arena (Jun 2026) by causal tracing. Reading rd-fam, Further reading, atlas lmarena row. |
| Instruction following | Points to Human preference and arenas (IFEval, IFBench, MultiChallenge). |
| GSM1k "up to 13%" | v4 of the paper says "up to 8%" (13% was v1). Reading rd-num Contamination (atlas already said 8%). |
| Tool use Active list | BFCL v4 and the MCP evals shown as dormant boards (as the atlas already said); tau2-bench still reported. |
| New atlas rows | NoLiMa, CharXiv, ZeroBench, Video-MME-v2, XSTest, Cybench (facts from the children's sourced text; arXiv ids verified). 100 rows. |
| Coding and math status lines | Aligned with the children and the atlas: SWE-bench Pro v1 deprecated, Pro V2 public split at 99.4%, LiveCodeBench and Pro frozen, Aider Polyglot saturating; AIME and HMMT saturated (MathArena deprecated final-answer contests, May 2026), miniF2F and PutnamBench solved; ARC-AGI-2 saturated (rd-fam). |
| Reading time | About 21 minutes (Reading tab). |
