# LLM Architecture Gallery (rasbt) and the architectural deltas that matter

Notion: https://app.notion.com/p/3c65c17b0d0d81be8a07f2562fa2030a (child of Topic: llm-architecture, 3fd5c17b0d0d8172b490dc9f9ac281df)
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/llm_architecture_gallery/

`index.html` is the whole page (read it on the site), built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill.

What it is: which released open models made which architectural choices (what each token stores, windows, linear layers, experts, position, stack shape), for every model of Sebastian Raschka's LLM Architecture Gallery that has a readable config, rebuilt layer by layer and checked against the gallery, transformers 5.20.1 and the root page's Config calculator; mechanisms are linked to the sibling pages that own them.

Tabs: Reading (five released stacks in 3D as the hero, the model-by-choice matrix, then each delta as a 3D stage on real configs beside its cross-model figure, in the split layout); Decode a config (any config's fields, what each sets, the cache arithmetic, a layer-by-layer animation); Compare architectures (all models' strips and cache, a scatter between the card's convention and the windows-credited cache, a diff); Further reading.

How it is built: `src/README.md`. Visuals built and rejected: `src/viz_ideas.md`. Old-page coverage and corrections: `src/coverage.md`.
