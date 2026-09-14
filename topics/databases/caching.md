# Caching: types, policies, and semantic caching

⏱ 27 min read · +4h 15m resources

Caching is one idea applied at a dozen layers: keep the result of expensive work near where it is needed, and accept staleness in exchange for latency and cost. Everything hard about it is a consequence of that trade: **what you keep, how you decide it is still true, and what you throw away.**

## Best resources (1 min)

- [Caching best practices (AWS)](https://aws.amazon.com/caching/best-practices/) (~20 min): the clearest short taxonomy of the layers.
- [Designing Data-Intensive Applications (Kleppmann)](https://dataintensive.net/) (~1h 30m for ch. 1 and 11; ~15h for the book), ch. 1 and 11: caches as derived data, and why invalidation is a consistency problem in disguise.
- [Caching at Netflix: EVCache](https://netflixtechblog.com/caching-for-a-global-netflix-7bcc457012f1) (~20 min): what a real global cache tier looks like.
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) (~30 min): the header semantics people get wrong most often.
- [GPTCache](https://github.com/zilliztech/GPTCache) (repo, ~25 min for the README and architecture docs): the reference open-source semantic cache; the README is the best short explanation of the idea.

## The layers, nearest to furthest (3 min)

| Layer | Typical latency | Holds | Invalidation problem |
|---|---|---|---|
| CPU L1/L2/L3 | 1-40 ns | Cache lines | Hardware coherence protocols; your job is locality, not correctness |
| In-process (application memory) | ~100 ns | Objects, computed values | Per-instance, so N replicas means N divergent caches |
| OS page cache | Sub-microsecond | 4 KB pages of file data, clean and dirty | The kernel's, not yours: `fsync` forces dirty pages down, `O_DIRECT` opts out. It is why a disk-backed store runs at memory speed on its hot set, and why benchmarks lie when you forget to drop caches |
| Distributed cache (Redis, Memcached) | 0.2-2 ms | Serialised values, sessions, rate counters | Shared, so invalidation is at least centralised; network partition is now a factor |
| Database buffer pool | 0.1-1 ms | Heap and index pages, query plans | Not yours: the database keeps it coherent through the WAL and MVCC, so it is never stale. Sizing it correctly usually beats bolting an external cache in front of an under-provisioned database |
| Materialised view | Milliseconds (a normal indexed query) against seconds for the raw aggregate | The precomputed result of an expensive aggregate or join, stored as a real table | Explicitly yours: a scheduled `REFRESH` leaves it stale between runs, incremental maintenance (ClickHouse materialised views, Materialize, Postgres triggers) narrows the window. Staleness is bounded by refresh cadence, so you can state it in seconds |
| Reverse-proxy cache (nginx, Varnish, Envoy) | Sub-ms to a few ms | Whole HTTP responses and fragments, inside your own datacentre | TTL plus `PURGE` and ban requests, plus grace mode to serve stale while revalidating. Spares the app tier entirely on anonymous traffic, and turns awkward the moment every response is personalised |
| CDN / edge | 5-50 ms | Static assets, cacheable responses | Purge propagation is not instant; cache keys must exclude user identity |
| Browser / client | 0 ms | Assets, API responses | You cannot purge it. Only expiry and content-hashed URLs work |
| **Semantic cache (LLM)** | 10-50 ms | Prompt embeddings to responses | A *similar* prompt is not the same prompt; see below |
| **KV / prefix cache (LLM serving)** | in-GPU | Attention keys and values | Exact-prefix only, so it is always correct; the problem is eviction under memory pressure |

## Write and read strategies (1 min)

- **Cache-aside (lazy loading)**: the application checks the cache, and on a miss reads the database and populates it. The default. Simple, resilient (a cache outage degrades to slow, not broken), and only caches what is actually asked for. Downside: every miss pays full latency, and the first request after a write can serve stale data.
- **Read-through**: the cache itself loads on a miss. Same behaviour as cache-aside with the loading logic moved into the cache layer.
- **Write-through**: write to cache and database synchronously. The cache is never stale, and writes are slower.
- **Write-behind (write-back)**: write to cache, flush to the database asynchronously. Fast writes, and you will lose data on a crash. Only acceptable when the data is genuinely tolerant of loss.
- **Write-around**: write straight to the database and let the cache fill on the next read. Good when writes are rarely read soon after.
- **Refresh-ahead**: proactively refresh entries approaching expiry. Hides latency for predictably hot keys, wastes work on cold ones.

## Eviction policies (2 min)

- **LRU** is the default and is usually right. Fails on a full scan, which evicts everything hot.
- **LFU** resists scans by keeping genuinely popular items, but adapts slowly to shifting popularity; **TinyLFU / W-TinyLFU** (Caffeine's policy) is the modern answer, using a frequency sketch to admit only items likely to be reused.
- **FIFO** is cheap and mostly worse than LRU.
- **TTL** is not really an eviction policy but the main correctness tool: bounded staleness by construction.
- **ARC** balances recency and frequency adaptively; patent history kept it out of much open-source use.
- **Redis's actual maxmemory-policy menu**, because this is where the theory meets a config file: `noeviction` (the default, and correct only when Redis is a store of record, since writes error once memory is full), `allkeys-lru`, `allkeys-lfu`, `allkeys-random`, and the `volatile-` variants (`volatile-lru`, `volatile-lfu`, `volatile-random`, `volatile-ttl`) which consider only keys that carry a TTL. Two things people get wrong: Redis's LRU and LFU are **sampled approximations rather than exact** (it samples `maxmemory-samples` keys, default 5, and evicts the best candidate from that sample plus a maintained pool, so raise it to 10 for a closer fit at a CPU cost), and a `volatile-` policy with no TTLs actually set behaves exactly like `noeviction`, which is a classic 3am outage. For a pure cache `allkeys-lru` is the right default, and `allkeys-lfu` is better when popularity is stable.

## The failure modes worth knowing by name (3 min)

- **Thundering herd / stampede**: a hot key expires and a thousand requests miss simultaneously, all hitting the database. Fix with a per-key lock so one request recomputes, or probabilistic early expiry so refreshes desynchronise.
- **Cache penetration**: repeated requests for a key that does not exist bypass the cache every time. Fix by caching the negative result, or a Bloom filter in front.
- **Cache avalanche**: many keys expire at the same instant, usually because they were written together with identical TTLs. Fix by jittering TTLs.
- **Hot keys**: one key takes a disproportionate share of traffic (a celebrity user, a trending item, one tenant's shared prompt) and saturates the single shard that owns it while the rest of the cluster idles. Consistent hashing does not save you, because the entire point of it is that one key lives in one place. Fix with a small in-process cache in front of the distributed one for the top N keys, which is the honest reason two-tier caching exists, or with key splitting (write the value under `key:0` through `key:N` and have readers pick a suffix at random), which multiplies write cost to divide read cost. Detect before you fix: Redis has `--hotkeys` and LFU object frequency, and your client should be sampling key frequencies anyway.
- **Stale reads under replication**: you write to the primary, invalidate the key, and the next read repopulates the cache from a replica that has not received the write yet. You have now cached a pre-write value and will serve it for the full TTL, turning 50 ms of replication lag into 5 minutes of staleness. This is the nastiest of the five, because the cache converts a transient inconsistency into a durable one. Fix by reading from the primary when repopulating after a write, routing a user to the primary for a read-your-writes window, or delaying a second invalidation past the expected lag (delayed double delete).

And the standing rule: a cache is an optimisation, so the system must remain *correct* without it. If losing the cache loses data or breaks behaviour, it is not a cache, it is a database with no durability guarantees.

## Measuring it: raw hit ratio is a trap (2 min)

Hit ratio is `hits / (hits + misses)`, it is the number everyone reports, and alone it misleads in four ways. It is unweighted, so a 1 ms miss and a 10 second miss count as the same event, which means 95 percent hits where the misses are the expensive queries is worse than 80 percent that catches them. It says nothing about the tail, and the tail is where the user actually lives, so split your latency distribution by hit and miss rather than collapsing it. It is trivially gamed by caching a stream of never-reread keys. And it ignores correctness entirely: a semantic cache at a 0.7 threshold will show you a beautiful hit ratio and a terrible product.

Track **cost-weighted hit ratio** instead, meaning the fraction of *work avoided* rather than the fraction of requests served, weighting each hit by the backend latency or the dollar cost it saved. For an LLM cache this is the only metric that means anything, and it has an exact monetary form. For prefix caching it is `(cached_input_tokens * (1 - cache_read_multiplier)) / total_input_tokens_at_full_price`: a 90 percent token hit rate at a 0.1x read price saves 81 percent of the input bill, and cache writes at 1.25x have to be netted off, which is why a high hit ratio on short prompts is worth far less than a moderate one on a 50k-token system prompt. For semantic caching it is dollars and seconds saved *minus the cost of the wrong answers you served*, and if you cannot estimate that second term you should not be running the cache. Keep eviction rate, key cardinality growth (unbounded growth means a user id or a timestamp got into the key), and origin load with and without the cache on the same dashboard, because the day the cache is empty is coming.

## The KV cache, in a few lines (2 min)

The KV cache is the foundation the other two LLM caches are built on, and it is not a cache in the hit-or-miss sense: it is the data structure that makes autoregressive decode O(1) per step instead of O(n), by storing the key and value tensors of every token already processed, at every layer. Its problem is capacity, never correctness. The number to have memorised:

```
bytes_per_token = 2 * n_layers * n_kv_heads * head_dim * bytes_per_element
```

The leading 2 is K and V. For Llama-3-70B (80 layers, 8 KV heads under GQA, head_dim 128) at FP16 that is `2 * 80 * 8 * 128 * 2` = 320 KB per token, so a single 128k-context request holds roughly 40 GB, more than half an H100. **KV capacity, not weights, is what caps your batch size.** It is also why decode is memory-bandwidth-bound rather than compute-bound: every step streams the whole weight set plus the entire KV cache out of HBM to perform a tiny matmul, and batching amortises the weight stream but never the KV, since each sequence carries its own. PagedAttention, KV quantisation, GQA and MLA, and the rest of the serving-side depth live in [Inference techniques: what actually makes serving fast](../inference-and-serving/inference-techniques.md) and are not repeated here.

## Semantic caching for LLM calls (9 min)

An ordinary cache keys on exact bytes, which is nearly useless for natural language: "what is your refund policy" and "how do refunds work" are the same question and hash differently. A **semantic cache** embeds the incoming prompt, does an approximate nearest-neighbour lookup against stored prompt embeddings, and returns the stored response if similarity clears a threshold.

**The mechanism**: embed prompt to vector, ANN search a vector store (see the parent [Topic: databases](summary.md) and rag-and-retrieval), return the hit if cosine similarity exceeds a threshold, otherwise call the model and store the pair. The implementations worth knowing:

- [GPTCache](https://github.com/zilliztech/gptcache) (repo, ~25 min for the README and architecture docs) (Zilliz): the reference open-source design and the one to read. Its architecture names the parts properly (embedding function, vector store, cache store, similarity evaluator, eviction policy), and its evaluator stage is precisely the verification step naive implementations omit.
- [Redis LangCache and vector sets](https://redis.io/blog/spring-release-2025/) (~15 min): managed semantic caching as a service plus a native vector type in Redis, which is the obvious fit if Redis is already in your stack.
- [Portkey](https://portkey.ai/blog/semantic-caching-thresholds/) (~20 min): gateway-level semantic caching with the threshold managed for you rather than exposed, and unusually candid public writing about the accuracy tradeoff.
- [LiteLLM](https://docs.litellm.ai/docs/proxy/caching) (~20 min): semantic caching as a proxy feature alongside exact-match caching, which makes it the cheapest way to A/B the idea without changing application code.
- [Canonical AI](https://canonical.chat/blog/voice_ai_caching) (~15 min): aimed at voice agents, where skipping a multi-second generation matters more than the money and the scripted conversational domain genuinely suits it.

**Why it is genuinely different from every other cache on this page**: every other cache is *exact*. A hit is provably the right answer. A semantic cache hit is a *guess* that two different questions deserve the same answer, and the threshold is the dial between saving money and being wrong. That makes it the only cache in the stack with a false-positive rate, which changes how you treat it:

- The threshold is a product decision, not an infrastructure one. Too low and you serve confidently wrong answers to questions nobody asked; too high and hit rates collapse to near zero. The public numbers show how steep that curve is: an AWS benchmark cited by Portkey found a 0.99 threshold yielding a **23.5 percent hit rate** while 0.75 yielded **90.3 percent**, with accuracy falling from 92.1 to 91.2 percent on that particular dataset. Do not read that as "0.75 is fine". Read it as proof that the curve is dataset-specific and you have to measure your own, because on traffic full of adversarially similar queries the accuracy loss at 0.75 is catastrophic rather than 0.9 points. Portkey's own guidance is to start near 0.95 and backtest on real traffic, and to treat a false-positive rate above roughly 3 to 5 percent as evidence that your embedding model, not your threshold, is the limiting factor.
- **Small edits invert meaning.** "Can I cancel my order" and "can I cancel my order after shipping" are close in embedding space and have different answers. Negations and qualifiers are exactly where embeddings are weakest.
- **Entity swaps are worse, because nothing looks wrong.** "Flights to Paris" and "Flights to Rome" differ by one token, are both travel queries about European capitals, score high on cosine similarity, and share no correct content whatsoever. The same goes for "compare plan A and plan B" against "compare plan A and plan C", or any query where a proper noun or an id carries the entire payload. A higher threshold does not fix this. Extracting and hard-matching entities, numbers and dates before allowing a hit does, as does retrieving the top k candidates and reranking with a cross-encoder or a cheap LLM verifier instead of trusting a top-1 cosine score.
- **Anything personalised or stateful must not be cached this way**, because the prompt embedding does not capture the user, the tenant, the retrieved context, or the time. Partition the cache by user or tenant, and include any retrieved context in the key, or accept cross-user answer leakage.
- It works best on **high-volume, low-variance, factual** traffic: FAQ-shaped support questions, documentation lookups, classification prompts. It works badly on open-ended generation, agentic steps, and anything where the user expects novelty.

**Cheaper things to try first**, because they are exact and therefore safe:

- **Provider prompt caching** (Anthropic, OpenAI, Google): the provider caches the prefix of your prompt, cutting cost and TTFT on long shared system prompts with no correctness risk at all.
- **Prefix / KV caching in the serving engine** (vLLM, SGLang RadixAttention): the same idea inside your own inference stack, covered in inference-and-serving.
- **Exact-match caching** on normalised prompts, which catches genuine repeats for free.

The provider economics decide how much of your bill the first of those bullets can actually take off, so they are worth holding precisely:

| **Provider** | **Opt-in?** | **Cache write cost** | **Cache read cost** | **Minimum cacheable prefix** | **TTL** |
|---|---|---|---|---|---|
| Anthropic (Claude API) | Explicit: you mark up to 4 `cache_control` breakpoints in the request | 1.25x base input price (5 min TTL); 2x base input price (1 h TTL) | **0.1x** base input price | Model-dependent: 512 tokens (Opus 5, Fable 5, Mythos 5); 1,024 (Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5); 2,048 (Opus 4.7, Haiku 3.5); 4,096 (Opus 4.6, Opus 4.5, Haiku 4.5) | 5 min default, refreshed on each hit; 1 h option at the higher write price |
| OpenAI | Automatic, on by default for supported models; no request changes needed | No write surcharge | **0.1x** base input price on GPT-5.6 and later (documented as "discounted up to 90 percent"; the exact multiplier has varied by model generation, so read the rate card for the model you actually call) | 1,024 tokens (GPT-5.6 and later); 2,048 on older models. Older models report `cached_tokens` rounded down to a multiple of 128 | 30 min on GPT-5.6 and later (`prompt_cache_options.ttl`, currently the only supported value), measured from the last write or reuse; OpenAI may retain longer |
| Google (Gemini) | Both: implicit caching is on by default for Gemini 2.5 and newer; explicit caching means creating and managing a named cache object | No write surcharge, but explicit caches carry a **storage price per token-hour** (for example $0.50 per 1M tokens per hour on 3.7 Flash, $4.50 on 3.1 Pro Preview) | **0.1x** base input price (for example $0.075 versus $0.75 per 1M on 3.7 Flash; $0.20 versus $2.00 on 3.1 Pro Preview under 200k) | Model-dependent: 4,096 tokens (3.7 / 3.6 / 3.5 Flash, 3.1 Pro Preview); 2,048 (2.5 Flash, 2.5 Pro) | Implicit: provider-managed. Explicit: you set the TTL and pay storage for its duration |

Reading it: the shape of the deal is identical everywhere, **a cache read costs 10 percent of an input token**, so the engineering question is never which provider but whether your prompt is laid out to hit (stable content first, volatile content last). Two consequences worth internalising. Anthropic's write surcharge means caching only pays above a break-even reuse count: at 1.25x write and 0.1x read you need roughly **1.3 reads inside the TTL**, which is nearly always true in an agent loop and often false for one-shot traffic. Gemini's explicit storage price means a large idle cache costs money whether or not anyone reads it, so explicit caching is for high-QPS shared contexts and implicit caching is for everything else. These figures come from the providers' own documentation as of 2026-08-31 and move frequently, so re-read the rate card before building a budget on them. One caveat carried over deliberately rather than tidied away: Gemini publishes no headline discount percentage in prose, so the 0.1x read figure above is **derived** by comparing the cached and standard per-million input prices on the pricing page, not quoted.

The sane ordering is: exact-match, then provider prompt caching and prefix caching, and only then semantic caching, with a measured false-hit rate and a way to bypass it.

## Which cache do I reach for (3 min)

For an LLM service, in order. Each step is cheaper and safer than the one after it, so do not skip ahead.

1. **Prefix and prompt caching. Always, and first.** Restructure prompts so the stable content leads and the volatile content trails, then turn it on (`enable_prefix_caching` is already the default on vLLM V1; `cache_control` breakpoints on Anthropic; automatic on OpenAI and Gemini). Zero correctness risk, typically 80 to 90 percent off input cost on agentic traffic, and a large TTFT win. Verify with the `cached_tokens` field in the usage response, not by assumption.
2. **Right-size the KV cache.** FP8 KV, a GQA or MLA model, PagedAttention, and a batch size tuned to your inter-token latency SLO. This is capacity engineering rather than caching, but it determines how much prefix cache you can hold and therefore how well step 1 works.
3. **Exact-match response cache** on the fully normalised request (prompt, model, temperature, tools, seed). A hash lookup in Redis with a TTL, no correctness risk beyond staleness, and on real traffic it catches more than people expect: retries, duplicated client calls, deterministic pipeline stages. It only makes sense at temperature 0, or where serving one sample repeatedly is acceptable.
4. **Ordinary distributed caching for everything that is not the model call**: RAG retrieval results, embeddings of repeated documents (deterministic, so this is free and pure win), tool call results, tokenizer output, user context lookups. Often the larger latency win, and routinely skipped because it is not the exciting part.
5. **CDN and reverse-proxy caching for the non-inference surface**: static assets, docs, public API responses. Free latency, and it keeps junk traffic off the GPU tier entirely.
6. **Semantic caching, last, and only after an eval.** Only once steps 1 through 5 are exhausted, only on a traffic segment you have measured as high-repetition and low-stakes, only with tenant and permission scope in the key, only above a threshold fitted on your own labelled data, and only with a false-hit rate you monitor as an SLO. If you cannot state your measured false-hit rate, you are not ready to turn it on.

The rule underneath all six: **a cache is not free.** It buys latency and cost with staleness, complexity, and a new class of failure. Steps 1 through 5 pay for themselves with almost no correctness debt, which is precisely why they come first.

## Cross-links (1 min)

- Parent: [Topic: databases](summary.md).
- **inference-and-serving**: KV caching, prefix caching, and RadixAttention, the exact-match caches inside the model server.
- **rag-and-retrieval**: embeddings and ANN indexes, the machinery a semantic cache is built from.
- **swe-and-system-design**: where caching sits in a service architecture.
- **protocols**: HTTP cache headers, ETags, and conditional requests.
