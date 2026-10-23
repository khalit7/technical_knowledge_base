# Source of "Topic: jax-and-tpu"

Root of the topic (storage key `jx-tab`). Built 2026-10-15 by a team of tab agents (`read/`, `xf/`, `xla/`, `train/`, `shard/`, `tpu/`, `map/`, each with its own README; the running example is `data/`). Rebuilt on 2026-10-23 at the topic close, after its eight children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the PyTorch, CUDA and inference roots.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`. Children import `data/` and read `xf/out`, `train/out`, `shard/` and `tpu/` files: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 8, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- Page checks, all clean on 2026-10-23: `node src/read/check_read.mjs index.html`, `node src/read/check_ui.mjs index.html`, `node src/xf/check_ui.mjs index.html <shots>`, `python3 src/xf/check_data.py`, `node src/xla/check_tab.mjs index.html <shots>`, `python3 src/xla/check_data.py`, `node src/train/check_train.mjs <shots>`, `node src/train/check_chain.mjs`, `node src/shard/check_tab.mjs index.html <shots>`, `python3 src/shard/check_tab.py`, `node src/tpu/check_tab.mjs index.html <shots>`, `python3 src/tpu/check_tab.py`, `node src/map/check_tab.mjs index.html <shots>`, `python3 src/map/validate.py` (paths from the page folder, node from the repo root). The checks were updated for the retired widgets.
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the labs' own animation controllers no longer start on scroll, and the Sharding lab's collective and ring switches no longer start playing.

## Tabs
| Tab | Decision on 2026-10-23, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). Section numbers 1 to 9 kept, because children cite them. |
| Transforms lab `t-xf` | **Kept** for what no child owns (the attention traced line by line, loops against lax, immutable arrays and clamping, the parameter pytree, grad against PyTorch per parameter, per-example gradients timed, the toy tracer, footguns). Sections 3 (jit drills), 4 (side effects) and 6 (keys) **retired**: JAX core absorbed them (sections 3 and 10); each became a one-paragraph stub with the link. |
| Compiler lab `t-xla` | **Kept** (XLA and compilation names it the owner of the overview: five forms, MLP-block fusion, donation, remat, scan). The pass-count chart (section 3) and the memory bars (section 4) **retired**: they duplicated XLA and compilation sections 3 and 6; the donation numbers stay as text. Kernel count reads 816 (top-level kernels), as the child reconciles. |
| Training lab `t-train` | **Kept**; the port panes (section 3) and the seven pitfall runs (section 4) **retired** to PyTorch to JAX (section 1 and the Divergence hunter, which replays the seven runs); section 4 keeps the three lessons. |
| Sharding lab `t-shard` | **Kept**; section 1's sharded-weight animation and `visualize_array_sharding` print **retired** to Sharding and scale section 1 ("One weight, six PartitionSpecs"). |
| TPU and Pallas lab `t-tpu` | **Kept**; the TensorCore drawing (section 1) and the MXU tile animation (section 2) **retired** to TPU programming and performance (hero, section 4); the per-core table, the source notes, the VMEM prediction and the running example's MXU utilisations stay. Go deeper names the children's current tabs and sections. |
| Tool map `t-map` | Kept: the dated atlas a root owns. |
| Further reading `t-more` | This page's tabs with measured times; child cards with current titles and each header's time. |

Retired parts are in `retired/parts/` (HTML and scripts, for reference; the data stays in the `0data` files).

## What changed in the Reading tab
- **Top**: the core idea in one sentence; a hero that is a static map of one train step through five layers, each passing a program to the next (highlighted), with the PyTorch counterpart and the owning child and lab of each layer; "You need"; eleven new terms; the running example.
- **Sections 1 to 9** keep the definitions and the one cross-layer fact, and end in a Go deeper note naming the owning child's sections. Kept because they span children or compare: the eager against jit animation, the compiler strip, the training-stack table, the strategy table and the six measured layouts, the memory widget, the generations table and the decode prediction, the codebases and MaxText MFU tables (now stating that the published figures match the pre-July-2025 non-causal FLOP count), JAX against PyTorch, choosing.
- **Into closed blocks**: the real jaxpr with the GELU trap and stackless tracing, the scan cost-analysis and donation details, the train-step code, Explicit-mode and multi-host details, the collective-count provenance, v5e bandwidth and Ironwood notes, the interpret-mode kernel results and the old-page corrections. Mistakes and interview rehearsal are closed under "Depth".
- **Child cards**: current titles, one line each, reading time as each header states it.

## Length judgement
| Tab | Before (230 words a minute, `html_utils/audit_pages.mjs`) | After |
|---|---|---|
| Reading | 33.2 + 8.6 | 27.5 + 12.6 |
| Transforms lab | 28.3 + 9.3 | 22.1 + 9.4 |
| Compiler lab | 22.3 + 1.9 | 20.8 + 1.9 |
| Training lab | 26.8 + 3.2 | 22.3 + 3.2 |
| Sharding lab | 18.4 + 2.4 | 17.6 + 2.4 |
| TPU and Pallas lab | 25.7 + 5.4 | 24.9 + 5.4 |
| Tool map | 11.9 + 1.2 | 11.9 + 1.2 |

Why about 28 minutes: the topic is a stack taught from zero for a PyTorch user, so the root holds the definitions every child assumes (tracer, jaxpr, pytree, key, HLO, mesh, collective, MXU, VMEM, ICI), the hero map, and the comparisons only a root can make: the training-stack table, the strategy table with the compiler's own collectives for six layouts, the generations table, the codebases table and JAX against PyTorch row by row (about 1,600 words of tables). Each section ends in a link instead of a mechanism. Closed time grew because the root's own measurements that no child carries moved into closed blocks rather than being cut. The audit counts no SVG in the Reading: its figures are HTML diagrams and bars (hero, eager/jit lanes, compiler strip, memory bars).

## Knowledge ledger (`ledger.json`)
1,123 units drafted by `ledger.py init` from the page before the rebuild: core 817, depth 235, owned 44 (JAX core 29, PyTorch to JAX 6, XLA and compilation 4, Sharding and scale 2, TPU programming and performance 2, torch.compile 1; counts by the labelling script), fat 27; problems 0. Keys were found by script (the longest distinctive phrase of each unit on the rebuilt root, then on a child; units of retired sections tried their owner first), core or depth by whether the key sits only in a closed block, and the residue labelled by hand (`"manual": true`). Fat units carry a `note`: wind-ups, headings, old child-card times, instructions of retired widgets.
