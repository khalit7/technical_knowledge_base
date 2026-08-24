# DeepSeek

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) and repo [summary](../../../papers/2024-12_deepseek-v3/summary.md): the modern open-MoE template, unusually complete on infra.
- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) and repo [summary](../../../papers/2025-01_deepseek-r1/summary.md): the open reasoning recipe.
- [DeepSeek-V4 report](https://arxiv.org/pdf/2606.19348) ("Towards Highly Efficient Million-Token Context Intelligence"): current architecture.
- [The Salt: DeepSeek-V4, the interesting part is the attention](https://thesalt.substack.com/p/deepseek-v4-the-interesting-part): best V4 attention walkthrough.
- [DeepSeek HuggingFace org](https://huggingface.co/deepseek-ai): all weights and model cards.

## Lineage

- **DeepSeek LLM / Coder (2023)**: High-Flyer (quant fund) spinoff; early Llama-style
  dense models.
- **V2 (May 2024)**: invented **MLA** (multi-head latent attention) and **DeepSeekMoE**
  (fine-grained + shared experts); started the Chinese API price war.
- **V3 (Dec 2024)**: 671B/37B active; MLA + 256-expert MoE (8 active + 1 shared),
  aux-loss-free bias-based load balancing, multi-token prediction, FP8 mixed-precision
  training; ~$5.6M compute cost claim on 2,048 H800s shook the industry.
- **R1 (Jan 2025)**: RL (GRPO) on V3 base produced o1-class reasoning; R1-Zero showed
  emergent reflection from pure RL; MIT license plus distilled 1.5B-70B models. Triggered
  the "DeepSeek moment" (Nvidia's record one-day selloff).
- **V3.1 (Aug 2025)**: merged chat + reasoning into one hybrid-thinking checkpoint.
- **V3.2-Exp (Sep 2025)**: introduced **DSA** (DeepSeek Sparse Attention): a lightning
  indexer selects top-k KV entries per query; halved long-context costs.
- **V4 (Apr 2026)**: current family. Two MoE models: **V4 Pro** (1.6T total/49B active)
  and **V4 Flash** (284B/13B). Hybrid compressed attention: CSA (groups of 4 tokens) +
  HCA (groups of 128) + low-rank query/output projections shrink KV cache to ~2% of a
  vanilla transformer at 1M-token context. Pro leads open coding (~80.6% SWE-bench
  verified); Flash leads browsing-style agentic evals at very low cost.
- Added 2026-08-24: DeepSeek released **DeepSeek-v4-flash-vision-exp** (Aug 21), an
  experimental vision variant of V4 Flash: images are normalized to at most 384 tokens
  each, up to 600 images per request. It is currently the only DeepSeek model accepting
  image input. [API docs](https://api-docs.deepseek.com/guides/vision/)

## Training approach highlights

- Efficiency as ideology: every generation pairs an architecture idea (MLA, fine-grained
  MoE, MTP, DSA, CSA/HCA) with infra co-design (FP8, DualPipe, DeepEP all-to-all kernels,
  prefill/decode disaggregation), then publishes it.
- RLVR at scale via GRPO (their invention, from DeepSeekMath); hybrid thinking modes
  since V3.1.
- Open MIT-ish licensing, weights + tech reports (not data); prices set the floor for
  the whole market.

## Current models (Aug 2026)

| Model | Params | Notes |
|---|---|---|
| V4 Pro | 1.6T / 49B active | Open-weight coding/reasoning leader, 1M context |
| V4 Flash | 284B / 13B active | Price-performance and agentic browsing |
| R1 (legacy) | 671B / 37B | Historic; reasoning now folded into V-line |

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): R1's role in the reasoning era.
- [../moe-models.md](../moe-models.md): DeepSeekMoE, aux-loss-free balancing.
- [../_comparisons/llm-architecture-gallery.md](../_comparisons/llm-architecture-gallery.md): MLA/DSA/CSA in context.
