# Agora: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's pieces (`build.sh`, `mk_paper.py`, `10_js_common.js`, `11_js_ui.js`, the CSS, `check_page.mjs`, `save_live.py`, `extract_paper.py`).

The page follows arXiv v4 (30 September 2026). The Notion text (`live.md`, fetched as of 21 September) was written from an earlier version.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict, the core sentence, "At a glance" (hero 3D stage, Fig. 1) with You need and New terms, Problem, the commit graph (Eq. 1), evidence score (Eq. 2), the frontier (analyze, clusters, Eq. 3) with a calculator on an illustrative graph, the run (Figure 2 decoded), the winning recipe (Stage B band map), Results (Table 4 as a step animation), Coordination dynamics, What the humans did, Why it matters, How much to believe, What it takes to use this, Connections. Four predict-then-reveal questions. |
| Rebuild the winning prior | `t-run` | The live ingredient: Stage A of the agents' recipe rebuilt on CPU with GPT-2 small and measured in bits per byte on 200 FineWeb-Edu texts; a ladder beside Table 4, a rank explorer, a token replay through four models, and the noise of a 200-text evaluator. |
| The run's numbers, rebuilt | `t-tables` | Table 4 (with v1 differences), Figure 2 as a table, the version-change list, Tables 1, 2, 3, 5, and every check from `recompute.py`. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the method the agents found, not the platform.** papers.md suggests a trace replay for agent papers, but no trace, graph or code is released and an illustrative replay of the community would only show what we put into it. The one claim that can be checked independently is the run's headline number, so `stage_a.py` rebuilds the recipe's first stage from Algorithm 1 and Table 5 and measures it with the paper's metric. The one-context rank-671 factorisation lands on Table 4's 2.1284 independently.
- **The platform's mechanism is a calculator on an illustrative graph** (Reading tab), with every formula and constant from §3 and the graph labelled as made up.
- **The before/after animation is Table 4 in two views** (the whole descent, and the last 0.03 against the cross-hardware noise band), since there is no "old method" to animate against; the token replay in the Rebuild tab runs one passage through four models.
- **No Then and now** (a September 2026 paper).
- **A version-change list** in the tables tab: four arXiv versions in two weeks changed several headline numbers, and the project website still carries version 1's.
- **Reading tab is about 27 minutes, plus 8 in closed details** (measured by `html_utils/audit_pages.mjs`, written into `reading.json`; see the light pass below), against the old page's 5: the page owns every detail of the paper, and v4's account of the human interventions and the evidence section needed room.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (every fact of `live.md`, verified against the built page).
- `extract_paper.py`: arXiv HTML to `inputs/paper_v<n>.txt`, `tables_v4.txt`, `anchors.txt`. `diff_versions.py`: `inputs/version_diffs.txt`. `decode_fig2.py`: Figure 2 from the e-print's vector PDF (`uv run --with pymupdf`).
- `fetch_data.py`: the 200 FineWeb-Edu texts (to `$AGORA_DATA`, default `~/.cache/agora_toy`, not kept).
- `stage_a.py` (`OMP_NUM_THREADS=3 uv run --with torch --with transformers python stage_a.py`): builds the 50,257 × 50,257 tables for one and 28 contexts (10 GB each, in `$AGORA_DATA`, not kept), the randomized SVDs, and every rank's bits per byte; writes `model/stage_a.json` and `model/stage_a.log`.
- `stage_a_demo.py`: per-text bits for eight models, the bootstrap over texts, and the replay passage; writes `model/noise.json` and `model/demo.json` (shipped in the page by `build.sh`).
- `paper.json`, `tables.json`: card, further reading and the transcribed tables. `recompute.py`: every derived number and check, to `inputs/recompute.json`; `build.sh` fills `@@R:path:digits@@` placeholders in the prose from it, so the text cannot drift from the scripts.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the frontier nodes, both animations stepped, 11 px text, NaN, errors, sideways scroll; animations and stages play when scrolled into view.
- `check_stages.mjs` (from the repo root): at 1400 light, 920 light and 390 dark, every 3D stage and step animation plays when scrolled into view, steps to its end, has one list item per step (every mode), stops on a reader control; splits are two columns at 1400; flows stop off screen; nothing moves under reduced motion.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html`): the workers' loop with no planner, an illustrative commit DAG carrying Table 2's weights (+5, +20, zero for one's own branch), and the Table 4 descent with the day-one 98% bracket; store, score and steer in one line each. The paper is under arXiv's non-exclusive licence, so its Figure 1 is not embedded. Then "You need" (Bandits and exploration, for Eq. 3) and the new terms.
- **Real image**: the repository's version of Figure 4 (`img/research_dag_topology.webp`, Apache 2.0, credited in `img/CREDITS.md`) beside the narrow-spine claim in Coordination dynamics; its "today SOTA 1.89899" label is below the cutoff best 1.899044, flagged in the caption as unexplained (probably post-cutoff work, unconfirmed).
- **Owned elsewhere, a sentence kept and linked**: multi-agent coordination patterns (Multi-agent patterns), UCB in general (Bandits and exploration), Mamba blocks and hybrids (Beyond attention), bootstrap and paired standard errors (Eval statistics). No section re-taught these at length, so nothing was removed for them.
- **Closed**: related systems (§2), the embedding and clustering settings, the tail rule that inflates C, who wrote what (start dates, models per account), Stage A in full (an open summary keeps the mechanism and the logit formula), cross-hardware reproduction gaps, three later events of the human timeline, the version-1-to-4 number changes, and the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: the release status now sits in one dated closed block, "Since the paper (dated: checked 25 October 2026)": still no code, the repository unchanged since 29 September, `github.com/nvlabs/agora` still 404, arXiv still at v4.
- **Trimmed restatements**: the Idea paragraph (the hero carries it), "Fast exploitation" (the numbers are in Results), the transfer paragraph of Why it matters (the rebuild numbers are in How much to believe).
- **No autoplay**: `makeAnim` patched as on Terminal-Universe (the descent and the replay wait on step 1; a mode change resets paused); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `agora-tab`), keeping this page's `data-to` scroll target. `check_page.mjs` fails if either animation draws a frame before a click.
- **Takeaway scoped** (paper.json, so the card, `live.md` and `mk_coverage.py`): "165 independent reproductions failed zero times" became 165 verification posts by other accounts on 95 targets reporting no failure, with unposted failures leaving no trace; the drop is said to be about 98% day one (first 85% from one account); one task, one run, no matched comparison. The Notion property needs the same edit.
- Author emails in `inputs/paper_v*.txt` and `inputs/version_diffs.txt` replaced by "[email removed]"; `extract_paper.py` now redacts them (it already wrote em-dashes as `--`; none remained). Header: "Reading: 27 min, plus 8 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 28.5 min (6,564 words) | 27.5 min (6,331) |
| The paper, closed | 2.6 min (598) | 7.6 min (1,739) |
| Rebuild; tables; Further reading | 5.3; 9.0; 2.4 min | unchanged |
| Visuals in Reading (audit) | 4 | 6 (hero and the real graph image) |

Why about 27 minutes is right: the top added about 250 words (core sentence, hero caption, terms), and the moves closed about 1,100. What stays open is the paper's argument in its order: the three mechanisms with their equations, the run and its evaluator, the recipe's Stage A, the result with its shares, the coordination patterns, the human interventions that confound the diversity claim, and the evidence section the verdict rests on. Shorter would mean closing the human timeline or the evidence bullets, which are the reasons not to read the run as proof that Agora helps.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
312 units: core 244, depth 58, owned 4, volatile 5, fat 1 (the old autoplay note). 299 drafted by `ledger.py init` from the page before the pass; 13 added (top, hero, real image, owner links, release block, script-drawn charts keyed to static captions). `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 184 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 388 actions, 0 problems (no frame before a click). `mk_coverage.py`: 33 of 33.

## The 2026-11-12 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`): every section with a visual is text left, visual right (sticky); sections without one stay full width. Reading: At a glance (stage), The graph + Evidence (one stage), Frontier (calculator card right; its try note, ranking table and note moved left so the sticky card fits a window), The run (Figure 2 card), Recipe (stage), Results (descent card), Dynamics (the real Figure 4 image). Rebuild tab: ladder, rank explorer and replay split; noise table and How this was made full width. Tables and Further reading tabs: tables only, full width.
- **Three 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene file each):
  - `31_js_sc_loop.js`, hero Fig. 1: the 13 accounts (5 A100, 8 H100 on one node, §4.2) around one repository and the loop (analyze, pick a parent, evaluate, publish, evidence, Eq. 3 ranking), with flows for reads and commits and a close camera on one worker. It replaces the static SVG hero (`mk_hero.py` and `parts/03a_hero.svg.html` removed); the Table 4 descent and its 98% bracket that the old hero carried are in Results.
  - `32_js_sc_git.js`, Fig. 2 for The graph and Evidence: Eq. 1 on one node, one lane per account, a merge, duplicated branches, bundle against JSON, the SQLite index as a glass layer with missing and edited records, S(d) and descendants.
  - `33_js_sc_sa.js`, Fig. 3 for the Recipe: donors by Table 5 weight, 28 context tables, M, u, the rank-671 factors with this page's rebuild energy by rank, the 14-layer target, and the rebuild's guesses after " Jane" (Stage A prior against the anchor alone). Its step list replaces the open Stage A paragraph (the full description stays in the closed block).
  - The first two use the frontier calculator's illustrative graph and its own Eq. 2 and Eq. 3 values (`12_js_frontier.js` now exposes them as `window.FRG`), labelled illustrative; the third uses only the paper's constants and the rebuild's measurements.
- **Kept 2D**: the descent (a curve over time), Figure 2 (stacked daily bars), the frontier calculator (a widget the reader drives, read best flat), the Stage B band map (a 1-D band strip, in a closed block), the ladder, rank curve and token replay, and every table.
- **Motion**: `makeAnim` (11_js_ui.js) now follows `RD.anim`: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, marks `data-playing`, binds an `ol.sx` step list per mode (a list click plays that step once), and a mode toggle resets and replays. The descent is grouped into 8 explained stretches (and 5 for the last 0.03), following the long-replay rule; the replay keeps its 8 stretches of five tokens, its captions moved into generated step lists. The per-step caption boxes were removed. `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates; `check_page.mjs` now asserts autoplay instead of forbidding it.
- **Prose**: the run's loop paragraph now points at Fig. 1 instead of restating it (ledger unit 88 rekeyed); the descent and Stage A step lists carry numbers from `recompute.json` through `@@R:` placeholders.

## Length judgement (2026-11-12)
| | Before (audit 2026-11-12, pre-pass) | After |
|---|---|---|
| The paper, core | 27.5 min (6,331 words) | 33.0 min (7,586) |
| The paper, closed | 7.6 min (1,739) | 7.6 min (1,739) |
| Rebuild | 5.3 min (1,223) | 9.0 min (2,059) |
| Tables; Further reading | 9.0; 2.4 min | unchanged |
| Visuals in Reading (audit) | 6 | 8 |

The growth is the step lists that explain the three stages and the two animations; the audit counts every mode's list, including hidden ones (the descent's second list on the paper tab, about 170 words; the replay's three other models on the Rebuild tab, about 600), so a single pass reads about 32 minutes on the paper tab and 6 on the Rebuild tab. No knowledge was cut; the hero's static caption and the loop paragraph were folded into the stage steps.

Ledger: 317 units (core 249, depth 58, owned 4, volatile 5, fat 1); 5 added for the stages and stretches; `ledger.py check` problems 0.

## Checks (12 November 2026)
`checkpage.sh`: tabs 4, 241 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 406 actions, 0 problems. `check_stages.mjs`: 15 stages and animations (three widths), 0 problems. `mk_coverage.py`: 33 of 33. `ledger.py check`: problems 0.
