# Mixture of experts: routers, load balancing, fine-grained and shared experts, expert parallelism

Notion: https://app.notion.com/p/3fd5c17b0d0d81fda06bf955af7c2b58

Child page of Topic: llm-architecture. HTML only: `index.html` is built from `src/` by `sh src/build.sh` (see `src/README.md`).

The MoE layer end to end on the topic's running example: the router (softmax, sigmoid, top-k, group limits, hash routing), collapse and balancing (Switch auxiliary loss, transformers' pooled version, DeepSeek's bias, z-loss, balance scope), capacity factors and dropped tokens, fine-grained and shared experts, expert parallelism (a trained layer run over four processes), serving cost, and the router fields of 23 real configs. Tabs: Reading, Router on the running sequence, Expert load over training, Dense vs MoE calculator, Further reading. Tiny-GPT runs measured on Apple M1 Pro (MPS), analyses on CPU; data as of October 2026.
