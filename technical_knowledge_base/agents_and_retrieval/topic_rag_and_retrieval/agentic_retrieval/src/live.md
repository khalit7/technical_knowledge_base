Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8 as of 2026-09-30T19:20:26.829Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8105a68cfb504ed4b0e8">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b" title="Topic: rag-and-retrieval"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Advanced and agentic RAG: GraphRAG, agent loops, long context, memory"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://783d6a1d-f81e-4b25-aa7a-845254f222b7/fdbfb1e0-13f5-4966-bf30-fd115f8b43f1?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=advanced-and-agentic-rag.html">Interactive: Advanced and agentic RAG: GraphRAG, agent loops, long context, memory</embed>
⏱ 19 min read · +3h resources
## What it is and why it matters
A basic retrieval-augmented generation (RAG) system runs one fixed chain for every question: embed the query, fetch the most similar chunks, paste them into the prompt, generate. That chain answers a question whose answer sits in one or two passages. It fails on three kinds of question: **multi-hop** ones, where the second search depends on what the first one found ("who founded the company that acquired X?"); **ambiguous** ones, where the raw query is the wrong search string; and **global** ones ("what are the main themes across these 10K documents"), where no single chunk contains the answer at all.
This page covers the four ways the field pushed past the fixed chain, and when each earns its cost:
- **Agentic retrieval** hands retrieval to the model as a tool it can call repeatedly, so it can search, read, reformulate and search again.
- **GraphRAG and its variants** build structure over the corpus at index time, so questions about the whole corpus become answerable.
- **Long context** skips retrieval for corpora small enough to fit in a million-token window.
- **Memory systems** apply retrieval to an agent's own history, where the hard problems move from finding things to deciding what to keep and when to surface it.
The common thread is that the retrieval step stops being a fixed function called once and becomes a decision: whether to retrieve, what to retrieve, from which store, and when. Search quality (chunking, hybrid search, reranking, on <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>) still decides whether each individual search returns the right thing; this page is about who calls it and how often.
## The maturity ladder
The three rungs differ in who decides what gets retrieved.
<table header-row="true">
<tr>
<td>Rung</td>
<td>Who decides what to retrieve</td>
<td>Shape</td>
<td>Where it fails</td>
</tr>
<tr>
<td>Naive RAG</td>
<td>Nobody: the raw query is embedded and the top k chunks are taken</td>
<td>One shot: embed, retrieve top k, stuff the prompt, generate</td>
<td>Multi-hop, ambiguous and global questions</td>
</tr>
<tr>
<td>Advanced RAG</td>
<td>The system designer, in advance</td>
<td>A fixed directed acyclic graph (DAG): pre-retrieval stages (query rewriting, routing, decomposition), the retrieval core, post-retrieval stages (reranking, compression, citation checking)</td>
<td>Questions the designer did not anticipate; it cannot notice that a search came back empty and try again</td>
</tr>
<tr>
<td>Agentic RAG</td>
<td>The model, at run time</td>
<td>A loop: retrieval is a tool the model may call zero or more times, with queries it writes itself</td>
<td>Cost, latency and evaluability; it can loop or over-search on easy questions</td>
</tr>
</table>
- **Naive RAG** is the one-shot chain above. It has no feedback: if the first retrieval misses, the answer is built on the miss.
- **Advanced RAG** wraps the naive core in pre-retrieval and post-retrieval stages, but every query follows the same graph, decided when the system was built. This is <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>, which owns hybrid search, reciprocal rank fusion, query transformation (HyDE, multi-query, decomposition) and cross-encoder reranking.
- **Agentic RAG** makes retrieval a *tool* inside a ReAct-style loop (reason, then act; the pattern from <mention-page url="https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8"/>, which interleaves free-text reasoning steps with tool calls and their observations). The agent decides whether to retrieve, writes its own queries, inspects results, re-retrieves with reformulated queries until it judges the context sufficient, then answers. It is also called agentic search.
## Agentic retrieval
### The loop, step by step
1. The model receives the question, a system prompt and the schemas of the tools it may call.
2. It reasons about what it needs and either answers directly or emits a tool call (for example `search("Leiden algorithm community detection")`).
3. The harness runs the tool and appends the result to the context as an observation.
4. The model reads the observation and decides again: answer, search with a reformulated query, call a different tool, or read a document in full.
5. The loop ends when the model emits a final answer, or when the harness hits a step or token budget.
Every call rereads everything before it, which is why cost grows faster than the number of searches (worked below).
### What changes when the model drives
- **Conditional retrieval**: the agent skips retrieval for questions it can answer from its own knowledge, and escalates (more queries, different tools) for hard ones. Two early academic forms made the decision explicit. **Self-RAG** (Asai et al., 2023, [arXiv 2310.11511](https://arxiv.org/abs/2310.11511)) trains the model to emit special reflection tokens that say whether to retrieve at all, whether each retrieved passage is relevant, and whether the answer is supported by it. **Adaptive-RAG** (Jeong et al., 2024, [arXiv 2403.14403](https://arxiv.org/abs/2403.14403)) trains a small classifier to predict a query's complexity and routes it to no retrieval, single-step retrieval or multi-step retrieval. By 2026 frontier models make this decision natively when handed a search tool, with no special tokens or classifier.
- **Tool diversity**: production agentic retrieval exposes several tools, not one: semantic (embedding) search, keyword or grep search, metadata or SQL lookup, and a file or URL reader. Coding agents showed that plain grep plus file reading over a repository often beats embeddings, because code search is dominated by exact identifiers; the general lesson is to let the agent choose the sharp tool for each sub-question.
- **The deep-research pattern**: plan sub-questions, search per sub-question (often with parallel sub-agents), read, take notes, iterate until the sub-questions are covered, then synthesise with citations. The OpenAI, Google and Anthropic deep-research products and their open clones all follow this shape; it is agentic RAG with a budget of minutes instead of milliseconds.
### What it costs
Agentic loops cost more tokens and more time than a pipeline, and they are harder to evaluate, because the thing to score is a trajectory of decisions rather than one retrieval. The most careful controlled comparison, Ferrazzi et al. ([arXiv 2601.07711](https://arxiv.org/html/2601.07711v2), revised April 2026), ran an enhanced pipeline (router, rewriter, retriever, reranker) against an agentic system on the same tasks. The agentic system used on average 3.3 times the input tokens, 1.9 times the output tokens and 1.5 times the latency, and cost up to 3.6 times as much. Its quality was not uniformly higher: it won on query rewriting (+2.8 NDCG@10 points on average, where NDCG is normalised discounted cumulative gain, a ranking metric that rewards putting relevant items near the top) and on tightly scoped domains, while the pipeline's explicit reranking beat the agent's iterative re-retrieval, and the pipeline scored 87.9 F1 against the agent's 64.6 on FEVER, a fact-verification set. The authors' conclusion is a hybrid: let the model route and rewrite, and keep an explicit reranker.
So the quality ceiling of the loop is real for multi-hop and exploratory questions, and paying it on simple factoid lookups is waste. Hence **routers**: a cheap classifier or rule that sends easy queries to the static pipeline and hard ones to the agent.
### The token maths of a loop
Without prompt caching, the input tokens of an agentic loop with $`n`$ searches and a final answer are
$$
T_{\text{in}} = (n+1)\,s + r\,\frac{n(n+1)}{2}
$$
where
- $`n`$ is the number of search calls the agent makes before it answers, so the model is called $`n+1`$ times,
- $`s`$ is the fixed part every call rereads: system prompt, tool schemas and the question,
- $`r`$ is the number of tokens each search result adds to the context (the call after the $`i`$-th search rereads $`i`$ results),
- $`T_{\text{in}}`$ is the total input tokens across all calls.
A one-shot pipeline reads $`s + R`$ once, where $`R`$ is the retrieved context. The $`n(n+1)/2`$ term makes the loop's cost grow quadratically in the number of searches. Prompt caching lowers the price of the reread prefix, but not the latency of generating each step.
**Worked example** (illustrative numbers). Take $`s = 1{,}500`$ tokens and $`r = 2{,}000`$ tokens per search, against a pipeline that retrieves $`R = 4{,}000`$ tokens once.
- Pipeline: $`1{,}500 + 4{,}000 = 5{,}500`$ input tokens.
- Agent with three searches: the four calls read 1,500, 3,500, 5,500 and 7,500 tokens. The formula agrees: $`4 \times 1{,}500 + 2{,}000 \times 6 = 18{,}000`$, or 3.3 times the pipeline.
- Agent with six searches: $`7 \times 1{,}500 + 2{,}000 \times 21 = 52{,}500`$, or 9.5 times the pipeline.
Doubling the searches roughly tripled the cost, which is why step budgets and routers matter more than per-call prices.
## GraphRAG and variants
### Why vector search cannot answer global questions
Vector RAG answers **local** questions ("what does clause 7 say"), whose answer sits in a few passages similar to the query. It cannot answer **global** questions ("what are the main themes across these 10K documents"), because no single chunk contains the answer: the answer is a property of the whole corpus, and retrieving the top 10 chunks samples 10 fragments of it. GraphRAG builds a knowledge graph over the corpus at index time, so that structure (who relates to whom, which topics cluster) can be queried.
### Microsoft GraphRAG, step by step
From Edge et al., *From Local to Global* ([arXiv 2404.16130](https://arxiv.org/abs/2404.16130), April 2024):
1. **Extract**: an LLM reads every chunk and lists its entities and the relations between them, which become the nodes and edges of a graph.
2. **Cluster**: the Leiden algorithm (Traag et al., 2019, a community-detection method that partitions a graph into densely connected groups and, unlike its predecessor Louvain, guarantees each group is internally connected) is run recursively, giving a hierarchy of communities from a few broad ones down to many narrow ones.
3. **Summarise**: an LLM writes a summary of every community at every level, bottom up.
4. **Answer global queries by map-reduce**: in the *map* step, each community summary at the chosen level is given the question and produces a partial answer with a helpfulness score from 0 to 100; answers scoring 0 are dropped. In the *reduce* step, the remaining partial answers are sorted by score and packed into the context until the token budget is full, and a final call writes the answer from them.
Local questions about a named entity use the graph differently: start from the entity's node and gather its neighbours, relations and source chunks.
**Worked example** (illustrative). A global query runs over four communities, whose partial answers score 80, 65, 0 and 30. The 0 is dropped; the rest are packed in the order 80, 65, 30; if the budget holds only two, the answer is written from the 80 and 65 answers. Every community costs one map call per query, which is where GraphRAG's query cost comes from.
The quality is real, and so is the cost. Per a 2026 production comparison ([Paperclipped](https://www.paperclipped.de/en/blog/graph-rag-production/)), a 500-page corpus that costs under \$5 to embed into a vector database takes about 45 minutes and \$50 to \$200 at GPT-4 pricing to run through GraphRAG's extraction and summarisation, a 10,000-document knowledge base runs to a four-figure indexing cost before the first query, and updates mean re-indexing.
### The cheaper variants
- **LazyGraphRAG** (Microsoft Research, November 2024, [blog](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/)): at index time it extracts only noun phrases and their co-occurrences with classical natural language processing, no LLM, and uses graph statistics to build a hierarchy of concept communities. Its indexing cost is identical to vector RAG's and 0.1% of full GraphRAG's. All LLM work is deferred to query time, over the subgraphs relevant to the question, with one main parameter, the **relevance test budget** (how many LLM relevance checks a query may spend), controlling the cost-quality trade-off. Microsoft reports quality comparable to GraphRAG global search on global queries at more than 700 times lower query cost. It is the sensible default when you want graph-style global answers.
- **LightRAG**: stripped-down open source: simple entity extraction, a flat graph with no community hierarchy, and dual retrieval (graph traversal plus vectors). On the same 500-page corpus it indexes in about 3 minutes for about \$0.50, and reaches 70 to 90% of GraphRAG's quality at about 1/100 of the cost ([Paperclipped](https://www.paperclipped.de/en/blog/graph-rag-production/)).
- **Graphiti and temporal graphs**: incrementally updated, time-aware graphs built for agent memory rather than batch corpora; covered under *Memory systems* below.
### When a graph earns its cost
GraphRAG pays when questions are genuinely relational or corpus-global (compliance, intelligence analysis, entity-heavy domains) and the team invests in ontology design, deciding which entity and relation types to extract. Most production stacks that use graphs run hybrid vector plus graph, routed by query type. For ordinary question answering, contextual retrieval (an LLM-written situating prefix on each chunk at index time) plus a reranker gets most of the benefit for a fraction of the complexity.
## Long context vs RAG
Million-token windows (Gemini, Claude and GPT long-context tiers) reframed RAG but did not end it. The head-to-head study by Li et al. ([arXiv 2501.01880](https://arxiv.org/abs/2501.01880), December 2024) found long context generally ahead on question-answering benchmarks, especially Wikipedia-based ones, RAG ahead on dialogue-based and general questions, and summarisation-based retrieval comparable to long context while chunk-based retrieval lagged: which approach wins depends on the task and on how relevant the retrieved context is.
**Where long context wins**: corpora that fit comfortably in the window (a contract set, a small repository, one book), tasks that need holistic reading (summarise, find inconsistencies), and one-off analyses where building an index is overhead.
**Where RAG wins, and why it persists**:
- **Economics**: every query pays for every token in the window (worked below).
- **Latency**: seconds of prefill (the model's pass over the whole input before it writes the first token) against tens of milliseconds of approximate nearest neighbour (ANN) search.
- **Scale**: corpora are unbounded; windows are not. Beyond the window you are selecting content, which is retrieval whether you call it that or not.
- **Freshness and access control lists (ACLs)**: per-query filtering and per-tenant isolation have no long-context equivalent.
- **Distraction**: irrelevant content in the window measurably hurts accuracy. "Lost in the middle" (Liu et al., 2023, [arXiv 2307.03172](https://arxiv.org/abs/2307.03172)) showed accuracy is highest when the relevant passage is at the start or end of the context and drops when it sits in the middle. NoLiMa (Modarressi et al., 2025, [arXiv 2502.05167](https://arxiv.org/abs/2502.05167)) showed that the literal needle-in-a-haystack test flatters models, because the needle shares words with the question: when it does not, 11 of 13 models claiming at least 128K-token windows fell below half of their short-context score at 32K tokens, and GPT-4o, the best, fell from 99.3% to 69.7%. Literal-match distractors made the drop worse.
### The cost maths
The cost of one query is
$$
C = p_{\text{in}}\,T_{\text{fresh}} + p_{\text{cache}}\,T_{\text{cached}} + p_{\text{out}}\,T_{\text{out}}
$$
where
- $`T_{\text{fresh}}`$ is the number of input tokens billed at the full input price $`p_{\text{in}}`$,
- $`T_{\text{cached}}`$ is the number of input tokens served from a prompt cache, billed at the lower price $`p_{\text{cache}}`$,
- $`T_{\text{out}}`$ is the number of output tokens, billed at $`p_{\text{out}}`$,
- $`C`$ is the cost of the query.
Long context puts the whole corpus of $`N`$ tokens into $`T_{\text{fresh}}`$ or $`T_{\text{cached}}`$ on every query; RAG puts only $`k`$ chunks of $`c`$ tokens there.
**Worked example** (illustrative prices: \$3 per million input tokens, \$0.30 per million cached input tokens, \$15 per million output tokens). A corpus of $`N = 1{,}000{,}000`$ tokens, a question and instructions of 500 tokens, and an answer of 500 tokens.
- **RAG**, $`k = 10`$ chunks of $`c = 400`$ tokens: $`4{,}500`$ input tokens cost $`\$0.0135`$, the answer $`\$0.0075`$, total $`\$0.021`$.
- **Long context, uncached**: $`1{,}000{,}500`$ input tokens cost $`\$3.0015`$, plus $`\$0.0075`$, total $`\$3.009`$: 143 times the RAG query.
- **Long context, corpus cached**: $`\$0.30 + \$0.0015 + \$0.0075 = \$0.309`$: 15 times the RAG query.
The input-token ratio alone is $`1{,}000{,}500 / 4{,}500 \approx 222`$, and it approaches 1,000 when only two chunks are retrieved; the end-to-end gap is smaller, because caching discounts the corpus and the answer costs the same either way. LightOn's comparison of typical workloads ([LightOn](https://lighton.ai/lighton-blogs/rag-is-dead-long-live-rag-retrieval-in-the-age-of-agents), November 2025) puts RAG at 8 to 82 times cheaper, with better latency.
### How the two compose
Retrieval selects the working set; long context lets that working set be generous (whole documents instead of shreds, 50 chunks instead of 5), which removes most of the damage bad chunking does. Adaptive routing is the standard glue: when the corpus fits the window, put it all in; when it does not, retrieve.
## Memory systems
Agent memory is RAG turned inward: the corpus is the agent's own history, and it is generated by the same process that will later need it.
### Patterns
- **Append-only episodic logs with retrieval**: store every turn or trajectory, search it like a document corpus.
- **Extracted-fact stores** that update and expire facts. **Mem0** ([arXiv 2504.19413](https://arxiv.org/abs/2504.19413), April 2025) extracts candidate facts from each conversation turn, then compares each with the similar facts already stored and applies one of four operations: ADD, UPDATE, DELETE or NOOP. On the LOCOMO long-conversation benchmark it reports 91% lower p95 latency and more than 90% lower token cost than putting the whole conversation history in context. **Zep** ([arXiv 2501.13956](https://arxiv.org/abs/2501.13956), January 2025) stores memory in **Graphiti**, a temporal knowledge graph in which every fact carries a validity window (when it became true, and when, if ever, it was superseded); a contradicting fact invalidates the old edge instead of overwriting it, so the graph can answer both what is true now and what was true at a given time. Graphiti updates incrementally as episodes arrive, with no batch recomputation, and retrieves by combining embedding search, BM25 keyword search and graph traversal ([Graphiti](https://github.com/getzep/graphiti)).
- **Agent-curated plain-text files** for small working memory: the agent reads and edits a file of notes it keeps for itself, as in Claude Code's `CLAUDE.md` pattern.
### The hard problems
Retrieval over memories is the easy part. The hard problems are **writing** (what to remember), **updating** (superseding stale facts), **forgetting**, and **timing**: not what to retrieve from memory but when. Temporal knowledge graphs are the strongest current answer to contradiction and supersession, because the validity window makes "this replaced that" a first-class fact.
**Timing** is the least studied of the four. Meta AI's Proactive Memory Agent (September 2026, summarised on <mention-page url="https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c"/>, from The Batch's coverage rather than the paper itself) runs a second model beside an acting agent to decide at each step whether to remind it of something it already knows and has lost from working context, with no retraining of the worker. Reported results: Terminal-Bench 2.0 goes from 37.6% to 45.9% for Claude Sonnet 4.5 and from 37.6% to 41.1% for Qwen3.5-27B; tau2-Bench goes from 55.0% to 61.8% for Claude Sonnet 4.5 and from 66.2% to 68.7% for Claude Opus 4.6. Reminding **selectively** beats reminding at every step, because a reminder consumes context and competes with live task state, so the memory agent's job is discrimination rather than ranking. Classic RAG treats timing as fixed (retrieve once, before generating) and ranking as the whole problem; for long-horizon agents the timing is the problem. No cost is reported for running the second model continuously.
**When the memory is curated** is the same variable one step further back. Agentic memory usually curates at **write time**: a finished trajectory is distilled into a fixed reflection or skill, and whatever the distillation dropped is unavailable to every later task. **JitMem** (Zhou et al., September 2026, [arXiv 2609.27334](https://arxiv.org/abs/2609.27334), summarised on <mention-page url="https://app.notion.com/p/3e95c17b0d0d818f89b3f066f816727b"/>) keeps the raw trajectories and curates at **read time**: once the task is known, a curator synthesises a compact task-specific payload from them, and because that payload is used on a task with an outcome, the curator can be trained directly from task success. Against the strongest baseline it gains 16.2 points on ALFWorld, 16.3 on WebShop and 3.9 on tau2-bench, and an **untrained** curator already beats the write-time methods, which locates the gain in the timing rather than in the curator.
The consequence for design: a document index is a write-time artifact by definition, which is right for documents, since they cannot know what will be asked of them. It is the wrong default for an agent's own history. Keep trajectories raw, pay the storage, and spend the compute when the task is known.
## Trade-offs: which approach when
- **Factoid questions over a large corpus**: the static pipeline (hybrid search plus a reranker). An agent adds cost and, in the controlled comparison above, loses to explicit reranking.
- **Multi-hop, ambiguous or exploratory questions**: agentic retrieval, with a step budget. It buys adaptive query rewriting and follow-up searches, and costs several times the tokens, growing quadratically with the number of searches.
- **Mixed traffic**: a router in front of both, sending easy queries to the pipeline.
- **Corpus-global questions** (themes, patterns across everything): LazyGraphRAG first; full GraphRAG when the corpus is stable, the domain is entity-heavy and the indexing budget is there; LightRAG for a cheap open-source graph.
- **A corpus that fits in the window, read once or holistically**: long context, cached if it is queried repeatedly. Beyond the window, or with per-user access control, retrieve.
- **An agent's own history**: an extracted-fact store or a temporal graph when facts change over time; raw trajectories curated at read time when the agent learns from past tasks; a plain-text notes file for small working memory.
## Common mistakes and misconceptions
- **"Long context killed RAG."** It absorbed the small-corpus end. Cost per query, latency, scale beyond the window, access control and distraction all still favour retrieval, and the two compose.
- **"Agentic is always better."** In a controlled comparison the agent lost to a pipeline with explicit reranking on document refinement and on a broad fact-verification set, at up to 3.6 times the cost.
- **"The agent's cost is linear in the number of searches."** Each call rereads everything before it, so input tokens grow with $`n(n+1)/2`$.
- **"GraphRAG is better RAG."** It answers a different class of question (global and relational). For local lookups a vector index with a reranker is cheaper and at least as good.
- **"A needle-in-a-haystack pass means the model uses its whole window."** The literal test lets the model match words; NoLiMa's non-literal version halved most models' scores at 32K tokens.
- **"Memory is a retrieval problem."** Retrieval over memories is the easy part; writing, updating, forgetting and timing are where memory systems fail.
- **"Remind the agent of everything relevant, every step."** Reminders consume context and compete with live task state; selective reminding beat reminding at every step.
## Where RAG is headed
The pipeline era is ending; the retrieval era is not. "RAG" as a fixed
embed-retrieve-stuff chain is dissolving into (1) retrieval as an agent tool among
several, (2) index-time intelligence (contextual retrieval, graphs) making stores
smarter, (3) long context absorbing the small-corpus end, and (4) routing gluing it
together. The durable skills are search quality (chunking, hybrid, reranking) and
evaluation; those transfer to whatever orchestration fashion wins.
## Related pages
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b">Topic: rag-and-retrieval</mention-page>: the map of the whole retrieval stack (embeddings, the pipeline, this page, evaluation) and the corpus layer, where a curated domain index is what is being sold.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782"/>: the advanced-RAG rung in depth: chunking, contextual retrieval, BM25 plus dense search fused with reciprocal rank fusion, query transformation and cross-encoder reranking, the stages an agent calls as tools.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8165a5e7ca3deb4a468d"/>: how to measure whether a loop or a graph paid for itself: recall@k, nDCG, faithfulness and golden sets.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d816c889decc342a7ad39"/> (2020): where the term started: a dense retriever over Wikipedia trained jointly with a sequence-to-sequence generator.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7"/>: LangGraph and LlamaIndex implementations of these loops; <mention-page url="https://app.notion.com/p/3c65c17b0d0d81529358c996382224ac"/> covers the LangGraph side in depth.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>: the harness-side reading of memory timing and read-time curation.
## Best resources
- [Microsoft: LazyGraphRAG](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/) (12 min): GraphRAG quality at the indexing cost of plain vector retrieval-augmented generation (RAG).
- [Graph RAG in production, 2026 (Paperclipped)](https://www.paperclipped.de/en/blog/graph-rag-production/) (\~20 min): Microsoft GraphRAG vs LightRAG vs Graphiti with real cost numbers.
- [LightOn: RAG is dead, long live RAG](https://lighton.ai/lighton-blogs/rag-is-dead-long-live-rag-retrieval-in-the-age-of-agents) (\~12 min): retrieval in the age of agents, well argued.
- [Is agentic RAG worth it? (arXiv 2601.07711)](https://arxiv.org/html/2601.07711v2) (45 min): experimental comparison of pipeline vs agentic approaches.
- [Long context vs RAG: an evaluation and revisits (arXiv 2501.01880)](https://arxiv.org/pdf/2501.01880) (45 min): the most careful head-to-head study.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8"/> (45 min): the reason-act loop that agentic retrieval instantiates.
## Further reading
- [From Local to Global: a Graph RAG approach (arXiv 2404.16130)](https://arxiv.org/abs/2404.16130) (45 min): the Microsoft GraphRAG paper, with the map-reduce global search.
- [Self-RAG (arXiv 2310.11511)](https://arxiv.org/abs/2310.11511) (40 min) and [Adaptive-RAG (arXiv 2403.14403)](https://arxiv.org/abs/2403.14403) (30 min): the two early forms of conditional retrieval.
- [NoLiMa (arXiv 2502.05167)](https://arxiv.org/abs/2502.05167) (30 min): long-context evaluation without literal matches.
- [Lost in the Middle (arXiv 2307.03172)](https://arxiv.org/abs/2307.03172) (30 min): the position effect in long contexts.
- [Mem0 (arXiv 2504.19413)](https://arxiv.org/abs/2504.19413) (30 min) and [Zep (arXiv 2501.13956)](https://arxiv.org/abs/2501.13956) (30 min): an extracted-fact store and a temporal knowledge graph for agent memory.
</content>
</page>