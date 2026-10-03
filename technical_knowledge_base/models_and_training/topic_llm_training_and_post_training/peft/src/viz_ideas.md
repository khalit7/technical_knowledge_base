# Visualisation ideas: Parameter-Efficient Fine-Tuning (PEFT)

The question the page keeps returning to: **what do you train instead of the whole model, and what does that cost you (parameters, quality, forgetting, serving)?**

Ownership fixed before scoring: the parent (Topic: llm-training-and-post-training) owns the bytes-per-parameter memory calculator (full fine-tune, LoRA, QLoRA), linked not rebuilt. The LoRA paper page owns the LoRA-against-adapter animation, the GPT-3 parameter calculator and the known-answer LoRA trainer; the QLoRA paper page owns NF4 built and measured on LLaMA weights. Quantization and Precision owns number formats; Alignment owns the post-training stages.

Scores: Q quantity moved by the reader, R reproduces a stated figure (x2), C computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, P measures the central question, N new against the page, its neighbours and the main explainers, A step-by-step animation against the method it replaced; minus build cost.

| # | Idea | Q | R | C | S | M | P | N | A | Cost | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One real matrix, full fine-tuning against LoRA, animated**: SmolLM2-135M layer 14 q_proj; LoRA steps (frozen W0, B = 0 so ΔW = 0, α/r, trained ΔW as the best rank-r approximation of the real full fine-tune update, merge) against full fine-tuning steps (all entries trained, the real Instruct-minus-base update, its spectrum, ship a full copy); rank 1/4/16/64; counters (trainable, training state, rank, share held, bytes shipped, extra multiply-adds); cumulative-energy curve | 2 | 1 (x2: its share-held numbers are measured, not published; reproduces Biderman's qualitative "full fine-tuning is high rank") | 2 (x2) | 2 | 2 (a full fine-tune's update is not low-rank; that does not mean LoRA fails) | 2 | 2 (the LoRA page animates one token on a toy; nobody shows a real update) | 2 | -2 | 17 | Reading, LoRA | built |
| 2 | **Trainable-parameter calculator** across 9 methods from real config.json shapes (Llama 3 8B, Qwen3-8B, Mistral 7B v0.3, Qwen3-30B-A3B, LLaMA 7B/13B, GPT-3, SmolLM2), rank, targets, bottleneck, tokens; per-matrix breakdown; PEFT-library column; 7 presets reproducing published counts | 2 | 2 (x2) | 2 (x2) | 1 | 2 (VeRA's Table 1 counts its frozen shared pair; "3M" is 2.62M) | 2 | 1 (LoRA page has GPT-3 only) | 0 | -1 | 17 | Own tab | built |
| 3 | **Layer x matrix heatmap of the real update** (210 matrices: rank for 90%, relative size, share at rank 16), click for detail, medians table | 1 | 1 (x2: matches Biderman's "MLP higher rank than attention") | 2 (x2) | 2 | 1 | 1 | 2 | 0 | -1 | 13 | Reading, How low is a real update? | built |
| 4 | **Learns less, forgets less**: Biderman Tables S1 to S8 as target skill against forgetting average, stepped checkpoint by checkpoint, four experiments, LoRA r 16/64/256 against full | 1 | 2 (x2: transcribed table values) | 2 (x2) | 2 | 1 (CPT against IFT) | 2 | 1 (the paper plots the same data separately per axis) | 1 | -1 | 15 | Reading, Against full fine-tuning | built |
| 5 | **DoRA against LoRA, one 2-D column, animated** (chord path with the length dipping 13% against an arc at constant length with a separate m bar) | 1 | 0 | 1 | 2 | 1 | 1 | 1 | 2 | -1 | 8 | Reading, DoRA | built, labelled illustrative |
| 6 | **Multi-adapter serving**: S-LoRA layout diagram plus Table 3 bars for S1, S2, S4 | 1 | 2 (x2: "up to 4x" = 3.9x and "30x" = 32x recomputed) | 2 (x2) | 1 | 1 | 1 | 2 | 0 | -1 | 12 | Reading, Serving | built |
| 7 | DoRA's ΔM/ΔD scatter recomputed on the SmolLM2 update | | | | | | | | | | | | rejected: the paper's measure is across training checkpoints of one layer; with only the final checkpoint the across-layer correlation (q 0.43, v 0.90, positive) is a different quantity and would look like a contradiction it is not |
| 8 | LoRA against adapter latency animation, GPT-3 parameter calculator alone, in-browser LoRA trainer | | | | | | | | | | | | rejected: owned by the LoRA paper page; linked |
| 9 | Memory calculator (bytes per parameter, full against LoRA against QLoRA) | | | | | | | | | | | | rejected: owned by the parent's Machinery section; linked |
| 10 | NF4 codebook explorer | | | | | | | | | | | | rejected: owned by the QLoRA paper page and Quantization and Precision |
| 11 | LoRA Without Regret curves (loss against LR, rank) | | | | | | | | | | | | rejected: published only as images; their numbers (10x LR, 2/3 FLOPs, 320,000 bits against 3M) are recomputed in prose instead |
| 12 | Training a real LoRA on SmolLM2 to compare with its full fine-tune | | | | | | | | | | | | rejected for now: would need the SFT and DPO data and hours of CPU; idea 1's best-rank-r bound plus the published studies answer the question honestly |

## Data and formulas

- `delta_probe.py`: SmolLM2-135M and SmolLM2-135M-Instruct `model.safetensors` (bf16, 269 MB each, downloaded to scratch, not committed), parsed by hand; for every layer and linear matrix: ‖ΔW‖/‖W0‖, singular values of ΔW, ranks for 50/90/99% of Σσ², energy at r = 1..256, DoRA's ΔM and ΔD; for layer 14 q_proj the full spectra and a 48 x 48 crop of W0, ΔW and its rank 1/4/16/64 truncated SVDs. Output `inputs/delta_probe.json` (230 KB). The page ships a 32 x 32 crop as int8.
- `peft_counts.py`: PEFT 0.21.2 with transformers 5.18, every model built empty from its config, `get_nb_trainable_parameters()` for 11 configurations. `inputs/peft_counts.json`.
- `recompute.py`: LoRA r(din + dout), DoRA + dout, LoRA-FA r dout, VeRA (dout + r) [+ 2 dmax r shared], (IA)³ (k or q width + v width + ff), prompt n d, prefix n L 2 KV hd, Houlsby 2L(2dm + m + d) (LoRA §5.1). Writes `inputs/recompute.json` and `parts/20_js_data.js`.
- Biderman et al. Tables S1 to S8 from the arXiv HTML v2 (`inputs/biderman2024_tables.txt`); S-LoRA Tables 1 and 3 from the arXiv HTML v3 (`inputs/slora_tables.txt`).

## Defaults that reproduce something (all independently, from configs)

- PEFT library: 76 of 76 counts identical across 6 models (SmolLM2's total excluded: the empty model is untied; MoE all-linear LoRA excluded: PEFT wraps fused expert tensors differently).
- LoRA Tables 4/15: GPT-3 LoRA 4.7M, 9.4M, 18.8M, 37.7M, 301.9M; Adapter(H) 7.1M, 21.2M, 304.4M; prefix-embedding 3.2M.
- DoRA Table 1: LLaMA-7B 0.83% (LoRA r = 32), 0.84% (DoRA, 0.846 truncated), 0.43% (DoRA†); LLaMA-13B 0.67%.
- VeRA Table 4: LoRA r = 64 all linear 159.9M and 250.3M; VeRA r = 1,024 1.6M and 2.4M. VeRA Table 1 GPT-3: 2.4M at r = 1, but 2.8M and 8.7M at r = 16 and 256 only when the frozen shared pair (2dr) is counted.
- LoRA Without Regret: rank-1 all-matrix LoRA on Llama 3.1 8B 2,621,440, their "3M" rounded; FLOPs (2N² + 6NR)/3N² = 67.4% at R = 16.
- S-LoRA: 8.05 / 2.04 = 3.9x ("up to 4 times"), 7.99 / 0.25 = 32x ("up to 30x").

## Inspiration

DeepSeek MLA explainer (before/after, counters, to scale: B and A drawn at true thickness against the 576 x 576 square); the LoRA page's animation (not repeated); the parent's RD.anim controller (reused).

## What the methodology lacked

A rule for "best possible" overlays: when a method cannot reproduce a real artifact exactly (LoRA cannot make a full-rank update), showing its optimal approximation (truncated SVD) is honest only with the caveat that the method would find a different solution, not a compressed copy. Also: published parameter tables can count frozen shared tensors (VeRA); recompute both ways before calling a mismatch.
