# Eval harnesses: visual ideas

Question the page answers: what does each harness treat as the unit of work, and what follows from that for scoring, logging, sandboxing, reproducibility and contribution?

## Built

| # | Idea | Score (0-10) | Data | Placement |
|---|---|---|---|---|
| E1 | **One GSM8K problem through lm-eval and Inspect**, before/after animation (7 steps each: task YAML, context, request, generate, filters, metric, aggregate and write; against sample, system_message, prompt_template, generate(), output, scorer, metrics and log). Play, pause, step, scrub, speed; runs only on screen in the visible tab; paused under reduced motion. Bars drawn to one scale across both modes: prompt tokens, output tokens, bytes kept per problem. Default problem picked by rule (first where the logged verdicts differ) | 9 | Two real runs by this page (Qwen2.5-0.5B-Instruct, fp32 CPU, 10 GSM8K test problems; `run_harnesses.sh`, `mk_runs.py`) | Reading, rd-unit |
| E2 | **Files side by side**: GSM8K as each harness ships it (lm-eval YAML, inspect_evals, lighteval, HELM run spec, scenario and metric, simple-evals MGSM, Inspect match_str, lighteval math_scorer, openai/evals Match) plus the nearest real file for harnesses without GSM8K (openai/evals registry YAML, Evalchemy MATH500, Unitxt card, promptfoo example); pick a decision (prompt, shots, chat, decoding, extraction, metric, dataset) and the lines that make it light up in both panels, each panel linked to its commit | 9 | `inputs/` extracts at pinned commits (`sources.json`) | tab One task, every harness |
| E3 | **Field-by-field table** of the GSM8K defaults in five harnesses (cards on phones) | 7 | read from E2's files | same tab |
| E4 | **Extraction bench**: 20 real outputs x 7 extraction rules, run with the harnesses' own code (lm-eval, Inspect, lighteval installed) or verbatim copies (HELM, simple-evals, openai/evals); the strings each rule read are highlighted; totals per rule; a live box running six rules in JavaScript on any text (checked against the Python on all 20 outputs by `recompute.py`) | 8 | `compute_extract.py` -> `data/extract.json` | same tab |
| E5 | **Run log explorer**: the real lm-eval results file and sample record, Inspect log header and sample, as clickable trees with a note per field; the sample's 20 events as a timed list, each opening its JSON | 8 | `data/lmeval_results.json`, `lmeval_sample0.jsonl`, `inspect_log_sample0.json` | tab Inside a run log |
| E6 | **Decision tree** "which harness for which question", path kept visible, each leaf saying what to pin | 7 | page text | Reading, rd-choose |
| E7 | **In one screen** table with dated status badges (cards on phones) | 6 | `inputs/versions.json`, repository heads | Reading top |

## Rejected

- **Accuracy bars per harness** from the two runs: 10 items, interval 0.3% to 44.5% at 1 of 10; it would read as a ranking. The parent's tab owns the 200-item reproduction.
- **Re-running the MMLU knobs** or the published one-model-many-scores cases: owned by the parent's "Same model, many harnesses".
- **An agentic Inspect run in a Docker sandbox**: no Docker daemon on this machine and a 0.5B model does not use tools usefully; the sandbox table and a link to the Agent and trajectory evaluation sibling instead.
- **lighteval and HELM live runs**: lighteval's own GSM8K now uses inspect_evals' prompt on the Inspect path (shown in E2); HELM is in maintenance mode and its GSM8K downloads unpinned data. Their extraction rules are in E4.
- **Writing illustrative configs for promptfoo or Braintrust on GSM8K**: not real files; the real getting-started config is shown instead.
- **GitHub stars or download charts**: popularity says nothing about which to use.

## What the methodology lacked

- A rule for logs that misreport: Inspect's local provider logs the padded batch's token usage; the page counts real tokens with the tokenizer and shows both, labelled.
- Harness defaults (sampling on or off) change what a "real run" is; the departures from defaults are stated next to the run.
