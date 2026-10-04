# ML system design: visual ideas (2026-10-04)

What the text needs to be understood: that LLM requests are sized in tokens, not requests; how a GPU pool behaves under a burst with each autoscaling signal; why prompt layout decides prefix-cache hits; how routing, caches and fallbacks trade cost, latency and quality.

| Rank | Idea | Score (teach / data / effort) | Placement | Status |
|---|---|---|---|---|
| 1 | Same burst, four autoscaling policies (CPU, requests/s, queue + KV, warm pool): capacity and TTFT over 40 minutes, HPA defaults, summary table | 5 / 4 (published throughput, HPA defaults; traffic and cold start illustrative) / medium | Reading s8, inline animation | built (23_js_rd_scale.js, model 22_js_scale_model.js) |
| 2 | Gateway lab: traffic mix, tiers, router accuracy, exact/semantic/prefix caches, provider outage and fallback; cost per 1k, monthly, TTFT, full time, errors, wrong answers; where requests and money go | 5 / 4 (real prices from the KB snapshot; latencies illustrative) / medium | own tab t-gw | built |
| 3 | One conversation, two prompt layouts: prefix-cache hits turn by turn with Sonnet 5.5 prices | 4 / 5 / low | Reading s9, inline animation | built |
| 4 | The model layer opened up: architecture boxes numbered by section | 3 / n.a. / low (drawer reused from the parent root) | One screen | built |
| 5 | Measured LiteLLM fallback (rate limit then fallback 2.9 s; context window 0.02 s) | 4 / 5 (real library run, mocked providers) / low | Reading s3, table | built |
| 6 | Token bucket by requests vs by tokens, two tenants | 3 / 3 / low | Reading s5 | rejected: the wall box's arithmetic (84,000 vs 3 million tokens) says it; the parent root already explains the bucket |
| 7 | Request timeline (queue, prefill, decode) as an animated Gantt | 3 / 3 / medium | Reading s2 | rejected: the parent root's continuous-batching animation and the PagedAttention page cover the engine side; a flow strip is enough |
| 8 | Degradation ladder simulator | 3 / 2 (no published data on rung effects) / medium | s11 | rejected: would be invented numbers; the lab's outage presets carry the fallback rung |
| 9 | Feature store point-in-time join animation | 3 / 3 / medium | s13 | rejected for now: classic ML is one section here; a candidate if Khalid wants a classic-ML child |

Inspiration: GKE autoscaling guide (queue vs batch size), Dynamo planner docs, DeepSeek MLA explainer (before/after toggle pattern), the parent root's estimate animation.

Formulas: autoscaling fluid model and HPA rules in src/models.py scale(); gateway expectations in gateway(); prefix turns in prefix_turns(). recompute.py writes recompute_out.json; check_js.mjs compares 7,348 numbers with the page JS, 0 differences.

What the methodology lacked: guidance for labs whose outputs depend mostly on illustrative inputs (latency per tier); handled by labelling every illustrative input next to the lab and making each editable.
