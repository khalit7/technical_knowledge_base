# Reading and Further reading tabs (t-read, t-more): sources, scripts, checks

Built 2026-10-08. Parts: `parts/20_read.html` (CSS, section nav, section 0) and `parts/20_read_b.html` to `20_read_m.html`
(sections 1 to 10, common mistakes, interview questions, section 11), closed by `20_read_z.html`; JavaScript
`parts/22_js_rd_data.js` (generated), `23_js_rd_life.js` (helpers RDX, request lifecycle), `24_js_rd_pd.js` (prefill against
decode), `25_js_rd_kv.js` (KV calculator, prefix caching off/on), `26_js_rd_bt.js` (batching bars), `27_js_rd_sd.js`
(speculative decoding), `28_js_rd_par.js` (parallelism diagram), `29_js_rd_rt.js` (routing), `2a_js_rd_misc.js`
(predict-then-reveal). `parts/39_tab_more.html` is Further reading. All ids use the `rd-` prefix; CSS is scoped under `#t-read`.

Spine: follow one chat request through a serving engine, then a thousand. Running example: the Capacity planner's
"Chat assistant" (Llama 3.1 70B, FP8 weights, BF16 KV, H200, 2,000-token prompts with a 1,000-token shared system prompt,
300-token answers, 20 requests per second at peak, p99 TTFT 2 s, TPOT 50 ms), so every derived number can be checked there.

## Files
| File | What it does |
|---|---|
| `recompute.py` | Every derived number: imports `../plan/plan.py` (which imports the hardware root's calculator unchanged) for the running example's prefill and decode step, batching curve, KV per token and per sequence for eight models, the fleet and cost, and the 100 ms TPOT variant; copies 30 measured facts and one streamed request from `../bench/data.json`. Writes `out/rd_data.json` and `../parts/22_js_rd_data.js`. |
| `check_data.py` | The page embeds exactly `out/rd_data.json`; the measured facts equal the Engine bench's; 30 numbers written in the prose and 9 hand-derived ratios agree with the data. |
| `check_ui.mjs` | Puppeteer (headless shell): every animation in every mode stepped forward and back, every range value, every predict button, details opened, at 390 px dark and 920 px light; fails on page errors, NaN/undefined/Infinity/null, sideways scroll or wide elements; screenshots each card to the folder given. |
| `inputs/arxiv_abstracts.txt` | Abstracts of the 20 arXiv papers cited (export.arxiv.org API, 2026-10-08), the source of each paper number quoted. |
| `coverage.md`, `old/` | The old Notion page was not saved: the connector was signed out (see `old/README.md`). |
| `viz_ideas.md` | Visuals built and rejected. |

Rebuild: `python3 -I recompute.py`, `sh ../build.sh`, `python3 -I check_data.py`, `node check_ui.mjs <shots dir>`, and from the
repo root `sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving`.

## Sources read at pinned versions
- vLLM v0.31.0 (commit db9527a4): `vllm/config/cache.py` (block size 16, prefix caching on L142, sha256 L144),
  `vllm/config/scheduler.py` (chunked prefill on L135, policy fcfs L160), `vllm/v1/core/kv_cache_utils.py`
  (hash_block_tokens L684, LRU free queue L246), `vllm/config/speculative.py` (methods L74), README.
- SGLang v0.5.21: `python/sglang/srt/mem_cache/radix_cache.py` (evict L553), `python/sglang/srt/managers/schedule_policy.py` (lpm L223).
- TensorRT-LLM v1.2.1 `tensorrt_llm/llmapi/llm_args.py` (via the simulator tab's notes: L1468, L2006).
- Release versions from the GitHub API on 2026-10-08; TGI's maintenance notice from its README (commit 55f7f7cb8, 2025-12-11).
- Papers: Orca (USENIX page), PagedAttention (PDF, Fig. 2 text), and the abstracts in `inputs/`.

## Departures from the method
The root's Reading runs about 30 minutes visible (about 40 with every answer expanded), above the 15 to 20 minutes of the
RL lesson: the reader asked to be taught from zero toward four goals (running a server, engine internals, cost, interviews),
so each section keeps the problem, mechanism, cost, when it matters and how to check it. Candidates to move to children
if Khalid wants it shorter: the engine table's detail (to "Serving engine internals"), section 8 and the benchmarking list
of section 9 (to "LLM serving in production"). Section 11 proposes eight children with ids to confirm against the old page.
