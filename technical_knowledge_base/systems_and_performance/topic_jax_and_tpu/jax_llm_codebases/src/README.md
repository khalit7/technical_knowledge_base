# JAX LLM codebases: source of the page (prefix lc)

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root's build script; storage key `jx-lc-tab`).
`python3 -B build_data.py` regenerates `parts/22_js_lc_data.js` from `out/*.json` (never edit the generated file).

## Tabs and parts
- Reading (`t-read`): `parts/20_read_a.html` .. `20_read_h.html`; JS `24_js_lc_read1.js` (values, tiles, config demo, porting animation), `25_js_lc_read2.js` (logical-axis rules animation, sharding table), `26_js_lc_read3.js` (loss-difference chart, remat, MFU, LoRA, GRPO placement animation, Levanter table). Helpers: `21_js_rd_common.js` (copied from the root), `23_js_lc_util.js` (`LCU.anim` for any tab, source-reference links).
- Codebase map (`t-lcmap`): `31_tab_map.html`, `31_js_lc_map.js`, data `out/map.json`.
- Config explorer (`t-lccfg`): `32_tab_cfg.html`, `32_js_lc_cfg.js`, data `out/cfgdata.json` (+ `runs/cfg_flags.json`, this page's explanations).
- One train step (`t-lcstep`): `33_tab_step.html`, `33_js_lc_step.js`, data `out/train.json` (the recorded call trace).
- Further reading (`t-more`): `39_tab_more.html`.

## Runs (all 2026-10-15, Apple M1 Pro CPU, jax 0.11.2, `JAX_PLATFORMS=cpu`, `nice -n 15`, 4 threads)
| script | what | output |
|---|---|---|
| `runs/lc_cfg.py` | MaxText's `pyconfig.initialize` + `get_mesh_from_config` for 10 override sets (8 simulated devices) | `out/cfg.json` |
| `runs/lc_shard.py` | abstract models (Llama 2 7B, the running example as gpt3) with MaxText's shardings, 8 simulated devices | `out/shard.json` |
| `runs/lc_fwd.py` | the running example's weights inside MaxText's gpt3 decoder; logits against the root's plain-JAX twin | `out/fwd.json` |
| `runs/lc_train.py` | 200 steps of MaxText's own train step on the running example's batches; plain-JAX twin and four variants; Python call profile of steps 0 and 1 | `out/train.json` |
| `runs/lc_remat.py` | 6 remat policies x scan, compiled step memory/FLOPs/HLO size, 3 steps each | `out/remat.json` |
| `runs/lc_mfu.py` | MaxText's FLOP count for the tiering-table models; implied MFU | `out/mfu.json` |
| `runs/lc_tunix.py` | Tunix PeftTrainer on the running example; LoRA (qwix) against full fine-tuning | `out/tunix.json` |
| `runs/lc_haliax.py` | named-axis attention (Haliax) against plain JAX; Levanter's default axis mapping | `out/haliax.json` |
| `runs/lc_imports.py` | which MaxText/Tunix entry points import here | `out/imports.json` |
| `runs/lc_source.py` | every file:line the page quotes, located by pattern in the pinned clones | `out/source.json` |
| `runs/lc_map.py`, `runs/lc_cfgdata.py` | codebase map sizes and roles; 81 base.yml flags | `out/map.json`, `out/cfgdata.json` |

Checks: `python3 -B check_data.py` (embedded data = `out/*.json`; prose numbers = data), `node src/check_ui.mjs index.html [shots]` from the repo root (every control at 390 dark and 920 light), `sh html_utils/checkpage.sh <this folder>`.

## Scratch (not in the repo): how to recreate
The runs need a scratch folder `$JX_SCRATCH` (the topic's shared one, `scratchpad/jx`), which is not kept: the machine's reboot on 2026-10-15 wiped it. The page and its checks need none of it (the `out/*.json` files are the record); only re-running `runs/` does. To recreate:
1. venv: Python 3.12 via uv at `$JX_SCRATCH/venv` with jax and jaxlib 0.11.2, flax 0.12.10, optax 0.2.8, orbax-checkpoint 0.12.7, grain 0.2.18, torch (CPU) as in the root's `src/data/README.md`.
2. Pinned shallow clones in `$JX_SCRATCH/src` (under the download lock): `AI-Hypercomputer/maxtext` at 1a95d1e5371021aab8d0574c53d2cca425474318, `google/tunix` tag v0.1.7 (ce63a9fd65f02c4c398e74f000f98371c1575eb6), `marin-community/levanter` at 982cef7f1d8d1a642b825fcd30ab1b44a912f478, `marin-community/marin` at 1290cfb5e128214b7225bc7b0e98ac1e0a8044dc (sparse, `lib/levanter`). E.g. `git init; git remote add origin <url>; git fetch --depth 1 origin <sha>; git checkout FETCH_HEAD` (for marin first `git sparse-checkout set lib/levanter`).
3. A private overlay `$JX_SCRATCH/lc/site` installed with `uv pip install --python $JX_SCRATCH/venv/bin/python --target $JX_SCRATCH/lc/site --no-deps <pkgs>` so the shared venv is untouched. The 51 packages and versions are listed in `out/imports.json` (`overlay_packages`): the main ones omegaconf 2.4.0, pydantic 2.14.1, transformers 5.19.0, huggingface_hub 2.2.0, pathwaysutils 0.1.12, fastapi 0.143.2, qwix 0.1.8, drjax 0.2.1, aqtp 0.9.0, tokamax 0.0.12, ml_collections 1.1.0, google-metrax 0.2.4, clu 0.0.12, pandas 3.0.6, marin-haliax 0.2.180.dev38754195437. Use `uv pip install --dry-run --python <venv>` to see what the venv lacks, then install exactly those with `--no-deps`.
4. `runs/lc_env.py` puts the overlay and the clones on `sys.path`; run each script with `$JX_SCRATCH/venv/bin/python -I -B`.

## Departures from the method
A child page with three subjects (three codebases) rather than one mechanism: the Reading tab follows MaxText's five boxes and then Tunix and Levanter. The labs are the three the brief asked for. No `live.md`: the page is new (no old Notion text).
