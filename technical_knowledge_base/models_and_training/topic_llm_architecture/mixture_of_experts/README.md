# Mixture of experts: routers, load balancing, fine-grained and shared experts, expert parallelism

Notion: https://app.notion.com/p/3fd5c17b0d0d81fda06bf955af7c2b58

Child page of Topic: llm-architecture. HTML only: `index.html` is built from `src/` by `sh src/build.sh` (see `src/README.md`).

The MoE layer end to end on the topic's running example: total against active (with the dense-twin stepper), the router on eight real tokens, collapse replayed from the training logs and the two balancing fixes, capacity and drops, fine-grained and shared experts, measured dense against MoE, expert parallelism run over four processes, serving cost, and the router fields of 23 real configs. Tabs: Reading (28 min, plus 20 in closed details), Dense vs MoE calculator, Further reading. Rebuilt to the teaching contract on 2026-10-23. Tiny-GPT runs measured on Apple M1 Pro (MPS), analyses on CPU; data as of October 2026.
