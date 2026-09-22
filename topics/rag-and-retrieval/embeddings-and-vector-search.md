# Embeddings and vector search

⏱ 7 min read · +2h 30m resources

### Best resources

- [Milvus: choosing an embedding model for RAG in 2026](https://milvus.io/blog/choose-embedding-model-rag-2026.md) (~15 min): current landscape for retrieval-augmented generation (RAG) with Massive Text Embedding Benchmark (MTEB) numbers and cost.
- [Qwen3 Embedding technical report](https://arxiv.org/pdf/2506.05176) (45 min): how modern open embedders are trained: large language model (LLM) backbone, instruction-aware, Matryoshka representation learning (MRL).
- [Voyage 4 announcement](https://blog.voyageai.com/2026/01/15/voyage-4/) (~8 min): mixture-of-experts (MoE) embedder, shared embedding space, Matryoshka and quantization options.
- [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) (~10 min to explore): the scoreboard; filter by task and language, do not worship the top row.
- [Firecrawl: best vector databases 2026](https://www.firecrawl.dev/blog/best-vector-databases) (~15 min) and [Encore's comparison](https://encore.dev/articles/best-vector-databases) (~12 min): honest DB selection guides.
- [pgvector repo](https://github.com/pgvector/pgvector) (docs, ~30 min for the core pages) plus [pgvectorscale](https://github.com/timescale/pgvectorscale) (docs, ~15 min): what plain Postgres can actually do.

### Embedding model landscape

Two families dominate: API models and open weights. All serious 2026 models are

instruction-aware (query and document get different prompts) and Matryoshka-trained.

**API models**

- **Gemini Embedding (gemini-embedding-001, now v2)**: top of MTEB Multilingual among
  APIs; the safe managed default.

- **Voyage 4 family** (voyage-4-large is MoE): strong retrieval quality, dims
  2048/1024/512/256 via MRL, int8 and binary quantization, ~$0.12/M tokens;

  voyage-code-4 (Aug 2026) targets coding-agent retrieval specifically.

- **Cohere Embed v4**: 128K-token input window (whole documents, no chunk-for-the-
  embedder gymnastics), multimodal, MRL dims 256-1536, input types

  (search_query/search_document).

- **OpenAI text-embedding-3-large/small**: no longer near the top of MTEB but cheap
  (3-small at $0.02/M tokens) and everywhere; fine for low-stakes retrieval.

**Open weights**

- **Qwen3-Embedding 0.6B/4B/8B**: the open MTEB leaders; 8B scored 70.6 on MMTEB (the massive multilingual variant of MTEB),
  ahead of Gemini; the 0.6B is the best small self-host option. Paired

  Qwen3-Reranker models.

- **BGE family (BAAI)**: bge-m3 remains the workhorse for multilingual +
  multi-vector + sparse in one model.

- Others worth knowing: NV-Embed, E5-Mistral lineage, Jina embeddings v4.
**Choosing**: MTEB rank is a prior, not a verdict; models overfit to it and your corpus

(legal, code, logs) will reorder the table. Build a small labeled set and measure

recall@k yourself (see [RAG evaluation](rag-evaluation.md)). Open vs API is mostly a

data-governance and cost-at-scale question: self-hosting a 0.6B embedder is trivial on

one GPU; API wins on zero ops and (for Cohere/Voyage) long-input handling.

#### Matryoshka representation learning (MRL)

Training forces the first N dimensions to be independently usable, so a 1536-d or

2048-d vector truncates to 256-512 dims with small recall loss. Practical effect:

3-8x storage and memory-bandwidth savings, faster approximate nearest neighbor (ANN) search. Common pattern:

retrieve with truncated + binary-quantized vectors, rescore top candidates with

full-precision vectors.

#### Late interaction (ColBERT-style)

Instead of one vector per chunk, keep one vector per token and score with MaxSim at

query time. Much better fine-grained matching than single-vector ("bi-encoder")

retrieval, cheaper than a cross-encoder because document token vectors are

precomputed. Cost: 10-100x storage. Jina-ColBERT v2 is the current leading model;

Qdrant, Vespa, and LanceDB support multi-vector natively. Most teams get similar

quality more cheaply with single-vector retrieval + a reranker; late interaction earns

its keep when reranker latency is the bottleneck or recall on precise phrasing matters.

### ANN indexes

Exact k-NN is O(n) per query; approximate nearest neighbor indexes trade a little recall

for orders of magnitude of speed.

- **HNSW** (hierarchical navigable small world): multi-layer proximity graph; the
  default everywhere (pgvector, Qdrant, Weaviate, Milvus). High recall, fast queries,

  but memory-resident and slower to build; tune `M` and `ef_search` (recall vs latency).

- **IVF** (inverted file): k-means partition the space, search only `nprobe` nearest
  cells. Cheaper to build, lower memory, worse recall/latency tradeoff than HNSW;

  needs retraining as data drifts.

- **PQ** (product quantization): compress vectors into subvector codebooks; usually
  composed as IVF-PQ (Faiss) for billion-scale in bounded RAM. **ScaNN** (Google) is

  anisotropic quantization with layouts friendly to SIMD (single instruction, multiple data) CPU instructions; state of the art

  throughput/recall on CPU.

- **DiskANN / Vamana**: graph index on SSD with compressed vectors in RAM; the basis
  of pgvectorscale's StreamingDiskANN and Turbopuffer-style object-storage designs.

  This is how you serve 100M+ vectors without 100M vectors of RAM.

Rule of thumb: < ~1M vectors, nothing matters, even brute force with SIMD is fine;

1M-50M, HNSW; beyond that, IVF-PQ/DiskANN-style or a managed service.

### Vector databases

| Store | Shape | When |
| --- | --- | --- |
| **pgvector** (+ pgvectorscale) | Postgres extension | You already run Postgres; up to low tens of millions of vectors; you want SQL joins with metadata |
| **Qdrant** | Rust, open source, managed cloud | Best default dedicated engine; excellent filtered search (payload indexes), low latency, light ops |
| **Milvus / Zilliz** | Distributed, open source | Billion-scale, GPU indexing; real ops burden, needs a team |
| **Weaviate** | Go, open source, managed | Built-in hybrid (BM25 + dense) and module ecosystem |
| **Pinecone** | Proprietary serverless | Zero-ops managed, pay-per-use; fine choice if vendor lock-in is acceptable |
| **LanceDB** | Embedded, Lance columnar format | Local-first, edge, multimodal data science; no server, versioned data |
| **Turbopuffer** | Serverless on object storage | Huge namespace counts (per-tenant indexes), cold-storage economics; used by Cursor and Notion |

#### When Postgres + pgvector is enough (honest answer: usually)

For roughly 70% of production RAG workloads (under ~10M vectors, moderate queries per second (QPS)),

pgvector is the right call: one database for embeddings, documents, and metadata; real

transactions; SQL joins for filtering; no second system to operate. pgvectorscale's

DiskANN-based index closes much of the performance gap with dedicated engines.

Move off Postgres when you hit: 50-100M+ vectors, high-QPS filtered search where

pgvector's post-filtering hurts recall, multi-tenant isolation at large tenant counts

(Turbopuffer's sweet spot), or index-rebuild windows you cannot afford. Do not start

with a distributed vector DB for a 200K-chunk corpus; that is resume-driven

architecture.

### See also

- [The retrieval pipeline: chunking, hybrid search, query transformation, reranking](retrieval-pipeline.md): what happens around the index (chunking, hybrid, reranking).
- [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](../../papers/2018-10_bert/summary.md): ancestor of every bi-encoder and cross-encoder here.
