Source of the interactive HTML on the Notion page "Reward Hacking" (deep-dive child of Topic: llm-training-and-post-training). Page prefix `rh`, storage key `rh-tab`. Built 2026-10-03; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/derived.json`, prints every check), then `sh build.sh` (writes `../index.html`). The header's reading time is written by hand from `html_utils/audit_pages.mjs` (230 words a minute). Checks: `sh html_utils/checkpage.sh <page folder>`; from the repo root `node <page folder>/src/check_page.mjs` (every control in both themes, NaN / undefined / errors, link targets, no animation playing); `python3 html_utils/ledger.py check <page folder>`.

Data: `inputs/research_gao.md`, `inputs/research_coding.md`, `inputs/research_chat.md` are the verified source notes (verbatim quotes, URLs, what is unconfirmed). `live.md` is the old Notion page; `coverage.json` maps every fact in it (2026-10-03); `ledger.json` is the knowledge ledger of the 2026-10-23 rebuild.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (core idea, hero, you need, new terms, "where the gap lives" table, sections 1 and 2), `20_read_b` (3 chat models, 4 coding agents), `20_read_c` (5 what the policy can reach, 6 detecting it), `20_read_d` (7 mitigations, 8 it generalises); JS `20_js_data.js` (generated), `21_js_rd_common.js` (skill template, never autoplays), `22_js_bon.js`, `23_js_charts.js`, `24_js_trace.js`, `25_js_cot.js`, `26_js_rd_gao.js` (the old curves tab, now section 2), `27_js_rd_figs.js` (hero, Wen dumbbell, reach diagram) | sections 1 to 8, depth in closed `details.dp` blocks |
| Case gallery `t-cases` | `31_tab_cases.html`, `31_js_cases.js` | 27 documented cases, filterable: a dataset used across the whole page, so it stays a tab |
| Further reading `t-more` | `39_tab_more.html` | |

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence, a schematic hero (proxy keeps rising, gold peaks and falls, where each defence acts), "You need", new terms, and a one-screen table of where the proxy-goal gap lives (proxy kind, what gets gamed, strongest measurement, defence, section).
- **The Over-optimisation curves tab moved inline** into section 2: it explains one mechanism. One control (reward-model size) plus the method switch; the KL marker, beta-source switch and alpha slider were removed. The RL half is kept but labelled "by construction" on the figure and in the stats; its provenance (figure-read coefficients, the 12% beta gap, what does not reproduce) and the every-size table are in a closed block. Judgement in `viz_ideas.md`: the RL curve earns its place as a shape (RL peaks at several times BoN's KL under either beta source), not as numbers.
- **Concrete, then picture, then formula** in section 2: the best-of-n riddle (Table 2), then the fitted curves, then the forms.
- **New visuals**: hero schematic; cleaning-robot table with the flipped row highlighted (section 1); Wen et al. false-positive dumbbell (section 3); nested "what the policy can reach" diagram with a measured case per layer (section 5).
- **Mitigations table now has a "What defeats it" column**, the part of the subject this page owns that the old table left implicit; the extra evidence per row is in a closed block.
- **Coding moves** became a table (move, what it looks like, where seen), merging the old bullet list with Baker et al.'s list.
- **No autoplay**: `21_js_rd_common.js` is the skill template; the three steppers start on step 0 and mode switches no longer play.
- **Depth closed**: length bias in DPO/AlpacaEval/Arena, the GPT-4o incident detail, XSTest and rubric numbers, later Claude cards, sandbox/harness/tampering/spreading/evaluation-awareness detail, checker errors, MOLE and its correction, RH-Detect, the probe's numbers, inoculation variants.
- **Deleted as fat**: the "what lives where" box (the You need line and links carry it), pointers to the removed tab, headings and wind-ups, and the Common mistakes block, whose items restated sections 2, 5, 6, 7 and 8 (two items that added something, the answer extractor and "lists, length, copying", were folded into sections 4 and 7).

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core | 33.5 min (7,711 words) | 25.8 min (5,940 words) |
| Reading, closed details | 1.0 min (235) | 10.0 min (2,290) |
| Over-optimisation curves tab | 3.5 min (814) | moved into Reading |
| Case gallery (a dataset, not a read) | 10.0 min | 10.0 min (unchanged) |
| Core total excluding Further reading and the gallery | 37.1 min | 25.8 min |
| Visuals drawn in Reading (audit count) | 2 | 6 |

Why about 26 minutes is right: the page owns a broad subject (the curve, four chat channels, coding and agent hacks at every layer a policy can reach, five detection methods, nine mitigations each with what defeats it, and the generalisation result), and each core unit is a measured number needed to judge one of them; about a fifth of the core words are captions and counters of the visuals. Per-case detail, provenance and secondary papers are now closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
326 units: core 229, depth 59, fat 38. 318 were drafted by `ledger.py init` from the old page (including the old curves tab); 8 were added by hand for the new top table, hero, reach diagram, Wen figure, script-rendered charts and the case gallery (keys in static captions). No unit is labelled owned: the RL algorithm detail (Dr. GRPO) stays a short correction here with a link to RL for LLMs.

## Departures from the page-kind shape
- The hero is schematic, not data: Gao et al. fit no proxy curve ("unable to obtain a satisfactory fit"), so drawing a measured proxy would invent it; the measured gold curves follow in section 2.
- The KL-leash animation stays on the parent root (linked); this page owns over-optimisation and has the measured curves, so the root could link here instead of drawing its own (reported).
