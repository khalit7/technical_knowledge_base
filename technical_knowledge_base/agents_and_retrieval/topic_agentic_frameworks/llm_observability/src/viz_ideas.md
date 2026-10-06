# Visualisation ideas: LLM observability

What the text needs to be understood: what a span tree adds over log lines; what the GenAI conventions require; how instrumentation choices change the trace; why a backend's cost can be wrong; why tail sampling fails on agent traces; what redaction catches and misses.

## Built (ranked)
1. **One run, three views** (Reading s1, before/after animation, score 9/10). The recorded local-model run step by step as log lines, as client auto-instrumentation spans (8 separate traces, no tools) and as an agent trace. Real durations and token counts from `recordings/local_run_exchanges.jsonl`. The toggle is the before/after the methodology asks for.
2. **Cost reconciled in three steps** (Reading s6, animation, 9/10). The same Claude Code trace into Langfuse raw ($0), with GenAI names (16% short) and with the 1-hour key (exact), plus the cost metric. Stacked bars by token kind from Langfuse's own costDetails. Teaches the one cost bug most people will hit.
3. **Tail sampling on a timeline** (Reading s7, animation, 8/10). Real span arrival times from the replay log; four setups as a toggle; decision line and kept/dropped colouring. Outcomes from the real collector.
4. **Tail-sampling simulator** (tab Pipeline lab, 8/10). Sliders for decision_wait, root-based decision and policy, with seven presets that are measured outcomes; "sim agrees" shown per preset.
5. **Redaction policies on one span** (Reading s8, toggle, 8/10). The interaction span and the `ls -la` tool span before and after mask, hash and allow-list, with leak counts per policy.
6. **Eight instrumentations explorer** (tab, 8/10). Variant picker, waterfall, span list, attribute table classified against the conventions, a presence matrix of 14 key attributes.
7. **Three-process trace waterfall** (Reading s1, static, 7/10). App, Claude Code and test runner in one trace, ERROR spans outlined.
8. **Conventions explorer** (Reading s2, 7/10). Every span type at commit cb10b70 with requirement levels and sampling-relevant marks, read from the YAML model files.

## Rejected
- A live Langfuse UI screenshot: needs an image of a third-party UI and adds nothing the tables do not; the page is offline-only anyway.
- A head-sampling animation: owned by the general Observability page; linked instead.
- A judge-scored online eval: would need a judge model run; the rule-based scorer plus its measured false pass teaches the point without it.
- A metrics dashboard of the eleven GenAI histograms: one run per variant gives no distribution worth plotting.

## Data and formulas
- Cost: (input x 1 + 1h cache write x 2 + cache read x 0.10 + output x 5) / 1e6, Haiku 4.5 list prices (platform.claude.com pricing, read 2026-10-05 per the shared facts); recomputed in `check_page.py` and in the Pipeline lab table.
- Semconv: `inputs/semconv_cb10b70.json` from `code/semconv_extract.py` over the pinned YAML.
- Sampling decision time in the simulator: first span + decision_wait, or root arrival + 2 s when root-based; policy evaluated on spans seen by then; later spans follow the decision (as measured on 0.162.0 with the trace still in memory).

## What the methodology lacked here
A pattern for "replay one recorded run through N instrumentations": recording model responses once and replaying them byte for byte made the comparison exact and cost no further model calls. Worth adding to the ideas log.
