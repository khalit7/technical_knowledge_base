# ML system design: LLM and ML services (source)

- `build.sh` writes `../index.html` from `parts/` (same scheme as the parent root; Reading CSS in `02_read_css.html`, Reading parts `20_read_a.html` (the idea, s1) to `20_read_f.html` (s8)). Reading JS: `21_js_rd_common.js` (the skill template, never autoplays), `23_js_rd_hero.js`, `24_js_rd_prefix.js`, `25_js_rd_arch.js` (box-row diagrams: metric ladder, LLM ladder, model layer), `27_js_rd_skew.js`, `28_js_rd_gaps.js`, `29_js_rd_lat.js`, `30_js_rd_fb.js`; `99_js_tabs.js` is the template (storage key `msd-tab`).
- `models.py`: Python copy of the page's models (the Cost-quality lab, formerly Gateway lab, and the prefix-cache turns; the autoscaling burst model `scale()` is kept but no longer on the page) and the section 1 and section 14 arithmetic. `recompute.py` writes `recompute_out.json` and prints the figures quoted in the Reading; `node check_js.mjs` (run from `src/`) compares the page JS with it (the lab, the prefix turns and, since 2026-10-24, section 4's latency bar via `models.latency_e2e`).
- `check/check_ui.mjs` (run from the repo root): checks that the stepper and the prefix animation sit on step 0 at load (no autoplay), clicks every control at 390 dark and 920 light, checks for errors, NaN, undefined and sideways scroll, saves card screenshots to `../.shots/`.
- `litellm_fallback.py`: the local LiteLLM 1.104.0 Router run (mocked providers, no network); output in `inputs/litellm_fallback_run.json`. Run with `LITELLM_LOCAL_MODEL_COST_MAP=True uv run --no-project --with litellm==1.104.0 python litellm_fallback.py` from a scratch directory.
- `inputs/`: research notes with verbatim quotes, URLs and versions (`research_*.md`, gathered 2026-10-04), the MLPerf latency rows, the LiteLLM run.
- `live.md`: the old Notion page verbatim; `coverage.json` maps every old fact to where it is carried, with verdicts.
- `viz_ideas.md`: visuals built and rejected.
- Shape: a topic child (`page-kinds/topic-child.md`). Until 2026-10-19 the Reading had fourteen sections following one request through the model layer; since 2026-10-24 it has eight sections in the order a design is made (below).
- Shared figures with the parent: 2,209 tokens/s per H100 (Llama 3.3 70B FP8, TP2, TensorRT-LLM 8a9c66c), $3.99 per GPU-hour, derate 0.5, peak factor 2, m7i.xlarge $0.2016/h, 1M daily users x 10 messages, 1,000 input / 400 output tokens (the Scale simulator's defaults). Prices from `models_and_training/topic_llm_landscape/src/data/aa_snapshot.json` (2026-10-01).
- Overlap fix (2026-10-19): sections 3 to 5 (gateway, routing and fallbacks, token limits and quotas) and section 8 (GPU autoscaling) were cut to one paragraph each plus links. Their depth lives on the owners: Gateways and routing (3f15c17b0d0d81e4a964c129a3e520ae) for the gateway, fallbacks, limits and budgets, LLM serving in production (3f35c17b0d0d818aa406da1f7a784c62) for replica routing, autoscaling and cold starts; what those pages lacked was moved there first (listed in `coverage.json`). The autoscaling animation was removed; the Gateway lab was renamed Cost-quality lab. Section numbers are unchanged so links from other pages still land. Reading time now about 40 minutes (9,126 words at 230 per minute).

## The 2026-10-24 rebuild to the teaching contract
**Ownership changed.** OWNERS.md (brief of 2026-10-24) gives this page ML system design as an interview and design discipline: framing, the online and offline data flow, feature pipelines and training-serving skew, offline evaluation against online metrics, serving shape and latency budgets, feedback loops and drift, and LLM application design worked as designs. The old page was mostly LLM-service infrastructure, much of it now owned by Gateways and routing, LLM serving in production, Caching and Production eval engineering. So the Reading was reorganised around the discipline, in the order a design is made:

| New section | What it holds | Came from (old section) |
|---|---|---|
| The idea | core sentence, hero loop, running example (support assistant, escalation model), you need, new terms | new; running example from 14 |
| 1 Frame | metric ladder, Rules of ML #1 to #4 and #39 (quotes rechecked against the live page 2026-10-24) | 14 steps 1 and 2; new |
| 2 Data loop and skew | skew before/after, Rules #29, #31, #32, feature store and point-in-time (linked to the owner), LLM skew; Michelangelo and Chronon in depth | 13 |
| 3 Offline and online | Rule #37's gaps (quotes rechecked), nondeterminism, the staged rollout; Istio, KServe, Argo in depth | 10, 1 (nondeterminism) |
| 4 Serving shape | batch, online, streaming table, the latency budget with a slider, goodput, Little's law; batch terms, async jobs, DoorDash, embedding services in depth | 7, 13, 2 |
| 5 Feedback and drift | feedback-loop stepper, hidden loops, Rule #36, four monitoring layers, prediction bias and action limits (Sculley et al., rechecked against the paper's text), the Anthropic postmortem | 12, 1 (quiet failure); new |
| 6 LLM applications | design ladder (RAG root and agentic-frameworks root quotes reused verbatim), what changes table with the cost derivation, worked budget, prefix-cache animation | one screen, 1, 14, 9 |
| 7 Running an LLM service | the model layer figure, a component table naming each owner, then closed blocks: the six facts in detail, engine metrics, gateway and limits, multi-tenancy, caches, failures and the degradation ladder, observability | 1, 2, 3, 4, 5, 6, 8, 9, 11, 12 |
| 8 Interview | method and timing; rehearsal steps and three non-obvious mistakes in closed blocks | 14, Common mistakes |

- **Visuals inline: 2 before, 9 after** (see `viz_ideas.md`). New: hero, metric ladder, skew before/after, gaps staircase, latency slider, feedback stepper, LLM ladder. The prefix animation moved from s9 to s6 and no longer plays on a mode switch; the model-layer figure moved from the top to s7.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` replaced by the skill templates; `check_ui.mjs` asserts step 0 at load.
- **Deleted as fat** (ledger): wind-ups, navigation and "how to skim" text, section pointers, the illustrative rollout story, the glossary (terms are defined at first use and listed at the top), and the Common mistakes list except the three that add something (each other mistake restated a section).
- **No real image**: the obvious candidate, Sculley et al.'s Figure 1, is not openly licensed; this page is about a discipline, not a physical object.
- Section numbers changed; old numbers quoted on other pages are listed in the lead's report.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 38.6 min | 23.0 min |
| Reading, closed details | 1.2 min | 16.3 min |
| Cost-quality lab | 3.0 min | 3.0 min |
| Further reading | 3.5 min | 4.0 min |
| Visuals inline (Reading) | 2 | 9 |

Why this length: the core now carries the six ideas a design needs (frame, data loop, evaluation gaps, serving budget, feedback and drift, the LLM ladder with its cost), each with its visual, plus one table for what running an LLM service adds. The infrastructure detail that other pages own in depth but do not yet carry word for word (tenancy tiers, cache measurements, failure table, engine metric names) is kept in closed blocks rather than cut, so nothing is lost; it can shrink further once the owners absorb it.

## Ledger (`ledger.json`, `python3 html_utils/ledger.py check` prints problems 0)
424 units: core 175, depth 139, owned 3 (LiteLLM internals on Gateways and routing, KEDA thresholds on LLM serving in production, Feast's offline and online calls on ML platforms and workflows), fat 107, volatile 0.

2026-10-26 (final follow-up sweep): units kept closed here moved to their owners and are now one linking sentence each: the rollout machinery (Istio `mirrorPercentage`, KServe `canaryTrafficPercent`, Argo `successCondition`) to Production eval engineering section 8; the OpenTelemetry GenAI metric names to LLM observability section 2; the Virtual Token Counter and llm-d's `InferenceObjective` priority to LLM serving in production section 2 (which also took "30-100+ seconds per switch", kept here as the cold-start reason); Anthropic's Priority Tier to Gateways and routing section 6. The shadow cost rule and the per-tenant split stay here as design rules. Ledger units 117, 127, 128, 198, 201, 202, 238 and 239 relabelled `owned:`. The semantic-cache facts were already on Caching.
