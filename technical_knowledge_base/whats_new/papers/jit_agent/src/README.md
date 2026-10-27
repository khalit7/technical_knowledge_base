# JIT-Agent: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81148227fbd67dc4b3ee, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card; the core sentence, the hero (the paper's Figure 1, CC BY 4.0, over Table 2 averages and Table 3 costs as bars from `mk_hero.py`), You need and New terms; Problem, Idea (the four-module protocol, a ReAct against Turnstile protocol-turn animation, the seed bank), Training (three stages, Evo-GDPO, predict question on the gate), Inference, Results 1 to 5 (two predict questions: harnessed V4-Flash against GPT-5.6, best score in how many of six settings; Figure 4 and Figure 6 decoded), How much to believe, What it takes to use this, Why it matters, Connections. |
| Score a group of harnesses | `t-run` | The live ingredient: Evo-GDPO's Eq. 6 and 7 on a group, animated against GRPO-style mixing, with the bank rule and Stage I's Eq. 4 pair rule; the released training harnesses counted and browsable. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 2, 3, 4, Figure 4 and all nine Figure 6 panels, the noise and granularity checks, the training-against-test checks, all 68 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is an update rule, not a trace replay.** papers.md suggests a trace replay for agent papers, but neither the paper nor the release publishes a single trace or run output. What is new and checkable in the paper is Stage III's reward arithmetic (Eq. 6, 7) and the bank rule, so the tab runs those (the training-recipe row of papers.md), on Table 3's real numbers as one preset. The protocol-turn animation in Reading is labelled illustrative.
- **Two arXiv versions.** v2 (3 September) is linked by default; an `ax1:` macro links v1 where v2 removed text (the Position box, Future Work, v1's training-source list that included DeepPlanning). `build.sh` fails on any anchor that is not in `inputs/anchors_v1.txt` or `anchors_v2.txt`.
- **Release audited, not just the paper.** Code, weights and 2,852 training harnesses are public, so the page measures them (`overlap.py`, `harness_stats.py`); this produced the main correction (training harnesses built on the DeepPlanning test cases' own databases).
- **No Then and now.** A 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 26 minutes against the old 5).** The old page was a summary of v1's abstract and results; this one owns the full paper, both versions, the release audit and an evidence section that changes the reading. The Position box is folded into a details block; the generated-harness gallery is a table.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 and v2 to `inputs/paper_v*.txt`, `tables_v*.txt`, `anchors_v*.txt`.
- `decode_figs.py`: Figures 4 and 6 from the vector PDFs in the v2 e-print to `inputs/figs.json` (`uv run --with pymupdf`).
- `mk_tables.py`: `tables.json` (Tables 1 to 4, Figures 4 and 6), asserting v1 and v2 tables are identical.
- `recompute.py`: 68 checks (47 printed numbers, all reproduce), noise, granularity, Figure 6 summaries, to `inputs/recompute.json`.
- `overlap.py`: training harnesses against the test sets (HF dataset, 102 MB, not kept; repo `dataset/`), to `inputs/overlap.json`.
- `harness_stats.py`: counts and a 12-harness gallery from the training harnesses, to `inputs/harness_stats.json` (keyword rules stated in the file).
- `fetch_release.sh`: verbatim extracts of the READMEs, model card and dataset card to `inputs/release_extracts.txt`.
- `mk_hero.py`: the hero's result bars from `tables.json` (asserts the 14.9, 54.1 and 36.0% cuts), to `parts/_gen_hero.html`.
- `label_ledger.py`: labels `ledger.json` (see the light pass below).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (42 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped for every preset and mode.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 47 of 47 printed numbers; `mk_coverage.py` 42 of 42.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero is the paper's own Figure 1 (the paper is CC BY 4.0, checked on the arXiv abstract page), credited under it and in `../img/CREDITS.md`, above HTML bars of Table 2's nine-benchmark averages and Table 3's cost per case (cheapest fixed harness against JIT in all six settings, scores in brackets); You need (Topic: agentic-harnesses, RL for LLMs, Alignment) and New terms. The paper's Figure C.3 (Turnstile) now sits under the illustrative protocol animation it was built from.
- **Owned elsewhere** (OWNERS.md): what a harness is (Topic: agentic-harnesses), GRPO's group advantage (RL for LLMs), DPO (Alignment), binomial standard errors and paired comparisons (Eval statistics): one sentence each kept, linked.
- **Moved into closed `<details>`** (nothing deleted but fat): provenance and the first summary's framing; how familiar harnesses fit the tuple (v1); Stage I's pair weight; what the release says about its checkpoint; the full benchmark and baseline list; v1's reading of the gains; Figure 4 against Table 2; JIT's own drafting cost; the margins one by one; two training rows against their test cases; the granularity cells; serving the model; every connection (the open text keeps three and points to Further reading); a dated block "Later, as of 25 October 2026" (repository still at ababa06, arXiv still v2). In the Tables tab, Table 4, the noise table, the granularity table and the 68 checks are closed blocks (their anchors still open them from Reading links).
- **No autoplay**: `makeAnim` waits on step 1 until play or a step, also after a mode switch; `check_page.mjs` fails if the protocol animation draws a frame when scrolled into view or after a switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`, storage key `jit-tab`). Header: "Reading: 28 min, plus 6 in closed details." (`reading.json`).
- **Takeaway scoped** (paper.json, live.md, so the card): the old line said a harnessed V4-Flash beats bare GPT-5.6 (true on five of nine benchmarks, not on average, 75.5 against 76.5) and "14.9-54.1% lower cost than fixed harnesses" as if across all nine (it is Table 3's three benchmarks, perhaps without JIT's own drafting); it now also says single runs, the undescribed default scaffold and the DeepPlanning training overlap. Why it matters says "an early attempt", not "the first attempt". The Notion property still has the old wording.
- **Length**: Reading core 6,551 words (28 min) plus 137 closed before; 6,458 (28 min, including about 500 words of new top) plus 1,298 closed (6) after. Tables tab 2,177 open before, 827 open plus 1,352 closed after. Score tab unchanged (5 min). The core stays near its length because the ledger is almost all core: the paper's method, five result sections with their numbers, and the release audit that changes the reading (DeepPlanning overlap, released model not the evaluated one) all belong to this page and nowhere else.
- **Ledger** (`ledger.json`, drafted from the committed page): 290 units, core 238, depth 44, owned 4, volatile 1, fat 3; `ledger.py check` problems 0. `mk_coverage.py`: three keys updated; 42 of 42.
- Privacy and dashes: no email in any saved source; the 34 long dashes in `inputs/paper_v1.txt`, `paper_v2.txt`, `tables_v1.txt` and `release_extracts.txt` are saved as `--`, and `extract_paper.py` and `fetch_release.sh` now redact emails and convert dashes on any rerun.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 255 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 400 actions, 0 problems.
