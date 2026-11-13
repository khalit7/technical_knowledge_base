# Prime Agent: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `svgparse.py`, `check_page.mjs`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and one 3D stage since 2026-11-13) Card; the core sentence, You need and New terms beside the hero (the paper's Figure 2, CC BY 4.0, over ARC-AGI-3 bars from `mk_hero.py`); Problem; Idea (the state hierarchy and the Appendix B orchestration task as a 3D stage, rlm() against a blocking tool call); Method beside Figure 1; Results 1 to 5 (Figure 5 rebuilt beside the ARC text, three predict-then-reveal questions, the Factorio replay with its step list), How much to believe, What it takes to use this, Why it matters, Connections. |
| Rescore the ARC-AGI-3 run | `t-run` | (split since 2026-11-13) The live ingredient: RHAE recomputed from the released median run's scorecard and ten community scorecards, rule controls, level grid, a game-by-game replay widget, ranking. |
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
- `check_page.mjs` (run from the repo root with node): every control at 1400 and 920 px light and 390 px dark, the stage, the Factorio replay and the scorecard widget stepped; since 2026-11-13 it asserts that the stage and the Factorio replay play once scrolled into view (it used to forbid it).
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at three widths, reduced motion, both step lists of the stage, the Factorio list, the scorecard replay staying a widget, and the totals the stage's lists state against `window.PAORC`.

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

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, You need, New terms) beside the hero figure and bars; Idea beside the 3D stage (its toggle and two step lists on the left); Method beside the paper's Figure 1 (sticky while the long section is read); the ARC-AGI-3 text beside the rebuilt Figure 5; the Factorio text and step list beside the replay. Problem, the Results intro, the three predict questions (their charts open in the reveal), Long context, nanoGPT, Emulators and kernels (no figure on this tab), the safety finding and MazeBench, How much to believe, Use it, Why it matters and Connections stay full width. Rescore tab: three splits (intro and rule left, rescoring card right; the replay paragraph left, its widget right; the ranking notes and finding left, the ranking chart right). Tables tab: Table 1 stays full width (a table); Figures 6, 7 and 10 split with their headings and notes left and the chart (with its toggles) right; the closed blocks unchanged. Further reading unchanged.
- **One 3D stage** (template `25_js_s3.js`, renderer v2, unchanged): `31_js_sc_orc.js`, Figure 2 in 3D, replacing two 2D visuals of the Idea section (the clickable hierarchy and the orchestration animation `makeAnim` `orc`). Rows on the floor, front to back: the clock (14 cells, blue while the parent works, red while it waits), L0 as a glass plate, L1 as a tray of context blocks with the parent model at its end, the model-context boundary as a red glass wall, the daemon queue, L2 (REPL values on the left, subagent pods on the right), L3 (stacks of event records). Flows carry each call, pasted result, message, compaction and serialisation across the wall. Two step lists of eight, swapped by the toggle (`S3.stage(...).list`); the camera moves in close on the first call (step 2 of rlm, step 3 of the blocking call). Data: illustrative, the same per-step contents and counters as the 2D animation it replaces (built only from §2.2 to §2.4 and Appendix B; labelled under the lists); the old captions became the step lists and the counters went into their text.
- **Factorio replay**: `makeAnim` replaced by the JIT-Agent copy (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, a click on a list item plays that step once). Its caption box went; the nine captions are the static step list `sx-fac` (nine stretches of the run, within the long-replay limit).
- **Scorecard replay** (Rescore tab, 25 games): under the long-replay rule it is now a widget, not an animation: no play button, no autoplay, no step list; the reader picks the pairing and the game, and it opens on lf52, the one game Prime Agent lost. Its per-game caption stays as a live caption under the bars.
- **Kept 2D**: Figure 5 (log axes), the predict reveals (bars and a gap scatter on one axis), the Factorio replay (curves over a token axis), the rescoring grid (a heatmap the reader clicks), the ranking, every table and the Tables tab's charts (curves and bars on one axis). The paper's Figures 1 and 2 stay as the real images.
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `pa-tab`), keeping one page line: a `data-to` target inside a closed block opens it. `11_js_ui.js` is the JIT-Agent copy (only `makeAnim` differed). `build.sh` finds the repository's Python by walking up to the nearest `.venv` instead of asking git.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 27.6 min (6,355 words) | 30.8 min (7,076) |
| The paper, closed | 4.0 min (929) | 4.0 min (929) |
| Rescore tab | 3.4 min (792) | 3.5 min (813) |
| Tables; Further reading | 2.6 plus 3.6 closed; 3.7 min | unchanged |

The growth is the step lists: the stage's two lists (eight steps each) and the Factorio list replace captions that script drew one at a time (invisible to the word count before) and now state the counters in their text. Nothing was cut; every result and evidence point stays open as before. Header: "Reading: 31 min, plus 4 in closed details." from `reading.json`.

Ledger: 288 units (core 249, depth 31, owned 4, volatile 1, fat 3); six units re-keyed where a sentence was reworded for the layout (26, 27, 32, 33, 78, 134) and three added for the step lists. `ledger.py check` problems 0. `mk_coverage.py` 38 of 38; `recompute.py` 31 of 31; the generated parts are byte-identical.
