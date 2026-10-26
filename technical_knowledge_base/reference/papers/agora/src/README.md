# Agora: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's pieces (`build.sh`, `mk_paper.py`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`, the CSS, `check_page.mjs`, `save_live.py`, `extract_paper.py`).

The page follows arXiv v4 (30 September 2026). The Notion text (`live.md`, fetched as of 21 September) was written from an earlier version.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict, the core sentence and hero figure with You need and New terms, Problem, the commit graph (Eq. 1), evidence score (Eq. 2), the frontier (analyze, clusters, Eq. 3) with a calculator on an illustrative graph, the run (Figure 2 decoded), the winning recipe (Stage B band map), Results (Table 4 as a step animation), Coordination dynamics, What the humans did, Why it matters, How much to believe, What it takes to use this, Connections. Four predict-then-reveal questions. |
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
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the frontier nodes, both animations stepped, 11 px text, NaN, errors, sideways scroll.

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
