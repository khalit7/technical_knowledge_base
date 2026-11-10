# Mixture of experts: routers, load balancing, fine-grained and shared experts, expert parallelism

Notion: https://app.notion.com/p/3fd5c17b0d0d81fda06bf955af7c2b58
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/mixture_of_experts/

Child page of Topic: llm-architecture. HTML only: `index.html` is built from `src/` by `sh src/build.sh` (see `src/README.md`).

The MoE layer end to end on the topic's running example: total against active (with the dense-twin stepper), the router on eight real tokens, collapse replayed from the training logs and the two balancing fixes, capacity and drops, fine-grained and shared experts, measured dense against MoE, expert parallelism run over four processes, serving cost, and the router fields of 23 real configs. Tabs: Reading (35 min, plus 20 in closed details), Dense vs MoE calculator, Further reading. Rebuilt to the teaching contract on 2026-10-23; on 2026-11-09 every section with a visual became a split (text left, visual right) and seven mechanisms got 3D stages with step lists that play when in view. Tiny-GPT runs measured on Apple M1 Pro (MPS), analyses on CPU; data as of October 2026.
