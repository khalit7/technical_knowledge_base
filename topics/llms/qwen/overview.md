# Alibaba: Qwen

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Qwen3 tech report](https://arxiv.org/abs/2505.09388) and repo [summary](../../../papers/2025-05_qwen3/summary.md): hybrid thinking modes and the dense+MoE ladder.
- [Qwen blog](https://qwen.ai/blog): primary source for the fast release cadence.
- [Qwen HuggingFace org](https://huggingface.co/Qwen): the largest open-weight catalogue of any lab.
- [Qwen lineage and roadmap 2026 (Presenc)](https://presenc.ai/research/alibaba-qwen-model-lineage-and-roadmap-2026): dated family tree through Qwen3.8.
- [Qwen3.8-Max announcement (Alibaba)](https://www.alibabagroup.com/en-US/document-2021044032125272064): current flagship.

## Lineage

- **Qwen 1/1.5/2/2.5 (2023-2024)**: a full dense ladder (0.5B-72B+) at every release,
  Apache 2.0, strong multilingual; plus Coder, VL, Audio, Math variants. Qwen2.5-72B and
  Coder-32B became default open bases; QwQ-32B was their first reasoning model.
- **Qwen3 (Apr 2025)**: 0.6B-235B (MoE 235B-A22B, 128 experts/8 active, no shared);
  single checkpoints with think/no-think switching and thinking budgets; 36T-token
  pretraining. Later 2507 updates split Instruct/Thinking; Qwen3-Coder 480B.
- **Qwen3-Next (Sep 2025)**: 80B-A3B hybrid: Gated DeltaNet linear attention 3:1 with
  full attention, ultra-sparse MoE; the efficiency testbed for what followed.
- **Qwen3-Max (2025)**: 1T+ closed flagship; Qwen3-VL line carried open vision.
- **Qwen3.5 (Feb 2026)**: 397B open-weight flagship aimed at the "agentic AI era";
  benchmarked on par with US frontier models of the moment.
- **Qwen3.8 (Aug 2026)**: current generation. **Qwen3.8-Max**: 2.4T-parameter sparse MoE
  with hybrid attention, native multimodal, 1M context, top-5 Text Arena / top-2 Vision
  Arena. On Aug 12 Alibaba open-weighted **Qwen3.8-2.4T-A95B**, the first open Max-class
  flagship; Aug 14 added **Qwen3.8-27B**: dense, Apache 2.0, native image+video VL,
  262K context.
- Added 2026-08-24: Qwen3.8-27B is the local model of the moment: Simon Willison finds
  it excellent but prone to overthinking, and XDA handed it a reverse-engineering job it
  finished in 30 minutes.
  [Simon Willison](https://simonwillison.net/2026/Aug/16/qwen-38-27b/),
  [XDA](https://xda-developers.com/qwen-3-8-27b-reverse-engineering-job-frontier-model/)

## Training approach highlights

- Breadth strategy: every size class, every modality, permissive Apache 2.0; Qwen bases
  are the most-finetuned weights in the ecosystem (the default for research and for
  distillation targets, including R1-distills).
- Heavy synthetic data from prior generations (Math/Coder pipelines bootstrapping the
  next release); hybrid reasoning with controllable budgets since Qwen3.
- Architecture experimentation flows Next -> Max -> mainline (linear attention, high
  sparsity MoE, hybrid attention in 3.8).
- Cloud strategy: Qwen powers Alibaba Cloud Model Studio; open weights drive enterprise
  adoption funnels in China and increasingly globally.

## Current models (Aug 2026)

| Model | Params | Notes |
|---|---|---|
| Qwen3.8-Max / 2.4T-A95B | 2.4T / 95B active | Flagship; open weights since Aug 2026 |
| Qwen3.8-27B | 27B dense | Apache 2.0, native VL, best small all-rounder |
| Qwen3.5-397B | 397B MoE | Previous open flagship, still widely served |
| Qwen3 / Qwen3-VL ladder | 0.6B-235B | Workhorse open bases everywhere |

## Cross-links

- [../moe-models.md](../moe-models.md), [../reasoning-models.md](../reasoning-models.md).
- Rivals in open weights: [../deepseek/overview.md](../deepseek/overview.md), [../moonshot-kimi/overview.md](../moonshot-kimi/overview.md), [../zhipu-glm/overview.md](../zhipu-glm/overview.md).
