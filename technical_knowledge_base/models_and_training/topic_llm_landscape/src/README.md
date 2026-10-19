Source of the interactive HTML on the Notion page "Topic: llm-landscape".

Build: `sh build.sh` writes `../index.html` from `parts/` (see the comment at the top of build.sh for the slot order).

- `parts/01_head.html` (CSS), `10_header.html` (title, tab bar), `20_read.html` (Reading tab), `3x_tab_*.html` (one per tab), and one `*.js` per script, `99_js_tabs.js` last.
- Tabs: Reading, Benchmarks (`32_*`), Capability vs price (`33_*`), Release history (`30_*`), then the optional deeper dive on test-time compute (`34_*`), the "Deeper: inside an MoE" tab (`35_tab_moe.html`, now one card pointing to the Mixture of experts child of Topic: llm-architecture), then Further reading (`39_*`).
- Data: `data/` (Artificial Analysis snapshot, benchmark grid, release history). `mk_bench.py` regenerates the Benchmarks data block from `data/bench_grid.json`; `history/mk_data.py` regenerates `parts/30_js_time_a_data.js` from `data/release_history.json`.
- `ttc/`, `moe/`, `history/`: recompute scripts, inputs and visualisation notes of the three pages folded into this one on 2026-10-01 (Reasoning models and test-time compute, Mixture-of-Experts (MoE) models, LLM release history). `folded_coverage/coverage_*.md` map every section of those pages to where it now lives.


2026-10-18 (Topic: llms renamed Topic: llm-landscape, folder `topic_llms/` to `topic_llm_landscape/`): how an LLM is built moved to Topic: llm-architecture. The MoE tab's scripts (`35_js_moe*.js`), the Reading tab's dense-against-MoE animation (`35_js_moe_read.js`) and the KV-cache bars (`23_js_kv.js`) were removed; Axis 2 keeps the lab comparison (sparsity scatter, routing table, cache-shrinking table) and points each mechanism to its llm-architecture child. `moe/` (recompute script and inputs of the old tab) is kept for history; its content is carried by `../../topic_llm_architecture/mixture_of_experts/` (see its `src/coverage.md`).
