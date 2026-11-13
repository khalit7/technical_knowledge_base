# T5 (Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81ec8ebfec02e953a7fd, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). No child pages, databases or video. Built with `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the reference folder `../attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card from `paper.json` (Takeaway, three headline numbers, the verdict linking to the evidence section), then Problem, Text to text (the paper's own Appendix D examples), Baseline, Span corruption (animated: the same sentence through BERT-style, i.i.d. and span corruption), Architectures (the attention-mask animation for encoder-decoder, language model and prefix LM), Objectives, Data, Fine-tuning and mixing, Scaling, Final models, Results, How much of this to believe, Why it matters (beyond the paper, each claim sourced), Connections. Three predict-then-reveal questions: the architecture ablation, unfiltered C4, and how to spend 4x compute. |
| (Corrupt a sentence) | `t-run` | Removed on 2026-10-24: its stepper, playground and cost chart are now in the Reading tab (see the light pass below); `#t-run` links open Reading at the stepper. |
| The paper's tables, rebuilt | `t-tables` | Every scored table in `tables.json` (Tables 1, 2 and 4 to 16; Table 3 is example text) as one sortable ablation grid with delta from the baseline in standard deviations of Table 1; the checks on the paper's own tables; the parameter recount of the five sizes; Table 14 against the previous best. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **No toy model.** T5 is an empirical ablation study, not a new layer: the architecture is the 2017 Transformer, already run live on the Attention page. What is T5's own is the preprocessing (span corruption, sentinels) and the ablation grid, so the live ingredient is the real preprocessing code ported and checked (`check_core.mjs`) and the tables tab is the empirical one. Training a toy encoder-decoder to compare objectives would not reproduce gaps that the paper itself measures as fractions of a point at 220M.
- **No "Then and now" tab.** The later fate of each choice (C4, span corruption, the encoder-decoder, T5 1.1 details, the checkpoints as text encoders) is short enough to sit in "Why it matters" with sources; a morph would show little because the block barely changed.
- **No "What it takes to use this".** A 2019 classic whose recipe is standard; "Why it matters" says which checkpoints to start from (T5 1.1 or Flan-T5).
- **Reading tab is long (18 minutes).** The paper is 53 pages and the page owns every ablation; each ablation is a short section with its table linked rather than reproduced.

## Files

- `build.sh`, `mk_paper.py`, `mk_coverage.py`, `save_live.py`, `extract_paper.py`, `01_css.html`, `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`: from the reference folder (build lists and coverage items changed).
- `paper.json` (metadata, headline numbers, verdict, resources, connections), `tables.json` (Tables 1, 2 and 4 to 15 from the arXiv HTML, printed precision kept; built by `mk_tables.py`), `parse_t16.py` (Table 16, the appendix's every-score table, to `inputs/table16.json`).
- `recompute.py`: the five sizes' parameters from their configurations, the baseline's parameter split and cross-attention share, token budgets and repeats, the span-length helper and per-512 lengths, relative-position buckets, the averages, bold marks against the stated two-standard-deviation rule, main tables against Table 16, Table 15's scaling gains, and every gap in standard deviations quoted in "How much of this to believe". Writes `inputs/recompute.json`.
- `check_core.mjs` (node, from the repo root): the JS port against its invariants and against `recompute.py`. Writes `inputs/check_core.json`.
- `check_page.mjs` (node, from the repo root): every control in light 920 and dark 390, both animations stepped, text at least 11 px, no NaN or errors or sideways scroll.
- `inputs/`: `paper_v4.txt` and `table_S3_T*.txt` (arXiv v4 extracts), `t5_code_extracts.py` (the preprocessing functions quoted from the T5 repository), `t5_released_checkpoints.md`, `hf_t5.json` (checkpoint parameter counts), `task_sizes.json`, `later_extracts.txt` (quotes from later papers), `recompute.json`, `check_core.json`, `table16.json`.

## What reproduces and what does not

- Parameters: Small, Base and 3B reproduce independently and equal the Hugging Face checkpoints to the parameter (60.5M, 222.9M, 2.85B, the text's "around 2.8 billion"). **Large does not**: its configuration counts to 737.7M (the checkpoint agrees) against the printed 770M, which is the count with an untied output matrix, a convention the Small and Base figures do not use.
- Cross-attention is 12.7% of the baseline, against the paper's "about 10%".
- Bold marks: 480 of 483 main-table cells follow the stated rule; the three exceptions sit on the cutoff.
- Main tables against Table 16: three cells disagree, and one row of Table 10 in the appendix is a copy of another.
- Training tokens: 2^35 per pretraining run against C4's size gives the paper's ratios (64, 256, 1,024, 4,096 repeats in Table 9).
- Span corruption port: 3,960 masks with exact noise and span counts, uniform over partitions, 36 of 36 lengths against `random_spans_helper`, 602 of 602 relative buckets, Figure 2 reproduced exactly; i.i.d. expected lengths match a 20,000-mask simulation.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: tabs 4, 210 KB, emdash 0, errbox 1, clipped 0, fail=0. `check_page.mjs`: 550 actions, 0 problems. `check_core.mjs`: PASS. `mk_coverage.py`: 78 of 78 items verified.

## The 2026-10-24 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence; the hero is the paper's own Figure 1 (the text-to-text diagram), embedded as `img/t5_figure1_text_to_text.webp` because the JMLR version is CC BY 4.0 (credited under it and in `img/CREDITS.md`); then "You need" (Attention Is All You Need, The transformer from zero, Families and objectives) and four new terms.
- **The Corrupt a sentence tab moved into Reading**, because it explained one mechanism: the stepper (BERT-style, i.i.d. and random spans on Figure 2's sentence) sits in Span corruption under a heading saying what to notice; the playground on your own text is a closed block under it; the target-length chart ("a fifth of BERT-style's target, no worse a score") sits in Objectives beside "choose on cost". At 390 px the chart is taller and the three full-reconstruction labels at x = 512 are stacked (they overlapped).
- **No autoplay**: `11_js_ui.js` patched as on the ZeRO and Megatron-LM pages (waits on step 1; a mode switch resets and pauses). `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `t5-tab`; `#t-run` opens Reading at the stepper; tab links open the closed block after their target). `check_page.mjs` now fails if `msk` or `spx` moves before a click and opens every closed block to exercise its controls.
- **Owned elsewhere, linked with one or two sentences kept**: RMSNorm and pre-norm in general (Normalisation, residuals and stability), the T5 bias against other position schemes (Positional encodings), span corruption among the objectives (Families and objectives), C4's rules run on real text (Extraction and filtering), repetition and temperature mixing at today's scale (Data mixing), objectives as a family and scaling laws (Pretraining). What T5 itself chose and measured stays here.
- **Closed**: the bucket slider, the rest of the training recipe with the learning-rate chart, the two printed numbers that do not quite reproduce (32×, Large's 770M), and in the tables tab the checks list and the parameter recount. **Volatile**: where the checkpoints are used now (Flan-T5 ladder, Imagen, SD3, FLUX.1) is one dated closed block.
- Header: "Reading: 21 min, plus 2 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 18.8 min | 21.3 min |
| The paper, closed details | 0 | 2.3 min |
| Corrupt a sentence (tab) | 3.3 min | removed (moved into Reading) |
| The ablation grid, rebuilt | 4.7 min | 1.7 min, plus 3.1 closed |
| Further reading | 2.6 min | 2.6 min |
| Visuals in Reading (audit) | 4 | 7 |

Why about 21 minutes is right: Reading now holds what took 22.1 core minutes across two tabs, plus the core sentence, the hero and the new terms, with recipe details, the bucket slider and the playground closed. What is open is the paper's argument in its order, one short section per ablation, the evidence and what later work showed; the general mechanisms are one sentence and a link each. A 53-page ablation study owned by this page does not fit in less without dropping ablations.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
203 units: core 177, depth 14, owned 6, volatile 1, fat 5. 190 drafted by `ledger.py init`; 13 added (core sentence, hero, new terms, six owner links, four units for the script-drawn tables with keys in static captions). `ledger.py check`: problems 0.

## Checks (24 October 2026)
`checkpage.sh`: tabs 3, 217 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 550 actions, 0 problems (including no movement before a click). `check_core.mjs`: PASS. `mk_coverage.py`: 78 of 78 (four keys updated for the reworded baseline bullets and the header).

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`): the top (core sentence, You need, new terms left; the paper's Figure 1 right), Text to text (the Appendix D picker right), Span corruption (stage), Architectures (stage), Objectives (the target-length chart right), Fine-tuning and mixing (the mixing widget right), Putting it all together (Table 15 gains right). Problem, Baseline (its bucket slider and recipe chart are closed blocks), Data, Scaling (prediction only), Results, How much to believe and Why it matters stay full width. The ablation grid tab: the explorer's text, chips and controls left, its chart and table right; Table 14 likewise. Further reading unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged), replacing the two 2D `makeAnim` animations and their per-step captions (now the step lists):
  - `31_js_sc_span.js`, Fig. 2, three modes with three step lists (`sx-sp-iid`, `sx-sp-bert`, `sx-sp-span`; the baseline first): Figure 2's sentence as blocks; picked tokens lift and turn red; kept tokens and sentinels slide into the input row and the dropped spans into the target row, with dots flowing along each move; the encoder (glass plate) reads the input, cross-attention flows to the decoder plate, which writes the target; the last step is to scale per 512 tokens of text (`L512` from `T5.lenIid` and `T5.lenSpans`; scores from Tables 5 and 7). Data: `FIG` (the paper's Figure 2 and Table 3 examples); the i.i.d. and span rows are recomputed from the mask with the ported `T5.sentinelize` and `T5.targetsFromSpans`, and the page's error box fires if they ever stop matching Figure 2. This replaces the computed Figure 2 card (the same check, now inside the stage).
  - `32_js_sc_arch.js`, Fig. 3: Table 2's five structures (encoder-decoder, shared, 6 + 6, language model, prefix LM) side by side, each as stacks of one slab per block (blue encoder and orange decoder weights; purple one set of weights) with its attention mask as a glass plate on the floor (Figures 3 and 4: fully visible, causal, causal with prefix, on the page's 7 + 3 word example), filling row by row; the camera moves in close on one structure per step and marks one query row; parameters and cost labels from Table 2. The scores stay in the prediction that follows (a stage showing them would answer it). The general mask figure and the encoder-decoder's read-once cache are the owner's (Families and objectives, Figs. 2 and 5), linked rather than redrawn.
- **Kept 2D**: the target-length chart (a scatter), the Table 15 bars, the bucket and learning-rate charts (closed), the mixing table, the prediction bars, the Appendix D picker, the playground (closed) and the whole ablation grid tab: all read best flat. The hero stays the paper's own Figure 1 (CC BY 4.0), the figure people cite.
- **Motion**: the stages follow the template rules (play once half in view, pause off screen, stop for good on any control or at the end, never under reduced motion). `makeAnim` was removed from `11_js_ui.js` (nothing uses it). `99_js_tabs.js` and `05z_errbox.js.html` are the templates (storage key `t5-tab`); this page's two additions (a cross-tab link opens the closed block after its target; `#t-run` opens Reading at the span stage) moved to `99b_js_tablinks.js`. `check_page.mjs` now asserts that the stages play on view (it used to forbid it) and steps every stage and mode; `check_stages.mjs` is the rollout's layout and motion check.
- **Build**: `build.sh` finds the repo root by walking up to `.venv` or `html_utils` (no git). Also fixed: in the target-length chart a right-edge label clamp had been swallowed into a comment, and labels near the y axis now flip to the right of their point.

## Length judgement (2026-11-13)
| | Before (audit 2026-11-13, pre-pass) | After |
|---|---|---|
| The paper, core | 4,915 words, 21.4 min | 5,575 words, 24.2 min |
| The paper, closed | 526 words, 2.3 min | 526, unchanged |
| The ablation grid | 394 core + 722 closed | unchanged |
| Further reading | 607 | unchanged |
| Visuals in The paper (audit) | 7 | 7 |

The growth is the step lists that now explain the two stages: the audit counts all three objective modes' lists (about 330 words of them hidden at any time), so one pass reads about 23 minutes. Header: "Reading: 24 min, plus 2 in closed details." (`reading.json`). Nothing was cut; the old captions became list items.

Ledger: 211 units (core 184, depth 14, owned 6, volatile 1, fat 6). Re-pointed 42 (the arch note), 149 and 150 (the span note, "Step 5" became "Step 6"); 152 (the old "stops when off screen" motion line) is now fat; 8 units added for the stages' step lists. `ledger.py check`: problems 0.

## Checks (13 November 2026)
`checkpage.sh`: tabs 3, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems. `check_stages.mjs`: 12 stage runs (three widths; the span stage in all three modes), 0 problems. `check_core.mjs`: PASS. `mk_coverage.py`: 78 of 78. `html_utils/verify_layout.mjs`: problems 0.
