# Visualisation ideas: Interconnects and scaling

What the text needs: the per-direction bandwidth ladder; why a link has two numbers (alpha, beta); how a collective becomes messages and what each algorithm pays; what the network's shape does to each traffic pattern; how a link's numbers decide the parallelism plan.

## Built (score out of 5: teaching value, uses real data, not duplicated elsewhere)
1. **All-reduce, same gradients, four algorithms** (Reading s7; before/after on one input). 16.06 GB or 8 KB over 8 GPUs; ring, recursive doubling, halving-doubling, in-switch; NVLink 4, InfiniBand, or the measured laptop link. Chunks shaded by contributions held, arrows per step, counters (steps, bytes sent, clock, latency share). 5/5/5. Differs from the parent's ring animation (NVLink vs IB, one algorithm) and Distributed Training's bandwidth-only collective calculator.
2. **Measured here: ring against recursive doubling on this laptop** (Reading s7). Real PyTorch/Gloo runs at 2, 4, 8 ranks, 4 B to 16 MiB, 3 runs, min-max bars, fitted alpha-beta lines, model crossover. 5/5/5.
3. **Published nccl-tests against the model** (Reading s7 table): Bekman (H200, B200, 4x8 B200), AWS (2x p5, 2x p4de). 4/5/5.
4. **Ladder bars** (s1), **half-bandwidth table** (s2). 3/4/3.
5. **Link-intensity widget** (s9): chip x link x fraction of peak gives I, DP and FSDP break-even tokens, TP ratio for Llama 3.1 70B (the parent calculator's model). 4/4/4.
6. **Collective simulator tab**: all-reduce, all-gather, all-to-all; 2 to 16 GPUs; every link preset; step animation, all-algorithm bars, time or busbw against size with crossovers, H200 nccl-tests and laptop overlays. Checked against collsim.py on 84 cases. 5/4/5.
7. **Fabric explorer tab**: rail-optimised, top-of-rack, rail-only; all-to-all, ring, pipeline; servers, oversubscription, PXN; link classes coloured by load, switch ports as a cost proxy. Checked against fabric.py on 216 cases. 5/3/5.

## Rejected
- A separate NVLink generations chart: a table says it (and the parent's Chip atlas has per-chip links).
- Packet-level RoCE congestion animation (PFC pause trees): would be illustrative, not data; text with UEC and Meta quotes instead.
- TPU torus view: owned by the TPUs sibling.
- A DP/TP/PP step animation: Distributed Training already animates one step under nine splits; linked.

## Sources of inspiration
How To Scale Your Model (communication rooflines), nccl-tests PERFORMANCE.md, NVIDIA's NCCL tuning post (tuner crossovers), Thakur, Rabenseifner and Gropp 2005, the rail-only paper, Bekman's network chapter.

## What the methodology lacked
No rule for checking a simulator against measurements made on a different machine class; here the laptop validates the model's shape (step counts, crossover) and published cluster numbers its bandwidth term, each labelled.
