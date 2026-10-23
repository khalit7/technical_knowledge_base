# Making training fast: profiling, memory, attention, torchao

Notion: https://app.notion.com/p/3c65c17b0d0d810d9e1fdf9ec942c20d (child of Topic: pytorch-ecosystem). Reuses the old page "PyTorch performance stack: attention, torchao, memory, profiling", retitled; its claims are checked in `src/coverage.md`.
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/making_training_fast/

`index.html` is the whole page (HTML-only): Reading (a worked bottleneck hunt on the topic's running example and its larger variant, then the profiler, data loading, optimizers, mixed precision, memory, checkpointing, fused losses, attention backends and FlexAttention, torchao), Profiler trace (two real traces, before and after, on one clock), Attention lab (masks as BlockMasks, kernel sweep animated), Memory budget (a peak-memory calculator checked against measured peaks), Further reading.

Measured on an Apple M1 Pro (CPU and MPS) with PyTorch 2.14.1 and torchao 0.18.0, October 2026. Build and experiments: `src/README.md`.
