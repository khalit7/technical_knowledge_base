# Mamba: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8179984fc3a1fee4c36a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`html_utils/methods/papers.md`) and the reference folder `attention_is_all_you_need_transformer/src/`, with RoFormer's `mk_paper.py` (verdict line) and `check_page.mjs`.

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

`index.html` is about 307 KB (306,897 bytes), slightly over the 300 KB guide: the five toy models' weights and logs (`20_model_data.js`) take 121 KB, the rest of the page about 186 KB. Five models are needed because the page compares S6, S4 and attention on two tasks. `model/` holds about 0.9 MB (float checkpoints for `export`, the 6-bit `_q.pt` files that `check_forward.py`, `probe.py` and `extrap` load, logs and results).

## Audit (3 October 2026, second session)

The first builder's session ended without a report. Found: the page had been built before the final extrapolation run (`model/extrap.json`, 01:46) and before the last edits to `paper.json` and the Run and Then tabs, so the shipped extrapolation numbers were from the first pass (for example 98.0% instead of 98.5% at 4 times). Re-ran `train.py export` (weights byte-identical; it only re-embeds `extrap.json`), `check_forward.py` (560 of 560 identical), rebuilt, re-ran `mk_coverage.py` (52 of 52), and kept the printed one-decimal precision in the "twice the size" list. Removed two empty log files.
