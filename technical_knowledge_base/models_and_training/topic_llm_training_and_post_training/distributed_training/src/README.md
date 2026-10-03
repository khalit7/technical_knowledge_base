Source of the interactive HTML on the Notion page "Distributed Training" (child of Topic: llm-training-and-post-training).

Build: `sh build.sh` writes `../index.html` from `parts/` (same slot scheme as the parent's build: 20_read*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links as {{text|url}}, n:<notion id> or #t-<tab>). It also fills in the reading time and the best-resources total.

Tabs: Reading (comparison table, the "one training step, nine ways" animation, collectives with a cost calculator, one section per split, a pipeline-bubble table, composing with the Llama 3 and DeepSeek-V3 layouts, activation checkpointing, frameworks, common mistakes), Layout calculator, Further reading.

Shape: no method file covers deep-dive child pages of a stage-type topic; built from the brief. The page is organised around one question (what each GPU holds and sends under each split) rather than one section per framework, because the parent already owns the short comparison and the paper pages own each method's details; their animations (ZeRO step-through, Megatron layer split, Llama 3 and DeepSeek pipeline simulators) are linked, not rebuilt (see viz_ideas.md).

Files:
- `live.md`: the old Notion text, verbatim (fetched 2026-10-03; Notion's copy dated 2026-09-21). `coverage.json`: where every fact in it went.
- `recompute.py` -> `recompute.json`: every number the page shows. `check_calc.mjs` (node, from src/) checks the page's JS against it; `check_controls.mjs` (node, from the repo root, needs html_utils/node_modules) exercises every control for NaN, undefined and errors.
- `inputs/extracts.txt`: quoted lines from the sources fetched for this page (Ultra-Scale Playbook, torchtitan, nccl-tests, Narayanan, Korthikanti, Zero Bubble, Ulysses, H100 datasheet, DDP source, framework survey).
- `viz_ideas.md`: candidates scored, chosen and rejected.
