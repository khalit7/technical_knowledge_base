# Mixtral of Experts

⏱ 9 min read · +~2h 55m resources

- **Authors/lab**: Mistral AI (Jiang, Sablayrolles, Roux, Mensch et al.)
- **Date**: January 2024 (arXiv v1 2024-01-08; weights released via magnet link 2023-12-08)
- **Links**: [arXiv 2401.04088](https://arxiv.org/abs/2401.04088) (~45 min) | [Blog](https://mistral.ai/news/mixtral-of-experts/) (~10 min) | [Code (mistral-src)](https://github.com/mistralai/mistral-src) (repo, ~20 min for the README and entry path)
- Added to KB: 2026-08-24

## Best resources

- [Mixture of Experts Explained (Hugging Face blog)](https://huggingface.co/blog/moe) (~30 min): the canonical MoE explainer, written for the Mixtral release; covers routing, load balancing, expert parallelism, and MoE fine-tuning gotchas (instability, router sensitivity) directly relevant to anyone tuning these models.
- [A Visual Guide to Mixture of Experts (Maarten Grootendorst)](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts) (~30 min): the best diagrams of the router, top-K gating, and capacity concepts; ends with a Mixtral walkthrough.
- [Mixture-of-Experts LLMs deep dive (Cameron Wolfe)](https://cameronrwolfe.substack.com/p/moe-llms) (~40 min): traces the lineage from sparsely-gated MoE and Switch through Mixtral to modern fine-grained designs, with the math for sparse vs active parameter counts.
- [Mistral's own release post](https://mistral.ai/news/mixtral-of-experts/) (~10 min, the same post as the Links line): concise statement of the cost-performance claim and the serving story (vLLM + Megablocks, Skypilot deployment).

## Problem

By late 2023 the open-weights quality frontier was Llama 2 70B: strong, but with 70B parameters touched for every token, so inference cost scaled with quality. Sparse MoE had long promised to decouple parameter count from per-token compute (Shazeer 2017, GShard, Switch), but no open-weights MoE had reached state-of-the-art quality; MoE was mostly a Google-internal technique with a reputation for training instability and routing complexity. Mixtral asks: can a small, simple SMoE recipe (few large experts, top-2 routing, no capacity-factor drama) deliver 70B-class quality at 13B-class compute, released fully open under Apache 2.0?

## Method

**Architecture.** Mixtral 8x7B is Mistral 7B with two changes: native 32k context, and every FFN sub-block replaced by a Mixture-of-Experts layer. Config: dim 4096, 32 layers, 32 heads with 8 KV heads (GQA), hidden_dim 14336, vocab 32000, num_experts 8, top_k 2. Because attention, embeddings, and norms are shared while only FFNs are replicated 8x, the totals are 47B sparse parameters but only 13B active per token.

**Routing.** Per layer, per token, a linear router W_g produces 8 logits; the output is y = sum_i Softmax(Top2(x . W_g))_i * SwiGLU_i(x), i.e. softmax over the top-2 logits only, weighting two SwiGLU experts. K=2 is the compute knob: growing n (total experts) raises capacity at roughly constant FLOPs, growing K raises active compute. The design is close to GShard except that every FFN is an MoE layer (GShard replaced every other) and the second expert uses the same plain top-K gating rather than GShard's stochastic second-choice scheme. Notably there is no discussion of auxiliary load-balancing losses or capacity factors in the paper; the recipe presented is deliberately minimal.

**Systems view.** Compute cost tracks active parameters (13B), memory cost tracks sparse parameters (47B, still under Llama 2 70B). Expert FFNs run as block-sparse matmuls via Megablocks kernels (which Mistral upstreamed into vLLM), and the model shards naturally with expert parallelism, where load balancing across GPUs becomes the operational concern. SMoE overhead means the architecture shines at high batch sizes (arithmetic intensity) while still giving low latency at small batches vs a dense 70B.

**Long context.** Trained multilingually at 32k context: 100% passkey retrieval accuracy at any depth and length up to 32k, and monotonically decreasing perplexity on proof-pile as context grows, so the long context is genuinely used, not just tolerated.

**Routing analysis (section 5, the most interesting part).** Measuring expert assignment over The Pile subsets at layers 0, 15, and 31:

- **No domain specialisation.** Expert selection distributions are nearly identical for ArXiv, PubMed, PhilPapers, Github, etc. Only DM Mathematics deviates marginally, attributed to its synthetic, narrow distribution, and mostly at the first and last layers where hidden states correlate with input/output embeddings. The folk intuition of a "math expert" or "code expert" is wrong for this model; experts specialise on syntax, not topic.
- **Syntactic structure.** Tokens like 'self' in Python or 'Question' in English consistently route to the same expert across occurrences; indentation tokens in code cluster on the same experts, especially at first and last layers.
- **Positional locality.** Consecutive tokens repeat expert assignments far more than chance: at layers 15 and 31, the same first-choice expert repeats for roughly 23-28% of consecutive tokens (random baseline 12.5%), and first-or-second-choice overlap hits roughly 62-67% (baseline about 46%). Layer 0 is near random. Practical implications: temporal locality is exploitable for caching and speculative expert prefetch, but it also causes expert over-subscription hotspots under expert parallelism.

**Mixtral 8x7B Instruct.** SFT on instruction data followed by DPO on paired feedback. No RLHF/PPO anywhere in the pipeline, an early large-scale validation of the SFT+DPO recipe.

## Results

- **vs Llama 2 70B (13B active vs 70B)**: matches or beats it on almost everything. MMLU 70.6 vs 69.9, GSM8K (8-shot maj@8) 74.4 vs 69.6, MATH 28.4 vs 13.8, MBPP 60.7 vs 49.8, HumanEval 40.2 vs 29.3. Only comprehension-style benchmarks (BoolQ/QuAC) and WinoGrande/HellaSwag stay marginally with Llama. Math and code are the blowouts.
- **vs GPT-3.5**: MMLU 70.6 vs 70.0, MBPP 60.7 vs 52.2, GSM8K (5-shot) 58.4 vs 57.1; effectively at parity or above.
- **Multilingual**: clearly beats Llama 2 70B on French, German, Spanish, Italian (ARC-c, HellaSwag, MMLU), credited to deliberately upsampled multilingual pretraining data that the spare capacity can absorb without hurting English.
- **Instruct**: MT-Bench 8.30; LMSys Arena Elo 1121 (Dec 2023), above GPT-3.5-Turbo (1117), Claude-2.1 (1117), Gemini Pro (1111), and Llama 2 70B chat (1077); best open-weights model at release by a large margin.
- **Bias**: higher BBQ accuracy than Llama 2 70B (56.0% vs 51.5%), more positive and lower-variance BOLD sentiment.

The headline: Llama 2 70B / GPT-3.5 quality with 5x fewer active parameters, fully open under Apache 2.0.

## Why it matters

Mixtral was the first open-weights MoE at state-of-the-art quality, and it single-handedly moved MoE from "exotic Google technique" to the default architecture for efficient frontier models. The 8x7B release (dropped as a bare magnet link, a week before the paper) kicked off the open-MoE era: DBRX, Qwen-MoE, DeepSeek-V2/V3, Llama 4, and gpt-oss all follow the sparse-FFN template it popularised. It validated three recipes at once: coarse-grained top-2 SMoE as a cost-performance win, SFT+DPO as a complete post-training pipeline (no PPO), and open weights plus upstreamed inference kernels (vLLM/Megablocks) as a release strategy. Its routing analysis remains the standard citation for the finding that vanilla MoE experts do not specialise by domain, which later motivated fine-grained expert designs (DeepSeekMoE's many small experts plus shared experts) explicitly aimed at forcing more specialisation. The active-vs-sparse parameter distinction it foregrounded is now the vocabulary everyone uses to price MoE inference.

## Connections

- [papers/2021-01_switch-transformer](../2021-01_switch-transformer/summary.md): the top-1 MoE predecessor; Mixtral's top-2, every-layer, no-fuss variant is what finally made the idea land in open weights.
- [papers/2024-12_deepseek-v3](../2024-12_deepseek-v3/summary.md): the next generation of open MoE; fine-grained experts, shared experts, and aux-loss-free balancing respond directly to the coarse-expert, no-domain-specialisation regime documented here.
- [papers/2023-05_dpo](../2023-05_dpo/summary.md): Mixtral Instruct was among the first flagship models aligned with SFT+DPO only.
- [papers/2023-09_vllm-pagedattention](../2023-09_vllm-pagedattention/summary.md): Mistral upstreamed Megablocks-based MoE kernels into vLLM to make the model servable at release.
- [papers/2017-06_attention-is-all-you-need](../2017-06_attention-is-all-you-need/summary.md): the base decoder-only transformer whose FFN sub-block the MoE layer replaces.
- Topics: `topics/llms`, `topics/llm-training-and-post-training`, `topics/inference-and-serving`.
