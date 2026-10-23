# Distributed PyTorch: c10d, DDP, FSDP2, DTensor, TP, PP, DCP

Notion: https://app.notion.com/p/3c65c17b0d0d815e85aff8decd8f35ab (child of Topic: pytorch-ecosystem). Reuses the old page "Distributed PyTorch: DDP, FSDP2, DTensor, and friends", retitled.
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/distributed_pytorch/

HTML-only page: `index.html`, built by `src/build.sh`. Tabs: Reading (sections 0 to 12, mistakes, interview questions), Comm-hook bytes lab, Mesh explorer, Pipeline schedules, Further reading. Every number comes from runs on CPU processes with gloo (torch 2.14.1, Apple M1 Pro) recorded in `src/inputs/` by the scripts in `src/exp/`; see `src/README.md`.
