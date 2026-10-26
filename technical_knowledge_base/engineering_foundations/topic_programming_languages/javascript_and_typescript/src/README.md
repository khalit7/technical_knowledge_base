# Source of "JavaScript and TypeScript: the essentials"

The essentials page of JavaScript and TypeScript (prefix `je`, storage key `je-tab`), section 4 "Essentials" of the 2026-10-26 language split plan and Khalid's decision 16. Rebuilt 2026-10-26 after its four children were built from its old parts; no new measurements were run.

## Build
`python3 ja/gen.py && sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated, never edited by hand: `parts/20_read_a.html` to `20_read_e.html` and `20_read_z.html`, from `ja/tpl/`, `ja/code/` and `ja/outputs/` (see `ja/README.md`, which also lists the section anchors other pages can link).
- Hand-written: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html` (title, subtitle with the measured time, tab bar, the Reading tab's CSS and section nav), `39_tab_more.html`.
- Checks: `python3 ja/check_embed.py` (13 embedded outputs equal their files; the bars carry the recorded numbers), `sh html_utils/checkpage.sh <page>`, `python3 html_utils/ledger.py check <page>`.
- `merge_ledger.py`: how `ledger.json` was made from the master ledger (below).

## What was removed
With plain `rm` on 2026-10-26: `src/tb/` (Part 2, now `typescript/src/tb/`) and `src/tl/` (Part 3, now `llm_apps_and_agents/src/tl/`), whole; every old file in `src/parts/` (the part bar, Start here, the three parts' tabs and scripts, the two-level tab script); from `src/ja/`, the examples and outputs the children now hold (`b*` to `j*`, `n*`, `f_mod/`, `loop/`, `q/`, `i4_trace.json`, `j1_sse.json`), the old templates, `check_ui.mjs` and `viz_ideas.md`. Kept in `src/ja/`: `a1`, `k1` to `k6`, `l1`, `l2`, `m1` to `m3`, `x1`, `x2` and their outputs, with a trimmed `run_all.sh`, a new `gen.py` and `check_embed.py`; `coverage.json` trimmed to this page. The worker-threads run stays here because the event-loop child links it.

Nothing inside this language folder reads the removed paths. Outside it, readers of the old `src/tl/` (to be repointed by the lead to `llm_apps_and_agents/src/tl/outputs/`, where the same files are): `engineering_foundations/topic_protocols/src/read/gen_data.py` line 6 (`TL = ... javascript_and_typescript/src/tl/outputs`, read at generation time), the text of `engineering_foundations/topic_protocols/src/parts/20_read_h.html` line 23, that page's ledger key (`src/ledger.json`, the unit quoting `src/tl/outputs/g3_mcp_http.json`) and `src/read/viz_ideas.md`.

## Shape and departures
- Top: the plan's core sentence, a static hero (one `.ts` file erased to `.js`, then the engine on one thread with its call stack, microtask and task queues and the loop, libuv and worker threads beside it), "You need" (everyday Python), new terms. Old Part 1's "In one screen" differences 5 and 6 are now the core sentence, the hero and section 1's first paragraph; differences 1 to 4 are on the language child.
- Section 1 is old section 1, with one new line (`node app.ts` strips, `tsc` checks) pointing at the TypeScript child.
- Section 2 is old section 12. Outputs stay in the core and each script is a closed block beside it; the streaming memory result and the worker heartbeat are now static bars inline, their raw recordings closed.
- Section 3 condenses old sections 13 and 14 into one table (Node with npm, pnpm, Bun, Deno: engine, TypeScript, start-up, `node_modules`, CI reinstall, install scripts, permissions, October 2026 status, when to choose), then the start-up bars, the three-runtime run, the npm and pnpm facts (install recordings closed) and the supply-chain box.
- Section 4 is old section 16: a table maps each trap a child owns to the section that shows it (the language child claimed `this`, `var`, `sort`, doubles, `parseInt`, mutation and the JSON clone; the event-loop child `forEach`, fire-and-forget, blocking and the SSE chunk); prototype pollution, `eval`, ReDoS and `Date` keep their runs here; the old page's corrections are a closed block.
- Section 5: child cards with each child's core idea, measured header minutes and one measured finding (the old Start here's five findings, plus the playground). Old Start here's routes, part cards and tab lists are fat.
- Further reading: the children with times, neighbouring pages, outside sources for this page's subjects only (each child keeps its own list).
- No lab tab and no widget: everything left here is a map, a table or a measured result, so static figures fit; the steppers live on the children that own them.

## Length judgement
Before (2026-10-26, the three-part page, 230 words a minute, `html_utils/audit_pages.mjs`): Start here 3.1 min; Part 1 Reading 61.5 plus 7.6 closed, its two tabs 2.9; Part 2 Reading 62.0 plus 1.9, its three tabs 7.0; Part 3 Reading 51.6 plus 3.9, its two tabs 2.2. After: Reading 17.2 min core (3,947 words), 10.9 in closed details (scripts and raw recordings); Further reading 1.4. The plan estimated 14. Of the core, about 520 words are the child cards, 400 the runtime table, 320 the hero, 200 the trap map and 380 recorded output kept open; the prose alone is about 9 minutes. What remains is what every child assumes (how a file runs, Node's standard library, packages and the runtime choice, the cross-cutting traps) plus the map; a further cut would drop measured results that no child carries.

## Ledger
`ledger.json` is the master ledger drafted from the three-part page before the split (848 units), merged with the four children's `from_master.json` by `merge_ledger.py`, plus 7 new units for this page's new text: 855 units. Owned 697 (TypeScript child 274, LLM apps child 215, language child 125, event-loop child 78, Topic: agentic-harnesses 2, MCP 2, Caching 1), core 87 and depth 5 here, fat 66 (42 labelled fat by the children; 24 here, listed in `merge_ledger.py`: the part bar, Start here cards, routes and pointers, section pointers, a stale tab time). No unit was claimed by two children. `python3 html_utils/ledger.py check` reports problems 0.

## Duplicates
None to remove: no recording, drill or prediction appears on two children. The language child's playground has five async drills (`q07`, `q08`, `q18`, `q19`, `q22`) whose subject the event-loop child teaches with its own, different programs (`i3_order`, `i8_foreach`, the stepper's six); the playground is a tool across the language, so it stays whole there, and the event-loop child now says so accurately.

## Children touched (only for the items in the lead's brief)
- `event_loop_promises_and_streams`: the Further reading line and the section 2 sentence that said the playground "runs programs 1 to 3 of the stepper live" now say it has 22 drills, five on this subject (`ja/tpl/20_read_c.html`, `parts/39_tab_more.html`). Rebuilt; checkpage fail=0, `check_controls.mjs` clean, ledger problems 0.
- `typescript`: it mentioned `"exports"` only as where a package points to its types. Added in section 8 a core paragraph on the `"exports"` map (conditions in object order, unlisted subpaths fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`, precedence over `"main"`; Node docs, checked 2026-10-26) and a closed block with an illustrative dual ESM and CommonJS layout and when TypeScript reads the map (TypeScript modules reference). Two ledger units added (302 units, problems 0); checkpage fail=0, `tb/check_embed.mjs` all identical; its header time is unchanged (27 min plus 49).

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `python3 src/ja/check_embed.py`: 13 outputs embedded, problems 0. Every Notion id linked is in `pages.json`.
