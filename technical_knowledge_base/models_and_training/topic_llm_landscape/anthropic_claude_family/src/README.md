# Source of "Anthropic: Claude family"

Child page of Topic: llm-landscape (page prefix `ac`, storage key `ac-tab`). Built 2026-10-01; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs).

## Build and checks
- `sh build.sh` writes `../index.html` from `parts/`: `00_top`, `01_css`, `02_header` (title, measured reading time, tab bar, Reading nav), `03_read_a` (the idea in one screen, how the design got here), `04_read_b` (training, thinking, preserved thinking), `05_read_c` (session cost, lineup today), `05d_read_deep` (closed details), `06_tabs` (Session cost, Effort and cost per task, Task length), `07_more`. Scripts: `10_js_common`, `21_js_rd_common` (skill template, never autoplays), `11_js_read` (price list, ladder, benchmark grid, request checker, worked example), `11b_js_figs` (hero, training recipe, thinking before and after), `12_js_sim` (append-only simulator, session animation), `13_js_line` (lineage, now in Reading), `14_js_cost`, `15a_aa_data` + `15_js_aa`, `16a_metr_data` + `16_js_metr`, `99_js_tabs` (skill template).
- Links `{{text|url}}` with aliases in `build.sh` or `n:<notion id>`. The header's reading time comes from `rt.json`: after editing text, run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it (230 words a minute, core and closed details apart).
- `recompute.py` recomputes every default the page reproduces (worked example, growing context, AA split, METR fits: 128.744 days, independently).
- `check_controls.mjs` (run from the repo root: `node <page>/src/check_controls.mjs <page>/index.html`) exercises every select, range, checkbox, button, lineage dot and grid cell in 390 px dark and 920 px light, plays the session animation, and fails if anything animates before a click.
- `inputs/`: raw sources (docs as markdown, Anthropic posts, the CAI paper text, METR's YAML). `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence, a static hero (what Anthropic chose and publishes: training stages, four price rungs, the caller's four dials), "You need" and six new terms.
- **Lineage moved from a tab into Reading** ("How the design got here"): the order explains today's API (budget to adaptive thinking, the tier ladder, safeguards as configuration). The chart now shows one card on click instead of 31 cards in a column. The per-release chronicle of 2026 (benchmark numbers, prices, CVP tiers) is a closed "Release notes" block, with Anthropic's three release tables (benchmark grid) inside it.
- **Training**: the CAI stepper was removed because the Constitutional AI paper page owns the mechanism and animates both pipelines with the paper's numbers; it is replaced by a static recipe diagram that shows what this page owns, which stages are published and which are only named. The January 2026 constitution was added (source from the alignment page).
- **Thinking**: a new before/after figure (budget against adaptive with effort, the same request); per-model details (per-message effort, progress updates, `reasoning_extraction`, `between_tools`) moved to a closed block.
- **Preserved thinking**: simulator kept inline; consequences condensed.
- **Session cost**: formula, worked table, split bars and the animation kept inline; the animation no longer autoplays (it started on scroll and on a mode switch) and steps one turn at a time under reduced motion.
- **Lineup**: one compact dated table (volatile, read 19 October 2026) with a "use it for" column replacing the "Which model when" list; older models, lifecycle and tokenizer in a closed block.
- **Rankings**: cross-lab indexes are owned by the landscape root and linked; Claude-specific readings (Real-SWE, Vals AI on Haiku 5.5, Opus 5.5 medium against Astra, Epoch's Fable 5.1 165, index versioning) are in a closed block. Business shape and common mistakes are closed blocks.
- **Tabs**: Lineage removed (moved inline). Session cost, Effort and cost per task and Task length stay: each is a tool across every model or run, not the explanation of one mechanism.
- No real image: the subject has no physical object, and the one canonical figure (CAI's pipeline) belongs to the paper page.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core | 31.4 min | 17.1 min |
| Reading, closed details | 1.0 min | 12.3 min |
| Other tabs (incl. Further reading) | 11 min (Lineage 4.4, Session cost 1.4, AA 1.4, Task length 1.2, Further reading 2.4) | 6.7 min (Session cost 1.4, AA 1.4, Task length 1.2, Further reading 2.8) |
| Visuals inline in Reading | 2 | 5 (hero, lineage, recipe, thinking before/after, session animation) plus the checker and simulator as interactive tables |

Why 17 minutes is right: the core now carries only the design story (why the models are the way they are: CAI, the tier ladder, post-training over size, the move from caller budget to adaptive effort, safeguards as configuration, preserved thinking and append-only, what caching does to an agent's bill) with one figure per idea. What made the old page 31 minutes was a dated chronicle of 2026 releases with every benchmark number, a cross-lab ranking section, business figures and per-model API details: all kept, dated, in closed blocks, or linked to the root that owns the comparison.

## Knowledge ledger
282 units: core 177, depth 28, volatile 58, owned 5, fat 14 (`ledger.py check`: problems 0). 269 drafted by `ledger.py init`; 13 added by hand: three CAI numbers now owned by the paper page (`whats_new/papers/constitutional_ai`: 182,831, 135,296, 4 revisions) and one unit per script-rendered visual keyed to its static caption. Owned by the root (`models_and_training/topic_llm_landscape`): the AA v4.3 leaderboard (57.6) and Vals AI's Terminal-Bench (65.15). Volatile units stay on this page in dated closed blocks (this is the provider page that holds them).

## 2026-10-26 ownership sweep
Prompt-caching economics across providers belong to Caching (section 11). This page keeps Claude's own prices; the break-even sentence became a link (ledger 94 owned by Caching), and the Session cost tab names the owners (Caching, Batching KV cache and scheduling, ML system design).
