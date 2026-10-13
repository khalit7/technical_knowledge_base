# torch.compile from the user's side

Notion: https://app.notion.com/p/3c65c17b0d0d8123a232d75bd7339ecb (child of Topic: pytorch-ecosystem, 3c65c17b0d0d8150aa65ca44b6ed2fd5)

HTML-only page: `index.html` is the whole page, built by `src/build.sh`. Reuses the old page "torch.compile: Dynamo, AOTAutograd, Inductor", to be retitled; its text (no child pages, databases or video) is kept verbatim in `../src/read/old/torch_compile.md` and accounted for claim by claim in `src/coverage.md`.

Tabs: Reading, Graph-break fixer, Compile time and caches, Partitioner explorer, Further reading. Every graph, log and timing was recorded with torch 2.14.1 on an Apple M1 Pro (CPU; Triton source generated without a GPU in Docker) on 2026-10-13; Python source quoted from the v2.14.1 tag. See `src/README.md`.
