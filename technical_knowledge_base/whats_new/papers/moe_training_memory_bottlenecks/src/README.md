# Flattening Every Memory Peak in Long-Context MoE Training: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc, a row of the Papers database listed as "Bounding the memory bottlenecks of large mixture-of-experts training"; its properties Paper, Takeaway, Topics and Year stay in Notion). The row has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need reference pieces (via the ZeRO page's copies).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card; "This row, corrected"; Problem; The four live sets (Table 1, "Which peak runs out first?" calculator); PipelinedLLEP (Eq. 1, chunk-membership predict with the in-browser replay against Table 8); Ring-DTP (three-scalar predict with a live fold); SCO (predict with Table 3 bars); OffloadStreamAdamW; Composition (Eq. 6); Results (Figures 6 and 7 from printed labels); Related work and limits; How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Run the four schedules | `t-run` | The live ingredient: four before/after animations, one per operator (`dsx`, `rgx`, `scx`, `osx`). |
| The paper's tables, rebuilt | `t-tables` | Figure 2 from Table 6; token budget and latency-mode details (Figure 8, Table 7, B.5); ten tables, sortable, Table 8 with the replay's columns; 57 checks with verdicts; every printed label of Figures 6 and 7. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.**
- The live ingredient is the systems kind, but four of them, because the paper is four operators on four different live sets; one animation would have covered one quarter of it. Two compute for real (the dispatch replay on the paper's own routing profiles through LLEP's released plan, which reproduces Table 8 exactly; Ring-DTP's exact loss on real numbers); two are timelines built from measured sizes and times, and the optimizer one is labelled illustrative because bucket times are not printed.
- No trained toy: the operators change no arithmetic, so a toy trained with and without them would be identical by construction.
- No Then and now tab: a September 2026 paper with no code; "What it takes to use this" covers adoption.
- Figures 6 and 7 are PNGs whose baseline curves print no values; only printed labels are used (`inputs/fig_labels.txt`), never points read off a curve.
- The card's title is the arXiv title; a line under it gives the database's different title.
- The Reading tab is about 23 minutes against the old row's 3: the old row was a three-paragraph summary of a newsletter abstract, and this page owns four mechanisms and the evidence for each. Token-budget and latency-mode details moved to the tables tab to keep it there.

## Files

- `build.sh`: runs `mk_tables.py`, `sim_dispatch.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash, prints reading time and size.
- `paper.json`: metadata, headline numbers, resources, connected KB papers and topics, verdict. `mk_paper.py`: card, Further reading, `window.PAPER` (adds a `code.label` and a `notion_title` line to the reference version, and maps appendix anchors `A2.T8` to table names).
- `mk_tables.py`: `tables.json` (Tables 2, 3 + 12, 4 + 14, 6 to 11, 13), every cell verified against `inputs/table_*.txt`.
- `sim_dispatch.py`: the dispatch replay (B.2 routing profiles, a port of `compute_llep_lpt_plan` and `llep_lpt_plan_to_compute_ranks` from github.com/SalesforceAIResearch/LeastLoadedEP, chunk membership, send ratios) at capacity factors 1.0 and 1.1; writes `inputs/sim_dispatch.json`. `parts/12b_js_route.js` is the same algorithm in the page, checked to give identical ratios.
- `recompute.py`: 57 checks (40 reproduce, 13 derived, 4 do not reproduce); writes `inputs/recompute.json`.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v1 into `inputs/paper_v1.txt` and `inputs/table_*.txt`. `inputs/` also holds the gpt-oss-20b config, a Kimi K2 config extract, related abstracts (LLEP, MoP, Cut Cross-Entropy, ZeRO-Offload), `fig_labels.txt` and `other_sources.txt` (H200 specs, DeepSeek-V3 context extension, code search).
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, all four animations stepped through every mode (and every dispatch profile), text at least 11 px, no NaN or errors, no sideways scroll, element shots of every inline chart into `../.shots/`. Launches Chrome with `headless: 'shell'`.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (18 of 18).

## Parts

HTML: `00_top`, `01_css` (ZeRO page CSS plus a few additions), `02_header`, `03a` to `03d_paper`, `04_run`, `05_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_model` (the four live sets as formulas), `12b_js_route` (dispatch replay), `13_js_read`, `14_js_dsx`, `15_js_rgx` (`window.__ringCheck()` returns the max loss difference against dense), `16_js_scx`, `17_js_osx` (`window.__osaCheck()` returns the three stream totals), `18_js_tables`, `19_js_hero` (the static hero), `99_js_tabs` (the skill template, key `mm-tab`).

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 171 KB. `node .../src/check_page.mjs`: 0 problems over 668 actions. `__ringCheck()`: 0 and 8.9e-16. `mk_coverage.py`: 18 of 18.

## Light pass to the teaching contract (2026-10-26)

- **Top**: the idea in one sentence (a step dies at its single highest peak, so the paper caps all four live sets that common MoE parallelism leaves free to grow, by order and granularity only, exact, each term known before launch); a static hero (`parts/19_js_hero.js`): each live set with what it grows with, where in the step it lives, its operator, and the paper's own before/after (Table 6 dispatch 52.988 to 22.855 GiB, Table 2 projection 79.521 to 10.622 GiB, Table 3 whole-step peak 139.790 to 123.728 GiB, Table 4 step 3.95 to 1.93 s), then Figure 7b's context reach; You need (Distributed training, Performance math, Mixture of experts); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): the standard memory trades and activation checkpointing (Distributed training), the 16 bytes per parameter breakdown (Performance math), expert parallelism and capacity (Mixture of experts), the online softmax (Writing kernels).
- **Moved into closed blocks**: "This row, corrected" (provenance of the old summary and its three corrections); why each dispatch chunk needs a reentrant checkpoint (B.1; the three-matmuls cost stays visible); choosing the chunk budget *c*; related work (§5); the DeepSeek-V3 long-context example in "Why it matters".
- **Never autoplays**: `makeAnim` in `11_js_ui.js` waits on its first frame until the reader presses play or steps, also after a mode switch; tabs from the skill template. `check_page.mjs` uses DOM clicks for tabs, fails on any frame drawn before a click in the four animations, checks the hero is drawn, and opens every closed block.
- **No real image**: the paper is CC BY-NC-SA 4.0 (arXiv abstract page, checked 26 October 2026), outside the licences the knowledge base reuses, and nothing physical is the subject; the hero redraws the paper's argument from its tables.
- **Takeaway softened** (card, `paper.json`, `live.md`): it now says the four peaks include the *time* of the offloaded optimizer step (not its memory), that the savings are against the authors' own LLEP and a full-logit projection rather than fused cross-entropy kernels, and that the 1M-token end-to-end result is a single-run result for the whole MoP stack against a weak FSDP2 baseline with no per-operator ablation. The Notion property, saved in `live.md` before this pass, read: "Bounds the four main memory bottlenecks of large-MoE training inside a fixed GPU memory budget by scheduling rather than by approximating the computation, across expert dispatch, vocabulary projection, activation checkpointing and optimiser state." It overclaims a fixed budget (the dispatch bound grows with E_p: 56 GiB at the end-to-end scale, and two operators spend host memory) and "main" (the paper picks four that common plans leave unbounded); Notion still carries it.
- **Source extracts**: no em-dashes or author emails in `inputs/` (checked); `extract_paper.py` now also redacts emails on extraction (it already wrote em-dashes as `--`).
- **Length judgement**: Reading core 23 min before (5,337 words) and 24 after (5,434), plus 2 in closed details (421 words, from 0; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 2 minutes and the softened takeaway a little; the moves took out about as much. What stays is core: four mechanisms, each with its bound and its measured evidence, and an evidence section that changes how to read the headline. Other tabs unchanged (Run 5, Tables 11, Further reading 3). Visuals inline: 2 before, 3 after (the hero).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 263 units; core 247, depth 11, owned 5; `ledger.py check` problems 0.
- **Checks (26 October 2026)**: `checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (668 actions); `mk_coverage.py` 18 of 18.
