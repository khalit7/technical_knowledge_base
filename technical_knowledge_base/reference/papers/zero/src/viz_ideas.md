# ZeRO: visualisation ideas

The question the paper keeps returning to: **where does training memory go, and what does it cost in communication to stop replicating it?** Every visual below makes one side of that trade measurable.

Old page's visuals: none (one table of stages). Its links (arXiv, DeepSpeed repo, MSR blog, Ultra-Scale Playbook, DeepSpeed tutorial, Lilian Weng, FSDP docs) were the first sources searched. The Ultra-Scale Playbook already draws the stage memory bars and static communication diagrams; nothing found animates one step for two methods side by side with counters, which is what this page adds.

## Scores (0 to 2 each; reproduce and computable count double; build cost subtracted)

| Idea | Param moves | Reproduces | Computable | Beyond a sentence | Misconception | Central | New | Animation | Cost | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Step-through animation, two methods on one step | 2 (stage pair, N_d) | 2×2 (2Ψ, 3Ψ; Figure 1 per-GPU memory) | 2×2 | 2 | 2 ("sharding must multiply communication") | 2 | 2 | 2 | -2 | 20 |
| Calculator: Table 1 and Table 2 generalised | 2 | 2×2 (54/54, 20/20) | 2×2 | 1 | 1 | 2 | 1 | 0 | -1 | 14 |
| Figure 1 redrawn live | 2 | 2×2 | 2×2 | 1 | 1 | 2 | 0 | 0 | -1 | 13 |
| Every number in the text checked | 0 | 2×2 | 2×2 | 1 | 2 (33 GB, Table 4 misprint) | 1 | 2 | 0 | -1 | 13 |
| 16 bytes per parameter bar (predict first) | 1 | 2×2 | 2×2 | 1 | 2 (weights are a small share) | 2 | 0 | 0 | 0 | 13 |
| Super-linear: memory freed per GPU from Table 6 | 0 | 1×2 | 2×2 | 2 | 2 (more GPUs, slower) | 1 | 2 | 0 | -1 | 12 |
| Figure 6 sizes from Table 7 configs | 1 | 2×2 | 2×2 | 1 | 0 | 1 | 1 | 0 | -1 | 10 |
| Config recount (Tables 4 to 10) | 1 | 1×2 | 2×2 | 1 | 1 (misprint) | 0 | 2 | 0 | -1 | 9 |
| Then and now tables (stage names, runs) | 0 | 0 | 2×2 | 1 | 2 (frontier runs mostly use ZeRO-1) | 1 | 2 | 0 | -1 | 9 |

## Built

| id | Idea | Placement | Data |
|---|---|---|---|
| P-zero.1 | **Step through a training step**: one 8-layer step on 2, 4 or 8 GPUs, two methods at once (DDP vs ZeRO-3, DDP vs ZeRO-1, ZeRO-1 vs ZeRO-2, ZeRO-2 vs ZeRO-3), memory strips to scale (2 : 2 : 12 bytes), cells appearing and vanishing as the schedule gathers and frees them, arrows for all-gather, reduce-scatter and ring all-reduce, counters for GPU 0's bytes per parameter (now, peak) and volume moved against 2Ψ or 3Ψ; then the same counters at the paper's scale | Own tab | §5, §7; schedule is the paper's (owner broadcasts, bucketed reduce) |
| P-zero.2 | 16 bytes per parameter, predict then reveal, bar to scale with K slider | Reading, §3 | §3.1 |
| P-zero.3 | Figure 1 redrawn live (model, N_d): baseline strip outlined, each GPU's share placed at its partition | Reading, ZeRO-DP | Figure 1, §5 |
| P-zero.4 | Communication predict (same / 1.5× / 2× / N_d×) with RS and AG bars | Reading, Communication | §7 |
| P-zero.5 | Super-linear predict with model-state memory per GPU and batch per rank recomputed from Table 6 | Reading, Results | Table 6, §10.3 |
| P-zero.6 | Calculator: Ψ, N_d, N_m, GPU memory, K; per-stage bars against the memory line and largest model per stage | Tables tab | Tables 1 and 2 |
| P-zero.7 | Table 1 with printed / recomputed / difference toggle, fits shaded, bold explained (first fit), truncated cells marked | Tables tab | Table 1 |
| P-zero.8 | Table 2 with the "rounded 64-GPU value × MP" finding and measured share of the bound | Tables tab | Table 2 |
| P-zero.9 | Figure 6 bars from Table 7's configurations, with recounted parameters and model states per GPU per configuration | Tables tab | Tables 3, 7 |
| P-zero.10 | Config recount of every appendix run, with the Table 4 misprint (hidden 4096 for 6144) and the 1.38B row flagged | Tables tab | Tables 4 to 10 |
| P-zero.11 | Every number in the text checked: 19 claims with verdicts | Tables tab | recompute.py |
| P-zero.12 | Then and now: stage names across DeepSpeed, FSDP1, FSDP2; which stage five big runs used, quoted; the follow-up line | Own tab | later_extracts.txt |

## Defaults that reproduce

- Figure 1 (120, 31.4, 16.6, 1.9 GB) independently, from §5's formulas, in Reading, the Step tab and the calculator.
- Table 1: 54 of 54 cells; 6 only if the printed value was truncated. Bold = smallest N_d that fits, for all five.
- Table 2: 20 of 20 theoretical cells; 5 only via the paper's rounded 64-GPU value times MP. Measured ZeRO-1 sizes are 81 to 82% of the bound.
- The animation's schedule moves 2Ψ, 2Ψ, 3Ψ (by construction: it is the paper's schedule), and its at-rest memory equals the Figure 1 formulas at N_d = 2, 4, 8.
- Text arithmetic: 24 GB, 60.4 GB activations, 6 and 12 GB buffers, 8.3% P_a overhead, 3030× and 139.6 days, 15.2 PF and 30.4% of peak, 4% at 5 TFLOPS.

## Does not reproduce

- §6.1's 33 GB and 2 GB for 100B checkpoints: 67.1 and 4.2 GB at fp16; match only at 1 byte per value. §3.2's "around 60 GB" for the same model does match fp16 (67.1 GB = 62.5 GiB).
- §3.2's "about 8 GB" for GPT-2 with checkpointing: 5.0 to 6.3 GB by the obvious counts; not derived in the paper.
- "Over 8×" model size: 8.5× against §9's 16 to 20B, 4.25× against §1's 40B.
- Table 4's 40B to 60B rows (hidden 4096 gives 17.9 and 26.8B; the appendix's 6144 is right). The 1.38B baseline in Table 10 recounts to 1.21B.

## Rejected

- Redrawing Figures 2, 3, 7, 8 as charts: the bars and points carry no printed values; reading curves is against the rules. Figure 6's sizes come from Table 7 instead.
- A live trained toy (as on the Transformer page): ZeRO changes no arithmetic, so a trained model would show identical losses under every stage; the simulation of memory and traffic is the mechanism.
- Timing model (seconds per step from bandwidths): would need overlap and latency assumptions the paper does not give.
- Activation-memory calculator in its own tab: the footnote rule is one line, and its two 100B figures disagree; kept as a checked row and a box instead.

## What the methodology lacked here

A rule for papers whose appendix tables disagree with the body (Table 4 against Table 5, the appendix's figure numbering): treat the run configuration table as the source, as a config beats a paper, and say which.
