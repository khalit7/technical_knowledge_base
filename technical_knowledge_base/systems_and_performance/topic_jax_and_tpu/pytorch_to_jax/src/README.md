# PyTorch to JAX child page: source

Build: `sh build.sh` (runs `runs/make_data.py`, which gathers `runs/out/*.json` and the few root numbers the page quotes into `parts/22_js_pj_data.js` as `window.PJ`, then assembles `../index.html`). Prefix `pj` for ids, classes and the storage key (`pj-tab`).

## Shape and why

Follows `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page) under the teaching contract: a Reading tab in the order a port is done (the core idea and a hero, then four differences on one training step, defaults, weights, the ladder test, drift, a Hugging Face model, interop, the checklist and when not to port; traps and interview rehearsal closed) and two lab tabs (Divergence hunter, Port drills). It goes deeper than the root's Training lab and links it instead of repeating it: the root's port panes, its seven pitfall runs and its 4,000-step twins are cited and reused (curves read from `../../src/train/out/`), not rebuilt or rerun.

## Parts

- `01_head.html`, `05z_errbox.js.html`: copied from the root via the jax_core page. `21_js_rd_common.js`, `99_js_tabs.js`: the skill templates (2026-10-23; nothing plays before the reader acts), storage key `pj-tab`. `23_js_pj_util.js`: helpers adapted from jax_core's (data-k spans, predict-then-reveal, source excerpts from several repositories).
- `10_header.html`: page CSS (scoped `pj-` classes), title, tab bar.
- `20_read_a.html` to `20_read_d.html`: Reading tab. `24_js_pj_read.js` (hero, the side-by-side code stepper, conversion stats, mask cards, fast-variance bars, dropout curves), `25_js_pj_read2.js` (the ladder animation, tolerance table, float64 bars, drift, GPT-2 table, mistakes, interview questions), `26_js_pj_conv.js` (the transpose animation and the 69-tensor explorer, moved from the old Weight conversion tab).
- `31_*` Divergence hunter, `33_*` Port drills (HTML and JS each); `39_tab_more.html` Further reading.
- `prefill.mjs` (run by `build.sh`): writes every `data-k` value into the static HTML with the page script's own lookup and formats, so the numbers read without scripts and `html_utils/ledger.py` can check them.

## Runs (src/runs/, each writes out/<name>.json)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
cd src/runs
P="JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"
env $P pj_defaults.py        # every default that differs, measured alone (seconds)
env $P pj_hunt.py            # 10 new port variants x 300 steps + ladder rungs for all 18; reuses the root's 7 curves (10 to 30 min under load)
env $P pj_ladder.py float32; env $P pj_ladder.py float64   # equivalence ladder in both precisions, bf16 logits (a few minutes each)
env $P pj_dropout.py         # dropout twins: torch, JAX fresh keys (2 seeds), reused key, none (5 to 15 min)
env $P pj_convert.py         # safetensors both ways, rule-based name map, conversion errors (seconds)
env $P pj_gpt2.py            # GPT-2 small by hand vs transformers (about 2 min; needs $JX_SCRATCH/pj/gpt2 and pj/site)
env $P pj_interop.py         # DLPack, a jax2torch bridge, torchax 0.0.13 (fails) and main d95b0a5b (works)
env $P pj_drills.py          # the drills' snippets and candidates, executed as shown
$JX_SCRATCH/venv/bin/python -I -B read_source.py   # excerpts located by pattern in jax, flax, optax, tunix clones and the torch, transformers wheels
cd .. && sh build.sh && python3 -B check_data.py
NPM_CONFIG_USERCONFIG=<empty file> node <this folder>/check_ui.mjs <page folder>/index.html [shots]   # from the repo root
```

`pjcommon.py` holds shared helpers (paths, scrubbing of captured messages, timing). Extra packages (transformers 5.19.0, safetensors 0.8.0, torchax) are installed in `$JX_SCRATCH/pj/site` and `pj/site_txmain`, outside the shared venv, and appended to `sys.path` by the scripts that need them (recorded in the shared SETUP.md). GPT-2's checkpoint (548 MB) and the safetensors files stay in `$JX_SCRATCH/pj/`.

## What is deterministic and what is not

Deterministic, no caveat: logits, losses, gradients, parameter differences, loss curves with fixed seeds and batches, error messages, shapes, source line numbers. Rough (labelled on the page): CPU and wall times (1-minute load average 30 to 85 during the runs).

## Checks

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_ui.mjs`: every control in every tab at 390 dark and 920 light (all ladder variants, every drill candidate, every tensor row, both tile sources, the code stepper), no errors, no undefined/NaN in numeric cells, no sideways scroll. `check_data.py`: embedded data equals a fresh build from `runs/out`, all data paths resolve, prose numbers agree with the data.

## The 2026-10-23 rebuild to the teaching contract

What changed and why (editing only; no new runs, every number still comes from `runs/out/` or the root's recorded files):
- **Top**: the core idea in one sentence (four kinds of hidden state become arguments and return values of one pure, compiled step; a port is that rewrite plus a ladder test), a new static hero (the same training step in both frameworks, the four kinds of state colour-coded), "You need" linking JAX core and Tensors, the dispatcher and autograd instead of re-teaching them, and a shorter new-terms table. The clickable page map, the stats tiles and the five-line method box were cut (navigation and restatement); the method now opens section order in one sentence and closes the page as the checklist.
- **Section 1 is new**: the four mental-model differences (mutable modules against pure functions, implicit RNG against keys, `.grad` against returned gradients, optimiser state, plus eager against traced) as a side-by-side stepper over the root's real `model_torch.py` and `model_jax.py` lines, differing lines highlighted, one caption per difference. The 13-row translation table is kept whole in a closed block.
- **Moved inline**: the Weight conversion tab explained one mechanism, so its transpose animation (with the GPT-2 Conv1D before/after) now sits in section 3 beside the claim; the 69-tensor explorer and the conversion errors are closed blocks there. The tab is gone.
- **To closed blocks (depth)**: fast variance, source excerpts, conversion errors, the float64 Adam amplifier explanation, the key-bias puzzle, step times, Tunix and MaxText excerpts, interop measurements, the traps table and interview rehearsal (now plain answers, not nested folds).
- **New**: section 8's porting checklist (eight items, each pointing to the section that measured it), which the ownership row asks this page to own.
- **No autoplay**: template `21_js_rd_common.js`; the ladder no longer starts playing when the port is changed. Checked with normal and reduced motion: no scrubber moves until a control is pressed.
- **Images**: none. The page is about code and numerics; there is no physical object or canonical figure a photo would make concrete.

## Length judgement

| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 29.2 min | 24.6 min |
| Reading, closed details | 6.5 min | 17.3 min |
| Other tabs, core | hunter 2.8, weight conversion 2.3, drills 0.9, further reading 2.8 | hunter 2.8, drills 0.9, further reading 2.9 |
| Visuals drawn in Reading (audit count: svg, canvas, img) | 1 | 3 (plus HTML visuals: code stepper, ladder, mask cards, tile, bars) |

Why about 25 minutes is right: the core now carries the four state differences with their code, all twenty defaults (the table is the page's most valuable artefact, about 750 words, every row measured), the weight rule with its animation, the ladder with its float64 test, drift, GPT-2's three contradicting facts and the checklist. About a quarter of the core words are code lines and step captions of the new section 1 stepper, and another fifth the defaults table; both are read as visuals. What made the old page long (excerpts, conversion errors, the key-bias and Adam derivations, measurements of each interop tool, traps and interview answers) is now closed and optional. The audit counts hidden step captions and the ladder's option labels as core words, so the measured core slightly overstates what a reader reads at once.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)

213 units: core 151, depth 37, fat 25. 194 were drafted from the old page by `ledger.py init` (table rows arrived merged into a few units); 19 were added by hand (section "added 2026-10-23") for individual default-table rows and script-rendered content (dropout result, float64 amplifier, GPT-2 table, traps table, interview answers), each with a key that appears in static text. Numbers in `data-k` spans are now prefilled at build time, so they are visible to the check. Fat units carry a `note` saying why.
