# Source of "Topic: pytorch-ecosystem"

Root of the topic (storage key `pt-tab`). Built 2026-10-12 by a team of tab agents (`read/`, `step/`, `comp/`, `dist/`, `map/`, each with its own README; the running example is `model/`); rebuilt on 2026-10-23 at the topic close, after its six children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the CUDA, inference and training roots.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`. Children import `model/` and read `dist/common.py`, `dist/inputs/ddp_w2.json` and `read/old/`: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 6, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- From the page folder: `python3 src/read/check_data.py` (17 prose numbers), `python3 src/map/validate.py`, `python3 src/dist/check_data.py`, `python3 src/step/check_page.py`, `node src/comp/dumptext.mjs <abs index.html> <out.txt> && python3 src/comp/check_page.py <out.txt>`, `node src/read/check_page.mjs <abs index.html> <shots>`, `node src/dist/check_page.mjs <shots>` (all clean on 2026-10-23).
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the Compile lab fusion switch, the Distributed lab's step animation (it started on scroll) and schedule switch, and the Ecosystem map's player (started on scroll) and door switch no longer start playing.

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

## The topic close (2026-10-23): other pages of the topic
- Tensors: section 4 shrunk to a paragraph and links; its loop, state_dict, GradScaler and seeding units relabelled `owned:` Making training fast (one, loading an untied checkpoint, stays); header now 24 + 29.
- Every child's Further reading: sibling, neighbour and root times set to each header (root 26 + 15; tabs 12 + 4, 19 + 9, 25 + 4, 14 + 1).
- torch.compile: Tensors 2.7/2.8 became 2.5; Making training fast section 8 became 9. Extending: the autograd.Function card points to Tensors 3.4. Tensors: the removed Version-counter lab reference fixed.
