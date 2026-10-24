Source of the interactive HTML on the Notion page "Optimisers and learning-rate schedulers" (child of Topic: ml-fundamentals; storage key `optim-tab`).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 10 header, `20_read_*.html` a to e, 35 race tab, 39 Further reading, then every JS part in order, 99 tabs last). The header's reading time is measured with `html_utils/audit_pages.mjs` and written into `10_header.html` by hand.

Generated parts: `parts/31_js_race_lr.js` (node checks/tune.mjs), `parts/41_js_mem_data.js` (python3 recompute.py), `parts/45_js_ns_0data.js` (python3 ns_data.py, from `inputs/root_gradient_sv.json`: the 32 singular values of the parent page's real 64 x 176 gradient, extracted from the built root page).

Checks (run from src/):
- `node checks/dump_js.mjs` then `OMP_NUM_THREADS=2 uv run --with torch --with numpy --with lion-pytorch --with schedulefree python checks/torch_ref.py`: every optimiser against PyTorch references (soap_ref.py is soap.py from github.com/nikhilvyas/SOAP with its eigenbasis in float64).
- `OMP_NUM_THREADS=2 uv run --with torch --with numpy --with schedulefree python checks/nqm_check.py`: the noisy-quadratic recursions against 4,000 seeded runs.
- `OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/sched_check.py`: schedule sparklines against torch.optim.lr_scheduler.
- `node checks/race_facts.mjs`: numbers the text quotes from the race. `python3 recompute.py`, `python3 ns_data.py`: every derived number.
- `node checks/check_controls.mjs`: clicks every control at 390 dark and 920 light, and fails if any step animation has moved before the reader acts.
- `python3 ../../../../../html_utils/ledger.py check <page>` (from the repo root: `python3 html_utils/ledger.py check technical_knowledge_base/models_and_training/topic_ml_fundamentals/optimisers_and_learning_rate_schedulers`).

## The 2026-10-24 rebuild to the teaching contract: what changed and why
- **Top**: the core idea in one sentence, a static hero (gradient, smooth, reshape, schedule, apply, with the state each box keeps; `22_js_rd_hero.js`), "You need", new terms, the dated takeaway. The old "In one screen" table is a closed reference block.
- **The race's results moved inline beside the claims they prove** (`47_js_mini.js`, the race's own engine and tuned rates): SGD against momentum and Nesterov on the ravine (section 1); the same five optimisers on the axis-aligned and the rotated ravine, a before/after (section 2, the diagonal limit); Adam and Nesterov on the noisy ravine under constant, cosine and WSD, a before/after (section 7). The prose that used to describe these in words became captions. The Optimiser race tab stays: it is the tool the whole page draws on (13 rules, 5 surfaces).
- **Mechanisms that had no visual got one**: Muon's five Newton-Schulz iterations as a stepper on the parent's real gradient (`46_js_ns.js`; this page owns Muon, key 3.4445; the parent's copy should become a link); L2-in-Adam against AdamW as a static derived chart of shrink per step against gradient noise (`48_js_wd.js`; the step animation of both is owned by Regularisation, section 3, and linked); the critical-batch trade-off with one slider (`49_js_batch.js`).
- **New section 6, batch size and the learning rate** (owned here per OWNERS.md and absent before): McCandlish et al.'s equations 2.11 and 2.12, Goyal et al.'s linear rule with gradual warmup, Malladi et al.'s square-root rule with its beta and epsilon rescaling. Verbatim extracts added to `inputs/extracts.txt`.
- **Into closed blocks**: the landscape vocabulary, the AdaGrad/RMSProp/AdaDelta lineage and beta2/epsilon practice, Newton and Shampoo's exponent, the memory counting rules, Muon's records and implementations, Lion's reported gains, the uncorrected-step numbers, the toy's method, cooldown length and final-rate evidence, schedule-free practice, WSM's results, eight more schedule shapes, the real-runs table, the annealing vocabulary (linked to Pretraining, which owns the anneal phase in practice), the mistakes as one checklist.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the endpoints and race controls no longer start playing on a mode switch.
- Corrections boxes kept visible.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 wpm) | 35.0 min | 28.8 min |
| Reading, closed details | 1.5 min | 13.6 min |
| Optimiser race | 3.7 min | 3.7 min |
| Visuals drawn in Reading | 2 | 9 |
Why about 29 minutes is right: the page teaches nine mechanisms (momentum, adaptive scaling and bias correction, decoupled decay, matrix preconditioning and state memory, orthogonalisation, sign updates, batch scaling, schedule shapes and their optionality, decay-free methods) plus the evidence table; it gained a whole owned section (batch size) and six visuals whose captions carry what prose used to describe, while lineage, provenance, reference tables and the mistakes list moved to closed blocks. Every core ledger unit is needed to understand one of these mechanisms.

## Knowledge ledger (`ledger.json`, problems 0)
347 units: core 230, depth 96, fat 21. 335 drafted by `ledger.py init` from the old page; 12 added by hand (script-rendered tables and the new batch, Muon, decay and sparse-step units). Fat units carry a `note` (navigation, citation fragments, transition sentences, pointers to parent visuals now replaced here).

## Departures
No real-model data beyond configs and one real gradient's singular values: the subject is update rules, so the "real data" is exactness (every rule checked against PyTorch). No photo: a mechanism page with nothing physical to show. The anneal-phase practice (data switch, microanneals) is owned by Pretraining and linked.
