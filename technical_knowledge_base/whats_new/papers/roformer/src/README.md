# RoFormer (RoPE): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81cfa5e9f54459720098, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict (generated from `paper.json`), the core idea in one sentence beside the hero stage (Fig. 1: one query and key as a tower of 4 rotation pairs, rotated to (5, 2), slid to (43, 40), then the key moved to 33), You need and New terms, then Problem, Idea, Rotation (beside the 8-pair dials widget), The shift test (Fig. 2: two trained models' attention as bar fields while the digits slide), The frequency spectrum, Long-term decay (Fig. 3: why the bound falls, then Figure 2 recomputed with the actual-score overlay), Linear attention, Results, How much of this to believe, Why it matters, Connections. Three predict-then-reveal questions (shift, decay, GLUE). |
| Train short, test long | `t-run` | Six trained one-layer toy models (RoPE, sinusoidal, learned absolute, none, linear + RoPE, linear none) running in the browser: run a sequence up to 128 with a sliding window or Position Interpolation, attention by offset for one query, accuracy by position (PyTorch and in-browser), training curves, what reproduces and what does not. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 5, the GLUE split toggle (as printed, or against a validation-set BERT-base), Table 4 against length, Table 5 with 95% intervals and the gap's standard error, v1's splits, EleutherAI's replication, Figure 3 described. |
| Then and now | `t-then` | An 11-step animation of the RoPE spectrum (turns per pair in context) from the 2017 sinusoid to Llama 4's iRoPE, its steps explained in the step list beside it, each from its paper or config.json; the changed and survived table. |
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
- `check_page.mjs` (from the repo root with node): every control in light 1400 and 920 and dark 390, the in-browser test, the Then and now animation stepped, autoplay of every stage and animation, text at least 11 px, no NaN or errors. `check_stages.mjs`: the 2026-11-06 motion and layout rules for the three stages and the 2D animation, and the step lists' numbers.
- Scenes: `31_js_sc_hero.js`, `32_js_sc_shift.js`, `33_js_sc_decay.js` (renderer `25_js_s3.js`); each exposes its numbers (`window.__hero`, `__shift`, `__decay`) for `check_stages.mjs`.
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

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js` (renderer v2), `05z_errbox.js.html`; `99_js_tabs.js` from the template with the storage key `rf-tab`, plus the page's rule that a `data-to` link opens the closed block holding its target. `11_js_ui.js` is Mamba's copy (its `makeAnim` has the motion rules of `RD.anim`: autoplay once half in view, pause off screen, stop for good on any control or at the last step, nothing under reduced motion, an `ol.sx` per mode); `21_js_rd_common.js` is not used. `build.sh` finds the repository root by path instead of asking git.

What changed and why:
- **Three 3D stages** (one scene file each), all driven by the page's own arithmetic or model:
  - `31_js_sc_hero.js`, the top (replaces the static hero SVG): the hero's own 8-dimensional query and key (illustrative angles and lengths, unchanged) as signed bars, then as a tower of 4 horizontal dials at θ = 1, 0.1, 0.01, 0.001 (fast at the top), rotated to (5, 2), slid to (43, 40), then the key moved to 33; each pair's share as a signed bar on a plinth streaming into the sum. Shares and sums exact (−0.951, −1.963, −1.963, −3.090). Distinct from the owner's Fig. 4 on Positional Encodings (one pair from zero, then 16 upright dials), which the page links.
  - `32_js_sc_shift.js`, The shift test (replaces the 2D two-mode heat-map animation `shf`): both trained toys at once, each best-tracking head as a 12 × 12 bar field (height = weight, offsets 1 and 4 gold), the 12 digits sliding along the 32 trained positions with flows into both models, step-1 heights as outlines; four steps (0, 4, then 8 to 20 as one glide, then a close view of the sinusoidal head). Weights from `RF.run` (22_js_model.js, checked against PyTorch). The old per-step captions and counters became the step list; its numbers are checked against the live forward pass.
  - `33_js_sc_decay.js`, Long-term decay (new): why Figure 2's bound falls. At d = 128 the 64 unit arrows e^(−irθ_j) are added head to tail on the floor, a post at each partial sum |S_j| tall; the average post height is the plotted bound (32.50, 19.82, 10.09, 6.54 at 0, 8, 64, 256; 19.82 equals recompute.py). Then the decay chart's first Gaussian draw as the h_j-weighted walk, whose end's real part is the score (11.52 at 0, 12.10 at 256; mean |score| over the 200 draws 9.63 and 8.89). This turns the "decay is a bound" caveat (Barbero et al.) from a sentence into a picture.
- **2D with a step list**: Then and now (`thn`): its 11 captions, formerly drawn by script, are now the static list `sx-thn` (links included); the counters stay as a live readout.
- **Split layout**: Core beside the hero stage; Rotation beside the 8-dial widget (its Try text moved to the left); The shift test and Long-term decay beside their stages; Figure 2 recomputed beside its chart. Train short, test long: the sequence runner and offsets chart beside their notes, accuracy by position and training curves beside theirs. Tables: Table 4 and Table 5 beside their charts. Full width: Problem, Idea, The frequency spectrum, Linear attention, Results (its GLUE reveal), How much to believe, Why it matters, Connections, the Run tab's intro, linear-attention stats and verdict, Tables 1 to 3 and EleutherAI's table, Figure 3 described, the changed-and-survived table, Further reading.
- **Kept 2D**: the 8-dial widget (a slider tool; the 3D tower covers the same idea as a picture), Figure 2's chart (a curve with selectors), the Run tab's tools and curves, Table 4 and 5 charts, the GLUE reveal bars, Then and now (a log-scale bar chart), every table.
- **Colours**: query orange and key teal on the hero and the 8-dial widget (was blue and orange), as on every page.
- **Owner links**: Positional Encodings owns RoPE as practised and its 3D dials (Fig. 4 RoPE from zero, Fig. 6 each method reshaping the dials); the top links its Fig. 4, Then and now still links its per-model YaRN bands.

### Length judgement (2026-11-13)
| | Before (audit, 2026-11-13) | After |
|---|---|---|
| The paper, core | 18.3 min (4,210 words) | 22.0 min (5,059) |
| The paper, closed | 4.0 min (926) | unchanged |
| Train short, test long | 4.5, plus 2.0 closed | unchanged |
| The paper's tables, rebuilt | 3.4 | unchanged |
| Then and now | 2.0 (469) | 4.1 (936) |
| Visuals drawn in Reading (audit) | 4 | 5 |

The growth is the step lists. Then and now's captions were drawn by script and invisible to the audit; now written out (about 470 words). In Reading, the hero, shift and decay lists replace the old hero caption and the shift animation's script-drawn captions, and add the decay mechanism (why the bound falls, and one Gaussian draw that does not decay), which the page previously asserted in a sentence and a closed derivation. Nothing was cut but repetition. Header: "Reading: 22 min, plus 4 in closed details." (`reading.json`).

Ledger: 292 units (core 203, depth 75, owned 6, fat 8); 16 added (5 for facts new or formerly script-only in the Reading lists, 11 for the Then and now steps); keys re-pointed on units 66, 71, 72, 194, 195, 226 and 242 (each marked `rekeyed`). Owned units 160 to 163, 275 and 276 still pass at the owner. `ledger.py check`: problems 0. `mk_coverage.py`: 49 of 49.

Checks (2026-11-13): `checkpage.sh` 5 tabs, emdash 0, errbox 1, clipped 0, fail=0; `check_stages.mjs` (new: three stages and one 2D animation at 1400 and 920 light and 390 dark, autoplay, list lengths, off-screen and reduced motion, and the step lists' numbers against the page's computations) problems 0; `check_page.mjs` (now 1400 and 920 light, 390 dark; asserts autoplay instead of forbidding it; opens closed blocks) problems 0; `verify_layout.mjs` problems 0. `check_forward.py` was not rerun: the model files are unchanged.
