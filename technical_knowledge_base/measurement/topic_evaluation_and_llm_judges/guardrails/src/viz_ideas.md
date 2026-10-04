# Visualisation ideas: Guardrails: staged runtime safety for LLM systems

The question the page keeps returning to: **at which stage does a check pay its cost, and what does it wrongly block?** A visual earns its place when it makes one of the two errors (harm let through, benign blocked) or the cost (latency, money) measurable on real data.

Existing visuals on the old page: none (a table of guard models, bullet lists). Outbound links: NeMo Guardrails, Llama Guard cards, Turing Post survey, Granite Guardian, OWASP, Adversa.

Scores: 0 to 2 on moving quantity, reproduces a source, computable from public data (double), shows what prose cannot, corrects a misconception, measures the central question, absent elsewhere (double), step animation against the method replaced; minus build cost.

| # | Idea | Data | Placement | Score | Status |
|---|---|---|---|---|---|
| G1 | **Same 450 conversations, with and without each stage (before/after animation)**: XSTest's 450 prompts as squares; the guardrail system prompt inside the model (Mistral's released answers with its guardrail prompt) against classifier rails outside it (this page's Qwen3Guard-Gen-0.6B runs on every prompt and answer), step by step: no rails, input rail, output rail, strict; counters for harmful answers, safe prompts blocked, safe prompts refused by the model, guard calls | XSTest repository (prompts CC BY 4.0, human labels); runs/run_qwen.py | Reading, "With and without" | 2+2+4+2+2+2+4+2 = 20 | built |
| G2 | **Pipeline lab**: every switch (answers, injection detector, input and output rails, loose/strict/threshold), outcome counters, trade-off curve over 99 thresholds with loose and strict marked, every conversation with per-stage verdicts | as G1 plus runs/run_pi.py | Own tab | 18 | built |
| G3 | **Conformal threshold on a random split**: calibrate the input-rail threshold on 125 safe prompts for a target over-block rate (Angelopoulos et al. rule), test on the other 125, "New split" to see the scatter | as G1; mulberry32 split reproduced in recompute.py | Pipeline lab | 16 | built |
| G4 | **Stream rail cut points**: 168 real answers fed token by token through Qwen3Guard-Stream-0.6B, each a bar to scale with the cut marked; cut on Unsafe or on Unsafe/Controversial; tokens shown before the cut | runs/run_stream.py (capped at about 20 min: all 128 harmful full compliances plus 40 seeded safe ones) | Reading, During the call | 15 | built |
| G5 | **PII rail before/after**: real Nemotron-PII records masked by a regex rail and by GLiNER-PII, toggles and threshold, gold spans left in underlined; recall by direct and quasi-identifiers over 200 records | nvidia/Nemotron-PII (CC BY 4.0); runs/run_pii.py | Reading, Before the call | 15 | built |
| G6 | **Guard model scorecards**: every transcribed published number by benchmark, task and metric, coloured by runner (own, rival, copied, independent, this page), with the automatic "same model, same set, different runners" spread (ShieldGemma ToxicChat F1 17.7 to 72.9) | research_guard_models.md (papers, cards, GuardBench results) | Own tab | 17 | built |
| G7 | **Latency and cost calculator**: three guards and an output guard in serial, parallel, or alongside generation, timeline to scale; Bedrock and Model Armor list-price cost per day | NVIDIA blog Table 2 (defaults reproduce 1.44 s by construction), Prompt Guard 2 card, LLM Guard docs, AWS and Google pricing | Reading, Latency and cost | 13 | built |
| G8 | **Base-rate calculator**: share of blocks that are mistakes at a given attack share, recall and over-block rate (defaults = this page's loose input rail on XSTest) | G1 data | Reading, A rail is a classifier | 12 | built |
| G9 | Label-split bars for the input and output rails (Safe/Controversial/Unsafe on safe and unsafe items) | G1 data | Reading | 10 | built |
| G10 | Injection detector, four runners, one model (Protect AI DeBERTa: own 95%, PINT 79%, AgentDojo utility halved, evasion 20%, this page on deepset and XSTest) | cards, PINT, AgentDojo, arXiv 2504.11168, runs/run_pi.py | Reading table + Pipeline lab section 4 | 12 | built |
| G11 | Refusal flag against human labels (definitional disagreement on premise refusals) | G1 data | Pipeline lab | 9 | built |
| R1 | Run Shieldstral 3B and Granite Guardian on the same 450 | 8 GB and 16 GB downloads at the measured 1.5 MB/s, over the compute cap | none | 9 | rejected (time); the scorecards carry their published numbers |
| R2 | Animated agent with tool-call rails on AgentDojo | Would need running an agent with tools; published AgentDojo tables carry the comparison, and agent evaluation is a sibling's | none | 8 | rejected (owned by Agent and trajectory evaluation) |
| R3 | XSTest refusal rates across models and graders | Owned by Safety and honesty benchmarks (XSTest, every prompt) | link | 6 | rejected (sibling owns it) |
| R4 | Re-plot of NVIDIA's compliance-vs-latency per added rail | Four points from a vendor blog; the calculator already uses them | inside G7 | 6 | rejected as its own chart |

What the methodology lacked for this page: a rule for **who ran a number** as a first-class field next to the metric (guard-model tables are almost all rival re-runs under the runner's own threshold and mapping); and a rule for **content withheld from released data** (answers to unsafe prompts are labels only, as on the Safety and honesty page).

Inspiration: the Safety and honesty page's XSTest before/after (same data, benchmark side); NVIDIA's layered-rails table; the Granite Guardian paper's TPR-at-fixed-FPR table; GuardBench's leaderboard.
