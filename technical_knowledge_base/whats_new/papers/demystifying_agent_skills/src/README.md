# Demystifying Agent Skills: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the ReAct page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`); the core sentence, the hero (a 3D stage since 2026-11-13: the paper's control, then Tables 9 and 11 as bars), You need and New terms; Problem, Idea (the A.3 replay animation; the route detail and the skill-creator prompt with its no-hint diff in closed blocks), Method, Results 1 to 4 (three predict-then-reveal questions, Table 1 differences in six panels, failure modes, outcome labels, transfer, retrieval as a 3D stage), How much to believe (with the design-effect slider), What it takes to use this, Why it matters, Connections. |
| Replay the paired run | `t-run` | The live ingredient: Appendix A.3's three excerpts verbatim, and a checkout scheduler on the task's real service latencies with both verifier tests. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 and 16 explorer, Figure 2 decoded, retrieval explorer (Tables 4, 14, 15) with the "opens every skill" overlay (open); Tables 9, 10, 12, 13 and Figure 4, and every number checked (closed blocks). |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model.** The paper measures agent behaviour on public benchmarks; there is no mechanism to train. The live ingredient is a trace replay (the agent row of papers.md), made exact by fetching the public SkillsBench task the paper's example comes from.
- **No code link.** The paper released none; the card says so and links the replayed task instead (`mk_paper.py` takes a `link_label`).
- **No Then and now.** A 2026 result paper; "What it takes to use this" covers adoption.
- **The evidence section leans on numbers derived from the paper's own tables** (trial counts from printed rates, triple counts against task counts, Figure 2 decoded to counts). Each is labelled derived on the page and in `recompute.py`.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_example.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`.
- `decode_figs.py`: Figures 2 and 4 from the vector PDFs of the arXiv e-print (needs `uv run --with pymupdf`; the e-print is not kept).
- `mk_tables.py`: `tables.json` from the extracted tables and decoded figures (printed strings kept).
- `recompute.py`: every derived number and check, written to `inputs/recompute.json` and shown in the checks table.
- `mk_example.py`: Appendix A.3 and B.1/B.2 verbatim into `parts/20_example.js` (braces escaped for the build).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (70 items from `live.md`, verified against the built page).
- `check_stages.mjs` (from the repo root): the 2026-11-06 layout and motion checks (splits, both stages and the replay play in view and step to the end, one list item per step, reduced motion, the step lists' numbers against `PAPER`).
- `parts/31_js_sc_hero.js`, `parts/32_js_sc_ret.js`: the two 3D scenes; `parts/25_js_s3.js` and `parts/02_split.html` are the templates, unchanged.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped in all three arms, 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

## Checks (3 October 2026)

See the reply in the build log: `checkpage.sh` fail=0, `check_page.mjs` 0 problems, `mk_coverage.py` 70 of 70.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero, the paper's central control (one pool of five trajectories, three arms) over Tables 9 and 11 drawn as bars on one scale (success, SC2 execution failures, misapplied skill guidance, timeouts), in HTML so it reflows; the paper is under arXiv's non-exclusive licence, so no figure of its own is reproduced and no image is used; You need (Claude Code section 6; optionally Agent and trajectory evaluation, LLM-as-judge) and New terms.
- **Owned elsewhere** (OWNERS.md): what a skill is and progressive disclosure link Claude Code (one sentence kept); the design effect formula links Evaluation statistics (the page keeps its own 1 + 5ρ for six triples per task).
- **Moved into closed `<details>`** (nothing deleted but fat): the provenance note (how the paper reached the knowledge base), the route.ts detail under the replay, the skill-creator prompt card, the taxonomy's construction and its 12 modes (one open paragraph keeps judge, categories, agreement and the paired triple), the four inconsistencies, and a dated block "Later, as of 25 October 2026" (SkillsBench's 87 tasks; code still unreleased at the last check). In the Tables tab, Tables 9, 10, 12, 13 with Figure 4 and the checks table are closed blocks.
- **No autoplay** (superseded on 2026-11-13, see below): `makeAnim` (11_js_ui.js) waits on step 1 until play or a step, also after an arm switch; `check_page.mjs` fails if the replay draws a frame when scrolled into view or after an arm switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`, storage key `das-tab`). Header: "Reading: 22 min, plus 4 in closed details." (`reading.json`; `build.sh` no longer counts closed blocks).
- **Takeaway corrected** (paper.json, live.md, so the card): the old line said "first mechanistic account" and "because skills act as procedural anchors" and "retrieval precision decouples from downstream success". Now: +6.06 over workflow memory on 528 paired Codex runs with one trial per arm (Gemini on Terminal-Bench-Pro reverses), not clearly above raw (+2.84), the anchoring shares as one judge's labels, and the precision fall as a metric that mostly counts skills opened. Why it matters says "early controlled account". The headline stat's unit is now "of skill mechanism labels" (§5.1), not "of skill runs". The Notion property itself still has the old wording.
- **Length**: Reading core 5,337 words (23 min) plus 0 closed before; 5,155 (22 min, including about 450 words of new top) plus 820 closed (4) after. Tables tab 1,642 open before, 418 open plus 1,229 closed after. Replay tab unchanged (3 min). The core stays near its length because the ledger is almost all core: four research questions, each with its numbers and the evidence judgement that corrects them.
- **Ledger** (`ledger.json`, drafted from the committed page, labelled by `label_ledger.py`): 277 units, core 252, depth 19, owned 3, volatile 1, fat 2; `ledger.py check` problems 0. `mk_coverage.py`: three items updated; 70 of 70.
- Privacy: the task author's email in `inputs/.../task.md` is redacted; the paper text's one long dash is saved as `--`; `extract_paper.py` now does both. `test@example.com` in the task's simulator is a placeholder and stays.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 175 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 202 actions, 0 problems.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, included after `01_css.html`): every section with a visual is text left, visual right (sticky); sections without one stay full width. Reading: the top (hero stage), Idea (the replay card), Result 1 (the Table 1 difference panels), Result 2 (failure modes), Result 3 as two splits (no-hint chart, then transfer chart; the transfer paragraph is now `section#s-tr`), Result 4 (retrieval stage), How much to believe (the design-effect slider card, moved out of its bullet). Problem, Method, Use it, Why it matters and Connections have no visual and stay full width. Replay tab: the excerpts stay full width (three text columns); the scheduler splits (notes left, card right). Tables tab: the three explorers (Table 1 and 16, Figure 2 decoded, retrieval) split, their notes left (one new orienting sentence each for Table 1 and retrieval) and the card right; the closed blocks of smaller tables stay full width. Further reading unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene file each):
  - `31_js_sc_hero.js`, the hero, replacing the HTML bar hero: five trajectories (drawn as 1s4f), the traces flowing onto the Workflow Memory agent's instruction, the same five flowing through the skill creator (a glass plate) into one SKILL.md card in the environment; then one row of bars per arm that morphs from success (Table 9) to SC2 failures (`sc_counts`, Figure 2 decoded) to skill guidance misapplied, with timeouts rising as a second row (Table 11). Six steps; the camera moves in close on the pool, the memory stack and the skill creator, then to the bars. Numbers come from `PAPER.tables` and `PAPER.rc` at run time; the trajectories' order and the card's shape are labelled illustrative.
  - `32_js_sc_ret.js`, Result 4: 100 candidate skill cards around one task, the gold skill, near-duplicates tinted; Arm 1 at k = 5 and k = 100, Arm 2, Arm 3 for Codex and Gemini (cards each agent touches light up, flows to them), and success at k = 5 against k = 100 as bars on plinths. Precision and success are the paper's (Table 4 averages, Table 15 per agent); the counts of skills touched are this page's derived recall ÷ precision at k = 100 (mean of the three pools: Codex 13, Gemini 93; ranges 8 to 22 and 88 to 95). Which cards are touched and where they sit is illustrative. Its step list replaces the old "As pools grow" bullets and the confusable-distractors paragraph (same numbers, same wording where keys needed it).
- **Kept 2D**: the replay (a Gantt timeline on a millisecond axis), the scheduler, the Table 1 difference panels, failure-mode bars, no-hint lines, transfer bars, the predict reveals, the design-effect slider and every table: curves, intervals and grouped bars read best flat.
- **Motion**: `makeAnim` (11_js_ui.js) replaced by the agora page's version, which follows `RD.anim`: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, marks `data-playing`, binds one `ol.sx` per arm (filled by `12_js_ex.js` from the same step texts) and replays on an arm switch. The per-step caption box is gone: the step lists explain each step, and the card keeps the quoted excerpt and the timeline (the excerpt's words are no longer repeated in the caption). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `das-tab`; this page keeps its one-line extra that opens the closed block a `data-to` link points into, which the template lacks). `check_page.mjs` now asserts the replay plays in view and replays on an arm switch (it used to forbid both), and opens the reading tab first.
- **Other edits**: one-line "what to notice" titles on the four Reading charts; a link to the context engineering page in Connections; the unused `#hx` CSS removed; `mk_coverage.py` needles for four Result 4 items follow the new wording.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 22.4 min (5,155 words) | 26.2 min (6,036) |
| The paper, closed | 3.6 min (820) | 3.6 min (820) |
| Replay tab | 3.4 min (779) | 3.4 min (785) |
| Tables tab, open plus closed | 1.8 plus 5.3 min (418, 1,229) | 2.1 plus 5.3 min (480, 1,229) |
| Visuals in Reading (audit) | 10 | 12 |

The growth is the step lists that explain the two stages and the replay. The audit counts all three arms' replay lists, two of them hidden at any time (317 words), so a single pass reads about 25 minutes. The hero's list carries the numbers the old bar hero showed; the retrieval list replaces prose rather than adding to it. No knowledge was cut.

Ledger: 282 units (core 257, depth 19, owned 3, volatile 1, fat 2); 5 added for the stages; 7 rekeyed (79, 113, 137, 138, 139, 165, 242) where the wording moved into a step list or beside a chart; `ledger.py check` problems 0. `mk_coverage.py`: 70 of 70.
