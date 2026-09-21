# The retrieval pipeline: chunking, hybrid search, query transformation, reranking

⏱ 7 min read · +1h 44m resources

Last updated: 2026-09-21 (acronyms expanded on first use)

### Best resources

- [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) (~15 min): the canonical writeup; contextual embeddings + contextual BM25 + reranking cut retrieval failures ~67%.
- [Jina: Late Chunking](https://jina.ai/news/late-chunking-in-long-context-embedding-models/) (~12 min): embed the whole document first, pool per chunk afterwards.
- [Hybrid search reference 2026 (Digital Applied)](https://www.digitalapplied.com/blog/hybrid-search-bm25-vector-reranking-reference-2026) (~20 min): BM25 + vector + reranking as a pipeline, with tuning numbers.
- [Reconstructing Context: evaluating advanced chunking (arXiv 2504.19754)](https://arxiv.org/pdf/2504.19754) (45 min): empirical comparison of chunking strategies.
- [Reranker comparison: Cohere vs Voyage vs Jina vs BGE (Particula)](https://particula.tech/blog/reranker-models-compared-cohere-voyage-jina-bge-latency-ndcg) (~12 min): latency vs normalized discounted cumulative gain (nDCG) numbers.
The 2026 production default, in one line: contextualized chunks -> hybrid BM25 (Best Match 25, the classic lexical ranking function) + dense

retrieval -> reciprocal rank fusion (RRF) -> metadata filtering -> cross-encoder rerank of top 50-150 ->

top 5-20 into the prompt. Each stage below.

### Chunking

Chunking decisions move retrieval quality more than embedding-model choice, and

inconsistent chunking is the most common silent killer (mixed strategies across

ingestion runs can cost ~8 points of recall).

- **Fixed / recursive character splitting**: split on separators (paragraph, sentence)
  to a target size with overlap. 256-512 tokens with 10-20% overlap is the most

  reliable default; boring and hard to beat.

- **Structure-aware**: split on markdown headers, code blocks (function/class
  boundaries via tree-sitter), table boundaries. Always prefer document structure when

  it exists.

- **Semantic chunking**: embed sentences, split where cosine similarity between
  adjacent windows drops. Modest gains in studies, meaningful ingestion cost; helps

  most on unstructured prose.

- **Late chunking** (Jina): run the *whole document* through a long-context embedding
  model, then mean-pool token embeddings per chunk span. Each chunk vector carries

  document-wide context (resolved pronouns, section topic) at zero large language model (LLM) cost. Needs a

  long-context embedder; cheap, underused.

- **Contextual retrieval** (Anthropic): at index time, prompt an LLM with (whole
  document, chunk) to write a 50-100 token situating prefix; prepend it to the chunk

  for both embedding and BM25. With prompt caching the doc costs ~$1/M tokens to

  process. Contextual embeddings + contextual BM25 cut top-20 retrieval failure by

  ~49%; adding reranking, ~67%. The current quality ceiling for static pipelines.

Late chunking and contextual retrieval attack the same disease (chunks losing document

context); contextual retrieval is stronger, late chunking is cheaper.

### Hybrid search: BM25 + dense, fused with RRF

Dense embeddings capture paraphrase and semantics but whiff on exact identifiers,

part numbers, error codes, and rare names; BM25 is the reverse. Production systems run

both and fuse.

- **Fusion**: raw scores are incomparable (BM25 unbounded, cosine in [-1,1]), so fuse
  on ranks with Reciprocal Rank Fusion: `score(d) = sum over lists of 1/(k + rank_d)`,

  k=60 by default. Three lines of code; weighting variants (alpha-blend, weighted RRF)

  rarely beat plain RRF plus a reranker.

- Qdrant, Weaviate, Vespa, Elasticsearch, and pgvector-with-tsvector (or ParadeDB) all
  do hybrid natively now; learned sparse (SPLADE, bge-m3 sparse heads) is a drop-in

  upgrade over classic BM25 where supported.

- The engineering effort is not the fusion; it is corpus-specific analyzer/tokenizer
  config for BM25, consistent chunking across both indexes, and evaluation.

### Query transformation

Applied before retrieval; all trade latency for recall, so gate them on query

difficulty (or let an agent decide, see [Advanced and agentic RAG: GraphRAG, agent loops, long context, memory](advanced-and-agentic-rag.md)).

- **HyDE** (hypothetical document embeddings): have the LLM hallucinate an answer,
  embed *that*, search with it. Closes the query-document style gap; helps most on

  zero-shot corpora, adds an LLM call, largely superseded by instruction-aware

  embedders trained on real query distributions.

- **Multi-query**: generate 3-5 paraphrases/perspectives of the query, retrieve for
  each, union + RRF. Cheap recall boost for ambiguous queries.

- **Decomposition**: split multi-hop questions ("compare X's approach to Y's") into
  sub-queries, retrieve per sub-query, answer stepwise. In 2026 this is usually done

  by the agent loop rather than a fixed chain.

- Also worth having: query rewriting for conversational context (resolve "it", "that
  release") before any retrieval; this is mandatory in chat products.

### Reranking

First-stage retrieval optimizes recall over millions of chunks; the reranker is a

cross-encoder that reads (query, document) *together* and optimizes precision over the

top 50-200. Consistently the highest-leverage single addition to a RAG stack.

- **Managed**: Cohere Rerank 4 (100+ languages, 32K context, lowest-friction),
  Voyage rerank-2.5, Jina Reranker (v3 listwise; scores many docs in one pass).

- **Open weights**: Qwen3-Reranker 0.6B/4B/8B and BGE-Reranker-v2.5-Gemma2 rival the
  APIs on BEIR (Benchmarking Information Retrieval); bge-reranker-v2-m3 is the small self-host workhorse. Self-hosting

  breaks even around 1M queries/day; below that, APIs are cheaper than the GPU.

- 2026 trend: listwise rerankers (score the candidate set jointly) and "reasoning
  rerankers" built on small LLMs for hard domains.

- Tuning: rerank top 100-150 fused candidates down to 5-20; measure the latency hit
  (30-300ms) against nDCG gains on your golden set.

### Metadata filtering

Attach structured fields (tenant, source, date, access control list (ACL), doctype) to every chunk and

filter *during* approximate nearest neighbor (ANN) search, not after. Post-filtering an ANN result list silently

destroys recall when the filter is selective (top-k gets filtered to near-empty).

Qdrant's payload indexes and pgvector-with-SQL-WHERE (iterative scans in 0.8+) handle

this well; it is the main reason filtered-search benchmarks reorder the vector DB

table. Tenant isolation and ACL enforcement belong here, never in the prompt.

### See also

- [Embeddings and vector search](embeddings-and-vector-search.md): the models and indexes underneath.
- [RAG evaluation](rag-evaluation.md): how to tell whether any of these stages paid for itself.
