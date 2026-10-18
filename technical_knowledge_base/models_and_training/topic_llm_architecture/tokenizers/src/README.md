Source of the interactive HTML on the Notion page "Tokenizers" (child of Topic: llm-architecture). Rebuilt 2026-10-18 from the 2026-10-03 build (floor: every section, card and tab kept; see `coverage.md`).

## Build
`sh build.sh` runs `export_data.py` (writes `parts/22_js_tk_0data.js` from `inputs/`: ten tokenizers, FLORES counts, examples, timeline) and `make_page_data.py` (writes `parts/22_js_tk_2new.js`, `window.TKN`, from `out/` and the root's `src/data/tokenizer.json`), then concatenates `parts/` into `../index.html` (01_head, 10_header, 20_read_*.html for the Reading tab, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links `{{text|url}}`, `n:<notion id>`, `#t-<tab>`), and fills the reading time (Reading tab words at 230 per minute, closed `<details>` counted apart) and the best-resources total.

## Tabs and parts
- Reading (`20_read_a` to `20_read_z`; JS `24` to `29`): in one screen; what a tokenizer does (stepped pipeline animation on a running-story sentence, real code and output); units (granularity bars); BPE from zero on the running example (trainer.rs quoted, first merges, nine-size sweep table); WordPiece, Unigram, SentencePiece and the three-algorithm trainer animation (before/after on one editable text); encoding (word.rs and byte_level.rs quoted); vocabulary size (Config calculator table, padding quote); 2026 tokenizers table; numbers and code (digit rules, chunk view, the arithmetic before/after on real models); the language tax; failure modes (gallery on ten tokenizers, trailing space before/after, letter counting, glitch tokens of the running example); special tokens (injection and double-BOS snippets); beyond subwords (BLT patch animation); training your own; mistakes; interview questions. Three predict-then-reveal drills.
- Grow a vocabulary (`31_*`, prefix `tk-grow`): the 3,839 merges replayed on the running sequence (animation and slider, JS encoder equal to the library at 13 checkpoints, `check_grow.mjs`), the cost curves of nine trained sizes, a string inspector with training counts and embedding norms.
- Same text, ten tokenizers (`32_*`) and Vocabulary size (`33_*`): from the 2026-10-03 build; the embedding-share chart now reads the root Config calculator, the timeline gained eight 2026 models.
- Further reading (`39_tab_more.html`).

## Scripts and recorded outputs (all small; large intermediates in scratch)
- `bpe/inspect_bpe.py` -> `out/bpe_inspect.json` (merges, running sequence, the same texts under 8 tokenizers); `bpe/bpe_sweep.py` -> `out/bpe_sweep.json` (nine retrained sizes; 4,096 equals the committed file); `bpe/freq_glitch.py` -> `out/freq_glitch.json` (id counts in train.bin, embedding norms of ref_baseline_s1500, probe continuations); `bpe/grow_check.py` -> `out/grow_check.json`.
- `probe/arith.py` -> `out/arith_olmo.json`, `out/arith_qwen.json`; `probe/space_letters.py` -> `out/space_letters.json`. CPU, bf16 or fp32, inference_mode, greedy.
- `tok2026/fetch.py` (tokenizer files only, revisions in `tok2026/fetched.json`), `tok2026/analyze.py` -> `out/tok2026.json`.
- `vocab/calc_embed.py` -> `out/calc_embed.json` (reads the root's `src/calc/out/py_results.json`).
- `code/quotes.py` -> `out/quotes.json` (source excerpts located by pattern: tokenizers v0.23.3 commit 30127707, transformers 5.20.1, the root's tiny_gpt.py); `code/snippets.py` -> `out/snippets.json` (the code blocks on the page, run, stdout kept).
- From the 2026-10-03 build: `tok_data.py`, `ref_algos.py`, `vocab_data.py`, `overlap.py`, `recompute.py`, `export_data.py`, `save_live.py`, `mk_coverage.py`, `live.md`, `coverage.json`.
- Checks: `check_algos.mjs` (trainers, 36/36), `check_grow.mjs` (26/26), `check_controls.mjs` (every control, 390 dark and 920 light), `check_data.py` (page data equals out/, prose numbers equal data), `mk_coverage.py` (61/61).

## Environment
The topic's shared venv (Python 3.12, tokenizers 0.23.3, transformers 5.20.1, torch 2.14.1), `HF_HUB_OFFLINE=1` for model probes; models and tokenizer files in the Hugging Face cache. Runs: Apple M1 Pro, CPU, 4 threads, nice 15 (no GPU used).

## Departures from the page-kind shape
- Ids are prefixed `tk-`; the class names of the 2026-10-03 parts (`tk`, `tks`, `trow`, ...) are kept unprefixed because the page has one owner and they are shared by several tabs.
- The Reading tab keeps the old page's order inside a from-zero frame (what a tokenizer does, then units, BPE, the other algorithms), because the reader's path is "what is a token" to "what does my choice cost".
