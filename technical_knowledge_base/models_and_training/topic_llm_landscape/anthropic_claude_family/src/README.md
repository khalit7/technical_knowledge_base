# Source of "Anthropic: Claude family"

Child page of Topic: llm-landscape (page prefix `ac`, storage key `ac-tab`). Built 2026-10-01; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs); 2026-11-10 split layout and two 3D stages (the section at the end; it supersedes the build notes below where they differ).

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

## 2026-11-10: split layout, two 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `ac-tab`). `build.sh` keeps its explicit part lists (new: `02_split.html`, `25_js_s3.js`, `41_js_sc_ap.js`, `42_js_sc_ss.js`) and writes its em-dash test as bytes.
- **Fig. 5 `stg-ap`** (6 steps, `41_js_sc_ap.js`), preserved thinking and append-only: one agent conversation before request 4 as stacked plates (width proportional to tokens, the simulator's illustrative sizes), thinking blocks purple, the cached prefix as green glass, green dots for tokens read from the cache and gold for tokens written; steps: the history, append, edit the system prompt in place (400; the drop_block cost), the same instruction appended, trim an old tool result, switch Fable 5.1 to Opus 5.5. The simulator's rules moved into `window.AP` (`12_js_sim.js`: blocks, actions, `evalA`), so the stage and the simulator widget (kept beside the consequences, a reader-driven tool) draw the same numbers.
- **Fig. 6 `stg-ss`** (6 steps, `42_js_sc_ss.js`), what one agent session costs: one column per turn of the growing session (cache read green, cache write gold, output purple), in tokens for turns 1, 2 and 3 to 16 (one stretch) and Haiku 4.5's 200K window as a glass plane, then in dollars on the model chosen in its select, then the no-cache session as a back row. `window.SS` holds the accounting (the old animation's `turn()`); the step list's dollar figures are spans the select refills. It replaces the 2D square-grid animation `#sa` (16 frames, its own controller, per-turn caption carousel); the captions became the step list.
- **2D kept, each in a split** (text left, figure right): hero (Fig. 1), lineage (Fig. 2), recipe (Fig. 3, now stacked in the right column, since five boxes in a row clipped at about 650 px), thinking before/after (Fig. 4), request checker (beside the per-model thinking and sampling paragraphs), worked table with split bars, simulator, price ladder. Full width: the lineup table (volatile, read 19 October 2026, unchanged), Details, and the Session cost, Effort and cost per task and Task length tabs (reader-driven tools), Further reading.
- Checks: `check_stages.mjs` (new; from the repo root with a shots dir outside the repo): both stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; splits two columns at 1400 px and one below 1100; every number in both step lists recomputed from `window.AP`, `window.SS` and `PRICES`, including after switching Fig. 6 to Haiku 4.5. `check_controls.mjs`: its never-autoplay assertion inverted (the stages must play in view); it steps both stages to the end.
- `recompute.py`: Sonnet 5.5's cache read set to $0.10 (cut on 7 October 2026, as the page's price list already had; it still said $0.20) and a Fig. 6 section reproducing every number the step list quotes.
- Ledger keys: the 15 external reading times re-keyed on the resource titles, never the minutes; 188, 190 and 278 re-keyed to Fig. 6; one unit added for Fig. 5.
- No real image: still no physical object to show.

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 4,135 words, 18.0 min | 4,848 words, 21.1 min |
| Reading, closed details | 2,890 words, 12.6 min | unchanged |
| Session cost / Effort and cost / Task length / Further reading | 1.6 / 1.4 / 1.2 / 2.9 min | unchanged |
| Visuals inline in Reading (audit count) | 5 | 6 |

The added 713 words are the two step lists (12 items): the old animation's per-turn captions were drawn by script, so the audit never counted them, and the simulator's per-action notes are likewise script text. Nothing was cut; one paragraph opening was trimmed where Fig. 6's list now carries it.

### Knowledge ledger (2026-11-10; problems 0)
287 units: core 178, depth 28, volatile 61, owned 6, fat 14.
