# DeepSeek-R1: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d813faca4f7a51eaa0c65, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on `html_utils/methods/papers.md` with the DeepSeekMath folder's copies of the shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `90_js_tabs`, `mk_paper.py`, `mk_coverage.py`, `check_page.mjs`, `build.sh`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; a box saying what is linked rather than rebuilt; Problem; R1-Zero (base, GRPO and the PPO comparison, rule rewards, template, settings, RL data with the epochs arithmetic); What emerged (Figure 1 decoded with the v1 71.0% toggle, predict: length, the GRPO-group animation with R1-Zero's and R1's reward, Figures 8 and 9 decoded, the aha moment and its caveats); the four stages (Table 3 animation, each stage in detail, predict: cold start, Figure 7 and Figure 6 decoded); Distillation (chart, predict: distil or RL at 32B, Table 17); Results (setup, decontamination, Table 8 chart, fresh tests, Figure 18 decoded with its band); Failed attempts; Cost and infrastructure; Safety; Two versions; How much to believe; What it takes; Why it matters; Connections. |
| Train a tiny R1-Zero | `t-run` | Live ingredient: a 1,514-parameter policy trained in the browser with GRPO as R1-Zero was set up (16 answers, 16 minibatches per rollout, ε, KL to a refreshed reference, a length cap raised at 79% of the run); presets for R1-Zero, long cap, language reward, cold start; ε, objective (Dr. GRPO), G and seed; exact accuracy, length, language, clip share, accuracy by length, sampled traces; the three-seed sweep; what reproduces and what does not. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 3 to 17 and v1 against v2 (sort, difference from any column, the paper's bold), 46 checks of numbers in the text, the decoded-figure calibration table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: a training-recipe toy, not a trace replay.** R1 is a method-on-a-model paper, but no traces of R1-Zero's training are released and the GRPO update itself is already trained live on the DeepSeekMath page. What is specific to R1 is the RL *dynamics*: length emerging from an outcome reward, the length cap, the clip ratio of 10 with 16 off-policy minibatches, the language reward, the cold start. The toy runs exactly those; the task makes thinking useful by construction (one digit read per thinking token), which the tab says plainly. Gradients checked against PyTorch autograd of Eq. 1 to 3 (`check_engine.py`, worst difference 1e-16, with the clip active).
- **Figures decoded from the PDF, not the HTML.** The arXiv HTML carries no images for most figures; the v2 PDF draws them as vectors. `decode_figs.py` (PyMuPDF) calibrates every axis on its tick labels (residuals in the Tables tab). This exposed: Figure 1's peak is 77.7%, not the 77.9% of Table 3; v1's 71.0% equals the curve at step 8,400; Figure 18's "<7,000 / >18,000" are the standard-deviation band, not the mean.
- **No Then and now tab.** What followed (Dr. GRPO, DAPO, distillation datasets, R1-0528) is short and sourced in Why it matters; the GRPO objective's later history is the DeepSeekMath page's Then and now, and the DeepSeek line is on the lab page.
- **The R1 recipe is not drawn as a flow**, because the DeepSeek lab page already has that ("recipe river"); this page animates what is new in the Nature version instead, the stage-by-stage scores of Table 3.
- **Reading length** about 35 minutes by the build's count (which includes hidden predict reveals, captions and the version table) against the old page's 16: the page owns the paper's details, the Nature version is four times longer than v1, and the evidence section draws on the peer review file. Candidates to fold into details blocks if Khalid prefers shorter: the RL data list, the Stage 1 data-making paragraph, Safety, the version table.

## What reproduces, and corrections to the old summary

- Reproduce from the paper's own numbers: Table 7's sums and GPU hours, Table 5's 804,745 and 5,355.3, the USAMO index, AIME 2025 percentages, all distillation claims, the 5- to 7-fold reflective words, the level 5 curve, v1 and v2 comparison tables identical in 126 cells.
- Do not add up or disagree: 1.6 epochs implies 208,000 questions against 80K to 88K prompts; Table 4's 17K code against the text's 17K + 8K; "4 days, or roughly 80 hours"; the jailbreak rejection rates swapped in the text; bold "significance" on 0.2-point margins.
- Corrections: "AlpacaEval +25%, ArenaHard +17%" are points (41% and 22% relative); length grows to about 14,200 tokens (28 times), not "~10k+"; small models do gain from pure RL (Qwen2-Math-7B-Zero 22.3% AIME), "cannot discover at any reasonable compute" overstated; the market reaction preceded the $294K figure by eight months; the distilled students carry Qwen and Llama licences, not only MIT.

## Files

- `save_live.py` (Notion fetch into `live.md`), `extract_paper.py` (arXiv HTML v1 and v2 to `inputs/paper_v*.txt` and `inputs/table_v*_*.txt`), `save_extracts.py` (README, repository and Zenodo listings, R1-0528 card, prices, CNBC line, arXiv abstracts, Nature metadata and peer-review quotes into `inputs/later_extracts.txt`, `inputs/nature_extracts.txt`).
- `decode_figs.py` (needs the v2 PDF, not kept): `inputs/figs.json`. `mk_tables.py` (`--bold <v2 html>` once for `inputs/bold_v2.json`): `tables.json`. `recompute.py`: `inputs/recompute.json`.
- `parts/22_js_toy.js`: the toy engine (browser and node). `toy_sweep.mjs` (node, about a minute): base model, sweep, traces, animation group into `inputs/toy.json` and `parts/_gen_toy.js`. `check_engine.mjs` then `uv run --with torch --with numpy python check_engine.py`: `model/check_engine.json` (`model/engine_case.json` is regenerated and gitignored).
- `check_page.mjs` (from the repo root): every control in light 920 and dark 390, the default run must reproduce the sweep, both animations stepped. `shoot.mjs`: element screenshots for review. `mk_coverage.py`: `coverage.json` (65 of 65).

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 285 KB. `check_page.mjs`: 264 actions, 0 problems; the default run trains in about 2.5 s in headless Chrome and matches the sweep at all 21 checkpoints within its 3-decimal storage. `check_engine.py`: PASS.
