# Trained Persistent Memory for Frozen Encoder-Decoder LLMs: Six Architectural Methods

Hong Jeong (Inha University in Tashkent, Uzbekistan). arXiv [2603.16413](https://arxiv.org/abs/2603.16413), 17 Mar 2026. Added to the KB 2026-09-01 from a blog entry.

- [arXiv](https://arxiv.org/abs/2603.16413) | [HTML](https://arxiv.org/html/2603.16413)
- Topics: llm-training-and-post-training, agentic-harnesses (memory), rag-and-retrieval
**Self-described as a proof-of-concept pilot study**: one frozen Flan-T5-XL backbone, small trainable adapters, one dataset. The paper is explicit about the resource constraints, and this page reflects that.

### Problem

A frozen encoder-decoder LM is **stateless**: the latent representation is computed, used, and discarded every forward pass, so nothing persists between sessions. The industry answer is text-level memory, which is what every agent framework ships: write facts to a store as strings, retrieve later, paste back into the prompt. That works, but the write and the read are discrete, non-differentiable operations bolted on from outside.

The question here is whether memory can live in the model's **continuous latent space** instead, so reading and writing become differentiable operations on dense vectors that can be trained end to end.

### Method

Six architectural variants spanning **three injection points** (where memory enters the frozen model's computation) and **four write mechanisms** (how the memory bank updates). The backbone stays frozen; only small adapters train.

The interesting property: after adapter training, the **memory bank keeps accumulating at inference time with no gradients**. The paper calls this conversational learning, meaning the system continues acquiring state from interaction after training has finished, with no weight updates.

### Results

Evaluated on **LoCoMo** with a forgetting-curve protocol at two capacity scales (1x and 10x).

- The **stateless baseline scores exactly zero**, which is a sanity check rather than a real comparison.
- At **10x capacity, all six trained adapters produce positive memory retention**.
- At 1x the picture is weaker, which is the honest read: capacity is doing much of the work.

### Why it matters

The framing is the valuable part. Nearly all deployed agent memory is **text-level and non-differentiable**: retrieval is a separate system and the model has no say in what gets written or how it is encoded. Latent-space memory makes the write mechanism itself learnable, and the six-variant taxonomy (injection point x write mechanism) is a reasonable map of that design space even if the experiments cannot rank the options convincingly.

What it does not show: whether this beats a competent RAG or text-memory baseline (none is compared), whether it transfers off Flan-T5-XL to a modern decoder-only model, or whether latent memory stays interpretable and auditable, which is exactly what makes text memory operationally attractive. A positive score against a zero baseline is a floor, not evidence of a competitive system.

### Connections

- The practical alternative it implicitly argues against: text-level memory in personal agents (OpenClaw's MEMORY.md, Hermes's memory providers and skills) and retrieval generally.
- Related compression-into-latents work: context distillation, KV-cache compression, Gist tokens.
- Adjacent in this batch: Bitune and LLM Modules, also frozen-backbone-plus-adapter designs.
