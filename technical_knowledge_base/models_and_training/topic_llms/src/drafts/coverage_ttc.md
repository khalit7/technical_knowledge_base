# Coverage: "Reasoning models and test-time compute" folded into Topic: llms

Source: `reasoning_models_and_test_time_compute/src/` (parts, inputs, viz_ideas.md, recompute.py). Destinations:
- **DEEP** = `parts/34_tab_ttc.html` (tab `t-ttc`) with `parts/34_js_ttc0_common.js` to `34_js_ttc4_lab.js`; section ids in brackets.
- **DRAFT** = `drafts/axis1_from_ttc.html` (for Reading section `s-think`, merged by Khalid).
- **PARENT** = already said in the parent; quoted.
- **REPORT** = handed to Khalid in the agent's report for the parent's Further reading tab.
- **DROPPED** = said why.

## 00_top.html, 01_css.html, 02_header.html, 05z_errbox.js.html, 90_js_tabs.js, 10_js_common.js
| Item | Where |
|---|---|
| Page title, subtitle ("How a model converts inference tokens into accuracy: longer chains, parallel samples with a selector, adaptive budgets and routers, and depth inside the network") | DEEP deepnote (same list of contents); the parent header serves the page. Reading-time placeholder RT_MIN/RES_TIME: DROPPED (the parent build does not compute it) |
| Tab bar (Reading, Sampling lab, Published curves, Further reading) | DEEP: the two standalone tabs are sections `ttc-s-lab`, `ttc-s-curves`; sub-nav `#ttcNav`. Further reading: REPORT |
| CSS | DEEP `<style>` scoped `#t-ttc`; base rules identical to the parent's `01_head.html` (same variable names and values in light and dark), so reused as is. Unused child classes (`.lt`, `.eg`, `.mx`, `.tl-item`, `.pbar`, `.strip`, `.thm`, `.sr`, `table.cmp`, `.pill`, `.unc`, `.m`, Anthropic-page leftovers) DROPPED: no element uses them |
| Error box and handler | PARENT (`05z_errbox.js.html`, identical) |
| Tab script | PARENT `99_js_tabs.js` (same `TAB_RENDER` contract); `data-to` scrolling replaced by in-tab anchors |
| Helpers (`$`, `fmt`, `fmtBytes`, `mulberry32`, `segBind`, `svgEl`, `bx`, `ar`, `sup`, `sci`, `usd`, `flp`, `stat`, `A`, `logFrame`, `endLabels`) | DEEP `34_js_ttc0_common.js`, namespaced `window.TTC`; `bx`, `ar`, `usd`, `flp`, `endLabels` DROPPED as unused by any ported widget; marker ids prefixed `ttcah` |
| Phone stacking of `table.cmp` | DROPPED with the two tables, which moved to DRAFT as plain `.tw` tables |

## 03_read_a.html
| Section / fact | Where |
|---|---|
| s-what: reasoning model = long CoT, trained (RL on mechanically checkable tasks) to plan, verify, backtrack, self-correct | DEEP `ttc-s-how` lead; the bare definition is PARENT s-think: "A **reasoning** (or "thinking") model is trained to use it well, and every flagship is now one" |
| Test-time compute as a second scaling axis | PARENT s-think: "**Test-time compute** is computation spent at inference, deliberating before answering" |
| Scratch-paper intuition | DEEP `ttc-s-how` lead |
| "How much thinking to buy and where to spend it: longer, wider, or deeper" | DRAFT opening paragraph |
| "This page is the general mechanism; lab pages show each lab" | DROPPED (framing of a separate article); lab links stay in the parent's Further reading |
| s-terms: CoT, verifier, reward model, pass@k, self-consistency (cons@k, maj@k), best-of-n | DEEP `ttc-s-how` terms grid |
| Term "Reasoning model" ("since 2025 most flagships ... with a switch or a dial") | PARENT s-think ("every flagship is now one"; "The open labs mostly expose thinking as an on, off or effort switch") |
| Term "Test-time compute" (measured in generated tokens; three ways) | PARENT s-think definition + "Thinking is paid for as output tokens"; three ways: DRAFT |
| Term "Thinking budget or effort level" | DRAFT control table (token budget, effort level, switch rows) |
| Term "Recurrent depth (looped transformer)" | DEEP `ttc-s-latent` ("A looped transformer reuses the same layers several times per token") |
| s-how: fixed depth per forward pass; CoT removes the bound; context as external memory | DEEP `ttc-s-how` |
| D_serial = L x T, worked 60 x 1 = 60, 60 x 10,000 = 600,000 | DEEP `ttc-s-how` |
| Merrill and Sabharwal (log / linear / polynomial steps, regular languages, P) | DEEP `ttc-s-how` |
| Decomposition, externalised state, revision | DEEP `ttc-s-how` |
| M_KV formula block | Formula PARENT s-serve ("M_KV = 2 x L x n_kv x d_head x T x b / 8"); DEEP refers to it and keeps the bytes form in the calculator readout |
| 240 KiB a token, 7.5 GiB for 32,768 tokens; Inference techniques page link | DEEP `ttc-s-how` |
| KV and serial-depth calculator (L, h_kv, d_h, b, T, decode speed) | DEEP `#ttcKvL...`; default T now exactly 32,768 (the child's slider step snapped 4.515 to 4.5, showing 31,623 tokens and 7.24 GiB: fixed) |
| What test-time compute does not buy (no knowledge, no progress from zero, bad economics) | DEEP `ttc-s-how`; "no knowledge" also DRAFT mistake |
| s-three cards: sequential (o1/R1, backtracking, the axis RL scales; latency 200 s, KV linear, attention cost), parallel (wall-clock, tokens x n, selector; voting canonical form; RM best-of-n; verifier strongest), latent (activations, no token bill; costs monitoring, evaluation, serving) | DRAFT "Three ways to spend it"; the cost detail of sequential and parallel also in DEEP `ttc-s-three` intro |
| Same 10,000 tokens one chain vs five chains animation (vote 0.683 / 0.835, verifier 0.990, 200 s vs 40 s, 240 KiB a token) | DEEP `#ttcSp` (`34_js_ttc1_anim.js`) |
| "What it shows" (serial chain repairs, parallel only outvotes or rejects) | DEEP `ttc-s-three` |
| Multi-agent tiers (Grok 4 Heavy, Gemini Deep Think) aggregate between trajectories; branches readable; heavy tiers = parallel of long sequential, order of magnitude more cost for a few points | DRAFT "They compose" paragraph |

## 04a_latent.html
| Fact | Where |
|---|---|
| Looped transformer, Universal Transformer (Dehghani 2018), Huginn (Geiping 2025): prelude/core/coda, 3.5B, 800B tokens, (2,4,2), mean 32, "up to a computation load equivalent to 50 billion parameters" | DEEP `ttc-s-latent` |
| D_token formula; 2 + 4 x 32 + 2 = 132 | DEEP |
| Ouro (7.7T tokens, 1.4B and 2.6B matching up to 12B), Nanbeige4.2-3B (22 layers twice, ~75%), Mixture-of-Recursions (Raschka) | DEEP |
| Ordinary / looped / RLT animation and its scaling note | DEEP `#ttcLp` |
| RLT: authors, encoder + decoder, gated merge, chunks, 48+48 tied, 96 logical blocks, 48t, eight- and sixteen-layer untied models, six tasks, three seeds, 5+3 and 7+1 100% on 256-bit parity, 4+4 55.70% +- 25.78 vs 0.85% +- 0.30, addition falls beyond trained widths, "explicitly reports no measured efficiency..." (MarkTechPost) | DEEP |
| GPT-6 Astra: opaque recurrence reported by press, not in OpenAI's announcement; TechCrunch "reportedly limited"; Pachocki quote; system card controllability, "occasionally evade CoT-only monitors", "quite confident..." | DEEP. Note: PARENT s-think's schematic says "OpenAI says its use is limited (OpenAI)"; the child's sources put that only in TechCrunch. Flagged in DRAFT header comment and the report |
| Buys / costs / does not save cards (22 blocks twice need the cache of 44, Raschka) | DEEP |
| The disagreement: Shlegeris, Greenblatt (shortform), Finnveden et al., Raschka (survey, Astra post) | DEEP |
| Recurrent depth leaves no text | also PARENT s-think ("Recurrent depth is the only one that leaves no text at all") |

## 04_read_b.html
| Fact | Where |
|---|---|
| pass@k formula, p = 0.2 worked (0.672, 0.893), p = 0 ceiling | DEEP `ttc-s-maths` |
| Chen estimator, n = 200 for k <= 100, naive form biased; widget (56/252 = 0.778) | DEEP |
| Majority vote formula, p = 0.6 n = 5 worked 0.683, p = 0.4 gives 0.317; plurality with scattered wrong answers 54.9% / 78.0% | DEEP |
| Three-selectors widget | DEEP `#ttcSel` |
| Wang et al.: 40 paths, +17.9 GSM8K (60.1 to 78.0), 11.0 SVAMP, 12.2 AQuA, 6.4 StrategyQA, 3.9 ARC-challenge | DEEP |
| Brown: 82.9% to 98.44% coverage vs 40.50% to 41.41% voting | DEEP (maths and curves) |
| Gao, Schulman and Hilton: R_bon, KL_bon, d, illustrative alpha/beta, n = 16 worked (1.835, 1.355, 0.896), peak d = 2 near n = 147, 0.876 at 4,096, R_RL form | DEEP |
| Best-of-n widget | DEEP `#ttcBon` |
| Compute-optimal allocation (Snell: more than 4x vs best-of-N; 14x larger model; qualifier) | DEEP `ttc-s-maths` |
| s-train: SFT on traces (rejection sampling, STaR), R1 distilled 1.5B to 70B from 800,000 samples "only SFT", R1 paper page link, s1K, structural limits | DEEP `ttc-s-train` |
| RLVR: verifier reward, checker gaming, on-policy credit, emergence | DEEP |
| R1-Zero: V3-Base, "from hundreds to thousands", AIME 15.6% to 77.9% (86.7% sc), v1 71.0% and 86.7% maj@64 | DEEP |
| Four-stage R1 recipe | DEEP |
| RLVR needs a verifier; extending reopens reward hacking | DEEP |
| GRPO: PPO critic, four networks, group normalisation quote, formula, G = 4 worked (+1.732, -0.577), zero-signal p^G + (1-p)^G; widget (81% at G = 4, 44% at G = 16) | DEEP `#ttcGr*` |
| Rollout throughput, vLLM/SGLang, equal penalty on failed tokens; RL for LLMs page owns Dr. GRPO, DAPO etc. | DEEP |

## 05b_ctl.html
| Fact | Where |
|---|---|
| Five mechanisms table (who decides, buys, costs) | DRAFT "Who decides how much it thinks" with a "who ships it" column |
| Qwen3 `enable_thinking`, `/think`, `/no_think` | DRAFT table |
| budget_tokens from Claude 3.7 Sonnet, quote "think for no more than N tokens ... 128K", only mode on Claude 4 and 4.5, Gemini 2.5 budget | DRAFT table (short); quote and detail DEEP `ttc-s-ctl` |
| At least 1,024 tokens, below max_tokens, "sets a target", interleaved exceeds max_tokens, "the budget spans all thinking blocks" | DEEP; the spanning fact also DRAFT table |
| s1 budget forcing, "Wait", 50% to 57% on AIME24; budget-aware training | DEEP |
| Effort replaces budgets, deprecated on 4.6, 4.7+ 400 error, "soft guidance", low effort may skip | DEEP; short form DRAFT table |
| Gemini dynamic thinking, thinking_level levels vary by model, 2.5 too | DEEP; short form DRAFT |
| GPT-5 router quotes | DEEP; one quote DRAFT |
| CogRouter 82.3%, 62% fewer tokens; Ares up to 52.7% | DEEP |
| Lab pages show each vendor's dials | DROPPED (the parent's Further reading lists every lab page) |

## 05_read_c.html
| Fact | Where |
|---|---|
| History 2022 to 2023 (CoT prompting, self-consistency, STaR) | DRAFT |
| Sep 2024 o1 (large-scale RL, hidden CoT, AIME/GPQA/Codeforces, scaling curve) | DRAFT |
| Jan 2025 R1 (R1-Zero pure RL, cold start, distilled variants, MIT, o1-class at a fraction of price) | DRAFT (replication, MIT, distilled); R1-Zero and cold start DEEP `ttc-s-train`; "a fraction of the price" DROPPED as unquantified (the parent's price sections carry current prices) |
| 2025 hybridisation list, Grok 4 Heavy quote, IMO (Deep Think five of six, 35 points; OpenAI gold via Alexander Wei) | DRAFT (Grok quote in "They compose") |
| 2026 absorption, budgets to effort, Astra | DRAFT |
| Current state: depth control universal | DRAFT table "who ships it" + PARENT s-think ("The open labs mostly expose thinking as an on, off or effort switch") |
| Token efficiency (GPT-5.6 Sol quote, Opus 5 customer 26%), research per-step depth | DRAFT; CogRouter/Ares DEEP |
| Harness carries score: ARC-AGI-3 62.7% for $26K vs 99.9% for $19K, adapter quote, 37.2 points | PARENT s-read: "GPT-6 Astra on ARC-AGI-3 ... Standard harness 62.7% ... Provider Adapter 99.9% ... The adapter keeps Astra's hidden reasoning state between requests, and the higher score was the cheaper run: $18,817 against $26,098" |
| 3.66x faster, 49% fewer tokens on 167 pairs; OpenAI page animates the two harnesses | DRAFT (numbers); OpenAI page link: PARENT Further reading lists the OpenAI page |
| Verification-heavy pipelines | DRAFT |
| Open replication complete (lineage list, OLMo logs) | DRAFT |
| What is measured (benchmark list) | DRAFT |

## 05c_end.html
| Fact | Where |
|---|---|
| Overthinking: Gema et al., quote, five failure modes | DEEP `ttc-s-stop` (full); DRAFT (one line) |
| RLVR sharpens not extends (Yue), pass@k reasoning, pretraining bounds ceiling, RL for LLMs debate link | DEEP (full); DRAFT (one line) |
| Sharpening widget (ten problems, s, dropped; crossover) | DEEP `#ttcSh` |
| Parallel scaling capped by the selector | DRAFT |
| Economics: linear cost vs log accuracy (o1), unparallelisable sequential latency | DRAFT; latency also DEEP mistake "Forgetting that sequential tokens are serial" |
| Which one when table (6 rows) | DRAFT |
| Caveat: CoT not faithful, monitorability, Greenblatt endpoint quote | DRAFT `.co.warn` (now with the Greenblatt link) |
| Caveat: reward hacking and verbosity bias | DEEP `ttc-s-mist` |
| Mistakes: RL pass@1 as new capability; voting always helps; best-of-n without limit; sequential tokens serial | DEEP `ttc-s-mist` |
| Mistakes: comparing without budget and harness; budget as hard cap; CoT as explanation; thinking adds knowledge | DRAFT |

## 06a_lab.html (Sampling lab tab) and 16_js_lab.js
All of it in DEEP `ttc-s-lab`: Beta(alpha, beta) benchmark, presets (heavy tail, fitted to Brown 0.5239/3.786, easy), m wrong answers, histogram with vote threshold 1/(m+1), exact mean pass@k = 1 - B(a, b+k)/B(a, b), exact plurality on a fixed p grid, vote ceiling, tokens per problem, power-law section with Schaeffer et al. quote and Gamma approximation, measured slope, Monte Carlo check (200 problems, 64 samples, Chen estimator), reproduction note (by construction; voting plateau not reproduced; implied 12.2% derived).

## 06_tabs.html (Published curves tab) and 14_js_curves.js
All of it in DEEP `ttc-s-curves`: Brown coverage law exp(a k^b) with six fits and stated points, table fit vs stated, reproduction note (within 2 points; Gemma-2B 9.5% vs 7.1%); selector bars (o1 74/83/93 quote; R1 79.8/86.7/90.0; Llama-3-8B 41.41/98.44; code-davinci-002 60.1/78.0) with sources; Yue et al. Tables 3 and 4 for three benchmarks; link to the sharpening model (now an in-tab anchor).

## 07_more.html (Further reading tab)
REPORT, every link with its time. Its one piece of knowledge not elsewhere, the Multimodal LLM Architectures card (shallow, modular, unified integration; LLaVA and BLIP pattern; Gemini, GPT-4o and GPT-5, Qwen-VL, Kimi K3, MiniMax M3), is also in the report so it can go into the parent's card text. The "Topic: llms" card DROPPED (it is the parent itself).

## 11_js_anim.js, 12_js_maths.js, 13_js_read.js, 15_js_loop.js
DEEP: `34_js_ttc0_common.js` (engine `makeAnim`, maths `TM`, `lineChart`, `legend`), `34_js_ttc1_anim.js` (both animations), `34_js_ttc2_widgets.js` (KV, selectors, best-of-n, GRPO, sharpening, Chen). Captions that said "Sampling lab tab" now say "Sampling lab below".

## inputs/, recompute.py, viz_ideas.md, README.md
- `inputs/` copied to `src/ttc/inputs/` (unchanged).
- `recompute.py` copied to `src/ttc/recompute.py` (reads no files, so no path changes; docstring updated). Its output matches every default in DEEP.
- `viz_ideas.md` copied to `src/ttc/viz_ideas.md` with a note on where each idea now lives; rejected ideas and methodology notes kept there.
- `README.md` (file list, check scripts `check.mjs` and `coverage.py`, `live.md`): DROPPED; those files are not in the child folder, and the parent's own checks (`tabshot.mjs`) replace them.
