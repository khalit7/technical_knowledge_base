# Libraries on top of PyTorch: HF stack, torchtitan, Lightning, Axolotl, DeepSpeed

Notion: https://app.notion.com/p/3c65c17b0d0d81019d98f99978dc26f6 (child of Topic: pytorch-ecosystem). Reuses the old page "The layer above core: HF stack and training frameworks" (old text in the root's `src/read/old/hf_stack_and_frameworks.md`), retitled and rebuilt.

HTML-only page: `index.html`, built by `src/build.sh`. Tabs: Reading, Defaults lab, What calls what, Chooser, Further reading. Every result is a recorded, deterministic run on an Apple M1 Pro (CPU): the running example through a plain loop, the HF Trainer, Accelerate, Lightning, DeepSpeed ZeRO 0 to 3 and torchtitan 0.3.0. Sources, scripts and how to rebuild: `src/README.md`; old-page claims: `src/coverage.md`; visuals: `src/viz_ideas.md`.
