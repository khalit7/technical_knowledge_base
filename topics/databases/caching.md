# Caching: types, policies, and semantic caching

*Added 2026-08-31, from Khalid's blog entry of 2026-08-27: "add to the knowledge base caching. I want to understand the different types and comparison between them. Include semantic cache."*

Caching is one idea applied at a dozen layers: keep the result of expensive work near where it is needed, and accept staleness in exchange for latency and cost. Everything hard about it is a consequence of that trade: **what you keep, how you decide it is still true, and what you throw away.**

## Best resources

- [Caching best practices (AWS)](https://aws.amazon.com/caching/best-practices/): the clearest short taxonomy of the layers.
- [Designing Data-Intensive Applications (Kleppmann)](https://dataintensive.net/), ch. 1 and 11: caches as derived data, and why invalidation is a consistency problem in disguise.
- [Caching at Netflix: EVCache](https://netflixtechblog.com/caching-for-a-global-netflix-7bcc457012f1): what a real global cache tier looks like.
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching): the header semantics people get wrong most often.
- [GPTCache](https://github.com/zilliztech/GPTCache): the reference open-source semantic cache; the README is the best short explanation of the idea.

## The layers, nearest to furthest

| Layer | Typical latency | Holds | Invalidation problem |
|---|---|---|---|
| CPU L1/L2/L3 | 1-40 ns | Cache lines | Hardware coherence protocols; your job is locality, not correctness |
| In-process (application memory) | ~100 ns | Objects, computed values | Per-instance, so N replicas means N divergent caches |
| Distributed cache (Redis, Memcached) | 0.2-2 ms | Serialised values, sessions, rate counters | Shared, so invalidation is at least centralised; network partition is now a factor |
| Database buffer pool / query cache | 0.1-1 ms | Pages, plans, materialised views | Mostly the database's problem, until you add materialised views |
| CDN / edge | 5-50 ms | Static assets, cacheable responses | Purge propagation is not instant; cache keys must exclude user identity |
| Browser / client | 0 ms | Assets, API responses | You cannot purge it. Only expiry and content-hashed URLs work |
| **Semantic cache (LLM)** | 10-50 ms | Prompt embeddings to responses | A *similar* prompt is not the same prompt; see below |
| **KV / prefix cache (LLM serving)** | in-GPU | Attention keys and values | Exact-prefix only, so it is always correct; the problem is eviction under memory pressure |

## Write and read strategies

- **Cache-aside (lazy loading)**: the application checks the cache, and on a miss reads the database and populates it. The default. Simple, resilient (a cache outage degrades to slow, not broken), and only caches what is actually asked for. Downside: every miss pays full latency, and the first request after a write can serve stale data.
- **Read-through**: the cache itself loads on a miss. Same behaviour as cache-aside with the loading logic moved into the cache layer.
- **Write-through**: write to cache and database synchronously. The cache is never stale, and writes are slower.
- **Write-behind (write-back)**: write to cache, flush to the database asynchronously. Fast writes, and you will lose data on a crash. Only acceptable when the data is genuinely tolerant of loss.
- **Write-around**: write straight to the database and let the cache fill on the next read. Good when writes are rarely read soon after.
- **Refresh-ahead**: proactively refresh entries approaching expiry. Hides latency for predictably hot keys, wastes work on cold ones.

## Eviction policies

- **LRU** is the default and is usually right. Fails on a full scan, which evicts everything hot.
- **LFU** resists scans by keeping genuinely popular items, but adapts slowly to shifting popularity; **TinyLFU / W-TinyLFU** (Caffeine's policy) is the modern answer, using a frequency sketch to admit only items likely to be reused.
- **FIFO** is cheap and mostly worse than LRU.
- **TTL** is not really an eviction policy but the main correctness tool: bounded staleness by construction.
- **ARC** balances recency and frequency adaptively; patent history kept it out of much open-source use.

## The three failure modes worth knowing by name

- **Thundering herd / stampede**: a hot key expires and a thousand requests miss simultaneously, all hitting the database. Fix with a per-key lock so one request recomputes, or probabilistic early expiry so refreshes desynchronise.
- **Cache penetration**: repeated requests for a key that does not exist bypass the cache every time. Fix by caching the negative result, or a Bloom filter in front.
- **Cache avalanche**: many keys expire at the same instant, usually because they were written together with identical TTLs. Fix by jittering TTLs.

And the standing rule: a cache is an optimisation, so the system must remain *correct* without it. If losing the cache loses data or breaks behaviour, it is not a cache, it is a database with no durability guarantees.

## Semantic caching for LLM calls

An ordinary cache keys on exact bytes, which is nearly useless for natural language: "what is your refund policy" and "how do refunds work" are the same question and hash differently. A **semantic cache** embeds the incoming prompt, does an approximate nearest-neighbour lookup against stored prompt embeddings, and returns the stored response if similarity clears a threshold.

**The mechanism**: embed prompt to vector, ANN search a vector store (see [summary.md](summary.md) and [../rag-and-retrieval/](../rag-and-retrieval/summary.md)), return the hit if cosine similarity exceeds a threshold, otherwise call the model and store the pair. Reference implementations: GPTCache, and the semantic caches built into most LLM gateways.

**Why it is genuinely different from every other cache on this page**: every other cache is *exact*. A hit is provably the right answer. A semantic cache hit is a *guess* that two different questions deserve the same answer, and the threshold is the dial between saving money and being wrong. That makes it the only cache in the stack with a false-positive rate, which changes how you treat it:

- The threshold is a product decision, not an infrastructure one. Too low and you serve confidently wrong answers to questions nobody asked; too high and hit rates collapse to near zero.
- **Small edits invert meaning.** "Can I cancel my order" and "can I cancel my order after shipping" are close in embedding space and have different answers. Negations and qualifiers are exactly where embeddings are weakest.
- **Anything personalised or stateful must not be cached this way**, because the prompt embedding does not capture the user, the tenant, the retrieved context, or the time. Partition the cache by user or tenant, and include any retrieved context in the key, or accept cross-user answer leakage.
- It works best on **high-volume, low-variance, factual** traffic: FAQ-shaped support questions, documentation lookups, classification prompts. It works badly on open-ended generation, agentic steps, and anything where the user expects novelty.

**Cheaper things to try first**, because they are exact and therefore safe:

- **Provider prompt caching** (Anthropic, OpenAI, Google): the provider caches the prefix of your prompt, cutting cost and TTFT on long shared system prompts with no correctness risk at all.
- **Prefix / KV caching in the serving engine** (vLLM, SGLang RadixAttention): the same idea inside your own inference stack, covered in [../inference-and-serving/inference-techniques.md](../inference-and-serving/inference-techniques.md).
- **Exact-match caching** on normalised prompts, which catches genuine repeats for free.

The sane ordering is: exact-match, then provider prompt caching and prefix caching, and only then semantic caching, with a measured false-hit rate and a way to bypass it.

## Cross-links

- Parent: [summary.md](summary.md).
- [../inference-and-serving/](../inference-and-serving/summary.md): KV caching, prefix caching, and RadixAttention, the exact-match caches inside the model server.
- [../rag-and-retrieval/](../rag-and-retrieval/summary.md): embeddings and ANN indexes, the machinery a semantic cache is built from.
- [../swe-and-system-design/](../swe-and-system-design/summary.md): where caching sits in a service architecture.
- [../protocols/http.md](../protocols/http.md): HTTP cache headers, ETags, and conditional requests.
