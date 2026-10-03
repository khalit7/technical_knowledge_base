Source of the interactive HTML on the Notion page "Training Infrastructure" (child of Topic: llm-training-and-post-training).

Build: `sh build.sh` writes `../index.html` from `parts/` (same slot scheme as the parent and Distributed Training: 20_read_*.html for Reading, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links as {{text|url}}, n:<notion id> or #t-<tab>). It also fills in the reading time and the best-resources total. The first Reading part is `20_read_a.html` so the glob orders it first in every locale.

Tabs: Reading (in one screen; the stack with a failure walked through it; frameworks; failures are routine and why bigger jobs fail more often; checkpointing; one day of a 16,384-GPU run four ways; recovery; stragglers and SDC; checklist; common mistakes), Goodput calculator, Further reading.

Shape: no method file covers deep-dive child pages of a stage-type topic; built from the brief, like Distributed Training. The page is organised around one quantity (effective training time) rather than one section per tool, because the old page's lists (stack, frameworks, checkpointing, recovery) are each a lever on that quantity. Table 5 and the 54-day replay live on the Llama 3 paper page and are linked, not rebuilt (see viz_ideas.md).

Files:
- `live.md`: the old Notion text, verbatim (fetched 2026-10-03; Notion's copy dated 2026-09-24). `mk_coverage.py` → `coverage.json`: where every fact in it went (79 of 79 found in the HTML).
- `recompute.py` → `recompute.json`: every number the page computes. `check_page.mjs` (node, from the repo root; needs html_utils/node_modules) checks the page's JS against it (failure list, the four simulated designs, calculator values) and exercises every control for NaN, undefined, errors and sideways scroll; element screenshots go to `../.shots/`.
- `inputs/extracts.txt`: quoted lines from the sources fetched for this page.
- `viz_ideas.md`: candidates scored, chosen and rejected.
