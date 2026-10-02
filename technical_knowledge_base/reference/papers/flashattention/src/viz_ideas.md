# FlashAttention: visualisation ideas

Central question: where does attention's time go on a GPU, and how does tiling with online softmax move it from HBM traffic to arithmetic without changing the answer?

Scores 0 to 2 per Methodology question (quantity under the reader's control; reproduces a stated figure, counted double; computable from public data, counted double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animation point), minus build cost.

| id | Idea | Placement | Data and sources | Score | Status |
|---|---|---|---|---|---|
| P-flashattention.1 | **Run the kernel**: one forward pass on a real random 32 × 4 input, animated to scale in three modes (standard Algorithm 0, FlashAttention Algorithm 1, FlashAttention-2's Q-outer order), HBM and SRAM bands with one square per value, blocks flying between them, counters for HBM traffic, N × N traffic, extra HBM state, on-chip values, FLOPs and the final max error; a followed row with its m, ℓ and rescale factor; block size 4/8/16 and masking/dropout toggles | Own tab (live ingredient) | Algorithms 0, 1, 2; FlashAttention-2 Algorithm 1; counts checked against recompute.py | 15 | built |
| P-flashattention.2 | The same counts at the paper's scale: N, d, SRAM, block size, heads × batch, block density; bars against Figure 2's printed values, time at bandwidth and at peak | Run tab | Algorithms 0 to 4, Proposition 4; Figure 2; §2.1; A100 datasheet | 14 | built (reproduces FA's 4.4 GB within 5% by reconstruction; does not reproduce 40.3 GB from the algorithms alone, said) |
| P-flashattention.3 | Why bigger blocks stop helping: forward-pass HBM time against block size with the matrix-multiply time at a chosen efficiency, crossing marked | Run tab | Algorithm 1; FlashAttention-2's 25 to 40% figure for FA-1 | 9 | built (illustrative; Figure 2 middle prints no values) |
| P-flashattention.4 | Online softmax for one row: 8 real scores, block size select, running m, ℓ, rescale and output per block, weights against the plain softmax, a "skip the rescale" toggle that shows the error | Reading, predict reveal | §3.1 equations | 12 | built |
| P-flashattention.5 | Theorem 2 curve: Algorithm 1's exact HBM count against SRAM size with the Θ term, the standard line, the 4Nd floor and the A100 marked | Reading, predict reveal | Theorem 2, Proposition 3 | 11 | built |
| P-flashattention.6 | Predict: more FLOPs, faster or slower? Reveal Figure 2's three printed pairs | Reading | Figure 2 | 10 | built |
| P-flashattention.7 | A100 memory hierarchy on log scales (capacity, bandwidth) | Reading | §2.1 | 7 | built |
| P-flashattention.8 | Figure 3 rebuilt from appendix Tables 9 to 21: every pass, dropout and masking combination and memory, 12 methods, group toggles, read-off table at any N | Tables tab | Tables 9 to 21 | 13 | built (reproduces the 3.3×, 20.4× and 1.96× claims and the 512 to 1,024 crossover) |
| P-flashattention.9 | Figure 2 table with the cost model beside the printed values | Tables tab | Figure 2, recompute.py | 10 | built (GFLOPs do not reproduce, said) |
| P-flashattention.10 | Tables 1 to 7 with recomputed columns (speedups, vs Megatron, lifts, FMHA percentages), Table 3 sortable, Table 5 drawn | Tables tab | Tables 1 to 7 | 9 | built |
| P-flashattention.11 | Every number in the text checked: 27 claims with verdicts | Tables tab | recompute.py | 11 | built |
| P-flashattention.12 | Then and now: FA-1 to FA-4 step cards, where it runs now, using it today | Own tab | FA-2/3/4 abstracts, PyPI, README, PyTorch, cuDNN, vLLM docs | 8 | built |
| P-flashattention.13 | Backward pass animation (Algorithm 3 against Algorithm 4) | Run tab, fourth mode | Appendix B | 9 | runner-up: the scale panel counts it; a second long animation would repeat the forward one's lesson |
| P-flashattention.14 | Block-sparse butterfly mask picture; Figure 2 middle and right redrawn; Figures 5 to 8 speedups by GPU | none | images only | rejected: data exists only as images |
| P-flashattention.15 | Heat-map of P's values in the animation | none | | rejected: 2,048 coloured cells per frame for no extra insight; the followed row shows the real numbers |

What the methodology lacked here: a rule for when a systems simulation should also run the real arithmetic. Here it should, because the mechanism's correctness (online rescaling) is the part readers doubt, and running it costs nothing.
