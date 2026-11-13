# Training language models to follow instructions with human feedback (InstructGPT): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8180b958d8299996a063, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the reference paper page (`../../attention_is_all_you_need_transformer/src/`), the Switch Transformers page's live-training pattern, and `.claude/skills/explainer-page/page-kinds/paper.md`.

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
- `check_page.mjs` (from the repo root, `node technical_knowledge_base/whats_new/papers/instructgpt/src/check_page.mjs`): every control in light 920 and dark 390, waits for the toy, trains all five presets and one off-sweep setting and requires each preset to equal the sweep, steps the episode animation end to end in both modes with mid-animation screenshots (`../.shots/x-*.png`), SVG text at least 11 px, no NaN, errors or sideways scroll.
- `mk_coverage.py` writes `coverage.json` (67 items of `live.md`, each verified against the built page); `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v1 into `inputs/paper_v1.txt` and `inputs/table_*.txt`.
- `inputs/later_extracts.txt`: every passage quoted from later work (ChatGPT and InstructGPT announcements via the Wayback Machine, Bai et al., Constitutional AI, GPT-4, DPO, Llama 2, Gemini, DeepSeekMath, Tülu 3, DeepSeek-R1, OLMo 2, Gao et al., Huang et al., Sharma et al., Casper et al.) and the tool checks of 3 October 2026.
- `viz_ideas.md`: ideas built and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the Switch page's CSS plus token chips, samples grid, stage boxes, verdict tags, responsive check tables), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`.
HTML also `02_split` (template, the split layout). JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference helpers, predict widget; `makeAnim` removed 2026-11-13), `12_js_charts` (bars, frames, wrapped titles), `21_js_rd_common` (template, `RD.anim` for Then and now), `20_js_toy_core`, `20b_sweep_data`, `20c_js_toyrun` (stage-by-stage training without freezing the page, cached PPO runs), `_gen_stage` (written by `mk_stage_data.cjs`), `25_js_s3` (template, renderer v2), `13_js_read`, `31_js_sc_hero`, `32_js_sc_ep`, `21_js_run`, `24_js_tables`, `25_js_then`, `99_js_tabs` (the template, storage key `instructgpt-tab`).

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 257 KB. `check_page.mjs`: 282 actions, 0 problems (toy ready for the paper tab in about 6 s headless; a PPO run about 2.4 s; all five presets equal the offline sweep). `check_grad.py`: PASS. `mk_coverage.py`: 67 of 67 verified.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero: the paper's Figure 2 redrawn (it was already on the page, in The recipe) now sits at the top, extended with who labels each step and what each step produces (the SFT model, a 6B RM, InstructGPT), static. The paper is under arXiv's non-exclusive licence, not CC BY, so no figure is embedded; nothing physical to photograph, so no images. Then "You need" (Policy gradients for PPO itself, RL for LLMs for PPO's four models, the alignment page for RLHF as practised today) and the new terms.
- **Visuals inline**: Figure 1, the no-KL toy curve and the Figure 33/34 sweeps left the predict reveals; each sits in its own card right after its question ("answer the question above before you look"); the reveals keep only the explanation. The Run tab stays a tab: it is a lab with several sections that the RM widget, the episode animation and the tax section all use.
- **No autoplay**: `makeAnim` in `11_js_ui.js` patched as on LoRA (waits on step 1; mode switches pause); `90_js_tabs.js` replaced by the template `99_js_tabs.js`. The episode animation says "preparing" until the toy is trained. `check_page.mjs` now fails if `#epi` draws a frame before a click and opens every closed block.
- **Owned elsewhere, a sentence kept and linked**: reward-model over-optimisation in general (Goodhart, Gao et al.'s curve) to Reward hacking; the current framework list to the alignment page.
- **Closed**: prompt cleaning and the §A.2 discrepancy, SFT settings, how the baselines were built, §1's version of the FLAN/T0 comparison, TruthfulQA's secondary results; in the tables tab, Tables 6 to 13. Restatements removed from the toxicity, Figure 8 and §5.1 blocks and one Why-it-matters bullet.
- **Volatile**: TRL's PPOTrainer and OpenRLHF moved to one dated closed block, "Open implementations (checked 3 October 2026)".
- Header: "Reading: 23 min, plus 8 in closed details.", read by `build.sh` from `reading.json`. `mk_coverage.py` keys updated to the condensed wording (67 of 67). The author email in `inputs/paper_v1.txt` is redacted, and `extract_paper.py` now redacts emails.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 22.7 min (5,231 words) | 23.5 min (5,416) |
| The paper, closed | 7.0 min | 7.6 min |
| Run the three steps | 3.5, plus 2.4 closed | unchanged |
| The paper's numbers, rebuilt | 10.3 min | 8.0, plus 2.3 closed |
| Then and now; Further reading | 1.8; 2.2 min | unchanged |
| Visuals drawn in Reading (audit) | 7 | 11 |

Why about 23 minutes is right: the top (core sentence, hero caption, You need, new terms) added about 1.9 minutes and closing settings, baseline construction and secondary results paid back about 1.1. What stays open is the paper's argument in its order plus the evidence section, which the paper page owns; the predict explanations (hidden until answered) count in the core.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
300 units: core 232, depth 63, owned 2, volatile 1, fat 2. 290 drafted by `ledger.py init`; 10 added (core sentence, hero, new terms, two owner links, five script-drawn tables and tools). `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, 262 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 282 actions, 0 problems (no frame before a click, every closed block opened). `mk_coverage.py`: 67 of 67. The toy (`20_js_toy_core.js`) is unchanged, so `check_grad.py` was not rerun.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). The paper tab: the top (core sentence, the hero's step list, You need, New terms) beside the hero stage; Data and labelers beside Table 1; Step 2 beside the live K-ranking widget; Step 3 beside the episode stage; the no-KL prediction (new section `s-ppo2`) beside its chart; Results (`s-res`) beside Figure 1; "More concrete axes" (`s-res2`) beside Figure 4; truthfulness (`s-pub1`) beside Figure 6; the alignment tax beside its sweep chart. Full width (no visual): Problem, The recipe, Step 1, Baselines, FLAN and T0 (`s-res3`), toxicity (`s-pub2`), Qualitative, Discussion, How much to believe, What it takes, Why it matters, Connections. Run the three steps: the intro and the toy's notes beside the pipeline card; samples, what the RM learned, the trainer, the three sweep charts and the SFT epoch chart each beside their note (the static captions moved out of the scripts into the left column; `rmcOut`, `trnQ`, `trnCnt` and `trnOut` moved left, the controls stay with the charts); the reproduces table full width. The paper's numbers: the six figure tools beside their notes; the checks table, Table 14 and the closed tables full width. Then and now: the step list beside the recipe card; the fate table full width.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_hero.js`, Fig. 1, the paper's Figure 2 at its own scale (replaces the static 2D hero): Table 6's training prompts as slabs of 2,000 (12,725, 33,207, 31,144; labeler-written green, 89% and 20%, customer blue), GPT-3 becoming the SFT model, K = 4 to 9 ranked answers into the 6B reward model, the policy's loop with the RM and the KL arc to SFT (β = 0.02), the pretraining stack (8 per episode, γ = 27.8, 2,048,000 examples), and Figure 1's 52.7% against 24.0% on a plinth. Data: `PAPER.rc` (sizes, labeler shares, kl_default, gamma_default, ptx_examples, fig1). The answer blocks and the pretraining stack are schematic (said under the list). Six steps, the camera moving to each step's column.
  - `32_js_sc_ep.js`, Fig. 3, one toy episode through PPO or PPO-ptx (replaces the 2D `makeAnim` episode, which was one frame per word, 9 to 10 steps: now 5 or 6 explained steps under the long-replay rule): "count to three" answered "sure one two three <end>", each word on a plinth with π, π<sub>SFT</sub> and a signed bar (KL penalty -0.26 on "sure", then the whitened advantages), the RM score +1.25 and total reward, the pretraining loss on the episode's 40 windows (SFT 1.57; PPO 4.44; PPO-ptx 1.99, then 1.80 with the ptx gradient), the pretraining stack flowing into the policy in PPO-ptx mode. Data: `parts/_gen_stage.js`, written by `node mk_stage_data.cjs` (about 5 s) with exactly the code of the old animation (seed, episode 0, one plain step of 0.5); `check_stages.mjs` recomputes it from the live toy in the page. Two lists (`sx-ep-ppo`, `sx-ep-ptx`). "Another prompt" was dropped: the episode is fixed so the step lists can state its numbers.
- **Owned elsewhere, linked**: one ranking taken into its pairs and an RM fitted to them (Alignment, section 3, `stg-rm`) and one PPO step model by model (Alignment, section 4, `stg-rl`); not rebuilt.
- **Kept 2D**: Table 1, Figures 1, 4, 6, 33/34, the no-KL curve, the K-ranking widget (a reader-driven widget), the Run tab's charts and samples, the Tables tab's tools and tables, Then and now (a card of seven text lines changing per source): each is a number on an axis, a table or text.
- **Motion**: `makeAnim` removed from `11_js_ui.js`; Then and now's own stepper replaced by `RD.anim` (template `21_js_rd_common.js`, unchanged), its script-written captions now the static list `sx-thn`. `05z_errbox.js.html` and `99_js_tabs.js` are the templates (storage key `instructgpt-tab`). `check_page.mjs`: the never-autoplay assertion on `#epi` is inverted (both stages and Then and now must play when scrolled into view); it steps both stages, both modes. `check_stages.mjs` (after GRAFT's): splits two columns at 1400, both stages in both modes at 1400 light, 920 light and 390 dark, flows stopping off screen, reduced motion, Then and now, 68 step-list numbers against `PAPER.rc` and `IG_EP`, and `IG_EP` against the live toy.
- On phones (under 600 px) both scenes look down more steeply so the wide scene is not a thin band; faded plate labels hide there.

## Length judgement (2026-11-13)
| | Before (2026-11-13, audit) | After |
|---|---|---|
| The paper, core | 23.6 min (5,431 words) | 27.2 min (6,261) |
| The paper, closed | 7.6 min | 7.6 min |
| Run the three steps | 3.5, plus 2.4 closed | 3.8, plus 2.4 (captions moved out of scripts) |
| The paper's numbers, rebuilt | 8.0, plus 2.3 closed | unchanged |
| Then and now | 1.8 min | 2.7 min (the nine source captions, script-written before, now the step list) |
| Visuals drawn in Reading (audit) | 11 | 12 |

The growth is the step lists (17 items, including the hidden PPO-ptx list the audit counts): text the old animations showed one caption at a time, now written out beside the stages. The recipe's three-item list became the hero's step list. Nothing was cut. A reader following one mode of Fig. 3 reads about a minute less. Header: "Reading: 27 min, plus 8 in closed details." Pages quoting 23 minutes need `check_times.py --fix` by the lead.

Ledger: 322 units (core 254, depth 63, owned 2, volatile 1, fat 2); 22 added (the step-list items of Fig. 1, Fig. 3 and Then and now, and two owner-link sentences); keys re-pointed on units 21, 22, 23 (the removed recipe list, now the hero's steps), 26, 27 (the hero caption), 82 (the episode caption) and 269 (Then and now's old controls). `ledger.py check`: problems 0.
