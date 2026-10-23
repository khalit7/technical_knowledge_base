# Visualisation ideas: Libraries and tensor cores

What the text needs to be understood: (1) that one instruction per generation changes who issues the MMA, where operands and accumulators live and how data arrives; (2) what a fragment layout is; (3) CuTe layouts as functions; (4) how tiles map onto SMs (waves, split-K, Stream-K); (5) what a library contains and what an epilogue saves.

## Built (score out of 10: teaching value, evidence, uniqueness)
| Idea | Where | Score | Data | Why it earns its place |
|---|---|---|---|---|
| One 128 x 128 tile, one K slice, on Ampere / Hopper / Blackwell (before/after animation, 7 steps each, running counters) | Reading s5 | 10 | instruction shapes (PTX ISA 9.4); counts reproduce the root's compiled Triton tiles (64 HMMA per warp, 4 HGMMA) by construction | the whole page in one picture: MMA count 512 to 8 to 4, issuers 128 to 1, accumulator registers 128 to 64 to 0 |
| mma.sync fragment map, click a lane | Reading s5 | 9 | CuTe's SM80 TV layouts, checked against CuTe output; lane 0 of C = (0,0),(0,1),(8,0),(8,1) as in the PTX ISA | "fragment" is unreadable as prose |
| mma.sync table across 5 targets | Reading s5 | 8 | compile matrix | shows FP8 emulated on sm_90a/sm_100a |
| Epilogue fusion bars (M1) | Reading s2 | 7 | MLX 0.32.3, 3 runs | the only timed evidence; shows fusion matters at small K |
| cuBLASLt kernel inventory bars + name decoder + CUTLASS 3.x name | Reading s2 | 8 | cuobjdump -ltext, strings | turns "cuBLAS picks a kernel" into a fact with counts |
| Mini layout grid (4 presets) | Reading s7 | 7 | JS CuTe port | layout = function, at a glance |
| Layout lab tab | tab | 9 | JS port checked on 21 cases / 6,326 values against CuTe | composition, divide, products and swizzles need a playground |
| Bank-group view of swizzles | Reading s7 (Layout lab until 2026-10-23) | 8 | Sw<B,3,3> on 8 x 64 halves | why the 128 B swizzle is conflict-free |
| TV layouts of 4 instructions (incl. wgmma 64 x 64 C, 128 threads) | Layout lab | 7 | CuTe MMA_Traits | scale of Hopper fragments |
| Instruction atlas (20 kernels x 8 targets, click for PTX/ptxas/SASS) + 3 newer targets + cuBLAS opcode scan | tab | 9 | 160 real compiles | the evidence base, browsable |
| GEMM scheduler (DP, split-K, Stream-K, hybrid; Gantt with time scrub; schedule comparison) | Reading s3 (a tab until 2026-10-23) | 8 | model mirrored in recompute.py, 11 cases equal | waves and Stream-K are spatial; reproduces NVIDIA's 108 vs 117 tiles example |

## Added or moved on 2026-10-23 (teaching contract)
| Idea | Where | Kind | Why |
|---|---|---|---|
| Hero: one PyTorch call down four layers to the instruction of each generation | Reading top | static annotated diagram | structure; the whiteboard picture the page elaborates |
| MMA output tile per instruction, to one scale (mma.sync m16n8k16, wgmma m64n256k16, tcgen05 128 x 256 x 16) | Reading s5 | drawn to scale | "what a tensor core computes" had no picture; the 2,048 : 262,144 : 524,288 ratio is seen as area |
| What fits on one SM: stages in shared memory and the setmaxnreg split | Reading s6 | drawn to scale | the stage and register arithmetic was prose only |
| GEMM scheduler | moved from its tab into Reading s3 | lab inline | explains one mechanism; the prediction it answers sits right above it |
| Swizzle bank view | moved from the Layout lab into Reading s7 | toggle-compare | the swizzle sentence needs it beside it |
| Tile animation | stays in s5 | before/after | no longer starts playing on a mode switch |

Rejected on 2026-10-23: a stepper of the full/empty stage ring (the Hopper mode of the tile animation already steps through one round; a second drawing would repeat it); a visual for the column-major trap (one sentence says it completely).

## Rejected
- A cuBLAS "heuristic simulator": the heuristic is closed and cannot run without a GPU; we show the inventory and names instead.
- Measured tensor-core throughput per generation: owned by GPU architecture (hardware topic) and not measurable here.
- An M1 simdgroup_matrix tensor-core analogue: the root's Kernel lab already has it (3,371 vs 4,048 GFLOP/s); linked.
- A warp-specialised pipeline Gantt per warp: the tile animation plus CUTLASS example 48's SASS (USETMAXREG 40/232) carry the idea with real evidence; a timing Gantt would be invented numbers.

## What the methodology lacked for this page
No GPU: every "how fast" question had to become "what does the compiler emit" or a labelled derived model. The useful substitutes were compile matrices with exact refusal messages, SASS opcode scans of a vendor library, and porting a library's algebra to JS and checking it value by value against the library's own output.
