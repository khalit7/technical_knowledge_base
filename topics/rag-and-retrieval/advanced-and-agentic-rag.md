# Advanced and agentic RAG: GraphRAG, agent loops, long context, memory

Last updated: 2026-08-24

## Best resources

- [Microsoft: LazyGraphRAG](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/): GraphRAG quality at vector-RAG indexing cost.
- [Graph RAG in production, 2026 (Paperclipped)](https://www.paperclipped.de/en/blog/graph-rag-production/): Microsoft GraphRAG vs LightRAG vs Graphiti with real cost numbers.
- [LightOn: RAG is dead, long live RAG](https://lighton.ai/lighton-blogs/rag-is-dead-long-live-rag-retrieval-in-the-age-of-agents): retrieval in the age of agents, well argued.
- [Is agentic RAG worth it? (arXiv 2601.07711)](https://arxiv.org/html/2601.07711v2): experimental comparison of pipeline vs agentic approaches.
- [Long context vs RAG: an evaluation and revisits (arXiv 2501.01880)](https://arxiv.org/pdf/2501.01880): the most careful head-to-head study.
- [ReAct paper](../../papers/2022-10_react/summary.md): the reason-act loop that agentic retrieval instantiates.

## The maturity ladder

- **Naive RAG**: embed query, retrieve top-k, stuff prompt, generate. One shot, no
  feedback. Fails on multi-hop, ambiguous, and global questions.
- **Advanced RAG**: the naive core wrapped in pre-retrieval (query rewriting,
  routing, decomposition) and post-retrieval (reranking, compression, citation
  checking) stages; still a fixed DAG. This is
  [retrieval-pipeline.md](retrieval-pipeline.md).
- **Agentic RAG**: retrieval becomes a *tool* inside a ReAct-style loop. The agent
  decides whether to retrieve, writes its own queries, inspects results, re-retrieves
  with reformulated queries until it judges context sufficient, then answers. Also
  called agentic search.

## Agentic retrieval

What changes when the model drives:

- **Conditional retrieval**: the agent skips retrieval for questions it can answer,
  and escalates (more queries, different tools) for hard ones. Self-RAG and Adaptive
  RAG were early academic forms; in 2026 frontier models do this natively when handed
  a search tool.
- **Tool diversity**: production agentic retrieval exposes several tools, not one:
  semantic search, keyword/grep search, metadata/SQL lookup, a file/URL reader. Coding
  agents proved that plain grep + file reading over a repo often beats embeddings;
  the general lesson is to let the agent choose the sharp tool.
- **Deep-research pattern**: plan sub-questions, search per sub-question (often with
  parallel sub-agents), read, take notes, iterate until coverage, then synthesize with
  citations. OpenAI/Google/Anthropic deep-research products and open clones all follow
  this shape; it is agentic RAG with a budget of minutes instead of milliseconds.
- **Costs**: agentic loops multiply latency and tokens 3-10x over a pipeline, and
  evaluation gets harder (trajectories, not one retrieval). The 2026 evidence says the
  quality ceiling is real for multi-hop and exploratory queries, and unnecessary for
  simple factoid lookups; hence routers that send easy queries to the static pipeline.

## GraphRAG and variants

Vector RAG answers local questions ("what does clause 7 say"); it cannot answer global
ones ("what are the main themes across these 10K documents") because no single chunk
contains the answer. GraphRAG builds a knowledge graph so structure can be queried.

- **Microsoft GraphRAG**: LLM-extract entities and relations, Leiden community
  detection, LLM-summarize communities hierarchically; global queries aggregate
  community summaries (map-reduce). Quality is real; so is cost: $50-200 per corpus
  indexing, four figures for 10K documents, and re-indexing on updates.
- **LazyGraphRAG**: builds only a cheap NLP-extracted concept graph at index time
  (cost comparable to vector RAG) and defers all LLM summarization to query time over
  relevant subgraphs; matches or beats full GraphRAG global search at ~700x lower
  query cost. The sensible default if you want graph-style global answers.
- **LightRAG**: stripped-down open source: simple entity extraction, flat graph, dual
  retrieval (graph traversal + vectors); ~70-90% of GraphRAG quality at ~1/100 the
  indexing cost.
- **Graphiti / temporal graphs**: incrementally updated, time-aware graphs built for
  agent memory rather than batch corpora.
- Honest read: GraphRAG earns its cost when questions are genuinely relational or
  corpus-global (compliance, intelligence analysis, entity-heavy domains) and teams
  invest in ontology design. Most 2026 production stacks that use graphs run hybrid
  vector + graph, routed by query type. For ordinary Q&A, contextual retrieval + a
  reranker gets most of the benefit for a fraction of the complexity.

## Long context vs RAG

1M-token windows (Gemini, Claude, GPT long-context tiers) reframed but did not end RAG.

Where long context wins: corpora that fit comfortably in the window (a contract set, a
small repo, one book), tasks needing holistic reading (summarize, find inconsistencies),
and one-off analyses where building an index is overhead. Strong closed models now
degrade far less mid-window than 2024's "lost in the middle" results.

Where RAG wins, and why it persists:
- **Economics**: reprocessing a million tokens per query is ~1000x the cost of
  retrieve-then-read; caching helps but does not close the gap at scale.
- **Latency**: seconds of prefill vs tens of milliseconds of ANN search.
- **Scale**: corpora are unbounded; windows are not. Beyond the window you are
  selecting content, i.e. doing retrieval, whether you call it that or not.
- **Freshness and ACLs**: per-query filtering and per-tenant isolation have no
  long-context equivalent.
- **Distraction**: stuffing irrelevant content measurably hurts accuracy; models lose
  30%+ when the needle is buried in adversarial haystacks.

2026 synthesis: the two compose. Retrieval selects the working set; long context lets
that working set be generous (whole documents instead of shreds, 50 chunks instead
of 5). Adaptive routing (small corpus -> stuff it all; large -> retrieve) is standard.

## Memory systems

Agent memory is RAG turned inward: the corpus is the agent's own history.
- Patterns: append-only episodic logs with retrieval; extracted-fact stores (Mem0,
  Zep/Graphiti) that update and expire facts; agent-curated plain-text files
  (Claude Code's CLAUDE.md pattern) for small working memory.
- The hard problems are writing (what to remember), updating (superseding stale
  facts), and forgetting; retrieval over memories is the easy part. Temporal knowledge
  graphs are the current best answer for contradiction-and-supersession handling.

## Where RAG is headed (as of Aug 2026)

The pipeline era is ending; the retrieval era is not. "RAG" as a fixed
embed-retrieve-stuff chain is dissolving into (1) retrieval as an agent tool among
several, (2) index-time intelligence (contextual retrieval, graphs) making stores
smarter, (3) long context absorbing the small-corpus end, and (4) routing gluing it
together. The durable skills are search quality (chunking, hybrid, reranking) and
evaluation; those transfer to whatever orchestration fashion wins.

## See also

- [RAG paper (2020)](../../papers/2020-05_rag/summary.md): where the term started.
- [Agentic frameworks](../agentic-frameworks/summary.md): LangGraph/LlamaIndex
  implementations of these loops.
