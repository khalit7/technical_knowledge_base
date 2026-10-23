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
- `check_controls.mjs` clicks every control at 390 px dark and 920 px light and checks nothing autoplays; `shot_el.mjs` screenshots single Reading elements for review (run both from the repo root).
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).
- `viz_ideas.md`, `coverage.md`.

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)

| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles), `20_read_b` (nav, the idea in one screen: core sentence, hero, you need, new terms; section 1 tensors), `20_read_c` (section 2 dispatcher), `20_read_d` (section 3 autograd), `20_read_e` (section 4 modules and the loop, all closed; depth: GPUs, mistakes, interview), `20_read_z`; JS: `21_js_rd_common.js` (the skill template, never autoplays), `22_tda_data.js` (TDA), `23_tda_rd_ten.js` (helpers, the strides before/after, tensor tables), `24_tda_rd_dsp.js` (key ladder, the two-situation walk stepper, slot statistics, aten-call explorer), `25_tda_rd_ag.js` (autograd and module tables), `26_tda_rd_eng.js` (graph built in forward, run in backward), `27_tda_rd_ver.js` (version-counter lab and mechanism figure), `28_tda_rd_hero.js`, `29_tda_rd_figs.js` (custom Function diagram, checkpoint bars) | sections 1 to 3 core with their visuals, section 4 and the depth section closed |
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

## Length judgement

| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 54 min (12,307 words) | 24 min (5,455 words) |
| Reading, closed details | 3 min | 37 min |
| Other tabs, core | 10 min (four labs and Further reading) | 5 min (Stride explorer 2.5, Further reading 2.8) |
| Visuals drawn in Reading (svg, canvas, img) | 0 | 10 |

Why 24 minutes is right: the core now carries exactly the three machines this page owns (the header over storage, the walk down the keys, the graph and its engine) plus the four mechanisms built on them that a practitioner trips over (version counters, custom Functions, turning gradients off, trading saved memory). Each has its numbers, its picture and, where there is one, its formula. What made the old page 54 minutes was measured detail an expert does not need on first read (per-op tables, dtype promotion, channels_last, every modules-and-loop measurement, mistakes and interview answers that restate the sections); it is all still on the page, closed, which is why the closed time grew from 3 to 37 minutes. Nothing was cut but fat (27 units: wind-ups, headings, pointers to removed tabs, legends the drawings now carry).

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)

369 units: core 188, depth 154, fat 27, owned 0, volatile 0. 337 were drafted from the old page by `ledger.py init`; 32 were added by hand for script-rendered tables and visuals, each with a key written into a static caption or a closed block's summary. Fat units carry a `note` saying why. No unit is labelled `owned:` because no owner page carries these keys today (see the report on nn.Module and the loop).

## Departures from the page-kind shape, and why

- No "in production" section: the subject is the runtime itself.
- Section 4 (modules and the loop) is a short core paragraph over closed blocks: OWNERS.md gives this page the internals (tensors, dispatcher, autograd), not nn.Module or the loop, but no other page carries these measurements, so they stay here, closed, until an owner is named.
