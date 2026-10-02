# T5 (Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81ec8ebfec02e953a7fd, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). No child pages, databases or video. Built with `html_utils/methods/papers.md`, starting from the reference folder `../attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card from `paper.json` (Takeaway, three headline numbers, the verdict linking to the evidence section), then Problem, Text to text (the paper's own Appendix D examples), Baseline, Span corruption (animated: the same sentence through BERT-style, i.i.d. and span corruption), Architectures (the attention-mask animation for encoder-decoder, language model and prefix LM), Objectives, Data, Fine-tuning and mixing, Scaling, Final models, Results, How much of this to believe, Why it matters (beyond the paper, each claim sourced), Connections. Three predict-then-reveal questions: the architecture ablation, unfiltered C4, and how to spend 4x compute. |
| Corrupt a sentence | `t-run` | The live ingredient: T5's own preprocessing (`random_spans_noise_mask`, `noise_span_to_unique_sentinel`, `random_spans_helper`, i.i.d. noise, BERT-style) ported line by line from `t5/data/preprocessors.py` to `parts/12_js_t5core.js`, run on any text with rate and span-length sliders, the paper's score beside each setting, and the target-length cost of every objective per 512 tokens. |
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
