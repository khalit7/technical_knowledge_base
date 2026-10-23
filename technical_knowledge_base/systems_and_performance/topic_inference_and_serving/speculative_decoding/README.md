# Speculative decoding: draft models, EAGLE, MTP, n-gram, the batch-size crossover

Notion: https://app.notion.com/p/3f35c17b0d0d81e086fde85940ebac1c (child of Topic: inference-and-serving)
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_inference_and_serving/speculative_decoding/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Taught from zero, rebuilt 2026-10-23 to the teaching contract: core idea and hero, why checking guesses is nearly free, one step, the acceptance rule and why it is exact (with your own p and q and an exactness test on real models), tokens per step (worked example 3.36 at alpha 0.8, k 4), the cost model and the batch-size crossover (with a movable cost model and real llama-server runs), every kind of drafter, trees, the production knobs. Tabs: Reading, Drafters measured (one Qwen3-4B target with a 0.6B draft, EAGLE-3, DFlash, DSpark and five n-gram modes), Further reading.
No NVIDIA GPU was available: every run is on an Apple M1 Pro (MLX and llama.cpp Metal), labelled; published GPU results are labelled by who measured them. Sources, scripts and compact results are in `src/` (see `src/README.md`); `src/coverage.md` lists what was carried from the parent and corrected.
