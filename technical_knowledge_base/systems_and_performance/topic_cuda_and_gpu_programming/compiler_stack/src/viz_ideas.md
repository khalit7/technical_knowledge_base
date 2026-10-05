# Visual ideas: The compiler stack

Question the page keeps returning to: what does my code become on its way to the GPU, and which of those forms decides whether it runs, and how fast?

| # | Idea | Placement | Score (0-2 each: parameter, reproduces, computable, beyond prose, misconception, central, absent) | Status |
|---|---|---|---|---|
| 1 | **nvcc --dryrun, animated**, before/after -arch=sm_90a vs -arch=sm_90 (11 vs 8 real commands, files with --keep sizes, images counter) | Reading s1 | 1,2,2,2,2,2,2 | built |
| 2 | **Will it run?** the driver's search through a real fat binary, step by step, with PTX stripped as the before/after; all-GPU matrix; checked 660/660 against compat.py | own tab | 2,2,2,2,2,2,2 | built |
| 3 | **SASS control bits decoded** with a scoreboard replay (six SB boxes, producers highlighted, issue-cycle counter) on four real kernels; validated 0 violations, negative control > 1,000 | own tab | 1,2,2,2,2,2,2 | built |
| 4 | **Dynamo graph break, animated**: real bytecode before and after, graph 1, resume function, graph 2; toggle fullgraph=True (real error) | Reading s8 | 1,2,2,2,2,2,2 | built |
| 5 | e^x four ways, stepped: PTX and SASS per variant, instruction counters | Reading s6 | 1,1,2,2,2,1,2 | built |
| 6 | PTX feature highlighter on the real softmax PTX | Reading s2 | 1,1,2,1,1,2,1 | built |
| 7 | One SASS line taken apart (clickable parts, decoded control word) | Reading s3 | 1,1,2,2,1,2,2 | built |
| 8 | Live registers across the softmax (nvdisasm -plr) against the 18 allocated | Reading s3 | 0,2,2,2,1,1,2 | built |
| 9 | Feature x target matrix (5 kernels x 14 targets, ptxas messages on hover) | Reading s4 | 1,2,2,2,2,2,2 | built |
| 10 | Recompilation timeline bars (log scale) | Reading s8 | 1,1,2,1,2,2,2 | built |
| 11 | Inside torch.compile: program x stage log browser | own tab | 1,1,2,1,1,2,2 | built |
| 12 | Clickable two-road flow diagram | Reading top | 0,0,2,1,1,2,1 | built |
| R1 | Source/PTX/SASS line mapping explorer | rejected: the root's Compiler explorer owns it; linked |
| R2 | Triton pass-by-pass dumps | rejected: the Triton page's Compiler stages tab owns it |
| R3 | Timing compiled vs eager on GPU | rejected: no GPU; CPU timings of a tiny op would mislead (said on the page) |
| R4 | JIT cache simulator with sizes | rejected: no measured JIT times without a GPU; the env-var table and the Will it run? tab carry the rules |
| R5 | Register-pressure ladder | rejected: the root and memory hierarchy pages have it |

What the methodology lacked: a rule for validating reverse-engineered formats; used here: a self-consistency check on real code plus a negative control.
