# The JAX training stack: Flax NNX, optax, orbax and grain

Notion: https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a). Reuses the old page "Flax NNX, optax, orbax: the training stack" (to be retitled).
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/training_stack/

HTML-only page: `index.html` is the whole page, built by `src/build.sh` from `src/parts/`. Tabs: Reading (with the split, scan, AdamW-stage, resume and grain-batching steppers inline since the 2026-10-23 rebuild) and Further reading. Every measured number comes from `src/runs/out/*.json` (scripts in `src/runs/`, run on an Apple M1 Pro CPU with the topic's shared venv). See `src/README.md`.
