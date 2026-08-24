# Google DeepMind: Gemini and Gemma

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog): authoritative dated model list.
- [Gemini (Wikipedia)](https://en.wikipedia.org/wiki/Gemini_(language_model)): well-maintained lineage overview.
- [Gemini 1.5 tech report](https://arxiv.org/abs/2403.05530): the long-context MoE design notes (most architectural detail Google has published for Gemini).
- [Gemma 3 tech report](https://arxiv.org/abs/2503.19786): open-family architecture (sliding-window 5:1, distillation recipe).
- [Gemma (Wikipedia)](https://en.wikipedia.org/wiki/Gemma_(language_model)): open-family lineage including Gemma 4.

## Lineage: Gemini (closed)

- **PaLM/PaLM 2 era (2022-2023)**: TPU-scale dense models; merged Brain + DeepMind built
  Gemini as the successor.
- **Gemini 1.0 (Dec 2023) -> 1.5 (Feb 2024)**: 1.5 Pro was the long-context breakthrough
  (1M-10M tokens, sparse MoE, native multimodal from scratch: text, image, audio, video).
- **2.0 (Dec 2024) -> 2.5 (Mar 2025)**: 2.5 Pro made "thinking" default with controllable
  budgets; Flash/Flash-Lite tiers distilled for price-performance; agentic push (Project
  Mariner, Jules).
- **Deep Think (Jul 2025)**: parallel-thinking variant; official IMO gold standard
  (35/42, 5 of 6 problems).
- **Gemini 3 (Nov 2025) -> 3.1 Pro (Apr 2026)**: current flagship line; 3.1 Pro rolled
  out globally with stronger reasoning for complex coding and data analysis. Preferred
  for reasoning over long documents among the Aug 2026 frontier five.
- **Gemini 4**: in pretraining as of Aug 2026, no announced date.

## Lineage: Gemma (open)

- **Gemma 1/2 (2024)**: small open distillates of Gemini research.
- **Gemma 3 (Mar 2025)**: 1B-27B, multimodal, 128K context, 5:1 sliding-window/global
  attention; 3n variants for on-device.
- **Gemma 4 (Apr 2026)**: current open family, notably including an MoE small model
  (gemma-4-26b-a4b) alongside dense gemma-4-31b and E2B/E4B edge variants; strong
  open-weight small-model baseline.

## Training approach highlights

- Everything trains on TPU pods (JAX/Pathways); Google is the only frontier lab fully
  off NVIDIA for training.
- Native multimodality from pretraining (not bolted-on encoders) has been the
  differentiator since 1.0; audio and video in, image out via integrated generation.
- Flash tiers are distilled from Pro; Gemma is the open end of the same distillation
  pipeline.
- Deep integration surface: Search (AI Overviews/Mode), Workspace, Android, Vertex;
  Gemini app passed 750M users (2026).

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Gemini 3.1 Pro | Flagship; long-document reasoning leader |
| Gemini 3 Flash / Flash-Lite | Price-performance and latency tiers |
| Deep Think mode | Parallel test-time compute for hardest problems |
| Gemma 4 (26b-a4b MoE, 31b, edge) | Open weights |

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): thinking budgets, Deep Think.
- [../moe-models.md](../moe-models.md): Gemini 1.5's role in mainstreaming frontier MoE.
- TPU stack: [topics/jax-and-tpu](../../jax-and-tpu/).
