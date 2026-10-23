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
- `parts/`: `20_read*.html` Reading (the idea, sections 1 to 13, closed depth), `21_js_rd_common.js` and `99_js_tabs.js` the skill templates (storage key `tcp-tab`; nothing plays until the reader acts), `23_tcp_util.js` helpers, `24` the Dynamo walk stepper and guard kinds, `25` the Reading tables, `26` the fusion stepper and code viewer, `27` the static SVG figures (hero, dynamic-shape grid, partitioner trade-off, compile-time phase bars, per-run table), `28_tcp_rd_brk.js` the graph-break fixer (section 3), `28_tcp_rd_part.js` the joint-graph explorer (section 5), `29` predict wiring, `39` Further reading.
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
