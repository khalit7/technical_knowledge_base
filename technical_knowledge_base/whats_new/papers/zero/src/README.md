# ZeRO: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card, then the core sentence, the hero (DDP against ZeRO-3 on 4 GPUs, `16_js_hero.js`), You need and new terms; Problem, Where did all the memory go (16 bytes predict and bar), ZeRO-DP (stage table, Figure 1 live), Communication (1.5× predict, then the training-step step-through inline, its paper-scale counters closed), ZeRO-R (the P<sub>a</sub> cost and the 100B checkpoint sizes closed), With MP and the trillion, Results (super-linear predict), How much of this to believe (reporting slips closed; verdict), Why it matters (API names in a dated closed block), Connections. |
| The paper's tables, rebuilt | `t-tables` | Calculator (Tables 1 and 2 generalised), Table 1, Table 2, Table 3 with Figure 6 from Table 7, the configuration recount, every number in the text checked. |
| Then and now | `t-then` | Stage names across DeepSpeed and FSDP, which stage five big runs used (quoted), the follow-up line. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.** The live ingredient is the systems kind (a simulated before/after of one step), not a trained toy: ZeRO changes no arithmetic, so a model trained under each stage would give identical results and teach nothing; what changes is where bytes live and when they move, which the simulation shows exactly. Figures 2, 3, 7 and 8 are not redrawn because they print no values (only Figure 6's sizes are recoverable, from appendix Table 7). "What it takes to use this" is skipped: the method is standard and Then and now covers adoption. Then and now is a set of sourced tables rather than a step-by-step morph, because ZeRO's design did not change shape; what is worth showing is what it is called now and which stage real runs chose. The Reading tab is 19 minutes against the old page's 9 (15 before the evidence section was added), because the paper page owns every detail; the C1 to C5 analysis and two non-reproducing figures moved to the tables tab to keep it there.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros (`{{text|ax:<anchor>}}` and friends, see the reference folder), fails on an unexpanded macro or an em-dash.
- `paper.json`: metadata, headline numbers, resources, connected KB papers and topics. `mk_paper.py`: the card, Further reading and `window.PAPER` (copied from the reference, with the card's tab link read from `paper.json`).
- `mk_tables.py`: builds `tables.json` from the table extracts (Table 1 bold cells and the appendix figure mapping by hand, from the HTML).
- `recompute.py`: every reproduced number (Figure 1, all 54 cells of Table 1 with how each was rounded, Table 2, communication, activations, buffers, compute gap, results arithmetic, parameter recount of every configuration, Figure 3 and Figure 6 memory, MT-NLG's 20-byte count). Writes `inputs/recompute.json`; prints a report.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v3 into `inputs/paper_v3.txt` and `inputs/table_*.txt`; `inputs/later_extracts.txt` holds the quoted lines from BLOOM, DeepSeek-V3, Llama 3, MT-NLG, FSDP (paper and docs), ZeRO-Offload, ZeRO-Infinity, ZeRO++, the DeepSpeed blog and the archived Turing-NLG post.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the animation stepped through every mode and every N_d, text at least 11 px, no NaN or errors, no sideways scroll. Its regex ignores "Infinity" after a hyphen (ZeRO-Infinity).
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md`.

## Parts

HTML: `00_top`, `01_css` (reference CSS plus a few ZeRO additions), `02_header`, `03_paper`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, with autoplay removed on 2026-10-24), `12_js_zero` (the memory and communication model shared by all tabs), `13_js_read`, `14_js_step` (the schedule simulation and animation; `window.__zeroCheck()` returns its totals), `15_js_tables`, `16_js_hero` (the hero), `99_js_tabs` (the skill template).

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 165 KB. `node .../src/check_page.mjs`: 0 problems (rerun after the evidence section, 171 KB). `__zeroCheck()`: the schedule moves 2Ψ, 2Ψ, 2Ψ, 3Ψ and its at-rest memory equals §5's formulas at N_d = 2, 4, 8. `mk_coverage.py`: 53 of 53 items verified.

## The 2026-10-24 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero: the same step on 4 GPUs under data parallelism and ZeRO-3, model states to scale for Figure 1's 7.5B model (120 GB against 30 GB per GPU; 2Ψ against 3Ψ per step). A static before/after, because the paper's point is a method replacing another; the intermediate stages stay in the live Figure 1. The paper is under arXiv's non-exclusive licence (not CC BY), so its figures are redrawn, not embedded. Then "You need" (Distributed training, for DP and all-reduce) and the new terms.
- **The live ingredient moved inline.** The "Step through a training step" tab explained one mechanism, so the step-through now closes the Communication section, after the 1.5× prediction it proves; "the same counters at the paper's scale" is a closed block under it. `#t-step` links open the Reading tab at the step-through (`99_js_tabs.js`), and tab links to an element now open the closed block that follows it.
- **No autoplay**: `11_js_ui.js` is Megatron-LM's patched copy (waits on step 1; a mode switch resets and pauses). `check_page.mjs` fails if the step-through moves before a click and opens closed blocks to exercise their controls. `90_js_tabs.js` was replaced by the template `99_js_tabs.js` (storage key `zero-tab`).
- **Owned elsewhere, linked with one sentence kept**: the pipeline bubble and activation checkpointing (Distributed training, sections 6 and 10), training-step memory accounting in general (Performance math), the ring all-reduce cost model (Interconnects and scaling), and how FSDP and ZeRO compose with the other axes today (Distributed training, section 4).
- **Closed**: ZeRO-R's P<sub>a</sub> cost derivation and the 100B checkpoint sizes, the reporting slips, the paper-scale counters; in the tables tab, the configuration recount (with the Table 4 misprint and the appendix runs) and the check table with its two "does not reproduce" boxes. FSDP API names went to one dated volatile block.
- **Cut as fat**: a sentence of Why it matters that repeated How it held up (BLOOM, DeepSeek-V3), two pointers to the removed tab, the old reading-time line, nav and tab labels, the animation-manners line (11 units, each with a note in the ledger).
- British spelling (optimiser) in the prose and figure labels; quotations keep "optimizer". Header: "Reading: 21 min, plus 2 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute) | 19.0 min | 20.8 min |
| Reading, closed details | 0 | 2.0 min |
| Step through a training step (tab) | 2.3 min | removed (moved into Reading) |
| The paper's tables, rebuilt | 11.4 min | 4.8 min, plus 6.8 closed |
| Then and now, Further reading | 5.1 min | 5.1 min |
| Visuals drawn in Reading (audit) | 1 | 3 (plus the two in predict reveals) |

Why about 21 minutes is right: the Reading tab now holds what used to take 21.3 minutes across two tabs, plus the core sentence, the hero and the new terms, with the derivations moved out. Everything still open is the paper's argument in its order: the accounting, the three stages, why communication stays flat, ZeRO-R, the trillion arithmetic, the measured results and the evidence. Other tabs fell from 19 to 11.7 minutes because the tables tab's recount and check table, which are provenance, are closed.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
228 units: core 193, depth 19, owned 4, volatile 1, fat 11. 221 were drafted by `ledger.py init`; 7 record the core sentence, the hero, the new terms and four owner links. `label_ledger.py` keys each unit to a run of its own words found on the rebuilt page and labels it depth when that run sits in a closed block. `python3 html_utils/ledger.py check` prints problems 0.

## Checks (24 October 2026)
`checkpage.sh`: tabs 4, fail=0, emdash 0, errbox 1, clipped 0, 177 KB. `check_page.mjs`: 380 actions, 0 problems (including no movement before a click). `__zeroCheck()`: 2Ψ, 2Ψ, 2Ψ, 3Ψ and the at-rest memory matches §5's formulas. `mk_coverage.py`: 53 of 53 (four keys updated for British spelling and moved sentences). `ledger.py check`: problems 0.

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Ownership: this page owns the paper (its accounting, its three stages as the paper states them, its numbers and evidence). Sharded data parallelism as a form is Distributed training's, whose section 4 already has Figure 1's numbers as flat bars (Fig. 5) and the same step played under each stage on a stack of layers in 3D (Fig. 6); its PyTorch API is Distributed PyTorch's (FSDP2). So the one stage here draws what the paper's own Figure 1 says, at its own example size, with §7's volumes beside it, and both the stage and the step-through link to Distributed training's Figs. 5 and 6 instead of redrawing them.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | core sentence, You need, New terms | split | hero, 2D static (DP against ZeRO-3 on 4 GPUs) | no |
| The paper | Problem | full width | none | no |
| The paper | Where did all the memory go | split | predict, then the 16-bytes bar (2D widget) | no |
| The paper | The idea: ZeRO-DP | split | **3D** `stg-f1` (Figure 1), model and N_d under the step list | yes, 5 |
| The paper | Communication (argument) | split | predict, then the volume bars (2D) | no |
| The paper | Communication (one training step) | split | 2D `makeAnim` `stx`, four comparisons; the paper-scale counters stay closed below the lists | yes, 11 per comparison |
| The paper | ZeRO-R, With MP | full width | none | no |
| The paper | Results | split | predict, then the 60B memory bars (2D) | no |
| The paper | Believe?, Why it matters, Connections | full width | none | no |
| The paper's tables, rebuilt | calculator; Table 3 and Figure 6 | split | 2D chart cards on the right | no |
| The paper's tables, rebuilt | Tables 1 and 2, recount, checks | full width | tables | no |
| Then and now | all | full width | tables | no |
| Further reading | | unchanged | | |

**Figure 1 in 3D** (`31_js_sc_f1.js`): four rows in depth, one per stage (baseline DP at the back, ZeRO-3 at the front); along each row four GPU towers (GPU 0, 1, 2 and N_d - 1), each a stack of three slabs to scale: fp16 parameters 2Ψ, fp16 gradients 2Ψ, fp32 optimiser states 12Ψ (bytes, from `zParts()` in `12_js_zero.js`). A purple glass plane is a 32 GB V100, the paper's GPU, with a dashed ring at that height round each tower of the active row. At the end of each row, unit cubes on a white plinth count what one GPU sends per step in Ψ elements (`zComm()`, §7): blue an all-gather of parameters, orange a reduce-scatter of gradients (2, 2, 2, 3). Steps 1 to 4 bring in one stage each: the row appears at the previous stage's heights, the slab it partitions shrinks to its 1/N_d share inside a faint outline of what it held before, flows stream round the ring of drawn GPUs for each collective, and the camera moves onto that row (closer as the towers shrink); step 5 pulls back to all four rows. Defaults are Figure 1's 7.5B on 64 GPUs (120, 31.4, 16.6, 1.88 GB); the model and N_d selectors (the old 2D Figure 1's controls) redraw it and the numbers in the step list follow (`data-f1` spans).

**Kept 2D, and why**: the hero (a two-panel before/after that reads at a glance; the 3D stage just below carries the spatial version), the step-through `stx` (Distributed training's Fig. 6 already plays the same step under each stage in 3D; this one is the paper's own schedule bucket by bucket with exact counters, which reads best as a flat grid of cells, two methods one above the other), the 16-bytes bar, the communication bars and the 60B memory bars (numbers on an axis), the tables tab's calculator and Figure 6 (bars), every table, and Then and now (tables). The trillion-parameter layout (16-way MP in each DGX-2 times 64-way ZeRO-DP) was considered for a second stage and not built: its message is one division (16 TB / 1024 GPUs), and Megatron-LM's Fig. 3 already draws a DGX-2H cluster of model- and data-parallel groups. No photo or figure is embedded: the paper is under arXiv's non-exclusive licence, not CC BY (as before).

**Motion and lists**: `11_js_ui.js` carries Megatron-LM's `makeAnim` with the 2026-11-06 motion rules (plays once half in view, pauses off screen, stops for good on any control or at its last step, never moves under reduced motion, marks its step list, a mode switch resets and replays with that mode's list). The step-through's per-step caption (`#stxStep`, `#stxCap`) is gone; its words are now the four step lists `#sx-stx-dp_3`, `#sx-stx-dp_1`, `#sx-stx-z12`, `#sx-stx-z23` (one shown at a time), and `14_js_step.js` keeps only the step titles (`window.ZSTEP` exposes `commTo`, `memAt`, the modes and titles for the checks). `99_js_tabs.js` is the current template (storage key `zero-tab`) plus a `data-to` link opening a closed block after its target and the old `#t-step` redirect to `#stx-h`. `02_split.html`, `25_js_s3.js` (renderer v2) and `05z_errbox.js.html` are the current templates, unchanged. `build.sh` now finds the repo root by walking up to `html_utils` instead of asking git.

**Checks**: `check_page.mjs` no longer asserts that nothing moves before a click (motion is `check_stages.mjs`'s). `check_stages.mjs` (new, from Megatron-LM's): at 1400 and 920 light and 390 dark, the stage and the step-through play once in view, step to the end, have one list item per step in every comparison, stop drawing off screen, every split is two columns at 1400, no errors, NaN or sideways scroll; under reduced motion nothing moves; and the numbers the step lists state are checked against what is drawn (`window.ZF1`, `window.ZSTEP`) and against §5 and §7 recomputed in the check (Figure 1's four sizes, 2, 2, 2, 3Ψ, the step-through's totals and its resting memory at N_d = 2, 4, 8, every list title, and the controls moving the stated numbers: 7.5B on 4 GPUs gives the hero's 30 GB).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 20.9 min (4,807 words) | 27.7 min (6,362) |
| The paper, closed | 2.0 min (453) | unchanged |
| The paper's tables, rebuilt | 4.8 min, plus 6.8 closed | unchanged |
| Then and now | 3.3 min | unchanged |
| Further reading | 1.8 min | unchanged |

The growth is the step lists. The step-through's 44 captions (11 steps in each of 4 comparisons) were drawn by script and invisible to the audit; they are now static lists, about 300 words each, and only one is shown at a time, so about 900 of the counted words (some 4 minutes) are the three comparisons a reader sees only by switching. Figure 1's five steps add about 330 words that state its numbers. Nothing was cut and the argument keeps its order. A reader who follows one comparison reads about 24 minutes; the header quotes the audit's measure, "Reading: 28 min, plus 2 in closed details." (`reading.json`).

**Ledger**: 228 units (core 193, depth 19, fat 11, owned 4, volatile 1); keys re-pointed on units 46 and 47 (the Figure 1 paragraph now introduces the 3D stage: "figure 1 of the paper, redrawn and live, now in 3d", "each tower one gpu's model states stacked to scale"), 153 (the "Try" line became "Watch: in DDP against ZeRO-3, the parameters") and 155 (the counters sentence moved into the step-through's introduction). `ledger.py check`: problems 0. `mk_coverage.py`: 52 of 53; the one missing item (the Notion Takeaway property's text, "gradients, and parameters" with a comma, against the card's) is from `paper.json`, untouched in this pass.
