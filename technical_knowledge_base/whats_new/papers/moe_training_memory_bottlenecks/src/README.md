# Flattening Every Memory Peak in Long-Context MoE Training: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc, a row of the Papers database listed as "Bounding the memory bottlenecks of large mixture-of-experts training"; its properties Paper, Takeaway, Topics and Year stay in Notion). The row has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need reference pieces (via the ZeRO page's copies).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card; "This row, corrected"; Problem; The four live sets (Table 1, "Which peak runs out first?" as a 3D stage); PipelinedLLEP (Eq. 1, the dispatch replay as a 3D stage, chunk-membership predict against Table 8); Ring-DTP (three-scalar predict with a live fold, the ring as a 3D stage); SCO (step animation, predict with Table 3 bars); OffloadStreamAdamW (step animation); Composition (Eq. 6); Results (Figures 6 and 7 from printed labels); Related work and limits; How much of this to believe; What it takes to use this; Why it matters; Connections. Since 2026-11-13 the four step-throughs of the old "Run the four schedules" tab (`t-run`) live in their sections (`#dsx`, `#rgx`, `#scx`, `#osx`); `#t-run` in a URL opens `#dsx`. |
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

HTML: `00_top`, `01_css` (ZeRO page CSS plus a few additions), `02_split` (skill template), `02_header`, `03a` to `03d_paper`, `05_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (`makeAnim` with the 2026-11-06 motion rules), `12_js_model` (the four live sets as formulas), `12b_js_route` (dispatch replay), `13_js_read`, `16_js_scx`, `17_js_osx` (`window.__osaCheck()` returns the three stream totals), `18_js_tables`, `19_js_hero` (the static hero), `25_js_s3` (renderer v2, skill template), `31_js_sc_pk`, `32_js_sc_dsx`, `33_js_sc_rgx` (`window.__ringCheck()` returns the max loss difference against dense), `99_js_tabs` (the skill template, key `mm-tab`, plus the `#t-run` redirect). `04_run`, `14_js_dsx` and `15_js_rgx` were removed on 2026-11-13.

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

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Ownership: this page owns the paper (its four operators, their bounds, its numbers and evidence). One GPU's ordinary training memory slab by slab is Distributed training's Fig. 2 (`#rd-mem`) and the plain all-to-all is Mixture of experts' Fig. 9 (`#mx-s7`); both are linked, not rebuilt. The stages draw only what this paper adds: the live sets at two moments of a step and how each operator caps one, the chunked send matrices against Eq. 1's bound, and the ring that keeps each rank's batch.

**The Run tab moved into Reading.** Each of its four step-throughs explained one mechanism, so each now sits beside its section (`#dsx`, `#rgx`, `#scx`, `#osx`, anchors kept; `#t-run` opens `#dsx`; Table 1's links point there). The card's run link opens "Which peak runs out first?" (`paper.json` `run_tab`/`run_to`, `mk_paper.py` writes `data-to`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | idea in one sentence, You need, New terms | split | hero, 2D static (measured before/after) | no |
| The paper | Problem; Four live sets (Table 1) | full width | table | no |
| The paper | Which peak runs out first? | split | **3D** `stg-pk`, model and N under the steps | yes, 6 |
| The paper | Expert dispatch: PipelinedLLEP | split, then predict and results full width | **3D** `stg-dsx`, strided/contiguous toggle and profile under the steps; predict reveal 2D bars | yes, 5 (shared by both memberships) |
| The paper | Vocabulary projection: Ring-DTP | predict full width, then split, results full width | **3D** `stg-rgx`, three schedules; state table under the steps; predict reveal a fold table | yes, 5, 5 and 3 |
| The paper | Checkpoint boundaries: SCO | split, then predict and results full width | 2D `makeAnim` (`#scx`), four budgets | yes, 4 (shared) |
| The paper | Optimizer: OffloadStreamAdamW | split, results full width | 2D `makeAnim` (`#osx`) | yes, 4 (stream) and 2 (CPU) |
| The paper | Composition | full width | equation | no |
| The paper | Results end to end | split | 2D chart (Figures 6 and 7 labels) | no |
| The paper | Limits, How much to believe, Using it, Why it matters, Connections | full width | none | no |
| Tables | Figure 2 from Table 6 | split | 2D chart | no |
| Tables | the rest | full width | tables and checks | no |
| Further reading | | unchanged | | |

**Stage `stg-pk`** (`31_js_sc_pk.js`): one H200 at two moments of a step, inside an MoE layer (model state + boundaries + dispatch) and at the head (model state + boundaries + logits), as towers of slabs to scale; the taller tower is `roughPeak`. A glass plane and dashed rings mark 141 GB. Steps switch on Ring-DTP, offload with OffloadStreamAdamW, SCO and PipelinedLLEP in turn; offloaded bytes flow to a host stack (12Θ/W plus every boundary). The camera moves in as the towers shrink and back out for the summary, which shows the starting outline. Data: `liveSets()` in `12_js_model.js` (illustrative constants, as before); the step texts' numbers are spans filled from the model, and the written defaults (667B, 64 GPUs, 65,536 tokens per rank: 397 to 74 GB) are checked against it.

**Stage `stg-dsx`** (`32_js_sc_dsx.js`): the 8 × 8 send matrix of the current chunk as a bar field, receive towers behind it with highest-so-far rings, dots running along each column to its destination; step 1 shows the whole layer's plan as floor tiles, steps 3 and 4 play chunks 2 to 5 and 6 to 10 within the step (the step's tween is longer), step 5 rescales tenfold to LLEP's whole batch with Eq. 1's guarantee (419,456 routes) as a glass plane. Data: `rtData()` in `12b_js_route.js`, the replay that reproduces Table 8. Strided and contiguous share one list (the toggle replays it).

**Stage `stg-rgx`** (`33_js_sc_rgx.js`, the old `15_js_rgx.js` computation unchanged): four rank boards on a ring; each holds its batch as signed bars, its shard as a glass plate, the strip it forms as signed bars, and its two tokens' state as green blocks; a green ball marks a target's logit when its shard passes; shards (or batches and states) hop along the arcs with dots. Round 1 moves the camera in close on rank 0. The (m, z, y_t) values and final losses are in an HTML table under the steps.

**Kept 2D, and why**: the hero (measured before/after pairs on their own scales and Figure 7b's context reach: numbers on axes), SCO (47 boundaries in two rows read best as a flat strip; given four explained stretches: forward, backward through the kept boundaries, backward through the offloaded ones, done), the optimizer stream (a timeline; four stretches: first upload, fill, steady state, drain), the predict reveals, the end-to-end chart and the tables tab. No real image: the paper is CC BY-NC-SA 4.0, as before.

**Motion**: `11_js_ui.js` carries Megatron-LM's `makeAnim` with the 2026-11-06 rules plus `durOf(mode,k)` so a stretch step can take longer; per-step captions (`#…Step`, `#…Cap`) are gone, their text is the step lists. `99_js_tabs.js` is the template (key `mm-tab`) plus the `#t-run` redirect and the closed-block opening of `data-to`. `05z_errbox.js.html`, `02_split.html` and `25_js_s3.js` are the current templates. `build.sh` finds the repository root by path instead of git.

**Checks**: `check_page.mjs` no longer asserts that nothing moves before a click; it steps the three stages in every mode, every dispatch profile and model, and the two animations. `check_stages.mjs` (new, from Megatron-LM's): at 1400 and 920 light and 390 dark every stage and animation plays once in view, steps to the end, has one list item per step in every mode, stops drawing off screen, every split is two columns at 1400, no errors, NaN or sideways scroll; nothing moves under reduced motion; and 61 step-list numbers are checked against `MM_PK`, Table 1 recomputed, `rtData` and `__ringCheck`.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 23.6 min (5,434 words) | 33.5 min (7,706) |
| The paper, closed | 1.8 min (421) | 2.8 min (654) |
| Run the four schedules | 4.8 min (1,094) | merged into The paper |
| The paper's tables, rebuilt | 10.9 min | unchanged |
| Further reading | 2.5 min | unchanged |

Of the 10 minutes added to Reading, about 4.5 are the Run tab moved in, and most of the rest are the step lists: the old animations' 40-odd captions were drawn by script and invisible to the audit, and the new lists also explain the three stages (including the hidden lists of the other ring schedules, which the audit counts). What it takes's bullets moved into a closed block behind a summary, as the paper method asks. Why about 34 minutes is right: the page owns four mechanisms, each now with its explained visual beside its bound and its measured evidence, plus the evidence section. Header: "Reading: 34 min, plus 3 in closed details." (`reading.json`).

**Ledger**: 263 units (core 243, depth 12, fat 3, owned 5). Re-pointed: 2, 28 to 30, 57, 95, 183, 186 to 197, 199, 201, 204 to 207 (the Run tab's and the calculator's text, now in the sections and step lists); 182, 184 and 185 marked fat (the Run tab's intro framing, its old motion note and its nav); 162 re-keyed and labelled depth (the What it takes bullets, now closed). `ledger.py check`: problems 0. `mk_coverage.py`: 18 of 18.
