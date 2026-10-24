# RoFormer (RoPE): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81cfa5e9f54459720098, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict (generated from `paper.json`), the core idea in one sentence, the hero (4 rotation pairs of one query and key at positions (5, 2) and (43, 40): arrows turn, angles and score do not), You need and New terms, then Problem, Idea, Rotation (with the 8-pair dials widget), The shift test (before/after animation on two trained models), The frequency spectrum, Long-term decay (Figure 2 recomputed, with the actual-score overlay), Linear attention, Results, How much of this to believe, Why it matters, Connections. Three predict-then-reveal questions (shift, decay, GLUE). |
| Train short, test long | `t-run` | Six trained one-layer toy models (RoPE, sinusoidal, learned absolute, none, linear + RoPE, linear none) running in the browser: run a sequence up to 128 with a sliding window or Position Interpolation, attention by offset for one query, accuracy by position (PyTorch and in-browser), training curves, what reproduces and what does not. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 5, the GLUE split toggle (as printed, or against a validation-set BERT-base), Table 4 against length, Table 5 with 95% intervals and the gap's standard error, v1's splits, EleutherAI's replication, Figure 3 described. |
| Then and now | `t-then` | An 11-step animation of the RoPE spectrum (turns per pair in context) from the 2017 sinusoid to Llama 4's iRoPE, each step from its paper or config.json; the changed and survived table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **No "What it takes to use this".** RoPE is now standard in every major open model; "Then and now" covers how it is used.
- **The 2D dial is not rebuilt.** Positional Encodings owns it (one pair, shift both positions, section 3) and the YaRN bands per config; this page links there and builds what is specific to the paper: many pairs at once, the shift test on trained weights, Figure 2 and its caveat, the toy, the spectrum history.
- **The live ingredient is an extrapolation test, as papers.md suggests for RoFormer, and it does not flatter the paper.** RoPE extrapolates no better than sinusoids past the trained length at full attention (it lasts a few positions longer), and is perfect with a sliding window. Shown as measured; the task was not retuned. The configuration (4 heads instead of 2) was chosen on in-range accuracy only; the sweep logs are in `model/sweep/` (the first 2-head, 6,000-step run's log was overwritten by the final run; its last line read held-out 0.8381).
- **Two GLUE references.** The paper's Table 2 mixes splits, so the Tables tab adds a validation-set BERT-base row (Hugging Face's run_glue example) as a labelled reference.
- **The Reading tab is long** (18 minutes of core against the old Notion page's 10), because "How much of this to believe" carries its sourced points and the widgets carry their own explanations.

## Files

- `build.sh`: as in the reference folder (only the HTML and JS lists change); the header's reading time comes from `reading.json` (measured with `html_utils/audit_pages.mjs`, written by hand). `99_js_tabs.js` is the explainer-page template (storage key `rf-tab`, plus `data-to` scrolling that opens a closed block). `label_ledger.py` labels `ledger.json`. Macros `{{text|url}}`, `n:`, `ax:`, `tab:`, `[[anchor|label]]`, `@@CARD@@`.
- `paper.json`, `tables.json` (Tables 1 to 5 as printed, v1's split table, EleutherAI's tables, the Hugging Face validation reference), `mk_paper.py` (gpt_3's version with the verdict line; `where_label` numbers tables globally as this paper does).
- `recompute.py`: Figure 2's bound at d = 64, 128, 256 (128 reproduces the plot), the actual all-ones and Gaussian scores, the toy's spectrum, Table 1 and 2 deltas (also against the validation reference), pretraining budgets (3.3B against 43B or 131B tokens), Table 5 gains and standard errors at n = 1,536 and 1,793, Table 4's correlation, the Then and now spectrum numbers. Writes `inputs/recompute.json`.
- Toy model: `train.py` (task, six variants, training, `export` to `parts/20_model_data.js` with 6-bit weights and accuracies by position for full attention, a 32-token window and Position Interpolation), `check_forward.py` (the JavaScript forward pass in `parts/22_js_model.js` against PyTorch on the quantised weights; needs node). `model/` keeps the quantised checkpoints `*_q.pt` that `check_forward.py` loads, the logs, `report.json`, `check_forward.json` and the configuration sweep's logs. The float checkpoints are not kept: `uv run --with torch --with numpy python train.py` recreates them in about 4 minutes (2 threads), then `... train.py export` and `... check_forward.py`.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the in-browser test, both animations stepped, text at least 11 px, no NaN or errors.
- `mk_coverage.py` writes `coverage.json` (every fact of `live.md` and where the page carries it) and verifies it against the built page.
- `save_live.py` copied the Notion fetch verbatim from the session transcript into `live.md`; `extract_paper.py` turned the arXiv HTML into `inputs/paper_v5.txt` and `inputs/table_S4_T*.txt`.
- `inputs/`: the paper text and tables, `v1_extract.txt` and `v2_extract.txt` (the earlier versions' experiment sections, from pdftotext), `related_extracts.txt` (EleutherAI, Barbero et al., BERT's code and Appendix A.2), `later_extracts.txt` (PaLM, GPT-NeoX-20B, LLaMA, Llama 3, Qwen2-VL, DeepSeek-V2, PI, YaRN, ALiBi, Llama 4), `hf_configs.jsonl`, `hf_glue_dev.txt`, `recompute.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 275 KB (118 KB of it the six models' weights, logs and per-position accuracies). `node src/check_page.mjs`: 244 actions, 0 problems in light 920 and dark 390 (both animations stepped, the in-browser test run). `check_forward.py`: PASS (identical predictions on 1,160 sequences across the six variants and the window and PI options, logits within 4.8e-4, attention within 1.1e-5). `mk_coverage.py`: 49 of 49 items verified.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence, a hero figure (one 8-dimensional query and key as 4 rotation pairs at θ = 1, 0.1, 0.01, 0.001, shown at positions (5, 2) and (43, 40): every arrow turns, the per-pair shares and the sum q⊤k = -1.963 are identical; static SVG, illustrative vectors, exact arithmetic from Eqs. 14 to 16), You need and New terms. The paper is CC BY-NC-ND 4.0 on arXiv, not CC BY, so its Figure 1 is redrawn as this hero, not embedded.
- **Owned elsewhere** (one or two sentences each, linked to Positional Encodings): the one-pair dial from zero (was linked to the LLM Architecture Gallery, which no longer carries it), and the long-context toolchain (PI's "catastrophically high attention scores", NTK-aware's base formula, YaRN's temperature, partial RoPE's rotary_pct); linear attention in general links Beyond attention. The paper's own use of each stays.
- **Moved into closed `<details>`** (nothing deleted but fat): the five relative schemes of §2.3, two slips in Eq. 16 and the θ indexing, the Abel-summation derivation of the decay bound, every experiment's recipe (WMT, BERT pretraining, GLUE, Chinese pretraining, Performer), four smaller evidence problems (text against figure, the 1.5 against 1.69 arithmetic, Table 4, the changed splits), and a dated follow-ups block (who uses RoPE; base scaling, PI, YaRN factors, decoupled RoPE, iRoPE, M-RoPE).
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1, also after a mode switch; `check_page.mjs` fails if `shf` or `thn` draws a frame before play or on a mode switch. Header: "Reading: 18 min, plus 4 in closed details."
- **Length**: core 19 min before (4,414 words) plus 1 closed, 18 after (4,209) plus 4 closed; other tabs 14 min, unchanged. The new top section is paid for by what moved into details. What remains is the paper's argument (problem, rotation, the shift test on trained weights, spectrum, decay, linear attention, results and the evidence judgement), which this page owns; the toy, tables and Then and now tabs are tools used across the page and are unchanged apart from links.
- **Ledger** (`ledger.json`): 276 units, core 187, depth 75, owned 6, fat 8 (old reading-time line, tab labels, five sentence-split fragments, the old animation-manners line); `ledger.py check` problems 0.

Rechecked 2026-10-25: `checkpage.sh` 5 tabs, 282.9 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 244 actions, 0 problems (including the no-autoplay checks); `check_forward.py` PASS; `mk_coverage.py` 49 of 49.
