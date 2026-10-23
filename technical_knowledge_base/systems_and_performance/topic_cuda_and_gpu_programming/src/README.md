# Source of "Topic: cuda-and-gpu-programming"

Root of the topic (storage key `cuda-tab`). Built 2026-10-05 by a team of tab agents (`read/`, `sim/`, `compile/`, `lab/` each have their own README); rebuilt on 2026-10-23 at the topic close, after its eight children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the inference and training roots.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`. Children read `sim/out/data.json`, `lab/out/data.json`, `compile/` (the `kb-gpu-lab:1` image) and `read/old/`: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- From `src/`: `python3 -I read/check/check_embed.py` (41 tagged prose numbers), `python3 -I sim/code/check_embed.py`, `python3 -I compile/check_embed.py`, `node sim/code/check_js.mjs` (from `sim/`), `node lab/check/check_js.mjs`. From the repo root: `node <src>/read/check/check_read.mjs <shots>`, `node <src>/sim/code/check_ui.mjs`, `node <src>/lab/check/check_page.mjs <shots>` (all clean on 2026-10-23).
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and the controllers of the three tabs (`31_js_sim_2ui.js`, `32_js_cmp_1core.js`, `33_js_lab_1core.js`) no longer start on scroll, and mode switches reset to step 0.

## Tabs
| Tab | Decision on 2026-10-23, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). |
| GPU simulator `t-sim` | **Kept with three sections**: divergence, occupancy (validated against `cuda_occupancy.h`) and latency hiding, renumbered 1 to 3. They are the SM's execution model that the programming model, memory hierarchy, writing kernels and profiling pages all lean on, and outside pages (GPU architecture, memory technology) link to them. **Retired**: coalescing and the 32 x 32 transpose, shared-memory banks, and tiling with its tile-size chart, which duplicated GPU memory hierarchy sections 1, 3 and 4 (that page owns them with its own widgets and the same M1 numbers). Their parts are in `retired/parts/` (`31_tab_sim_*.html` as they were, `31_js_sim_4coal.js`, `31_js_sim_5bank.js`, `31_js_sim_8tile.js`); their data stays in `sim/out/data.json`, which memory hierarchy reads. |
| Compiler explorer `t-compile` | **Kept unchanged** (one sentence updated): real PTX and SASS for eleven CUDA and three Triton kernels on four targets, cited by six children and two outside pages. |
| Kernel lab `t-lab` | **Kept without its sections 1 and 2.** The softmax and matmul ladders are now taught by Writing kernels (hero and sections 1 and 4), which quotes these runs; a box in their place says so. What stays spans several children on the running example: softmax fused into the matmul, attention naive against online, what changes on an H100, the Triton side, the method. Sections renumbered 1 to 5. Retired parts: `retired/parts/33_tab_lab.html`, `33_js_lab_2soft.js`, `33_js_lab_3mm.js`; setup moved to `33_js_lab_2setup.js`. |
| Further reading `t-more` | Child cards with current titles and each header's time; the tab cards describe the trimmed tabs; section references renumbered; neighbour times set to their headers (or dropped where the target states none). |

## What changed in the Reading tab
- **Top**: the core idea in one sentence (a kernel runs on tens of thousands of threads in warps of 32 and is limited by the bytes it moves, so GPU programming is keeping every thread busy while moving fewer bytes per useful operation); a hero that is a static annotated map of one PyTorch call down the stack (code, the four sources of a kernel, the compiler, the launch, the GPU's SMs, memory ladder, tensor cores and several GPUs, then checking), each box naming the child and section that owns it; "You need" (Performance math, GPU architecture); ten new terms; the evidence labels and toolkit versions in a closed block.
- **Kept as the root's own**: section 1, one call from PyTorch to the GPU (dispatch, kernel choice, the asynchronous launch, the eager against compiled timeline, the measured softmax and its disturbed run, the three regimes); section 3's thread-warp-block-grid ladder, SIMT, divergence and occupancy as definitions; section 5, the running example unfused and fused (the bytes slider, the measured MLX and Kernel lab results, why the win grows with the ridge point); section 9, the CUDA, HIP, Metal and Triton vocabulary.
- **New comparisons**: section 2, every lever (13 rows) against the limit it attacks, what it buys with its evidence, what it costs, and its owner section; section 6, five ways to get a kernel (torch.compile, a library, Triton, Gluon and CuTe DSL, CUDA C++ and CUTLASS) with the CUDA and Triton softmax side by side; section 7, tensor cores by generation in a three-row table plus the sm_120 trap; section 8, Nsight Systems against Nsight Compute.
- **Moved to the owners (orienting sentence and link left)**: the grid slider and the divergence animation (programming model; the GPU simulator keeps divergence), the memory table, coalescing figure, bank paragraph and tiling animation (memory hierarchy), the softmax passes table, the Boehm bars, the M1 ladders and the correction (writing kernels), the library table, cuBLAS inventory, tile shapes and TMEM (libraries and tensor cores), the vadd PTX and SASS listing (Compiler explorer), torch.compile's chain and numbers (compiler stack), the benchmarking rules (profiling), FlashAttention's lineage (writing kernels) and proof (paper page).
- **Volatile, moved to tech news** (where the keys already are): ROCm 10, Hyperloom and AMD Skills (2026-09-14), CUDA in Rust (2026-09-21), Cohere's megakernel (2026-09-14); a dated closed block in section 9 points there.
- **Into closed blocks**: evidence labels, corrections to the old page (ncu clocks and cache control, do_bench), the dated news, interview rehearsal.

## Length judgement
| Tab | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading (230 words a minute, `html_utils/audit_pages.mjs`) | 46.4 + 1.8 | 25.2 + 3.6 |
| GPU simulator | 26.8 + 2.4 | 13.6 + 1.7 |
| Compiler explorer | 19.2 + 3.1 | 19.3 + 3.1 |
| Kernel lab | 19.4 + 5.4 | 14.3 + 4.9 |
| Further reading | 4.4 | 4.4 |
| Visuals in Reading | 6 animations and figures, 4 bar charts | hero map, journey before/after, fusion bytes slider, the lever and comparison tables |

Why about 25 minutes: the root now holds only the map, the definitions every child assumes (kernel, launch, stream, warp, SIMT, occupancy, the memory ladder, fusion, PTX and SASS), four comparisons no child can make (every lever with its owner, five ways to get a kernel, tensor cores by generation, the four vocabularies), the running example end to end, and orientation paragraphs that each end in a link. About a fifth of the core words are the two comparison tables and the code side by side. Shorter would drop a definition the tables rely on or the running example the labs measure.

## Knowledge ledger (`ledger.json`)
710 units drafted by `ledger.py init` from the page as built before the rebuild: core 426, depth 94, owned 132 (memory hierarchy 68, writing kernels 29, profiling 13, Triton 6, libraries 6, compiler stack 4, streams 2, programming model 2, FlashAttention paper page 1, Numerical computing 1), volatile 2, fat 56; problems 0. Keys were found by script (the longest phrase of each unit on the rebuilt root, then on a child or tech news) and the residue labelled by hand. Fat units carry a `note`: headings, wind-ups, predict questions whose answers are kept, controls and reading guides of retired widgets, the old child list with stale titles and times, stale tab lists.

## The topic close (2026-10-23): other pages of the topic
- Every child's Further reading: the root's and siblings' times set to each header (`25 min, plus 4` for the root), and the root's description rewritten for its new tabs.
- Programming model: divergence now points to the root's GPU simulator, section 1 (was "the parent's section 2 animates it").
- Memory hierarchy: the M1 stride, bank and tiling numbers now say they were recorded by the root's simulator scripts; the naive-matmul example points to Writing kernels; the tiling animation's note points to the root's section 4; a closed "Any stride, in one rule" block absorbs the gcd(s, 32) bank rule and the M1 transpose result from the retired simulator section.
- Writing kernels: the Numerics lab tab became "the closed workbench in its section 5" of Profiling; the Rust pointer goes to the 2026-09-21 tech news; the closed sanitizer and tolerance block links its owner, Profiling section 5. Its citation of memory hierarchy is right: the 16 KB staging tile is Writing kernels section 5.
- Triton and Gluon: the Numerics lab pointer now names Profiling section 5.
- Libraries and tensor cores: the M1 matmul comparison cites the Kernel lab's runs as taught in Writing kernels section 1.
- Compiler stack: the root's section 8 is described as defining PTX, SASS and the fat binary.
- Profiling: compiler stack's "bits nobody prints" is its section 4 (was 3), with its scoreboard replay (was the SASS, decoded tab).
- Child ledgers re-keyed where a key had captured a stale reading time.
