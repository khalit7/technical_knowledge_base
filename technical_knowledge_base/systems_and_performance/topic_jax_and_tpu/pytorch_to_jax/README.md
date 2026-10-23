# PyTorch to JAX: porting a small LM

Notion: https://app.notion.com/p/3fa5c17b0d0d81c5abb9fedab418578d (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a). New page.
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/pytorch_to_jax/

HTML-only page: `index.html` is built by `src/build.sh` from `src/parts/`. Tabs: Reading, Divergence hunter, Weight conversion, Port drills, Further reading. Every measurement comes from the scripts in `src/runs/` (jax 0.11.2, flax 0.12.10, optax 0.2.8, torch 2.14.1, CPU only, on the root's running example, plus GPT-2 small for the Hugging Face section); see `src/README.md`.
