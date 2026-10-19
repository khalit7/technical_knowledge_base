# LLM Architecture Gallery (rasbt) and the architectural deltas that matter

Notion: https://app.notion.com/p/3c65c17b0d0d81be8a07f2562fa2030a (child of Topic: llm-architecture, 3fd5c17b0d0d8172b490dc9f9ac281df)

`index.html` is the whole Notion page (one interactive HTML block), built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill.

What it is: reading a 2026 open model's card and config.json in thirty seconds, and the architectural deltas that differ between models (what each token stores, windows, linear layers, experts, position, stack shape), for every model of Sebastian Raschka's LLM Architecture Gallery that has a readable config, rebuilt layer by layer and checked against the gallery, transformers 5.20.1 and the root page's Config calculator.

Tabs: Reading; Decode a config (any config's fields, what each sets, the cache arithmetic, a layer-by-layer animation); Compare architectures (all models' strips and cache, a scatter animated between the card's convention and the windows-credited cache, a diff); Cache at context (one request growing under both conventions; memory per request against context, concurrency and a budget); Further reading.

How it is built: `src/README.md`. Visuals built and rejected: `src/viz_ideas.md`. Old-page coverage and corrections: `src/coverage.md`.
