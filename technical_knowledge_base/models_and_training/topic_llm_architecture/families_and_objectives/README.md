# Families and objectives: decoder-only, encoders, encoder-decoder, multi-token prediction, diffusion LMs

Notion: https://app.notion.com/p/3fd5c17b0d0d8105b616c17c1439f766
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/families_and_objectives/

Child page of Topic: llm-architecture. How one transformer stack becomes a decoder, an encoder, an encoder-decoder or a prefix LM by its attention mask, and a different model again by its training objective: next token, masked tokens, corrupted spans, multi-token prediction (DeepSeek-V3's MTP module) and masked diffusion. Every mask and objective is run on the topic's tiny GPT and TinyStories running example (Apple M1 Pro); published results are kept apart and labelled.

Tabs: Reading, Mask lab, Objective drill, MTP lab, Diffusion lab, Further reading. Built from `src/` with `sh src/build.sh`; `src/README.md` says how, which scripts made which numbers, and how to rerun them.
