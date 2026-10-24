Source of the interactive HTML on the Notion page "Topic: llm-landscape".

Build: `sh build.sh` writes `../index.html` from `parts/` (see the comment at the top of build.sh for the slot order).

- `parts/01_head.html` (CSS), `10_header.html` (title, measured reading time, tab bar), `20_read_a.html` to `20_read_e.html` (Reading tab; `build.sh` takes `20_read*.html` in file-name order, so the first part must not be named `20_read.html`: the build's locale sorts it after `20_read_b`), `3x_tab_*.html` (one per tab), and one `*.js` per script, `99_js_tabs.js` (the skill template, key `llm-tab`) last.
- Tabs: Reading, Benchmarks (`32_*`), Capability vs price (`33_*`), Release history (`30_*`), then Further reading (`39_*`). The old deeper dive on test-time compute (`34_*`) is now the child page `../test_time_compute_and_reasoning/`.
- Data: `data/` (Artificial Analysis snapshot, benchmark grid, release history). `mk_bench.py` regenerates the Benchmarks data block from `data/bench_grid.json`; `history/mk_data.py` regenerates `parts/30_js_time_a_data.js` from `data/release_history.json`.
- `moe/`, `history/` (and formerly `ttc/`, moved with the tab to `../test_time_compute_and_reasoning/src/` on 2026-10-24): recompute scripts, inputs and visualisation notes of the three pages folded into this one on 2026-10-01 (Reasoning models and test-time compute, Mixture-of-Experts (MoE) models, LLM release history). `folded_coverage/coverage_*.md` map every section of those pages to where it now lives.


2026-10-18 (Topic: llms renamed Topic: llm-landscape, folder `topic_llms/` to `topic_llm_landscape/`): how an LLM is built moved to Topic: llm-architecture. The MoE tab's scripts (`35_js_moe*.js`), the Reading tab's dense-against-MoE animation (`35_js_moe_read.js`) and the KV-cache bars (`23_js_kv.js`) were removed; Axis 2 keeps the lab comparison (sparsity scatter, routing table, cache-shrinking table) and points each mechanism to its llm-architecture child. `moe/` (recompute script and inputs of the old tab) is kept for history; its content is carried by `../../topic_llm_architecture/mixture_of_experts/` (see its `src/coverage.md`).


## The topic close (2026-10-24): Reading rebuilt to the teaching contract
The root had never been rebuilt; after the twelve children were, it was rebuilt with the rebuild-page method, editing only (no new runs, no new numbers).

**Reading** (`20_read_a` to `20_read_e`):
- **Top**: the core idea in one sentence (one shared skeleton, three axes: where the thinking goes, what a token costs to serve, how open the release is); a static hero, each lab's best model on the Artificial Analysis index v4.3 with its cost per index task and one chip per axis, every lab name a link to its child page (it replaces the overview bars, the three axis cards and the script-drawn interactive lab map); "You need"; seven new terms.
- **1 Who leads**: the cross-lab ranking paragraph and the one compact dated table of who leads which kind of work (volatile, read 1 to 19 October 2026); Epoch adds Fable 5.1 at 165.
- **2 Thinking**: the four-design stepper kept; "three ways to spend it" and "which one when" merged into one table; the five control mechanisms kept (a cross-lab comparison); "where it stands" and "where the scaling stops paying" moved to a closed block; the chain-of-thought warning is one sentence, its detail closed.
- **3 Serving**: the total-against-active scatter and calculator kept, formula after the picture; the sparsity scaling law, the K3 scaling claim and the low-precision details are on Moonshot AI: Kimi; the per-model routing table is closed; the cache-shrinking table links each lab.
- **4 Openness**: OLMo now points at Other notable providers `#s-olmo` (the old Ai2: OLMo id is an alias of that page); the Hugging Face deal is on Other notable providers.
- **5 Convergence**: the skeleton animation kept and no longer autoplays; size, pace and licence findings and the formation of reasoning models closed.
- **6 Cost per task**: the calculator kept, formula after it; Gemini 3.8 Flash's $1.24 to about $2.49 in 2027 added (Google's page).
- **7 Reading the numbers**: the Grok 4.7 Terminal-Bench figures now name each harness (38.0% xAI, 37.58% official board, 33% Grok Build, 25.8% Artificial Analysis's index harness); the ARC-AGI-3 two-harness card is one sentence (OpenAI's page owns it); misreadings closed, the three lab-specific ones point to their labs.
- **8 Choosing**: the script-filled chooser is now a static table.
- **Child cards**: each child's title, one line, the root sections it deepens and its header time.
- `21_js_map.js` keeps only the link helpers; the map and overview scripts and the chooser script are in `retired/parts/` with the old Reading part.

**Release history**: kept as the one cross-lab timeline (each lab page keeps only its own line). Cadence view and its script retired (`retired/parts/30_js_time_f_cad.js`; its findings sit in Reading section 5); the size time-lapse no longer autoplays; stale counts fixed (146 rows, 66 in 2026, 51 of 53 closed rows unsized, 25 of 36 permissive in 2026); the GLM-5.3-Flash KDA and IndexPool caveat updated to confirmed.

**Further reading**: every link in `{{text|n:id}}` form with the target header's time; Ai2 OLMo now Other notable providers; "Inference techniques" renamed to its current title, Batching, KV cache and scheduling in depth.

**Not touched**: the Deeper: test-time compute tab (`34_*`, `src/ttc/`), byte-identical, its ledger units labelled core. It still names the serving page "Inference techniques" and points to a KV-cache formula in "the Reading tab's Cost to serve section" (now section 3, and the formula lives on Long context): fix when it moves to its own child.

## Length judgement
| | Before (2026-10-24) | After |
|---|---|---|
| Reading, core (230 words a minute) | 24.8 min | 23.1 min |
| Reading, closed details | 2.1 min | 5.2 min |
| Benchmarks | 7.2 | 7.2 |
| Capability vs price | 1.5 | 1.5 |
| Release history | 30.9 + 2.4 | 28.8 + 2.4 |
| Deeper: test-time compute | 31.4 + 0.4 | unchanged |
| Further reading | 6.3 | 6.5 |

Why about 23 minutes: the core lost roughly 1,600 words of re-teaching and lab detail (owned by the children, the closed blocks and the test-time compute tab) and gained the hero (about 650 words of lab-by-axis chips) and the twelve child cards (about 500 words) the contract asks a root to carry. What is left is the map, six cross-lab comparison tables (who leads, three ways, five controls, cache shrinking, choosing, the routing table closed) and the definitions they need; shorter would mean dropping a comparison no child holds.

## Knowledge ledger (`ledger.json`)
572 units: 541 drafted by `ledger.py init` from the page before the close, 31 added by hand for the retired script-drawn lab map (each owned by the child that carries it). Labels: core 393, depth 39, owned 41 (children and Mixture of experts), volatile 85 (the release history's dated rows and prose), fat 14 (navigation, widget instructions of retired views, restatements; each with a note). Problems 0. Keys were found by script (verbatim phrases of six or seven words first, then numbers) and the moved units set by hand.

## 2026-10-24: the test-time compute tab became a child page
`34_tab_ttc.html`, `34_js_ttc*.js` and `src/ttc/` moved to `../test_time_compute_and_reasoning/` (rebuilt there to the teaching contract). Here: the tab button and its separator removed from `10_header.html`; the three `#t-ttc` links in section 2 now point at the child page; a child card added to `20_read_e.html`; Further reading's entry moved under the lab pages and its "deeper dives" headings renamed. Ledger: the 186 t-ttc units are `owned:` the child (keys checked on its built page) or fat where the child dropped them as navigation; nine units keyed on text removed by the topic close (the index committed with it was built before its last part edits) were re-keyed or marked fat. Reading stays 23 min, plus 5 in closed details (5,385 core words). Problems 0.
