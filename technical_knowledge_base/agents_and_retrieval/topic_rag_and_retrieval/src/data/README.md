# The running example of Topic: rag-and-retrieval

Every tab of the root page measures on the same data, models and machine, so that numbers can be compared across tabs. This folder holds the definition (this file), the load helper every script imports (`load.py`), the small golden-set id lists (`ids/`) and the manifest of every large artefact with its size and sha256 (`manifest.json`). The large files themselves (raw datasets, embeddings, runs, models) stay outside the repo, in the shared setup folder named by the environment variable `RAG_SCRATCH`.

Built on 2026-10-13. Machine: Apple M1 Pro (10 CPU cores: 8 performance and 2 efficiency; 16 GPU cores; 16 GB unified memory), macOS 27.0.1, PyTorch MPS backend. Every timing below is "measured on Apple M1 Pro (MPS)" on a shared machine, with the load average recorded; relevance numbers (nDCG, recall) are deterministic and do not depend on the machine.

## The question the page follows

A user asks a question; the system has to find, in a corpus it has never been trained on, the few passages that answer it, and hand them to a language model. The running example uses four public labelled sets:

| role | set | what is in it | why this one |
|---|---|---|---|
| primary retrieval set | **SciFact** (BEIR) | 5,183 scientific abstracts; 300 test claims (and 809 train claims) with binary relevance labels (qrels) | small enough to embed many times on a laptop; real test split; claims are short and phrased differently from the abstracts, so lexical and dense retrieval disagree in instructive ways; BM25 is strong here, which keeps "dense always wins" honest |
| second retrieval set | **NFCorpus** (BEIR) | 3,633 medical documents (NutritionFacts and PubMed); 323 test queries with graded labels (1 or 2), on average many relevant documents per query | heavy domain vocabulary (nutrients, drugs, conditions), where exact term match matters; graded labels make nDCG differ from recall; every system scores low, which is realistic |
| long documents (chunking) | **QASPER** dev split | 281 NLP papers (median about 23 k characters, 1.42 M Qwen3 tokens in total); 892 answerable questions whose evidence paragraphs were found verbatim in the paper text (of 1,005: 60 unanswerable, 53 with evidence only in figures or tables) | evidence locations are labelled by annotators, so "did the chunk contain the evidence" is measurable for any chunking; real section structure for structure-aware chunking |
| multi-hop (agentic retrieval) | **HotpotQA** distractor dev | 200 questions (seed 0; 160 bridge, 40 comparison), each needing two gold paragraphs; corpus of 9,760 Wikipedia paragraphs: the gold and distractor paragraphs of 1,000 dev questions | multi-hop by construction, with gold supporting paragraphs and sentence-level supporting facts; the corpus is small enough to embed but large enough that retrieval is not trivial |

Licences: SciFact, NFCorpus and HotpotQA are CC BY-SA 4.0 on their Hugging Face cards; QASPER is CC BY 4.0. Only id lists are committed here.

Golden sets (the ids every tab evaluates on): `ids/scifact_test_qids.txt` (300), `ids/nfcorpus_test_qids.txt` (323), `ids/qasper_dev_qids.txt` (892), `ids/hotpotqa_200_qids.txt` (200).

## Models

All open weights, all run locally (no API keys). Repo revisions, file sizes and sha256 are in `manifest.json`.

| key in `load.py` | model | family and size | output | how it is used here |
|---|---|---|---|---|
| `qwen3-emb-0.6b` | Qwen/Qwen3-Embedding-0.6B (Apache 2.0) | decoder (Qwen3) turned embedder, 0.6 B parameters, last-token pooling | 1,024 dims, Matryoshka (can be cut to 32 to 1,024) | the main embedder; queries carry an instruction `Instruct: <task>\nQuery:`, documents none; run in float16 on MPS (cosine to float32 output: min 0.99976 on 256 SciFact documents); documents cut at 1,024 tokens |
| `bge-small` | BAAI/bge-small-en-v1.5 (MIT) | BERT encoder, 33 M, CLS pooling | 384 dims | the classic small baseline; queries carry `Represent this sentence for searching relevant passages: `; 512 tokens |
| `gte-modernbert` | Alibaba-NLP/gte-modernbert-base (Apache 2.0) | ModernBERT encoder, 149 M, CLS pooling | 768 dims | a different, newer encoder family; no prompts; documents cut at 1,024 tokens (model limit 8,192) |
| `minilm-l6` | sentence-transformers/all-MiniLM-L6-v2 (Apache 2.0) | 6-layer MiniLM, 22 M, mean pooling | 384 dims | the "first tutorial" model, a floor; 256 tokens (its default) |
| (colenv) | answerdotai/answerai-colbert-small-v1 (Apache 2.0) | late interaction (ColBERT), 33 M | 96 dims per token | exact MaxSim over every token of every document (no PLAID compression), via pylate 1.6.0 in its own env |
| `ce-minilm-l6` | cross-encoder/ms-marco-MiniLM-L6-v2 (Apache 2.0) | cross-encoder, 22 M | one score per (query, document) | the reranker of the BEIR paper's "BM25+CE" row |
| `qwen3-reranker-0.6b` | Qwen/Qwen3-Reranker-0.6B (Apache 2.0) | decoder reranker, 0.6 B, yes/no logit | one score per pair | instruction-aware reranker (task instruction through its chat template) |
| `bge-reranker-v2-m3` | BAAI/bge-reranker-v2-m3 (Apache 2.0) | XLM-RoBERTa cross-encoder, 568 M | one score per pair | the most-deployed open multilingual reranker |

Generators and judges are not downloaded again: the inference topic's model store has Qwen3 0.6B, 1.7B and 4B as Hugging Face, MLX and GGUF files. Smoke test here (2026-10-13 23:34, bench lock held, load average about 5.5 because another agent was working): Qwen3-1.7B MLX 4-bit (mlx-lm 0.32.0) generates 112.4 to 115.6 tokens/s over 3 runs of 128 tokens, peak memory 1.10 GB; Qwen3-4B GGUF Q4_K_M in llama-server (build 11146, Metal, `-ngl 99 -c 8192`) generates 44.1 to 44.4 tokens/s over 3 runs (temperature 0, seed 0, `/no_think`).

The machine has 16 GB of unified memory: load one large model at a time, and do not run the generator, a 0.6 B embedder and a reranker in the same process.

## Where the artefacts live

`RAG_SCRATCH` is the shared setup folder (outside the repo). Paths below are relative to it; `load.py` builds them.

| what | path | format |
|---|---|---|
| raw downloads | `data/raw/{scifact,nfcorpus,qasper,hotpotqa}/` | parquet and tsv exactly as fetched (revisions in `manifest.json`) |
| long documents | `data/longdoc/docs.jsonl`, `questions.jsonl` | one paper per line: text (title, `## Section` headings, paragraphs separated by blank lines) and paragraph character spans; questions with answers and evidence character spans |
| default chunks | `data/longdoc/chunks_t256_o32.jsonl` | 6,463 chunks of 256 Qwen3 tokens with 32 tokens of overlap, cut on token boundaries (no sentence or section awareness): the naive baseline |
| multi-hop | `data/multihop/questions.jsonl`, `corpus.jsonl` | 200 questions with gold paragraph ids and supporting facts; 9,760 paragraphs |
| embeddings | `data/emb/<set>/<model>/{corpus,queries}.npy` and `{corpus,queries}_ids.txt` | float32, rows normalised to unit length (so dot product = cosine); `queries` holds every query of the set (train and test), in `queries_ids.txt` order |
| BM25 indexes | `data/bm25/<set>/` | bm25s saved index (Lucene BM25, k1 1.2, b 0.75, English stopwords, Snowball stemmer) |
| runs | `data/runs/<set>/<system>.run` | TREC run files, top 100 per test query: `bm25`, `bm25-rankbm25` (cross-check), one per embedding model (exact flat inner-product search), `colbert-small`, and `<first stage>+<reranker>` |
| reranker scores | `data/rerank/<set>/<reranker>.tsv` | qid, docid, score for every candidate in the union of the BM25 top 100 and one embedder's top 100, so a rerank depth K can be swept without running the model |
| ColBERT token vectors | `data/colbert/<set>/` | float16 token vectors of every document stacked, with offsets; same for the test queries |

## How to load

```python
import os, sys
sys.path.insert(0, "<root folder>/src/data")      # this folder
import load as L                                    # needs RAG_SCRATCH set
corpus, queries, qrels = L.beir("scifact")          # {docid: {title, text}}, {qid: text}, {split: {qid: {docid: grade}}}
ids, X = L.embeddings("scifact", "qwen3-emb-0.6b")  # (5183 ids, float32 [5183, 1024])
qids, Q = L.embeddings("scifact", "qwen3-emb-0.6b", "queries")
run = L.run("scifact", "bm25")                      # {qid: {docid: score}}
print(L.evaluate(run, qrels["test"]))               # {"ndcg@10": 0.679..., "recall@100": 0.912...}
enc = L.encoder("qwen3-emb-0.6b")                  # SentenceTransformer on MPS, settings as above
v = enc.encode(["a new claim"], prompt=L.query_prefix("qwen3-emb-0.6b", "scifact"), normalize_embeddings=True)
docs, questions = L.longdoc(); chunks = L.longdoc_chunks()
hq, hcorpus = L.multihop()
```

Run scripts with the shared env and isolated mode: `$RAG_SCRATCH/venv/bin/python -I -B script.py` (`-B` keeps a `__pycache__` folder out of this repo folder; `-I` ignores the PYTHONDONTWRITEBYTECODE variable). ColBERT scripts use `$RAG_SCRATCH/colenv/bin/python`. Evaluation is pytrec_eval (the TREC tool, also what BEIR uses); nDCG@10 and recall@100 are averaged over every query that has labels, and a query with no retrieved documents scores 0.

## Things to know before measuring

- SciFact: 300 test claims, 339 relevant (claim, abstract) pairs, so most claims (277 of 300) have exactly one relevant abstract: recall@10 is close to "did we find it". NFCorpus: on average 38.2 relevant documents per test query with grades 1 and 2, so recall@100 stays low for every system and nDCG@10 is the number to watch.
- The multi-hop corpus (9,760 paragraphs) is far smaller than the 5.2 M-paragraph HotpotQA corpus of BEIR, so first-stage retrieval is much easier here (BM25 recall@10 of the gold paragraphs 0.868 here vs 0.740 recall@100 for BM25 on the full BEIR HotpotQA). The interesting multi-hop failure is the second hop, whose paragraph often shares no words with the question: count questions with both gold paragraphs in the top k (BM25: 147 of 200 in the top 10).
- QASPER: answer evidence is located by exact string match of the annotators' evidence paragraphs in the rebuilt text; a question counts as answerable when at least one annotator answered it and at least one evidence paragraph was found. With the default 256-token chunks, 607 of the 892 questions have at least one evidence paragraph wholly inside one chunk.
- Query and document prompts matter: Qwen3-Embedding without its query instruction, or bge-small without its query prefix, scores lower. Use `L.query_prefix` for queries and nothing for documents.
- Embeddings are unit length; for Matryoshka truncation of Qwen3-Embedding, cut the first d dimensions and re-normalise.
- Timings: hold the bench lock, record the load average, repeat at least three times and report the spread. A query on this laptop is not a query on a server GPU: the ratios between systems transfer better than the absolute milliseconds.

## Precompute timings (measured on Apple M1 Pro, MPS, 2026-10-13/14, bench lock held)

The machine was shared: another agent was running CPU work, so load averages (1, 5, 15 min) were between 3.5 and 12.8. Throughput = documents (or pairs) per second over the whole corpus, after a warm-up; "tokens/s" counts the model's own tokens after truncation.

| job | model, dtype, batch | items | time | throughput | load average before -> after |
|---|---|---:|---:|---:|---|
| embed SciFact corpus | Qwen3-Emb-0.6B, fp16, 16 | 5,183 docs, 1.70 M tokens | 816 s | 6.3 docs/s, 2,086 tokens/s | 10.6 -> 6.0 |
| embed NFCorpus corpus | Qwen3-Emb-0.6B | 3,633 docs, 1.29 M tokens | 635 s | 5.7 docs/s, 2,028 tokens/s | 6.0 -> 6.2 |
| embed HotpotQA corpus | Qwen3-Emb-0.6B | 9,760 paragraphs, 1.34 M tokens | 611 s | 16.0 docs/s, 2,189 tokens/s | 6.2 -> 7.9 |
| embed QASPER chunks | Qwen3-Emb-0.6B | 6,463 chunks, 1.63 M tokens | 616 s | 10.5 chunks/s, 2,644 tokens/s | 7.9 -> 7.9 (5-min 12.6) |
| embed SciFact corpus | gte-modernbert, fp32, 64 | 5,183 docs, 1.58 M tokens | 204 s | 25.4 docs/s, 7,752 tokens/s | 9.9 -> 4.5 |
| embed SciFact corpus | bge-small, fp32, 64 | 5,183 docs, 1.69 M tokens | 36 s | 142.6 docs/s, 46,581 tokens/s | 5.9 -> 3.9 |
| embed SciFact corpus | MiniLM-L6, fp32, 64 | 5,183 docs, 1.24 M tokens (256 max) | 11 s | 465.9 docs/s | 4.2 -> 4.5 |
| ColBERT encode SciFact | answerai-colbert-small, 32 | 5,183 docs, 1.22 M token vectors | 63 s | 82.5 docs/s | 5.0 -> 5.9 |
| ColBERT exhaustive MaxSim | 300 queries x 5,183 docs | | 18.5 s | 62 ms per query | |
| rerank SciFact candidates | ms-marco MiniLM-L6 CE, fp32, 32 | 50,773 pairs | 214 s | 236.8 pairs/s | 4.2 -> 4.0 |
| rerank NFCorpus candidates | ms-marco MiniLM-L6 CE | 57,155 pairs | 251 s | 227.9 pairs/s | 2.9 -> 3.3 |
| rerank SciFact (BM25 top 30 + Qwen3 top 30) | Qwen3-Reranker-0.6B, fp16, 16 | 15,076 pairs | 3,006 s | 5.0 pairs/s | 12.7 -> 1.4 |
| rerank SciFact (same candidates) | bge-reranker-v2-m3, fp16, 16 | 15,076 pairs | 1,037 s | 14.5 pairs/s | 1.8 -> 1.0 |
| BM25 index SciFact (bm25s, 1 thread) | | 5,183 docs | 0.5 s (not under the lock) | | |

Repeat runs for the spread (SciFact, 3 repeats; Qwen3 on the first 1,000 documents) and single-query encode latency (batch 1, 100 test queries, after warm-up):

| model | docs/s on MPS, 3 runs | query p50 / p90 on MPS | query p50 / p90 on CPU | load before -> after |
|---|---|---|---|---|
| MiniLM-L6 | 462.1, 465.6, 465.9 | 5.9 / 8.2 ms | 7.1 / 8.1 ms | 3.0 -> 2.7 |
| bge-small | 142.2, 144.6, 144.4 | 10.0 / 10.7 ms | 12.8 / 15.3 ms | 2.7 -> 1.5 |
| gte-modernbert | 25.6, 25.7, 25.5 | 19.4 / 32.0 ms | 32.9 / 50.7 ms | 4.0 -> 6.4 |
| Qwen3-Emb-0.6B | 6.5, 6.4, 6.4 | 51.3 / 68.4 ms | 545.8 / 868.8 ms | 6.1 -> 11.8 |

What transfers: the ratios (a 0.6 B decoder embedder costs about 20 times a 33 M BERT per document, and about 5 times per query on MPS) and the shape (indexing cost is paid once per corpus, query cost on every request). What does not: the absolute numbers. A datacenter GPU runs these models far faster (not run here), and serving systems batch concurrent queries, which changes per-query latency.

## Baseline: what each system scores here, against published numbers

Deterministic (no lock needed to reproduce). nDCG@10 and recall@100 on the test split with pytrec_eval; "difference" is here minus published. Published numbers: the BEIR paper (Thakur et al., 2021, arXiv 2104.08663 v4, Table 2 and the recall@100 appendix table; independent academic benchmark); the MTEB results repository (github.com/embeddings-benchmark/results, fetched 2026-10-13; submitted results for the same model revision family); the answerai-colbert-small-v1 model card (vendor). Systems marked `_top30` rerank only the top 30 of their first stage (the two large rerankers are slow here, see timings), so their recall@100 is the recall of 30 documents.

| set | system | nDCG@10 here | recall@100 here | published nDCG@10 | source | difference |
|---|---|---:|---:|---:|---|---:|
| scifact | bm25 | 0.679 | 0.913 (BEIR 0.908) | 0.665 | BEIR paper Table 2, BM25 (Elasticsearch) | +0.014 |
| scifact | bm25-rankbm25 | 0.684 | 0.913 |  |  |  |
| scifact | minilm-l6 | 0.645 | 0.925 | 0.645 | MTEB results repo | -0.000 |
| scifact | bge-small | 0.713 | 0.942 | 0.713 | MTEB results repo | +0.000 |
| scifact | gte-modernbert | 0.767 | 0.973 | 0.764 | MTEB results repo | +0.003 |
| scifact | qwen3-emb-0.6b | 0.700 | 0.960 | 0.697 | MTEB results repo | +0.002 |
| scifact | colbert-small | 0.743 | 0.953 | 0.748 | model card (vendor) | -0.004 |
| scifact | bm25+ce-minilm-l6 | 0.688 | 0.913 | 0.688 | BEIR paper Table 2, BM25+CE | +0.000 |
| scifact | qwen3-emb-0.6b+ce-minilm-l6 | 0.700 | 0.960 |  |  |  |
| scifact | bm25+qwen3-reranker-0.6b_top30 | 0.764 | 0.873 |  |  |  |
| scifact | qwen3-emb-0.6b+qwen3-reranker-0.6b_top30 | 0.765 | 0.912 |  |  |  |
| scifact | bm25+bge-reranker-v2-m3_top30 | 0.737 | 0.873 |  |  |  |
| scifact | qwen3-emb-0.6b+bge-reranker-v2-m3_top30 | 0.737 | 0.912 |  |  |  |
| nfcorpus | bm25 | 0.318 | 0.248 (BEIR 0.250) | 0.325 | BEIR paper Table 2, BM25 (Elasticsearch) | -0.007 |
| nfcorpus | bm25-rankbm25 | 0.322 | 0.256 |  |  |  |
| nfcorpus | minilm-l6 | 0.316 | 0.312 | 0.316 | MTEB results repo | +0.000 |
| nfcorpus | bge-small | 0.343 | 0.311 | 0.343 | MTEB results repo | +0.000 |
| nfcorpus | gte-modernbert | 0.343 | 0.316 | 0.343 | MTEB results repo | -0.000 |
| nfcorpus | qwen3-emb-0.6b | 0.363 | 0.327 | 0.367 | MTEB results repo | -0.004 |
| nfcorpus | colbert-small | 0.369 | 0.316 | 0.373 | model card (vendor) | -0.004 |
| nfcorpus | bm25+ce-minilm-l6 | 0.349 | 0.248 | 0.350 | BEIR paper Table 2, BM25+CE | -0.001 |
| nfcorpus | bge-small+ce-minilm-l6 | 0.348 | 0.311 |  |  |  |

Reading the table:
- Every embedding model matches its MTEB number within 0.005 nDCG@10 (exact for MiniLM-L6 and bge-small on SciFact and for gte-modernbert on NFCorpus). The small gaps for Qwen3-Embedding (+0.002 SciFact, -0.004 NFCorpus) are consistent with float16 inference and a 1,024-token document cut here; the instruction wording follows the MTEB task prompts.
- BM25 differs most (+0.014 on SciFact, -0.007 on NFCorpus) because the BEIR number is Elasticsearch's BM25 with its own analyser; here it is bm25s with English stopwords and a Snowball stemmer, k1 1.2, b 0.75. rank_bm25 (Okapi, k1 1.5) on the same tokens gives 0.684 and 0.322: the tokeniser matters more than the BM25 variant. Recall@100 agrees with BEIR (0.913 vs 0.908, 0.248 vs 0.250).
- The BEIR "BM25+CE" row is reproduced exactly on SciFact (0.688) and within 0.001 on NFCorpus.
- A reranker only helps when it is stronger than the first stage: the 22 M MiniLM cross-encoder lifts BM25 (0.679 -> 0.688) but adds nothing to Qwen3-Embedding (0.700 -> 0.700), while Qwen3-Reranker-0.6B lifts either first stage to about 0.765 using only the top 30.
- gte-modernbert (149 M) beats the 0.6 B Qwen3-Embedding on SciFact (0.767 vs 0.700) and ties bge-small on NFCorpus: model size is not a ranking.

Multi-hop set (200 HotpotQA questions over the 9,760-paragraph corpus; relevance = the two gold paragraphs):

| system | nDCG@10 | recall@10 | recall@100 |
|---|---:|---:|---:|
| BM25 | 0.774 | 0.868 | 0.955 |
| MiniLM-L6 | 0.743 | 0.800 | 0.918 |
| bge-small | 0.860 | 0.908 | 0.968 |
| gte-modernbert | 0.857 | 0.898 | 0.970 |
| Qwen3-Emb-0.6B | 0.825 | 0.875 | 0.955 |

Not run here: the BEIR HotpotQA corpus (5.2 M paragraphs; too large to embed with every model on this laptop), PLAID-indexed ColBERT (exhaustive MaxSim is exact and fast enough at 5 k documents), and the two large rerankers at depth 100 (about 50,000 pairs: roughly 1 hour for bge-reranker-v2-m3 and 3 hours for Qwen3-Reranker on MPS at the measured rates).
