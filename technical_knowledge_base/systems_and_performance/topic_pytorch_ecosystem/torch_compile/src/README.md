# Source of "torch.compile from the user's side"

Child 2 of Topic: pytorch-ecosystem (Notion 3c65c17b0d0d8123a232d75bd7339ecb; the old page "torch.compile: Dynamo, AOTAutograd, Inductor", retitled). Goes one level below the root's Reading section 5 and its Compile lab tab, on the same running example, which it imports from `../../src/model/` and never copies. The old page's text is `../../src/read/old/torch_compile.md`; every claim is accounted for in `coverage.md`.

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`, from `exp/`, each with its own empty `TORCHINDUCTOR_CACHE_DIR` in a scratch directory (never the default one, never inside the repo):

```sh
PY walk.py            # Dynamo's step() wrapped on the MLP, plus the eager ATen calls -> ../inputs/walk.json
PY fixer.py           # 9 break lines x fixes in Block.forward -> fixer.json
PY nested.py          # nested_graph_breaks on 4 small programs -> nested.json
PY dynamic.py         # 5 dynamic-shape strategies, unbacked symbols, recompile limit -> dynamic.json
sh pgo.sh PY <scratch>                                   # profile-guided dynamism across processes -> pgo.jsonl
PY aot.py             # partitioners on one block and the whole model (real Inductor path) -> aot.json
PY inductor.py        # scheduler nodes, fusion log, kernels, knobs -> inductor.json
docker run ... kb-gpu-lab-cs7:1 python triton_gen.py    # Triton for the same block, generated only (see its docstring) -> triton.json
PY ca.py              # compiled autograd -> ca.json
MASTER_ADDR=127.0.0.1 torchrun --nproc_per_node 2 --master_addr 127.0.0.1 --master_port 29521 ddp_compile.py   # -> ddp_compile.json
PY export.py <scratch>                                   # torch.export, draft_export, save, AOTInductor -> export.json
TORCH_TRACE=<dir> PY trace_run.py; tlparse <dir>/* -o <out> --no-browser; PY tlparse_extract.py <out>    # -> tlparse.json
cd <scratch>; PY exp/minify.py; PY torch_compile_debug/run_*/minifier/minifier_launcher.py > mini.log; PY exp/minify_extract.py <scratch> <seconds>   # -> minify.json
# timed, under the shared bench lock (lock.sh acquire bench tcp):
sh time_compile.sh PY <scratch> <lock.sh>                # fresh processes, cold/warm/mega and whole/regional/nested -> time_compile.jsonl
PY time_steady.py                                        # steady-state step times -> time_steady.json
cd .. && python3 build_data.py && sh build.sh && python3 check_data.py && node check_page.mjs ../index.html <shots dir>
```

Only `time_compile.jsonl` and `time_steady.json` are timings (bench lock, load average stored per run, 3 runs or 5 x 20 steps, medians and ranges). Everything else is deterministic, except the guard-latency line Dynamo prints (it varied between runs, said on the page) and AOTInductor's package size (a few KB between builds).

## Files

- `exp/common.py`: imports the running example; `logs()` captures torch's logging artifacts without TORCH_LOGS; `clean()` strips machine paths; `save()` refuses to write anything with a private string.
- `inputs/*.json`: the recorded outputs above (all small; no binaries).
- `build_data.py` writes `parts/22_tcp_data.js` (window.TCP); `check_data.py` checks the page embeds the current data, every prose number is a recorded value (or a listed constant with its reason) and nothing private or em dash is present; `check_page.mjs` clicks every control at 390 dark and 920 light.
- `parts/`: `20_read*.html` Reading (the idea, sections 1 to 13, closed depth), `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `05z_errbox.js.html`, `99_js_tabs.js` (storage key `tcp-tab`) and `../build.sh` the skill templates copied unchanged on 2026-11-12, `23_tcp_util.js` helpers, `24` the Dynamo walk stepper (7 and 6 explained stretches) and guard kinds, `25_tcp_rd_tables.js` the Reading tables, `26` the fusion stepper (5 steps) and code viewer, `27` the static SVG figures (dynamic-shape grid, partitioner trade-off, compile-time phase bars, per-run table), `28_tcp_rd_brk.js` the graph-break fixer (section 3.1, a widget), `29` predict wiring, `39` Further reading, and the 3D scenes `41_js_sc_call.js` (Fig. 1), `42_js_sc_brk.js` (Fig. 2), `43_js_sc_cut.js` (Fig. 3).
- `check_stages.mjs` (run `node src/check_stages.mjs` from the repo root): every stage and stepper plays when scrolled into view, steps to its end, has one list item per step, never moves under reduced motion, flows stop off screen, splits are two columns at 1400 px; screenshots of each mid-step into `../.shots/`.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`).
- `viz_ideas.md`, `coverage.md`.

## Shape

Follows the child-page method (Part B): Reading in the subject's own order (the pipeline stage by stage, then the features around it, then export, debugging, transfer to GPUs, mistakes, interview), then three labs the brief asked for. Departure: no "in production now" section of its own; production use (torchtitan's per-block fullgraph compile, DDPOptimizer) is read from source inside the sections it belongs to.

## The 2026-10-23 rebuild: what changed and why

Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing only, no new runs.

- **Top**: the core idea in one sentence, a hero figure (the three compilers on the first call, the guard check on every later call, the two off-ramps: a graph break and a recompile, each box carrying the running example's measured number), "You need", new terms, the six measured answers. The stage table is a closed block.
- **The three lab tabs moved into the Reading flow**, each beside the claim it proves: the Graph-break fixer into section 3 (its strip is now an SVG lane per block), the Partitioner explorer into section 5 (its saved-values table closed), and Compile time and caches into sections 9 and 10 as static stacked phase bars (the playback animation was dropped: the change over time was not the point, the split of the seconds is; the per-run table is closed). The page now has two tabs, Reading and Further reading.
- **New visuals**: the hero; the dynamic-shapes grid (six calls under five strategies at once, replacing a per-strategy per-call table); the partitioner trade-off plot (bytes kept against backward ops, replacing bars); the two phase-bar figures. All static SVG drawn at the measured width.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; a scripted check confirmed every stepper stays on step 0 until pressed.
- **Closed depth** (`details.dp`): earlier capture tools, the printed guard tree, guard-skipping APIs, dynamic=True's 4 compiles and mark_unbacked, unbacked graphs, PGO, the whole-model and larger-model partitioner numbers, Inductor knobs, the modes docstring and "lite", DDP under compile, the per-run timings, Dim.AUTO, control flow and saving a .pt2, tlparse and the minifier, mistakes and interview rehearsal (flattened to paragraphs inside two closed blocks).
- **Fixed**: the Model formats link (merged page) now points at section 3 of Local and on-device inference; quoted times of The compiler stack (37 min), Triton and Gluon (37), Streams (30) and Profiling (25) updated from their headers; a CSS typo that stopped the `.mech` cards forming a grid.
- **Deleted as fat**: headings and "The problem." wind-ups, pointers to the removed tabs, the cache tab's restatement of section 9's times.

## Length judgement

| | Before (2026-10-13 build, audit 2026-10-23) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 40.1 min | 31.8 min |
| Reading, closed details | 2.0 min | 14.2 min |
| Other tabs, core (excluding Further reading) | fixer 1.3 + caches 2.9 + partitioner 1.7 = 5.9 min | none (moved into Reading) |
| Core total, excluding Further reading | 46.0 min | 31.8 min |
| Visuals counted by the audit in Reading (SVG, canvas, img) | 0 | 6 |

Why about 32 minutes is right: the page owns the whole of torch.compile from the user's side (capture, guards, breaks, recompiles and dynamic shapes, the partitioner, fusion, modes, compiled autograd, compile time, caches, export, debugging), thirteen mechanisms each with a measured number on the running example and a picture beside it. About a fifth of the core words are captions, counters and tables of the visuals (stepper captions, the recompile warning, the export outcomes, the code viewer). What made the old page long without teaching more (provenance, per-run tables, the printed tree, knobs that changed nothing, investigations of oddities, mistakes and interview answers) is now closed; nothing in the ledger was dropped except headings, wind-ups and tab pointers.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)

357 units: core 256, depth 72, fat 29. 331 were drafted from the old page by `ledger.py init`; 26 were added by hand for script-rendered figures and tables (field `added`), each keyed to its static title or caption. Fat units carry a `note`. No unit is labelled `owned:` or `volatile`.

## Close of the topic (2026-10-23)

Sibling and neighbour reading times in Further reading set to each page's header; Tensors, the dispatcher and autograd's section numbers updated (functionalisation and fake tensors are its Reading 2.5); Making training fast's compile memory budget is its section 9.

## The 2026-11 rollout: split layout, three 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged (see Files). No new runs: every scene draws from `window.TCP` (`inputs/` via `build_data.py`, unchanged). The build script is the template's (it writes the em-dash detector as bytes; the old one held the character).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea in one screen (core sentence, Fig. 1) | split | **3D** `stg-call` Fig. 1: one call into a compiled function; the compilers write cache entry 0/0, then section 4's six recorded calls walk the entries' guards (fail, pass, recompile), then the recompile limit | yes, 6 |
| Reading | intro, You need, terms, six answers, stage table, neighbours | full width | cards, table | no |
| Reading | 1 Dynamo | split | Dynamo walk (2D `RD.anim`, two modes; long replay grouped into stretches that play their instructions one by one) | yes, 7 and 6 |
| Reading | 2 Guards | full width | stat tiles, closed tree | no |
| Reading | 3 Graph breaks | split | **3D** `stg-brk` Fig. 2: a print in `Block.forward`, frame by frame (one 101-op graph; `GPT.forward` abandoned; two pieces of 18 and 5 ops around the print; 8 piece calls per forward; the fix) | yes, 5 |
| Reading | 3.1 Each kind of break | split | graph-break fixer (2D widget: no stepping, no autoplay) | no (widget) |
| Reading | 4 Recompiles (first part) | split | dynamic-shapes grid (2D, side) | no |
| Reading | 4 rest: numbers, limit, unbacked, PGO | full width | stats, code | no |
| Reading | 5 AOTAutograd | split | **3D** `stg-cut` Fig. 3: the block's 144-op joint graph, forward in front, backward behind, the cut as a glass wall; saved activations and recomputed ops per cut | yes, 6 |
| Reading | 5 numbers, predict, when it matters | split | partitioner trade-off plot (2D, side) | no |
| Reading | 6 Inductor | split | fusion stepper (2D `RD.anim`) | yes, 5 |
| Reading | 6 code viewer, knobs; 7 Modes; 8 Compiled autograd | full width | code, tables | no |
| Reading | 9 Regional, 10 Caches | split | phase bars (2D, side) | no |
| Reading | 10 rest, 11 to 13, Depth | full width | tables, boxes | no |
| Further reading | | unchanged | | |

What changed and why:
- **The static hero became Fig. 1.** The page's core claim is a sequence (first call compiles; later calls check guards in order; a miss compiles another entry), so it plays as one; the cache entries in depth are the per-frame cache. Steps 2 to 5 are section 4's recorded default-strategy run (exp/dynamic.py) with its logged reasons; step 1 quotes the training step's measured numbers (the old hero's), said in the caption; step 6 is the recompile-limit run.
- **Fig. 2 is new.** It shows the frame-level reason a break inside the block loop costs the caller, with the print row of exp/fixer.py; the sibling Extending PyTorch's Fig. 2 draws a similar split op by op (linked, not redrawn). The fixer that animated one segment per frame (up to 14) became a widget: pick a line and broken or fixed, the lane shows the whole forward.
- **The joint-graph explorer became Fig. 3.** The cut has spatial structure (forward and backward rows, a wall between them, values crossing it, their bytes as height and dot count). Its tap-an-op readout went; the per-cut saved-values table stays closed and follows the figure's step.
- **The Dynamo walk** (36 and 32 instructions, one per frame) is grouped into 7 and 6 explained stretches; stepping forward plays each stretch's instructions. Its per-instruction captions moved into the two step lists. **The fusion stepper** went from 9 states to 5 (the six round-1 fusions grouped by LayerNorm, said in step 3); its captions moved into the step list and the paragraph after it was cut (the list carries it).
- **Kept 2D**: the dynamic-shapes grid (a table of calls against strategies), the partitioner trade-off (a scatter), the phase bars (timings), the code viewer, every table. **No 3D for the modes** (the brief's third candidate): the page has no per-mode compile-time measurement (the root lab's first-call times per mode came from one process with a warm cache) and the CUDA-graph paths were not run here; drawing them would be illustrative. Proposal: three fresh-process cold compiles per mode under the bench lock (about 10 s each on this model, a few minutes in all). **No real images**: the page is about software; a photo teaches nothing here.
- Condensed: section 3's "where the break sits" paragraph (Fig. 2 carries it), section 5's "lower budgets" sentence (Fig. 3 step 6), the walk card's note (the list carries the counts).
- CSS: `#t-read .an-ctl` now excludes the stage bar (`:not(.stg-bar)`), so the stage controls keep the template's layout; long `.mech` headings wrap.

### Length judgement (2026-11-12)
| | Before (audit 2026-11-12, before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 31.8 min (7,316 words) | 36.8 min (8,457 words) |
| Reading, closed details | 14.2 min (3,267 words) | 14.2 min (3,272 words) |
| Further reading | 587 words | 587 words |
| Visuals drawn in Reading (audit) | 6 | 8 |

The extra core words are the step lists of the three stages and two steppers (29 items, about 1,400 words), most of which were script-written captions before (invisible to the audit: the walk's per-instruction captions, the fusion and explorer captions, the hero's labels) and are now written out beside their figures, as the rollout asks; prose the figures now carry was cut. The 2026-10-23 judgement stands: thirteen mechanisms, each with a measured number and a picture.

### Knowledge ledger
357 units: core 256, depth 72, fat 29; problems 0. Re-keyed: 157 ("10 nodes, 4 C++ kernels", the fusion list's last step), 301 (Fig. 3 step 1); the texts of 135, 332, 333, 344 and 347 describe the new figures.
