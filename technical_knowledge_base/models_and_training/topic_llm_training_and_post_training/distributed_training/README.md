# Distributed Training

Notion: https://app.notion.com/p/3c65c17b0d0d8103a916c4824abbd82e
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/distributed_training/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). A deep dive under Topic: llm-training-and-post-training, and the owner of the parallelism forms for training: the six ways to split a training step (data, sharded data, tensor, pipeline, expert, context), each with a 3D stage of the same Llama 3 8B step on four GPUs beside its section (split layout, renderer v2, step lists on the left, autoplay on view), the memory stack, the collectives, ZeRO stages, TP against sequence parallelism on glass plates, the pipeline bubble, context parallelism's traffic patterns, the published layouts as a 3D mesh of GPUs, and a layout calculator with Llama 3 405B and DeepSeek-V3 presets. Rebuilt to the teaching contract on 2026-10-23; split layout and ten 3D stages on 2026-11-10 (Reading: 35 min, plus 5 in closed details). No child pages, databases or video.
