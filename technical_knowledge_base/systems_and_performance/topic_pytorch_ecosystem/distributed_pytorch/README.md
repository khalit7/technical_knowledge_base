# Distributed PyTorch: c10d, DDP, FSDP2, DTensor, TP, PP, DCP

Notion: https://app.notion.com/p/3c65c17b0d0d815e85aff8decd8f35ab (child of Topic: pytorch-ecosystem). Reuses the old page "Distributed PyTorch: DDP, FSDP2, DTensor, and friends", retitled.
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/distributed_pytorch/

HTML-only page: `index.html`, built by `src/build.sh`. Tabs (rebuilt 2026-10-23 to the teaching contract): Reading (core idea and hero, sections 1 to 11 each with its figure inline, depth in closed blocks, section 12 closed), Mesh explorer, Further reading. The former Comm-hook bytes lab and Pipeline schedules tabs now sit in Reading sections 3 and 8. Every number comes from runs on CPU processes with gloo (torch 2.14.1, Apple M1 Pro) recorded in `src/inputs/` by the scripts in `src/exp/`; see `src/README.md`.
