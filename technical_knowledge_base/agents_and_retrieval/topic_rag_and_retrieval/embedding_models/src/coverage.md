# Coverage: the old page "Embeddings and vector search"

The old child page (Notion 3c65c17b0d0d81508f99e1fa78c2bb41, last edited 2026-09-30; saved verbatim in `live.md`, copied from the parent's `src/read/old/`) is reused for this page and retitled "Embedding models: training, choosing and fine-tuning". Its claims were treated as unverified notes. Its index and store material moved to siblings by the parent's plan. The old page had an embedded HTML file (`embeddings-and-vector-search.html`) and no child pages, databases or video.

| Old claim | Where it is now | Verdict |
|---|---|---|
| An embedding model maps text to a vector, trained so similar meanings are close; dims typically 256 to 4,096 | Reading 0, 1 | kept (models here: 384 to 1,024) |
| Bi-encoder: separate encoding, documents precomputed; cross-encoder: reads the pair, used as a reranker | Reading 2 (with measured costs), rerankers sibling | kept, measured |
| Dot, cosine, L2 definitions; identical ranking for unit vectors; L2^2 = 2 - 2 cos | Reading 3; parent Vector search lab | kept |
| Worked example q = (0.6, 0.8), d1, d2, d3 | Reading 3 | arithmetic re-checked: correct |
| OpenAI embeddings are normalised to length 1 | Reading 3 | verified on the OpenAI embeddings guide, 2026-10-14 |
| ANN recall vs retrieval recall ("a system loses recall twice") | parent Vector search lab, Vector indexes sibling | moved |
| InfoNCE formula, temperature, in-batch and hard negatives | Reading 4, 5 | kept; loss checked against sentence-transformers 6.1.0 (difference 2e-07) |
| InfoNCE as a mutual-information bound, why large batches help (link to Information theory) | Reading 4 (link), batch-size measurement from the parent | kept as a link; batch effect measured |
| Instruction-aware / asymmetric encoding; "encoding a query as if it were a document silently costs recall" | Reading 7 | measured: true for Qwen3-Embedding (-2.1 / -6.6 points), NOT reliably true for bge-small (within noise, opposite signs on SciFact and NFCorpus) |
| Cohere Embed v4 input types search_query / search_document | Tool map (parent) | stale: Cohere's current models are embed-v5.0 (parent FACTS, 2026-10-13); not repeated here |
| Pooling: mean, special token, last token for decoders | Reading 1 | kept; read in the sentence-transformers 6.1.0 code and reproduced exactly for five models |
| Gemini Embedding 001 state of the art on MMTEB in March 2025; Gemini Embedding 2 preview, multimodal, 3,072 dims | parent Tool map | moved; not re-verified here (the Tool map lists gemini-embedding-2 and -001 as read 2026-10-13) |
| Voyage 4 family, shared embedding space, MoE, prices $0.12 / $0.06 / $0.02 per M tokens | parent Tool map; RAG in production sibling (prices) | prices verified by the production sibling 2026-10-14; the shared-space and MoE claims not re-verified here; moved |
| voyage-code-4 (August 2026) | parent Tool map | moved |
| Cohere Embed v4 128K input | parent Tool map | stale (v5 now); moved |
| OpenAI text-embedding-3 large/small 3,072 / 1,536 dims, 8,192 tokens, MTEB 64.6 / 62.3, about $0.13 / $0.02 per M tokens | parent Tool map | MTEB figures re-read on the guide 2026-10-14 (vendor, old MTEB version); prices verified by the production sibling; moved |
| Qwen3-Embedding-8B 70.58 on MMTEB, first on 5 June 2025; 4B 69.45; 0.6B 64.33; MRL to 32; 32K input | Reading 9 (32K, MRL), parent Tool map | 32K and MRL 32 to 1,024 verified (setup FACTS, card); MMTEB scores not re-verified here: unconfirmed |
| bge-m3 dense + sparse + multi-vector | Reading 10 (named as a multilingual choice) | not re-verified; kept only as a name |
| NV-Embed, E5-Mistral, Jina embeddings v4 | dropped | Jina is at v5 (parent Tool map); the others not needed for this page |
| "MTEB rank is a prior, not a verdict"; build a labelled set, measure recall@k | Reading 11, 12, Model chooser | kept and measured: rank correlation 0.83 over 149 models but 2 of the top 10 shared; protocol with paired bootstrap |
| Changing the model means re-embedding; vectors of two models are unrelated | Reading 13, interview | kept; the production sibling measured mixing (0.379 at 50% re-embedded vs 0.713) |
| MRL loss formula; "up to 14x smaller at the same ImageNet accuracy, up to 14x retrieval speed-ups" | Reading 8 | formula kept; the 14x is ImageNet-1K classification only (parent FACTS), said so; retrieval effect from the parent's measurements |
| Scalar and binary quantization, rescoring; Hugging Face blog figures (92.5%, 96%, 99%, 25x) | parent Vector search lab | replaced by measurements on the running example (binary + rescore 100 keeps all of 0.700); blog figures not repeated |
| Memory worked example (10 M x 1,024) | parent Vector search lab | moved |
| Late interaction (ColBERT, MaxSim worked example, storage, ColBERTv2) | Rerankers sibling | moved |
| IVF, PQ, ScaNN, HNSW, DiskANN, filters, choosing an index | Vector indexes sibling | moved |
| Vector databases table; "pgvector is usually enough"; pgvectorscale vendor benchmark; Turbopuffer | parent Tool map, Search and vector databases page, Vector indexes sibling | moved |
| Mistakes: mixing metrics; queries encoded as documents; mixing models; truncating non-MRL vectors | Reading 14 | kept, each with a measured number |
| Mistakes: confusing the two recalls; QPS without recall; post-filtering; ef_search; infrastructure before scale | Vector indexes sibling, parent | moved |
| Resources: Milvus 2026 model guide, Voyage 4 post, Firecrawl and Encore DB guides, pgvector docs | dropped or moved | DB guides belong to the Tool map; the Milvus guide was not re-read; MTEB leaderboard and the Qwen3 report kept |

New on this page (not on the old one): the pooling code and its exact reproduction; the gradient-sharing view of the temperature; false-negative rates on SciFact train and the positive-aware filter measured; shared positives in a batch; gradient caching checked; the tiny fine-tune design (pending run); instruction and prefix effects with paired intervals on two sets; evidence positions against token limits; domain shift across three sets and the train/test disagreement inside SciFact; the MTEB rank-transfer analysis over 149 models; the choosing protocol with subsample stability.
