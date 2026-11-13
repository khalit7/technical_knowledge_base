# HarnessDev: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and two 3D stages since 2026-11-13) Card (softened Takeaway), the core sentence, hero figure, You need and New terms, Problem, Idea (roles diagram), Method (seed against the six modules, both protocols), Results 1 to 4 (two predict-then-reveal questions: distance to the human references, the 64 switches), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the evolution runs | `t-run` | The live ingredient (split since 2026-11-13: notes and the generated step list left, the replay right): all nine Evolution lineages stepped version by version, held-out line hidden until asked for, a "your pick" game, the per-version numbers, and the two Creation trajectories (Appendices F, G). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 3 and 4 explorer, cost against score (Figure 9), Tables 5, 6 (printed against decoded), 7, and all 83 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model or simulation.** A benchmark paper about agents; the live ingredient is a trace replay (the agent row of papers.md), made exact by decoding the per-version scores of all nine lineages from the vector Figures 7 and 8.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **No code link.** Nothing released; the card links the project page.
- **Reading tab is long (about 22 minutes against the old 6).** The old page was written from the abstract; this one owns the full paper, its appendices and an evidence section that changes the reading (the executor confound). The Creation trajectories were moved to the replay tab to shorten it.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (score the harness, not the answer; the domain split tracks the references' models; Evolution's visible gains shrink on held-out tasks); a hero figure (`15_js_hero.js`, from `tables.json`: per benchmark the six creators' Self-Eval range and best against the human reference, each reference labelled with the model it ran); You need (agentic harnesses root, Agentic benchmarks); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): what a harness is (Topic: agentic-harnesses), same-model harness spread on Terminal-Bench (Agentic benchmarks; the paper's own 35.2% against 49.6% example stays), binomial standard errors (Eval statistics).
- **Moved into closed blocks**: why harness work differs from code editing and the forward-deployed engineer framing; the collapsed replicas behind avg@3; dead code; what the Evolution edits were (Table 7); the two examples this page ties to a lineage. Follow-up news (RRSI, SoL-Pi, the ARC Prize Provider Adapter result) moved to one dated block "Since the paper".
- **Predict question 1 changed** because the hero now shows each benchmark's best creator against its reference: it asks how many of six creators beat the MLE-bench reference (two), and reveals the same per-creator chart.
- **Never autoplays**: `makeAnim` waits on step 1 until the reader acts (also after a mode switch); `check_page.mjs` scrolls the replay (`ev`) into view and fails on any frame drawn before a click, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `hd-tab`, with `data-to` scrolling).
- **No real image**: nothing physical to show; the paper's figures are redrawn from its tables (Figure 4 and 6 already were).
- **Takeaway softened** (card, `paper.json`, `live.md`): "match or beat them on writing and ML experimentation" is true only of the best one or two creators, against references that ran the same or older models, while the losing references ran newer ones; the new line says so, gives the Evolution numbers (+3.0 to +13.9 visible, +1.43 to +4.44 held out, single runs, about half of switches agreeing, three of four fixed-Gemini lineages regressing).
- **Length judgement**: Reading core 21 min before (4,930 words) and 21 after (4,857), plus 3 in closed details (691 words, from 1; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes, the moves and owner links took out as much. The rest is core: two protocols, four results and an evidence section (the executor confound, single-run Evolution) that changes how the paper reads and that no other page carries. Other tabs unchanged (Replay 3 plus 1 closed, Tables 11, Further reading 4).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 282 units; core 251, depth 26, owned 3, volatile 2; `ledger.py check` problems 0.
- **Source extracts**: em-dashes in `inputs/paper_v1.txt` (58) and `inputs/tables_v1.txt` (18) replaced with `--`; no author emails were present. `extract_paper.py` now does both on extraction, and `mk_tables.py` reads `--` as the missing-value mark (its `tables.json` output is byte-identical).

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/`. `decode_figs.py` (with `svgparse.py`, copied from the InstructGPT page): Figures 7 and 8 to `inputs/figs.json`.
- `mk_tables.py`: `tables.json` (Tables 2 to 7, 9, and the decoded lineages, asserting the two figures agree).
- `recompute.py`: 83 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (36 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control at 1400 and 920 px light and 390 px dark, the replay stepped for every lineage and view; since 2026-11-13 it asserts that the replay and both stages play once scrolled into view (it used to forbid it).
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at three widths, reduced motion, and the two stage step lists' numbers against the page's data (`window.HDPROTO`, `window.HDEVO`).
- `parts/31_js_sc_proto.js`, `parts/32_js_sc_evo.js` (2026-11-13): the two 3D scenes on the template renderer `parts/25_js_s3.js`.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (794 actions); `recompute.py` 83 of 83; `mk_coverage.py` 36 of 36.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, You need, New terms) beside the hero chart; Idea and Method share one split beside the protocol stage (its step list sits in Idea after Eq. 1); Result 2 beside its executor-swap chart; Result 4 beside the Evolution stage. Problem, Result 1 and Result 3 (their charts are inside predict reveals or absent), How much to believe, Use it, Why it matters and Connections stay full width. Replay tab: intro, Try, the generated step list and Your pick on the left, the replay card right; the per-lineage numbers and the Creation trajectories full width. Tables tab: Figure 9's note left, its scatter right (its caption became the note); every table stays full width. Further reading unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_proto.js`, the protocol (Idea and Method), six steps (`sx-proto`): the seed's six empty module slots and five zero benchmark plinths; the creator (Opus 4.8 in Claude Code) writing into the slots, dev cases flowing back; the slots filled to the complete implementations among the 18 code harnesses (18, 13, not reported, 1, 13, 15: §4.2 and Figure 5, as the old module chart had them); the harness frozen in glass and run by its creator on 2,207 hidden tasks (Table 2 sizes, dots proportional to tasks; bars Opus 4.8's Self-Eval row of Table 3); the executor swapped to Gemini 3.1 Pro (Opus's row of Table 4, deltas); the human references beside Opus's bars (Table 9, with the model each ran). Replaces the roles diagram (three-mode toggle) and the seed-against-built module chart; their captions became steps 1, 3, 4, 5 and 6.
  - `32_js_sc_evo.js`, Evolution (Result 4), six steps (`sx-evo`): the Qwen 3.7 Max self lineage version by version (decoded per-version pair and held-out-630 scores), the ±4.75 noise band as a grey slab, the declared H4 (+13.9 visible), the held-out row (H4 +1.43, H3 at 151 of 630, best H5); then all nine lineages' visible gains and held-out gains as signed bars on plinths, and the best held-out version as an outline (Table 6 as printed: fbgain, hogain, gap). Replaces the 2D gain chart (`gainPlot`); its caption became steps 1, 4 and 6. It stops before the 34-of-64 switch agreement, which the predict question below it reveals.
- **Kept 2D**: the hero (per-benchmark ranges against the references on one number axis), the predict reveals (per-creator percentage bars, the 64-switch scatter), the executor-swap dumbbells, the replay (lines over versions, with counters), the cost scatter (log axis) and every table.
- **Replay**: `makeAnim` (`11_js_ui.js`) replaced by the Dream-RSI version (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, one `ol.sx` per view, `reset()` on a lineage change). The per-step caption box went; its texts are the generated step lists (`sx-ev-fb`, `sx-ev-ho`). One step per official version plus the declaration: at most 12, within the long-replay limit.
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `hd-tab`; the old copy's extra that opened a closed block after a `data-to` target was dropped, since no target here is followed by one).

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 21.1 min (4,857 words) | 24.2 min (5,563) |
| The paper, closed | 3.0 min (691) | 3.0 min (691) |
| Replay tab, core plus closed | 2.9 plus 0.6 min (668, 136) | 5.8 plus 0.6 min (1,343, 136; the step list is generated, so it varies with the lineage) |
| Tables; Further reading | 11.0; 3.5 min | unchanged |

The growth is the two stage step lists (about 700 words) that explain the stages and replace the captions of the three charts they retire, and the replay's step list that replaces its caption box. Nothing was cut; every result and evidence point stays open as before. Header: "Reading: 24 min, plus 3 in closed details." from `reading.json`.

Ledger: 286 units (core 255, depth 26, owned 3, volatile 2, fat 0); `label_ledger.py` re-keyed units 28, 41, 95 and 118 automatically (their toggle sentences or captions were reworded), 117 and 218 by hand (`KEYS`), and added four units for the stage lists. `ledger.py check` problems 0. `mk_coverage.py` 36 of 36.
