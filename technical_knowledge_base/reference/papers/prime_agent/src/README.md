# Prime Agent: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `svgparse.py`, `check_page.mjs`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card; the core sentence, the hero (the paper's Figure 2, CC BY 4.0, over ARC-AGI-3 bars from `mk_hero.py`), You need and New terms; Problem, Idea (clickable state hierarchy; blocking tool call against `rlm()` animation), Method, Results 1 to 5 (Figure 5 rebuilt, three predict-then-reveal questions, Factorio replay), How much to believe, What it takes to use this, Why it matters, Connections. |
| Rescore the ARC-AGI-3 run | `t-run` | The live ingredient: RHAE recomputed from the released median run's scorecard and ten community scorecards, rule controls, level grid, game-by-game replay, ranking. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 (paper and blog versions), Figure 5 as numbers, Figures 6, 7, 8, 10 rebuilt, 45 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a rescoring of the one released trace, not a toy or a turn-by-turn replay.** An agent-harness paper with no released episodes; its one public artifact is the ARC-AGI-3 scorecard, whose per-level data reproduce the printed score exactly and let the reader test the scoring rule and compare with every public-set card on the same games.
- **The Idea animation is illustrative** (labelled): the paper gives no counts for orchestration, so it is built only from §2.2 to §2.4 and Appendix B.
- **No Then and now.** A 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 27 minutes against the old 6).** The old page was written from the abstract; this one owns the method, every result, the blog and scorecard evidence, and an evidence section that changes the reading of the headline.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (38 items, this paper's own, verified against the built page).
- `extract_paper.py`: arXiv HTML v1 to `inputs/`. `decode_figs.py` (with `svgparse.py`): Figures 5, 7, 9, 10 to `inputs/figs.json`.
- `mk_tables.py`: `tables.json` (Table 1 checked against the extracted HTML and parsed from the blog, Figures 6 and 8 labels, decoded figures, compact scorecards, asserting every card shares the 25 games and baselines).
- `recompute.py`: RHAE for every card, every derived number and 31 checks, to `inputs/recompute.json`.
- `mk_hero.py`: the hero's ARC-AGI-3 bars from `tables.json` and `inputs/recompute.json`, to `parts/_gen_hero.html`.
- `label_ledger.py`: labels `ledger.json` (see the light pass below).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the three animations stepped.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 31 of 31 (plus 14 figure checks); `mk_coverage.py` 38 of 38.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero is the paper's own Figure 2, the state hierarchy (the paper is CC BY 4.0, checked on the arXiv abstract page; rendered from its SVG, credited under it and in `../img/CREDITS.md`), above HTML bars of the ARC-AGI-3 public-set scores that frame the headline (the ARC harness's 30.2% external line, best of three 95.5%, the released median run rescored at 95.24%, the human card 95.35%, three community cards at 98.97 to 100%); You need (Topic: agentic-harnesses, Context engineering, Knowledge and reasoning benchmarks) and New terms. The paper's Figure 1 (architecture) now sits in Method, where the text describes it.
- **Owned elsewhere** (OWNERS.md): what a harness is (Topic: agentic-harnesses), compaction and agent memory (Context engineering), ARC-AGI-3 and RHAE (Knowledge and reasoning benchmarks), specification gaming (Reward hacking): one sentence each kept, linked.
- **Moved into closed `<details>`** (nothing deleted but fat): provenance; what the old summary added; what is persisted and how sessions recover; the Agents View; how refinement edits are applied and versioned; the long-horizon controls in full; one out-of-loop experiment per model (Appendix A); how EmulatorBench is built; Figure 10 number by number; the Rust port; every connection (the open text keeps three and points to Further reading); a dated block "Later, as of 25 October 2026" (arXiv still v1; release v0.10.1 of 21 October). In the Tables tab, Figure 5 as numbers, Figure 8 and every check are closed blocks.
- **No autoplay**: `makeAnim` waits on step 1 until play or a step, also after a mode switch; `check_page.mjs` fails if the orchestration or Factorio animation draws a frame when scrolled into view, or the orchestration one after a switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`, storage key `pa-tab`). Header: "Reading: 28 min, plus 4 in closed details." (`reading.json`).
- **Takeaway scoped** (paper.json, live.md, so the card): the old line said it "lifts ARC-AGI-3 RHAE Best@1 from 30% to 95.5%". Now: 95.5% is the best of three runs on the easier public set (median 95.24%), set against 30.2% published for a different harness (the authors say it does not isolate a harness effect) and below community harnesses' 98.97 to 100%; Table 1's wins are single runs (20 of 27, 13 gaps under 0.02, clear only against pi with GLM-5.2); nanoGPT records no better; the Factorio cheat saved as a skill; nothing ablated. The Notion property still has the old wording.
- **Length**: Reading core 6,426 words (28 min) plus 0 closed before; 6,355 (28 min, including about 480 words of new top) plus 929 closed (4) after. Tables tab 1,425 open before, 590 open plus 835 closed after. Rescoring tab unchanged (3 min). The core stays near its length because the ledger is almost all core: the method as stated, five result sections each with the correction that changes its reading, and the evidence section.
- **Ledger** (`ledger.json`, drafted from the committed page): 285 units, core 246, depth 31, owned 4, volatile 1, fat 3; `ledger.py check` problems 0. `mk_coverage.py`: five keys updated; 38 of 38.
- Privacy and dashes: the two author emails in `inputs/paper_v1.txt` are redacted, the blog extract's one long dash is saved as `--`, and `extract_paper.py` now does both on any rerun.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 231 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 562 actions, 0 problems.
