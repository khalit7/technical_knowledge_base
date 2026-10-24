# ML system design: visual ideas (2026-10-04)

What the text needs to be understood: that LLM requests are sized in tokens, not requests; how a GPU pool behaves under a burst with each autoscaling signal; why prompt layout decides prefix-cache hits; how routing, caches and fallbacks trade cost, latency and quality.

| Rank | Idea | Score (teach / data / effort) | Placement | Status |
|---|---|---|---|---|
| 1 | Same burst, four autoscaling policies (CPU, requests/s, queue + KV, warm pool): capacity and TTFT over 40 minutes, HPA defaults, summary table | 5 / 4 (published throughput, HPA defaults; traffic and cold start illustrative) / medium | Reading s8, inline animation | built, then removed 2026-10-19 (overlap fix: autoscaling is owned by LLM serving in production, whose Autoscaling lab runs utilization, queue, KV and TTFT autoscalers on one spike; the JS is in git history; `scale()` stays in models.py) |
| 2 | Gateway lab (renamed Cost-quality lab 2026-10-19 and reframed as the cost-against-quality design lab; gateway mechanics are on Gateways and routing): traffic mix, tiers, router accuracy, exact/semantic/prefix caches, provider outage and fallback; cost per 1k, monthly, TTFT, full time, errors, wrong answers; where requests and money go | 5 / 4 (real prices from the KB snapshot; latencies illustrative) / medium | own tab t-gw | built |
| 3 | One conversation, two prompt layouts: prefix-cache hits turn by turn with Sonnet 5.5 prices | 4 / 5 / low | Reading s9, inline animation | built |
| 4 | The model layer opened up: architecture boxes numbered by section | 3 / n.a. / low (drawer reused from the parent root) | One screen | built |
| 5 | Measured LiteLLM fallback (rate limit then fallback 2.9 s; context window 0.02 s) | 4 / 5 (real library run, mocked providers) / low | Reading s3, table | built, then removed 2026-10-19 (Gateways and routing records the same paths in more detail); script and output kept in src/ |
| 6 | Token bucket by requests vs by tokens, two tenants | 3 / 3 / low | Reading s5 | rejected: the wall box's arithmetic (84,000 vs 3 million tokens) says it; the parent root already explains the bucket |
| 7 | Request timeline (queue, prefill, decode) as an animated Gantt | 3 / 3 / medium | Reading s2 | rejected: the parent root's continuous-batching animation and the PagedAttention page cover the engine side; a flow strip is enough |
| 8 | Degradation ladder simulator | 3 / 2 (no published data on rung effects) / medium | s11 | rejected: would be invented numbers; the lab's outage presets carry the fallback rung |
| 9 | Feature store point-in-time join animation | 3 / 3 / medium | s13 | rejected for now: classic ML is one section here; a candidate if Khalid wants a classic-ML child |

Inspiration: GKE autoscaling guide (queue vs batch size), Dynamo planner docs, DeepSeek MLA explainer (before/after toggle pattern), the parent root's estimate animation.

Formulas: autoscaling fluid model and HPA rules in src/models.py scale(); gateway expectations in gateway(); prefix turns in prefix_turns(). recompute.py writes recompute_out.json; check_js.mjs compares 7,348 numbers with the page JS, 0 differences.

What the methodology lacked: guidance for labs whose outputs depend mostly on illustrative inputs (latency per tier); handled by labelling every illustrative input next to the lab and making each editable.

## 2026-10-24 rebuild to the teaching contract
The page now owns ML system design as a discipline (framing, the data loop and skew, offline against online evaluation, serving shape and budgets, feedback loops and drift, LLM application design). Visuals chosen by the kind of concept:

| Visual | Kind | Where | Status |
|---|---|---|---|
| Hero: the ML system as two lanes of one loop (offline learn, online serve), skew and verdict links, the outcome-to-logs loop, section badges (`23_js_rd_hero.js`) | static annotated diagram; transposes to two columns below 620 px | top | built |
| Metric ladder: objective, online, guard and system metrics, offline metric, loss (`25_js_rd_arch.js`, `rd-ladder`) | static diagram | s1 | built |
| Training-serving skew before/after: one ticket's feature from two code paths (3 against 5), then one definition logged at serving (`27_js_rd_skew.js`) | before/after toggle, illustrative values | s2 | built |
| Rule #37's staircase of gaps plus the proxy gap (`28_js_rd_gaps.js`) | static, schematic heights (the rule gives no sizes) | s3 | built |
| Latency budget of one reply to scale, one slider (output tokens), with a prediction prompt (`29_js_rd_lat.js`, checked by `check_js.mjs` against `models.latency_e2e`) | slider | s4 | built |
| Direct feedback loop: the escalation model chooses which tickets get labels; random exploration as the fix (`30_js_rd_fb.js`) | stepper, four stills | s5 | built |
| LLM design ladder: prompt, retrieval, fine-tuning, workflow or agent (`rd-llmlad`) | static diagram | s6 | built |
| Prefix cache, two prompt layouts (existing) | before/after animation, now paused until the reader acts, also on a mode switch | s6 (moved from s9) | kept |
| The model layer opened up (existing) | static diagram, badges now letters matching section 7's table | s7 | kept |
| Point-in-time join | | | rejected: owned and drawn by ML platforms and workflows and measured on the Analytics page |
| Drift chart over time | | | rejected: no sourced data; a schematic would decorate. The four-layer monitoring table carries it |
| Real image (Sculley et al.'s Figure 1, the small ML-code box among infrastructure) | | | rejected: the paper's figure is not openly licensed; the hero carries the idea |
