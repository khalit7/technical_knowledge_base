# HarnessDev: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (softened Takeaway), the core sentence, hero figure, You need and New terms, Problem, Idea (roles diagram), Method (seed against the six modules, both protocols), Results 1 to 4 (two predict-then-reveal questions: distance to the human references, the 64 switches), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the evolution runs | `t-run` | The live ingredient: all nine Evolution lineages stepped version by version, held-out line hidden until asked for, a "your pick" game, the per-version numbers, and the two Creation trajectories (Appendices F, G). |
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
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped for every lineage and view.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (794 actions); `recompute.py` 83 of 83; `mk_coverage.py` 36 of 36.
