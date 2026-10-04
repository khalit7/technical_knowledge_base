Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d as of 2026-09-30T16:16:51.338Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b" title="Topic: rag-and-retrieval"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"RAG evaluation"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/3acd364e-a788-470e-8093-74484f4fd0be/rag-evaluation.html?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4665ZGYY5KD%2F20261004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261004T152700Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEP7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJIMEYCIQDD8atjwROEor%2F8nwDVno7hM6aok5m6LliyYSMqgmTV5AIhALAA%2BmK%2B0Vs8RSsSa0hlus%2FE%2FqoNiYODy%2BMejU2PHelOKogECMb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igz5vY3phO5T9tzWB14q3AOtAfv6ciBwnrIe8dxX2G9R%2BuCDEX%2FwBI7Bp8LNmAFkS%2BVyRqd1hPtMenr6eTh7GR7rSgSmeN8RIv6F0Tgo4%2FC1MjlhOU5zeq%2B24crRjxf5D5JjXBZSeoh6Jjw4EB9ahQNAilEjHintB8Mkxwq7vWFXq2p%2FsBuJHEHPFBn0OORw5o2u1xG0MehHX2DonOe01MNGDy4lYrS4l160JNZHUBI%2Bcw7Lz55DYMqsnVNSVUxBW0btkkDWv3vCJ0NqeCF4%2BJxOtjjOageJWY2xg99JPF9jNBfbsWYz3HRDEC3oukizV2ZjCrcehLOuI%2B4ymAGwgqLIy0rK0kmsfIAQdXRRjB2wo7%2FwY75p5eLawHT%2BFuPK3cUxXyjFRY%2BwFAJqa5Ta4lj%2FAqK%2FMCC8z1JvVeIWAqEbNwfTLDDGdwzR9BtKomc0HS152sTHzx8UpKbeNIEF1rGSnbKz%2BETYxXJecIPkH2FiXEnwW%2FEJqFe80i7JP6a3pvAkP%2Fot3H%2FaRW4l%2Bpj4VQv7O8ecmO53P9%2Bp8FY1rKC1lOr7Q44ZI2It41E%2FqoxYlUeP50wiu0%2FttrOyQXapJYsmGU0B042KAz10QLGtAL3IdPWVuBArblfLIpOaacRzRvefLbNpUy7j%2F3R%2BPTCwt4nWBjqkAYvLZK9pIxeAo0HYL5aAhp%2BuC8sifcRwmOAMIVL2OuJj3w81kHZCui1ufRp9ax31BEiFGvUMMiw9DtYjNE2awCiB59bB96%2BKiRspuXKUxMoU0p1gP%2Bpm4CpfZTNWxvsG5pZma1YCothD2bGrBB19fbQRvoCZRbmMWmmmZkixlzPJES3jHOhI1PKq2A8FLpm1Jy4ZvTbDaSEl%2BCwdhzpwMYjvGrZp&X-Amz-Signature=6613a34689467e9baeb39abff7a6da89063ebf46fc9a7fedacfd03b02f979e97&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.e04c764a-91b8-494a-884a-9a18ba939528.13e79c56-ebab-4528-83aa-967a204b1f04">Interactive: RAG evaluation</embed>
⏱ 14 min read · +1h 27m resources
## What it is and why it matters
A retrieval-augmented generation (RAG) system can fail in two places: the retriever did not put the right text in the prompt, or the generator had the right text and still answered badly. A single end-to-end score ("62% of answers were correct") cannot tell those apart, so it cannot tell you what to fix. RAG evaluation therefore measures **the two halves separately, then end to end**.
- **The retrieval half** is scored with classical information retrieval (IR) metrics. Given labels saying which chunks are relevant to a query, they are cheap, deterministic and exactly reproducible, and they diagnose most failures.
- **The generation half** is scored by an LLM acting as a judge: it reads the question, the retrieved context and the answer, and decides whether the answer is supported and on topic. These metrics need no chunk labels, but they inherit every failure mode of LLM judges (variance, bias, drift when the judge changes).
- **End to end**, a small human-labelled golden set and a habit of sorting every failure into a bucket turn the numbers into decisions.
The one idea to keep: for every wrong answer, first ask whether the gold chunk was in the prompt. That single bit assigns the bug to the retrieval half or the generation half before anybody touches a component.
## Definitions
- **Query** $`q`$: one question from the evaluation set.
- **Chunk**: the retrievable unit, a passage of a document as cut at index time (how chunks are cut is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>).
- **Relevance label**: a human judgement of whether a chunk helps answer a query. **Binary** labels say relevant or not; **graded** labels say how much (for example 3 = answers the question on its own, 2 = contains a needed part, 1 = related background, 0 = irrelevant).
- **Gold chunks** $`\mathrm{Rel}(q)`$: the set of chunks labelled relevant for $`q`$.
- **Ranked list and cutoff** $`k`$: the retriever returns chunks in order; metrics "at $`k`$" look only at the top $`k`$, because only those reach the prompt.
- **Reference answer**: a human-written correct answer to $`q`$, needed by the metrics that compare against ground truth.
- **Claim**: one atomic factual statement. The LLM-judged metrics first split an answer (or a reference answer) into claims, then check each claim separately.
- **Golden set**: the versioned collection of queries with their labels and reference answers that every metric is computed over.
## Retrieval metrics (deterministic, given labels)
For a query with labelled relevant chunks, over the top $`k`$ retrieved. Each metric is computed per query and averaged over the golden set ([Pinecone: evaluation measures in information retrieval](https://www.pinecone.io/learn/offline-evaluation/)).
### recall@k
The fraction of the relevant chunks that appear in the top $`k`$:
$$
\mathrm{recall@}k = \frac{|\mathrm{Rel}(q) \cap \mathrm{Top}_k(q)|}{|\mathrm{Rel}(q)|}
$$
where $`\mathrm{Rel}(q)`$ is the set of gold chunks for query $`q`$, $`\mathrm{Top}_k(q)`$ is the set of the first $`k`$ retrieved chunks, and $`|\cdot|`$ counts elements. It is the single most important RAG retrieval number: if the answer is not in context, nothing downstream can save you. Track recall@5, recall@10 and recall@20, or whatever cutoffs match the prompt budget. It is undefined for a query with no gold chunks (an unanswerable question), so such queries are left out of the recall average and scored on abstention instead.
### precision@k
The fraction of the top $`k`$ that is relevant:
$$
\mathrm{precision@}k = \frac{|\mathrm{Rel}(q) \cap \mathrm{Top}_k(q)|}{k}
$$
with the same symbols. It matters because irrelevant context actively distracts the generator, and it is the metric that penalises stuffing the prompt with more chunks than it needs: raising $`k`$ can only raise recall and usually lowers precision.
### MRR (mean reciprocal rank)
The reciprocal of the rank of the first relevant hit, averaged over queries:
$$
\mathrm{MRR} = \frac{1}{|Q|} \sum_{q \in Q} \frac{1}{\mathrm{rank}_q}
$$
where $`Q`$ is the set of evaluation queries, $`|Q|`$ its size, and $`\mathrm{rank}_q`$ the position of the first relevant chunk for query $`q`$ (the term is 0 if none is retrieved). Good when one chunk suffices and position matters, and blind to everything after the first hit. Three queries whose first relevant chunks sit at ranks 2, 1 and 5 give $`\mathrm{MRR} = (1/2 + 1/1 + 1/5)/3 = 1.7/3 \approx 0.567`$.
### nDCG@k (normalised discounted cumulative gain)
Rank-weighted and able to use graded relevance, so it rewards putting the *most* relevant chunk first, not just any relevant chunk:
$$
\mathrm{DCG@}k = \sum_{i=1}^{k} \frac{\mathrm{rel}_i}{\log_2(i+1)}, \qquad \mathrm{nDCG@}k = \frac{\mathrm{DCG@}k}{\mathrm{IDCG@}k}
$$
where $`i`$ is the rank position, $`\mathrm{rel}_i`$ the graded relevance of the chunk at rank $`i`$ (0 if irrelevant), $`\log_2(i+1)`$ the discount that shrinks the credit for lower positions (1 at rank 1, 1.585 at rank 2, 2 at rank 3), and $`\mathrm{IDCG@}k`$ the DCG of the ideal ordering, all gold chunks sorted by relevance, so that nDCG lies between 0 and 1. Some libraries use the gain $`2^{\mathrm{rel}_i} - 1`$ instead of $`\mathrm{rel}_i`$, which weights highly relevant chunks more; the two give different numbers, so state which one you report. nDCG is the standard for comparing rerankers, because a reranker's whole job is moving items up the list, which is exactly what nDCG measures.
### Worked example: one query, before and after reranking
A query has three gold chunks with graded relevance A = 3, B = 2, C = 1. X, Y and Z are irrelevant. Take $`k = 5`$.
- **First stage** (hybrid retrieval) returns X, B, Y, C, Z in the top 5; A is at rank 8.
	- recall@5 = 2/3 = 0.667 (B and C are in, A is not); precision@5 = 2/5 = 0.4; reciprocal rank = 1/2 (first hit, B, at rank 2).
	- DCG@5 = 2/log₂3 + 1/log₂5 = 1.262 + 0.431 = 1.693. The ideal order A, B, C gives IDCG@5 = 3/1 + 2/1.585 + 1/2 = 3 + 1.262 + 0.5 = 4.762. nDCG@5 = 1.693 / 4.762 = 0.355.
- **After a cross-encoder reranker** reorders the top 20 first-stage candidates, the top 5 is A, B, X, C, Y.
	- recall@5 = 3/3 = 1.0; precision@5 = 3/5 = 0.6; reciprocal rank = 1.
	- DCG@5 = 3/1 + 2/1.585 + 0 + 1/log₂5 + 0 = 3 + 1.262 + 0.431 = 4.693, so nDCG@5 = 4.693 / 4.762 = 0.985.
The reranker could rescue A only because the first stage had retrieved it within its top 20. That is the whole logic of the practical loop: measure recall@k of the first stage at the depth the reranker sees (fix with hybrid search, chunking or query transforms if low), then nDCG at the small $`k`$ that reaches the prompt after reranking (fix with a better reranker).
## Generation metrics (LLM-judged)
The four core RAG metrics of RAGAS (Retrieval Augmented Generation Assessment, [Es et al., 2023](https://arxiv.org/abs/2309.15217)), now implemented in some form across RAGAS, DeepEval, TruLens and ARES. The name "RAG triad" belongs to TruLens and covers three of them under different names: context relevance, groundedness (faithfulness) and answer relevance ([TruLens: the RAG triad](https://www.trulens.org/getting_started/core_concepts/rag_triad/)). The definitions below follow the [RAGAS metric documentation](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/).
### Faithfulness
Decompose the answer into claims, and ask the judge, claim by claim, whether the retrieved context supports it:
$$
\mathrm{Faithfulness} = \frac{\text{claims in the answer supported by the retrieved context}}{\text{claims in the answer}}
$$
Low faithfulness means hallucination despite retrieval. The RAGAS example: the context says Einstein was born on 14 March 1879 in Germany, and the answer says "Einstein was born in Germany on 20th March 1879". The judge splits it into "born in Germany" (supported) and "born on 20th March 1879" (contradicted), so faithfulness = 1/2 = 0.5.
### Answer relevance (RAGAS calls it response relevancy)
Does the answer actually address the question? RAGAS measures it by reverse generation: an LLM writes $`N`$ questions that the answer would be a good answer to, and the metric is how close those are to the original question in embedding space:
$$
\mathrm{AnswerRelevancy} = \frac{1}{N} \sum_{i=1}^{N} \frac{E_{g_i} \cdot E_o}{\lVert E_{g_i} \rVert \, \lVert E_o \rVert}
$$
where $`E_{g_i}`$ is the embedding of the $`i`$-th generated question, $`E_o`$ the embedding of the user's question, the fraction is their cosine similarity, and $`N`$ the number of generated questions (3 by default in RAGAS). An answer that drifts off topic, or answers only part of the question, produces generated questions that differ from the original and scores low. It says nothing about whether the answer is true.
### Context precision
Were the relevant chunks ranked above the irrelevant ones? The judge marks each retrieved chunk relevant or not (against the reference answer, or against the response when there is no reference), and the metric averages precision at every rank that holds a relevant chunk:
$$
\mathrm{ContextPrecision@}K = \frac{\sum_{k=1}^{K} \left( \mathrm{precision@}k \times v_k \right)}{\text{relevant chunks in the top } K}
$$
where $`K`$ is the number of retrieved chunks considered, $`v_k \in \{0, 1\}`$ is the judge's relevance verdict for the chunk at rank $`k`$, and $`\mathrm{precision@}k`$ is the fraction of the first $`k`$ chunks that are relevant. It is rank-weighted: irrelevant chunks ranked *above* relevant ones lower it. Irrelevant chunks ranked *below* every relevant one do not, because the denominator counts only relevant chunks, so on its own it does not penalise a prompt padded at the bottom; precision@k does. One relevant chunk at rank 1 followed by nine irrelevant ones scores context precision 1.0 while precision@10 = 1/10 = 0.1. On the worked example above with binary verdicts, the first-stage list (relevant at ranks 2 and 4) scores (1/2 + 2/4) / 2 = 0.5 and the reranked list (relevant at ranks 1, 2 and 4) scores (1 + 1 + 3/4) / 3 = 0.917.
### Context recall
The fraction of the reference answer's claims that the retrieved context could support:
$$
\mathrm{ContextRecall} = \frac{\text{claims in the reference answer supported by the retrieved context}}{\text{claims in the reference answer}}
$$
It is the LLM-judged cousin of retrieval recall, usable when you have reference answers but no chunk labels. A reference answer with 4 claims of which the context supports 3 scores 0.75: a quarter of what a correct answer needs never reached the generator.
### Caveats
These are LLM judges, so expect variance across judge models, leniency bias, and score drift when the judge is upgraded; pin judge model versions and calibrate against a hand-labelled sample. <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b"/> holds the method: a few hundred expert-labelled items, agreement reported as Cohen's kappa rather than raw accuracy, and the aggregate corrected with the judge's measured true-positive and false-positive rates. And a system can score 0.95 faithfulness while answering from a stale or non-canonical source: faithfulness checks answer against context, not context against truth. Add freshness and source checks if your corpus versions matter.
## Tooling
- **RAGAS**: most adopted; a metrics library with the four metrics above and more, plus synthetic testset generation.
- **DeepEval**: pytest-style assertions (a test fails when a metric falls under a threshold), good continuous integration (CI) ergonomics.
- **TruLens**: the RAG triad plus tracing of each call in the pipeline.
- **ARES** ([Saad-Falcon et al., NAACL 2024](https://arxiv.org/abs/2311.09476)): generates synthetic training data, fine-tunes lightweight LM judges for context relevance, answer faithfulness and answer relevance, and corrects their errors with prediction-powered inference over a few hundred human annotations; cheaper than prompting a frontier judge at scale.
- Platforms (Langfuse, Braintrust, Arize Phoenix, Patronus) wrap these with tracing, datasets, and regression dashboards; use one once RAG is in production so evals run on real traffic samples, not just the golden set.
## Building golden sets
A few hundred well-made examples beat ten thousand synthetic ones.
1. Mine real queries (logs, support tickets, subject-matter expert (SME) interviews); synthetic-only sets overrepresent questions the corpus answers cleanly.
2. Label per query: relevant chunk IDs (for retrieval metrics) and a reference answer (for generation metrics). SME time is the bottleneck; spend it here.
3. Use synthetic generation (RAGAS testset generator, or an LLM prompted per chunk to write question and answer) to bootstrap coverage, then human-filter; unfiltered synthetic questions are suspiciously easy because they quote the chunk's phrasing.
4. Include hard negatives on purpose: unanswerable questions (system should abstain), multi-hop questions, ambiguous queries, and queries about near-duplicate documents.
5. Version the set, re-label when the corpus changes (a re-chunked index invalidates chunk-ID labels), and never tune on the held-out slice.
How golden sets are promoted, gated in CI and audited for label noise is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc"/>.
## Failure analysis
Metrics say how much; failure analysis says why. Bucket every failure:
- **Retrieval miss** (answer not in corpus, or in corpus but not retrieved, or retrieved below the cutoff): fix chunking, hybrid weights, query transformation. The first case is a corpus gap, not a retriever bug.
- **Ranking miss** (retrieved at rank 40, prompt takes 10): fix reranker or k.
- **Generation miss** (context contained it, answer wrong or unfaithful): fix prompt, model, or context formatting; check for distraction from irrelevant chunks.
- **Grounding-refusal miss** (context sufficient, model refused or hedged), and its inverse (context insufficient, model answered anyway): fix instructions and abstention.
The recall-first triage: for every wrong answer, first check whether the gold chunk was in the prompt. That one bit splits the stack in half and tells you which team owns the bug: not in the prompt means a retrieval or ranking miss (then check whether it was anywhere in the candidate list, to separate the two); in the prompt means a generation or grounding miss. Run this on every regression before touching any component.
## Evaluating agentic RAG
In agentic RAG the model calls retrieval as a tool inside a loop, writing its own queries until it judges the context sufficient (<mention-page url="https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8"/>). Pipeline metrics still apply per retrieval call, but add trajectory-level checks: did the agent retrieve when it should have (and not when it should not), query reformulation quality, number of loops to sufficiency, and end-to-end answer quality with citations verified against sources. This overlaps with agent evals generally, where the direction is to grade the trajectory (tool choices, intermediate states) and not only the final answer; see <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>.
## Which metric when
<table header-row="true">
<tr>
<td>Metric</td>
<td>Needs</td>
<td>Cost</td>
<td>Answers</td>
<td>Blind to</td>
</tr>
<tr>
<td>recall@k</td>
<td>chunk labels</td>
<td>free, deterministic</td>
<td>did the evidence reach the prompt?</td>
<td>order within the top k</td>
</tr>
<tr>
<td>precision@k</td>
<td>chunk labels</td>
<td>free, deterministic</td>
<td>how much of the prompt is noise?</td>
<td>order, and missing evidence</td>
</tr>
<tr>
<td>MRR</td>
<td>chunk labels</td>
<td>free, deterministic</td>
<td>how soon is the first useful chunk?</td>
<td>everything after the first hit</td>
</tr>
<tr>
<td>nDCG@k</td>
<td>graded chunk labels</td>
<td>free, deterministic</td>
<td>is the best evidence at the top? (reranker comparisons)</td>
<td>absolute coverage beyond k</td>
</tr>
<tr>
<td>Faithfulness</td>
<td>nothing beyond context and answer</td>
<td>one judge call per claim set</td>
<td>is the answer supported by the context?</td>
<td>whether the context is true or current</td>
</tr>
<tr>
<td>Answer relevance</td>
<td>nothing beyond question and answer</td>
<td>judge plus embeddings</td>
<td>does the answer address the question?</td>
<td>whether the answer is correct</td>
</tr>
<tr>
<td>Context precision</td>
<td>reference answer (or the response)</td>
<td>judge call per chunk</td>
<td>are relevant chunks ranked first?</td>
<td>irrelevant chunks below the relevant ones</td>
</tr>
<tr>
<td>Context recall</td>
<td>reference answer</td>
<td>judge call per claim</td>
<td>did the context cover what a correct answer needs?</td>
<td>extra noise in the context</td>
</tr>
</table>
Use the deterministic metrics whenever you have chunk labels, as the first and cheapest gate; use the judged ones where labelling chunks is impractical, and always calibrate the judge first.
## Common mistakes
- **Reporting one end-to-end score.** It cannot say which half failed; always split retrieval from generation.
- **Measuring recall at the prompt's **$`k`$** only.** Measure the first stage at the reranker's input depth too, or you cannot tell a retrieval miss from a ranking miss.
- **Reading high faithfulness as correctness.** Faithfulness is answer against context; a stale document yields a faithful wrong answer.
- **Reading high context precision as a clean prompt.** Irrelevant chunks below the relevant ones do not lower it; check precision@k.
- **Comparing nDCG across libraries** without checking the gain (linear against $`2^{\mathrm{rel}} - 1`$) and the cutoff.
- **Unpinned judges.** Upgrading the judge model moves every generation metric; treat it as a new instrument and recalibrate.
- **Synthetic-only golden sets**, which are easy by construction, and stale chunk-ID labels after re-chunking the corpus.
- **Averaging recall over unanswerable queries**, where it is undefined; score abstention separately.
## See also
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b">Topic: rag-and-retrieval</mention-page>: the map of the RAG stack (knowledge base, retriever, ranker, integration layer, generator) whose halves these metrics split.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>: the stages these metrics diagnose: chunking, hybrid BM25 plus dense retrieval fused with reciprocal rank fusion, query transformation, and cross-encoder reranking, whose gains are measured in nDCG.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8"/>: what changes for loops, where retrieval becomes a tool call and evaluation moves to trajectories.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>: judge design, bias, and calibration; everything there applies to the LLM-judged metrics above.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b"/>: the grading modes, the bias catalogue (position, verbosity, self-preference) and calibration against a human gold slice.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc"/>: golden sets as regression gates in CI, paired statistics, and gold-label auditing.
## Best resources
- [RAGAS documentation](https://docs.ragas.io/) (docs, \~40 min for the core pages): reference implementations of the core metrics judged by an LLM, with a worked example per metric.
- [Atlan: RAG evaluation, metrics, tools, and the context gap (2026)](https://atlan.com/know/how-to-evaluate-rag-systems-explained/) (\~15 min): why high metric scores can still hide wrong answers.
- [FutureAGI: RAG evaluation metrics 2026](https://futureagi.com/blog/rag-evaluation-metrics-2025/) (\~12 min): current metric landscape and tooling survey.
- [Pinecone: evaluating retrieval, recall@k/nDCG/MRR](https://www.pinecone.io/learn/offline-evaluation/) (\~20 min): clean explanations of the information retrieval (IR) metrics.
## Further reading
- [Ragas: Automated Evaluation of Retrieval Augmented Generation (Es et al., 2023)](https://arxiv.org/abs/2309.15217) (45 min): the paper behind the reference-free faithfulness, answer relevance and context relevance metrics.
- [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems (Saad-Falcon et al., NAACL 2024)](https://arxiv.org/abs/2311.09476) (45 min): fine-tuned lightweight judges plus prediction-powered inference.
- [TruLens: the RAG triad](https://www.trulens.org/getting_started/core_concepts/rag_triad/) (5 min): context relevance, groundedness and answer relevance as three checks on one trace.
</content>
</page>