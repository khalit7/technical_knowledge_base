# Distributed Training: visualisation ideas

The question the page keeps returning to: **for one training step, what does each GPU hold, and what has to cross which wire, under each way of splitting the work?** Every split trades memory per GPU against bytes sent per GPU and the link they travel on; composing them (4D, 5D) is choosing where each axis sits on NVLink or InfiniBand.

## What already exists (so this page does not repeat it)

| Where | Visual | Consequence here |
|---|---|---|
| Root, Machinery | Bytes per parameter bars (16, 2, 0.52 ...) for training, LoRA, QLoRA, serving; a 5-row parallelism table | Linked; this page's table is the detailed one (collective and bytes per step) |
| Root, Scaling calculator tab | FLOPs and GPU-days for a size and token count | Linked for "how long"; the layout calculator only uses 6ND for step time |
| ZeRO page, Step through a training step | DDP against ZeRO-1/2/3, layer by layer, 2 to 8 GPUs, memory strips, collectives | Linked for the layer-by-layer ZeRO schedule; the animation here keeps ZeRO to five steps |
| ZeRO page, Tables | Ψ, N_d, N_m calculator; Table 1 rebuilt | The layout calculator reproduces Table 1 again only as its first preset, as a check of the shared formula |
| Megatron-LM page | TP split of one MLP animated; memory against t; Then and now layouts 2019 to 2026 | Linked; TP here is two all-reduces per sub-block, not the matrix demo |
| Llama 3 page, Run the 16K-GPU job | 4D rank mapper; interleaved pipeline simulator; memory per GPU for 405B (state only) | Linked; the calculator here adds activations, CP, EP and per-axis communication time |
| DeepSeek page (and DeepSeek-V3 paper page) | 1F1B / ZB1P / DualPipe schedule simulator; EPLB; FP8 tiles | Linked; the bubble table here is formulas only |
| Switch page | Figure 9 redrawn: data, model, expert splits on 16 cores, forward tensors | Linked |

## Candidates, scored

Scores 0 to 2 on: parameter to move (Q), reproduces a published figure (R, counts double), computable from public data (C, counts double), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (X), absent elsewhere (A), step animation against the method it replaced (N); build cost subtracted (B).

| # | Idea | Q | R×2 | C×2 | S | M | X | A | N | −B | Total | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One training step, nine ways**: Llama 3 8B, 4 GPUs, the same batch (4 × 8K, or 1 × 32K), DP, ZeRO-1/2/3, HSDP, TP, PP, EP, CP; what each GPU holds (layers, slices, experts, chunks, memory bar to scale against 80 GB), each collective drawn, bytes sent per GPU by link, idle share; DP's numbers beside every counter | 2 | 2 (ZeRO's 2Ψ against 3Ψ; 1F1B bubble (p−1)/m) | 4 | 2 | 2 (CP and EP do not shrink weights; DP cannot split one sequence; TP sends the most bytes) | 2 | 2 (no page shows all axes on one model and one scale) | 1 | −2 | 15 | **built, Reading** |
| 2 | **Layout calculator**: any model, TP x CP x PP x DP (+ EP), ZeRO stage, bytes recipe, sequence, micro-batches, recompute; memory per GPU stacked against 80 GB; bytes and seconds per step per axis on its link against compute time | 2 | 4 (ZeRO Table 1 independently; Llama 3 Table 4 GPU and token products and MFU; DeepSeek-V3 2,048 = 16 × 128, 4 experts per GPU, EP64 = 8 nodes; DeepSeek's "approximately 1:1" comm-to-compute ratio comes out at 1.4 : 1 independently) | 4 | 2 | 1 (16 bytes is one convention of four) | 2 | 1 (Llama page covers state memory for one model) | 0 | −2 | 14 | **built, own tab** ("across all layouts, how do memory and communication change") |
| 3 | Pipeline schedule animation, GPipe / 1F1B / interleaved / DualPipe | 2 | 2 | 4 | 2 | 1 | 1 | 0 (built twice: DeepSeek D5, Llama 3 P-llama_3_herd.4) | 1 | −2 | 11 | **rejected as an animation**; replaced by #4 |
| 4 | Bubble and memory table: p, m, v sliders; GPipe, 1F1B, interleaved, ZB-H1, DualPipe rows with the published formulas, bubble share and in-flight activations | 2 | 2 ((p−1)/m; (p−1)/(vm); ZB-H1 one third of 1F1B at F = B = W) | 4 | 1 | 2 (1F1B does not shrink the bubble; the old page implied it did) | 1 | 1 | 0 | −1 | 12 | **built, Reading (PP)** |
| 5 | Collective cost calculator: collective, n, message, link; ring factors 2(n−1)/n and (n−1)/n; NVLink against InfiniBand | 2 | 2 (DeepSeek's 160 / 50 = 3.2) | 4 | 1 | 1 | 1 | 1 | 0 | −1 | 11 | **built, Reading (collectives)** |
| 6 | Memory-per-GPU calculator alone | | | | | | | | | | | merged into #2 (one tab, two outputs) |
| 7 | Communication-cost calculator alone | | | | | | | | | | | merged into #2 (per axis, per link) and #5 (per collective) |
| 8 | Device-mesh rank picker for Llama 3 | | | | | | | | | | | rejected: Llama 3 page has it (P-llama_3_herd.3) |
| 9 | Ring Attention against Ulysses animation | 1 | 0 | 2 | 2 | 1 | 1 | 2 | 1 | −2 | 8 | runner-up: the CP mode shows Llama 3's all-gather variant; the three variants' volumes are compared in a sentence |
| 10 | Activation checkpointing slider (none, selective, full) | | | | | | | | | | | folded into #2 as the recompute control |
| 11 | Framework comparison matrix | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | rejected: a list reads as well |

## Data and formulas (all in recompute.py)

- Models: Llama 3.1 8B, 70B, 405B from config.json (8,030,261,248; 70,553,706,496; 405,853,388,800 parameters, recounted); DeepSeek-V3 from the DeepSeek-V3 paper page's recount (671,026,419,200 main model, 653,908,770,816 routed experts, 37,552,282,624 active).
- Bytes per parameter: ZeRO §3.1 (2 + 2 + 12); MT-NLG §2.1.1 (20); Llama 3 §3.3.2 read as 2 + 4 + 12 (FP32 gradients); DeepSeek-V3 §3.3 read as 2 + 4 + 4 + 2 + 2 (FP32 master and gradients, BF16 moments, assumed BF16 working copy). The last two are our readings, labelled.
- Activations: Korthikanti et al. 2022, 34 sbh per layer with sequence parallelism and no stored score matrix (FlashAttention or selective recompute), divided by TP and CP; 1F1B keeps min(m, PP) micro-batches in flight on the first stage, DualPipe PP + 1 (DeepSeek-V3 Table 2). Full recompute keeps 2 sbh per layer plus one layer's working set. A GPT-style estimate, labelled.
- Communication per GPU per step: ring all-reduce 2(n−1)/n, reduce-scatter and all-gather (n−1)/n (nccl-tests PERFORMANCE.md); DP: all-reduce (stage 0), reduce-scatter + all-gather (stages 1, 2), plus two all-gathers per micro-batch (stage 3); TP: 4 all-reduces of sbh × 2 bytes per layer per micro-batch; CP: all-gather of K, V forward and reduce-scatter of their gradients backward (Llama 3's variant); PP: one activation forward and one gradient back per micro-batch; EP: dispatch and combine, forward and backward, top-k copies of each token, (e−1)/e leaving the GPU, dispatch in FP8 for DeepSeek (§3.3).
- Links: innermost-first TP, CP, EP, PP, DP (Llama 3 §3.3.2 for the dense order; EP inside DP as DeepSeek places 64 experts' GPUs on 8 nodes); a group is on NVLink if it fits in one 8-GPU server. Bandwidths: H100 NVLink 900 GB/s total, 450 each way (NVIDIA); 400 Gb/s NIC per GPU = 50 GB/s (Llama 3 §3.3.1); H800 NVLink 160 GB/s and IB 50 GB/s (DeepSeek-V3 §3.2.2). Peak figures; achieved bandwidth is lower.
- Step compute time: 6 × active parameters × tokens per step / (GPUs × 989.5 TFLOP/s × MFU), attention FLOPs left out (understates the 128K row).

## Defaults that reproduce published figures

- ZeRO Table 1, all printed cells (independently): 7.5B on 64 GPUs gives 31.4, 16.6, 1.88 GB.
- Llama 3 Table 4 (consistency): TP × CP × PP × DP = 8,192, 16,384, 16,384; DP × batch/DP × sequence = 16,777,216 tokens in all three rows ("16M"); 430/989.5 = 43.5%, 400/989.5 = 40.4% (printed 41%, the misprint the Llama 3 page also finds), 380/989.5 = 38.4%.
- DeepSeek-V3 (by construction from §3.2): 2,048 = 16 × 128; 256 / 64 = 4 routed experts per GPU; EP64 / 8 = 8 nodes; 160 / 50 = 3.2; 4 × 3.2 = 12.8 ("13"). Independently: computation over communication 1.39 : 1 against the report's "approximately 1:1" for cross-node EP.
- Does not reproduce: the GPT-style activation estimate puts DeepSeek-V3 at 90 GB per GPU (over 80 GB), because it ignores DeepSeek's recomputation of RMSNorm and MLA up-projections and FP8 activation caching; for Llama 3 405B at 8K it gives 78.6 GB, consistent with Meta training without activation checkpointing but with little room, an estimate, not a reproduction.

## Inspiration

Ultra-Scale Playbook's memory widget and its parallelism cheat-sheet figure; siboehm's pipeline tables; the MLA explainer's mode toggle (here the mode toggle is the before/after: switch DP to any other split at the same step).

## What the methodology lacked here

A rule for "systems" pages where most published figures are layouts (degrees) rather than measured quantities: the layout products reproduce only by construction, so the independent check has to come from a derived ratio the source also states (DeepSeek's 1:1). Worth adding: look for a ratio the source states in words and recompute it from the layout.
