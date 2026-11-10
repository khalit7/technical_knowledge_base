# Visual ideas: The compiler stack

Question the page keeps returning to: what does my code become on its way to the GPU, and which of those forms decides whether it runs, and how fast?

| # | Idea | Placement | Score (0-2 each: parameter, reproduces, computable, beyond prose, misconception, central, absent) | Status |
|---|---|---|---|---|
| 1 | **nvcc --dryrun, animated**, before/after -arch=sm_90a vs -arch=sm_90 (11 vs 8 real commands, files with --keep sizes, images counter) | Reading s1 | 1,2,2,2,2,2,2 | built |
| 2 | **Will it run?** the driver's search through a real fat binary, step by step, with PTX stripped as the before/after; all-GPU matrix; checked 660/660 against compat.py | Reading s5 (own tab until 2026-10-23) | 2,2,2,2,2,2,2 | built |
| 3 | **SASS control bits decoded** with a scoreboard replay (six SB boxes, producers highlighted, issue-cycle counter) on four real kernels; validated 0 violations, negative control > 1,000 | Reading s4 (own tab until 2026-10-23) | 1,2,2,2,2,2,2 | built |
| 4 | **Dynamo graph break, animated**: real bytecode before and after, graph 1, resume function, graph 2; toggle fullgraph=True (real error) | Reading s8 | 1,2,2,2,2,2,2 | built |
| 5 | e^x four ways, stepped: PTX and SASS per variant, instruction counters | Reading s6 | 1,1,2,2,2,1,2 | built |
| 6 | PTX feature highlighter on the real softmax PTX | Reading s2 | 1,1,2,1,1,2,1 | built |
| 7 | One SASS line taken apart (clickable parts, decoded control word) | Reading s3 | 1,1,2,2,1,2,2 | built |
| 8 | Live registers across the softmax (nvdisasm -plr) against the 18 allocated | Reading s3 | 0,2,2,2,1,1,2 | built |
| 9 | Feature x target matrix (5 kernels x 14 targets, ptxas messages on hover) | Reading s4 | 1,2,2,2,2,2,2 | built |
| 10 | Recompilation timeline bars (log scale) | Reading s8 | 1,1,2,1,2,2,2 | built |
| 11 | Inside torch.compile: program x stage log browser | own tab | 1,1,2,1,1,2,2 | built |
| 12 | Clickable two-road flow diagram | Reading top | 0,0,2,1,1,2,1 | replaced 2026-10-23 by 13 |
| 13 | **Hero: six front ends meeting at PTX and ptxas** (static annotated SVG, cuTile's tileiras bypass, every box clickable for output and how to see it) | Reading top | 0,0,2,2,1,2,2 | built 2026-10-23 |
| 14 | **Fusion stepper on Inductor's real log**: 7 scheduler nodes, 4, 2, one C++ kernel plus the library mm; refused pair with the logged reason | Reading s1 | 1,2,2,2,1,2,2 | built 2026-10-23 |
| 15 | ptxas -O0 to -O3 as bars (instructions, registers), replacing the table | Reading s3 | 1,2,2,1,1,1,1 | built 2026-10-23 |
| R6 | XLA and TVM fusion side by side on the same graph | rejected 2026-10-23: needs new runs (JAX is on the XLA page; TVM not installed); the comparison table carries the sourced facts |
| R1 | Source/PTX/SASS line mapping explorer | rejected: the root's Compiler explorer owns it; linked |
| R2 | Triton pass-by-pass dumps | rejected: the Triton page's Compiler stages tab owns it |
| R3 | Timing compiled vs eager on GPU | rejected: no GPU; CPU timings of a tiny op would mislead (said on the page) |
| R4 | JIT cache simulator with sizes | rejected: no measured JIT times without a GPU; the env-var table and the Will it run? tab carry the rules |
| R5 | Register-pressure ladder | rejected: the root and memory hierarchy pages have it |

What the methodology lacked: a rule for validating reverse-engineered formats; used here: a self-consistency check on real code plus a negative control.

## 2026-11-06 rollout (split layout, 3D stages v2), built 2026-11-10
| # | Idea | Placement | Status |
|---|---|---|---|
| 16 | **Fig. 3, nvcc as a driver in 3D**: the real `--dryrun` commands as program boxes in three lanes (host, compute_90, compute_90a), each file a slab on the floor (log height, `--keep` sizes), flows along each file's path; sm_90a (7 grouped steps for 11 commands) against sm_90 (5 for 8); the real command text under the list | Reading s2 | built; replaces the 2D nvcc stepper (1) |
| 17 | **Fig. 4, the softmax on its way down**: source, PTX (230 virtual registers as cubes by type), ptxas, SASS plates; -O0 792 slots and 31 registers shrinking to 232 and 18; four targets' slots, registers and argument offsets | Reading s3 | built; replaces the ptxas bar chart (15) |
| 18 | **Fig. 5, which image each GPU runs**: the PyTorch 2.14 release wheel as a stack of SASS slabs, seven GPUs in front taking theirs, the CC 13.0 GPU failing; nightly mode adds PTX 12.0 and the future GPU JIT-compiles; outcomes from `CSRUN.decide` | Reading s5 | built; the "Will it run?" tool (2) stays beside it as a reader-driven widget |
| 19 | **Fig. 6, torch.compile as one road**: frame, guards as a gate of 18 posts, Dynamo, AOTAutograd, Inductor (7 nodes to 1 kernel + mm), C++ and Triton, PTX, ptxas, SASS as plates along a road; a graph-break mode (graph 1, Python, resume function, graph 2) | Reading s8 | built |
| R7 | Hero in 3D (six roads converging on a PTX plate) | rejected: the hero is a map of six roads with three labelled boxes each and click-for-detail; flat reads best, and Figs. 4 and 6 give the depth |
| R8 | Scoreboard replay or the driver's search as 3D stages | rejected: both are reader-driven tools over real listings (232 to 280 instructions; any binary on any GPU); the long-replay rule makes them widgets |
| R9 | Fusion rounds (Fig. 2) in 3D | rejected: seven nodes merging in a row read best flat; Fig. 6 shows the outcome in 3D |
