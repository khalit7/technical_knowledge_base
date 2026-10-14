Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782 as of 2026-09-30T19:20:08.006Z:
<page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b" title="Topic: rag-and-retrieval"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"The retrieval pipeline: chunking, hybrid search, query transformation, reranking"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://d5386ade-5ba7-45b8-94c3-778477142a13/22108e96-a240-4499-881a-073129dc6f3c?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=the-retrieval-pipeline.html">Interactive: The retrieval pipeline: chunking, hybrid search, query transformation, reranking</embed>
⏱ 19 min read · +1h 44m resources
## What it is and why it matters
The retrieval pipeline is everything that turns a document collection and a user question into the handful of passages an LLM reads before it answers. It has two halves. At **index time**, before any question arrives, documents are cut into chunks, each chunk gets its structured metadata, and the chunks are written into two indexes: a lexical one scored by BM25 (Best Match 25, the classic keyword ranking function) and a dense vector one. At **query time** the question is optionally rewritten, both indexes are searched with the metadata filters applied inside each search, the two ranked lists are fused, a cross-encoder reranks the fused shortlist, and the top few chunks go into the prompt.
The shape exists because of one asymmetry. A cheap first stage can look at millions of chunks but only roughly, so it is tuned for **recall** (do not lose the right chunk). An expensive second stage can only look at a hundred or so, but reads each one carefully, so it is tuned for **precision** (put the right chunk on top). Nothing downstream can recover a chunk the first stage never returned, and the generator can be distracted by every irrelevant chunk the second stage lets through.
The production default by 2026, in order:
1. **Index time**: contextualised chunks, each carrying its metadata (tenant, source, date, access control list), written to a BM25 index and a dense index.
2. **Query transformation** where the query needs it (conversational rewrite, multi-query, decomposition).
3. **Hybrid first-stage retrieval**: BM25 and dense search run in parallel, **each with the metadata filter applied during the search**, not after it.
4. **Fusion** of the two ranked lists with reciprocal rank fusion (RRF).
5. **Cross-encoder rerank of the top 50 to 150 fused candidates.**
6. **The top 5 to 20** reranked chunks into the prompt.
Metadata filtering is therefore not a stage between fusion and reranking: a filter applied to a list that has already been cut to a top-k is exactly the post-filtering that loses results (see *Metadata filtering* below), so the filter goes into each retriever's own search. Each stage is explained below in pipeline order.
## Definitions
- A **chunk** is the unit that is indexed, retrieved and pasted into the prompt: a span of a document, typically a few hundred tokens, stored with its metadata.
- **Sparse or lexical retrieval** scores a chunk by the query's words that literally occur in it. **BM25** is the standard scoring function; an inverted index (word to list of chunks containing it) makes it fast.
- **Dense retrieval** embeds the query and every chunk as vectors with a **bi-encoder** (query and chunk are encoded separately, so chunk vectors are computed once at index time) and returns the chunks whose vectors are nearest the query's, by cosine similarity. An **approximate nearest neighbour (ANN)** index such as HNSW (Hierarchical Navigable Small World) makes that search sublinear at the price of a little recall; the models and indexes are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81508f99e1fa78c2bb41"/>.
- **Hybrid search** runs sparse and dense retrieval on the same query and merges the two ranked lists.
- A **cross-encoder** reads the query and one chunk together in a single transformer pass and outputs one relevance score. It sees every interaction between query and chunk tokens, which is why it is more accurate than a bi-encoder, and it cannot precompute anything, which is why it is too slow to run over a whole corpus.
- **First stage** and **second stage**: first-stage retrieval (BM25, dense, fusion) produces candidates from the whole corpus; the second stage (the reranker) reorders a short list of them.
- **recall@k** is the fraction of a query's relevant chunks that appear in the top $`k`$ results. **nDCG@k** (normalised discounted cumulative gain) rewards relevant chunks more the higher they are ranked, and is the standard for comparing rerankers. Both are defined properly on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>.
- **Pre-filtering, post-filtering and filtered search**: a metadata filter can be applied before the vector search (search only the matching subset), after it (search, then discard non-matching results), or during it (the index traversal only accepts matching points).
## Chunking
Chunking decisions move retrieval quality more than embedding-model choice, because a chunk that has lost its document context cannot be matched by a query that assumes that context ("what is the refund window?" against a chunk that says "30 days" but never says "refund"). Inconsistent chunking is the most common silent killer: mixed strategies across ingestion runs can cost \~8 points of recall.
- **Fixed or recursive character splitting**: split on separators (paragraph, then sentence) to a target size, with overlap so that a sentence cut at a boundary survives whole in one of the two neighbours. 256 to 512 tokens with 10 to 20% overlap is the most reliable default; boring and hard to beat.
- **Structure-aware**: split on markdown headers, code blocks (function and class boundaries found with the tree-sitter parser), and table boundaries. Always prefer document structure when it exists.
- **Semantic chunking**: embed sentences and split where the cosine similarity between adjacent windows drops. Modest gains in studies, meaningful ingestion cost; helps most on unstructured prose.
- **Late chunking** (Jina): run the *whole document* through a long-context embedding model, then mean-pool the token embeddings inside each chunk's span. Because every token embedding was computed with attention over the whole document, each chunk vector carries document-wide context (resolved pronouns, the section's topic) at zero LLM cost. It needs a long-context embedder (Jina's experiments used jina-embeddings-v2-small-en, which takes 8,192 tokens) and gains most on long documents: nDCG@10 on the NFCorpus retrieval set rose from 23.46 to 29.98 over naive chunking ([Jina](https://jina.ai/news/late-chunking-in-long-context-embedding-models/)). Cheap and underused.
- **Contextual retrieval** (Anthropic): at index time, prompt an LLM with the whole document and one chunk and ask for a short context (usually 50 to 100 tokens) that situates the chunk in the document; prepend it to the chunk for both embedding and BM25. With prompt caching, which lets every chunk of one document reuse the cached document, the one-off cost was \$1.02 per million document tokens. In Anthropic's evaluation the top-20 retrieval failure rate fell from 5.7% to 3.7% with contextual embeddings (35% fewer failures), to 2.9% with contextual embeddings plus contextual BM25 (49%), and to 1.9% with reranking added (67%) ([Anthropic](https://www.anthropic.com/news/contextual-retrieval)). The quality ceiling for static pipelines.
Late chunking and contextual retrieval attack the same disease (chunks losing document context). A direct comparison found contextual retrieval preserves semantic coherence better but costs more compute, while late chunking is more efficient but loses some relevance and completeness ([Merola and Singh, arXiv 2504.19754](https://arxiv.org/abs/2504.19754)): contextual retrieval is stronger, late chunking is cheaper.
How many chunks a document produces follows from the size and the overlap. Each new chunk advances by the stride, the chunk size minus the overlap:
$$
n = \left\lceil \frac{L - o}{c - o} \right\rceil, \qquad T = L + (n - 1)\, o
$$
where:
- $`n`$ is the number of chunks for one document (for $`L > c`$; a document no longer than one chunk is one chunk);
- $`L`$ is the document length in tokens;
- $`c`$ is the chunk size in tokens and $`o`$ the overlap in tokens, so $`c - o`$ is the stride;
- $`\lceil \cdot \rceil`$ rounds up, because the last chunk may be shorter;
- $`T`$ is the total number of tokens stored and embedded, each overlap being stored twice.
Worked example: a 10,000-token document with $`c = 512`$ and $`o = 64`$ (12.5% overlap) has a stride of 448, so $`n = \lceil 9{,}936 / 448 \rceil = \lceil 22.18 \rceil = 23`$ chunks, and $`T = 10{,}000 + 22 \times 64 = 11{,}408`$ tokens: the overlap costs 14% more embedding and storage than the raw text.
## Query transformation
Applied before retrieval, to make the query look more like the chunks that answer it. Every transformation trades latency (usually an extra LLM call) for recall, so gate them on query difficulty, or let an agent decide: in agentic RAG the model writes its own queries and re-retrieves until it judges the context sufficient, as <mention-page url="https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8"/> explains.
- **Conversational rewriting**: resolve references ("it", "that release") against the chat history into a standalone query before any retrieval. Mandatory in chat products, because "what did it cost?" retrieves nothing useful on its own.
- **HyDE** (hypothetical document embeddings; Gao et al., 2022): have the LLM write a plausible answer, embed *that*, and search with it. An answer is closer in style and vocabulary to the chunks than a question is, which closes the query-document gap; it helps most on zero-shot corpora, adds an LLM call, and is largely superseded by instruction-aware embedders trained on real query distributions. A hallucinated detail in the hypothetical answer is only used for matching, never shown to the user.
- **Multi-query**: generate 3 to 5 paraphrases or perspectives of the query, retrieve for each, and fuse the lists with RRF. A cheap recall boost for ambiguous queries.
- **Decomposition**: split multi-hop questions ("compare X's approach to Y's") into sub-queries, retrieve per sub-query, and answer stepwise. By 2026 this is usually done by the agent loop rather than a fixed chain.
## Hybrid search: BM25 + dense, fused with RRF
Dense embeddings capture paraphrase and semantics but miss exact identifiers, part numbers, error codes and rare names, which carry little meaning for an embedding model and a great deal for a keyword match; BM25 is the reverse, blind to synonyms. Production systems run both on every query and fuse.
BM25 scores a chunk $`D`$ against a query $`Q`$ with terms $`q_1, \dots, q_m`$:
$$
\text{BM25}(D, Q) = \sum_{i=1}^{m} \text{IDF}(q_i) \cdot \frac{f(q_i, D)\,(k_1 + 1)}{f(q_i, D) + k_1 \left(1 - b + b \, \frac{|D|}{\text{avgdl}}\right)}
$$
where:
- $`f(q_i, D)`$ is how many times term $`q_i`$ occurs in chunk $`D`$;
- $`\text{IDF}(q_i)`$ is the inverse document frequency of the term, large for rare terms (an error code) and near zero for common ones ("the");
- $`k_1`$ (typically 1.2 to 2.0) sets how quickly repeated occurrences saturate, so the tenth mention adds far less than the first;
- $`b`$ (typically 0.75) sets how strongly long chunks are penalised;
- $`|D|`$ is the chunk's length in terms and $`\text{avgdl}`$ the average chunk length in the index.
The score is unbounded above, while cosine similarity lies in $`[-1, 1]`$, so the two scores cannot be added. **Reciprocal rank fusion** ignores the scores and fuses on ranks ([Cormack, Clarke and Buettcher, SIGIR 2009](https://dl.acm.org/doi/10.1145/1571941.1572114)):
$$
\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}
$$
where:
- $`d`$ is a candidate chunk;
- $`R`$ is the set of ranked lists being fused (here the BM25 list and the dense list; with multi-query, one list per query variant);
- $`\text{rank}_r(d)`$ is the position of $`d`$ in list $`r`$, starting at 1; a chunk absent from a list contributes nothing for it;
- $`k`$ is a smoothing constant, 60 by default in the original paper and in most implementations, which damps the advantage of the very top ranks so that agreement between lists counts for more than one list's first place.
Worked example with $`k = 60`$. The dense list returns A, B, C, D and the BM25 list returns C, D, E, A.
- C: $`1/(60+3) + 1/(60+1) = 0.015873 + 0.016393 = 0.032266`$
- A: $`1/61 + 1/64 = 0.016393 + 0.015625 = 0.032018`$
- D: $`1/64 + 1/62 = 0.015625 + 0.016129 = 0.031754`$
- B: $`1/62 = 0.016129`$ (dense only)
- E: $`1/63 = 0.015873`$ (BM25 only)
The fused order is C, A, D, B, E. C wins although it was only third in the dense list, because both retrievers found it; B, second in the dense list, falls below D, which both lists ranked in the middle. That is the behaviour wanted from hybrid search: a chunk both retrievers agree on is more likely relevant than one retriever's favourite. RRF is three lines of code; weighting variants (an alpha-blend of normalised scores, weighted RRF) rarely beat plain RRF plus a reranker.
- Qdrant, Weaviate, Vespa, Elasticsearch, and pgvector with Postgres full-text search (`tsvector`) or ParadeDB all do hybrid natively; learned sparse retrieval (SPLADE, the sparse heads of bge-m3), which learns term weights and expands the query with related terms, is a drop-in upgrade over classic BM25 where supported.
- The engineering effort is not the fusion; it is corpus-specific analyzer and tokenizer configuration for BM25 (how "gpt-4o-mini" or "ERR_CONN_RESET" is split into terms), consistent chunking across both indexes, and evaluation.
## Metadata filtering
Attach structured fields (tenant, source, date, access control list (ACL), document type) to every chunk at index time, and apply the filter **inside each first-stage search**: as a filter clause in the BM25 query, and during the ANN traversal of the dense index. Never apply it afterwards to a result list that has already been cut to a top-k, which includes filtering the fused list after RRF.
Post-filtering an ANN result list silently destroys recall when the filter is selective, because the index only ever returns its top candidates, and most of them are then thrown away. The expected number of results that survive is
$$
\mathbb{E}[\text{kept}] = K \cdot s
$$
where:
- $`K`$ is the number of candidates the index search returns before filtering;
- $`s`$ is the filter's selectivity, the fraction of chunks that match it.
Worked example from the pgvector documentation: with an HNSW index the filter is applied after the index is scanned, so with the default `hnsw.ef_search` of 40 candidates and a condition matching 10% of rows, about $`40 \times 0.1 = 4`$ rows come back on average ([pgvector](https://github.com/pgvector/pgvector)). A tenant holding 1% of the corpus would get 0.4 on average: usually nothing.
The fixes move the filter into the search:
- **pgvector with SQL ****`WHERE`**: iterative index scans (from version 0.8.0, `SET hnsw.iterative_scan = strict_order` or `relaxed_order`) keep scanning more of the index until enough matching rows are found, up to `hnsw.max_scan_tuples` (20,000 by default).
- **Qdrant's payload indexes and filterable HNSW**: the graph gets extra links so that the points matching a filter stay connected and traversable, and the query planner switches to scanning the payload index directly when the filter matches so few points that graph search is pointless ([Qdrant](https://qdrant.tech/articles/vector-search-filtering/)).
Filtered search is the main reason filtered-search benchmarks reorder the vector DB table. Tenant isolation and ACL enforcement belong here, never in the prompt: a chunk the user may not see must never be retrieved, rather than retrieved and then "ignored" by instruction.
## Reranking
First-stage retrieval optimises recall over millions of chunks; the reranker is a cross-encoder that reads (query, chunk) *together* and optimises precision over a short list. It is consistently the highest-leverage single addition to a RAG stack.
**Depth: rerank the top 50 to 150 fused candidates, and pass the top 5 to 20 to the prompt.** The depth is a trade between two limits. Too shallow, and the reranker never sees relevant chunks the first stage ranked lower: the pipeline's final recall can never exceed the first stage's recall at the rerank depth. Too deep, and reranker latency grows roughly linearly with the number of candidates for little gain. The references this page draws on agree on that range: Anthropic's contextual retrieval experiment reranked the top 150 down to 20, and found 20 chunks in the prompt beat 5 or 10 ([Anthropic](https://www.anthropic.com/news/contextual-retrieval)); the Particula reranker comparison advises cutting first-stage top-k to 50 to 100 before reranking, because 500 candidates are far slower than 80 ([Particula](https://particula.tech/blog/reranker-models-compared-cohere-voyage-jina-bge-latency-ndcg)); the Digital Applied reference gives 50 to 200 ([Digital Applied](https://www.digitalapplied.com/blog/hybrid-search-bm25-vector-reranking-reference-2026)). Start at 100, then measure recall@depth of the first stage and nDCG after reranking on your golden set, and move the depth only if the numbers ask for it.
- **Managed**: Cohere Rerank 4 (released December 2025 in Fast and Pro variants; 100+ languages, a 32K-token context, lowest friction), Voyage rerank-2.5 (32K context; instruction-following, so a natural-language instruction such as "prefer primary sources" steers the scores; [Voyage](https://blog.voyageai.com/2025/08/11/rerank-2-5/)), and Jina Reranker v3 (0.6B parameters, listwise: the query and up to 64 documents share one 131K-token context window and are scored in one pass; 61.94 nDCG@10 on BEIR; [arXiv 2509.25085](https://arxiv.org/abs/2509.25085)).
- **Open weights**: Qwen3-Reranker 0.6B, 4B and 8B (the 8B averages 61.81 nDCG@10 on BEIR, Benchmarking Information Retrieval; [Qwen](https://qwenlm.github.io/blog/qwen3-embedding/)) and bge-reranker-v2.5-gemma2-lightweight (63.67 on BEIR against 55.36 for bge-reranker-v2-m3, as BAAI reports it; [model card](https://huggingface.co/BAAI/bge-reranker-v2.5-gemma2-lightweight)) rival the APIs on BEIR; bge-reranker-v2-m3 is the small self-host workhorse. Self-hosting breaks even around 1M queries/day; below that, APIs are cheaper than the GPU.
- The trend is toward listwise rerankers (score the candidate set jointly, so each score is relative to its competitors) and "reasoning rerankers" built on small LLMs for hard domains.
- **Latency** depends on the candidate count and on hosting: in Particula's test, including the network round trip, hosted Cohere Rerank 3.5 and Voyage rerank-2.5 took about 600 ms, and self-hosted Jina Reranker v3 188 ms. Measure the hit on your own stack against the nDCG gain on your golden set.
## Worked example: one query through the pipeline
An illustrative case: a support assistant for a software vendor receives, in an ongoing chat about release 4.2, the question "does it still throw ERR_CONN_RESET behind a proxy?", from a user of tenant Acme.
1. **Query transformation**: conversational rewriting turns it into "Does release 4.2 still throw ERR_CONN_RESET behind a proxy?".
2. **Filtered hybrid retrieval**: BM25 matches the literal error code, which the dense model treats as noise; dense search finds the chunk describing "connection resets when routing through a corporate proxy", which never uses the code. Both searches carry the filter `tenant = Acme OR public`, applied inside the search, and each returns its top 100.
3. **Fusion**: RRF merges the two lists; the release-notes chunk that both retrievers found rises to the top, as C did in the RRF example above.
4. **Rerank**: the cross-encoder reads the top 100 fused chunks with the query and puts the 4.2 release note, which says the proxy bug was fixed, first.
5. **Prompt**: the top 10 reranked chunks go into the prompt, with their sources for citation.
If the answer is wrong, the triage on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/> starts with one question: was the gold chunk in those 10? If not, check whether it was in the 100 (a ranking miss, fixed at the reranker or the depth) or not retrieved at all (a retrieval miss, fixed at chunking, hybrid search or query transformation).
## Trade-offs: when to use which
<table header-row="true">
<tr>
<td>Stage</td>
<td>What it buys</td>
<td>What it costs</td>
<td>Use when</td>
</tr>
<tr>
<td>Fixed or recursive chunking, 256 to 512 tokens</td>
<td>A reliable, cheap baseline</td>
<td>Chunks lose document context</td>
<td>Always, as the starting point</td>
</tr>
<tr>
<td>Structure-aware chunking</td>
<td>Chunks that match the document's own units</td>
<td>A parser per format</td>
<td>The documents have headings, code or tables</td>
</tr>
<tr>
<td>Late chunking</td>
<td>Document context in every chunk vector, no LLM cost</td>
<td>A long-context embedder; helps the dense index only</td>
<td>Long documents, a tight indexing budget</td>
</tr>
<tr>
<td>Contextual retrieval</td>
<td>The largest measured drop in retrieval failures</td>
<td>One LLM call per chunk at index time</td>
<td>A static corpus where quality matters</td>
</tr>
<tr>
<td>Hybrid BM25 + dense with RRF</td>
<td>Exact identifiers and paraphrase both found</td>
<td>Two indexes to keep consistent</td>
<td>Nearly always in production</td>
</tr>
<tr>
<td>Query transformation</td>
<td>Recall on conversational, ambiguous or multi-hop queries</td>
<td>An LLM call of latency per query</td>
<td>Chat (rewriting, always); hard queries (the rest, gated)</td>
</tr>
<tr>
<td>Filtered search</td>
<td>Correct results under selective filters; enforced access control</td>
<td>Payload indexes, engine support</td>
<td>Any multi-tenant or permissioned corpus</td>
</tr>
<tr>
<td>Cross-encoder rerank of 50 to 150</td>
<td>Precision at the top of the list</td>
<td>Hundreds of milliseconds per query</td>
<td>Nearly always; skip only under a hard latency budget</td>
</tr>
</table>
## Common mistakes and misconceptions
- **Filtering after retrieval.** Filtering the top-k of an ANN search, or the fused list after RRF, returns a handful of results or none when the filter is selective, and nothing reports an error. Put the filter inside each search.
- **Enforcing access control in the prompt.** An instruction to "ignore documents from other tenants" is not isolation; the chunk has already leaked into the context. Filter at retrieval.
- **Expecting the reranker to fix recall.** A reranker only reorders what it is given; a chunk ranked 300th by the first stage is invisible at a rerank depth of 100. Measure first-stage recall at the rerank depth before blaming the reranker.
- **Adding BM25 and cosine scores.** They live on different scales, so the sum is dominated by whichever is larger. Fuse on ranks.
- **Re-chunking only part of the corpus.** Mixing chunking strategies across ingestion runs quietly degrades recall; re-index everything when the strategy changes, in both indexes.
- **Default BM25 tokenisation on technical text.** A standard analyzer splits or lowercases identifiers in ways that make exact matches fail, which removes the reason for having BM25.
- **Transforming every query.** HyDE and multi-query add an LLM call to every request; most factoid queries do not need it. Gate by difficulty.
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b">Topic: rag-and-retrieval</mention-page>: the map of the whole subject. It places this pipeline between the embedding and index layer below it and the generation patterns above it, and it is where the five components of any RAG system (knowledge base, retriever, ranker, integration layer, generator) are defined.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81508f99e1fa78c2bb41"/>: the models and indexes underneath the dense half of hybrid search. Which embedding model (instruction-aware, Matryoshka-trained so vectors truncate with little loss), which ANN index (HNSW by default; IVF, PQ and DiskANN at larger scale), and which store (Postgres with pgvector is usually enough).
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>: how to tell whether any of these stages paid for itself. recall@k for the first stage, nDCG@k for the reranker, faithfulness for the generator, and the recall-first triage used in the worked example above.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8"/>: what changes when the model drives retrieval. This pipeline is the "advanced RAG" rung of the maturity ladder, a fixed sequence of stages; agentic RAG hands query writing and re-retrieval to the model and uses this pipeline as one of its tools.
## Best resources
- [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) (\~15 min): the canonical writeup; contextual embeddings + contextual BM25 + reranking cut retrieval failures \~67%.
- [Jina: Late Chunking](https://jina.ai/news/late-chunking-in-long-context-embedding-models/) (\~12 min): embed the whole document first, pool per chunk afterwards.
- [Hybrid search reference 2026 (Digital Applied)](https://www.digitalapplied.com/blog/hybrid-search-bm25-vector-reranking-reference-2026) (\~20 min): BM25 + vector + reranking as a pipeline, with tuning numbers.
- [Reconstructing Context: evaluating advanced chunking (arXiv 2504.19754)](https://arxiv.org/pdf/2504.19754) (45 min): empirical comparison of chunking strategies.
- [Reranker comparison: Cohere vs Voyage vs Jina vs BGE (Particula)](https://particula.tech/blog/reranker-models-compared-cohere-voyage-jina-bge-latency-ndcg) (\~12 min): latency vs normalized discounted cumulative gain (nDCG) numbers.
## Further reading
- [Cormack, Clarke and Buettcher: Reciprocal rank fusion outperforms Condorcet and individual rank learning methods (SIGIR 2009)](https://dl.acm.org/doi/10.1145/1571941.1572114): the two-page paper behind RRF and k = 60.
- [Gao et al.: Precise Zero-Shot Dense Retrieval without Relevance Labels (arXiv 2212.10496)](https://arxiv.org/abs/2212.10496): the HyDE paper.
- [pgvector README](https://github.com/pgvector/pgvector): filtering with approximate indexes and iterative index scans.
- [Qdrant: a complete guide to filtering in vector search](https://qdrant.tech/articles/vector-search-filtering/): pre-filtering, post-filtering and filterable HNSW.
- [jina-reranker-v3: Last but Not Late Interaction for Listwise Document Reranking (arXiv 2509.25085)](https://arxiv.org/abs/2509.25085): how a listwise reranker scores a candidate set in one pass.
</content>
</page>