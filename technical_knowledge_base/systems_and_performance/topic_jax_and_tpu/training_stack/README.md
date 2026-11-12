# The JAX training stack: Flax NNX, optax, orbax and grain

Notion: https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a). Reuses the old page "Flax NNX, optax, orbax: the training stack" (to be retitled).
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/training_stack/

HTML-only page: `index.html` is the whole page, built by `src/build.sh` from `src/parts/`. Tabs: Reading and Further reading. Since the 2026-11-12 rollout the Reading tab is in the split layout (text left, visual right) with four 3D stages (the hero step through the four libraries, one AdamW step through optax's chain, a checkpoint restored onto other meshes, grain batches per worker count), the split and scan steppers and the resume chart. Every measured number comes from `src/runs/out/*.json` (scripts in `src/runs/`, run on an Apple M1 Pro CPU with the topic's shared venv). See `src/README.md`.
