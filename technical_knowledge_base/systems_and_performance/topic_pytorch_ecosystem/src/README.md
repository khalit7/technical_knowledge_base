# Source of "Topic: pytorch-ecosystem"

Root of the topic (storage key `pt-tab`). Built 2026-10-12 by a team of tab agents (`read/`, `step/`, `comp/`, `dist/`, `map/`, each with its own README; the running example is `model/`); rebuilt on 2026-10-23 at the topic close, after its six children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the CUDA, inference and training roots.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`. Children import `model/` and read `dist/common.py`, `dist/inputs/ddp_w2.json` and `read/old/`: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 6, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- From the page folder: `python3 src/read/check_data.py` (17 prose numbers), `python3 src/map/validate.py`, `python3 src/dist/check_data.py`, `python3 src/step/check_page.py`, `node src/comp/dumptext.mjs <abs index.html> <out.txt> && python3 src/comp/check_page.py <out.txt>`, `node src/read/check_page.mjs <abs index.html> <shots>`, `node src/dist/check_page.mjs <shots>` (all clean on 2026-10-23).
- `node src/check_stages.mjs [shots dir]` (from the repo root; since 2026-11-12): the hero stage and the three explained animations play once scrolled into view, reach their last step with one list item per step, and never move under reduced motion; the long replays never play by themselves and open on their frame; splits are two columns at 1400 px.
- Motion (2026-11-12, replacing the 2026-10-23 never-autoplay rule): `parts/21_js_rd_common.js`, `99_js_tabs.js` (key `pt-tab`), `05z_errbox.js.html` and `02_split.html` are the skill templates, `27_js_s3.js` is the template's `25_js_s3.js` (renderer v2, renumbered to load after this page's own `25_js_rd_s568.js`).

## Tabs
| Tab | Decision on 2026-10-23, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). Section numbers 1 to 10 kept, because children and outside pages cite them. |
| Inside one step `t-step` | **Kept**: one recorded step spans Tensors, Making training fast and the root's comparison. Sections 1, 2 and 4 no longer redraw what Tensors owns: the views explorer, the definitions and the dispatch-table widget are gone (links to Tensors sections 1, 2.2, 2.3, 3.1, 3.2), the step-specific findings stay, and section 4's per-node table is closed. Section numbers kept. |
| Compile lab `t-comp` | **Kept unchanged** apart from a fixed reference (the compiler stack has no section 9) and the Model formats link (merged page, now Local and on-device inference, section 3). Its units are mostly not on torch.compile from the user's side (that page measured its own runs), and children and outside pages cite its sections. |
| Distributed lab `t-dist` | **Kept**; the DDP bucket strip and timeline in section 3 became a link to Distributed PyTorch section 3, which steps the same recording; the paragraph of facts the strip showed stays. Model formats link repointed. |
| Ecosystem map `t-map` | **Kept**: the dated atlas a root owns. Model formats wording repointed in `map/atlas_a.py`, `atlas_b.py` and the chooser. |
| Further reading `t-more` | Child cards with current titles and each header's time; this page's tabs with measured times; neighbour times set to their headers, dropped where the header states none. |

Retired part: `retired/parts/24_js_rd_s23.js` (the dispatcher walk, the two-layer autograd graph and the checkpoint bars of the old Reading, now owned by Tensors, the dispatcher and autograd).

## What changed in the Reading tab
- **Top**: the core idea in one sentence; a hero that is a static annotated map of one training step from the libraries and your loop down through eager or compiled execution, the dispatcher (highlighted), the autograd graph and the storage, with processes and measuring at the side, each box naming its owner; "You need"; eight new terms; and the comparison only the root can make: one step of the running example, the cost of each layer, the lever measured, and the owning page.
- **Sections 1 to 9** became definitions plus the one cross-layer fact and a Go deeper link: the strides widget, the dispatcher walk, the autograd graph, the custom-op before/after and the hook table went to their owners; the eager/compiled stack stepper moved from the top to section 5; the bottleneck stepper, the symptom table (now with an owner column), the DDP/FSDP2 rank stepper, the memory bars and the placement table stay, because each spans several children.
- **Section 4** is now the loop written once plus who owns each line; Making training fast owns the loop (section 7).
- **Closed blocks** per section keep the root's own measurements that no child carries (compile cost and export numbers, AMP and bf16 timings, attention and torchao figures, DTensor, TP, PP, DCP and hang records, the full hook table). Mistakes and interview rehearsal are closed.
- **Section 9** table shortened to one line per library; the catches found by running them are on Libraries sections 4 to 9. NVIDIA's agreement to acquire Hugging Face (volatile) stays here, as the libraries child expects.
- **Section 10** child cards: current titles, one line each, reading time exactly as each header states.

## Length judgement
| Tab | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading (230 words a minute, `html_utils/audit_pages.mjs`) | 43.1 + 3.2 | 26.4 + 15.4 |
| Inside one step | 15.9 + 3.7 | 12.1 + 4.4 |
| Compile lab | 18.8 + 9.1 | 18.8 + 9.1 |
| Distributed lab | 25.1 + 3.7 | 24.8 + 3.7 |
| Ecosystem map | 14.2 + 1.1 | 14.2 + 1.1 |

Why about 26 minutes: the topic is taught from zero, so the root holds the definitions every child assumes (tensor and storage, dispatch key, autograd graph, guard and break, rank, collective, placement), the hero map, the one comparison across all layers on one model (about 400 words of table), the symptom-to-owner table, the placement table, the loop written once, and the dated ecosystem status a root owns. Each section ends in a link instead of a mechanism. Closed time grew because the root's own measurements that no child carries moved into closed blocks rather than being cut. The audit counts no SVG in the Reading: its figures are HTML diagrams and steppers (hero map, stack stepper, phase bars, rank stepper, memory bars).

## Knowledge ledger (`ledger.json`)
880 units drafted by `ledger.py init` from the page before the rebuild: core 572, depth 248, owned 20 (Tensors, the dispatcher and autograd 15, Making training fast 2, Extending PyTorch 2, Libraries 1), fat 40; problems 0. Keys were found by script (the longest phrase of each unit on the rebuilt root, then on a child), core or depth by whether the key sits in a closed block, and the residue labelled by hand. Fat units carry a `note`: wind-ups, headings, predict prompts whose answers are kept, captions of retired or moved widgets, old child-card overlap lines.

## 2026-11-12: split layout, a 3D map (renderer v2), explained and autoplaying animations (layout rollout)
Method: `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md` with `layout-rollout.md`, after the six children were rebuilt in the same rollout (none of them edited here). `build.sh` includes `02_split.html` after `01_head.html` and writes the em-dash detector's character as bytes.

**Reading tab.**
- *0 The map* (`#rd-s0`): split with the new stage `stg-hero` (`parts/28_js_sc_hero.js`), replacing the HTML hero map. Nine steps along the path a call takes: the whole step; your loop and the libraries around it; the dispatcher's keys (923 calls a step); the autograd graph behind them (187 nodes, 34.76 MB saved); a tensor's header over its storage; torch.compile's gate and fused launches (142 calls to 35); a custom operator slotting in (3 graphs and 2 breaks as Python, 1 and 0 as a custom op); the ranks (DDP's 2 all-reduces, FSDP2's 14 collectives, 548 to 249 MB); the profiler's phases (22.51 ms, the fused optimizer 5.64 to 2.08 ms). Driven by `RDD` (`22_js_rd_data.js`: call counts, phase and optimizer times, collectives, memory per rank, the custom-op graph counts); counts only the prose carries are in the step list; drawn counts are labelled illustrative. The step list `sx-hero` carries the old hero's rows (what each layer does, its owner) and links each child's own figures (`n:<id>#stg-...`) instead of re-teaching them. The running example, "You need", the terms and the comparison table moved to a full-width section `#rd-need`.
- *5 torch.compile*: split, the stack stepper right (Fig. 2), its six eager and six compiled steps left as `sx-stk-eager` and `sx-stk-comp` (the mode switch swaps them); the caption is gone. *6 Performance*: split, the bottleneck stepper right (Fig. 3), its four steps left as `sx-prf`; the symptom table stays full width. Both play on view.
- *7 Distributed*: the DDP against FSDP2 rank stepper is retired: Distributed PyTorch's Figs. 1 to 3 step the same recorded collectives in 3D. Its caption's facts (bucket sizes, 14 collectives, the losses) are now a sentence that links those figures; the memory bars stay as Fig. 4 in a split.
- *1, 2, 3, 8, 9*: full width (definitions, tables); Go deeper lines now link the children's figures (Tensors Figs. 2 to 4, torch.compile Figs. 1 to 3, Making training fast Figs. 2 and 3, Extending Figs. 1 to 3, Libraries Figs. 1 and 2). Section anchors unchanged.
- *10 Child pages*: each card reads "Child page, about N min, plus M in closed details." from each header on 2026-11-12 (Tensors 27 + 29, torch.compile 37 + 14, Making training fast 38 + 20, Distributed 36 + 20, Extending 35 + 13, Libraries 29 + 12); the Further reading list matches.

**Labs.** Every section with a visual is a split (notes left, card right and sticky from 1100 px); code, tables, mistakes and checks stay full width.
- Inside one step: sections 3, 5, 6 (the 923-call replay, checkpointing, gradients off) and 7 (phase bars and the profile table). The three replays are widgets the reader drives (rollout rule 3b: no autoplay, no step list, live caption kept): the call replay opens on the first call, the other two on their finished frame.
- Compile lab: sections 1 (the pipeline), 2 (fusion), 3 (guard bars), 4 (graph breaks), 6 (AOTAutograd bars), 7 (Inductor's kernels), 8 (speed, phases, break-even). Fusion is an explained animation: its step list `sx-cmp-fu` is written by script from the same captions for the function and mode chosen; the fused sweep went from 8 frames to 2 (start, halfway, done) so each step has something to say.
- Distributed lab: sections 2, 5, 6, 7, 8, 9, 10, 11. The collectives card ("Run it"), the step timeline (now opening on the finished step) and the pipeline schedule (16 actions, opening on the finished schedule) are widgets. Sections 4, 7 and 10 link Distributed PyTorch Figs. 3, 4 and 5.
- Ecosystem map: "Same step, five doors", "What calls what" (the call picture and matrix right) and "Releases 2.0 to 2.14" (the timeline right; "What replaced what" full width below) are splits; the call-stack replay is a widget that now opens on the whole stack. The atlas (a card grid with filters) and the chooser (a form) stay full width.

**Kept 2D, and why**: the stack and bottleneck steppers (lanes and bars, a number on an axis), the memory, phase, guard and speed bars, the fusion byte bars, the call replay and its memory curve, the timelines and schedules, the placement grid. The only stage is the hero: every spatial mechanism (the dispatcher walk, the autograd graph, guards and breaks, FSDP2 on 4 ranks, the profiler trace) already has its stage on the child that owns it, which the hero and the Go deeper lines link.

**Length.** Reading 26.4 core + 15.4 closed before, 30.7 + 15.4 after (230 words a minute, `html_utils/audit_pages.mjs`): the 4.3 minutes added are the hero's step list (the map with the owner's figures per layer) and the stack and bottleneck step lists, which were script-drawn captions before and so not counted. Compile lab 18.8 to 19.9 (the fusion list); the other tabs unchanged. Header: 31 min, plus 15. Still a map: no section re-teaches a child.

**Ledger**: 884 units, core 576, depth 248, owned 20, fat 40; problems 0. Re-keyed 16, 17, 32 and 195 (the old hero and the retired rank stepper, now the hero's list and section 7's sentence), 390, 521, 531, 602, 656, 662, 697, 714, 781, 815 (headings and card controls now sit apart from the sentence after them); added 881 (the hero), 882 (child cards, key "Child page, about"), 883 (the bottleneck list), 884 (the stack list).

**Checks (2026-11-12)**: `sh html_utils/checkpage.sh`: tabs 6, emdash 0, errbox 1, clipped 0, fail=0; `node src/check_stages.mjs`: problems 0; every page check listed under "Build and check" clean.

## The topic close (2026-10-23): other pages of the topic
- Tensors: section 4 shrunk to a paragraph and links; its loop, state_dict, GradScaler and seeding units relabelled `owned:` Making training fast (one, loading an untied checkpoint, stays); header now 24 + 29.
- Every child's Further reading: sibling, neighbour and root times set to each header (root 26 + 15; tabs 12 + 4, 19 + 9, 25 + 4, 14 + 1).
- torch.compile: Tensors 2.7/2.8 became 2.5; Making training fast section 8 became 9. Extending: the autograd.Function card points to Tensors 3.4. Tensors: the removed Version-counter lab reference fixed.
