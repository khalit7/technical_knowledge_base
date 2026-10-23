# Positional Encodings: how the page is built

Rebuilt 2026-10-18 as child 3 of Topic: llm-architecture (moved in from Topic: llm-training-and-post-training; the 2026-10-03 build was the floor). `sh build.sh` runs `export_data.py` (which runs `recompute.py` first), then writes `../index.html` from `parts/`.

## Tabs (rebuilt 2026-10-23 to the teaching contract)
- **Reading** (`t-read`, parts `20_read_a` to `20_read_e`): the idea in one screen (core sentence, hero, you need, new terms; the six-scheme table closed), then eleven sections: 1 why positions (permutation test, position probe), 2 four answers (six schemes on one query; learned, sinusoidal, T5, ALiBi; Shaw, DeBERTa, slopes, code and the sinusoid-scale mistake closed), 3 RoPE from zero (worked example, dial, formula, bank of clocks; code and pairing layout closed), 4 base and variants (census chart, reading a config, layer-strip figure, partial RoPE two ways; the verbatim variants table closed), 5 five schemes trained here, 6 what breaks past the trained length (the dial before/after animation), 7 stretching RoPE (methods, the per-pair spectrum chart, YaRN formula; YaRN bands and provenance closed), 8 what each method buys measured (per-position loss chart, the running story moved past 256 as a before/after animation, the fine-tune box), 9 recipes (table closed), 10 beyond RoPE (CoPE, FoPE, HoPE closed), 11 depth (mistakes and design questions, closed).
- **Every config** (`t-spec`, `32_tab_spec_a.html`): twelve configs with a scaling side by side, and the census of all 74 configs (explorers across every config, used by sections 4 and 7).
- **Further reading** (`t-more`).

## The 2026-10-23 rebuild: what changed and why
- **Top**: core idea in one sentence; a new static hero (`23_js_pe_hero.js`): one pair rotated beside the tiny GPT's 16 pairs as clocks at distance 300, fast pairs (0 to 6) full discs, the nine slow pairs outside their wedges. "You need", new terms. The one-screen table became a closed reference block.
- **Lab tabs folded into Reading** (both explained one mechanism): the Past the trained length tab (offsets animation, per-position curves, drill, fine-tune box) is now section 8 (`31_js_pe_past.js` registers with `RD.onRender`); the Stretch the spectrum tab's chart is now in section 7 (`32_js_pe_spec.js`); its two tables stay as the Every config tab. The measured extension table (`pe-extT`) was dropped: every row is in section 8's table.
- **New visuals**: the hero; a layer-strip figure of eight configs (`27_js_pe_layers.js`, `fig`); the two kinds of partial RoPE as wavelength ticks (`29_js_pe_partial.js`, from `recompute.json`'s `partial_two_ways`).
- **Concrete, then picture, then formula** in RoPE (worked example, dial, equation) and in the four answers (chart, then formulas in a closed block).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `pe-tab`). `check_controls.mjs` checks reduced motion on both animations in Reading.
- **Deleted as fat**: wind-ups and headings, interview answers that restated a section (three design questions kept, closed), the two mistakes that repeated core boxes, pointers to the removed tabs.
- `check_data.py` also checks the static round numbers now written in prose (2.07, 3.82, 2.43, 4.29 against 2.29, 1.96 becomes 3.61). The header reading time is static, measured with `html_utils/audit_pages.mjs` (build.sh no longer computes it).

## Length judgement
| | Before (2026-10-18) | After (2026-10-23) |
|---|---|---|
| Reading core (audit_pages.mjs, 230 wpm) | 9,861 words, 43 min | 7,554 words, 33 min |
| Reading in closed details | 1,684 words, 7 min | 4,520 words, 20 min |
| Other tabs (core) | Past 1,231 + Spectrum 1,872 + Further reading 647: 16 min | Every config 1,580 + Further reading 634: 10 min |
| Visuals drawn inline in Reading | 9 | 13 (plus the YaRN bands chart in a closed block) |

The core reading of the subject fell from about 56 minutes (Reading plus the two lab tabs it sent the reader to) to 33, with the labs' visuals now beside the claims they prove. 33 minutes is right because the page owns the whole subject in the knowledge base (absolute and relative schemes, RoPE, its base and variants, the out-of-range mechanism, five scaling methods, recipes) and carries measured evidence for each (five trained schemes, 21 inference-time runs past the trained length); the ledger is mostly core (234 core against 78 depth), and about a fifth of the core words are captions and counters of the visuals. What could still go: the twelve-config spectrum chart's try paragraph and the method list's quotes.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
364 units: core 234, depth 78, fat 52. 355 were drafted from the 2026-10-18 page by `ledger.py init` (keys proposed automatically as the longest distinctive phrase still on the page, then reviewed); 9 were added by hand for script-rendered measurements and tables, each keyed to a static phrase or a round number written into the prose. Fat units carry a `note`.

## Departures from the page-kind shape
- **One tab besides Reading and Further reading** (Every config): two tables across all configs, a tool rather than one mechanism.
- **Two before/after animations in Reading** (section 6 on real configs, arithmetic; section 8 on the tiny GPT, measured): one shows why it breaks, the other what each fix buys on real text.

## Files
- `parts/`: `22_js_pe_0data.js` is written by `export_data.py` (do not edit). `23_js_pe_1core.js`: RoPE ports (`window.ROPE`), T5 buckets, helpers (`window.PE`). `24_js_pe_fill.js`: every measured number in the prose is filled from the data (so text and data cannot drift). `25` six schemes, `26` the dial animation, `27` layer strips, `28` Reading charts, `31` section 8 (formerly the Past tab), `32` section 7's spectrum chart and the Every config tables. `23_js_pe_hero.js` the hero, `29_js_pe_partial.js` the partial-RoPE figure. `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `pe-tab`); `01_head.html`, `05z_errbox.js.html` copied from the root.
- `recompute.py` -> `inputs/recompute.json`: ports of Hugging Face's RoPE functions and T5's bucket function, per-config counts, temperatures, ALiBi slopes, layer patterns, the two kinds of partial RoPE. Stdlib only.
- `census/census.py` -> `census/out/census.json`: position fields of every config the topic holds (root src/data/configs, root src/map/inputs/configs, this page's inputs), deduplicated.
- `code/code_refs.py` -> `code/out/code_refs.json`: the transformers 5.20.1 and tiny GPT excerpts the page quotes, located by pattern (line numbers checked), and a count of rotary calls in hybrid modeling files. `code/hf_check.py` -> `code/out/hf_check.json`: this page's ports against the library's own `ROPE_INIT_FUNCTIONS` on every preset (max relative error 9.0e-7, float32).
- `train/gpu_queue.sh` (as run, scratch paths replaced): the equal-budget trainings (pe_alibi, pe_nope, pe_sinusoidal, pe_rope_s1, pe_learned_s1), one per bench-lock hold, MPS with both watermark variables. `train/collect.py` -> `train/out/runs.json` (the page's durable copy of the logs). The learned and RoPE seed-0 runs are the root's `ref_baseline_s1500` and the Attention lab's `at_mha` (same preset settings). `train/train_scaled.py` trains and evaluates `pe_sinusoidal_x16`: the sinusoidal preset with token embeddings multiplied by sqrt(d_model), because the root's tiny_gpt.py adds unit sinusoids to std-0.02 embeddings (that run, `pe_sinusoidal`, ends at 4.29; shown as a measured mistake).
- `past/past_eval.py` -> `past/out/past.json`: per-position loss on the long_context sibling's 24 windows of 2,048 tokens (its numbers reproduced to 4 decimals), RoPE scalings at inference including the temperature split and two misconfigurations, the running sequence at 8 offsets with greedy text. CPU.
- `probe/probe.py` -> `probe/out/probe.json`: permutation test, position probe, the layout bug. CPU.
- (`check_page.mjs` of the 2026-10-03 build was removed: it targeted the old ids.) `check_controls.mjs`: clicks every control at 390 px dark and 920 px light and checks reduced motion. `check_data.py`: the page embeds exactly the recorded outputs, and the static prose numbers match them.
- `live.md`, `save_live.py`: the old Notion text (fetched 2026-10-03, Notion's copy dated 2026-09-20). `mk_coverage.py` -> `coverage.json` (68 of 68 old facts found in the new page, corrections noted); `coverage.md` lists corrections, moves and the Gallery material carried.
- `inputs/`: config.json files fetched 2026-10-03 (mirrors where gated), `t5_base_relative_bias.json`, `code_extracts.py` (the 2026-10-03 verbatim extracts; the page now quotes transformers 5.20.1 through `code/`).
- `facts.md`: verified facts of this page (also appended to the topic's shared FACTS.md under `pe`).

## Rebuild from scratch
Needs the topic scratch (`LA_SCRATCH`, the shared venv, `data/val.bin`, the checkpoints in `runs/`). `sh train/gpu_queue.sh` (about 6 minutes per run on MPS), then `python3 train/collect.py`, `python -I past/past_eval.py`, `python -I probe/probe.py` (a few minutes on CPU), `python -I code/code_refs.py`, `python -I code/hf_check.py`, `python3 census/census.py`, then `sh build.sh`.
