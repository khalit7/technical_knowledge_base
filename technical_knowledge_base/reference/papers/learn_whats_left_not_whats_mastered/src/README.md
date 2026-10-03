# Learn What's Left, Not What's Mastered (SA-MRPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e38b0fe72f3daf44bc, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `90_js_tabs`, `mk_paper.py`, `mk_coverage.py`, `check_page.mjs`, `build.sh`), via the DeepSeekMath page's copies.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; One group (Figure 1 animated through GRPO, GDPO and SA-MRPO, with γ and Eq. 1 controls; sign-flip predict question); Method (the four steps, special cases, the 7-of-8 predict question); What it does not promise (§4.2); Setup; Results (Table 1 differences with an eval-noise band, Table 2 against the released model, code); γ (Table 4 chart, the step-0 predict question, the γ and epoch mismatches); How much to believe; What it takes; Why it matters; Connections. |
| Train the toy | `t-run` | Live ingredient: a multi-reward RL toy trained in the browser (two settings, ten methods plus a custom γ and fixed weight), all methods over 8 seeds, the γ sweep against the fixed-weight sweep (re-runnable in the page), the share of the update the easy objective draws, the PyTorch check, what the toy can and cannot test. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 4 with differences from GDPO, Figure 1 recomputed six ways, 13 claims checked. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the advantage rules run live on a toy** (training-recipe row), not a trace replay: SA-MRPO is an advantage construction, and the decisive question (does it beat simply lowering the easy objective's fixed weight?) can be answered exactly on a toy with every sample, reward and budget shared. Trained in the browser, deterministic; no weights shipped. JS advantages and gradients checked against PyTorch autograd of the paper's formulas and clipped surrogate: 8.9e-16 and 3.1e-16.
- **The toy disagrees with the paper, shown, not tuned away**: in the binary-budget setting (Tables 1 and 4) SA-MRPO changes nothing measurable (the length objective draws under 4% of the update at the start); in the graded setting (Table 2) it trades length for accuracy as claimed, but a fixed smaller weight reaches 1.3 to 2.1 more points of accuracy at the same length reward. The toy design was changed once before the sweep (logged in `inputs/toy_design_log.txt`).
- **No "Then and now" tab**: the paper is six weeks old. The concurrent methods (DVAO, GD2PO, SAW, Focal Reward) are linked, not rebuilt.
- **No code tab or code card**: the paper releases no code; the card and Further reading point to GDPO's open code instead (`mk_paper.py` handles `code: null`).
- **Figures are PNGs**: Figure 1 is recomputed from its printed rewards (exact); Figure 2's curves are not read, only its printed axis ranges are used.
- **Reading length** about 20 minutes against the old page's 10 (the count includes predict reveals and chart captions): the page owns the evidence judgement and the toy results.

## Corrections to the old Notion summary

- The γ ablation's downstream table (Table 4) is 3B only; 7B appears only in Figure 2's training curves.
- γ = 0.5 is the ablation's best, but the main 3B two-objective result in Table 1 used γ = 0.25 (Table 4's caption); the other runs' γ is unstated, and γ was picked on the test benchmarks.
- "EXCEED essentially unchanged": small, but it rises in 10 of 15 cells and falls in 2 (3B two objectives: up on 4 of 5).
- "Comparable bug rates": SA-MRPO's bug rate is equal or higher on all four code benchmarks.
- "Wall-clock overhead essentially zero" is not measured in the paper (derived, and true).
- New findings: Figure 1's SA-MRPO row matches only γ = 1 without Eq. 1; §5.5 ("one epoch") contradicts §5.1 ("3 epochs") given Table 4's columns equal Table 1's; Table 2's runs end far below the released R1-Distill-Qwen-7B; the binary length budget (4,000) sits 96 tokens under the training cap (4,096), so that objective is satisfied from the start.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_S5_T*.txt`), `mk_tables.py` (`tables.json`, every value verified in reading order against the extracted text), `recompute.py` (`inputs/recompute.json`: Figure 1, the flip threshold, Table 1 to 4 deltas and averages, eval-noise standard errors, the share-of-update estimate, steps per epoch).
- `parts/22_js_toy.js`: the toy engine (environment, the three advantage recipes, gradient, Adam, exact evaluation); runs in the browser and in node.
- `toy_sweep.mjs` (node, about 10 s): every toy number (`inputs/toy.json`, `parts/_gen_toydata.js`).
- `check_engine.mjs` then `uv run --with torch --with numpy python check_engine.py`: `model/check_engine.json` (PASS). `model/engine_case.json` (0.8 MB) is regenerated and gitignored.
- `inputs/`: paper text and tables, `gdpo_extracts.txt` (quoted GDPO passages), `other_extracts.txt` (R1 and Qwen2.5 table rows, dataset sizes, the Sober Look abstract, GDPO licence), `toy_design_log.txt`.
- `check_page.mjs` (from the repo root with node): every control in both themes and widths, a custom live run, the full frontier sweep in the browser (must match `toy_sweep.mjs`), the Figure 1 animation stepped in all three modes. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 161 KB. `check_page.mjs`: 0 problems; the in-browser sweep matches `toy_sweep.mjs` to 5e-5 (the sweep stores 4 decimals). `check_engine.py`: PASS. `mk_coverage.py`: 44 of 44.
