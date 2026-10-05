# Performance calculator (tab t-calc): visual ideas, data and checks

Central question: before renting hardware, what does the arithmetic say about fit, time, cost, serving speed and network time?

## Built (scores 0 to 2 on the Methodology questions; reproduce and computable count double)

| # | Idea | Placement | Moves | Reproduces | Computable | Teaches beyond prose | Misconception | Animation | Score |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Training calculator: memory per GPU to scale against capacity, 6ND, days, GPU-hours, cost; presets | section | 2 | 2 (x2) | 2 (x2) | 2 | 2 (6ND exceptions, HFU vs MFU) | 0 | 16 |
| 2 | One training step on 1 / 8 / 64 flat / 64 HSDP GPUs, timeline to one shared scale, overlap toggle | section, before/after animation | 2 | 1 | 2 (x2) | 2 | 2 (more GPUs is not linearly faster; keep heavy traffic on NVLink) | 2 | 15 |
| 3 | Inference calculator: weights + KV memory bar, decode step, crossover batch, tokens/s against batch with "KV free" dashed curve and out-of-memory shading | section | 2 | 2 (x2) | 2 (x2) | 2 | 2 (batching does not make long-context decode compute-bound) | 0 | 16 |
| 4 | One decode step at batch 1 vs 64, three contexts, bytes and time to scale | section, before/after animation | 2 | 1 | 2 (x2) | 2 | 2 | 2 | 15 |
| 5 | All-reduce time for one gradient across eight link types | section | 2 | 0 | 2 (x2) | 1 | 1 | 0 | 8 |
| 6 | TP traffic against layer compute, scale-up link vs NIC | section | 2 | 0 | 2 (x2) | 2 | 2 (why TP stays in the NVLink domain) | 0 | 10 |
| 7 | Checks table against published figures (27 rows) | section | 0 | 2 (x2) | 2 (x2) | 1 | 2 | 0 | 11 |
| 8 | Ten predict-then-reveal drills, answers computed by the same functions | section | 1 | 1 | 2 (x2) | 1 | 2 | 0 | 10 |

## Rejected
- Per-chip price/performance leaderboard: prices are list prices for three providers only; would invite a ranking the data cannot support. Prices appear only as the cost line.
- MoE expert-parallel memory model in the training calculator: the Distributed Training page's Layout calculator owns EP; here MoE training memory is flagged as pessimistic and linked.
- Latency term (alpha) in the all-reduce model: no sourced per-hop latency for each fabric; stated as excluded.
- Live NCCL or GPU measurements: no NVIDIA GPU available; the Roofline lab measures the M1 Pro instead.
- Interconnect topology drawings (fat tree, torus): belong to the Reading tab and the Chip atlas.

## Data and sources (all fetched 2026-10-05)
- Model shapes: `inputs/cfg_*.json` from Hugging Face (Llama 3.1 via unsloth mirrors because Meta's repos are gated; the 405B mirror `unsloth/Meta-Llama-3.1-405B-bnb-4bit` has 8 KV heads like the paper's Table 3, while `hugging-quants/...-Instruct-AWQ-INT4` has 16, the FP8 instruct variant; kept as evidence, not used).
- Parameter recounts (model.py): Llama 3.1 8B 8,030,261,248; 70B 70,553,706,496; 405B 405,853,388,800; Qwen3 32B 32,762,123,264; Qwen3 235B-A22B 235,093,634,560 total, 22,190,763,520 active; DeepSeek-V3 671,026,419,200 total (equals the Distributed Training page), 37,552,297,472 active (that page: 37,552,282,624, a 14,848 difference from router-bias counting); gpt-oss-120b 116,829,156,672 (card 116.83B), active 5.71B with both embeddings, 5.13B without the input embedding (card 5.13B).
- Chips: the shared facts file the Chip atlas also reads (H100, H200, B200, GB200 NVL72 per GPU, MI300X, RTX 5090, TPU v6e, TPU7x, M1 Pro measured). Links per direction are half the bidirectional vendor figure. MI300X 448 GB/s = 7 x 64, only if every link is used. PCIe 5.0 x16 63 GB/s derived. 400 Gb/s NIC per GPU is the assumed scale-out (Llama 3: 400 Gbps RoCE; AWS p5: 3,200 Gbps per 8 GPUs; HGX B200: 0.8 TB/s per board, bidirectional reading).
- Prices: Lambda on demand (8x H100 SXM $3.99, 8x B200 $6.69 per GPU-hour), Google Cloud on demand per chip-hour (TPU7x us-central1 $12.00, v6e us-east1 $2.70). AWS p5 page lists no price.
- Formulas: Korthikanti et al. 2022 (arXiv 2205.05198) activations; PaLM Appendix B MFU and 12 L H Q T; nccl-tests PERFORMANCE.md bus bandwidth; NVFP4 4.5 bits (NVIDIA blog); MXFP4 4.25 bits (32-value blocks, E8M0 scale); QLoRA 4.127 bits.

## Checks (recompute.py output, all shown in the tab)
- Reproduce independently: Llama 3 405B 3.80e25 vs 3.8e25; PaLM 45.70% and 46.23% vs 45.7% and 46.2%; MT-NLG 29.77% vs printed 29.7% (truncation); Llama 3 Table 4 430 and 380 TFLOPs as 43.5% and 38.4% vs 43% and 38%.
- Residuals shown, not fitted: Table 4's 400 TFLOPs is 40.4% against printed 41%; Chinchilla 6ND 5.88e23 vs 5.76e23 (+2%); Gopher 6ND 5.04e23 vs 5.76e23 (-12.5%, different accounting in the paper's Appendix F); Llama 3.1 card GPU hours imply 13.9% / 25.5% / 34.6% average MFU for 8B / 70B / 405B (below Table 4's 38 to 43%: the hours cover more than steady state); DeepSeek-V3 35.1% against BF16 peak, 17.6% against FP8 peak (assumes H800 compute equals H100 SXM, not stated by DeepSeek).
- By construction: DeepSeek-V3 $5.576M at the paper's own $2/hour.

## Methodology gaps noticed
- A calculator page needs a rule for "efficiency" inputs: we expose MFU and an efficiency slider as user inputs and label every default (40% MFU is "assumed, typical").
- The Methodology has no rule for list prices from different providers: kept separate by provider and dated, never averaged.

## How to rerun
`python3 recompute.py && python3 gen_data.py && node check_calc.mjs && node check_prose.mjs` (from this folder; system Python, no packages). Then `sh ../build.sh`.
