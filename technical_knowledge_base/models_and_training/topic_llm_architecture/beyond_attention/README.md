# Beyond attention: SSMs, Mamba, linear attention, RWKV and hybrids

Notion: https://app.notion.com/p/3fd5c17b0d0d8142bc9ecac1fc366966
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention/

Child page of Topic: llm-architecture. Built in this repository (2026-10-19): `index.html` is the whole page, made by `sh src/build.sh` from `src/parts/`.

Tabs (rebuilt 2026-10-23 to the teaching contract): Reading (core idea and a hero grid of every design by how its state forgets and writes; recurrence against attention, linear attention, decay and the delta rule, S4 to Mamba-2, RWKV, Gated DeltaNet and KDA, hybrids, recall, the tiny GPT runs, serving; the former Recall probes and Inside the trained SSM labs now inline; depth, mistakes, design questions and code in closed blocks; 30 min plus 17 in closed details), State vs KV cache (calculator over 15 real configs using the root's window.CC), Further reading. How it was built: `src/README.md`.

2026-11-09 (layout rollout): every section with a visual is a split (text left, visual right); seven renderer v2 3D stages with step lists that play once in view (Fig. 1 recurrence against attention, Fig. 2 linear attention as a recurrence, Fig. 3 forget or overwrite, Fig. 4 the selective scan on a trained head, Fig. 5 hybrid layer patterns, Fig. 6 Pythia against Mamba recall, Fig. 7 the tiny GPT runs); the race moved to the State vs KV cache tab as a slider. Details in `src/README.md`.
