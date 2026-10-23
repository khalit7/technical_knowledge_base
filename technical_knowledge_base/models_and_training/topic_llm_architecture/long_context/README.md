# Long context: KV cache growth and compression, local and global attention, effective context

Notion: https://app.notion.com/p/3fd5c17b0d0d81059ee1ce20c0326dc5
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/

Child page of Topic: llm-architecture, and the knowledge base's owner of KV-cache sizing. One interactive page (`index.html`,
built from `src/` by `sh src/build.sh`): Reading (one token's cost, why decode and prefill slow down, smaller entries,
eviction and quantisation measured on SmolLM2-135M, local and global layers, long prompts, the position wall on the tiny GPT,
effective context, a design worked through; ten figures inline), KV-cache calculator (45 real models, the attention design
as the variable, twelve published figures recomputed), Further reading. How it was built and rerun: `src/README.md`.
