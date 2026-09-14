# Encoder-Decoder Gemma and T5Gemma 2

⏱ 9 min read · +2h 35m resources

- **Authors**: Biao Zhang, Fedor Moiseev, Joshua Ainslie, Paul Suganthan, Min Ma, Surya Bhupatiraju, Fede Lebron, Orhan Firat, Armand Joulin, Zhe Dong (Google), and for T5Gemma 2, Biao Zhang, Paul Suganthan, Gaël Liu, Ilya Philippov et al. (Google DeepMind)
- **Date**: April 2025 (Encoder-Decoder Gemma, ICML 2025) and December 2025 (T5Gemma 2)
- **Links**: [arXiv:2504.06225](https://arxiv.org/abs/2504.06225) (45 min) | [arXiv:2512.14856](https://arxiv.org/abs/2512.14856), T5Gemma 2 (45 min) | [Google developers blog](https://developers.googleblog.com/en/t5gemma/) (10 min) | weights on Hugging Face: [t5gemma-2-270m-270m](https://huggingface.co/google/t5gemma-2-270m-270m), [1b-1b](https://huggingface.co/google/t5gemma-2-1b-1b) (model cards, ~10 min)

Filed as one page rather than two because the second paper is the same recipe extended, and reading them separately would repeat the method twice.

## Best resources

- [Encoder-Decoder Gemma](https://arxiv.org/abs/2504.06225) (45 min): the method paper. Read Sections 3, 5 and 6; the discussion section is where the ablations that matter live (bidirectional attention, cross-attention warmup, adaptation versus from scratch).
- [T5Gemma 2](https://arxiv.org/abs/2512.14856) (45 min): shorter, and the one to read if you care about long context or multimodality. Tables 4 and 5 are the whole argument.
- [Encoder-Decoder or Decoder-Only? Revisiting Encoder-Decoder Large Language Models](https://arxiv.org/abs/2510.26622) (45 min): the same group's scaling study, the companion that argues the architecture case on scaling grounds rather than on a released model.
- [Google developers blog](https://developers.googleblog.com/en/t5gemma/) (10 min): the fast version if you only want the shape of the result.

## Problem

The decoder-only architecture won, but the argument was never settled on the merits. An encoder-decoder splits parameters by function: an encoder that reads the input with bidirectional attention, and a decoder that writes the output with cross-attention over the encoder's representation. That split buys two things a single causal stack cannot offer. Bidirectional attention over the input, because there is no autoregressive constraint on something you are only reading. And **independent sizing of the two halves**, so you can pair a large encoder with a small decoder when understanding the input matters more than generating the output. The paper names summarisation as the case: deep understanding of the input matters, generation invents nothing.

The blocker was cost. Nobody was going to pretrain a competitive encoder-decoder from scratch when strong decoder-only checkpoints already existed at every size. So the question the paper actually asks is narrower and more useful: can you **adapt** an existing decoder-only checkpoint into an encoder-decoder, cheaply, and end up ahead?

## Method

**Architecture.** Kept as close to the source decoder-only model as possible, so that initialisation is mostly a copy. The encoder is architecturally identical to the decoder-only model with self-attention switched from causal to bidirectional. Each decoder block keeps its feed-forward network and self-attention unchanged and adds cross-attention with the same head count and head dimension, attending to the full encoder output.

**Initialisation.** The encoder is fully initialised from the decoder-only checkpoint, since it introduces no new weights. Decoder feed-forward and self-attention come from the corresponding layers. Cross-attention is the only genuinely new thing: in the balanced case (equal encoder and decoder) it is initialised from the self-attention weights, and in the unbalanced case (9B encoder, 2B decoder) it is initialised randomly and trained alone for a **warmup of K steps** with everything else frozen, before unfreezing. That warmup is load-bearing and sensitive: 1,000 steps is right, zero costs 0.7 points, and 5,000 costs 2.3.

**Objective.** Two options compared, and they do not agree. **PrefixLM**, which splits each sequence in half and predicts the second from the first, here carried with knowledge distillation from the Gemma 2 teacher. And **UL2**, a mixture of denoisers that varies mean span length and corruption rate across several settings and prefixes each example with a mode token, so one model learns short-span denoising, long-span denoising and prefix LM together. Adaptation ran on up to 2T tokens of the Gemma 2 pretraining mixture.

**T5Gemma 2** repeats this on Gemma 3, drops distillation (UL2 and UL2 plus distillation were within 0.4 points, and the data-loading overhead was not worth it), and adds three things. A frozen SigLIP vision encoder turning an image into 256 tokens that are fed to the encoder, so vision inherits bidirectional visibility for free. Positional interpolation for long context, pretrained at only 16K but evaluated to 128K. And two parameter-saving changes: **tied word embeddings** across encoder input, decoder input and decoder softmax, which costs nothing measurable and removes 10.5% of parameters, and **merged attention**, which concatenates the encoder output onto the decoder self-attention input so one attention module with shared weights does both jobs, saving 6.5% for about 0.3 points. A rejected variant is worth knowing: applying cross-attention only on global-attention decoder layers, one every six, looked like an obvious saving and cost 1.3 points.

## Results

**The objective choice splits by what you want.** UL2 gives better contextual representations and wins on SuperGLUE at most scales. PrefixLM with distillation gives better generative models and wins on the pretraining and instruction-tuning benchmarks, by up to 3.6 points at 9B-2B. There is no free combination: merging PrefixLM and UL2 checkpoints produced worse models, and two-stage switching gave mixed results in both directions.

**The gain arrives after instruction tuning, not before.** Adapted models are comparable or slightly better than their decoder-only counterparts at pretraining, and substantially better after instruction tuning: 9B-9B beats Gemma 2 9B by 1.4 on the pretraining benchmark and 4.9 after instruction tuning, and 2B-2B beats Gemma 2 2B by 1.8 and 7.1.

**The asymmetric result is the one to remember.** Gemma 9B-2B has similar generation latency to Gemma 2 2B and clearly better quality, beating the balanced 2B-2B by more than 3 points. On the GSM8K latency curve it sits where a 2B model sits and scores where a much larger model scores.

**Encoder-decoder wins SuperGLUE everywhere**, at every scale and under both objectives, which is the direct evidence for the richer-representation claim and is attributed to bidirectional self-attention.

**Three ablations settle likely objections.** Bidirectional encoder attention matters: keeping the encoder causal costs 4.1 and 4.7 points. The gain is not just extra compute: running Gemma 2 2B for another 6T tokens reaches 48.57 against the adapted model's 49.7. And adaptation beats pretraining from scratch on 8T tokens at every scale above roughly 100M parameters, so this is the cheap path and the better one.

**T5Gemma 2's long-context numbers are the strongest single result in the line.** On RULER 32K after pretraining, T5Gemma 2 4B-4B scores 81.7 against Gemma 3 4B's 66.8, and at 128K, 57.6 against 51.7. The 270M-270M model scores 57.3 on RULER 32K against 21.3 for Gemma 3 270M, despite being pretrained only at 16K. Text-only Gemma 3 270M and 1B adapt into usable multimodal models, and the 1B-1B trails Gemma 3 4B on multimodal by only 8.7 points at a quarter the size.

## Why it matters

**It is the first serious modern test of the architecture question T5 originally answered.** T5 measured encoder-decoder above decoder-only in 2019 and the field ignored it. This line redoes that measurement at 2025 scale with a modern recipe, and the answer holds, with the honest qualification that the advantage concentrates in fine-tuned and long-context settings rather than in raw pretraining scores.

**Adaptation makes the architecture question cheap to ask.** You no longer need a from-scratch pretraining budget to try an encoder-decoder, which is the practical reason this could actually change what people build. The recipe is explicitly not Gemma-specific and the authors note you could pair models from different families.

**Asymmetric sizing is the underexploited idea.** A large encoder with a small decoder is the right shape for any task where the input is long and the output is short, which covers extractive and RAG-style question answering, classification, routing and reranking. Almost nobody offers this because a decoder-only model structurally cannot. The 9B-2B result is a proof of concept, and the space is barely explored: the paper itself lists more unbalanced setups and MoE combinations as future work.

**Long context is where the architecture earns its keep.** T5Gemma 2's advantage grows with context length, and its explanation is architectural rather than incidental: encoder parameters are spent exclusively on reading, and cross-attention retrieves from a high-level representation of the input instead of re-scanning raw tokens. That is the same intuition behind the latent-context compression line, arrived at from the other direction.

**Downstream, the checkpoints are already load-bearing.** EmbeddingGemma is built on T5Gemma 2 checkpoints, which is the encoder half being reused for exactly what encoders are good at.

## Connections

- `papers/2019-10_t5`: the original claim being retested, and the source of the UL2 objective's ancestor; the tied-embedding choice in T5Gemma 2 is explicitly a return to T5's
- `papers/2025-07_ettin`: the compute-matched encoder versus decoder comparison from the representation-learning side, where T5Gemma is the same question from the generation side
- `papers/2024-05_bitune`: the other route to bidirectional prompt processing, adding a bidirectional pass inside a decoder-only model instead of splitting the model in two
- `papers/2026-06_lclm`: the complementary answer for long inputs, compressing the context into latents for a decoder rather than restructuring the model around an encoder
- `papers/2020-05_gpt-3`: the reason the field went the other way, and the capability neither T5Gemma paper tests
- Topics: `topics/llms` (the Gemma family and the encoder-decoder lineage), `topics/llm-training-and-post-training` (UL2, adaptation, PrefixLM plus distillation), `topics/rag-and-retrieval` (EmbeddingGemma downstream)
