# Coverage: the old "Embeddings and vector search" page (index material)

The page is new, but the parent's brief moves the index material of the old child "Embeddings and vector search" (Notion 3c65c17b0d0d81508f99e1fa78c2bb41, fetched read-only 2026-10-14, last edited 2026-09-30) here. Its embedding-model material (training, landscape, Matryoshka, quantization from the model's side, late interaction) belongs to the Embedding models and Rerankers siblings; its store comparison to the parent's Tool map. Each index claim was treated as an unverified note:

| Old claim | Where it is now | Verdict |
|---|---|---|
| ANN recall@k is a property of the index, distinct from relevance recall | Reading 1, with nDCG measured against ANN recall | kept, measured |
| Unit vectors: dot, cosine and L2 rank the same | Reading 1 (one line); full worked example stays with Embedding models and the Search and vector databases page | kept |
| IVF: k-means, cells, nprobe; distances = C + nprobe n/C; boundary loss; drift | Reading 3, with the boundary problem and drift measured | kept, measured |
| pgvector lists = n/1000, probes = sqrt(lists) worked example | Search and vector databases page (owner) | linked |
| PQ: m sub-vectors, 256 centroids, m bytes, ADC tables; 1,024-d to 64 bytes, codebooks 1 MiB | Reading 4, IVF-PQ lab | kept; FAISS code quoted |
| IVF-PQ encodes residuals | Reading 5, FAISS comment quoted | kept |
| ScaNN anisotropic quantization | Reading 8, run in a container | kept; the gain did not appear on these vectors (measured) |
| "ScaNN handled roughly twice the QPS of the next-fastest of eleven libraries" (Google blog 2020) | Reading 13 correction box | kept as an unconfirmed vendor claim |
| HNSW levels floor(-ln U mL), mL = 1/ln M, P(level >= l) = M^-l; 1M at M 16 gives 62,500 / 3,906 / 244 / 15 / 1 | Reading 6, measured level counts against the formula | kept, verified in code and on data |
| HNSW search: greedy descent, beam of ef_search on layer 0 | Reading 6, hnswlib and FAISS code quoted | kept; FAISS's different stop rule added |
| Insertion with ef_construction, M links, 2M on layer 0, diversity heuristic | Reading 6 | kept; corrected detail: the new node keeps at most M links even on layer 0 (hnswalg.h line 513); layer 0 fills to 2M through reverse links |
| Knobs and pgvector defaults (m 16, ef_construction 64, ef_search 40) | Reading 6 defaults table | kept, with seven more libraries |
| "Graph costs roughly M x 8 to M x 10 bytes per vector (hnswlib)" | Reading 11 formula and check; Reading 13 box | kept with its terms: 8M + 12 + about (4M+4)/(M-1) |
| "HNSW is the default in pgvector, Qdrant, Weaviate and Milvus" | Reading 13 box | corrected: pgvector has no default; Qdrant builds the graph only past indexing_threshold |
| DiskANN / Vamana: alpha prune, SSD layout, PQ in RAM, 1B on 64 GB at >5000 QPS < 3 ms 95%+ 1-recall@1 | Reading 7 | kept, paper re-read; Vamana measured from the paper's algorithms; new finding that alpha behaves differently at 1,024 dims |
| pgvectorscale StreamingDiskANN based on DiskANN | Reading 7 | kept |
| Turbopuffer's centroid index on object storage (SPFresh) | parent's Tool map (stores) | not repeated |
| Filters: post-filtering empties results (pgvector 10% example), iterative scans, filter-aware indexes (Qdrant payload indexes) | Reading 9, Filter lab | kept, measured (five strategies, Qdrant server, ACORN-1) |
| Index choice table and "below 1M nothing matters, 1M-50M HNSW, beyond IVF-PQ or DiskANN" | Reading 13 | rewritten from measurements; "nothing matters below 1M" corrected (defaults lose recall at any size; exact search is 22 ms at 523k) |
| Common mistakes: quoting QPS without recall; post-filtering; set-and-forget ef_search / probes; mixing metrics | Reading 14 | kept, each with a measured number |
| Further reading: HNSW, DiskANN, PQ, ScaNN papers; hnswlib | Further reading | kept, plus ACORN, RaBitQ, FreshDiskANN, SPANN, Big-ANN, Hubs, Faiss library |

No claim was dropped as wrong without a correction shown on the page.
