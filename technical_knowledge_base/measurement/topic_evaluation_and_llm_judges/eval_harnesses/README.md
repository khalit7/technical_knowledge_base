# Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools

Notion: https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9 (child of Topic: evaluation-and-llm-judges)
Site: https://khalit7.github.io/technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/eval_harnesses/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Rebuilt 2026-10-24 to the teaching contract: Reading opens with the chain of harness decisions and each link's measured effect, then request against program (a GSM8K stepper on real lm-eval and Inspect runs), benchmark to score (shots, chat template, log-likelihood or generation with an MMLU stepper, extraction with seven rules on real outputs, normalisation), why the same model scores differently (the 200-item reproduction and published cases, moved here from the parent), what to pin and report, running evals at scale (tokens, batching, concurrency, caching), sandboxes, which harness (with one dated status table) and closed per-harness depth. Tabs: GSM8K in every harness (the real files), Inside a run log, Further reading. No child pages, databases or video.
