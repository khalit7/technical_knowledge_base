# Hand-off to queues_streams_and_async_work (Notion 3ef5c17b0d0d81aebf91df927f215b6e)

From the old page "Distributed Systems Basics" (3c65c17b0d0d8115bc45c31d915b4d33, fetched 2026-09-22, verbatim copy in `src/live.md`). These facts are now **owned by Queues, streams and async work**; the distributed systems page only links there. Each block below is the old text verbatim, followed by what was checked on 2026-10-04 and the correction to carry. Retry and timeout facts from the same old section went to `handoff_reliability.md`.

## 1. Queues, backpressure (old section "Queues, backpressure, retries", queue half)

> - **Queues decouple** producers from consumers and absorb bursts, but an unbounded queue converts overload into latency and then into metastable collapse. Bound the queue, and prefer rejecting at admission (fail fast) over timing out deep in the stack.
> - **Backpressure**: the consumer's inability to keep up must propagate upstream: bounded buffers, 429/Retry-After, credit-based flow control (HTTP/2, gRPC), or simply blocking producers. Load shedding is backpressure's blunt cousin: drop low-priority work first (see the degradation ladder in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8117b057dc2586836ec8"/>).

Checked:
- Unbounded queue to latency to metastable collapse: **verified** in substance (David Yanacek, Amazon Builders' Library, "Avoiding insurmountable queue backlogs"; Bronson et al., "Metastable Failures in Distributed Systems", HotOS 2021). The root's Reading Step 3 already teaches it; link the root rather than re-deriving it.
- 429 and Retry-After: **verified** (RFC 6585 section 4 defines 429 and says the response MAY include Retry-After; RFC 9110 section 10.2.3 defines Retry-After).
- Credit-based flow control in HTTP/2: **verified** (RFC 9113 section 5.2, flow control with WINDOW_UPDATE). gRPC inherits it from HTTP/2. Owned depth: Topic: protocols (3c65c17b0d0d81ec9355f4eecd6eed02).
- The "degradation ladder" link points at ML System Design (3c65c17b0d0d8117b057dc2586836ec8), now the child `ml_system_design`; keep the link.

> - **Dead-letter queues** for poison messages; alert on DLQ depth, and design the replay path before you need it.

Checked: concept standard; **unconfirmed** as a sourced claim on the old page. Primary source to cite: AWS SQS developer guide, "Using dead-letter queues in Amazon SQS" (maxReceiveCount moves a message to the DLQ; redrive back to the source queue).

## 2. Delivery semantics (old section, whole)

> - **At-most-once**: fire and forget; lose messages on failure.
> - **At-least-once**: retry until acked; duplicates happen. The practical default.
> - **Exactly-once delivery** is impossible over an unreliable network (Two Generals); what systems actually offer is **exactly-once processing**: at-least-once delivery plus deduplication (idempotency keys, Kafka transactional producer + idempotent consumer offsets, SQS FIFO dedup IDs). Say "effectively-once" in interviews and explain the dedup mechanism; it signals you know the difference.

Checked:
- Kafka: **verified and made precise** (Kafka 4.2 design docs, https://kafka.apache.org/42/design/design/, "Message Delivery Semantics"): "Since 0.11.0.0, the Kafka producer also supports an idempotent delivery option which guarantees that resending will not result in duplicate entries in the log. To achieve this, the broker assigns each producer an ID and deduplicates messages using a sequence number that is sent by the producer along with every message. Also beginning with 0.11.0.0, the producer supports the ability to send messages atomically to multiple topic partitions using transactions". **Correction to the wording:** "idempotent consumer offsets" is loose. What Kafka does is commit the consumer's offsets inside the same producer transaction as the output (read-process-write), so exactly-once holds only when input and output are both Kafka; any external side effect (a database write, an email) still needs its own deduplication.
- SQS FIFO: **verified** (AWS SQS developer guide, "Using the message deduplication ID"): "It ensures that within a 5-minute deduplication window, only one instance of a message with the same deduplication ID is processed and delivered." **Add the limit:** the window is 5 minutes, so a retry after that is a new message.
- "Exactly-once delivery is impossible ... (Two Generals)": **kept with a precision**: the Two Generals argument shows two parties cannot reach certain agreement over a lossy channel, so a sender can never know whether an unacknowledged message arrived; that is why the effect, not the delivery, is made exactly-once. Cite Kafka's own sentence above ("it cannot be sure if this error happened before or after the message was committed").
- "Say effectively-once in interviews": advice, kept as advice.
- New evidence for this page: Jepsen, NATS 2.12.1 (Kyle Kingsbury, 2025-12-08, https://jepsen.io/analyses/nats-2.12.1): JetStream "lost writes if data files were truncated or corrupted on a minority of nodes", and "coordinated power failures, or an OS crash on a single node combined with network delays or process pauses, can cause the loss of committed writes and persistent split-brain", caused "(at least in part) by choosing to flush writes to disk every two minutes, rather than before acknowledging them." A good "at-least-once is only as good as the fsync behind the ack" example. Also Jepsen, Bufstream 0.1.0 (2024-11-12) and Redpanda 21.10.1 (2022-04-29) exist for Kafka-compatible systems (not read for this hand-off).

## 3. Idempotent DAG tasks (old section "Idempotency", last bullet)

> - In DAG/pipeline land (Airflow/Dagster): tasks must be idempotent per (task, partition) so reruns and backfills are safe; write outputs to deterministic locations and overwrite.

Checked: **unconfirmed** as stated (Airflow's best-practices page says tasks should be idempotent, "Tasks should produce the same outcome on every re-run"; not re-fetched here). Belongs with async work and pipelines; could alternatively go to Topic: ml-infra-and-orchestration (3c65c17b0d0d81b5925bfd1d8665dd4b).

## 4. Event-driven architectures (old section, whole)

> Services communicate by publishing immutable events to a log rather than calling each other synchronously. Benefits: temporal decoupling, fan-out (N consumers per event), natural audit trail, replayability (rebuild a projection by re-reading the log). Costs: eventual consistency between views, harder end-to-end tracing, schema evolution discipline (schema registry, additive-only changes).
> Core patterns:
> - **Transactional outbox**: write the event to an outbox table in the same DB transaction as the state change; a relay publishes it. Solves dual-write.
> - **Event sourcing**: the log is the source of truth, state is a fold over events. Powerful, rarely worth it outside ledgers.
> - **CQRS**: separate write model from read projections; often falls out of Kafka -\> ClickHouse pipelines anyway.
> - For ML platforms this is the natural shape: usage events, feedback events, and data-pipeline triggers all fan out from one stream (and serverless AWS versions of this: EventBridge/SNS/SQS -\> Lambda, with DLQs and idempotent handlers).

Checked: the patterns are standard (Chris Richardson, microservices.io "Transactional outbox"; Martin Fowler, "Event Sourcing" 2005 and "CQRS" 2011); **unconfirmed** this round as sourced claims, and "rarely worth it outside ledgers" is opinion. The outbox is in this child's title: it owns the depth. Note for the builder: the distributed systems page explains why a dual write is a distributed-systems problem (two systems, no shared transaction, a crash between the two writes) and links here for the outbox.

## 5. Old best resource that fits here
> (none specific to queues on the old page; the Builders' Library sibling essays "avoiding fallback, load shedding" are in `handoff_reliability.md`)
