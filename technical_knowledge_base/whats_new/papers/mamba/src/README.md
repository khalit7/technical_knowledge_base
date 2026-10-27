# Mamba: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8179984fc3a1fee4c36a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the reference folder `attention_is_all_you_need_transformer/src/`, with RoFormer's `mk_paper.py` (verdict line) and `check_page.mjs`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; Problem (KV cache against fixed state animation), State spaces, Selection (Algorithms 1 and 2 table, predict question, Selective Copying animation on the trained toys), Δ as a gate (Theorem 1 widget, the code's first-order B̄), The scan (Blelloch animation, HBM count), The block (diagram and recount), Results (zero-shot chart, memory and batch calculator, two predict questions), How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Run a toy Mamba | `t-run` | Five trained toys: Selective Copying editor and in-browser test; induction heads at any length (Mamba in recurrent mode); offline extrapolation to 2^20 against Table 11; training curves; what the toy does and does not show. |
| The paper's tables, rebuilt | `t-tables` | Tables 1, 11, 3 (sortable, minus-Pythia view, best-in-class and twice-the-size checks, binomial z of the 2.8B gaps), 6 to 9, 13, 4, 5, 15, 12; parameter recount of the checkpoints; 19 claims checked. |
| Then and now | `t-then` | Layer stacks of nine released models from their configs (Transformer++, Mamba, Mamba-2, Mamba-2 + attention, Jamba, Nemotron-H, Granite 4.0-H, Falcon-H1, Nemotron 3 Nano), KV cache and state; memory per sequence at any context. |
| Further reading | `t-more` | Generated from `paper.json`. |

Departures from papers.md, and why: the live ingredient is the one the method's table names for Mamba (a selective scan against an LTI layer and against attention on synthetic copy tasks), but two tasks instead of one, because the paper's two synthetic claims are different (content-aware selection, and length extrapolation) and the toy reproduces one and not the other. "Then and now" is about hybrids rather than a morph of one block, because what changed after the paper is the mix of layers, not the Mamba block itself. The arXiv HTML numbers several of the PDF's tables as figures; the page uses the PDF numbers and links the HTML anchors (mapping in `mk_tables.py`).

## Files

- `build.sh`: as the reference (macros `{{text|url}}`, `n:`, `ax:`, `tab:`, `[[anchor|label]]`, `@@CARD@@`; fails on an em-dash or an unexpanded macro). Do not put `{{` or `}}` in a JS part (the build rejects it); `25_js_then.js` uses `«text|url»` for its links.
- `paper.json` (card, resources, connections, verdict), `mk_tables.py` (writes `tables.json` from the arXiv HTML; bold cells of Table 3 read from the markup), `mk_paper.py`, `recompute.py` (every derived number: Table 3 checks and binomial errors from `inputs/eval_sizes.json`, ablation gaps, Table 13 differences, Table 15 ratios, the parameter recount from `inputs/mamba_configs.json`, 12D², KV against state, HBM counts, the hybrids from `inputs/hybrid_configs.json`; writes `inputs/recompute.json`, which also picks up `model/check_forward.json`, `model/probe.json` and `model/long/extrap_check.json`).
- Toy models: `train.py` (tasks, the Mamba block as `mamba_simple.py` with a hand-written scan backward and a shifted-multiply conv for CPU speed, the attention baseline, training, `export`, `extrap`), `check_forward.py` (JS against PyTorch), `probe.py` (what the trained Selective Copying model uses: Δ statistics and freeze tests). `model/` holds the float and 6-bit checkpoints of the five shipped models (about 1 MB), their logs, `report.json`, `extrap.json`, `check_forward.json`, `probe.json`, and `long/` (the log and result of one 20,000-step retraining of ih_s6, checkpoint not kept).
  - `uv run --with torch --with numpy python train.py` (about 20 minutes on 2 threads: sc 5 minutes each, ih 1 to 5), then `... train.py export`, `... train.py extrap` (about 15 minutes; 2^20 tokens through the Mamba models in chunks), `... check_forward.py`, `... probe.py`.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the in-browser tests, every animation stepped, text under 11 px, NaN, errors, sideways scroll.
- `mk_coverage.py` writes `coverage.json` (52 items of `live.md`, each verified against the built page, plus the corrections). `save_live.py` copied the Notion fetch verbatim from the session transcript; `extract_paper.py` turned the arXiv HTML into `inputs/paper_v2.txt` and `inputs/table_*.txt`.
- `inputs/`: paper text and tables, `code_extracts.txt` (the lines quoted from the released code and README), `later_extracts.txt` (abstracts and tables of the later papers quoted: Mamba-2, Mamba-3, Waleffe et al., Jelassi et al., Zoology, BASED, Jamba, Nemotron-H, Nemotron Nano 2, Falcon-H1, Park et al. (Can Mamba learn how to learn?), plus the OpenReview venue lookup), the configs, `eval_sizes.json`, `recompute.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores (rows `P-mamba.k`).

## Toy results (3 October 2026)

- Selective Copying (length 48, 6 tokens): selective 99.83% of tokens on 1,000 held-out sequences, time-invariant 67.37% (paper at length 4,096: 99.8% and 56.4%). Reproduces the direction independently. The LTI model was still improving slowly at its 8,000 steps.
- Induction heads (trained at 64): all three perfect at 64; at 4× the length S6 98%, attention 13%, LTI 10%; S6 fades towards chance by 64× and gives a constant answer from 2^17. Does not reproduce the paper's perfect extrapolation; 20,000 steps of training instead of 1,500 did not change it.
- The trained S6 does not show the textbook Δ gate (mean Δ equal on data and noise); its layer-2 Δ tracks position (correlation 0.68), and freezing Δ drops accuracy to 38% or 23%.
- No held-out sequence occurred in training (hashes of every training sequence). 6-bit quantisation cost at most 2.5 points (the LTI model). JS against PyTorch: identical predictions on 560 of 560 sequences.

## Size

`index.html` is about 307 KB (306,897 bytes), slightly over the 300 KB guide of the time (retired 2026-10-17): the five toy models' weights and logs (`20_model_data.js`) take 121 KB, the rest of the page about 186 KB. Five models are needed because the page compares S6, S4 and attention on two tasks. `model/` holds about 0.9 MB (float checkpoints for `export`, the 6-bit `_q.pt` files that `check_forward.py`, `probe.py` and `extrap` load, logs and results).

## Audit (3 October 2026, second session)

The first builder's session ended without a report. Found: the page had been built before the final extrapolation run (`model/extrap.json`, 01:46) and before the last edits to `paper.json` and the Run and Then tabs, so the shipped extrapolation numbers were from the first pass (for example 98.0% instead of 98.5% at 4 times). Re-ran `train.py export` (weights byte-identical; it only re-embeds `extrap.json`), `check_forward.py` (560 of 560 identical), rebuilt, re-ran `mk_coverage.py` (52 of 52), and kept the printed one-decimal precision in the "twice the size" list. Removed two empty log files.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence, the hero (the paper's own Figure 1, the selective SSM with its selection mechanism and the SRAM/HBM hierarchy; the paper is CC BY 4.0, so the SVG is rasterised to `img/fig1_selective_ssm.webp` and credited, see `img/CREDITS.md`), You need (Beyond attention for linear recurrences and S4, Long context for the KV cache) and New terms (LTI, selection and S6, Δ, hardware-aware scan).
- **Owned elsewhere** (Beyond attention owns SSMs, Mamba-2 and hybrids): "State spaces, before Mamba" keeps the recurrence and one paragraph on what this paper uses (LTI means convolution; the D × N state and its O(BLDN) cost), with the zero-order hold, the convolution kernel and the LTI baselines in a closed block; Why it matters names Mamba-2 and Mamba-3 with a link to the owner and keeps the paper-specific claims; the hybrids paragraph keeps the conclusion and links the owner and this page's Then and now.
- **Moved into closed `<details>`** (nothing deleted but fat): the S4 background above, Theorem 1's proof and Δ's initialisation and rank (the broadcast reason stays in the core), real states and the S4D-Real initialisation, the audio results (one summary sentence with the SC09 FID stays), and a dated block of who ships hybrids. In the Tables tab, Tables 1 and 3 stay open; Tables 11, 6 to 10, 13, 4 and 5, 15, the parameter recount with Table 12, and the checks are closed blocks (a `data-to` link opens the block under its target section).
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1, also after a mode switch, and "New random input" no longer resets to a half-drawn frame; `check_page.mjs` fails if `cmp`, `sel`, `scn` or `thn` draws a frame before play or on a mode switch, and opens every closed block before auditing a tab. Header: "Reading: 20 min, plus 2 in closed details." (`reading.json`, from audit_pages.mjs).
- **Length**: Reading core 21 min before (4,756 words) plus 0 closed, 20 after (4,677, including about 350 words of new top) plus 2 closed; other tabs 18 min before, 12 core plus 6 closed after (the Tables tab went from 2,267 words open to 819 open and 1,458 closed). The core stays near its old length because it is the paper's argument in order (problem, selection, Δ as a gate, the scan, the block, results, evidence, use), all owned here; the toy tab and Then and now stay as tools the Reading tab points into.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 237 units, core 179, depth 49, owned 3, volatile 1, fat 5 (old reading-time line, tab labels, three sentence-split heading fragments); `ledger.py check` problems 0.
- `mk_coverage.py`: the reading-time item now looks for the new header line; 52 of 52.

Rechecked 2026-10-25: `checkpage.sh` 5 tabs, 313 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 476 actions, 0 problems; `mk_coverage.py` 52 of 52. `check_forward.py` not rerun (weights and model code unchanged).
- Privacy: the two author emails in `inputs/paper_v2.txt` are replaced with [email removed], and `extract_paper.py` now redacts emails when it rewrites the file.
