# Topic: swe-and-system-design: source

Root of the topic (storage key in `parts/99_js_tabs.js`). Built 2026-10-04 by a team of tab agents (Reading, Scale simulator, Numbers to know, Case files); the Reading tab was rebuilt as a map at the topic close on 2026-10-24, after the ten children had been rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). No new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- `node <this page>/src/read/check_read.mjs` (from the repository root): the estimate stepper in both modes at 390 dark and 920 light, its numbers against `read/recompute.py`, that it stays on step 0 after scrolling and after a mode switch, details opened, child cards, tab links. Tab checks unchanged: `sim/check_ui.mjs`, `sim/check_js.mjs`, `num/test_tab.mjs`, `cases/check_cases.mjs`.
- `parts/21_js_rd_common.js` is the skill template (never autoplays).

## Tabs
| Tab | Decision on 2026-10-24, and why |
|---|---|
| Reading `t-read` | **Rebuilt as a map** (below). |
| Scale simulator `t-sim` | **Kept.** One model of the whole design (servers, database, cache, queue, GPUs) under growing traffic: it spans Capacity planning, Queues, Distributed systems and ML system design, and several children quote its defaults. |
| Numbers to know `t-num` | **Kept.** The latency, throughput and price figures every child estimates with (Building a backend API, Capacity planning, Distributed systems and Queues cite it). |
| Case files `t-cases` | **Kept, ids unchanged** (children and Topic: databases cite cases by id: aws-2025-dns, gh-2018-10, discord-2023, insta-2012, notion-2021). |
| Further reading `t-more` | Child list now titles and header times only (what each covers is on the Reading cards); neighbouring topics' times from their headers. |

## What changed in the Reading tab
- **Top**: the core sentence (a production service is one request path through a few layers; every block fixes one bottleneck at a price; add it only when its bottleneck has arrived), the hero (the product at one user against ten million, each box labelled with its step and its owner page, `parts/22_js_rd_one.js`), "You need" (nothing; the neighbouring topics named), eight new terms.
- **The map**: one table of the six walls plus "every step" (code and tests): what breaks, building blocks, what they cost, owner. Two splits stated where readers trip: idempotency (Service APIs section 4, Queues, Distributed systems section 9) and pools and the GIL (Capacity planning, Building a backend API, Running Postgres).
- **Steps 1 to 6 kept as the spine** (children, the Scale simulator and the Case files refer to "the root's Step N"), each cut to the wall with its illustrative numbers, one-line definitions, the cross-page price and a Go deeper line naming the owner's sections. Steps 2 and 4 are comparison tables (fix, what it does, what it costs, owner; defence, what it does, how it backfires). Comparison tables become labelled cards at phone width.
- **Retired** (every unit `owned:` with its key on the owner, or kept as a one-line claim): the load-balancer, cache-aside, queue, retry-storm/double-charge and batching animations (Capacity planning, Caching, Queues, Reliability engineering and Service APIs, Batching, KV cache and scheduling own those visuals); their parts are in `read/retired/parts/` and `read/recompute.py` still computes them. The Step 3 example result (5 uploads among 30 messages, up to 3 s) stays as a sentence because Queues cites it. The 87-entry glossary (each term is defined where it is used; the top lists the new terms).
- **Kept**: the Step 6 estimate stepper (the root's running example, whose results 116 and 231.5 requests a second, 56 GPUs and 2,315 open streams are reused by Capacity planning, ML system design, Building a backend API and the case studies); it no longer plays on a mode switch. Its provenance (peak factors, the TensorRT-LLM row) and the vendor throughput figures of Step 5 are in closed blocks.
- **Added**: child cards with header times; the cross-step habits now name the owner of each.

## Length judgement
| | Before (2026-10-24, `html_utils/audit_pages.mjs`) | After |
|---|---|---|
| Reading, core (230 words a minute) | 35 min (8,069 words) | 21 min (4,728 words) |
| Reading, closed details | 0 | 1 min |
| Scale simulator, Numbers to know, Case files | 9 + 1, 19 + 2, 39 + 24 | unchanged |
| Further reading | 8 min | 6 min |
| Visuals in Reading | 7 (two hero diagrams, five animations) | 3 (hero pair, estimate) |

Why about 21 minutes is right: the topic was started from zero and its ten children run 23 to 40 minutes each; the root is the only place that puts their fixes side by side with their prices, so it keeps the map table, the two step tables, the definitions those tables need, the estimate that the children reuse and the child cards. Every mechanism is one orienting sentence and a link. Shorter would drop definitions a from-zero reader needs before any child.

## Knowledge ledger (`ledger.json`)
587 units drafted by `ledger.py init` from the page as built before the close: core 390, depth 4, owned 33 (Reliability engineering 9, Service APIs 5, Capacity planning 5, Distributed systems 4, HTTP 3, Queues 2, Topic: protocols 1, Networking foundations 1, Observability 1, ML system design 1, Case studies 1), fat 160 (87 glossary entries, headings, wind-ups, widget instructions of the retired animations, navigation lines, old child descriptions and stale times in Further reading), problems 0. Units of the unchanged tabs keep their own text as key. Two units that no owner carried were moved before cutting: AWS's client request tokens to Reliability engineering section 6, and the provider prompt-caching figures (Anthropic 90% and 85%, OpenAI's "stable ... first") to a closed block in ML system design section 6.
