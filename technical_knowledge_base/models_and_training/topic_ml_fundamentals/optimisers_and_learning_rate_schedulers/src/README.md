Source of the interactive HTML on the Notion page "Optimisers and learning-rate schedulers" (child of Topic: ml-fundamentals).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 10 header, 20_read_a to d, 35 race tab, 39 Further reading, then every JS part in order, 99 tabs last).

Generated parts: `parts/31_js_race_lr.js` (node checks/tune.mjs), `parts/41_js_mem_data.js` (python3 recompute.py).

Checks (run from src/):
- `node checks/dump_js.mjs` then `OMP_NUM_THREADS=2 uv run --with torch --with numpy --with lion-pytorch --with schedulefree python checks/torch_ref.py`: every optimiser against PyTorch references (soap_ref.py is soap.py from github.com/nikhilvyas/SOAP with its eigenbasis in float64).
- `OMP_NUM_THREADS=2 uv run --with torch --with numpy --with schedulefree python checks/nqm_check.py`: the noisy-quadratic recursions against 4,000 seeded runs.
- `OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/sched_check.py`: schedule sparklines against torch.optim.lr_scheduler.
- `node checks/race_facts.mjs`: numbers the text quotes from the race. `python3 recompute.py`: every derived number.
- `node checks/check_controls.mjs`: clicks every control at 390 dark and 920 light.

Shape: Part B of html_utils/methods/topic_pages.md (child page). Reading follows the subject's own logic (landscape, momentum, per-parameter steps, preconditioning, Muon and Lion, evidence, schedules, annealing vocabulary, decay-free, mistakes); one standalone tab (Optimiser race). Departure: no real-model data; the subject is update rules, so the "real data" is exactness instead (every rule checked against PyTorch), plus real configs for the memory table. The parent root's update visuals, schedule chart, Adam/AdamW thread, Training lab and Defaults tab are linked, not rebuilt. `live.md` is the old Notion text; `coverage.json` maps every fact in it; `inputs/extracts.txt` holds verbatim source quotes; `viz_ideas.md` the scored choices.
