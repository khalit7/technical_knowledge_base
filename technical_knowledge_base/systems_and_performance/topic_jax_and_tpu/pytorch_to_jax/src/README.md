# PyTorch to JAX child page: source

Build: `sh build.sh` (runs `runs/make_data.py`, which gathers `runs/out/*.json` and the few root numbers the page quotes into `parts/22_js_pj_data.js` as `window.PJ`, then assembles `../index.html`). Prefix `pj` for ids, classes and the storage key (`pj-tab`).

## Shape and why

Follows `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page): a Reading tab in the order a port is done (translate, defaults, weights, equivalence test, drift, a Hugging Face model, interop, when not to port, mistakes, interview questions) and three lab tabs. It goes deeper than the root's Training lab and links it instead of repeating it: the root's port panes, its seven pitfall runs and its 4,000-step twins are cited and reused (curves read from `../../src/train/out/`), not rebuilt or rerun.

## Parts

- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the root via the jax_core page (title and storage key changed). `23_js_pj_util.js`: helpers adapted from jax_core's (data-k spans, predict-then-reveal, source excerpts from several repositories).
- `10_header.html`: page CSS (scoped `pj-` classes), title, tab bar.
- `20_read_a.html` to `20_read_d.html`: Reading tab. `24_js_pj_read.js`, `25_js_pj_read2.js`: its visuals (map, stats, mask cards, fast-variance bars, dropout curves, the ladder animation, tolerance table, float64 bars, drift, GPT-2 table, mistakes, interview questions).
- `31_*` Divergence hunter, `32_*` Weight conversion, `33_*` Port drills (HTML and JS each); `39_tab_more.html` Further reading.

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

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_ui.mjs`: every control in every tab at 390 dark and 920 light (all ladder variants, every drill candidate, every tensor row, both tile sources), no errors, no undefined/NaN in numeric cells, no sideways scroll. `check_data.py`: embedded data equals a fresh build from `runs/out`, all data paths resolve, prose numbers agree with the data.
