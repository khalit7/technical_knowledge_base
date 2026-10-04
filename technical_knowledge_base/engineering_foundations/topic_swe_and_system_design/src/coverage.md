# Coverage of the old root page (src/live.md, fetched 2026-10-04, last edited 2026-09-23)

Every fact, claim, link and structural element of the old Topic: swe-and-system-design page, where the new root carries it (or which tab or future child owns it), and corrections. Reading = the Reading tab (`parts/20_read*.html`); More = Further reading (`parts/39_tab_more.html`). The old page is treated as unverified notes: each fact was checked before being carried.

## Page furniture
| Old element | Where now | Note |
|---|---|---|
| `<video>` "Topic: swe-and-system-design: where a model bends ordinary engineering" (7-minute narrated explainer, file topic_swe_and_system_design_overview.mp4) | Stays on the Notion page (not in the HTML) | It narrates the old page's three-pillar framing, which this rebuild replaces. **Ask Khalid** whether to keep, remake or delete it (he deleted the training topic's). |
| "6 min read · +44h resources" | Reading header: "About 25 minutes to read" | The new root teaches from zero, so it is longer by design. |
| Five `<page>` child tags (ML System Design, Distributed Systems Basics, Testing and Quality, API and Code Design, AI Engineering Skills Map) | More, "The old child pages of this topic", each with title, coverage line and its own reading time | The `<page>` tags must stay on the Notion page when publishing. |

## Facts and claims
| # | Old claim | Where now | Verdict |
|---|---|---|---|
| 1 | The topic is "the engineering substrate under every ML service" | Reading, One screen (lead and running example) | Kept as framing, rewritten for a reader starting from zero. |
| 2 | Three pillars: system design, software craft (testing, API design, code quality), systems fundamentals (OS, networking, databases) | Restructured | **Replaced** by the decided spine "follow one request as the system grows" (six steps). Software craft (testing, API and code design) is not in the root spine; it stays with the old children (More) and the child structure to be proposed. Systems fundamentals appear where needed: networking in Step 1 (DNS, TCP, TLS, HTTP), databases in Step 2, OS in More (OSTEP). |
| 3 | Mermaid map of the three pillars and their sub-items, all feeding "ML service in production" | Reading, One screen: the two architecture pictures (1 user and 10M) replace the map | The pillar map is a taxonomy; the new picture is the system itself, each box tagged with the step that introduces it. |
| 4 | General layer: consistency models, idempotency, backpressure, delivery semantics, database selection | Reading Steps 2 (consistency, CAP, PACELC), 3 (backpressure, at-least-once, idempotent), 4 (idempotency keys) | Database selection (OLTP/OLAP/KV/vector) left to Topic: databases (linked in Step 2 and More). |
| 5 | ML layer differs: requests expensive and long-lived (seconds of GPU, streaming) | Reading Step 5, "Why a model is not a normal backend" | **Verified and quantified**: decode is memory-bound; 16 GB / 3.35 TB/s = 4.8 ms per token for an 8B 16-bit model (NVIDIA H100 spec). |
| 6 | Capacity quantised in GPUs rather than fluid vCPUs | Reading Step 5 ("Capacity comes in big, slow blocks"; model replica) | Verified: 70B at 16-bit = 140 GB > 80 GB of one H100. |
| 7 | Outputs nondeterministic, correctness statistical | More (Production eval engineering, Topic: evaluation-and-llm-judges) | Not in the root spine (evaluation is its own topic); linked. |
| 8 | Cost per request high, so caching, routing and quota design dominate | Reading Step 5 (prefix caching, semantic cache, model router, rate limits, token bucket) and Step 6 (the estimate shows the GPU layer dominating) | Kept, with sourced vendor figures (Anthropic, OpenAI) and Stripe's token bucket. |
| 9 | Testing ML systems = code, data, model behaviour; regression suites, LLM contract tests | More (Testing and Quality child) | Child-owned; not in root. |
| 10 | API and library design: versioning, idempotency keys, typed pydantic contracts, abstraction | Idempotency keys: Reading Step 4. The rest: More (API and Code Design child) | Child-owned. |
| 11 | Systems fundamentals covered elsewhere: OSTEP for OS, Topic: protocols for networking, databases in Distributed Systems Basics and Topic: databases | Reading Step 1 deepnote (protocols), Step 2 deepnote (databases); More (OSTEP, Stage 4) | Kept as links. |
| 12 | Fundamentals in interviews mostly as justification: name the bottleneck (fsync latency, TCP slow start, page cache, GPU memory bandwidth) | Reading "How a senior engineer reasons" (do the arithmetic, name the cost); GPU memory bandwidth in Step 5 | fsync, TCP slow start and page cache are **left to Numbers to know** (src/num measures fsync and page cache) and to Topic: protocols; they are below what a from-zero root can teach without a dedicated section. |
| 13 | In production, the layer below the one you look at usually holds the explanation | More, OSTEP entry ("when a bug or bottleneck sits below your code") | Kept as advice. |
| 14 | OSTEP: free Wisconsin textbook on virtualisation, concurrency and persistence | More, Stage 4 | **Verified** (pages.cs.wisc.edu/~remzi/OSTEP). |
| 15 | OSTEP's paging maps onto KV cache block management | More (OSTEP entry); Reading Step 5 links the PagedAttention page | **Verified** for paging (the PagedAttention paper borrows OS paging). |
| 16 | OSTEP's scheduling maps onto continuous batching | Dropped | An analogy, not a claim with a source; continuous batching is taught directly in Step 5 (Orca, OSDI 2022). |
| 17 | fsync latency "roughly a millisecond"; caps write throughput per transaction | Numbers to know (src/num/measure_fsync.py) | **Unconfirmed as stated**: it varies by orders of magnitude with the device and its write cache; the Numbers tab measures it. Not repeated in Reading. |
| 18 | TCP slow start: congestion window ramps up; short connections underuse the link; connection reuse and HTTP/2 multiplexing pay | Reading Step 1 (connection reuse skips the TCP and TLS handshakes) | Slow start itself left to Topic: protocols; connection reuse kept and sourced (RFC 9293, RFC 8446). |
| 19 | Page cache: OS keeps file pages in RAM; "disk reads" often free; memory pressure shows as IO | Numbers to know | Not in Reading (below the spine). |
| 20 | GPU memory bandwidth caps decode; one token reads the whole weight set; behind continuous batching, KV cache design, quantisation | Reading Step 5 (decode, batching, KV cache; quantisation linked) | **Verified and derived** with H100 3.35 TB/s. |
| 21 | Worked question "serve an LLM feature to 10k tenants" walked through the pillars | Reading Step 6 (the method on the running example, with an animated estimate) | Replaced by the 10M-user chat assistant estimate, every input labelled. |
| 22 | 70B replica needs N GPUs, holds M KV caches, cold-starts in minutes | Reading Step 5 | 70B > one H100 verified; cold start in minutes given with illustrative arithmetic (140 GB at 2 GB/s = 70 s before container start and warm-up), labelled illustrative. |
| 23 | General design: gateway, queue with backpressure, retries with jitter and idempotency keys, per-tenant rate limits, OLTP for state, OLAP for usage analytics | Reading Steps 3, 4, 5; the 10M picture (LLM gateway box) | OLTP/OLAP split left to Topic: databases. |
| 24 | ML design: tier routing, semantic and prefix caching, batch vs realtime split, shadow deployment, degradation ladder | Reading Step 5 (routing, caching), Step 4 (graceful degradation), Step 4 deepnote (shadow and canaries via Production eval engineering) | Batch vs realtime split mentioned in Step 6 lesson ("night-time batch work"); depth in the ML System Design child. |
| 25 | Craft: contract tests, regression evals in CI, API versioning | More (children) | Child-owned. |
| 26 | "That walk is also, almost verbatim, the ML system design interview" | Reading Step 6, "How this maps to interviews" | Kept; general interview framework **verified** (Xu's four phases with timings, ByteByteGo); ML variant attributed to Huyen's booklet. |
| 27 | Deep dives table with reading times (12, 11, 10, 11 min) and resource times | More, old child pages | Times copied from each child's own header (fetched 2026-10-04). |
| 28 | AI Engineering Skills Map: Ng's five pillars, two gaps (front-end, application security); 5 min + 10 min | More | Kept. |
| 29 | Related topics: protocols, inference-and-serving, ml-infra-and-orchestration, evaluation (3c65c17b0d0d8181b351e1b8fc6a1546), databases (with caching deep dive) | More, related topics; Reading deepnotes | All five kept, by Notion id. |
| 30 | DDIA 2nd ed., Kleppmann and Riccomini, O'Reilly, March 2026, ~15h, anchor book | More, Stage 3 | **Verified** (martin.kleppmann.com). Time given as 15 to 20 h. |
| 31 | System Design Primer, ~2h core, "366k-star" | More, Stage 1 | **Corrected**: 373k stars on 2026-10-04 (stale count). |
| 32 | AI Engineering, Chip Huyen, O'Reilly 2025, ~13h | More, Stage 3 | **Verified** (huyenchip.com/books, 2025; ToC from the book repo). Added the two chapters that matter here (9 and 10, pp. 405 to 496); whole book given as about 12 h. |
| 33 | Amazon Builders' Library, ~2h for core essays (retries, timeouts, backpressure, deployment safety) | More, Stage 2, five named essays with authors | **Updated URL**: aws.amazon.com/builders-library now 301-redirects to builder.aws.com; essays linked at their working addresses. |
| 34 | Google SRE Book, ~12h; ~1h for ch. 4 and 22 | More, Stage 2 (ch. 3, 4, 6, 21, 22, about 3 h); Reading Step 4 quotes ch. 3, 4, 6 | **Verified** chapter numbers and titles from the table of contents. |

## Corrections in short
- System Design Primer stars: 366k (old) to 373k (2026-10-04).
- Builders' Library: moved to builder.aws.com (old landing URL redirects).
- "OSTEP scheduling maps onto continuous batching": dropped as an unsourced analogy.
- fsync "roughly a millisecond": not carried as a constant; device-dependent, measured in Numbers to know.
- Child page (ML System Design) "3 to 6 orders of magnitude above a CRUD call": unconfirmed; the Reading derives GPU cost per token instead.

## Added beyond the old page (sources in the Reading)
RFC 1034, 9293, 8446, 9110 (§9.2.2 idempotent methods), 6585 (429); Postgres docs (indexes, hot standby); Microsoft cache-aside pattern; Builders' Library (Brinkley and Chhabra, Featonby, Yanacek twice, Brooker); Brooker's 2015 jitter post; Stripe (Leach 2017, Tarjan 2017); Gilbert and Lynch 2002; Abadi 2012; Jepsen; Little 2011; Bronson et al. HotOS 2021; Fowler (circuit breaker); OpenTelemetry signals; SRE book ch. 3, 4, 6, 20, 22; NVIDIA H100 spec; Orca (OSDI 2022); Anyscale 2023; vLLM prefix caching docs; Anthropic and OpenAI prompt caching; TensorRT-LLM performance overview; ByteByteGo framework chapter; Huyen's ML Systems Design booklet.
