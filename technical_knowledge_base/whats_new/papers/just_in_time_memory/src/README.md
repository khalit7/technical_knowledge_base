# src: Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents (arXiv 2609.27334)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py`, `stream_sim.py` if `inputs/stream.json` is missing, and `mk_paper.py` first; `%%S:...%%` and `%%R:...%%` in the parts are filled from `inputs/stream.json` and `inputs/recompute.json`). Then:
- `python3 check_sim.py` (needs node): runs `parts/20_js_stream.js` against `stream_sim.py` on 5 seeds and success rates; orderings, retrievals and every statistic identical; writes `inputs/check_sim.json`.
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page (25 of 25).
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths (Chrome launched with `headless: 'shell'`); since 2026-11-13 it asserts that the Idea animation plays once scrolled into view (it used to forbid any autoplay) and that the replay widget does not.
- `node src/check_stages.mjs [shots dir]` from the repo root: the 2026-11-06 layout and motion checks and the stage's numbers.
- `sh fetch_inputs.sh` regenerates `inputs/` from public sources (arXiv HTML and e-print, SkillOS's arXiv HTML, the ALFWorld release zip); `decode_figs.py` needs `uv run --with pymupdf`.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched on 2026-10-03 (Notion's own timestamp 2026-09-28); written from the fetch result, see the note below |
| `paper.json` | headline card, verdict, resources, KB links |
| `mk_tables.py` | Tables 1, 2 and 9 parsed from the LaTeX in the e-print (`inputs/tex/`), Tables 3 to 8 typed and checked against `inputs/tables_v1.txt`; marks every baseline cell that matches SkillOS's published tables (`inputs/skillos_tables.txt`) |
| `recompute.py` | the 63 derived numbers printed in the paper (62 reproduce), standard errors of the gaps, the gain decomposition, the 17 untrained comparisons, validation-set sizes from the decoded curves, training budget |
| `stream_sim.py`, `parts/20_js_stream.js` | the paper's test-time memory protocol (empty bank, batches of 10, BM25 top 3 over task descriptions) on the 140 real ALFWorld valid_seen goals (`inputs/alfworld_valid_seen.json`) |
| `decode_figs.py` | the validation curves of Figures 5 and 6 from the vector PDFs (`inputs/fig_curves.json`) |
| `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt` | the arXiv HTML as text (`extract_paper.py`, which writes `--` for em-dashes and redacts emails), v1 is the only version |
| `parts/25_js_s3.js`, `parts/31_js_sc_stream.js` | the template 3D renderer (v2, unchanged) and the top stage's scene (2026-11-13); the static hero `mk_hero.py` and `parts/03a_hero.svg.html` were retired (git keeps them) |
| `check_stages.mjs` | (2026-11-13, from the repo root) the layout and motion rules at three widths, reduced motion, the step lists, and every number the stage's step list states against the scene (`window.JITSTREAM`) and the replay engine |
| `reading.json` | the header's reading minutes, measured with `html_utils/audit_pages.mjs` after a build |
| `ledger.json`, `label_ledger.py` | the knowledge ledger and its labeller |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **Live ingredient: a replay of the paper's memory traffic, not a trace replay.** papers.md suggests a trace replay for agent papers, but no traces, code or curator are released. The part of JitMem that has no LLM in it, which trajectory each task retrieves and when, is exactly what the paper's credit-assignment argument is about, and it can be run on the real ALFWorld test goals with the paper's own protocol. Only task success is a coin (labelled). The replay measures what the paper only asserts: a stored trajectory is first used about 20 tasks later, a quarter are never used, a used one feeds about 5 tasks of about 2 types.
- **The Idea animation is the paper's own example (Figure 3)** run through both designs; its trajectory steps and the write-time artifact are illustrative and labelled.
- **No "Then and now"**: a 2026 result paper.
- **The Reading tab is long (about 17 minutes against the old page's 6)**, because the old summary's central claim ("an untrained curator already wins, so the gain is the timing") does not hold for the headline cells, and showing why takes the decomposition, the 17-cell comparison and the provenance of the baselines.
- **`live.md` was written with the Write tool from the fetch result in context**, not with `save_live.py`: the permission system blocked reading the session transcript. The content is the fetch result's text field, verbatim.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py`): write time against read time on one trajectory, with this page's replay delays (a stored trajectory first used 19.5 tasks later on average, 24% never) and, below, the Qwen3-8B gain split into what the untrained curator adds and what RL training adds (ALFWorld 57%, WebShop SR 92% from training) against RL SkillOS. The paper is under arXiv's non-exclusive licence and no code repository exists, so no paper figure is embedded; nothing physical to photograph. Then "You need" (RL for LLMs for GRPO, Context engineering for agent memory) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: GRPO and Dr. GRPO in general (RL for LLMs); agent memory designs in general (Context engineering). The paper's own loss stays, closed.
- **Closed**: the loss, the training recipe and the fixed training bank (Method); small ablation effects and the two worked examples (Ablations); three smaller evidence points (validation split, a printing slip, nothing released); the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: one dated closed block, "Since the paper (dated: checked 26 October 2026)": still v1 only, no code or weights.
- **No autoplay**: `makeAnim` patched as on Dream-RSI (both animations, Idea and the replay tab, wait for a click); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `jitm-tab`), keeping the `data-to` scroll target. `check_page.mjs` now fails if either animation draws a frame before a click, and audits every closed block opened.
- **Lab tab kept**: the replay tab is a lab with several controls (success rate, ordering, task inspector, 50-ordering statistics) used from Method, Ablations and the hero; its result already sits inline in Method's predict reveal and now in the hero.
- **Takeaway scoped** (`paper.json` with a new `takeaway_note`, the card, `live.md` and `mk_coverage.py`): the database Takeaway said an untrained curator already wins "so the gain is the timing rather than the model". The new one keeps 15 of 17 like for like, gives the headline with its executor, the RL share of the gain, the copied Qwen3-8B baselines and the tau2-bench +3.9 under two standard errors. The Notion property needs the same edit.
- `inputs/paper_v1.txt` and `tables_v1.txt`: 20 em-dashes written as `--`; no author emails were present.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 16.6 min (3,822 words) | 16.4 min (3,774) |
| The paper, closed | 0 | 2.9 min (677) |
| Replay tab; Tables; Further reading | 3.0; 9.6; 3.7 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 (the hero added) |

Why about 16 minutes is right: the top added about 330 words (core sentence, hero caption, terms) and about 680 words of recipe, small effects, examples and adoption detail closed, so the core is flat. What stays open is the method in the paper's order, the results with both predict questions (the 17-cell comparison and the gain decomposition that change how the headline reads) and the four evidence points the verdict rests on. Shorter would mean closing the evidence that corrects the abstract's attribution.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
221 units: core 193, depth 25, owned 1, volatile 1, fat 1 (the old reading-time header). 208 drafted by `ledger.py init` from the page before the pass; 13 added. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 180 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 288 actions, 0 problems (no frame before a click). `mk_coverage.py`: 25 of 25. `check_sim.py`: identical on 5 runs.

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, the stage's step list, You need, New terms) beside the new 3D stage; Idea beside its read-against-write animation (two step lists, one per mode); Results' Setup, Headline and tau2-bench beside the results bars; Ablations beside the drop plot. Problem, Method (a table, the training details and a predict question whose chart is in its reveal), the rest of Results (two predict questions with charts in their reveals, then prose), Why it matters, Connections, How much to believe and Using it stay full width. Replay tab: the intro, Try and a paragraph that explains the card left, the sliders and the batch card right; the task inspector full width; the 50-ordering statistics and histogram right of their caption and the "What this shows" note. Tables tab: unchanged, full width (tables and curves). Further reading unchanged.
- **One 3D stage** (template `25_js_s3.js`, renderer v2, unchanged), `31_js_sc_stream.js`, replacing the static SVG hero: the paper's test stream on the 140 real ALFWorld goals, run by the page's own replay engine (`20_js_stream.js`, seed 7, success a coin at 77.4%), as a 14 by 10 grid of tasks (batches left to right, coloured by type; stored trajectories rise), in eight explained stretches (`sx-stream`): batch 1 with no memory (8 stored); batches 2 to 4 with retrieval flows (bank 28); task 32 ("heat some egg and put it in countertop") distilled at write time into a grey slab; batch 5, where task 50 ("put a cool egg in microwave", the paper's Figure 3 past task) first retrieves it 18 tasks later; its 4 consumers of 3 types (18, 59, 87, 94 tasks later) with the same slab; read time, a payload per consumer graded at once; the whole stream with the 19 of 92 never-used trajectories (21%; 24% over 200 orderings); and the Qwen3-8B gain split from `recompute.py` (ALFWorld 47.9 +12.6 +16.9, WebShop SR 9.8 +1.9 +21.1) as stacked bars on plinths with RL SkillOS as a glass sheet. The camera moves in on the first batches, on task 32 and its first use, and on the bars. `check_stages.mjs` asserts every number in the step list against `window.JITSTREAM` and the engine's own statistics.
- **Kept 2D**: the Idea animation (the paper's Figure 3 example; its content is payload text and three kinds of action chips, which read as well flat, and the 3D stream above already carries the spatial idea), the results bars, the ablation dot plot, the predict reveals (histogram, dumbbells, decomposition bars), the replay card (a 14 by 10 dot grid with retrieval lines that a reader drives), the 50-ordering histogram, every table and the validation curves.
- **Motion**: `makeAnim` (`11_js_ui.js`) replaced by the JIT-Agent and HarnessDev copy (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, one `ol.sx` per mode, `reset()` on a mode switch), plus two options: `widget` (no autoplay, no step list, per-step caption kept) and `start` (the step a widget opens on). The Idea animation's caption box went; its captions are now the static step lists `sx-tl-read` and `sx-tl-write`. The replay card is a widget under the long-replay rule (14 batches), opening on batch 5, where task 50 retrieves task 32 in the same ordering as the stage; the task inspector opens on task 32.
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `jitm-tab`; the template keeps the `data-to` scroll target).
- Colour wording fixed: the page's `--bad` is orange, so the replay text says "dashed orange", and the stage uses grey for cross-type retrievals and dark glass for never-used trajectories.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 16.4 min (3,774 words) | 20.3 min (4,680) |
| The paper, closed | 2.9 min (677) | 2.9 min (677) |
| Replay tab | 3.0 min (700) | 3.6 min (838) |
| Tables; Further reading | 9.6; 3.7 min | unchanged |

The growth is the step lists: about 420 words explaining the new stage, and the Idea animation's 14 captions (about 550 words), which were drawn by script before and so invisible to the word count, now static beside it; the hero's long caption went. Nothing was cut or moved into a closed block. Header: "Reading: 20 min, plus 3 in closed details." from `reading.json`.

Ledger: 224 units (core 196, depth 25, owned 1, volatile 1, fat 1). `label_ledger.py` re-keyed unit 210 (the hero, now the stage: key "where the headline gain comes from") and re-pointed unit 212 (owned by RL for LLMs) to "dr. grpo removes the division by the standard deviation", the owner's current wording (its old key "dr. grpo gives" was no longer on the owner's page); three units added for the stage's list, the Idea lists and the replay widget. `ledger.py check` problems 0. `mk_coverage.py` 25 of 25; `check_sim.py` identical on 5 runs.
