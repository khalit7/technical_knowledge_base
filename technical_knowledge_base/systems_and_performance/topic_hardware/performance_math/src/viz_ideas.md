# Performance math: visual ideas, data and checks

Central question: what do the FLOPs, bytes, utilisation and price of a run or a deployment come to, exactly, and where do the rules of thumb (6ND, 16 bytes per parameter, 34sbh, MFU) stop being right?

The parent's Performance calculator already has the training, inference and communication calculators, the one-step animation on 1/8/64 GPUs, the decode animation at batch 1 and 64, 27 checks and 10 drills. Everything here extends it (its JavaScript is copied unchanged and checked) instead of repeating it.

## Built (scores 0 to 2; reproduce and computable count double)

| # | Idea | Placement | Moves | Reproduces | Computable | Beyond prose | Misconception | Animation | Score |
|---|---|---|---|---|---|---|---|---|---|
| 1 | One training step's memory under plain attention, FlashAttention and full recompute: same step, same scale, per-layer counters, FLOPs and time | Reading s3, before/after animation | 2 | 2 (x2, counted values) | 2 (x2) | 2 | 2 (73 GB not 36 GB; recompute is 1.24x not 1.33x) | 2 | 18 |
| 2 | The traced FLOP ledger by part at 2K/8K/32K/128K against 6N | Reading s1 | 1 | 2 (x2, PyTorch's count) | 2 (x2) | 2 | 2 (6N at long context) | 0 | 15 |
| 3 | What autograd saves for one Llama layer, tensor by tensor, with the source line | Reading s3 table | 0 | 2 (x2) | 2 (x2) | 2 | 2 (GPT-3's 34 is not Llama's 49) | 0 | 14 |
| 4 | FLOP and memory ledger tab: any model, length, micro-batch, convention, checkpointing, TP, GPU; curve of FLOPs per token against length with the attention = MLP crossover | tab | 2 | 2 (x2, traced badge) | 2 (x2) | 2 | 2 | 0 | 18 |
| 5 | M1 Pro GPU: measured step time against an operator-by-operator roofline prediction, and the same operators projected onto an H100 | Reading s6 chart and table | 0 | 1 | 2 (x2) | 2 | 2 (fusion matters more on high-ridge chips) | 0 | 11 |
| 6 | PaLM HFU rebuilt from Appendix B, Llama 3 step time from Table 4, four MFU cards | Reading s4, s5 | 0 | 2 (x2) | 2 (x2) | 1 | 2 (HFU flatters) | 0 | 11 |
| 7 | Run planner (chips for a deadline, cost with goodput) and serving frontier (per-user against total tokens/s, $ per M tokens, out-of-memory points) | tab | 2 | 1 | 2 (x2) | 2 | 2 (batching is the economics; MoE loses its bandwidth edge at batch) | 0 | 13 |
| 8 | Ten predict-then-reveal drills (different from the parent's ten) | Reading s10 | 1 | 1 | 2 (x2) | 1 | 2 | 0 | 10 |

## Rejected
- Repeating the parent's training/inference calculators, step and decode animations: linked by name instead.
- A per-chip cost leaderboard: list prices from two providers only; the planner shows the chosen chip's cost (the parent rejected the same).
- Pipeline-bubble animation: the Distributed Training page and the parent calculator's step animation own the layouts; s8 gives the formula table only.
- Collective simulator: the sibling Interconnects page owns it.
- MoE trace on the meta device: transformers' expert dispatch needs data-dependent indexing that meta tensors cannot run; MoE stays on the parent's active-parameter formulas.
- 4,096-token M1 measurement: the shared laptop swapped (memory pressure from other agents); dropped after one attempt.

## Data and sources (fetched 2026-10-05)
- Model configs: the parent's `src/calc/inputs` (Llama 3.1 8B and 70B via unsloth mirrors), copied to `inputs/`.
- Traces: PyTorch 2.14.1, Transformers 5.18.0, meta device; FLOPs from `torch.utils.flop_counter.flop_registry`; saved tensors from `saved_tensors_hooks` with a stack lookup for the source line. Flash attention: a custom autograd Function calling `aten._scaled_dot_product_flash_attention` and saving exactly what flash-attn's `FlashAttnFunc` saves (K and V at their own KV heads).
- M1: MPS backend, FP16, two 8B-shaped layers, 3 runs x 8 steps, load recorded; peak 5.06 TFLOP/s and bandwidth 165 GB/s from the parent's Roofline lab.
- Papers: PaLM (arXiv 2204.02311v5, Appendix B, Table 22), Korthikanti et al. (2205.05198v1, sections 4.1, 5, 6.3, Tables 2 and 5), Llama 3 (2407.21783v3, Table 4, section 3.3.4), DeepSeek-V3 (2412.19437v2, Table 1), Kaplan et al. (2001.08361, section 2.1), ZeRO (1910.02054, section 3); PyTorch 2.14 checkpoint docs (early stop). Extracts in `inputs/`.
- Prices: Lambda and Google Cloud on demand, from the shared facts file and the parent's calculator.

## Checks
- `recompute.py` asserts the formula ledger equals the traced count (128 FLOPs per token of RoPE apart) at 4 lengths for 8B and at 8K for 70B, the activation formula equals the traced saved bytes (11 checks), and the recompute FLOPs equal forward minus the down projections.
- `check/check_page.mjs`: 54 comparisons of the page's JavaScript against `out/recompute.json`, plus the two copied parent files byte for byte.
- `check/check_embed.py`: 102 prose numbers against `out/recompute.json`; the embedded data equal it.
- Reproduced independently: PaLM MFU 46.2% and HFU 57.8% (4.098 against Table 22's 4.10 TFLOP per token), MT-NLG 29.8% (printed 29.7%, truncation), Korthikanti 530B HFU 56.9% from 56.0% MFU (printed 57.0%). By construction: DeepSeek-V3's $5.576M.

## What the methodology lacked
- A rule for "counted on a model you cannot run": the meta device gives exact FLOPs and saved bytes for any size with no hardware. Worth adding to section 2 as a source of real data.
- A rule for operator-level predictions: label them as roofline estimates, compare them with a measurement on the hardware you have, and only then project them.
