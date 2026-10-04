# Handoff to search_and_vector_databases (from storage_engines_and_indexes, 2026-10-04)

The old child page "Storage engines, indexes, and the physics of a query" (Notion 3cd5c17b0d0d8102bc1fd11b22606e1a, fetched 2026-09-22, verbatim in `../../src/read/children/storage_engines_indexes_and_the_physics_of_a_query.md`) had an ANN section, a Lucene bullet, two resources and one latency row about vectors. The storage page maps them as owned by Search and vector databases (Notion 3ef5c17b0d0d815eb4caef9b4cd4d732) in its `src/coverage.json`. Please carry each fact, with the corrections below.

## Verbatim

### The ANN section
## ANN indexes for vector search (4 min)
Exact nearest neighbour over high-dimensional vectors is a brute-force scan, so every practical system trades recall for speed. Recall at k, the fraction of true neighbours returned, is a dial: quote latency and recall together, never latency alone.
- **Flat (brute force)**: exact, no build time, latency linear in corpus size. Genuinely correct below roughly 100k vectors, and the baseline you should measure recall against.
- **HNSW**: a multi-layer navigable small-world graph. Search descends from a sparse top layer to the dense bottom layer, greedily following edges. Excellent recall-versus-latency, and the default in pgvector, Qdrant, Weaviate, Milvus, Lucene, and Elasticsearch. Costs: the graph lives in RAM (roughly the vectors plus M times 8 to 12 bytes per node for edges, so a 1536-dimension float32 corpus needs about 6 KB per vector plus overhead), build is slow and single-pass-ish, and deletes are soft until a rebuild. Knobs: M (edges per node, higher means better recall and more memory), ef_construction (build effort), ef_search (query effort, the runtime recall dial).
- **IVF (inverted file)**: k-means the corpus into lists, then search only the nprobe closest lists. Build is fast, memory is small, and the recall dial is nprobe. The weakness is the boundary problem: a true neighbour in an unprobed cluster is simply lost, and quality decays as the corpus drifts from the centroids it was trained on. IVF needs a training step, which surprises people.
- **IVF-PQ**: IVF plus product quantisation, which splits each vector into subvectors and replaces each with a codebook id. Compression of 16x to 64x is normal, so a billion vectors fit in RAM, at the cost of a lossy distance estimate that usually needs a rerank pass over the original vectors. This is the classic FAISS billion-scale recipe. Scalar quantisation to int8 (4x) and binary quantisation (32x) with a rerank are the cheaper modern alternatives and are usually the first thing to try.
- **DiskANN (Vamana)**: a graph index designed so the graph lives on SSD and only a compressed representation stays in RAM, cutting memory cost by roughly an order of magnitude for a few extra milliseconds of latency. This is what makes billion-scale on one node affordable, and the design behind Azure's vector search, Milvus's disk index, and pgvectorscale.
- **ScaNN**: Google's anisotropic vector quantisation, which optimises the quantiser for inner-product ranking loss rather than reconstruction loss. The best QPS-versus-recall numbers on several ANN-Benchmarks tracks, and available in Postgres via pgvector's competitor extensions and in Vertex AI.
The thing that actually breaks in production is **filtered search**. "Nearest neighbours where tenant_id equals X and created_at is recent" is not what an ANN graph indexes. Pre-filtering then brute-forcing is correct but slow when the filter is loose; post-filtering the top-k is fast but returns nothing when the filter is selective. Good implementations evaluate the predicate during graph traversal, or maintain per-tenant indexes. Evaluate a vector store on this, not on unfiltered QPS.

### The inverted index bullet (from "Index families")
- **Inverted index (Lucene family)**: term to posting list, plus term frequencies and positions for BM25 scoring and phrase queries. Segments are immutable and merged in the background, which is LSM logic under a different name.

### Resources
- [Efficient and robust approximate nearest neighbor search using HNSW](https://arxiv.org/abs/1603.09320) (45 min) (Malkov and Yashunin, 2016): the paper behind nearly every vector index in production
- [ANN-Benchmarks](https://ann-benchmarks.com/) (\~20 min): the standing recall-versus-QPS comparison across ANN libraries. Look at the Pareto curves, not vendor blog numbers

### Latency table row
| HNSW ANN query, 1M vectors, in memory | 1 to 5 ms | Retrieval is not your RAG bottleneck; the LLM call is |

## Corrections and status (checked 2026-10-04)
- **"GiST and SP-GiST ... historically the ANN index in early pgvector" (corrected; the storage page carries this correction too).** pgvector never used GiST: its first release, 0.1.0 (2021-04-20), shipped IVFFlat (`CREATE INDEX ON table USING ivfflat (column)` in the v0.1.0 README); HNSW was added in 0.5.0 (2023-08-28, CHANGELOG). Latest 0.8.7 (2026-10-01, CHANGELOG). https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md
- **"HNSW ... the default in pgvector"**: pgvector has no default index; you choose HNSW or IVFFlat (README). Default parameters m 16, ef_construction 64, hnsw.ef_search 40 (verified by the root).
- **HNSW memory "M times 8 to 12 bytes per node"**: unconfirmed. 1,536-d float32 = 6,144 bytes of floats, 6,152 as pgvector stores a vector (verified, derived).
- **IVF-PQ 16x to 64x**: unconfirmed; int8 4x and binary 32x are derived (32/8, 32/1).
- **Flat search correct below about 100k vectors**: rule of thumb, unconfirmed.
- **DiskANN behind Azure, Milvus disk index, pgvectorscale**: unconfirmed; check each vendor's docs.
- **ScaNN "available in Postgres via pgvector's competitor extensions"**: imprecise; likely Google AlloyDB's ScaNN index (alloydb_scann extension). Name it precisely.
- **Filtered search**: pgvector applies filtering after the index scan; iterative index scans since 0.8.0 (README; verified by the root).
- **Latency row "HNSW 1M vectors 1 to 5 ms"**: unconfirmed; measure it on the chat corpus or cite ANN-Benchmarks at a stated recall.
- **Lucene segments "LSM logic under a different name"**: the storage page teaches LSM-trees (memtable, immutable sorted runs, merges) and can be linked for that analogy.
