# Source of "Topic: evaluation-and-llm-judges"

Root of the topic (storage key `eval-tab`). Built 2026-10-04; rebuilt on 2026-10-24 at the topic close to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), after the seven children were rebuilt. Editing only, no new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (unchanged script).
- `sh html_utils/checkpage.sh <this page>`: tabs 3, emdash 0, errbox 1, clipped 0, fail=0.
- From the repository root: `node <this page>/src/read/check_read.mjs [shot dir]` (hero drawn with seven boxes, the statistics chart and the attribution stepper at 390 dark and 920 light, every step and benchmark, no movement before a click, tab links, external link attributes; compares the page's numbers with `read/recompute.json`); `node <this page>/src/judges/check_judges.mjs [shot dir]` (every Judge atlas control; the bias-lab link now points at LLM-as-judge's `#t-bias`); `python3 src/judges/recompute.py` (223 checks).
- `python3 html_utils/ledger.py check <this page>`: problems 0.

## Tabs and parts
| Tab | Parts | Decision on 2026-10-24, and why |
|---|---|---|
| Reading `t-read` | `20_read.html` (styles, nav, core idea, hero, you need, new terms), `20_read_a` (1. five layers with owners; 2. the graders compared), `20_read_b` (3. calibration definitions), `20_read_c` (4. statistics in brief), `20_read_d` (5. how it breaks: attribution stepper and the failure table), `20_read_e` (6. which instrument for which question; 7. child cards), `20_read_z`; JS `21_js_rd_common.js` (skill template, never autoplays), `22_js_rd_hero.js` (hero), `23_js_rd_attr.js` (attribution stepper), `25_js_rd_stat.js` (interval chart) | Rewritten as a map (below). |
| Judge atlas `t-judges` | `33_*`, data from `judges/mk_judges.py` | **Kept.** A map tab of 26 judges and tests of judges with 172 dated readings, used by four children. The Guard models row now says Guardrails is a child of Topic: agentic-harnesses; the bias-lab source points at LLM-as-judge's tab. |
| Judge bias lab `t-bias` | moved to `../llm_as_judge/src/parts/32_*` with `bias/` | **Moved** to LLM-as-judge, which owns judge biases and their measured sizes. Moved intact (one Arena-Hard pair through five judges, the AlpacaEval padding pair, rates per study, mitigations); its autoplay on scroll was removed. |
| Same model, many harnesses `t-harness` | deleted (`32_*`, `harness/`) | **Retired.** Eval harnesses carries every unit in Reading sections 2 and 3 (`#rd-why`; ledger keys "41.5% to 8.0%", "lm-eval-harness as of January 2023 (48.8)", "1.21 to 59.82"). Nothing else read `src/harness/`; its `viz_ideas.md` moved to that page's `src/spread/`. |
| Further reading `t-more` | `39_tab_more.html` | Kept; children in reading order with header times, moved tabs named, Guardrails under neighbouring topics. |

Also retired from Reading: the grading-mode animation (`22_js_rd_modes.js`; Table 2 per-judge splits and the pointwise 60% against 66% now sit in a closed block on LLM-as-judge, section "The bias catalogue"), the agreement chart and kappa widget (`24_js_rd_cal.js`; LLM-as-judge owns the worked kappa on "2,220 of 3,355" votes), the harness situation table and 2026 status notes (Eval harnesses section 7), the RocketEval numbers (LLM-as-judge, list against instance) and MOLE's numbers (Agent and trajectory evaluation). `99_js_tabs.js` is the skill template (it used the benchmarks page's storage key before).

## What changed in the Reading tab
- **Top**: the core idea in one sentence (model, grader and gold labels read together; attribute and size a change before acting), a static hero of one reading as seven parts with the owning child under each and the three fallible parts in the highlight colour, You need, eleven new terms.
- **One comparison per section**: the five layers each with its owning page; the graders compared in one table (what each sees, cost, blind spot, what it is checked against, page) plus the one cross-child distinction (scoring method is part of the instrument, LLaMA-65B 0.636 / 0.637 / 0.488); calibration as three definitions (human ceiling, kappa, reliable is not valid) and the TPR/FPR correction; statistics in brief with its chart, linking Eval statistics sections 4 and 7; failures as one table (what you see, first check, owning page) under the attribution stepper; a question-to-instrument table and the five-question checklist; child cards with each header's time.
- Corrections to the old page are closed blocks.

## Length judgement
| | Before (2026-10-24, before the close) | After |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 21 min (4,851 words) | 15 min (3,482) |
| Reading, closed details | 0 | 1 (142) |
| Judge bias lab | 7 + 2 | moved to LLM-as-judge |
| Same model, many harnesses | 9 | retired (Eval harnesses) |
| Judge atlas | 13 + 1 | 13 + 1 |
| Further reading | 7 | 5 |
| Visuals in Reading | 4 (two animations owned by LLM-as-judge, a widget, a chart) plus the attribution stepper | 2 drawn (hero, interval chart) plus the attribution stepper |

Why about 15 minutes is right: the root now only maps (hero, layers, cards), compares (graders, failures, questions to instruments) and defines what the comparisons need (kappa, the human ceiling, standard error and MDE). Every mechanism is one sentence and a link to its owner. The attribution stepper stays because it shows the core idea across three children (judge, human labels, statistics) on real data that no child draws.

## Knowledge ledger (`ledger.json`)
313 units: core 195, owned 79 (LLM-as-judge 49, Eval harnesses 23, Human evaluation and annotation 3, Agent and trajectory evaluation 2, the physics re-grading paper page 2), fat 39, problems 0. 302 drafted by `ledger.py init` from the page before the close; 11 added by hand for script-rendered text of the retired and moved widgets. Fat units carry a `note` (navigation, stale child times, headings, widget instructions, the framing of moved tabs); no substantive unit is fat.

## Old sources kept
`live.md` (the Notion page fetched 2026-10-04) and `coverage.md` (its facts mapped to the 2026-10-04 build; section names there are the old ones). `read/` keeps the reading checks and `recompute.py`.
