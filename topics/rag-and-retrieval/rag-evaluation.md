# RAG evaluation

⏱ 6 min read · +1h 27m resources

### Best resources

- [RAGAS documentation](https://docs.ragas.io/) (docs, ~40 min for the core pages): RAGAS is Retrieval Augmented Generation Assessment; reference implementations of the core metrics judged by a large language model (LLM).
- [Atlan: RAG evaluation, metrics, tools, and the context gap (2026)](https://atlan.com/know/how-to-evaluate-rag-systems-explained/) (~15 min): why high metric scores can still hide wrong answers.
- [FutureAGI: RAG evaluation metrics 2026](https://futureagi.com/blog/rag-evaluation-metrics-2025/) (~12 min): current metric landscape and tooling survey.
- [Pinecone: evaluating retrieval, recall@k/nDCG/MRR](https://www.pinecone.io/learn/offline-evaluation/) (~20 min): clean explanations of the information retrieval (IR) metrics.
- Cross-link: [Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md) for judge design, bias, and calibration; everything there applies to the LLM-judged metrics below.
Evaluate the two halves separately, then end to end. Retrieval metrics are cheap,

deterministic, and diagnose most failures; generation metrics need an LLM judge and

inherit all its failure modes.

### Retrieval metrics (deterministic, given labels)

For a query with labeled relevant chunks, over the top-k retrieved:

- **recall@k**: fraction of relevant chunks that appear in the top k. The single most
  important RAG retrieval number: if the answer is not in context, nothing downstream

  can save you. Track recall@5/10/20 (whatever fits the prompt budget).

- **precision@k**: fraction of the top k that is relevant; matters because irrelevant
  context actively distracts the generator.

- **MRR** (mean reciprocal rank): 1/rank of the first relevant hit, averaged. Good
  when one chunk suffices and position matters.

- **nDCG@k** (normalized discounted cumulative gain): rank-weighted, handles graded relevance; the standard for comparing
  rerankers (a reranker's whole job is moving nDCG).

Practical loop: measure recall@k of the first stage (fix with hybrid/chunking/query

transforms if low), then nDCG@small-k after reranking (fix with a better reranker).

### Generation metrics (LLM-judged)

The RAGAS-popularized "triad", now implemented across RAGAS, DeepEval, TruLens, ARES:

- **Faithfulness**: decompose the answer into claims; fraction of claims supported by
  the retrieved context. Low faithfulness = hallucination despite retrieval.

- **Answer relevance**: does the answer actually address the question (typically via
  reverse-generated questions compared to the original).

- **Context precision**: fraction of retrieved chunks that were relevant/used, rank-
  weighted; penalizes stuffing.

- **Context recall**: fraction of the reference answer's claims that the retrieved
  context could support; the LLM-judged cousin of retrieval recall, usable when you

  have reference answers but no chunk labels.

Caveats: these are LLM judges, so expect variance across judge models, leniency bias,

and score drift when the judge is upgraded; pin judge model versions and calibrate

against a hand-labeled sample (see [LLM-as-judge: design, biases, calibration, reliability](../evaluation-and-llm-judges/llm-as-judge.md)). And a system can

score 0.95 faithfulness while answering from a stale or non-canonical source:

faithfulness checks answer-vs-context, not context-vs-truth. Add freshness/source

checks if your corpus versions matter.

### Tooling

- **RAGAS**: most adopted; metrics library plus synthetic testset generation.
- **DeepEval**: pytest-style assertions, good continuous integration (CI) ergonomics.
- **TruLens**: the triad plus tracing.
- **ARES**: trains lightweight judges on synthetic data, cheaper at scale.
- Platforms (Langfuse, Braintrust, Arize Phoenix, Patronus) wrap these with tracing,
  datasets, and regression dashboards; use one once RAG is in production so evals run

  on real traffic samples, not just the golden set.

### Building golden sets

A few hundred well-made examples beat ten thousand synthetic ones.

1. Mine real queries (logs, support tickets, subject-matter expert (SME) interviews); synthetic-only sets
   overrepresent questions the corpus answers cleanly.

2. Label per query: relevant chunk IDs (for retrieval metrics) and a reference answer
   (for generation metrics). SME time is the bottleneck; spend it here.

3. Use synthetic generation (RAGAS testset generator, or an LLM prompted per chunk to
   write question+answer) to bootstrap coverage, then human-filter; unfiltered

   synthetic questions are suspiciously easy because they quote the chunk's phrasing.

4. Include hard negatives on purpose: unanswerable questions (system should abstain),
   multi-hop questions, ambiguous queries, and queries about near-duplicate documents.

5. Version the set, re-label when the corpus changes, and never tune on the held-out
   slice.

### Failure analysis

Metrics say how much; failure analysis says why. Bucket every failure:

- **Retrieval miss** (answer not in corpus vs in corpus but not retrieved vs retrieved
  below the cutoff): fix chunking, hybrid weights, query transformation.

- **Ranking miss** (retrieved at rank 40, prompt takes 10): fix reranker or k.
- **Generation miss** (context contained it, answer wrong/unfaithful): fix prompt,
  model, or context formatting; check for distraction from irrelevant chunks.

- **Grounding-refusal miss** (context sufficient, model refused or hedged), and its
  inverse (context insufficient, model answered anyway): fix instructions/abstention.

The recall-first triage: for every wrong answer, first check whether the gold chunk

was in the prompt. That one bit splits the stack in half and tells you which team owns

the bug. Run this on every regression before touching any component.

### Evaluating agentic RAG

Pipeline metrics still apply per retrieval call, but add trajectory-level checks: did

the agent retrieve when it should have (and not when it should not), query

reformulation quality, number of loops to sufficiency, and end-to-end answer quality

with citations verified against sources. This overlaps with agent evals generally; see [Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md).

### See also

- [The retrieval pipeline: chunking, hybrid search, query transformation, reranking](retrieval-pipeline.md): the stages these metrics diagnose.
- [Advanced and agentic RAG: GraphRAG, agent loops, long context, memory](advanced-and-agentic-rag.md): what changes for loops.
