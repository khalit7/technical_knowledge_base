# WSM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c75c17b0d0d8105b452d2c1bc1d087a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the reference folder `attention_is_all_you_need_transformer/src/` (with `mk_paper.py` and `check_page.mjs` taken from `deepseekmath/src/`, which add the verdict line and the live-run check).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; the core sentence beside Fig. 1 (since 2026-11-13 a 3D stage: a merge is a decay schedule, on the toy, then Ling-mini's matched-token result), You need and new terms; Problem (schedules chart, planned against extended); Idea (Eq. 1 to 5, Theorem 3.1, the merge-weight calculator reproducing Figure 2, two predict questions, the convex/concave correction); Method (Algorithm 1, offline and online, storage); Why averaging works (Fig. 2, a 3D stage of the river valley, WSD against WSM on the same noise); Results (setup, Figure 3 rebuilt with a matched-token toggle, SFT, MoE balance); What matters (predict question with the duration chart, ablations, Figure 5a rebuilt); How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Merge instead of decay: train it | `t-run` | The toy experiment: eight precomputed seeds and a live run in the browser (Figure 3, Figure 4 and Table 4 analogues, the equivalence test, what reproduces). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 9 with every derived number recomputed, Figures 4 and 5 rebuilt, Table 7 against Figure 10's labels, the parameter recount, and all 90 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from `papers.md`, and why.** No "Then and now" tab: a 2025 result paper whose method has not been superseded; adoption and prior art fit in "Why it matters". The tables tab also rebuilds figures, because this paper's evidence is mostly in figures (Figures 3, 4, 5) and its tables are the best points of those curves; the matched-token restatement needs the curves. The live ingredient is a training-recipe toy trained live (as the Switch Transformers and DPO pages do) rather than shipped weights: the whole experiment takes about 2.4 s per seed in the browser. The Reading tab was about 17 minutes against the old page's 8 before the 2026-10-25 light pass (see below).

## Files

- `build.sh`: runs `recompute.py` and `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or an unexpanded macro.
- `paper.json`: metadata, headline numbers, verdict, resources, KB links (`code` is null: none released). `tables.json`: Tables 1 to 9 as printed, written by `mk_tables.py` from `inputs/table_*.txt`.
- `extract_paper.py`: the arXiv HTML (v2) to `inputs/paper_v2.txt` and the tables. `extract_figs.py`: exact marker positions from the vector figures in the arXiv source (`figs/main.pdf`, `window.pdf`, `constant.pdf`, `decay_merge.pdf`, `merge_decay.pdf`), mapped through each panel's own gridlines and tick labels, plus Figure 10's printed labels, to `inputs/figs.json`; needs `uv run --with pymupdf` and the e-print unpacked in a temp folder (PDFs are not kept).
- `recompute.py`: Figure 2 from Theorem 3.1 (40 of 40), Table 1 and 2 improvements, Table 7 to Tables 1 and 3, Table 8/9 group averages, Table 2 from the groups, Figure 3 and 4 best points (at the paper's points and at 400B), Figure 5 comparisons, Table 4 consistency, the Ling-mini parameter recount from `inputs/ling_mini_2_0_config.json`, storage. Writes `inputs/recompute.json`; 83 of 90 checks pass and the 7 that fail are findings on the page.
- `mk_paper.py`: card, Further reading, `parts/_gen_data.js` (`window.PAPER`, including the figure points).
- Toy: `parts/22_js_toy.js` is the engine (runs in the page and in node). `toy_sweep.mjs` runs eight seeds (about 20 s) and writes `model/toy_results.json`, `model/toy_summary.json` and `parts/_gen_toydata.js`. `check_engine.mjs` then `uv run --with torch python check_engine.py` replays 60 Adam steps in PyTorch from the engine's own weights and batches (`model/check_engine.json`: losses within 7e-16, weights within 1.2e-16, a merge within 1.2e-16; PASS).
- `check_stages.mjs` (since 2026-11-13, after OLMo 2's; from the repo root): splits two columns at 1400; both stages at 1400 light, 920 light and 390 dark (play on view, one list item per step, last step, a control stops autoplay, flows stop off screen); reduced motion; 32 step-list numbers against the data the stages draw (`window.WSM_MERGE`, `window.WSM_RV`) and the static Fig. 2 numbers against the script's.
- `check_page.mjs` (run from the repo root with node): every control in light 920 and dark 390, the animation stepped in both modes, the default live run reproducing the stored seed, text at least 11 px, no NaN or errors. `mk_coverage.py`: 49 facts of `live.md`, all verified in the built page. `save_live.py` copied the Notion fetch verbatim from the session transcript.
- `inputs/external_extracts.txt`: the lines quoted from the Ling 2.0 report, Hägele et al., DeepSeek-V3 and Llama 3, and the code search.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems. `check_engine.py`: PASS. `mk_coverage.py`: 49 of 49.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a static hero (`parts/14b_js_hero.js`, numbers from `window.PAPER.rc`): ten checkpoints at a flat LR with weight 0.1 each, drawn as the linear decay they apply to the updates (Eq. 3 and 4), beside Ling-mini at 400B tokens (raw flat-LR checkpoint 60.32, WSD 62.67, mean merge 63.85; the paper's best-against-best 63.95 at 425B named under it). Then "You need" and the new terms. The paper is under arXiv's non-exclusive licence, so no figure is embedded.
- **Owned elsewhere, a sentence kept and linked**: cosine and WSD as schedules (Optimisers and learning-rate schedulers), cut to one sentence each with what WSM changes. The Ai2 OLMo link in Connections and Further reading now names the Ai2 OLMo section (`#s-olmo`) of Other notable providers (the lab page was merged there; its old id is an alias).
- **Closed**: the convex/concave correction, the concurrent-work comparison, the model and training settings (one setup sentence stays open), MoE load balancing and weight spectra, and the table and text slips (one summary bullet stays open in How much to believe).
- **Volatile**: Ling 2.0's adoption quote moved from Why it matters into one dated closed block, "Since the paper (dated: checked 25 October 2026)"; the Ling 2.0 evidence in How much to believe and What it takes stays.
- **No autoplay**: `makeAnim` patched (the river-valley animation waits on its first frame until play or a step; a mode toggle pauses); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `wsm-tab`, plus `data-to` scrolling). `check_page.mjs` fails if the animation draws a frame before a click, and opens every closed block. The live training already waited for its button.
- **Takeaway softened** (paper.json, so the card, and `live.md`): "proves ... algebraically equivalent to LR decay" became "applies a synthetic decay schedule to the updates (exact for the updates taken, only approximately a run that really decayed)", the paper's own assumption in §3.1 and what the toy measures; "beats a matched WSD anneal by ~1.3 points" became "about 1 point (+1.28 best against best, +1.18 at matched tokens, one run per arm)", since the 1.28 compares a merge at 425B with WSD at 400B; "EMA merging the worst" became "EMA the weakest merge" (EMA still scores above the decay in Table 3). The Notion property needs the same edit.
- Author emails in `inputs/paper_v2.txt` redacted, and `extract_paper.py` now redacts emails. Header: "Reading: 17 min, plus 2 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 17.7 min (4,071 words) | 17.2 min (3,955) |
| The paper, closed | 0 | 2.2 min (512) |
| Train it; tables; Further reading | 4.4; 12.3; 2.5 min | unchanged |
| Visuals drawn in Reading (audit) | 6 | 7 |

Why about 17 minutes is right: the page owns one short paper's whole argument (the identity and its inverse, the method, why averaging stands in for decay, the results and ablations) and the evidence judgement, which is where most of the page's value is (matched tokens, selection on the test set). The pass added the top (about 1.5 minutes) and paid for it by closing settings, side results and slips. Shorter would mean closing the ablations or the evidence section, which carry the verdict.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
195 units: core 177, depth 15, owned 2, volatile 1, fat 0. 186 drafted by `ledger.py init` from the page before the pass; 9 added (core sentence, hero, new terms, two owner links, four script-drawn table facts keyed to their captions). Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 251 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 235 actions, 0 problems; the default run reproduces seed 1 below 1e-5; no frame before a click. `mk_coverage.py`: 49 of 49. The toy engine is unchanged, so `check_engine.py` was not rerun.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). The paper tab: the core sentence, Fig. 1's step list and You need beside Fig. 1 (stage); Problem beside the schedules chart; Idea beside the merge-weight calculator (the predict questions and the convex/concave block stay in the text column); Why averaging works beside Fig. 2 (stage) and its live counters; Results beside Figure 3; What matters beside Figure 5(a) (the duration chart stays in the predict reveal). Full width (no visual): Method, How much to believe, Use it, Why it matters, Connections. Train it: the intro and toy box beside the run card; "Which knob matters" with its two result notes left of the window and Table 4 charts; the equivalence table and verdict full width. Tables and Further reading unchanged (full width: tables and figure rebuilds to read off). Cards got titles that say what to notice. Every old anchor is kept.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_merge.js`, Fig. 1, replaces the static 2D hero (`14b_js_hero.js`, deleted). The toy's branch: the flat rate (0.005) as a wall over 1,600 steps, its 16 checkpoints as glass plates; the mean merge's weights (1/16) as bars on plinths with flows into the merged plate; the staircase w_i (15/16 to 1/16) as a wall, with update 3's flows into checkpoints 3 to 15; the equivalence test's real decayed run trained along that staircase, ending 20% to 23% of the weights' movement from the merge, with the 8-seed losses (0.0758 flat, 0.0568 decayed, 0.0550 merged); Theorem 3.1's 1-sqrt weights (0.250 to 0.032) and staircase; Ling-mini's 60.32, 62.67 and 63.85 at 400B. Data: `window.TOYDATA`, `thm31()`, `window.PAPER.rc.fig3`.
  - `32_js_sc_rv.js`, Fig. 2, replaces the 2D `makeAnim` river-valley animation and its WSD/WSM toggle: the same SGD toy (moved from `13_js_read.js` unchanged) on a √L canyon, both branches on one surface in five explained stretches (the long-replay rule), checkpoints as balls, the merge's flows into their mean; its step 5 numbers are written by the script into spans whose static text matches (`check_stages.mjs`).
- **Kept 2D**: the schedules chart, the calculator (a parameter widget), Figure 3, Figure 5(a), the duration chart, every run-tab chart and every table: curves, bars to read off and widgets read best flat.
- **Motion**: `makeAnim` removed from `11_js_ui.js` (no 2D animation is left); `05z_errbox.js.html` and `99_js_tabs.js` are the templates (storage key `wsm-tab`). `check_page.mjs` now asserts each stage plays once in view instead of forbidding motion.
- **Owner links**: Problem names the owner's Fig. 6 (cosine endpoints as separate runs, WSD cooldowns off one trunk) and Why averaging its Fig. 5 (why a constant rate hovers), both `#s-sched`; this page draws only what WSM adds.
- `build.sh` finds the repo root by walking up to `html_utils` (no git).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 17.2 min (3,959 words) | 20.4 min (4,684) |
| The paper, closed | 2.2 min (512) | 2.2 min (512) |
| Train it | 4.4 min | 4.5 min |
| Tables; Further reading | 12.3; 2.6 min | unchanged |

The growth is the two step lists (Fig. 1 carries what the hero drew in script plus the equivalence and Theorem 3.1 steps, about 450 words; Fig. 2's steps replace a script caption carousel the audit did not count) and card titles; nothing was cut. Header: "Reading: 20 min, plus 2 in closed details." Three pages quote the old 17 minutes (Pretraining, Optimisers and learning-rate schedulers, Data mixing); the lead runs `check_times.py --fix`.

Ledger: 204 units (core 186, depth 15, owned 2, volatile 1). Nine added for the step lists and the owner links; keys re-pointed on units 32 (calculator sentence), 50 (Algorithm 1's merge step), 62 and 63 (the river figure), 77 (Figure 3 sentence); 188 re-described. Owned units 190 and 191 unchanged and passing. `ledger.py check`: problems 0.

## Checks (13 November 2026)
`checkpage.sh`: tabs 4, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 229 actions, 0 problems (default run reproduces seed 1 below 1e-5). `check_stages.mjs`: 6 stage runs, 32 step-list numbers, 0 problems. `mk_coverage.py`: 49 of 49. `verify_layout.mjs`: only "visuals outside a split" on the tables tab (kept full width on purpose).
