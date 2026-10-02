# ZeRO: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card, then Problem, Where did all the memory go (16 bytes predict and bar), ZeRO-DP (stage table, Figure 1 live), Communication (1.5× predict), ZeRO-R, With MP and the trillion, Results (super-linear predict with recomputed memory), How much of this to believe (the evidence judged, ending in a verdict that the card's "How far to trust it" line links to), Why it matters, Connections. |
| Step through a training step | `t-step` | The live ingredient: one 8-layer step animated for two methods at once, to scale, with memory and communication counters; the same counters at the paper's scale. |
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

HTML: `00_top`, `01_css` (reference CSS plus a few ZeRO additions), `02_header`, `03_paper`, `04_step`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_zero` (the memory and communication model shared by all tabs), `13_js_read`, `14_js_step` (the schedule simulation and animation; `window.__zeroCheck()` returns its totals), `15_js_tables`, `90_js_tabs`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 165 KB. `node .../src/check_page.mjs`: 0 problems (rerun after the evidence section, 171 KB). `__zeroCheck()`: the schedule moves 2Ψ, 2Ψ, 2Ψ, 3Ψ and its at-rest memory equals §5's formulas at N_d = 2, 4, 8. `mk_coverage.py`: 53 of 53 items verified.
