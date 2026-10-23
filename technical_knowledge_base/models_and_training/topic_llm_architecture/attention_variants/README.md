# Attention variants: MHA, MQA, GQA, MLA, sliding window, sparse attention and sinks

Notion: https://app.notion.com/p/3fd5c17b0d0d8120859ecc2d0236e846
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/

Child page of Topic: llm-architecture. HTML only: `index.html` is the whole page, built by `src/build.sh` from `src/parts/`.

The owner of the attention-variant mechanisms in the knowledge base (rebuilt 2026-10-23 to the teaching contract): what
each past token leaves behind in each layer and what the next token reads, for MHA, MQA, GQA, MLA (absorption, the
decoupled RoPE key), sliding windows and local : global layers, NSA, DSA (the lightning indexer and its two training
stages), DeepSeek-V4's CSA and HCA, sinks and output gates; per-layer decode cost for 16 real layer types. Measured
checks on the tiny GPT and SmolLM2-135M, published results kept apart, depth in closed blocks.

Tabs: Reading (core idea and hero, sections 1 to 7 with their visuals inline, section 8 closed depth: differential
attention, production configs, code, mistakes, design questions), Which keys are read (SmolLM2's real attention under
each variant), Further reading. How it was built and rerun: `src/README.md`.
