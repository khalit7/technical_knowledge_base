# Distributed Systems Basics

Last updated: 2026-08-24

## Best resources

- [Designing Data-Intensive Applications, 2nd edition](https://dataintensive.net/) (Kleppmann and Riccomini, O'Reilly, March 2026): **the** anchor. The 2nd edition (co-authored with Chris Riccomini) finally shipped after years of early-release chapters; it refreshes the 2017 classic with cloud-native storage, data lakes/lakehouses, and updated consensus material. If you read one book from this topic, read this.
- [The System Design Primer](https://github.com/donnemartin/system-design-primer): breadth-first interview coverage of everything below
- [Jepsen consistency models map](https://jepsen.io/consistency): the definitive clickable hierarchy from eventual to strict serializable
- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) (Brandur Leach): idempotency keys done properly
- [Amazon Builders' Library: Timeouts, retries and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) and its sibling essays (avoiding fallback, load shedding)
- [Notes on Distributed Systems for Young Bloods](https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/) (Hodges): the mindset in one essay

## CAP and consistency models

CAP's useful residue: during a network partition, choose availability or
consistency; when the network is healthy, the real trade is latency vs consistency
(PACELC). Consistency is a spectrum, not a bit (see Jepsen's map):

- **Linearizable**: every read sees the latest write, as if single-copy. Costs
  coordination (consensus or single-leader reads); needed for locks, leader state,
  "exactly one" invariants.
- **Sequential / causal**: causally related ops are ordered everywhere; concurrent
  ops may interleave differently. Causal+ is the sweet spot for geo-replicated data.
- **Eventual**: replicas converge given quiet time. Fine for feature flags, model
  registries read at request time, usage counters.
- **Serializable** (transactions) is about isolation, orthogonal to linearizability;
  strict serializability is both.

Practical instinct: default to the weakest level the invariant tolerates, and make
the invariant explicit ("billing must not double-charge" is a linearizable or
idempotency-key problem; "dashboard is 30s stale" is not a problem at all).

## Idempotency

The single highest-leverage property in service design: an operation that can be
applied twice with the effect of once, which makes retries safe, which makes
at-least-once delivery tolerable, which makes everything else simpler.

- Natural idempotency: PUT-style "set state to X", upserts keyed on a natural ID.
- Manufactured idempotency: client-generated **idempotency key**; server stores
  key -> result and replays the stored result on retry (the Stripe pattern). Scope
  keys per tenant, expire them, and persist the key atomically with the side effect
  (same transaction, or an outbox).
- In DAG/pipeline land (Airflow/Dagster): tasks must be idempotent per
  (task, partition) so reruns and backfills are safe; write outputs to
  deterministic locations and overwrite.

## Queues, backpressure, retries

- **Queues decouple** producers from consumers and absorb bursts, but an unbounded
  queue converts overload into latency and then into metastable collapse. Bound the
  queue, and prefer rejecting at admission (fail fast) over timing out deep in the
  stack.
- **Backpressure**: the consumer's inability to keep up must propagate upstream:
  bounded buffers, 429/Retry-After, credit-based flow control (HTTP/2, gRPC), or
  simply blocking producers. Load shedding is backpressure's blunt cousin: drop
  low-priority work first (see the degradation ladder in
  [ml-system-design.md](ml-system-design.md)).
- **Retries**: exponential backoff **with jitter** (full jitter is the usual
  winner), capped attempts, retry budgets (retry no more than ~10% of traffic), and
  only for idempotent operations. Retry at one layer, not every layer, or a single
  failure multiplies into a storm. Timeouts: every remote call has one; propagate
  deadlines rather than stacking independent timeouts.
- **Dead-letter queues** for poison messages; alert on DLQ depth, and design the
  replay path before you need it.

## Delivery semantics

- **At-most-once**: fire and forget; lose messages on failure.
- **At-least-once**: retry until acked; duplicates happen. The practical default.
- **Exactly-once delivery** is impossible over an unreliable network (Two Generals);
  what systems actually offer is **exactly-once processing**: at-least-once delivery
  plus deduplication (idempotency keys, Kafka transactional producer + idempotent
  consumer offsets, SQS FIFO dedup IDs). Say "effectively-once" in interviews and
  explain the dedup mechanism; it signals you know the difference.

## Leader election, briefly

Single-writer systems need one node to be "it". Election is done with a consensus
protocol: **Raft** (etcd, Consul, Kafka KRaft) or Paxos-family (Chubby, Spanner).
Practical use: never hand-roll; take a lease/lock from etcd or ZooKeeper, keep the
lease TTL well above GC pauses, and remember a deposed leader may not know it yet
(fence with monotonically increasing tokens on writes). That fencing-token idea is
the part interviewers actually probe.

## Database choices

| Class | Optimised for | Examples | ML-engineer use |
|---|---|---|---|
| OLTP (row, transactional) | Many small reads/writes, ACID | Postgres, MySQL, Aurora, Spanner | App state, tenants, jobs, idempotency keys; default until proven otherwise |
| OLAP (column, analytical) | Scans/aggregates over billions of rows | ClickHouse, BigQuery, Snowflake, DuckDB | Usage/cost analytics, eval results, training-data queries |
| KV / wide-column | Predictable low-latency point access at scale | Redis, DynamoDB, Cassandra | Caches, rate-limit counters, feature stores, session/KV-cache metadata |
| Vector | ANN search over embeddings | pgvector, Qdrant, Milvus, Turbopuffer | RAG retrieval, semantic cache, dedup (see [topics/rag-and-retrieval](../rag-and-retrieval/summary.md)) |

Adjacent kinds worth naming: log/stream (Kafka: the durable event backbone),
object storage (S3: the lakehouse substrate, and increasingly the KV-cache offload
tier), search (Elasticsearch/OpenSearch: BM25 alongside vectors). Rule of thumb:
start with Postgres + S3 + Redis, add a column store when analytics queries hurt,
add Kafka when more than two systems need the same events.

## Event-driven architectures

Services communicate by publishing immutable events to a log rather than calling
each other synchronously. Benefits: temporal decoupling, fan-out (N consumers per
event), natural audit trail, replayability (rebuild a projection by re-reading the
log). Costs: eventual consistency between views, harder end-to-end tracing,
schema evolution discipline (schema registry, additive-only changes).

Core patterns:

- **Transactional outbox**: write the event to an outbox table in the same DB
  transaction as the state change; a relay publishes it. Solves dual-write.
- **Event sourcing**: the log is the source of truth, state is a fold over events.
  Powerful, rarely worth it outside ledgers.
- **CQRS**: separate write model from read projections; often falls out of
  Kafka -> ClickHouse pipelines anyway.
- For ML platforms this is the natural shape: usage events, feedback events, and
  data-pipeline triggers all fan out from one stream (and serverless AWS versions
  of this: EventBridge/SNS/SQS -> Lambda, with DLQs and idempotent handlers).

## Interview checklist

Numbers to hold: ~1ms same-AZ RTT, ~50-150ms cross-region; SSD read ~100us; fsync
~1ms; Redis op ~100us-1ms; Postgres single-row read ~1ms; one Kafka partition
~10s of MB/s. Habits: state invariants first, pick consistency per invariant,
make every mutation idempotent, bound every queue, jitter every retry, and name
the failure you are defending against when you add a component.
