Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81508f99e1fa78c2bb41 as of 2026-09-30T19:28:46.040Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81508f99e1fa78c2bb41">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b" title="Topic: rag-and-retrieval"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Embeddings and vector search"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://a928a113-4add-4c2f-91c3-e1cae3b53f6b/e68034ef-504e-4c40-8967-cb443dcc897f?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=embeddings-and-vector-search.html">Interactive: Embeddings and vector search</embed>
⏱ 23 min read · +2h 30m resources
## What it is and why it matters
An **embedding model** turns a piece of text (or an image, a PDF page, a code file) into a fixed-length vector of numbers, trained so that things that mean similar things land close together. Once every chunk of a corpus is a vector, "find the passages relevant to this question" becomes "find the stored vectors nearest to the question's vector", which is a geometry problem a computer can solve over millions of items in milliseconds. That is the dense-retrieval half of every RAG (retrieval-augmented generation) system, and the reason it works on paraphrase: "how do I get my money back" and "refund policy" share no words but land near each other.
Three decisions make up this layer, and this page takes them in order: **which model** makes the vectors, **which index** finds the nearest ones quickly, and **which store** holds them next to the documents and metadata. The index is the part with a real mechanism, and it is where most of the performance, memory and recall trade-offs live.
## Definitions
- **Embedding**: a vector $`\mathbf{v} \in \mathbb{R}^d`$ produced by a model from one input; $`d`$ (the dimension) is typically 256 to 4096.
- **Bi-encoder**: an embedding model used for retrieval. Query and document are encoded **separately**, so every document vector can be computed once at index time and only the query is encoded at search time. Almost every modern bi-encoder descends from the BERT encoder recipe or, increasingly, from an LLM backbone.
- **Cross-encoder**: a model that reads (query, document) **together** and outputs one relevance score. More accurate, but nothing can be precomputed, so it is used as a reranker over a short candidate list, never as the first stage.
- **Similarity function**: how closeness is measured: dot product, cosine similarity or Euclidean (L2) distance, defined below.
- **k-NN (k nearest neighbours)**: the exact $`k`$ stored vectors most similar to the query.
- **ANN (approximate nearest neighbour) search**: an index that returns *most* of the true k-NN far faster than checking every vector.
- **ANN recall@k**: the fraction of the exact top $`k`$ that the index actually returns. This is a property of the index, not of the model, and is a different quantity from the relevance recall@k measured against human labels on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>. A retrieval system loses recall twice: once because the model places a relevant chunk far from the query, and again because the index misses a neighbour the model placed correctly.
## Similarity: dot product, cosine and L2
$$
\mathbf{q} \cdot \mathbf{d} = \sum_{i=1}^{d} q_i d_i, \qquad \cos(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \, \|\mathbf{d}\|}, \qquad \|\mathbf{q} - \mathbf{d}\| = \sqrt{\sum_{i=1}^{d} (q_i - d_i)^2}
$$
where
- $`\mathbf{q}`$ is the query vector and $`\mathbf{d}`$ a document vector, both of dimension $`d`$, with components $`q_i`$ and $`d_i`$;
- $`\|\mathbf{v}\| = \sqrt{\mathbf{v} \cdot \mathbf{v}}`$ is the length (L2 norm) of a vector;
- the dot product grows with both the angle agreement and the lengths; cosine similarity keeps only the angle, in $`[-1, 1]`$; L2 distance is small when the vectors are close, so it ranks in the opposite direction.
When every vector is normalised to length 1, the three give **the same ranking**, because
$$
\|\mathbf{q} - \mathbf{d}\|^2 = \|\mathbf{q}\|^2 + \|\mathbf{d}\|^2 - 2\,\mathbf{q} \cdot \mathbf{d} = 2 - 2\cos(\mathbf{q}, \mathbf{d}) \quad \text{when } \|\mathbf{q}\| = \|\mathbf{d}\| = 1
$$
where the middle step expands the square and the last uses $`\|\mathbf{q}\| = \|\mathbf{d}\| = 1`$, so $`\mathbf{q} \cdot \mathbf{d} = \cos(\mathbf{q}, \mathbf{d})`$. This is why providers normalise their output (OpenAI's embeddings are normalised to length 1, so a dot product *is* the cosine, per [OpenAI's embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)) and why a fast inner-product index can serve a model trained for cosine.
**Worked example.** Query $`\mathbf{q} = (0.6, 0.8)`$, length 1. Three documents: $`\mathbf{d}_1 = (1, 0)`$, $`\mathbf{d}_2 = (0, 1)`$, and $`\mathbf{d}_3 = (2, 0)`$, which points the same way as $`\mathbf{d}_1`$ but is twice as long.
- Dot products: $`\mathbf{q} \cdot \mathbf{d}_1 = 0.6`$, $`\mathbf{q} \cdot \mathbf{d}_2 = 0.8`$, $`\mathbf{q} \cdot \mathbf{d}_3 = 1.2`$. Ranking: $`\mathbf{d}_3, \mathbf{d}_2, \mathbf{d}_1`$.
- Cosines: $`0.6 / 1 = 0.6`$, $`0.8 / 1 = 0.8`$, $`1.2 / 2 = 0.6`$. Ranking: $`\mathbf{d}_2`$ first, $`\mathbf{d}_1`$ and $`\mathbf{d}_3`$ tied.
- L2 distances: $`\sqrt{0.4^2 + 0.8^2} = 0.894`$, $`\sqrt{0.6^2 + 0.2^2} = 0.632`$, $`\sqrt{1.4^2 + 0.8^2} = 1.612`$. Ranking: $`\mathbf{d}_2, \mathbf{d}_1, \mathbf{d}_3`$.
- Check the identity on the unit vectors: $`2 - 2 \times 0.8 = 0.4 = 0.632^2`$.
The dot product put the longest vector first although it points away from the query more than $`\mathbf{d}_2`$ does. With unnormalised vectors the metric is a modelling choice, and the index must use the metric the model was trained with.
## How embedding models are trained
Modern embedders are trained **contrastively**: for each query in a batch, its matching passage is the positive and the other passages in the batch (plus mined "hard negatives", passages that look relevant but are not) are negatives. The loss is InfoNCE, a softmax cross-entropy that asks the model to pick the positive out of the batch:
$$
\mathcal{L} = -\frac{1}{B} \sum_{i=1}^{B} \log \frac{\exp\big(s(\mathbf{q}_i, \mathbf{d}_i) / \tau\big)}{\sum_{j=1}^{B} \exp\big(s(\mathbf{q}_i, \mathbf{d}_j) / \tau\big)}
$$
where
- $`B`$ is the batch size, and $`(\mathbf{q}_i, \mathbf{d}_i)`$ the $`i`$-th query and its positive passage;
- $`\mathbf{d}_j`$ for $`j \neq i`$ are the in-batch negatives (hard negatives are appended to the same sum);
- $`s`$ is the similarity, usually cosine;
- $`\tau`$ is a temperature, a small constant that sharpens the softmax.
Why it produces a usable geometry: minimising the loss pulls each query towards its positive and pushes it away from everything else in the batch, so after training, distance encodes relevance. The information-theoretic reading of InfoNCE (an $`N`$-way classification whose loss lower-bounds mutual information, which is why large batches help) is derived on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>.
Two further training choices matter to a user of the model:
- **Instruction-aware or asymmetric encoding.** Queries are short questions and documents are long passages, so models encode them differently: Qwen3-Embedding takes a task instruction prefixed to the query, and Cohere Embed v4 takes an input type (`search_query` or `search_document`). Encoding a query as if it were a document silently costs recall.
- **Pooling.** A transformer outputs one vector per token; the embedding is a pooled summary (the mean of the token vectors, a special token's vector, or for decoder backbones the last token's vector). Late interaction, below, skips the pooling and keeps every token vector.
## Embedding model landscape
Two families: API models and open weights. The flagships listed here all offer Matryoshka dimensions (a vector you can truncate, explained below), and most take a task instruction or an input type.
**API models**
- **Gemini Embedding**: gemini-embedding-001 reported state-of-the-art results on MMTEB (the massive multilingual variant of MTEB, the Massive Text Embedding Benchmark) when its paper appeared in March 2025 ([arXiv 2503.07891](https://arxiv.org/abs/2503.07891)). Its successor **Gemini Embedding 2** (`gemini-embedding-2-preview`, public preview from March 2026) is natively multimodal: text up to 8,192 tokens, images, video up to 120 seconds, audio and PDFs of up to 6 pages all land in one vector space, with 3,072 dimensions by default and 1,536 or 768 recommended via MRL ([Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2/)). The low-friction managed choice.
- **Voyage 4 family**: voyage-4-large, voyage-4, voyage-4-lite and the open-weight voyage-4-nano share one embedding space, so documents indexed with one model can be queried with another. voyage-4-large is a mixture-of-experts (MoE) model, which Voyage describes as the first production-grade MoE embedder. Dimensions 2048, 1024, 512 or 256 via MRL; float32, int8 and binary output ([Voyage](https://blog.voyageai.com/2026/01/15/voyage-4/)). Prices per million tokens: \$0.12 (voyage-4-large), \$0.06 (voyage-4), \$0.02 (voyage-4-lite), after 200M free tokens ([Voyage pricing](https://docs.voyageai.com/docs/pricing)). **voyage-code-4** (August 2026) targets coding-agent retrieval: trained on issue-fixing pull requests, 32K-token context, the same four dimensions, \$0.12/M tokens ([Voyage](https://blog.voyageai.com/2026/08/13/voyage-code-4/)).
- **Cohere Embed v4**: 128K-token input window (whole documents, no chunk-for-the-embedder gymnastics), text, images and mixed text-image documents such as PDFs, dimensions 256, 512, 1024 or 1536 (default) ([Cohere](https://docs.cohere.com/docs/cohere-embed)), and input types (`search_query` / `search_document`).
- **OpenAI text-embedding-3-large/small**: 3,072 and 1,536 dimensions, 8,192 input tokens, shortenable with a `dimensions` parameter; MTEB 64.6 and 62.3 on OpenAI's own reported average ([OpenAI](https://developers.openai.com/api/docs/guides/embeddings)). No longer near the top of MTEB but cheap (3-small at about \$0.02/M tokens, 3-large at about \$0.13/M, from OpenAI's 62,500 and 9,615 pages per dollar at 800 tokens a page) and everywhere; fine for low-stakes retrieval.
**Open weights**
- **Qwen3-Embedding 0.6B/4B/8B** (Apache 2.0): the 8B scored 70.58 on MTEB Multilingual (MMTEB), first on that leaderboard on 5 June 2025 and ahead of gemini-embedding-exp-03-07 at 68.37; the 4B scored 69.45 and the 0.6B 64.33. Up to 4,096 dimensions with MRL down to 32, 32K-token input, instruction-aware ([model card](https://huggingface.co/Qwen/Qwen3-Embedding-8B)). The 0.6B is the natural small self-host option. Paired Qwen3-Reranker models.
- **BGE family (BAAI)**: bge-m3 produces dense, multi-vector and sparse outputs from one multilingual model, which makes it the usual pick when one self-hosted model has to feed all three retrieval styles.
- Others worth knowing: NV-Embed, the E5-Mistral lineage, Jina embeddings v4.
### Choosing a model
MTEB rank is a prior, not a verdict: models are tuned against it, and your corpus (legal, code, logs) will reorder the table. Build a small labelled set and measure recall@k yourself, as described on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>: a few hundred real queries with their relevant chunk IDs, recall@10 for each candidate model, same chunking. Open against API is mostly a data-governance and cost-at-scale question: self-hosting a 0.6B embedder is trivial on one GPU; APIs win on zero operations and (for Cohere and Voyage) long-input handling. Changing model means re-embedding the whole corpus, because vectors from two different models live in unrelated spaces; Voyage 4's shared space is the deliberate exception within that family.
## Making vectors smaller: Matryoshka and quantization
At 10 million chunks, the vectors themselves are the memory bill. Two independent tricks shrink them, and they compose.
### Matryoshka representation learning (MRL)
MRL ([Kusupati et al., 2022](https://arxiv.org/abs/2205.13147)) trains the model so that the **first **$`m`$** dimensions are a usable embedding on their own**, for a set of nested sizes. The training loss is summed over the prefixes:
$$
\mathcal{L}_{\text{MRL}} = \sum_{m \in \mathcal{M}} c_m \, \mathcal{L}\big(\mathbf{v}_{1:m}\big)
$$
where
- $`\mathcal{M}`$ is the set of nested sizes, for example $`\{256, 512, 1024, 2048\}`$;
- $`\mathbf{v}_{1:m}`$ is the first $`m`$ components of the full embedding (renormalised before use);
- $`\mathcal{L}`$ is the ordinary training loss (the contrastive loss above), applied to the truncated vector;
- $`c_m`$ is a weight per size, often 1.
Because the most important information is forced into the leading dimensions, a 1536-d or 2048-d vector truncates to 256 to 512 dims with a small recall loss, a 3x to 8x saving in storage and memory bandwidth and a matching speed-up in search. The paper reports up to 14x smaller embeddings at the same ImageNet accuracy and up to 14x real-world retrieval speed-ups. Truncating a vector from a model *not* trained this way throws away information at random, so check that the model supports it.
### Scalar and binary quantization
Quantization stores each dimension in fewer bits.
- **Scalar (int8)**: each dimension's range, estimated from a calibration sample, is cut into 256 buckets and each value is stored as one byte: 4x smaller than float32.
- **Binary**: each dimension of a normalised embedding is thresholded at 0 and stored as one bit: 32x smaller, and similarity becomes Hamming distance (the count of differing bits), which a CPU computes in a couple of instructions.
- **Rescoring**: retrieve more candidates than needed with the cheap vectors (for example 4x top-$`k`$), then re-rank those candidates with the full-precision query. In Hugging Face's measurements, binary quantization kept about 92.5% of retrieval quality without rescoring and up to about 96% with it, at a 32x memory saving and roughly 25x average speed-up; int8 kept about 99% with a rescore multiplier of 4 to 5, at a 4x saving ([Hugging Face](https://huggingface.co/blog/embedding-quantization)).
The common production pattern follows: retrieve with truncated, binary-quantized vectors held in RAM, then rescore the top candidates with full-precision vectors kept on disk.
**Worked example: the memory bill.** 10 million chunks at 1024 dimensions.
- float32: $`10^7 \times 1024 \times 4`$ bytes $`= 40.96`$ GB.
- float16 (pgvector's `halfvec`): 20.48 GB. int8: 10.24 GB.
- binary: 1024 bits $`= 128`$ bytes per vector, so 1.28 GB, 32x smaller.
- MRL to 256 dims and binary: 32 bytes per vector, 0.32 GB, 128x smaller than the float32 original.
- The HNSW graph on top (next section) costs roughly $`M \times 8`$ to $`M \times 10`$ bytes per vector: at $`M = 16`$, 128 to 160 bytes, so 1.28 to 1.6 GB, as much as the binary vectors themselves.
## Late interaction (ColBERT-style)
Instead of one vector per chunk, keep **one vector per token** and score with MaxSim at query time ([ColBERT, Khattab and Zaharia, 2020](https://arxiv.org/abs/2004.12832)):
$$
s(q, d) = \sum_{i=1}^{|q|} \max_{j = 1, \dots, |d|} \; \mathbf{q}_i \cdot \mathbf{d}_j
$$
where
- $`|q|`$ and $`|d|`$ are the numbers of tokens in the query and the document;
- $`\mathbf{q}_i`$ is the vector of query token $`i`$ and $`\mathbf{d}_j`$ that of document token $`j`$ (both normalised, so each dot product is a cosine);
- for each query token, the max picks its best-matching document token, and the scores are summed over query tokens.
**Worked example.** A 2-token query against a 3-token document, with token similarities $`(0.9, 0.2, 0.1)`$ for query token 1 and $`(0.3, 0.1, 0.7)`$ for query token 2. MaxSim takes $`0.9`$ from the first row and $`0.7`$ from the second: $`s = 0.9 + 0.7 = 1.6`$. Every query token must find its own match somewhere in the document, which is exactly what one pooled vector blurs away. With mean pooling and dot products, the single-vector score is the *average* of the same matrix, because $`\bar{\mathbf{q}} \cdot \bar{\mathbf{d}} = \frac{1}{|q|\,|d|} \sum_{i,j} \mathbf{q}_i \cdot \mathbf{d}_j`$ (where $`\bar{\mathbf{q}}`$ and $`\bar{\mathbf{d}}`$ are the mean token vectors): here $`2.3 / 6 = 0.383`$. Now take a second document whose three tokens all match query token 1 well and none matches token 2, similarities $`(0.9, 0.8, 0.85)`$ and $`(0.1, 0.2, 0.15)`$. Its average is $`3.0 / 6 = 0.5`$, so the pooled score prefers it, but its MaxSim is $`0.9 + 0.2 = 1.1`$, below the first document's 1.6: late interaction rewards covering every part of the query, pooling rewards matching one part many times.
It gives much better fine-grained matching than single-vector bi-encoder retrieval, and it is cheaper than a cross-encoder because the document token vectors are precomputed. The cost is storage: a 300-token chunk at ColBERT's 128 dimensions per token is $`300 \times 128 = 38{,}400`$ numbers against 1,024 for one single-vector embedding, 37.5x more, which is why the usual range quoted is 10x to 100x. ColBERTv2's residual compression cuts that footprint by 6x to 10x ([Santhanam et al., 2022](https://arxiv.org/abs/2112.01488)). Models in use include Jina-ColBERT v2 (multilingual), GTE-ModernColBERT (on the ModernBERT encoder), and ColPali and ColQwen, which apply late interaction to images of document pages. Qdrant, Vespa and LanceDB support multi-vector natively. Most teams get similar quality more cheaply with single-vector retrieval plus a reranker; late interaction earns its keep when reranker latency is the bottleneck or recall on precise phrasing matters.
## ANN indexes: how they work
Exact k-NN compares the query with every stored vector: $`O(n \cdot d)`$ work per query, which at 1M vectors of 1024 dims is about a billion multiply-adds. Approximate nearest neighbour indexes trade a little recall for orders of magnitude of speed, and they do it in one of two ways: **partition** the space and search only the promising parts (IVF), or **build a graph** and walk it towards the query (HNSW, DiskANN). Compression (PQ, ScaNN) is layered on either.
### IVF: partition, then probe
**IVF** (inverted file) runs k-means on the vectors to find $`C`$ centroids, then assigns every vector to the list of its nearest centroid (its "cell"). At query time it compares the query with the $`C`$ centroids, picks the `nprobe` nearest cells, and scans only the vectors in those cells.
$$
\text{distance computations} \approx C + \texttt{nprobe} \times \frac{n}{C}
$$
where
- $`n`$ is the number of stored vectors and $`C`$ the number of cells (pgvector calls it `lists`);
- `nprobe` (pgvector: `ivfflat.probes`, default 1) is how many cells are scanned;
- $`n / C`$ is the average cell size, assuming balanced cells.
**Worked example.** pgvector's recommendation is `lists` $`= n / 1000`$ up to 1M rows and $`\sqrt{n}`$ above, and `probes` $`= \sqrt{\texttt{lists}}`$ as a starting point ([pgvector](https://github.com/pgvector/pgvector)). For $`n = 1{,}000{,}000`$: $`C = 1000`$ cells of about 1000 vectors, `probes` $`\approx 32`$, so the query costs $`1000 + 32 \times 1000 = 33{,}000`$ distance computations instead of 1,000,000, about 30x fewer.
Recall is lost at cell boundaries: a true neighbour sitting just across the border of an unprobed cell is never seen, and raising `nprobe` is the only fix. IVF is cheap to build and light on memory, with a worse recall-latency trade-off than HNSW, and its centroids are fixed at build time, so it needs retraining as the data drifts (new data piles into a few cells and they become slow).
### PQ: compress the vectors
**PQ** (product quantization, [Jégou, Douze and Schmid, 2011](https://ieeexplore.ieee.org/document/5432202)) splits each $`d`$-dimensional vector into $`m`$ subvectors of $`d/m`$ dimensions, runs k-means with 256 centroids separately in each subspace, and stores each subvector as the one-byte index of its nearest centroid. A vector becomes $`m`$ bytes. Distances are computed without decompressing, by table lookup:
$$
\|\mathbf{q} - \mathbf{x}\|^2 \approx \sum_{j=1}^{m} \big\|\mathbf{q}^{(j)} - \mathbf{c}^{(j)}_{\,\text{code}_j(\mathbf{x})}\big\|^2
$$
where
- $`\mathbf{q}^{(j)}`$ is the $`j`$-th subvector of the (uncompressed) query;
- $`\text{code}_j(\mathbf{x}) \in \{0, \dots, 255\}`$ is the stored byte for subvector $`j`$ of database vector $`\mathbf{x}`$, and $`\mathbf{c}^{(j)}_{c}`$ is centroid $`c`$ of subspace $`j`$;
- for each query, the $`m \times 256`$ distances from its subvectors to every centroid are computed once into a table, so each database vector then costs $`m`$ lookups and additions (asymmetric distance computation: the query stays exact, only the database is compressed).
**Worked example.** A 1024-d float32 vector is 4,096 bytes. With $`m = 64`$ subvectors of 16 dims, it becomes 64 bytes: 64x smaller. The codebooks cost $`64 \times 256 \times 16 \times 4`$ bytes $`= 1`$ MiB once for the whole index. Per query, the table is $`64 \times 256 = 16{,}384`$ small distances; after that, scoring a vector is 64 lookups instead of 1,024 multiply-adds.
PQ is usually composed with IVF as **IVF-PQ** (as in Faiss), encoding each vector's residual from its cell centroid, which is how billion-scale collections fit in bounded RAM. **ScaNN** (Google, [Guo et al., 2020](https://arxiv.org/abs/1908.10396)) changes what the quantizer minimises: its anisotropic quantization penalises the error component parallel to the original vector more than the orthogonal one, because that component is what distorts the large inner products that decide the top results, and it lays the codes out for SIMD (single instruction, multiple data) CPU instructions. At its release in July 2020 it handled roughly twice the queries per second of the next-fastest of eleven tuned libraries at equal accuracy on ann-benchmarks' glove-100-angular ([Google Research](https://research.google/blog/announcing-scann-efficient-vector-similarity-search/)).
### HNSW: a layered proximity graph
**HNSW** (hierarchical navigable small world, [Malkov and Yashunin, 2016](https://arxiv.org/abs/1603.09320)) links every vector to its near neighbours and searches by walking the graph greedily towards the query. A single flat graph needs many short hops to cross the space, so HNSW stacks several graphs, like an express, a fast and a stopping train line:
- **Levels.** Each inserted vector draws a top level $`\ell = \lfloor -\ln(U) \cdot m_L \rfloor`$, with $`U`$ uniform on $`(0, 1)`$ and $`m_L = 1/\ln M`$. So the probability of reaching level $`\ell`$ or higher is $`M^{-\ell}`$: every vector is in layer 0, about one in $`M`$ is also in layer 1, one in $`M^2`$ in layer 2, and so on. Upper layers are sparse and their links are long.
- **Search.** Start at the entry point in the top layer and move greedily to whichever neighbour is closest to the query, until no neighbour is closer; drop one layer and repeat from there. In layer 0, run a beam search that keeps the best `ef_search` candidates found so far, expanding the closest unexpanded candidate until none can improve the list, and return the top $`k`$.
- **Insertion.** A new vector is placed by the same search, with a beam of `ef_construction`, at every layer from its top level down; it is linked to $`M`$ neighbours per layer, links go both ways, and a node may hold at most $`M`$ links in the upper layers and $`2M`$ in layer 0, so a neighbour whose list overflows drops its worst link. The neighbours are chosen with a diversity heuristic: a candidate is kept only if it is closer to the new vector than to any neighbour already kept, which preserves links in several directions (including the long links between clusters) rather than $`M`$ links into one clump.
- **Knobs.** $`M`$ (pgvector `m`, default 16) sets links per node: more links, better recall, more memory. `ef_construction` (default 64) sets build quality against build time. `ef_search` (pgvector `hnsw.ef_search`, default 40) is the query-time recall-latency dial, and can be changed per query without rebuilding.
**Worked example.** One million vectors at $`M = 16`$: $`m_L = 1/\ln 16 = 0.361`$. About $`10^6 / 16 = 62{,}500`$ vectors reach layer 1, $`3{,}906`$ layer 2, $`244`$ layer 3, $`15`$ layer 4 and about 1 layer 5, so the hierarchy is $`\log_{16} 10^6 \approx 5`$ layers deep and the greedy descent takes a handful of hops per layer. The graph costs roughly $`M \times 8`$ to $`M \times 10`$ bytes per vector ([hnswlib](https://github.com/nmslib/hnswlib)), 128 to 160 MB here, on top of the 4.1 GB of float32 vectors at 1024 dims.
HNSW is the default in pgvector, Qdrant, Weaviate and Milvus: high recall, fast queries, and incremental inserts with no training step. It costs memory (graph and vectors should be RAM-resident, because every hop is a random access) and build time; pgvector's documentation puts it as a better speed-recall trade-off than IVFFlat with slower builds and more memory.
### DiskANN and Vamana: a graph built for SSD
**DiskANN** ([Subramanya et al., 2019](https://papers.nips.cc/paper/2019/hash/09853c7fb1d3f8ee67a61b6bf4a7f8e6-Abstract.html)) keeps a single flat graph (built by its **Vamana** algorithm) on SSD with PQ-compressed vectors in RAM. Vamana prunes a node's candidate edges with a factor $`\alpha > 1`$: an edge to $`p'`$ is dropped only if an already kept neighbour $`p^*`$ is much closer to $`p'`$, $`\alpha \cdot d(p^*, p') \le d(p, p')`$. Being lenient keeps longer edges, so a search needs fewer hops, and on SSD every hop is a random read. The search walks the graph using the in-RAM compressed vectors to choose where to go, reads each visited node's full vector and neighbour list from SSD in one block, and re-ranks the final candidates at full precision. The paper served a billion-point dataset from a 16-core workstation with 64 GB of RAM and an inexpensive SSD at over 5,000 queries a second, under 3 ms mean latency and 95%+ 1-recall@1, and indexed 5x to 10x more points per node than in-memory graph methods. This is how you serve 100M+ vectors without 100M vectors of RAM; pgvectorscale's StreamingDiskANN index is based on it.
Serving from object storage (S3) pushes the other way: Turbopuffer uses a centroid-based index derived from SPFresh rather than a graph, because each probe of a cell is a small number of object-storage round trips, where a graph walk would be one round trip per hop ([Turbopuffer](https://turbopuffer.com/docs/architecture)).
### Filters and ANN
Most real queries carry a filter (tenant, date, access rights), and an ANN index knows nothing about it. If the filter is applied to the index's output, a selective filter empties the result: pgvector's own example is a condition matching 10% of rows with the default `ef_search` of 40, which leaves only 4 rows on average ([pgvector](https://github.com/pgvector/pgvector)). The fixes are to widen the search until enough rows pass (pgvector's iterative index scans, from 0.8.0, visiting up to `hnsw.max_scan_tuples`, 20,000 by default), or to make the index filter-aware during the walk (Qdrant's payload indexes, pgvectorscale's label-based filtered DiskANN). Where filtering sits in the wider pipeline, including tenant isolation, is covered on <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>.
### Choosing an index
<table header-row="true">
<tr>
<td>Index</td>
<td>Memory</td>
<td>Build</td>
<td>Recall at a given latency</td>
<td>Main knobs</td>
</tr>
<tr>
<td>Flat (brute force)</td>
<td>Vectors only</td>
<td>None</td>
<td>Exact</td>
<td>None</td>
</tr>
<tr>
<td>IVF</td>
<td>Vectors plus centroids</td>
<td>k-means; retrain on drift</td>
<td>Good; lost at cell borders</td>
<td>`lists`, `probes`</td>
</tr>
<tr>
<td>IVF-PQ</td>
<td>$`m`$ bytes per vector</td>
<td>k-means plus codebooks</td>
<td>Lower; rescore to recover</td>
<td>`lists`, `probes`, $`m`$</td>
</tr>
<tr>
<td>HNSW</td>
<td>Vectors plus about $`8M`$ to $`10M`$ bytes each, in RAM</td>
<td>Slow, incremental</td>
<td>Best in memory</td>
<td>`m`, `ef_construction`, `ef_search`</td>
</tr>
<tr>
<td>DiskANN / Vamana</td>
<td>Compressed vectors in RAM, rest on SSD</td>
<td>Slow</td>
<td>High, at SSD latency</td>
<td>Degree, $`\alpha`$, search list size</td>
</tr>
</table>
Rule of thumb: below about 1M vectors, nothing matters much, and even brute force with SIMD is fine; from 1M to 50M, HNSW; beyond that, IVF-PQ or DiskANN-style indexes, or a managed service.
## Vector databases
<table header-row="true">
<tr>
<td>Store</td>
<td>Shape</td>
<td>When</td>
</tr>
<tr>
<td>**pgvector** (+ pgvectorscale)</td>
<td>Postgres extension</td>
<td>You already run Postgres; up to low tens of millions of vectors; you want SQL joins with metadata</td>
</tr>
<tr>
<td>**Qdrant**</td>
<td>Rust, open source, managed cloud</td>
<td>Best default dedicated engine; excellent filtered search (payload indexes), low latency, light ops</td>
</tr>
<tr>
<td>**Milvus / Zilliz**</td>
<td>Distributed, open source</td>
<td>Billion-scale, GPU indexing; real ops burden, needs a team</td>
</tr>
<tr>
<td>**Weaviate**</td>
<td>Go, open source, managed</td>
<td>Built-in hybrid (BM25 + dense) and module ecosystem</td>
</tr>
<tr>
<td>**Pinecone**</td>
<td>Proprietary serverless</td>
<td>Zero-ops managed, pay-per-use; fine choice if vendor lock-in is acceptable</td>
</tr>
<tr>
<td>**LanceDB**</td>
<td>Embedded, Lance columnar format</td>
<td>Local-first, edge, multimodal data science; no server, versioned data</td>
</tr>
<tr>
<td>**Turbopuffer**</td>
<td>Serverless on object storage, centroid-based index, memory and NVMe cache in front of S3</td>
<td>Huge namespace counts (per-tenant indexes), cold-storage economics; used by Notion ([Turbopuffer](https://turbopuffer.com/)) and by Cursor for its code retrieval ([Google Cloud case study](https://cloud.google.com/customers/turbopuffer))</td>
</tr>
</table>
### When Postgres + pgvector is enough (honest answer: usually)
For most production RAG workloads (under about 10M vectors, moderate QPS, queries per second), pgvector is the right call: one database for embeddings, documents and metadata; real transactions; SQL joins for filtering; no second system to operate. It indexes `vector` up to 2,000 dimensions, `halfvec` up to 4,000 and `bit` up to 64,000, and supports HNSW and IVFFlat, half-precision and binary-quantized indexes, and L2, inner-product, cosine, L1, Hamming and Jaccard distances ([pgvector](https://github.com/pgvector/pgvector)). pgvectorscale's DiskANN-based index closes much of the performance gap with dedicated engines: Timescale's own benchmark, on 50M 768-d Cohere embeddings at 99% recall, reports 28x lower p95 latency and 16x higher throughput than Pinecone's storage-optimised index ([pgvectorscale](https://github.com/timescale/pgvectorscale)); it is a vendor benchmark, so read it as evidence that the gap is closable rather than as a ranking.
Move off Postgres when you hit: 50-100M+ vectors, high-QPS filtered search where post-filtering hurts recall even with iterative scans, multi-tenant isolation at large tenant counts (Turbopuffer's sweet spot), or index-rebuild windows you cannot afford. Do not start with a distributed vector DB for a 200K-chunk corpus; that is resume-driven architecture.
## Common mistakes and misconceptions
- **Mixing metrics.** Building an L2 or inner-product index over unnormalised vectors from a model trained for cosine changes the ranking (the worked example above). Normalise, or use the operator class that matches the model (pgvector's `vector_cosine_ops`).
- **Encoding queries as documents.** Asymmetric models need the query instruction or `search_query` input type at search time; leaving it out costs recall with no error message.
- **Mixing models in one index.** Vectors from different models, or different versions of one model, are not comparable. A model upgrade is a full re-embed.
- **Truncating a vector the model was not trained to truncate.** Only MRL-trained models keep their quality when cut; renormalise after truncating.
- **Confusing the two recalls.** ANN recall measures the index against exact search; retrieval recall measures the whole system against human labels. A perfect index cannot fix a model that puts the answer far from the query.
- **Quoting QPS without recall.** An index's throughput means nothing without the recall@k at which it was measured; every index gets faster by being less accurate.
- **Post-filtering a selective filter.** With a filter that passes 10% of rows and `ef_search` 40, you get about 4 results, not 10.
- **Setting ****`ef_search`**** or ****`probes`**** once and forgetting it.** They are per-query dials: raise them until measured ANN recall plateaus on your data, then stop.
- **Choosing infrastructure before the corpus is large.** Below about 1M vectors, the store and the index barely matter; chunking and the model matter much more.
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b">Topic: rag-and-retrieval</mention-page>: the map of the retrieval stack. This page is its embedding and index layer, underneath the pipeline, the architecture and evaluation layers.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>: what happens around the index. Chunking decides what each vector represents, hybrid search fuses these dense results with BM25 using reciprocal rank fusion, and a cross-encoder reranks the fused top 50 to 150.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>: how to measure whether a model or index change helped: recall@k against a labelled golden set, and the recall-first triage that tells you whether a wrong answer is a retrieval miss.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81e5ad9bd09cbf18ad7c"/>: the encoder recipe (masked-language-model pretraining of a bidirectional transformer) that every bi-encoder and cross-encoder here descends from.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>: InfoNCE as an $`N`$-way cross-entropy and a lower bound on mutual information, the reason contrastive embedders want large batches.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>: dot products, norms and projections, the geometry every similarity function on this page is built from.
## Best resources
- [Milvus: choosing an embedding model for RAG in 2026](https://milvus.io/blog/choose-embedding-model-rag-2026.md) (\~15 min): current landscape for retrieval-augmented generation (RAG) with Massive Text Embedding Benchmark (MTEB) numbers and cost.
- [Qwen3 Embedding technical report](https://arxiv.org/pdf/2506.05176) (45 min): how modern open embedders are trained: large language model (LLM) backbone, instruction-aware, Matryoshka representation learning (MRL).
- [Voyage 4 announcement](https://blog.voyageai.com/2026/01/15/voyage-4/) (\~8 min): mixture-of-experts (MoE) embedder, shared embedding space, Matryoshka and quantization options.
- [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) (\~10 min to explore): the scoreboard; filter by task and language, do not worship the top row.
- [Firecrawl: best vector databases 2026](https://www.firecrawl.dev/blog/best-vector-databases) (\~15 min) and [Encore's comparison](https://encore.dev/articles/best-vector-databases) (\~12 min): honest DB selection guides.
- [pgvector repo](https://github.com/pgvector/pgvector) (docs, \~30 min for the core pages) plus [pgvectorscale](https://github.com/timescale/pgvectorscale) (docs, \~15 min): what plain Postgres can actually do.
## Further reading
- [Malkov and Yashunin, Efficient and robust approximate nearest neighbor search using HNSW graphs](https://arxiv.org/abs/1603.09320): the HNSW paper, with the level distribution, the neighbour-selection heuristic and the search algorithm.
- [Subramanya et al., DiskANN](https://papers.nips.cc/paper/2019/hash/09853c7fb1d3f8ee67a61b6bf4a7f8e6-Abstract.html): the Vamana graph and billion-scale search from SSD.
- [Jégou, Douze and Schmid, Product quantization for nearest neighbor search](https://ieeexplore.ieee.org/document/5432202): PQ and asymmetric distance computation.
- [Guo et al., Accelerating large-scale inference with anisotropic vector quantization](https://arxiv.org/abs/1908.10396): the ScaNN paper.
- [Kusupati et al., Matryoshka representation learning](https://arxiv.org/abs/2205.13147): nested embeddings.
- [Khattab and Zaharia, ColBERT](https://arxiv.org/abs/2004.12832) and [Santhanam et al., ColBERTv2](https://arxiv.org/abs/2112.01488): late interaction and its compression.
- [Hugging Face: embedding quantization](https://huggingface.co/blog/embedding-quantization): binary and int8 quantization with rescoring, measured.
- [hnswlib, with its parameter guide linked from the README](https://github.com/nmslib/hnswlib): what `M`, `ef_construction` and `ef` do in practice.
- [Turbopuffer architecture](https://turbopuffer.com/docs/architecture): why a centroid index suits object storage.
</content>
</page>