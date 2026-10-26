# Source of "Topic: inference-and-serving"

Root of the topic (storage key `inf-tab`). Built 2026-10-08 by a team of tab agents (`sim/`, `bench/`, `plan/`, `read/` each have their own README); rebuilt on 2026-10-23 at the topic close, after its eight children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs. The examples followed were `models_and_training/topic_llm_architecture` and `models_and_training/topic_llm_training_and_post_training`.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`. Children import `sim/sim.py`, `plan/plan.py` and read `read/old/`: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- `python3 -I read/check_data.py` (OK: 30 measured facts, 26 prose numbers, 9 derived checks); `node read/check_ui.mjs <shots dir>` (137 controls, 0 errors at 390 dark and 920 light); `node sim/check/check_ui.mjs ../index.html dark 390` and `light 920` (clean).

## Tabs
| Tab | Decision on 2026-10-23, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). |
| Serving simulator `t-sim` | **Kept without its section 1.** The lab, the chunked-prefill stall, latency against load and the three validation checks span batching, scheduling, disaggregation and production. Its section 1 (the same 20 requests under static against continuous batching and contiguous against paged memory, `31_js_sim_3anim.js`) duplicated Batching, KV cache and scheduling sections 1 ("Seven new tokens, one weight read") and 2 ("contiguous reservations leave C waiting"); it is in `retired/parts/` and the tab now links there. Sections renumbered 1 to 5. |
| Engine bench `t-bench` | **Kept unchanged.** Measured engines side by side on one laptop: data that spans every child, which the children cite by section name. |
| Capacity planner `t-plan` | **Kept unchanged.** Memory, step time, fleet and cost for any model and GPU; Serving in production, Distributed serving and SGLang all compute with it. |
| Further reading `t-more` | Child cards with current titles and the reading time each header states; Model formats removed (merged into Local and on-device inference); learning-path section numbers updated; outside pages' times set to their headers. |

## What changed in the Reading tab
- **Top**: the core idea in one sentence (a decode step reads every weight for one token per user, so serving is putting many users on each read while their caches fit and their latency holds); a hero that is a static annotated map of the serving stack (users, router and autoscaler, the engine's five parts, one GPU or many), each box naming the child that owns it; "You need" (The transformer from zero section 9, Performance math); nine new terms; the running example; the label key in a closed block.
- **Kept as the root's own definitions**: one request's lifecycle (the stepper, section 1) and prefill against decode (the before/after, section 2), with the three regimes as a table. Every child assumes them and no child owns them.
- **New comparison, section 3**: every lever (17 rows) against the limit it attacks, what it buys and costs, and its owner section; plus Baseten's along-or-outward test.
- **Sections that now orient and link**: KV cache (formula and the 141 conversations; sizing goes to Long context's `#t-kv`, paging, prefix caching, offload, preemption and compression to Batching sections 2 to 8); batching and scheduling (the throughput dial and a four-row table of scheduler decisions with owners; vLLM sections 2 and 3 for the code); latency promises and the bill (definitions and the fleet summary, with Serving in production section 1 owning the TPOT formula, goodput, the cost slider and break-even); engines (the comparison table stays, versions moved to a closed block); cheaper tokens (a three-row quantisation comparison; speculative decoding is one paragraph and a link); many GPUs (the five-scheme table with owner sections); production (four one-paragraph cards linking sections 2 to 8 of Serving in production); three workloads as one table; child cards.
- **Retired visuals** (in `retired/parts/`): the eight-model KV bars (Long context's calculator), prefix caching off/on (Batching section 3), the batching bars (Batching section 1 and the Engine bench), the illustrative speculative animation (Speculative decoding section 2 steps a real answer), the five-way parallelism animation (Distributed serving's hero), and the round-robin against prefix-aware routing toy. **Routing decision**: the lead suggested the root keep the routing visual; Serving in production section 2 steps the same eight requests through three real replicas under every rule and shows the root's toy figure (7,800) does not reproduce, so the owner keeps the visual and the root, Distributed serving section 2 and SGLang section 8 link to it.
- **Volatile, moved to tech news** (where the keys already are): decision-model routes (2026-10-19 issue), vLLM's hardware-agnostic 3.4% (2026-09-28), SemiAnalysis AgentX (2026-09-21). Megakernel and Cerebras batch-1 figures stay in a closed block in section 2.
- Mistakes and interview answers trimmed to the ones that add something, in one closed block.
- `21_js_rd_common.js` and `99_js_tabs.js` replaced with the skill templates: nothing moves before the reader acts.

## Length judgement
| Tab | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading (230 words a minute, `html_utils/audit_pages.mjs`) | 45 + 4 | 28 + 3 |
| Serving simulator | 14 + 2 | 12 + 2 |
| Engine bench | 38 + 1 | 38 + 1 |
| Capacity planner | 11 + 6 | 11 + 6 |
| Further reading | 6 | 6 |
| Visuals in Reading | 8 (5 counted by the audit) | 3: hero map, lifecycle stepper, prefill/decode before/after, plus the lever table |

Why about 28 minutes: the root now holds only the map, the definitions every child assumes (prefill, decode, the KV cache formula, TTFT, TPOT, goodput, the three regimes), two comparisons no child can make (every lever with its owner, the engines), the cost summary, and orientation paragraphs that each end in a link. It is longer than the architecture root because two wide tables (17 levers, 8 engines) are core here, and the engine table is the topic's only engine comparison. Shorter would mean dropping a definition the tables rely on.

## Knowledge ledger (`ledger.json`)
637 units drafted by `ledger.py init` from the page as built before the rebuild: core 505, depth 25, owned 47 (Serving in production 15, Batching 14, Speculative decoding 7, Distributed serving 6, SGLang 2, vLLM 1, Local 1, Sampling 1), volatile 5, fat 55; problems 0. Keys were found by script (the unit's own text where it survives, then numbers and phrases on the root, a child, or tech news) and the residue labelled by hand. Fat units carry a `note`: navigation, headings, predict questions whose answers are kept, captions and controls of retired animations, the old child list with stale titles and times.

## The topic close (2026-10-23): other pages of the topic
Stale references fixed in the children (each rebuilt; checkpage fail=0, ledger problems 0, own data checks pass): Further reading times on every child set to each target's header and Model formats cards removed; old lab-tab names replaced by the Reading sections that absorbed them (vLLM sections citing Batching section 6, SGLang section 3, Distributed's "Measured here" block in section 4; SGLang citing Serving in production section 2); root section numbers updated (Local: sections 2 and 5; Speculative decoding: sections 1 and 2; Distributed: routing now links Serving in production section 2); Serving in production no longer calls its eight requests "the parent's" toy; Batching links vLLM sections 2 and 3; Sampling links SGLang section 6 (jump-forward); Distributed links SGLang section 9 (two-batch overlap). Child ledgers re-keyed where a key had captured a stale reading time.

2026-10-26 (final follow-up sweep): the Memory technology card in Further reading no longer names its retired Memory lab tab.
