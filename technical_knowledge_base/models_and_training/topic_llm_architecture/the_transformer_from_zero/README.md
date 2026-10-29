# The transformer from zero: one block, every shape, a GPT you train

Notion: https://app.notion.com/p/3fd5c17b0d0d8174980ddde4a20c7b3c
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/the_transformer_from_zero/

Child page of Topic: llm-architecture. `index.html` is the whole Notion page, built from `src/` with `sh src/build.sh`.

Tabs (rebuilt 2026-10-23 to the teaching contract): Reading (the core idea and a hero of the whole model with shapes,
parameters and ablation results; the decoder in nine steps, each with its figure and its tested code in a closed block;
training and the loss curve; sampling with and without a KV cache; parameters and FLOPs by hand against the code and nine
real configs; six ablations at an equal budget; mistakes and interview rehearsal closed), Shapes and counts (every weight
and activation shape of ten configs), Further reading. How it was built: `src/README.md`.
