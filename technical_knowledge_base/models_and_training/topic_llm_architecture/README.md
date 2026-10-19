# Topic: llm-architecture

Notion: https://app.notion.com/p/3fd5c17b0d0d8172b490dc9f9ac281df

`index.html` is the whole Notion page (one interactive HTML block). It is built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill.

Split out of Topic: llms on 2026-10-18: this topic owns how an LLM is built (the decoder block, attention variants, position, tokenizers, mixture of experts, normalisation and the residual stream, long context, state-space and hybrid models, families and objectives); Topic: llm-landscape owns the labs, models, benchmarks and prices.

Child pages, one folder each:
- `the_transformer_from_zero/`: The transformer from zero: one block, every shape, a GPT you train
- `attention_variants/`: Attention variants: MHA, MQA, GQA, MLA, sliding window, sparse attention and sinks
- `positional_encodings/`: Positional Encodings (moved from Topic: llm-training-and-post-training)
- `tokenizers/`: Tokenizers (moved from Topic: llm-training-and-post-training)
- `mixture_of_experts/`: Mixture of experts: routers, load balancing, fine-grained and shared experts, expert parallelism
- `normalisation_residuals_and_stability/`: Normalisation, residuals and stability: pre-norm, RMSNorm, QK-norm, initialisation, loss spikes
- `long_context/`: Long context: KV cache growth and compression, local and global attention, effective context
- `beyond_attention/`: Beyond attention: SSMs, Mamba, linear attention, RWKV and hybrids
- `families_and_objectives/`: Families and objectives: decoder-only, encoders, encoder-decoder, multi-token prediction, diffusion LMs
- `llm_architecture_gallery/`: LLM Architecture Gallery (rasbt) and the architectural deltas that matter (moved from Topic: llms)
