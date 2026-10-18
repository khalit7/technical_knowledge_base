# Coverage of the floor: the Topic: llms "Deeper: inside an MoE" tab

Floor: `technical_knowledge_base/models_and_training/topic_llms/src/parts/35_*` (built 2026-10-01/02), whose tab will be
replaced by a link to this page. Every claim was checked against the primary source (saved text of the paper pages in
`reference/papers/*/src/inputs/`, arXiv HTML fetched 2026-10-18, configs, transformers 5.20.1 source). Status:
**carried** (same claim, verified), **corrected** (claim changed, why), **replaced** (an illustrative visual replaced by a
recorded one), **dropped** (with the reason). Where on this page: Reading section (s0 to s9), tab.

| # | Floor claim | Status | Where | Note |
|---|---|---|---|---|
| 1 | Only the FFN becomes sparse; attention, norms, residual stay dense | carried | s1 | |
| 2 | Expert = SwiGLU, 3 d d_ff parameters | carried | s1, s9 | tiny GPT experts are GELU (2 d h), said so |
| 3 | Top-k, gate weight, shared expert, load balance, capacity factor, EP definitions | carried | s1 to s7 | defined at first use |
| 4 | Memory priced on total, throughput on active; two all-to-alls; skinny GEMMs; discrete decision is a source of instability | carried | s1, s7, s8 | |
| 5 | DeepSeek-V3 router 7,168 x 256 = 1.8M, 0.016% of an 11.32B MoE layer | carried | s2 | recomputed: 1,835,008 / 11,320,164,352 |
| 6 | Softmax and sigmoid select the same experts from the same logits | carried, qualified | s2, mistakes | not once a selection bias or a group limit is added |
| 7 | Gate weight is the router's only gradient path | carried, measured | s2 | grad_check.py: unchosen logits get rounding-level gradient (LM loss), all get gradient with the aux loss |
| 8 | Mixtral Softmax(TopK(x Wg)) | carried | s2 | quote verified in Mixtral v1 section 2.1 |
| 9 | Sigmoid: "DeepSeek-V3's report states the choice without arguing it" | corrected | s2 | true of the report, but DeepSeek's aux-loss-free paper (arXiv 2408.15664) says the sigmoid baseline performed better than softmax and shows it in appendix C |
| 10 | Router toy with illustrative logits | replaced | s2 | recorded logits of the trained moe8top2 model, 8 tokens x 6 layers |
| 11 | Noisy top-k (Shazeer 2017) | carried | s2 | formula from the paper added |
| 12 | Top-2 (GShard, Mixtral) buys a smoother layer and a comparison for the router | carried | s2 | GShard's random second-expert dispatch added |
| 13 | Top-1 Switch: k = 1 works against the prior assumption | carried | s2 | exact quote of Shazeer's conjecture; ST-MoE's later +0.004 for top-2 added |
| 14 | Fine-grained: C(256, 8) about 4.1e14 against C(8, 2) = 28 | carried | s5, calc | |
| 15 | Collapse mechanism | carried, measured | s3, Expert load tab | no-balancing run recorded |
| 16 | Aux loss formula, alpha 1e-2 and its quote | carried | s3 | quote verified (Switch v3 text) |
| 17 | "top-k variants count all T k assignments and rescale so the uniform case stays constant" | corrected | s3 | transformers' load_balancing_loss_func does not rescale: balanced top-2 returns 2.0, and it pools layers (hf_aux_check.py) |
| 18 | Worked example 2.8 alpha | carried | s3 | |
| 19 | Device-level balance loss (DeepSeekMoE) | carried | s3 | equations 15 to 17 cited; DeepSeek-V2's three losses and coefficients added |
| 20 | Aux-loss-free bias: rule, gamma 0.001 for 14.3T then 0 for 500B, alpha 0.0001 sequence-wise, no token dropping | carried | s3 | all verified in V3 v2 text |
| 21 | Bias balancing "now on nearly every open MoE model card from 2025 on" | corrected | s0, s9 | configs show it in the DeepSeek, Kimi, GLM, MiniMax and Nemotron lines, not in Qwen3/3.5 (global-batch aux loss), gpt-oss, Llama 4 |
| 22 | Bias never enters the gradient | carried | s3 | |
| 23 | Router z-loss formula, c_z 0.001, stability in 3 of 3 runs, clipping's quality cost | carried | s3 | ST-MoE Table 4 numbers quoted (4/6, 3/3, 3/3; -1.755, -4.206, -1.741) |
| 24 | Batch animation with illustrative logits (seeded loads 20, 7, 0, ...) | replaced | Router tab | recorded router choices of three trained models on the running sequence |
| 25 | Balancing scope: global batch, 0.1 PPL and 2 points, Qwen3 adopted it | carried | s3 | quotes verified (arXiv 2501.11873, Qwen3 report) |
| 26 | DeepSeek 4.5.3 validation losses 2.258/2.253/2.253 and 2.085/2.080/2.080; two risks | carried | s3 | |
| 27 | "Same routing judged at two scopes" interactive (illustrative) | dropped | | illustrative only; the published numbers and the risks carry the point |
| 28 | C = CF k T / N; ST-MoE trained at 1.25, evaluated at 2.0 | carried | s4 | quote "The train capacity factor is 1.25 and the eval capacity factor is 2.0" |
| 29 | Worked example T 4,096, N 64, k 2, CF 1.25 | carried | s4 | |
| 30 | Dropped tokens skip the layer; No-Token-Left-Behind no benefit | carried | s4 | |
| 31 | Train and inference drop regimes differ | carried, measured | s4 | batch-size effect measured |
| 32 | MegaBlocks dropless; grouped GEMM | carried | s4 | |
| 33 | Choice / buys / costs table | carried | s0 | extended with 2026 config choices |
| 34 | EP: dispatch and combine all-to-all; B k / N tokens per expert; k d per token | carried, run | s7 | four-process gloo run of a trained layer |
| 35 | Kimi K3 latent 7,168 to 3,584 ("our reading") | carried | s5 | config field routed_expert_hidden_size and card "Stable LatentMoE" quoted; communication still marked our reading; Nemotron 3 Super's LatentMoE added |
| 36 | Decode worked example: 256 sequences, 8 tokens per expert, 112 KiB each way per token per layer | carried | s7, s8 | |
| 37 | Node-limited routing: 4 nodes, NVLink 160 vs IB 50 GB/s, up to 13 experts | carried | s7 | link to Interconnects and Distributed Training, which own the network side |
| 38 | EP composition with DP/ZeRO/TP/PP | carried as link | s7 | owned by Distributed Training |
| 39 | DualPipe, DeepEP, disaggregation; V3 decode 320 GPUs, one expert each, 64 redundant/shared | carried | s7, s8 | |
| 40 | Experts quantised; 1,342 / 671 / 336 GB | carried | s8 | |
| 41 | Load imbalance at request time; redundant experts re-planned every 10 minutes; 32 in prefill; EPLB | carried | s8 | |
| 42 | Attention was never sparsified | carried | s8 | |
| 43 | Routing input-dependent, performance input-dependent | carried | s8 | |
| 44 | Total/active formula and the DeepSeek-V3 worked example (671.0B, 37.6B, 17.9x, 98% / 61%) | corrected | s9, calc | 37.6B counts the input embedding; the report's 37B is the accounting without it (36.6B), as the root's Config calculator verified; the rest computed by window.CC |
| 45 | 685B on the card = 671B + 14B MTP | carried | s9 | Hub 684.5B = 671.0B + 13.46B MTP + 41.5M FP8 scales (root FACTS) |
| 46 | gpt-oss-120b active 5.13B (OpenAI excludes the embedding) | carried | calc | shown as "without input embedding" for every model |
| 47 | Mixtral 46.7B / 12.9B worked example | carried | s9 | |
| 48 | Dense warm-up layers (V3 3, K2 1, GLM 3), Llama 4 alternating | carried | s0, s9 | read from configs; DeepSeek-V4's 3 hash-routed layers added |
| 49 | Mistakes: topic specialisation, z-loss balances, loss moves tokens, sigmoid vs softmax, dropped tokens are errors | carried | mistakes, s3 | Mixtral's own "no obvious patterns" quote added; measured token-level specialisation |

Counts: 49 floor claims: 41 carried (several qualified, extended or measured), 4 corrected (9, 17, 21, 44), 2 replaced by recorded data (10, 24), 1 dropped (27), 1 carried as a link to the page that owns it (38).
