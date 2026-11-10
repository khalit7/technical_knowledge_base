Source of the interactive HTML on the Notion page "Optimisers and learning-rate schedulers" (child of Topic: ml-fundamentals; storage key `optim-tab`).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 02 split, 10 header, `20_read_*.html` a to e, 35 race tab, 39 Further reading, then every JS part in order, 99 tabs last). The header's reading time is measured with `html_utils/audit_pages.mjs` and written into `10_header.html` by hand.

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

- 2026-10-24, topic close: the root card no longer describes the retired update-geometry and schedule widgets (Muon's Newton-Schulz now lives only in section 4 here); times set to headers. Ledger units 13 and 295 re-keyed, 300 to 307 keys without the old times.

2026-10-26 (final follow-up sweep): section 4 adds one line on Kimi K3's Per-Head Muon, linking the Kimi page that owns it.

2026-10-26 (final follow-up sweep, second batch): the "You need" pointer to Calculus and optimisation names its sections 4 (momentum's rate, 0.519 on diag(1, 10)), 10 (noise floor) and 11 (edge of stability).

## 2026-11-10: the split layout and six 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (after `02_css.html` in `build.sh`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `optim-tab`). The three inline mini-races (`47_js_mini.js`) and the Newton-Schulz stepper (`46_js_ns.js`) were replaced by stages and deleted; the endpoints animation in `44_js_end.js` became Fig. 6 (the part now only computes `END_RES` and writes the endpoint table). The bias-correction card (40 steps, two modes) and the race (100 frames) are long replays whose outcome is the point, so they are widgets (`auto:false`): no autoplay, no step list, opening on step 12 and on the last frame.

Stages (all data from the page's own engines; none invented):
- `60_js_sc_surf.js`: shared helper; a race surface as a mesh (height log10(1 + loss)) and runs of `OPTE` at `RACE_LR` as balls with trails.
- Fig. 1 `61_js_sc_mom.js`: SGD, momentum, Nesterov on the axis-aligned ravine; momentum's step along the floor against each gradient, close up.
- Fig. 2 `62_js_sc_ad.js`: per-coordinate steps (|g| and |step|/eta as columns per parameter), AdaGrad, RMSProp, Adam on both ravines, Shampoo's accumulated H^(-1/2) as a cross.
- Fig. 3 `63_js_sc_pre.js`: state to scale beside one Kimi K2 expert matrix (shape from `MEM_MODELS`): Adam, Muon, Adafactor, Shampoo's factors, SOAP's eigenbases.
- Fig. 4 `64_js_sc_ns.js`: the 32 real singular values through five Newton-Schulz maps (`NS_SV`), with the scalar map on a plate.
- Fig. 5 `65_js_sc_nz.js`: Adam and Nesterov on the noisy ravine under constant, cosine and WSD, the last 60 positions as a cloud; 20-seed averages computed as `checks/race_facts.mjs` does.
- Fig. 6 `66_js_sc_en.js`: three endpoints under cosine, WSD and schedule-free as rate curtains, then the expected losses (`END_RES`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D static | no |
| Reading | 1 Momentum | split | 3D Fig. 1 (replaces mini-race m1) | yes, 5 |
| Reading | 2 Adam and the diagonal limit | split | 3D Fig. 2 (replaces m2) | yes, 6 |
| Reading | 2 Bias correction, warmup | split | 2D widget | no |
| Reading | 2 AdamW | split | 2D static derived chart | no |
| Reading | 3 Beyond the diagonal | split | 3D Fig. 3 (new) | yes, 6 |
| Reading | 3 What the state costs | split | 2D table widget | no |
| Reading | 4 Muon | split | 3D Fig. 4 (replaces the 2D stepper) | yes, 5 |
| Reading | 4 Lion, 5 Evidence | full width | none / table | no |
| Reading | 6 Batch size | split | 2D slider widget | no |
| Reading | 7 Schedules, noise floor | split | 3D Fig. 5 (replaces m3) | yes, 4 |
| Reading | 7 Schedule table | full width | sparklines table | no |
| Reading | 7 Three endpoints | split | 3D Fig. 6 (replaces the 2D animation) | yes, 4 |
| Reading | 7 compare, 8, 9 | full width | none | no |
| Optimiser race | | full width (a tool used across the page) | 2D widget | no |
| Further reading | | unchanged | | |

Kept 2D: the hero (a flow of boxes reads flat), the bias-correction lanes and curve, the decay ratio on a log axis, the memory table, the critical-batch curve and the sparklines (curves and tables), the evidence table, the race (a reader-driven tool on contour maps).

Checks: `node src/check_stages.mjs <shots dir>` (from the repo root): every stage plays on view, steps to its last step with one list item per step, stops off screen, never moves under reduced motion; the widgets never move by themselves; the static step-list numbers equal the scenes' computed values, and several are recomputed independently (race_facts.json, NS_SV, the SOAP counting rule, the endpoint costs). `checks/check_controls.mjs` now checks the widgets stay where they open instead of the old never-autoplay rule.

Length: Reading core 29.1 to 33.3 min (230 wpm), closed 13.6 min (unchanged), race 3.7 min. The growth is the six step lists, which carry what the old captions and legend tables carried plus the mechanism each step shows (momentum's 9.8 times step along the floor, Adam's first step straight across the rotated valley, SOAP's 9.57 values per weight on one matrix); the duplicate provenance captions were cut to one line each. Ledger: 352 units (core 234, depth 96, fat 22), problems 0; five units added for the stages' new facts; one unit (the old endpoints play instructions) became fat; 22 Further-reading keys that contained minutes were re-keyed to the words after the time.
