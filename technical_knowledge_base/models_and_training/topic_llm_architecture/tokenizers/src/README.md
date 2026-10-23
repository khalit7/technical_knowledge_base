Source of the interactive HTML on the Notion page "Tokenizers" (child of Topic: llm-architecture). Rebuilt 2026-10-18 from the 2026-10-03 build (floor: every section, card and tab kept; see `coverage.md`).

## Build
`sh build.sh` runs `export_data.py` (writes `parts/22_js_tk_0data.js` from `inputs/`: ten tokenizers, FLORES counts, examples, timeline) and `make_page_data.py` (writes `parts/22_js_tk_2new.js`, `window.TKN`, from `out/` and the root's `src/data/tokenizer.json`), then concatenates `parts/` into `../index.html` (01_head, 10_header, 20_read_*.html for the Reading tab, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links `{{text|url}}`, `n:<notion id>`, `#t-<tab>`), and fills the reading time (Reading tab words at 230 per minute, closed `<details>` counted apart) and the best-resources total.

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)
- Reading (`20_read_a` to `20_read_k`, `20_read_z` closes the tab): the idea in one screen (core sentence, hero figure `31_js_tk_hero.js`, you need, new terms); what a tokenizer does (pipeline stepper); units (granularity bars); BPE from zero (first merges, the merge replay moved from the old Grow tab, `30_js_tk_grow.js`, the nine-size cost plot); WordPiece, Unigram, SentencePiece (comparison table, three-trainer before/after); encoding; vocabulary size (Gemma 3 270M calculator and the 45-config share bars, moved from the old Vocabulary size tab); current models (savings plot, moved); numbers and code; the language tax; failure modes (gallery, trailing space, letters, glitch tokens, the string inspector moved from Grow); special tokens (new before/after of the two traps); beyond subwords (BLT patch stepper); training your own; Depth (three interview questions, closed). Code that ran, quoted library source, per-item tables and provenance are in closed `details.dp` blocks.
- Same text, ten tokenizers (`32_*`): unchanged (a dataset view used from several Reading sections).
- Vocabulary timeline (`33_tab_voc.html`, `33_js_tk_voc.js`): the 41-model timeline only; the rest of the old Vocabulary size tab moved into Reading (the JS registers the timeline for `t-voc` and the other three charts with `RD.onRender`).
- Further reading (`39_tab_more.html`).
- `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `tk-tab`): no animation plays before the reader acts.

## Scripts and recorded outputs (all small; large intermediates in scratch)
- `bpe/inspect_bpe.py` -> `out/bpe_inspect.json` (merges, running sequence, the same texts under 8 tokenizers); `bpe/bpe_sweep.py` -> `out/bpe_sweep.json` (nine retrained sizes; 4,096 equals the committed file); `bpe/freq_glitch.py` -> `out/freq_glitch.json` (id counts in train.bin, embedding norms of ref_baseline_s1500, probe continuations); `bpe/grow_check.py` -> `out/grow_check.json`.
- `probe/arith.py` -> `out/arith_olmo.json`, `out/arith_qwen.json`; `probe/space_letters.py` -> `out/space_letters.json`. CPU, bf16 or fp32, inference_mode, greedy.
- `tok2026/fetch.py` (tokenizer files only, revisions in `tok2026/fetched.json`), `tok2026/analyze.py` -> `out/tok2026.json`.
- `vocab/calc_embed.py` -> `out/calc_embed.json` (reads the root's `src/calc/out/py_results.json`).
- `code/quotes.py` -> `out/quotes.json` (source excerpts located by pattern: tokenizers v0.23.3 commit 30127707, transformers 5.20.1, the root's tiny_gpt.py); `code/snippets.py` -> `out/snippets.json` (the code blocks on the page, run, stdout kept).
- From the 2026-10-03 build: `tok_data.py`, `ref_algos.py`, `vocab_data.py`, `overlap.py`, `recompute.py`, `export_data.py`, `save_live.py`, `mk_coverage.py`, `live.md`, `coverage.json`.
- Checks: `check_algos.mjs` (trainers, 36/36), `check_grow.mjs` (26/26, now on `parts/30_js_tk_grow.js`), `check_controls.mjs` (every control, 390 dark and 920 light; no animation autoplays with or without reduced motion; the hero's ids equal the recorded `snippets.py` output), `check_data.py` (page data equals out/, prose numbers equal data), `mk_coverage.py` (61/61, the 2026-10-03 floor), `ledger.json` (`python3 html_utils/ledger.py check`).

## Environment
The topic's shared venv (Python 3.12, tokenizers 0.23.3, transformers 5.20.1, torch 2.14.1), `HF_HUB_OFFLINE=1` for model probes; models and tokenizer files in the Hugging Face cache. Runs: Apple M1 Pro, CPU, 4 threads, nice 15 (no GPU used).

## Departures from the page-kind shape
- Ids are prefixed `tk-`; the class names of the 2026-10-03 parts (`tk`, `tks`, `trow`, ...) are kept unprefixed because the page has one owner and they are shared by several tabs.
- The Reading tab keeps the old page's order inside a from-zero frame (what a tokenizer does, then units, BPE, the other algorithms), because the reader's path is "what is a token" to "what does my choice cost".

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core sentence (a tokenizer is a lossless compressor with a frozen dictionary, and the vocabulary sets three costs), a new static hero (one sentence of the running story to 11 ids to rows of the 4,096-row table laid out as special, bytes, merges; three cost counters), you need, new terms. The "In one screen" table moved into the WordPiece/Unigram section, where it is the comparison; the problem/how/cost/when/check grid was cut as restatement.
- **Visuals inline**: the merge replay, cost plot and inspector (old Grow tab), the calculator, share bars and savings plot (old Vocabulary size tab) now sit beside the claims they prove. New: the hero (structure: static diagram) and the special-token traps (before/after on the same input, real ids from `out/snippets.json`; no new run). Every card has a one-line title saying what to notice.
- **Closed**: quoted library source, code that ran, the sweep, 13-config and 2026 tables, the digit-rule table, per-problem arithmetic and letter rows, glitch continuations, the ByT5/MegaByte/BLT/SuperBPE quotes, WordPiece provenance, three interview questions.
- **Cut as fat**: the five-things grid, tab pointers, the common-mistakes list (each item restated a section; the two that added something, comparing token counts across tokenizers and never ending a prompt with a space, became sentences in the core) and seven interview answers that restated sections.
- **Fixed a structural bug**: the old `20_read_e.html` closed the Reading tab's `<div>` early, so the sections from "What current models use" to the end sat outside the tab and showed under every tab. That is also why the 2026-10-23 audit measured the old Reading tab at 23 minutes: it only saw the first half.
- **No autoplay**: the skill templates replace the old `21_js_rd_common.js`, which played each animation once on first view.

## Length judgement
| | Before (2026-10-19 build) | After (2026-10-23) |
|---|---|---|
| Reading core (230 wpm, `html_utils/audit_pages.mjs`) | 23 min as audited (only the first half was inside the tab); 47.7 min for all Reading sections counted wherever they sat | 42 min |
| Reading closed details | 0 audited (4.6 for all sections) | 15 min |
| Other tabs, core | Grow 4.1 + Same text 8.5 + Vocabulary size 4.4 = 17 min | Same text 8.5 + Vocabulary timeline 1.0 = 9.5 min |
| Core total excluding Further reading | about 65 min | about 51 min |
| SVG or canvas visuals in Reading (audit) | 0 | 4 (plus about 15 HTML-drawn visuals: chips, bars, steppers, before/afters) |

Why 42 minutes is right: this child owns every tokenizer concept (four algorithms, encoding, pre-tokenizers, vocabulary cost in dense and MoE models, padding and tying, the 2026 landscape, numbers, code, the language tax, four measured failure modes, special tokens and templates, byte-level alternatives), each now with a visual beside it. About half the core words are the visuals' own text (token chips, bar labels, captions, counters), not prose; the prose is about 20 minutes. What can be skipped on a first read (code, quotes, provenance, per-item tables) is closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
423 units drafted by `ledger.py init` from the 2026-10-19 build (one per sentence): core 302, depth 89, fat 32 (each with a `note`). Keys are verbatim static text; units of the moved tabs carry a `note` saying where they went. Further reading entries are labelled depth.
