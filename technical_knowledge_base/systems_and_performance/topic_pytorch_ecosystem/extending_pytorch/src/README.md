# Source of the Extending PyTorch page

Build: `sh src/build.sh` (writes `../index.html`). Data: `python3 src/build_data.py` turns `inputs/*.json` into `parts/22_ext_data.js`; `python3 src/check_data.py` checks the page embeds exactly that data and that every number in the prose is in it (or in its short list of sourced constants).

## Parts
- `01_head.html`: copied from the root (title changed). `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` (autoplays on view), `05z_errbox.js.html`, `99_js_tabs.js` (storage key `pt-ext-tab`) and `build.sh`: the explainer-page skill templates, copied unchanged on 2026-11-12. `10_header.html`: title, "Reading: N min, plus M in closed details." subtitle, tab bar.
- Reading: `20_read_a.html` (style), `20_read_b` (nav; the idea in one screen: core sentence, hero, you need, new terms, the hook table), `c` (1 custom ops), `d` (2 under compile, the two traps), `e` (3 C++), `f` (4 Metal, Triton, Helion), `g` (5 subclasses, with the tracer), `h` (6 modes; Depth: PrivateUse1, NVIDIA GPUs), `i` (closed interview rehearsal), `z` (close). JS: `23_ext_rd.js` (fills `data-v`/`data-q`, tables, predict widgets, SVG timing bars), `26_ext_rd_fig.js` (custom-op slot stepper, cache-trap diagram, plug diagram), `27_ext_rd_sub.js` (the subclass tracer, a widget), and the 3D scenes `41_js_sc_hero.js` (Fig. 1), `42_js_sc_dyn.js` (Fig. 2), `43_js_sc_sub.js` (Fig. 3).
- Tabs: `31_*` Which extension point? (decision tree), `32_*` Custom-op lab, `39_tab_more.html`.
- Checks: `check_data.py` (data and prose numbers), `check_controls.mjs` (every control in every tab at 390, 920 and 1400 px; the tracer widget never moves by itself; nothing moves under reduced motion; run from the repo root with the built page as argument), `check_stages.mjs` (the three stages and the stepper play when scrolled into view, step to the end, one list item per step, nothing moves under reduced motion, flows stop off screen, splits are two columns at 1400 px; `node src/check_stages.mjs`), `ledger.json` (`python3 html_utils/ledger.py check`).

## Experiments (`exp/`, shared venv python, torch 2.14.1; set `EXT_SCRATCH` to a scratch folder and put the venv's bin on PATH for ninja)
| Script | Writes | What |
|---|---|---|
| `gelu_ext.cpp`, `cpp_ext.py` | | the C++ GELU (TORCH_LIBRARY `extc` + pybind functions), built with `load_inline` |
| `custom_ops.py` (and `--cpp-fresh`) | `custom_ops.json`, `custom_ops_cpp_fresh.json` | ten registrations: eager grads, dynamo.explain, compile fullgraph, opcheck per test |
| `cache_trap.py` | `cache_trap.json` | four processes sharing one compile cache (the AOTAutograd cache trap) |
| `op_extras.py` | `op_extras.json` | schema inference, Inductor wrapper code, data-dependent fake, CPU+MPS (Metal) op, duplicate TORCH_LIBRARY abort |
| `graphs.py` | `graphs.json` | per-graph op lists for the Dynamo animation; torch.export with/without the op |
| `subclasses.py`, `subclasses_int8.py` | `subclasses.json` | __torch_function__ vs __torch_dispatch__ traces; the Int8Weight subclass eager/compiled/AOT graph |
| `real_subclasses.py` | `real_subclasses.json` | DTensor (1-rank gloo, port 29550), NF4, torchao Int8, Float8 flattened; FakeTensorMode, FlopCounterMode |
| `helion_k.py`, `helion_ref.py` | `helion.json` | Helion 1.4.0 metal backend on MPS (PYTHONPATH to the unpacked wheel, not installed), ref mode on CPU |
| `quotes.py` | `quotes.json` | source lines at torch v2.14.1, torchao v0.18.0, helion v1.4.0 |
| `timing.py` | `timing.json` | the only timed runs (bench lock, load avg 2.6 to 3.7): per call, step, int8 forward, cold build |

Every script uses a private Inductor cache (`common.py`): a warm shared cache can hide registration changes (see `cache_trap.py`).

## The 2026-10-23 rebuild to the teaching contract: what changed and why
Editing only, no new runs; every number still comes from `inputs/` through `22_ext_data.js`.
- **Top**: the core idea in one sentence ("every extension plugs your code into one slot on the path a call takes; autograd, compile and export keep working only if you supply the output's shape, the gradient and what is written"), a static hero (the call path with six slots, the three facts highlighted), "You need", new terms, and one comparison table that merges the old section 0 table and section 8 decision table (need, hook, autograd, compile, measured here). Section 8 and the four "kind of extension" cards were deleted as duplicates; the six link cards as a duplicate of the nav.
- **Visuals inline, beside their claims** (the audit counted 0 because the old animations were HTML boxes, not drawings): new custom-op slot stepper on the recorded kernel-only, + fake and + fake + autograd variants (1.1); the Dynamo animation now draws the forward as an SVG strip to scale by operations (2.1); new cache-trap diagram (2.3, replacing a table that moved to a closed block); timing bars as SVG (3.2, 5.4); new plug diagram, what the compiler sees for custom_op, triton_op and Helion (4); the Subclass tracer tab moved into 5.1 (it explains one mechanism), with its stack drawn as SVG; the int8 before/after drawn as SVG (5.3).
- **Closed blocks** now hold the source quotes at pinned tags, the dispatch dumps, the schema table, the data-dependent graph, the opcheck test list, Helion's status table and generated kernel, the real subclasses taken apart and the FSDP2 hooks, the FLOP-count gaps, PrivateUse1, what carries over to NVIDIA GPUs, and the interview rehearsal (flattened to one block).
- **Correction made visible** (1.7): the old opcheck table said `test_autograd_registration` catches a C++ op left on the autograd fallback; the page's own recorded grid shows it passing for that op (`cpp_bare`), so the table now says so in a Checked box.
- **Ownership**: the dispatcher and autograd mechanisms stay on Tensors, the dispatcher and autograd; references to its removed Dispatcher walker tab now point at its Reading 2.2, and its renumbered sections (fallbacks 2.3, functionalisation and fake tensors 2.5, autograd.Function 3.4, dispatch cost 2.6 with 4.818 and 0.622 µs) are cited by their current numbers.
- **Common mistakes** were deleted as fat except three lines that added something (return `x.clone()`, `TORCHINDUCTOR_AUTOGRAD_CACHE=0`, which ATen ops a wrapper subclass must return itself for), folded into 1.3, 2.3 and 5.2.
- **Further reading**: times updated to the rebuilt pages (sibling and CUDA pages as their headers say on 2026-10-23), the CUDA root added (25 min), the tracer card removed.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 42 min (9,735 words) | 31 min (7,165 words) |
| Reading, closed details | 5 min (1,123 words) | 13 min (2,937 words) |
| Other tabs, core | 7 min (pick 51, lab 497, tracer 361, further reading 606 words) | 5 min (pick 57, lab 497, further reading 660 words) |
| Visuals drawn in Reading (audit) | 0 | 8 |

Why 31 minutes is right: the page teaches six mechanisms that have no other owner in the knowledge base (custom operators and their three facts, what compile and export do with them and two silent-gradient traps, C++ extensions, plugging kernels, tensor subclasses, dispatch modes), each with recorded evidence; about 1,700 of the core words are code that ran, tables (the comparison table, the opcheck grid) and recorded error messages (counted by section with a DOM walk), and more are the captions and counters of the visuals. What made the old page long without teaching (source quotes, dumps, per-item tables, mistakes that restated sections, the interview answers, PrivateUse1 and the GPU notes) is now closed or deleted as fat, which is why the closed time grew.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
336 units: core 237, depth 63, fat 35, owned 1. 325 were drafted from the old page by `ledger.py init`; 11 were added by hand for the script-rendered visuals and tables (section "added 2026-10-23"), each keyed to a phrase in a static caption. Fat units carry a `note` saying why (headings, navigation, wind-ups, and mistakes or cards that restated a section). The one owned unit (the dispatcher keeps a table of kernels per key) is carried by Tensors, the dispatcher and autograd, Reading 2.3.

## Departures from the child-page method
No old page, so no `live.md`/`coverage.json`; corrections to claims in the old root notes are in `coverage.md`. The "compare everything" pattern became a lab (ten variants side by side) and a chooser, since the subject is choices among mechanisms rather than a dataset.

## Close of the topic (2026-10-23)

Sibling reading times in Further reading set to each page's header; the Which extension point? card for autograd.Function now points to Tensors, the dispatcher and autograd Reading 3.4 (it said 3.6, the checkpointing section).

## The 2026-11 rollout: split layout, three 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged (see Parts). No new runs: every scene draws from `window.EXT` (`inputs/` via `build_data.py`, unchanged).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea in one screen (core sentence, You need, terms) | split | **3D** `stg-hero` Fig. 1: one call to `ext::gelu2` down the keys as glass plates, then its CPU and MPS kernels, then the fake at Meta | yes, 7 |
| Reading | Which hook for which need (table) | full width | table | no |
| Reading | 1, 1.1 Custom operators, defining one | split | slot stepper (2D `RD.anim`, sticky) | yes, 3 |
| Reading | 1.2 to 1.7 schema, mutation, fake, gradient, devices, opcheck grid | full width | tables and recorded errors | no |
| Reading | 2, 2.1 Dynamo traces the forward, export | split | **3D** `stg-dyn` Fig. 2: every recorded op of one forward as a box, graphs as glass trays; direct call against custom op | yes, 6 and 5 (mode toggle) |
| Reading | 2.2 Inductor, cost, 2.3 trap 1 | full width | generated code side by side | no |
| Reading | 2.3 trap 2 (the warm cache) | split | cache-trap diagram (2D) | no |
| Reading | 3, 3.1 C++ extension | full width | code | no |
| Reading | 3.2 What it costs | split | per-call bars (2D, toggle) | no |
| Reading | 3.3 build, one TORCH_LIBRARY | full width | none | no |
| Reading | 4 Kernels that plug in | split | plug diagram (2D) | no |
| Reading | 4.1 to 4.3 Metal, Triton, Helion | full width | code | no |
| Reading | 5, 5.1 two intercept points | split | subclass tracer (2D widget, never autoplays: hundreds of recorded calls) | no (widget) |
| Reading | 5.2 Wrapper subclasses | full width | none | no |
| Reading | 5.3 Build one: Int8Weight | split | **3D** `stg-sub` Fig. 3: the wrapper, qdata and scale; `t`, `addmm`, `mm` through `__torch_dispatch__`; the float32 temporary; the plain output; flattened under compile | yes, 7 |
| Reading | 5.4 Under torch.compile | split | int8 forward timing bars (2D) | no |
| Reading | 5.5, 6, Depth | full width | none | no |
| Which extension point? | | full width | decision tree (tool) | no |
| Custom-op lab | | full width | two variant columns (tool) | no |
| Further reading | | unchanged except one stale time | | |

What changed and why:
- **The static hero became Fig. 1.** The slots on the call path are a stack, and the point is a call moving down it; the kernels drawn and the filled Autograd slot are read from `ext::gelu2`'s recorded dispatch table, so the stage shows only what was registered (ADInplaceOrView is drawn as an empty, dashed slot because the op mutates nothing). The 2026-10-23 rejection of a dispatcher walk stands for the general walk: the sibling Tensors, the dispatcher and autograd owns it (Reading 2.2, linked under the figure); this figure is about where an extension plugs in, which this page owns.
- **The 2.1 Dynamo animation became Fig. 2.** It replayed 22 positions one per frame (the long-replay rule): now 6 explained stretches for the direct call and 5 for the custom op, with every one of the 101 recorded operations drawn as a box and each compiled graph as a tray (four trays and a lifted red break per block, against one tray for everything). Its per-step caption and counters moved into the two step lists; the prose paragraph after it was cut to the cost and the reason (what the figure now shows was said twice).
- **The 5.3 float32 against int8 animation became Fig. 3.** The wrapper is spatial (a shell with no storage holding two inner tensors), and the mechanism is calls arriving, being unwrapped and run on the inner tensors; volumes are bytes (the scale column is drawn thicker than to scale, said in the step). Its byte stats moved into the step list.
- **The 1.1 stepper** keeps its drawing and gains a step list (its captions); it autoplays on view. **The subclass tracer** became a widget: no autoplay, no step list, opening on the weight's first forward call (`auto:false`, `start`).
- **Kept 2D**: the stepper (a table filling), the cache-trap diagram, timing bars, the plug diagram (three flat structures), the opcheck grid, every table. No real images: the page is about software APIs, and the hardware it ran on teaches nothing here.
- `24_ext_rd_anim.js` was deleted (both its animations became stages); `25_ext_rd_sub.js` was renamed `27_ext_rd_sub.js` so the renderer loads first by name.

### Length judgement (2026-11-12)
| | Before (audit 2026-11-12, before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 31.2 min (7,165 words) | 34.7 min (7,974 words) |
| Reading, closed details | 13.1 min (3,010 words) | 13.1 min (3,010 words) |
| Other tabs, core | pick 57, lab 497, further reading 686 words | unchanged |
| Visuals drawn in Reading (audit) | 8 | 9 |

The 809 extra core words are the step lists of the three stages and the stepper (28 items), most of which were script-written captions before (invisible to the audit) and are now written out beside their figures, as the rollout asks; the 2.1 paragraph the figure now carries was cut. Nothing else changed in length, so the 2026-10-23 judgement stands.

### Knowledge ledger
337 units: core 237, depth 64, fat 35, owned 1; problems 0. Re-keyed: 73 (the Dynamo sentence now begins "Fig. 2 replays"), 170 (the int8 card's title became the step "1024 × 256 numbers at 4 bytes each"); the texts of the four units for script-drawn visuals (326, 327, 330, 334) describe the new figures.
