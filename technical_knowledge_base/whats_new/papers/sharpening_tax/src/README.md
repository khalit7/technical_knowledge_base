# Sharpening Tax in Post-Training: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3fe5c17b0d0d81efa2a9f532c14c87a3, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row had no old body ("Being built in the technical_knowledge_base repository."), no child pages, databases or video, so coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `90_js_tabs` (replaced on 2026-10-26 by the skill template `99_js_tabs.js`), `mk_paper.py`, `build.sh`) via the SA-MRPO page's copies; `check_page.mjs` and `mk_coverage.py` rewritten for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; Setup (metrics with a one-task pass@k chart, benchmarks, models, harness); Base against post-trained (crossover predict question on real counts, scale, Stage 1: every task of a cell as a 3D bar field under both models, consistency); The tax (Eqs. 1 to 3, Proposition 1, a per-task retry-value chart, where it is charged, what it is not, Figure 7 checked, routing); Why a tax (Theorem 2 predict question with a lab on real tasks, Table 8); PTGS (global-temperature predict question, Eq. 4 chart, Theorem 3); PTGS results (Table 2, ablations, test-time variant, posterior accuracy); How much to believe; What it takes; Why it matters; Connections. |
| Replay the 42 cells | `t-run` | Live ingredient 1: the authors' released per-task counts run through the paper's estimators in the browser, any cell, beside the printed Table 7; Tax across budgets; a 42-cell map (coverage gap against TaxS). |
| Train with PTGS | `t-toy` | Live ingredient 2: a port of the authors' CPU toy. One real batch through both samplers (before/after animation with step lists, Theorem 3 on real prompts); the ten-seed sweep of four arms; training traces; a live run that must equal the sweep; the authors' own toy table; engine check. |
| The paper's tables, rebuilt | `t-tables` | Every check with paper and page numbers; Table 7 explorer with the replay beside it; Tables 2, 9, 10 as intervals; Table 4. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **Two live ingredients, neither a trained toy model of the paper's own experiments.** The paper is empirical plus a sampler. Its main evidence ships as data (per-task counts of all 84 runs), so the first ingredient replays that data (the empirical-paper row: rebuild figures from released data, recompute). PTGS's own evidence (RL on a 7B model) cannot run here; the authors' released CPU toy shows the mechanism, so the second ingredient is a JS port of that toy, run live, rather than a new toy design.
- **No "Then and now"**: the paper is three weeks old. The debate it joins lives in the RL for LLMs page, section 9, which is linked rather than rebuilt (that page already has an illustrative sharpening against expansion chart; this page uses only real counts).
- **Table and figure numbers follow the PDF**: the arXiv HTML drops the numbers of the two main-text wrap tables and renumbers the appendix tables and figures from 5 on; the paper's text uses the PDF numbers. Links go to the HTML anchors (`inputs/anchors.txt`); the two wrap tables and wrap figure have no anchor, so their links go to §3 or §5.
- **The toy differs from the authors' in its random generator only** (mulberry32 instead of numpy's PCG64), so runs agree in distribution, not draw for draw; 10 seeds instead of 5.
- **Reading time**: see the light pass below; the header shows the measured minutes from `reading.json`.

## Corrections and findings

- The first Takeaway (written 2026-10-19 by the update run) said base models beat their post-trained versions at pass@K in "most of 42 cases"; that is the tax count (TaxS(128) > 0 in 36 of 42). The property was corrected in Notion the same day to state both counts. Base pass@128 is higher in 26 of 42, with the printed 95% interval clear of zero in 18; post-trained clearly ahead in 13.
- Figure 7's rho = 0.85 (TaxS(8) on half the tasks predicting TaxS(32) on the other half): over 200 random splits the replay averages 0.79 (5th to 95th percentile 0.73 to 0.85); 0.85 is what the two give on all tasks with no split.
- PTGS's tax reductions are within the noise of five runs (about 0.9 and 1.0 standard errors from the printed intervals); a fixed training temperature of 0.5 paid a smaller tax than PTGS in both games (Table 9), with lower pass@1.
- Ten of 84 budget-averaged coverage values in Table 7 differ from the replay by up to 0.001 (both directions); every coverage and tax value matches.
- Table 4 (32 attempts) and the main 128-attempt runs are separate evaluations: pass@1 differs by 0.9 points on average, up to 7.0.
- In the toy, a stale posterior heats a prompt the policy now solves 78% of the time, and it falls to 53%: Theorem 3's assumption can fail.

## Files

- `save_live.py` (the Notion fetch, verbatim, from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_*.txt`; anchors listed in `inputs/anchors.txt`).
- `inputs/outcomes_42cells.csv.gz`: the authors' released per-task counts (github.com/changdaeoh/sharpening-tax, commit 789ae06c82728dc40f4f80e855d0f972eff1e5c6, `data/outcomes_42cells.csv.gz`, sha256 116b5dae...0ee3, CC BY-NC 4.0, 165 KB). `mk_data.py` checks the hash.
- `mk_tables.py` (tables.json, read from the extracts, PDF numbering), `mk_data.py` (needs numpy, in the repo's .venv: `inputs/replay.json`, `parts/_gen_cells.js`, the Figure 7 split check, the Appendix C.1 aggregate crossovers), `recompute.py` (`inputs/recompute.json`: every check shown in the tables tab).
- `parts/22_js_toy.js`: the toy engine (browser and node). `toy_sweep.mjs` (node, about 2 s): every toy number (`inputs/toy.json`, `parts/_gen_toydata.js`). `inputs/authors_toy_output.txt`: the authors' toy run unmodified (numpy, 5 seeds), transcribed into tables.json.
- `check_toy.mjs` then `<python with numpy> check_toy.py <checkout of the authors' repo at 789ae06c>`: the engine against the authors' functions on fixed inputs (`model/toy_case.json`, `model/check_toy.json`: PASS; probabilities and gradients within 2.2e-16).
- `check_page.mjs` (from the repo root with node; set CHROME_PATH if needed): every control in both themes and widths, every animation and stage playing once scrolled into view, the two-sampler animation stepped in both modes with mid-move screenshots, all 42 replayed cells against Table 7, the live toy run against the sweep for all 10 seeds, prose numbers against the data, reduced motion. `mk_coverage.py`: `coverage.json`.
- `check_stages.mjs` (from the repo root with node, about 4 minutes): the 2026-11-06 layout and motion rules and the step lists' numbers (see the 2026-11-13 section).
- `parts/31_js_sc_tasks.js`: Stage 1, the 3D scene; `parts/25_js_s3.js` and `parts/02_split.html`: the templates, unchanged.

## Checks (19 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 297 KB. `check_page.mjs`: 0 problems. `check_toy.py`: PASS. `mk_coverage.py`: 43 of 43. Measured on a Linux cloud container (4 CPUs, no GPU); everything here is deterministic CPU work.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then the paper's own Figure 1 as the hero (arXiv lists the paper under CC BY 4.0; `img/sharpening_tax_fig1_overview.webp`, credited under it and in `img/CREDITS.md`; panel (c)'s bars checked as the means of Table 2 over the two games), then "You need" (the pass@k debate, PPO and GRPO, temperature) and the new terms.
- **Figure 7 inline** beside PTGS's equations (the paper's loop: posterior, temperature, rollouts, update; `img/sharpening_tax_fig7_ptgs.webp`).
- **Owned elsewhere, a sentence kept and linked**: the pass@1 against pass@k debate on math and code (RL for LLMs, section 9); what temperature does (Sampling and Decoding).
- **Closed**: the three benchmarks as run, the harness prompt's contents, the identity on recorded attempts and Corollary 4, the six negative-tax cells, routing (Appendix D.4), the Figure 7 split check (an open one-line result stays), the RL recipe's hyperparameters, PTGS at test time (Appendix E.4), and the HTML-against-PDF numbering.
- **Volatile**: none beyond the card's version line; arXiv still lists only v1 (checked 26 October 2026).
- **Tabs kept**: Replay the 42 cells, Train with PTGS and the tables are tools with several controls each, used by the trust section; none explains a single mechanism.
- **No autoplay**: `makeAnim` patched as on DSec (the polarisation and two-sampler animations wait for a click; a mode switch pauses on step 1); `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `st-tab`, keeping `data-to`). `check_page.mjs` fails if an animation draws a frame before a click, audits every closed block opened, and no longer clicks Play after a mode switch.
- **Takeaway scoped** (`paper.json` takeaway and new `takeaway_note`, the card, the Takeaway in `live.md`, `mk_coverage.py`): "because post-training pushes tasks to the extremes" became "with tasks polarising" (the paper shows the two together, observationally); the 26-of-42 count now names the decoding set-up it depends on; PTGS's evidence is stated (five runs, two grid games, tax reductions within noise). The Notion property needs the same edit.
- Source extracts already had author emails as "[email removed]" and no em-dashes; `extract_paper.py` already enforced both.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 24.6 min (5,654 words) | 24.8 min (5,708) |
| The paper, closed | 0.3 min (77) | 3.0 min (698) |
| Replay; Train with PTGS; Tables; Further reading | 2.2; 5.3; 7.5 + 1.5 closed; 2.2 min | unchanged |
| Visuals in Reading (audit) | 4 | 5 (Figure 1 hero, Figure 7; the audit counts the Theorem 2 lab once in both) |

Why about 25 minutes is right: the top added about 470 words (core sentence, hero caption, terms, the takeaway note) and about 620 words of benchmark, harness, recipe, routing and provenance detail closed, so the core stayed level. What stays open is the argument with its evidence: the metrics, the crossover with its predict question, polarisation, the tax's definition and Proposition 1, where it is charged and what it is not, Theorem 2, PTGS and its results, and an evidence section whose points change the reading (two counts, one split, decoding set-up, PTGS within noise). Shorter would mean closing results the takeaway rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
302 units: core 269, depth 27, owned 2, fat 4 (the old reading-time header, the tab-bar labels, two citation fragments split off by the sentence splitter). 290 drafted by `ledger.py init` from the page before the pass; 12 added. `ledger.py check`: problems 0.

## The 2026-11-13 layout rollout (split layout, a renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper tab: the top (core sentence, You need, New terms) beside the paper's Figure 1; Setup beside the one-task pass@k chart (now titled); Base against post-trained beside Stage 1; The tax and Why a tax share one split beside the retry-value chart (one visual serves both; "the chart above" became "the retry-value chart"); PTGS beside Figure 7 and the Eq. 4 chart, stacked ("Move the knobs:" became "Move the knobs on the temperature chart."; Figure 7's caption says "the h(p) of Eq. 4"). Full width (no visual, or a table): Problem, PTGS results (Table 2), How much to believe, What it takes, Why it matters, Connections. Replay: the intro, Tax across budgets and the 42-cell map each beside their card; the closing note full width. Train with PTGS: One batch, two samplers (the animation card first, its step lists left), Trained, During training and Train it yourself each beside their card; the toy's description, the limits list and the authors' table full width. Tables: the PTGS-intervals chart beside its paragraph; the checks, Table 7 and Table 4 full width. Further reading unchanged.
- **One 3D stage** (template `25_js_s3.js`, renderer v2, unchanged): `31_js_sc_tasks.js`, Stage 1, replaces the 2D unit chart of the polarisation (`makeAnim` "bm"). One bar per task of a cell (500 WebShop or 770 ACEBench tasks), height = the share of its 128 recorded attempts that succeeded, from the authors' released counts (`window.CELLS` through `CX`), sorted from the base model's hardest task (front) to its easiest (back). A glass level at the field's mean height reads off pass@1; in steps 2 and 4 every bar grows to its task's unbiased pass@k as k runs from 1 to 128 and the level reads pass@k; step 3 morphs every bar to the post-trained model's rate; step 5 shows the lost tasks as purple ghosts at full height and the gained ones green, with the base model's pass@128 level above the post-trained one (the gap is exactly lost minus gained, checked). Dots stream from the field into the level while it is read, and from the base level down to the post-trained one in step 5. The three cells of the old toggle (gemma-4-31B WebShop, gemma-4-E4B WebShop, Qwen2.5-32B ACEBench) keep their toggle, each with its own step list (`sx-bm-g31`, `sx-bm-e4b`, `sx-bm-q32`) whose numbers `check_stages.mjs` recomputes from the counts. The category shares stay under the list (`#bmCnt`). Colours: base teal and post-trained orange as in every chart; never solved is a dark tile (the page's `--bad` equals `--c2`, so red would read as post-trained); lost purple (`--c4`).
- **Kept 2D**: the hero (the paper's own figure), the one-task pass@k chart, the crossover and Theorem 2 charts inside their predict reveals, the retry-value curve, Figure 7 (real image), the Eq. 4 curve, Table 2; the two-sampler animation (success probabilities from 0.0001 to 0.99 on a log axis, a few numbers per prompt: a flat log-scale dot plot reads better than heights); every replay, toy and tables chart (curves, a scatter, intervals, tables).
- **Motion**: `makeAnim` in `11_js_ui.js` replaced by the 2026-11-06 version (as on the Chinchilla page: plays once half in view, pauses off screen, stops for good on a reader control or the last step, a mode switch replays, never under reduced motion, step lists via `lists`, `data-playing` on the card). The two-sampler animation's caption carousel became two step lists (`sx-pt-fixed`, `sx-pt-ptgs`); its realised group counts, drawn by script before, are now static text checked against `TOYD.snap`. One number corrected: the hard prompts' combined chance of a group with a success was printed "0.08 to 0.27"; the snapshot gives 0.0749 and 0.2655, now written "0.075 to 0.265". `99_js_tabs.js` (storage key `st-tab`) and `05z_errbox.js.html` recopied from the templates. `check_page.mjs` now asserts that every animation and stage plays when scrolled into view (the 2026-10-26 never-autoplay check inverted) and that neither moves under reduced motion.
- `check_stages.mjs` (after Learn What's Left's): Stage 1 and the two-sampler animation at 1400 light, 920 light and 390 dark, autoplay, one list item per step in every mode, replay on a mode switch, flows stopping off screen, splits two columns at 1400, reduced motion, the live trainer not running by itself, and the step lists' numbers against the counts and the toy snapshot.
- `inputs/replay.json` is rewritten by `mk_data.py` with last-digit floating-point differences on this machine (bootstrap bounds such as -0.34 against -0.3400000000000002); the committed copy was kept. Every generated part (`_gen_*`) rebuilds byte for byte.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 24.8 min (5,708 words) | 27.3 min (6,288) |
| The paper, closed | 3.0 min (698) | 3.1 min (702) |
| Train with PTGS | 5.3 min (1,228) | 6.9 min (1,594) |
| Replay; Tables; Further reading | 2.2; 7.5 + 1.5 closed; 2.2 min | unchanged |
| Visuals in Reading (audit) | 5 | 5 (Stage 1 replaces the 2D animation) |

The growth is the step lists. Stage 1's three lists (one shown at a time; the audit counts all three, about 580 words, of which a reader reads about 250 for the default cell) replace a script-drawn caption carousel of about 150 words and add the numbers read off the field (pass@1, pass@128, the category shares, lost and gained, the level gap). The two-sampler lists carry the old captions, script-drawn and invisible to the audit before (about 370 words already read). Nothing was cut. Header: "Reading: 27 min, plus 3 in closed details."

Ledger: 307 units (core 274, depth 27, owned 2, fat 4); 5 added for the stage and the step lists; keys re-pointed on units 27 (the benchmarks sentence, its old key ran across the moved chart), 56 and 57 (the animation's lead-in and note, now Stage 1's), 65 (the E4B toggle hint), 134 ("Move the knobs") and 299 (the script-drawn visuals list), also recorded in `label_ledger.py`. `ledger.py check`: problems 0.
