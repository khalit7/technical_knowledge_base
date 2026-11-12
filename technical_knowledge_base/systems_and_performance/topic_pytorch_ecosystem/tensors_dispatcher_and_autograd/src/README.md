# Source of "Tensors, the dispatcher and autograd"

Child 1 of Topic: pytorch-ecosystem. Goes deeper than the root's Reading sections 1 to 4 and its Inside one step tab (which records one whole training step; this page does not rebuild it, it links it). Imports the root's running example (`../../src/model/`), never copies it.

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`, from `src/exp/`, and `SRC` a directory holding the v2.14.1 files listed in `quotes.py` and `dispatch.py` (fetched from `https://raw.githubusercontent.com/pytorch/pytorch/v2.14.1/<path>`):

```sh
PY tensors.py > ../inputs/tensors.json
PY dispatch.py $SRC > ../inputs/dispatch.json      # also reads native_functions.yaml / derivatives.yaml from $SRC
PY autograd_graph.py > ../inputs/engine.json
PY autograd_lab.py > ../inputs/autograd.json
PY module_loop.py > ../inputs/module.json
PY dataloader.py > ../inputs/dataloader.json
PY howto.py   (inputs/howto.json holds this script and its output; see the comment at its end)
python3 quotes.py $SRC > ../inputs/sources.json
PY timing.py > ../inputs/timing.json               # the only timed script: hold the bench lock
python3 sanitize.py ../inputs/*.json               # strips build-machine and local paths from error texts
cd .. && python3 build_data.py && sh build.sh && python3 check_data.py
```

Everything except `timing.json` is deterministic, except where the page says otherwise (MPS runs are not bit-repeatable: measured and reported).

## Files

- `exp/tensors.py`: 36 tensors on three arange bases plus the running example's q, k, v; errors; channels_last; promotion grid and cases; finfo; version counters; metadata; pinned memory.
- `exp/dispatch.py`: key priorities, TLS sets per context, key sets of 12 tensor kinds, dispatch tables, slot statistics over all 3,113 aten ops, the instrumented custom-op walk in 8 situations, aten calls seen at the top and at the Python key in 4 contexts, the autograd fallback, schemas and YAML entries, autocast on the running example (CPU bf16, MPS bf16 and fp16), functionalization graphs, meta and fake tensors.
- `exp/autograd_graph.py`: one block's graph, saved tensors, recorded backward order, aten calls per node; plain, offload hooks and checkpointed on CPU and MPS; the engine's scheduling rule re-run (matches the record in all variants).
- `exp/autograd_lab.py`: the 14 version-counter cases, hooks order, retain/create graph, a custom Function with gradcheck, anomaly mode, grad modes, checkpoint variants on the whole model, reentrant gotchas, engine threads.
- `exp/module_loop.py`, `exp/dataloader.py`: registration, saving and loading with tied weights, strict loading, forward hooks, zero_grad, accumulation, clipping, AMP and fp16 underflow counts, GradScaler, determinism, worker seeding, pin_memory.
- `build_data.py` writes `parts/22_tda_data.js`; `check_data.py` checks the embedding equals the inputs and every prose number is in the data (or a listed constant with its reason).
- `check_controls.mjs` clicks every control at 390 px dark and 920 px light and checks nothing moves by itself under reduced motion; `check_stages.mjs` checks the four 3D stages (play when scrolled into view, step to the end, one list item per step, nothing moves under reduced motion, no redraws off screen, splits are two columns at 1400 px) and that the three widgets never play by themselves; `shot_el.mjs` screenshots single Reading elements for review (run all three from the repo root).
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).
- `viz_ideas.md`, `coverage.md`.

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)

| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles), `20_read_b` (nav, the idea in one screen: core sentence, hero, you need, new terms; section 1 tensors), `20_read_c` (section 2 dispatcher), `20_read_d` (section 3 autograd), `20_read_e` (section 4, a pointer: modules and the loop now live on Making training fast; depth: GPUs, mistakes, interview), `20_read_z`; JS (as of 2026-11-12): `21_js_rd_common.js` (the skill template, autoplays on view), `22_tda_data.js` (TDA), `23_tda_rd_ten.js` (helpers, tensor tables), `24_tda_rd_dsp.js` (key ladder, slot statistics, aten-call explorer), `25_js_s3.js` (renderer v2), `25_tda_rd_ag.js` (autograd tables), `26_tda_rd_eng.js` (the engine explorer, a widget), `27_tda_rd_ver.js` (version-counter lab, a widget, and mechanism figure), `29_tda_rd_figs.js` (custom Function diagram, checkpoint bars), scenes `41_js_sc_hero.js` (Fig. 1), `42_js_sc_ten.js` (Fig. 2), `43_js_sc_walk.js` (Fig. 3), `44_js_sc_graph.js` (Fig. 4) | sections 1 to 3 core with their visuals, section 4 a short pointer, the depth section closed |
| Stride explorer `t-tda-str` | `31_tab_str.html`, `31_tda_str.js` | unchanged: 36 recorded tensors plus 8 from the running example, every address |
| Further reading `t-more` | `39_tab_more.html` | |

Storage key `tda-tab`.

## The 2026-10-23 rebuild: what changed and why

- **Top**: the core idea in one sentence and a static hero (one `torch.mm(x, w)` as a header over storage, the four keys it walks with the skipped ones struck, and the `MmBackward0` node backward will run), "You need" and eight new terms. The old "In one screen" table is a closed reference block.
- **Every mechanism has its visual inline** (the audit found 0 for 12k words; the old visuals were HTML cells the audit could not see and, worse, the strongest ones sat in four lab tabs):
  - strides over storage: the view against `.contiguous()` before/after, now an SVG stepper with the address arrow;
  - dispatch keys: a new static ladder with the wheel's enum numbers;
  - the key set and the walk: the old Reading walk and the Dispatcher walker tab merged into one SVG stepper with two situations side by side (all eight recorded situations);
  - the dispatch table: slot statistics over 3,113 operators as SVG bars;
  - the autograd graph: the Autograd engine tab moved inline and extended with a forward phase (nodes appear in sequence-number order), so one stepper shows the graph built in forward and walked backward, with a saved-bytes curve over both;
  - version counters: a new three-state mechanism figure, and the Version-counter lab moved inline;
  - custom `autograd.Function`: a new static diagram of how it plugs into the graph;
  - checkpointing: new bars for memory after forward, backward calls and recomputed matmuls (plain, non-reentrant, reentrant).
- **Tabs**: Dispatcher walker, Autograd engine and Version-counter lab each explained one mechanism, so they moved into the Reading flow (the walker's aten-call explorer is a closed block in 2.6). The Stride explorer stays a tab: it is an explorer over 44 recorded tensors and free strides, used from all of section 1.
- **Depth into closed blocks**: channels_last, dtypes and promotion, devices and pinned memory, thread sets per context, per-op tables, schemas, the autocast per-op table, functionalisation graphs and meta/fake traps, overhead bars, the engine's C++, version-counter tables, hooks, retain/create graph, anomaly mode, every measured detail of modules and the loop (which this page does not own as a concept), GPU carry-over, mistakes, interview rehearsal.
- **Numbers written statically** where scripts used to fill spans (errors, gradients, counts, timings), so the ledger check and `check_data.py` see them; `check_data.py` gained three constants with their derivations (8.93 MB, 33,812, 1.46e-06).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key kept); `check_controls.mjs` reports nothing playing under reduced motion.
- **British spelling** in prose (functionalisation, materialise, initialisation, optimiser); API names unchanged.

## Close of the topic (2026-10-23): modules and the loop handed to Making training fast

- Section 4 shrank to one paragraph: what nn.Module adds (a parameter is a leaf with an `AccumulateGrad` node, a state_dict is names over storages, module backward hooks are autograd hooks), the tied-weight load trap stated in this page's terms (one storage, two names), and a link to Making training fast: Reading section 7 (the loop and the module), section 6 (the GradScaler), section 4's closed block (workers and seeds). Its six closed blocks (registration, loading, forward hooks, the loop with the float16 drill, determinism, DataLoader) and their scripts in `25_tda_rd_ag.js` were removed; Making training fast carries them with the same recorded data (`module.json`, `dataloader.json`, still embedded here and checked by `check_data.py`).
- Depth: the five loop mistakes (strict loading, tied weights, accumulation, clipping before unscaling, manual_seed), the two loop interview questions (GradScaler, state_dict count) and the determinism and float16 rows of the carry-over table went with them (Making training fast has each). Mistakes 13 to 8, interview questions 12 to 10.
- Ledger: 32 units relabelled `owned:systems_and_performance/topic_pytorch_ecosystem/making_training_fast` after checking each key is in its built page; six were re-keyed to the wording there (191 `persistent=False`, 192 `walk that tree`, 200 `leave the later one`, 205 `must be unscaled before clipping`, 216 `deterministic mode raises on ops without a deterministic kernel`, 227 `tied weights break safetensors`), and unit 65 to `hold, counting each entry's tensor` because Making training fast writes its derivation from a script. Unit 201 (loading an untied checkpoint into a tied architecture) is not on Making training fast, so it stays here, in section 4's paragraph.
- Reading time from a fresh audit: 24 min core (5,407 words), 29 min closed (6,599 words); before this change 24 and 37.
- Sibling and neighbour times in Further reading set to each page's header; Memory allocators states no time, so its time was dropped. A stale "Version-counter lab" pointer in 3.3's closed block now points to the stepper above it.

## Length judgement

| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 54 min (12,307 words) | 24 min (5,407 words after the close of the topic; 5,455 before) |
| Reading, closed details | 3 min | 29 min (37 before the loop material moved) |
| Other tabs, core | 10 min (four labs and Further reading) | 5 min (Stride explorer 2.5, Further reading 2.8) |
| Visuals drawn in Reading (svg, canvas, img) | 0 | 10 |

Why 24 minutes is right: the core now carries exactly the three machines this page owns (the header over storage, the walk down the keys, the graph and its engine) plus the four mechanisms built on them that a practitioner trips over (version counters, custom Functions, turning gradients off, trading saved memory). Each has its numbers, its picture and, where there is one, its formula. What made the old page 54 minutes was measured detail an expert does not need on first read (per-op tables, dtype promotion, channels_last, every modules-and-loop measurement, mistakes and interview answers that restate the sections); it is all still on the page, closed, which is why the closed time grew from 3 to 37 minutes. Nothing was cut but fat (27 units: wind-ups, headings, pointers to removed tabs, legends the drawings now carry).

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)

369 units: core 187, depth 123, fat 27, owned 32 (to Making training fast; see the close of the topic above), volatile 0. 337 were drafted from the old page by `ledger.py init`; 32 were added by hand for script-rendered tables and visuals, each with a key written into a static caption or a closed block's summary. Fat units carry a `note` saying why.

## Departures from the page-kind shape, and why

- No "in production" section: the subject is the runtime itself.
- Section 4 (modules and the loop) is a pointer paragraph: OWNERS.md gives this page the internals (tensors, dispatcher, autograd); nn.Module and the loop are owned by Making training fast since 2026-10-23.

## The 2026-11 rollout: split layout, four 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. No new runs: every scene draws from `window.TDA` (`inputs/` via `build_data.py`, unchanged). `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` (autoplays on view), `05z_errbox.js.html`, `99_js_tabs.js` (storage key `tda-tab` kept) and `build.sh` are the skill templates, copied unchanged on 2026-11-12. `28_tda_rd_hero.js` (the static hero) was deleted; the 2D view/copy stepper (`23_tda_rd_ten.js`) and the two-situation walker (`24_tda_rd_dsp.js`) were removed from their files, each replaced by a stage.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea in one screen (core sentence, You need, terms, closed table) | split | **3D** `stg-hero` Fig. 1: one `torch.mm(x, w)` from x's header over storage, down AutocastCPU (skipped), AutogradCPU (records MmBackward0, saves x and w), ADInplaceOrView (fallthrough) to the CPU kernel, then backward to AccumulateGrad | yes, 6 |
| Reading | 1 Tensors (core) | split | **3D** `stg-ten` Fig. 2: 12 floats of storage on the floor, each header's elements on a standing glass plate, dots from the cell each element reads: x, x[1:, 1:3] (offset 5), x.t(), its reading order with the three jumps back, .contiguous() writing a new storage, expand's stride 0 | yes, 7 |
| Reading | 1 depth blocks (table, channels_last, dtypes, devices) | full width | tables | no |
| Reading | 2 intro, 2.1 the keys | split | key ladder (2D, static) | no |
| Reading | 2.2 the key set of one call | split | **3D** `stg-walk` Fig. 3: the recorded `tda::scale` call down AutocastCPU, AutogradCPU, ADInplaceOrView, Python to CPU or Meta, one situation per step (plain, no_grad, inference_mode, autocast, dispatch mode, meta, inference tensor) | yes, 7 |
| Reading | 2.3 table slots | split | slot statistics bars (2D, static) | no |
| Reading | 2.4 to 2.6 | full width | tables and code in closed blocks | no |
| Reading | 3 intro, 3.1 what a node holds | split | **3D** `stg-graph` Fig. 4: one block's 46 recorded nodes in two rows, saved activations stacked to scale on the node that frees them, forward in two stretches, attention's node close up, backward in four stretches of the recorded order | yes, 7 |
| Reading | 3.2 the engine's rule | full width | the engine explorer (2D widget, four variants, ready queue, aten calls per node; never plays by itself, opens on the first backward step) | no (widget) |
| Reading | 3.3 version counters | split, then the lab full width | three-state mechanism figure (2D, static); the 14-case lab is a widget | no |
| Reading | 3.4 custom Function | split | diagram (2D, static) | no |
| Reading | 3.5 | full width | none | no |
| Reading | 3.6 checkpointing | split | bars (2D, static) | no |
| Reading | 4, Depth | full width | none | no |
| Stride explorer | | full width | a tool over 44 recorded tensors (widget, never plays by itself) | no |
| Further reading | | unchanged | | |

What changed and why:
- **The static hero became Fig. 1**: the three machines are a path one call takes, so the call now moves: storage and header, the keys as glass plates (the skipped ones dashed), the node appearing with its saved tensors, then backward. The hero's caption became its step list.
- **The view/copy stepper became Fig. 2.** It replayed 13 positions per mode (the long-replay rule); now 7 explained steps, and it gained the offset (x[1:, 1:3]) and stride 0 (expand) from the same record, which the old stepper only stated in prose. The prediction prompt stayed, before the steps.
- **The two-situation walker became Fig. 3**, one recorded situation per step (the plain tensor and the tensor requiring grad took the same route and share step 1). The "Four lessons" paragraph after the walker moved into the steps (fat as a paragraph; the lessons are units 99 to 101 and 279 to 281). The selects that compared any two situations are gone: every situation now has its own explained step.
- **The autograd graph has a 3D Fig. 4** for the mechanism (built in forward, freed in backward, from the record), and the old stepper, with up to 93 positions, stays as the engine explorer in 3.2: a widget (case b of the long-replay rule), because its point is what the reader inspects (the ready queue, aten calls per node, the checkpointed and offloaded variants that 3.6 sends the reader to). It stays full width: about 1,100 px tall with its own two columns, it cannot be a sticky right column.
- **Kept 2D**: the key ladder (a ranked list of enum numbers), the slot statistics (stacked bars over 3,113 operators), the version-counter mechanism (three states side by side), the custom Function diagram and the checkpoint bars (numbers on axes), every table. No real images: the subject is software state, and no photograph shows a stride or a key set.
- `check_data.py` skips `02_split.html` (CSS only; its `<style id>` defeated the style filter). `20_read_a.html`'s `.an-ctl` rules no longer apply to the stage bars (they wrapped the speed select onto a second line on phones). `check_controls.mjs` already asserted the right thing for the new motion rule (nothing moves under reduced motion); `check_stages.mjs` is new (adapted from Extending PyTorch).

### Length judgement (2026-11-12)
| | Before (audit 2026-11-12, before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 23.5 min (5,407 words) | 26.8 min (6,160 words) |
| Reading, closed details | 28.7 min (6,599 words) | 28.7 min (6,604 words) |
| Other tabs, core | Stride explorer 579, Further reading 724 words | unchanged |
| Visuals drawn in Reading (audit) | 10 | 11 |

The 753 extra core words are the four stages' step lists (27 items), most of which were script-written captions before (invisible to the audit: the hero caption, the walker's per-kernel captions, the engine stepper's captions) and are now written out beside their figures, as the rollout asks; the four-lessons paragraph the walk now carries was cut. Nothing else changed in length, so the 2026-10-23 judgement stands.

### Knowledge ledger
369 units: core 186, depth 123, fat 28, owned 32; problems 0. Unit 98 ("Four lessons in it", the wind-up before the lessons) became fat: its lessons are now steps 2 to 5 of Fig. 3.
