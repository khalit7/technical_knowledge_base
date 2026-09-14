# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

⏱ 9 min read · +~3h 10m resources

- **Authors**: Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Kuttler, Mike Lewis, Wen-tau Yih, Tim Rocktaschel, Sebastian Riedel, Douwe Kiela (Facebook AI Research; UCL; NYU)
- **Date**: May 2020 (arXiv v1; NeurIPS 2020)
- **Links**: [arXiv:2005.11401](https://arxiv.org/abs/2005.11401) (~45 min) | [code (HF Transformers examples/rag)](https://github.com/huggingface/transformers/tree/main/examples/research_projects/rag) (repo, ~20 min for the README and entry path) | [demo](https://huggingface.co/rag/) (~5 min)

## Best resources

- [Meta AI blog: Retrieval Augmented Generation](https://ai.meta.com/blog/retrieval-augmented-generation-streamlining-the-creation-of-intelligent-natural-language-processing-models/) (~10 min): the authors' own framing; short and good on the "hot-swap the index instead of retraining" motivation
- [Hugging Face Transformers RAG docs](https://huggingface.co/docs/transformers/model_doc/rag) (docs, ~20 min for the core pages): the original model as runnable code (`RagSequenceForGeneration`, `RagTokenForGeneration`, `RagRetriever` over the wiki_dpr index); the clearest way to see how the pieces compose
- [RAG for LLMs: A Survey (Gao et al., 2023)](https://arxiv.org/abs/2312.10997) (~1h 30m, survey): the canonical bridge from this paper to the modern stack; its Naive / Advanced / Modular RAG taxonomy is the standard map of what the field became

## Problem

By 2020, large pretrained LMs (GPT-2, T5) demonstrably store factual knowledge in their parameters and can answer questions "closed-book". But parametric knowledge has three structural flaws: it cannot be inspected (no provenance for why the model said something), it cannot be updated without retraining (the world changes, the weights do not), and it runs out on knowledge-intensive tasks, where task-specific retrieve-and-extract pipelines still beat general seq2seq models. Hybrid parametric plus non-parametric approaches existed (REALM, ORQA) but only for extractive QA: they point at spans, they do not generate. The gap: a general-purpose fine-tuning recipe that gives any seq2seq generator a differentiable, non-parametric memory, applicable to the full range of generation and classification tasks.

## Method

RAG treats the retrieved document as a latent variable in a probabilistic seq2seq model and trains retriever and generator jointly, end to end, with no supervision on what to retrieve.

**Components.** The retriever p_eta(z|x) is DPR: a BERT-base bi-encoder where p_eta(z|x) is proportional to exp(d(z)^T q(x)), with d(z) from a document encoder and q(x) from a query encoder. Top-k retrieval is Maximum Inner Product Search over a FAISS HNSW index. The non-parametric memory is the December 2018 Wikipedia dump split into disjoint 100-word chunks, 21M documents in total. The generator p_theta(y_i | x, z, y_1:i-1) is BART-large (400M params); input x and retrieved passage z are simply concatenated. The paper explicitly names the BART parameters the "parametric memory" and the index the "non-parametric memory".

**Two marginalisations.** Because the true evidence document is unobserved, the output distribution marginalises over the top-k retrieved documents, in one of two ways:

- **RAG-Sequence**: one document is responsible for the whole output. p(y|x) is approximated by sum over z in top-k of p_eta(z|x) * prod_i p_theta(y_i | x, z, y_1:i-1). Same document conditions every token.
- **RAG-Token**: each token can draw on a different document. p(y|x) is approximated by prod_i of sum over z in top-k of p_eta(z|x) * p_theta(y_i | x, z, y_1:i-1). The generator can stitch an answer from several passages; Figure 2 in the paper shows the document posterior hopping between passages as a Jeopardy question mentions different books.

For sequence classification (target of length one, e.g. FEVER labels) the two are equivalent.

**Training.** Minimise negative marginal log-likelihood of (x, y) pairs with Adam. Crucially, only the query encoder BERT_q and the BART generator are fine-tuned; the document encoder and the index stay frozen, because re-embedding and re-indexing 21M passages during training (as REALM does) is expensive and turned out unnecessary. Retrieval is learned purely from the generation loss: gradients flow into the query encoder through the p_eta(z|x) weighting.

**Decoding.** RAG-Token factorises per token, so its transition probability (sum over documents of p_eta * p_theta) plugs into a standard beam decoder. RAG-Sequence does not decompose per token; the paper runs one beam search per document and rescores the union of hypotheses ("Thorough Decoding"), or skips the extra forward passes by treating unseen hypotheses as probability approximately zero ("Fast Decoding").

## Results

- **Open-domain QA**: new state of the art on all four benchmarks. Exact match: NQ 44.5 (vs 41.5 DPR, 36.6 T5-11B+SSM closed-book), TriviaQA 56.8 (68.0 on the T5-comparable Wiki split), WebQuestions 45.5, CuratedTrec 52.2. A generator beats extractive readers, without REALM-style "salient span masking" pretraining, and with no reranker or cross-encoder. RAG also answers correctly when the answer string is in no retrieved document (11.8% of such NQ cases), where extraction scores exactly 0.
- **Abstractive QA (MS-MARCO NLG)**: +2.6 BLEU and +2.6 Rouge-L over BART, approaching systems that get the gold passages RAG never sees.
- **Jeopardy question generation**: RAG-Token beats RAG-Sequence and BART on Q-BLEU-1; human evaluators found RAG more factual in 42.7% of pairs vs 7.1% for BART, and clearly more specific. Both RAG variants generate more diverse n-grams than BART with no diversity-promoting decoding.
- **FEVER fact verification**: within 4.3% (3-way) and 2.7% (2-way) of pipeline SOTA systems that use gold-evidence retrieval supervision, which RAG does not use; the top retrieved document is from a gold evidence article 71% of the time.
- **Ablations**: learned retrieval beats a frozen retriever and beats BM25 on everything except entity-heavy FEVER.
- **Index hot-swapping**: swap the 2018 index for a 2016 one and the same model answers 2016 "Who is the President of X?" questions at 70% (vs 12% with the mismatched index). World knowledge updated by replacing the index, zero retraining.

## Why it matters

This is the paper that coined "RAG", and it is worth being precise about what it proposed versus what the term now means, because they differ substantially.

**The original RAG is a trained model, not a prompting pattern.** Retrieval is inside the probabilistic model: documents are latent variables, the output likelihood marginalises over them, and the generation loss trains the query encoder end to end. Both marginalisation schemes (Sequence vs Token) exist precisely because the model must combine evidence probabilistically rather than just read it.

**Modern usage kept the name and the architecture diagram, and dropped the training.** The dominant 2023+ pattern is: embed the query with an off-the-shelf embedding model, do approximate nearest-neighbour search in a vector DB, concatenate the top-k chunks into the prompt of a frozen instruction-tuned LLM, generate. No marginalisation (the LLM attends over all chunks in one context, closer in spirit to Fusion-in-Decoder than to RAG-Token), no gradient into the retriever, no joint objective. Why the shift: in-context learning got strong enough that concatenation works without fine-tuning; frontier LLMs are API-frozen anyway; and pipelines you can rebuild by re-chunking a document base are operationally far simpler than co-training a retriever with a generator. The original's end-to-end idea survives in research descendants (REALM before it; FiD, RETRO, Atlas after), while the deployed world runs the frozen version.

**What did survive is most of the paper.** Dense bi-encoder retrieval over chunked passages (DPR's BERT bi-encoder is the ancestor of every modern embedding model), the fixed ~100-word chunking of a corpus into a searchable index, MIPS/ANN search as the retrieval primitive (FAISS then, dedicated vector DBs now), grounding to reduce hallucination and provide provenance, and the killer operational argument: update knowledge by updating the index, not the weights. The modern RAG stack (embeddings, vector DB, chunking, rerankers, and onwards to agentic RAG and GraphRAG) is this paper's architecture with the learning removed and the engineering scaled up.

For open-domain QA specifically it also settled an argument of its moment: a general retrieve-and-generate recipe beat both closed-book giants (T5-11B) and specialised extractive pipelines simultaneously, across four benchmarks, with one architecture.

## Connections

- [`papers/2018-10_bert`](../2018-10_bert/): the DPR retriever is a pair of BERT-base encoders; retrieval embeddings remain BERT's main living habitat
- [`papers/2020-05_gpt-3`](../2020-05_gpt-3/): the same-month parametric-only counterpoint; ironically, GPT-3-style in-context learning is what let modern RAG drop this paper's end-to-end training
- [`papers/2022-10_react`](../2022-10_react/): retrieval moved from a fixed pipeline step to a tool an agent decides to call; the road to agentic RAG
- Topics: `topics/rag-and-retrieval` (this is the founding paper of the topic)
