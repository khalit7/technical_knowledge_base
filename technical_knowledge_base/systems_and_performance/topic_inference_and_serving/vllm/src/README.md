# vLLM: inside the default engine, sources and how to rebuild

Child page of Topic: inference-and-serving. Everything is pinned to vLLM **v0.31.0** (2026-10-05, commit
db9527a46873454610df6dbedf79a36d6bf1a7f6), the same tree the parent's Serving simulator was checked against.
Ids and classes use the `vl-` prefix.

## Tabs
- **Reading** (`parts/20_read_a.html` to `20_read_k.html`, JS `22_js_vl_path.js`, `24_js_vl_hash.js`, `25_js_vl_fill.js`,
  `29_js_vl_pr.js`): 0 one screen; 1 the request path through the processes (step animation, every step linked to file and
  line) and sync against async scheduling (before/after animation); 2 the scheduler loop; 3 the KV cache manager, block pool,
  free queue and prefix-cache hashing (real hash chains from the recordings); 4 the model runners (V1 against MRV2), CUDA
  graphs and torch.compile by link; 5 the knobs with verified defaults; 6 reading the metrics; 7 releases v0.28 to v0.31 and an
  upgrade checklist; 8 a first patch with tests; common mistakes; interview questions.
- **Scheduler stepper** (`31_tab_step.html`, `31_js_step_1ui.js`, data `200_js_vl_stepdata.js`): vLLM's own scheduler and
  block pool recorded step by step serving Qwen3-0.6B; prefix caching off against on (before/after on the same arrivals),
  a big budget, and tight memory.
- **Knob lab** (`32_tab_knob.html`, `32_js_knob.js`, data `201_js_vl_knobdata.js`): the CPU image under load; max_num_seqs,
  the chunk budget and the cache size swept, metrics scraped every second, all exported metrics before and after, the
  patched metric live.
- **Further reading** (`39_tab_more.html`).

## Evidence and scripts
| Path | What |
|---|---|
| `stepper/record.py` | Runs inside `vllm/vllm-openai-cpu:v0.31.0-arm64`: the real engine (engine core in-process), `Scheduler.schedule` and `update_from_output` wrapped only to copy out the block pool, free queue and request state each step. |
| `stepper/run_trace.sh` | One container per scenario (`INF_DIR`, `VL_WORK` point at scratch folders; never in the repo). |
| `stepper/inputs/trace_*.json` | The raw recordings (pc_off, pc_on, nochunk, tight runs). |
| `stepper/build_trace.py` | Derives each step's events by diffing vLLM's own state, checks invariants (ref counts equal block-table holders; tokens within budget), writes the stepper data. |
| `knob/one.sh`, `knob/scrape.py`, `knob/session.sh` | One server run: start, wait for health, /metrics before and after, a scrape per second, the parent's `src/bench/scripts/loadgen.py`, stop; the session runs every configuration under the shared bench lock. |
| `knob/build_knob.py`, `knob/results/` | Compact results (summaries, scrapes, metric lists, process list, start-up lines with paths removed) and the Knob lab data. |
| `patch/apply_patch.py`, `patch/eviction_metric.diff` | The example contribution: a `vllm:prefix_cache_evicted_blocks` counter and its unit test. |
| `patch/tests_docker.sh`, `patch/tests_*.txt` | vLLM's own tests in the image: baseline 373 passed with the new test failing (AttributeError); patched 374 passed. |
| `inputs/release_v0.2*.md`, `inputs/pr_51726.txt` | Release-note highlights and the PR behind the batch-token correction, fetched 2026-10-08. |
| `check_ui.mjs`, `shots.mjs`, `check_data.py` | Puppeteer check of every control (390 dark, 920 light); element screenshots; the page embeds exactly the built data and prose numbers match it. |
| `coverage.md` | Every claim of the old page: verified, corrected, unconfirmed or moved. |
| `viz_ideas.md` | Visuals built and rejected. |

Rebuild: `python3 -I stepper/build_trace.py`, `python3 -I knob/build_knob.py <raw knob dir>`, `sh build.sh`,
`python3 -I check_data.py`, `node check_ui.mjs <shots dir>`, and from the repo root
`sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving/vllm`.

## Departures from the method
No `src/live.md`: the old page is already saved verbatim by the root (`../src/read/old/vllm.md`) and `coverage.md` maps it.
The stepper records the real engine rather than reusing the root's harness with a fake model runner, because a real model
gives real text in every block and a real chat template (which exposed the Qwen3 multi-turn cache miss).
