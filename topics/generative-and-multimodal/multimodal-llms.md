# Multimodal LLM Architectures

Last updated: 2026-08-24

## Best resources

- Sebastian Raschka, [Understanding Multimodal LLMs](https://magazine.sebastianraschka.com/p/understanding-multimodal-llms): the clearest architecture comparison (decoder-only + adapter vs cross-attention vs unified).
- Zhang et al., [MM-LLMs: Recent Advances in MultiModal Large Language Models](https://arxiv.org/abs/2401.13601): survey that fixed the standard component vocabulary (modality encoder, input projector, backbone, output projector).
- Hugging Face, [Vision Language Models (better, faster, stronger)](https://huggingface.co/blog/vlms-2025): open-model landscape and practical trends.
- Chameleon team, [Chameleon: Mixed-Modal Early-Fusion Foundation Models](https://arxiv.org/abs/2405.09818): the reference for token-level early fusion.

## Three integration levels (from the notes, tightened)

1. **LLM + tools (shallow)**: external modules translate other modalities to text
   (Whisper transcribes, a captioner describes, a diffusion API generates). Cheap,
   composable, lossy: the LLM never sees the raw signal, so prosody, layout, and fine
   visual detail are gone. This is just tool-calling, still the right answer for many
   products.
2. **LLM + adapters (modular)**: frozen or lightly-tuned pretrained encoders are bolted
   onto a pretrained LLM through trainable connector layers. Efficient (train only the
   connector, then optionally unfreeze), and the dominant open-VLM recipe (LLaVA
   lineage).
3. **Unified / native (deep)**: one model trained on all modalities together, often from
   early pretraining (Gemini, GPT-4o and successors). Best cross-modal transfer and
   latency (no pipeline), highest cost.

## Anatomy of an adapter-style multimodal LLM

- **Modality encoders**: turn raw signals into embeddings; ViT/SigLIP/CLIP for vision
  (see [vision-encoders.md](vision-encoders.md)), Whisper-style or codec encoders for
  audio.
- **Input projector (connector)**: aligns encoder embeddings with the LLM token space.
  Designs: linear/MLP projector (LLaVA; the boring one won), resampler/Q-Former
  (learned queries compress to a fixed token budget; BLIP-2, largely abandoned), or
  cross-attention layers interleaved into the LLM (Flamingo, Llama 3.2 Vision) which
  keep text-only performance intact but add parameters.
- **LLM backbone**: does the actual reasoning over the fused sequence.
- **Output side**: for text-out models, nothing special. For generation, either an
  **output projector into a diffusion decoder** (learned queries condition an image
  model), or **discrete image/audio tokens** the LLM emits directly, decoded by a
  VQ-VAE/codec decoder (see below).

Typical training: (1) connector alignment on caption pairs with encoder and LLM frozen;
(2) full or partial unfreeze with mixed instruction data; (3) preference/RL tuning,
increasingly with verifiable multimodal rewards.

## Early fusion vs late fusion

- **Late fusion (adapter style)**: pretrained unimodal parts joined afterwards. Cheap,
  modular, and the encoder's biases cap what the LLM can see.
- **Early fusion (native)**: all modalities enter as tokens in one sequence from
  pretraining; Chameleon (VQ tokens), Fuyu (raw patch embeddings). Cleaner scaling
  story, harder to train (Chameleon documents the instabilities), and text-only quality
  can regress without careful data mixing. Frontier labs converged on native
  multimodality; open models are mostly still late fusion because it lets them reuse
  strong text-only backbones.

## Image tokenisation approaches (the crux for any-to-any)

- **Continuous embeddings** (encoder + projector): best for understanding; cannot be
  sampled, so no generation.
- **Discrete VQ tokens**: one vocabulary for understanding and generation (Chameleon,
  Emu3); generation works but understanding lags continuous encoders at equal compute.
- **Decoupled paths**: separate understanding encoder (SigLIP-class) and generation
  tokenizer/decoder sharing one backbone: Janus-Pro, BAGEL; currently the best
  open-model compromise. GPT-image and Gemini's native image generation are
  closed-model versions of AR-planned, diffusion-decoded generation.

## Landscape (Aug 2026)

- **Native multimodal frontier**: GPT-5-class (text+vision+audio in, text+image+audio
  out), Gemini 3 (strongest pure-vision benchmarks, long video context), Claude
  Opus/Sonnet 4.x (vision in, text out; no native image gen). Realtime voice modes are
  omni models with streaming audio tokens (see [speech-and-audio.md](speech-and-audio.md)).
- **Open VLMs**: **Qwen3-VL** (235B-A22B flagship rivals proprietary on OCR, grounding,
  video; strong small variants), **InternVL3.5** (cascade RL, resolution routing),
  Llama vision line (cross-attention adapters), Gemma 3, Pixtral, Molmo, MiniCPM-V for
  edge. Gap to closed models on understanding benchmarks: roughly 5-10 points and
  shrinking.
- **Omni / any-to-any open models**: Qwen3-Omni / Qwen2.5-Omni (thinker-talker design:
  backbone reasons, a talker head streams speech tokens), MiniCPM-o; unified
  understanding+generation research models: Janus-Pro, Emu3, BAGEL.
- **Trends**: RL on multimodal verifiable tasks (grounding, GUI agents), native
  resolution everywhere, visual token compression (DeepSeek-OCR's optical compression),
  and VLMs as the base for computer-use and robotics (VLA) stacks.

## Interview-ready summary

Three levels: tools (translate to text), adapters (encoder + projector + LLM; the open
default), native (one model, all modalities, the frontier default). Know the four-part
anatomy (encoder, projector, backbone, output side), the projector design space (MLP vs
resampler vs cross-attention), and the tokenisation trade-off: continuous embeddings
understand best, discrete tokens generate; decoupled dual-path models do both.
