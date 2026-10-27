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
