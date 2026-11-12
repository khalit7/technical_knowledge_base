# JAX LLM codebases: source of the page (prefix lc)

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root's build script; storage key `jx-lc-tab`).
`python3 -B build_data.py` regenerates `parts/22_js_lc_data.js` from `out/*.json` (never edit the generated file).

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)
- Reading (`t-read`): `parts/20_read_a.html` (styles, nav, the idea: core sentence and Fig. 1 with its step list, you need, new terms, status table, provenance) .. `20_read_h.html` (closed depth blocks); JS `24_js_lc_read1.js` (values, config demo, porting animation), `25_js_lc_read2.js` (every-parameter sharding table), `26_js_lc_read3.js` (loss-difference chart, remat, MFU, LoRA, GRPO placement, Levanter table), `27_js_lc_step.js` (the traced train step in eight stretches), `41_js_sc_hero.js` (Fig. 1, 3D), `42_js_sc_shard.js` (Fig. 3, 3D, with the rule trace table). Helpers: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js`, `99_js_tabs.js` (skill templates, unchanged; storage key `jx-lc-tab`), `23_js_lc_util.js` (number formats, source-reference links, predict-then-reveal).
- Codebase map (`t-lcmap`): `31_tab_map.html`, `31_js_lc_map.js`, data `out/map.json`.
- Config explorer (`t-lccfg`): `32_tab_cfg.html`, `32_js_lc_cfg.js`, data `out/cfgdata.json` (+ `runs/cfg_flags.json`, this page's explanations).
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

Checks: `python3 -B check_data.py` (embedded data = `out/*.json`; prose numbers = data), `node src/check_ui.mjs index.html [shots]` from the repo root (every control at 390 dark and 920 light under reduced motion, plus a normal-motion pass that fails unless every animation and stage plays once in view), `node src/check_stages.mjs [shots]` (autoplay, step counts, step lists, reduced motion, off-screen pause, split layout at 1400, 920 and 390 px), `sh html_utils/checkpage.sh <this folder>`, `python3 html_utils/ledger.py check <this folder>`.

## Scratch (not in the repo): how to recreate
The runs need a scratch folder `$JX_SCRATCH` (the topic's shared one, `scratchpad/jx`), which is not kept: the machine's reboot on 2026-10-15 wiped it. The page and its checks need none of it (the `out/*.json` files are the record); only re-running `runs/` does. To recreate:
1. venv: Python 3.12 via uv at `$JX_SCRATCH/venv` with jax and jaxlib 0.11.2, flax 0.12.10, optax 0.2.8, orbax-checkpoint 0.12.7, grain 0.2.18, torch (CPU) as in the root's `src/data/README.md`.
2. Pinned shallow clones in `$JX_SCRATCH/src` (under the download lock): `AI-Hypercomputer/maxtext` at 1a95d1e5371021aab8d0574c53d2cca425474318, `google/tunix` tag v0.1.7 (ce63a9fd65f02c4c398e74f000f98371c1575eb6), `marin-community/levanter` at 982cef7f1d8d1a642b825fcd30ab1b44a912f478, `marin-community/marin` at 1290cfb5e128214b7225bc7b0e98ac1e0a8044dc (sparse, `lib/levanter`). E.g. `git init; git remote add origin <url>; git fetch --depth 1 origin <sha>; git checkout FETCH_HEAD` (for marin first `git sparse-checkout set lib/levanter`).
3. A private overlay `$JX_SCRATCH/lc/site` installed with `uv pip install --python $JX_SCRATCH/venv/bin/python --target $JX_SCRATCH/lc/site --no-deps <pkgs>` so the shared venv is untouched. The 51 packages and versions are listed in `out/imports.json` (`overlay_packages`): the main ones omegaconf 2.4.0, pydantic 2.14.1, transformers 5.19.0, huggingface_hub 2.2.0, pathwaysutils 0.1.12, fastapi 0.143.2, qwix 0.1.8, drjax 0.2.1, aqtp 0.9.0, tokamax 0.0.12, ml_collections 1.1.0, google-metrax 0.2.4, clu 0.0.12, pandas 3.0.6, marin-haliax 0.2.180.dev38754195437. Use `uv pip install --dry-run --python <venv>` to see what the venv lacks, then install exactly those with `--no-deps`.
4. `runs/lc_env.py` puts the overlay and the clones on `sys.path`; run each script with `$JX_SCRATCH/venv/bin/python -I -B`.

## The 2026-10-23 rebuild: what changed and why
- **Ownership**: this page owns the JAX LLM codebases (MaxText, Tunix, Levanter, EasyDeL, Pax/Saxml history), what each optimises for, how a config maps to sharding and the training stack, and which to start from. Mechanisms are linked, not taught: tracing and scan against a loop (JAX core), meshes and PartitionSpec (Sharding and scale), NNX split/merge and Orbax (the training stack), cost analysis of scanned loops (XLA and compilation), porting defaults (PyTorch to JAX).
- **Top**: the core idea in one sentence; a new static hero (`28_js_lc_hero.js`): five boxes of a trainer against the running example, MaxText, Tunix and Levanter, the cell each codebase is built for highlighted; "You need"; six new terms; the status table. The summary tiles, the "How to read one" section and the five-box tiles were folded into the hero and the core sentence.
- **New section 10, Which one to start from**: a job-to-codebase table (judgements drawn from the page's sections) and the equivalence-test rule. **Saxml** added to section 9 (README quote, tags and commits read from GitHub on 2026-10-23), so the Pax/Saxml history is complete.
- **One train step moved inline**: the traced-step stepper is now section 4's visual for "Python runs once" (`27_js_lc_step.js`, tab `t-read`). The Codebase map and Config explorer stay as tabs: both are reference tools used across the page.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `jx-lc-tab`); `LCU.anim` no longer starts playing when first scrolled into view.
- **To closed details**: provenance and the CPU attention fallback, the per-tensor conversion table, every-parameter sharding table, remat run details and MaxText's checkpoints, the Tunix run code and the LoRA toy, Levanter's packaging and Marin, what to copy, the real errors, four design questions.
- **Deleted as fat** (31 ledger units): the tiles, nav and reading-time lines, wind-ups, section headings restated as sentences, mistakes and interview answers that restated a section (the override error, typo, LayerNorm, GELU, warmup, MFU, remat entries now live once in their sections).
- **Further reading**: sibling times updated to their measured values (JAX core 38+25, XLA 34+14, training stack 29+20, PyTorch to JAX 25+17, Sharding and scale 38+28, TPU 27+13, Libraries on top of PyTorch 23+12, Distributed PyTorch 30+19); the root and Pallas kernels were being rebuilt and keep their old times.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute) | 34.8 min | 27.3 min |
| Reading, closed details | 4.0 min | 7.9 min |
| Other tabs, core | map 1.4 + config 1.8 + step 2.0 = 5.2 min | map 1.4 + config 1.8 = 3.2 min |
| Further reading | 3.1 min | 3.1 min |
| Visuals drawn in Reading (svg) | 6 | 7, plus the traced-step stepper (HTML) |

Why 27 minutes is right: the page covers three codebases plus the others, and its core is mostly measured findings nobody else in the knowledge base holds (MaxText's step equal to a plain-JAX loop within float32 rounding, the three silent differences and their sizes, the rule-order explanation of two-dimensional FSDP, the remat measurements, the MFU table matching the pre-July-2025 count, the Tunix pin skew). About a third of the core words are script-rendered tables, captions and the 90 traced function names the reader scans rather than reads. The stepper moved in from a tab (2 min), so the drop from 40 to 30.5 core minutes across tabs is the real saving.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
347 units: core 247, depth 69, fat 31. 332 drafted by `ledger.py init`; 15 added by hand for script-rendered visuals (keys written into their static titles and captions) and for the two new units (Saxml, which to start from). Fat units carry a note.

## Departures from the method
A child page with three subjects (three codebases) rather than one mechanism: the Reading tab follows MaxText's five boxes and then Tunix and Levanter. The labs are the three the brief asked for. No `live.md`: the page is new (no old Notion text).

2026-10-26 (final follow-up sweep): the PEFT and LoRA paper card quotes their headers (22 and 21 min) instead of "about 30 min each".

## The 2026-11 rollout: split layout, two 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `jx-lc-tab`), `05z_errbox.js.html`. `build.sh` now writes the em-dash it looks for as bytes. No new runs: both scenes draw from `LC` (`out/*.json` via `build_data.py`, unchanged).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1: four towers of the same five boxes, slab labels with measured lines per part (`out/map.json`, summed by the map's own groups) | yes, 5 |
| Reading | You need, new terms, status table, provenance | full width | table | no |
| Reading | 1 Config | split | config demo (ten recorded parses, a select) | no (widget) |
| Reading | 2 Model | split | 2D porting animation, three tensors (`RD.anim`) | yes, 5, 4, 4 (one list per tensor) |
| Reading | 3 Sharding | split | **3D** `stg-shard` Fig. 3: a Llama 2 7B weight as a glass plate, MaxText's rules, the spec, blocks flowing to 8 chips; weight and mesh choosers; rule trace table beside the list | yes, 5 |
| Reading | 4 Train step | split | traced-step stepper, 17 stages in 8 stretches (`RD.anim`), step 1 mode | yes, 8 and 3 |
| Reading | 4 Same computation? | split | loss-difference chart, five variants | no (reader picks a variant) |
| Reading | 5 Scan, remat | split | remat bars and table | no |
| Reading | 6 MFU | full width | table | no |
| Reading | 7 Tunix trainer | full width | code, LoRA in details | no |
| Reading | 7 RL placement | split | 2D GRPO step, colocated against disaggregated (`RD.anim`) | yes, 7 (the last item covers both placements) |
| Reading | 8 Levanter, 9 Others, 10 Start from, Depth | full width | code and tables | no |
| Codebase map, Config explorer | | full width | reference tools used across the page | no |
| Further reading | | unchanged | | |

What changed and why:
- **Fig. 1 replaced the 2D five-box hero** (`28_js_lc_hero.js`, removed): the codebases are stacks of the same layers, so depth shows "same structure, different investment" at once; the camera moves in close on each tower and the towers close up for the side-by-side step. The cell texts are the old hero's; the slab labels add measured lines per part, which also shows that MaxText's sharding code is small (1,262 lines) because the rules are config data. A faint slab is a box with no part of its own in the map.
- **Fig. 3 replaced the 2D rule-walk animation** (in `25_js_lc_read2.js`): the old animation had a variable number of steps per weight and mesh (one per applicable rule); the stage has five fixed steps and the per-rule walk is now a table written beside the list (`#lc-rt`), with the spec checked against MaxText's recorded one. A mesh of chips is spatial; the plate and blocks show which slice each chip holds and where replication happens.
- **Every 2D animation is `RD.anim` with a step list** (porting, traced step, GRPO); `LCU.anim` (never autoplay) was removed. Per-step captions moved into the lists (`lc-port-cap`, `st-cap`, `lc-grpo-cap` deleted). The traced step had 17 stages, over the long-replay limit: it now steps through 8 explained stretches, each lighting all the functions of its stages (`window.LC_STEP_CHECK` still proves every one of the 90 functions belongs to a stage). The four porting bullets were folded into the porting step lists and one summary sentence.
- **Kept 2D**: the loss-difference chart (log axis), remat bars, MFU, Levanter and status tables (tables stay text), the porting animation (flat 2-D layouts of a tensor with colour per head read clearly; a 3D version was considered and not built), the GRPO placement (no recorded numbers: Tunix's RL was not run here, so a 3D loop would be decoration).
- **No real images**: the page is about code; the hardware it targets (TPU pods) has its photos on the hardware topic's pages.

### Length judgement (2026-11-12)
| | Before (audit 2026-11-12, before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute) | 27.3 min | 33.9 min |
| Reading, closed details | 7.9 min | 7.9 min |
| Other tabs | map 1.4, config 1.8, further reading 3.2 | unchanged |
| Visuals in Reading (audit count: svg, canvas, img) | 7 | 7 (two 3D canvases replace two SVGs) |

The rise is measurement, not new prose: the step explanations of four animations used to be one script-written caption at a time (the audit counted only the first step's), and are now static step lists that the audit counts in full, including the lists of modes not shown (porting has three tensors, the traced step two modes). New words beyond those: Fig. 1's list (it replaces the old hero caption) and the rule trace table. Nothing was cut that the ledger holds.

### Knowledge ledger
347 units: core 247, depth 69, fat 31; `ledger.py check` problems 0. Keys updated for reworded units 76, 77, 80, 81, 99, 100 (the old rule-card and porting captions).
