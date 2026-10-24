# Flow matching and rectified flow: sources and build

Child page 3 of Topic: generative-and-multimodal (prefix `fm`, scratch key `fm`). Built 2026-10-17. `sh build.sh` writes `../index.html` from `parts/`.

## Shape (rebuilt 2026-10-24 to the teaching contract)
Tabs: Reading, 2-D flow playground, Further reading. Since 2026-10-24 this page owns flow matching and rectified flow (OWNERS.md) and teaches it from zero; it absorbed the root Flow lab's first layer (the objective, the solvers at equal NFE and the t = 1 Heun trap, flow against diffusion, the one-family view, the convention bugs, guidance in one paragraph), reading the lab's recordings through `make_data_more.py` and never recomputing them.

| Part | What |
|---|---|
| `10_header.html` | page CSS, h1, subtitle with the reading time, tab bar |
| `20_read_a.html` | nav; the idea in one screen: core sentence, static hero (train on one pair, learn the average, sample by following u), You need, New terms, running example, the knob table, labels and convention |
| `20_read_b.html` | 1 training (illustrative numbers, formula, code, the one-step blur predict with strips); 2 the marginal field (average-the-lines widget, loss floor charts); 3 few steps fail for the exact field |
| `20_read_c.html` | 4 the exact optimum copies; 5 solvers and grids at equal NFE (solver error chart from the root's recording) |
| `20_read_d.html` | 6 paths and the one-family view (new clock visual: where 4 uniform steps land, lambda = a/(a + b)); 7 couplings |
| `20_read_e.html` | 8 reflow (inline before/after card, the playground engine with four fixed comparisons; toy and image round tables); 9 distillation |
| `20_read_f.html` | 10 flow against diffusion at equal cost (was the Steps ladder tab: chart, same-noise before/after by NFE, class grid closed), guidance in one paragraph |
| `20_read_g.html` | 11 timestep sampling and the resolution shift (was the Timestep explorer tab: densities with sliders, recorded error by t, shift calculator; tables closed) |
| `20_read_h.html` | 12 stochastic sampling; 13 production (pattern open, model table closed) |
| `20_read_y.html`, `20_read_z.html` | 14 when it goes wrong (closed items, with the root's convention-bug strips); interview rehearsal (closed); sources (closed) |
| `31_tab_fmpath.html`, `31_js_fmpath.js` | the playground; the JS is one engine with two instances (the tab, and the Reading section 8 card) |
| JS | `22_js_fm_0data.js` (FMD, `make_page_data.py`), `22_js_fm_0more.js` (FMY, `make_data_more.py`), `23_js_fm_core.js` (helpers; its step controller never autoplays and resets to step 0 on a mode change), `24_js_fm_field.js` (toy exact field and solvers), `25_js_fm_read.js`, `32_js_fmsteps.js` (section 10), `33_js_fmts.js` (section 11), `99_js_tabs.js` (skill template, key `fm-tab`) |

`build.sh` assembles the page, then `fill_static.py` writes every recorded number (`data-fmf`, `data-fmy`), the script-built tables and the code blocks into the HTML as static text, so they are visible without scripts and to `html_utils/ledger.py`.

## Runs (all in `runs/`, outputs in `out/`)
| script | what | where |
|---|---|---|
| `fm_toy.py` | exact marginal field of the ring for three paths; DDIM = Euler check; loss floor; the root network against the exact field; SDE with exact score; reflow rounds 3 and 4; three one-step students; minibatch OT cost and OT-CFM at B = 4, 16, 64; six timestep schemes x 3 seeds x 2 budgets. Writes `out/toy.json` (with int8 weights of the new networks) | CPU, about 7 min |
| `fm_memo.py` | exact empirical field of the Fashion-MNIST training set (class-conditional), sampled from the root's noise; nearest-training-image distances against the root's trained model and held-out images. `out/memo.json`, `out/memo_strips.npz` | CPU, 30 s |
| `fm_ot_images.py` | coupling travel distance on Fashion-MNIST pixels: random, minibatch OT by B, the reflow pairs | CPU, 15 s |
| `fm_sched_demo.py` | diffusers 0.41.0 flow scheduler with FLUX.2 [klein]'s real config: grids, e^mu identity, the missing-mu error | CPU, 1 s |
| `fm_pairs.py` | 30,000 (noise, end point) pairs from a flow checkpoint, midpoint 25 steps (the root's `make_pairs.py` recipe) | MPS, bench lock |
| `fm_train.py` | `--mode reflow` (3-RF from 2-RF) or `--mode distill` (one-step student, t = 0, L2) | MPS, bench lock |
| `fm_score.py` | the root's scoring (FD, accuracy, diversity, 1,000 samples, seed 11) for the new models; re-score of the root's 2-RF; SDE sampling of the root's 1-RF | MPS, bench lock |

Large files (pairs, checkpoints) live in the shared scratch folder under `fm/` and are not committed. Run order: `fm_toy.py`, `fm_memo.py`, `fm_sched_demo.py`; GPU: `fm_pairs.py` (rf2), `fm_train.py` (rf3, rf2d), `fm_pairs.py` (rf1), `fm_train.py` (rf1d), `fm_score.py`; then `fm_ot_images.py` (reads the pairs), `make_page_data.py`, `sh build.sh`, `python3 check_data.py`, `node check_page.mjs`.

## Inputs
`inputs/published.md` (every published quote and number with its source), `inputs/sd3_tables.json` (SD3 Tables 1 and 2), `inputs/scheduler_configs.json` (six scheduler configs read from the Hub at pinned revisions).

## Checks
`python3 check_data.py` (embedded data equals the recordings, including FMY against the root's data part; facts used exist and are filled; code and scheduler output equal their sources; literal numbers in sections 6, 8, 10, 11 and 12 checked), `node check_page.mjs [shots dir]` (every control at 390 px dark and 920 px light), `python3 ../../../../html_utils/ledger.py check <page>`. Notes: `viz_ideas.md`, `coverage.md`, `facts.md`, `ledger.json`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence and a static three-panel hero; You need; New terms; the running example. The old "In one screen" bullets were recaps of sections and were cut (ledger: fat); the knob table stays as the page map.
- **Absorbed from the root Flow lab** (ledger section "absorbed from the root Flow lab", 24 units): section 1 from zero (example numbers, formula, the `cfm_loss` code, library line references, the one-step blur with the root's strips), section 5 (solvers, the solver-error chart, the t = 1 measurement, Heun with a last Euler step), section 6's one-family view, section 10's flow-against-diffusion numbers and guidance, section 14's convention bugs with the root's strips.
- **Tabs moved into Reading** because each explained one mechanism: Steps ladder (section 10), Timestep explorer (section 11). The playground stays a tab (a workbench used by sections 2, 3, 6, 8, 9 and 12), and its engine now also drives an inline before/after card in section 8, so the reflow comparison sits beside the claim.
- **New visuals**: the hero; the solver-error chart (root recording); the clock of section 6 (where four uniform steps land on each path, derived and checked in `check_data.py`); one-step against fifty-step strips; the convention-bug strips.
- **Closed depth**: the exact-field code, library references, the toy solver ranking, Gu et al. and Kamb and Ganguli, the published few-step methods list, the class grid, the timestep and SD3 tables, the production table, all mistakes, interview, sources.
- **No autoplay**: the page's own controller (`FMX.anim`) no longer starts on scroll; a check scrolls the whole page and finds every scrubber at 0. In the reflow card the particles are grey at step 0 so the prediction prompt is not answered by colour.
- **Fixed on the way**: a garbled sentence in the SDE section ("the score, the score is ... nearminus;"); numbers now static.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 35.7 min (8,222 words) | 36.2 min (8,318 words) |
| Reading, closed details | 4.8 min | 16.8 min |
| Other tabs, core | playground 1.7 + Steps ladder 1.6 + Timestep explorer 2.4 = 5.7 min | playground 1.7 min |
| Core total, excluding Further reading | 41.4 min | 37.9 min |
| Visuals drawn in Reading (audit) | 5 (plus 6 in tabs) | 16 |

Why about 36 minutes is right: the page now carries flow matching from an empty start, which used to take the root's Flow lab (about 30 minutes) plus this page (41 minutes across four tabs); the core stayed level while absorbing the lab's from-zero half because the in-one-screen recap, wind-ups and per-item tables were cut or closed. Every core unit in the ledger serves one of the 13 mechanism sections, a large share of the core words are card titles, captions and predict prompts beside the 16 visuals, and the long passages left (sections 8, 10 and 12) are this page's own measured findings with their numbers.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
405 units: core 286, depth 71, fat 48, owned 0, volatile 0. 381 drafted from the old page by `ledger.py init` (keys chosen by a script that prefers a distinctive phrase or decimal number present in the new page, then reviewed); 24 record what was absorbed from the root Flow lab (`where` empty: they live here). Fat units carry a `note` (headings, wind-ups, the in-one-screen recaps, pointers to removed tabs).

## Departures from the page-kind shape
- **Two data parts**: `make_page_data.py` needs numpy and Pillow (the shared generative venv); the absorbed recordings come through plain-Python `make_data_more.py`, which embeds the root's 70 KB sprite sheet for the convention-bug strips.
- **No real photographs**: a mechanism page; the canonical rectified-flow figures are arXiv figures without an open licence, so they are redrawn (hero, clock) rather than embedded.
