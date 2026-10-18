# Source of "Long context: KV cache growth and compression, local and global attention, effective context"

Child page 7 of Topic: llm-architecture (prefix `lc`, storage key `lc-tab`). Built 2026-10-18 on an Apple M1 Pro.

## Build
`sh build.sh` writes `../index.html` from `parts/`. It is the root's build plus one line: the root's
`src/parts/33_js_cc_1core.js` (the Config calculator core, `window.CC`) is emitted unchanged before this page's
scripts, so the Memory wall uses exactly the root's validated formulas. Data parts are written by scripts, never by hand:
`wall/make_wall_data.py` (configs) and `make_page_data.py` (runs and the prose facts `facts.json`).

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles) to `20_read_z`, `22_js_rd_0facts.js` (LCF), `22_js_rd_1fill.js` (fills `data-lc` spans), `23_js_rd_anim.js` | four walls, levers, measured results, design, mistakes, interview |
| Memory wall `t-wall` | `31_tab_wall_*`, `31_js_wl_0data.js`, `31_js_wl_1calc.js` | real configs redesigned lever by lever |
| Eviction lab `t-evict` | `32_tab_evict_*`, `32_js_ev_0data.js`, `32_js_ev_1lab.js` | SmolLM2-135M at 4,096 tokens, 7 eviction policies, 5 quantised caches |
| Effective context lab `t-eff` | `33_tab_eff_*`, `33_js_ef_0data.js`, `33_js_ef_1lab.js` | tiny GPT past its length; SmolLM2 pass-key grid |
| Further reading `t-more` | `39_tab_more.html` | |
`30_js_lc_0core.js` holds `window.LC` (helpers and a tab-aware copy of the step controller).

## Runs (scripts here, outputs in `*/out/`, everything the page needs is in the repo)
| Script | Runs on | Output |
|---|---|---|
| `kv/smol.py` | library: SmolLM2-135M attention by hand (prefill, then continue against a masked or quantised cache) | |
| `kv/run_kv.py check / evict / map` | CPU, 4 threads | `kv/out/check.json`, `evict.json` (about 10 min), `map.json` (about 40 min) |
| `kv/key_channels.py` | CPU | `kv/out/key_channels.json` |
| `past/past_len.py` | CPU | `past/out/past.json` |
| `past/finetune_long.py` | MPS under the bench lock | `past/out/lc_*_log.json`; checkpoints in scratch `runs/lc_*` |
| `wall/check_wall.mjs` | node + puppeteer | `wall/out/examples.json`; checks the wall's defaults equal the root calc.py |
| `check_controls.mjs`, `check_data.py`, `shot_el.mjs` | checks | |
`scripts/run_pending.sh` reruns everything in order with time estimates. Inputs: TinyStories validation (scratch, from the
root's setup), SmolLM2-135M revision 93efa2f0 (Hugging Face cache), the root's `src/data` (tiny GPT, configs) and
`src/calc/out/py_results.json`, the Attention lab's `at_mha` checkpoint (scratch).

## For the Positional Encodings child
`past/out/past.json` (per-position loss, 2,048 tokens, plain / linear x4 / linear x8 / NTK x8 / YaRN x8 and the
fine-tuned runs) and `kv/out/map.json` (SmolLM2 pass-key to 16K, past its max_position_embeddings) are reusable as is.

## Departures from the page-kind shape, and why
- Three lab tabs instead of two: the brief asked for a memory wall calculator and an eviction before/after; the
  effective-context measurements (tiny GPT past length, SmolLM2 grid) needed room of their own.
- Eviction runs on CPU, not MPS: prefill-then-compress needs one prefill per prompt and short continuations, about
  13 s per prompt on 4 CPU threads, so the shared GPU queue was left to the other labs.
- KV compression is also measured on Batching, KV cache and scheduling (Qwen3-0.6B, about 1,000 tokens); this page
  does not repeat that run but goes longer, adds quantisation on the same axis, architecture-style policies and the
  question-timing test, and links that page for realisable savings.
