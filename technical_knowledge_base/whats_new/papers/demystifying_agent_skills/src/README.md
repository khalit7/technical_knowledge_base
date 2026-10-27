# Demystifying Agent Skills: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the ReAct page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`); the core sentence, the hero (the paper's control and Tables 9 and 11 as bars, HTML), You need and New terms; Problem, Idea (the A.3 replay animation; the route detail and the skill-creator prompt with its no-hint diff in closed blocks), Method, Results 1 to 4 (three predict-then-reveal questions, Table 1 differences in six panels, failure modes, outcome labels, transfer, retrieval), How much to believe (with the design-effect slider), What it takes to use this, Why it matters, Connections. |
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
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped in all three arms, 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

## Checks (3 October 2026)

See the reply in the build log: `checkpage.sh` fail=0, `check_page.mjs` 0 problems, `mk_coverage.py` 70 of 70.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero, the paper's central control (one pool of five trajectories, three arms) over Tables 9 and 11 drawn as bars on one scale (success, SC2 execution failures, misapplied skill guidance, timeouts), in HTML so it reflows; the paper is under arXiv's non-exclusive licence, so no figure of its own is reproduced and no image is used; You need (Claude Code section 6; optionally Agent and trajectory evaluation, LLM-as-judge) and New terms.
- **Owned elsewhere** (OWNERS.md): what a skill is and progressive disclosure link Claude Code (one sentence kept); the design effect formula links Evaluation statistics (the page keeps its own 1 + 5ρ for six triples per task).
- **Moved into closed `<details>`** (nothing deleted but fat): the provenance note (how the paper reached the knowledge base), the route.ts detail under the replay, the skill-creator prompt card, the taxonomy's construction and its 12 modes (one open paragraph keeps judge, categories, agreement and the paired triple), the four inconsistencies, and a dated block "Later, as of 25 October 2026" (SkillsBench's 87 tasks; code still unreleased at the last check). In the Tables tab, Tables 9, 10, 12, 13 with Figure 4 and the checks table are closed blocks.
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1 until play or a step, also after an arm switch; `check_page.mjs` fails if the replay draws a frame when scrolled into view or after an arm switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`, storage key `das-tab`). Header: "Reading: 22 min, plus 4 in closed details." (`reading.json`; `build.sh` no longer counts closed blocks).
- **Takeaway corrected** (paper.json, live.md, so the card): the old line said "first mechanistic account" and "because skills act as procedural anchors" and "retrieval precision decouples from downstream success". Now: +6.06 over workflow memory on 528 paired Codex runs with one trial per arm (Gemini on Terminal-Bench-Pro reverses), not clearly above raw (+2.84), the anchoring shares as one judge's labels, and the precision fall as a metric that mostly counts skills opened. Why it matters says "early controlled account". The headline stat's unit is now "of skill mechanism labels" (§5.1), not "of skill runs". The Notion property itself still has the old wording.
- **Length**: Reading core 5,337 words (23 min) plus 0 closed before; 5,155 (22 min, including about 450 words of new top) plus 820 closed (4) after. Tables tab 1,642 open before, 418 open plus 1,229 closed after. Replay tab unchanged (3 min). The core stays near its length because the ledger is almost all core: four research questions, each with its numbers and the evidence judgement that corrects them.
- **Ledger** (`ledger.json`, drafted from the committed page, labelled by `label_ledger.py`): 277 units, core 252, depth 19, owned 3, volatile 1, fat 2; `ledger.py check` problems 0. `mk_coverage.py`: three items updated; 70 of 70.
- Privacy: the task author's email in `inputs/.../task.md` is redacted; the paper text's one long dash is saved as `--`; `extract_paper.py` now does both. `test@example.com` in the task's simulator is a placeholder and stays.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 175 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 202 actions, 0 problems.
