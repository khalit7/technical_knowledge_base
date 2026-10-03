# Training language models to follow instructions with human feedback (InstructGPT): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8180b958d8299996a063, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the reference paper page (`../../attention_is_all_you_need_transformer/src/`), the Switch Transformers page's live-training pattern, and `html_utils/methods/papers.md`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`, with the database Takeaway and the verdict), then Problem, The recipe (Figure 2 redrawn with Table 6 sizes), Data and labelers (Table 1 bars), Step 1 SFT (with the §C.3 PPO-init difference), Step 2 reward model (live K-ranking widget for Eq. 1), Step 3 PPO (Eq. 2, the one-episode PPO against PPO-ptx animation, predict: β = 0), Baselines and evaluation, Results (predict: 1.3B against 175B, Figure 1 decoded; Figures 4 and 6 decoded), The alignment tax (predict: KL or ptx, Figures 33 and 34 decoded), Qualitative, Discussion, How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Run the three steps | `t-run` | The live ingredient: the toy RLHF pipeline trained in the page (stages, samples from every model, what the RM learned), the PPO trainer with five presets and β, γ, seed controls, four live curves and a win rate, the offline sweeps beside the paper's decoded Figures 33 and 36, a reproduces / does not reproduce table, the SFT epoch curve. |
| The paper's numbers, rebuilt | `t-tables` | 24 checks of the text against the paper's own tables and figures; a Bradley-Terry head-to-head calculator; Figures 3, 4 against 30, 5, 7, 33, 34, 36 decoded; the Table 14 explorer; Tables 1, 6 to 13. |
| Then and now | `t-then` | The recipe's seven lines through eight later sources, each change quoted; the fate of each line. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from `papers.md`, and why

- **The live ingredient is a training pipeline, trained in the page.** The paper is a method on top of a model (the table's RLHF row suggests "a preference pair through the loss"); a pair through Eq. 1 is here (the RM widget), but the paper's claims are about what PPO does against a learned reward (over-optimisation, the KL penalty, the alignment tax, the ptx fix), so the toy runs all three steps. Following the Switch lesson, nothing is shipped as weights: the whole pipeline takes about 1 second and a PPO run about 2 seconds in V8, everything is float64 and seeded, and every preset reproduces the offline sweep to the 4 stored decimals (checked by `check_page.mjs`). Following the LoRA lesson, the toy has a known ground truth (the labelers' utility), which the paper never had, so proxy against truth can be shown.
- **"The tables, rebuilt" is mostly figures, decoded.** The paper's results are figures, and its arXiv HTML embeds them as SVGs whose glyphs carry their characters; `decode_figs.py` reads ticks, labels, bars, points and error bars from the vector coordinates (exact, not read off a plot). The tab is renamed "The paper's numbers, rebuilt".
- **Then and now is a recipe card stepped through sources, not a morph**, as for Switch and DDPM: the legacy is a pipeline of seven lines, and each later source changes a few; lines a source does not mention are marked as carried over, not confirmed.
- **"What it takes to use this" is kept** although RLHF is standard, because people still implement PPO-based RLHF and the paper released no code; it says what exists instead (TRL's experimental PPOTrainer, OpenRLHF, the N+ implementation details).
- **Reading length**: about 23 minutes plus 7 in details and answers (the old page was 11). The paper is long and this page owns all of it, and three of the old summary's headline numbers needed their evidence shown; settings, ablations, labeler screening, the Figure 8 examples and the §5.3 to §5.5 discussion are folded into details blocks.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, `mk_sweep_data.py`, assembles `parts/` (each JS part in its own `<script>`, tab wiring last, `#jsErr` box first), expands the link macros (`{{text|url}}`, `n:`, `ax:`, `tab:`, `[[anchor|label]]`, `@@CARD@@`), fails on an unexpanded macro or an em-dash, and fills in the reading time (details and predict answers counted separately) and resources total.
- `paper.json` (metadata, headline numbers, verdict, resources, KB links), `mk_paper.py` (card, Further reading, `window.PAPER` with tables, recompute results and decoded figures; `where_label` knows this paper's continuous appendix numbering).
- `mk_tables.py` turns `inputs/table_*.txt` into `tables.json` (Tables 1, 6 to 14 as printed strings).
- `decode_figs.py` + `svgparse.py`: the vector figures to `inputs/figs.json` (Figures 1, 3, 4, 5, 6, 7, 30, 33, 34, 36). The SVGs themselves are not kept (about 1 MB); the docstring has the download loop.
- `recompute.py` writes `inputs/recompute.json`: dataset totals, Table 1 sums, compute shares, batch and cost arithmetic, Bradley-Terry consistency of Figure 1 with the printed head-to-heads, and the 24 checks with verdicts.
- The toy: `parts/20_js_toy_core.js` (vocabulary, corpus, the MLP language model and its gradient, labelers, the linear RM and Eq. 1, PPO-ptx, evaluation; runs in the page and in node), `dump_case.cjs` + `check_grad.py` (`node dump_case.cjs && uv run --with torch python check_grad.py`; writes `model/check_grad.json`: PASS, language-model, Eq. 1 and PPO-ptx gradients within 5 × 10<sup>-16</sup> of PyTorch autograd, clipping active on 17 of 66 tokens), `sweep.cjs` (`node sweep.cjs`, about 1 minute; writes `model/sweep.json` and `model/sweep.log`), `mk_sweep_data.py` (writes `parts/20b_sweep_data.js`). `model/case.json` is the dumped case (300 KB, regenerated by `dump_case.cjs`).
- `check_page.mjs` (from the repo root, `node technical_knowledge_base/reference/papers/instructgpt/src/check_page.mjs`): every control in light 920 and dark 390, waits for the toy, trains all five presets and one off-sweep setting and requires each preset to equal the sweep, steps the episode animation end to end in both modes with mid-animation screenshots (`../.shots/x-*.png`), SVG text at least 11 px, no NaN, errors or sideways scroll.
- `mk_coverage.py` writes `coverage.json` (67 items of `live.md`, each verified against the built page); `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v1 into `inputs/paper_v1.txt` and `inputs/table_*.txt`.
- `inputs/later_extracts.txt`: every passage quoted from later work (ChatGPT and InstructGPT announcements via the Wayback Machine, Bai et al., Constitutional AI, GPT-4, DPO, Llama 2, Gemini, DeepSeekMath, Tülu 3, DeepSeek-R1, OLMo 2, Gao et al., Huang et al., Sharma et al., Casper et al.) and the tool checks of 3 October 2026.
- `viz_ideas.md`: ideas built and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the Switch page's CSS plus token chips, samples grid, stage boxes, verdict tags, responsive check tables), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference helpers), `12_js_charts` (bars, frames, wrapped titles), `20_js_toy_core`, `20b_sweep_data`, `20c_js_toyrun` (stage-by-stage training without freezing the page, cached PPO runs), `13_js_read`, `21_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 257 KB. `check_page.mjs`: 282 actions, 0 problems (toy ready for the paper tab in about 6 s headless; a PPO run about 2.4 s; all five presets equal the offline sweep). `check_grad.py`: PASS. `mk_coverage.py`: 67 of 67 verified.
