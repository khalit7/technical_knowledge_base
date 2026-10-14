# GraphRAG and structured retrieval: visual ideas, built and rejected

Question the page keeps returning to: which questions need structure that a top-k of chunks cannot give, and what does building that structure (a graph, or a query against a table) cost against what it buys, measured on the running example?

## Built

| Idea | Where | What it shows | Why it earns its place | Data |
|---|---|---|---|---|
| Graph build animation, NLP against LLM extraction on the same paragraphs | Graph build lab | One question's 10 real paragraphs through extract, merge, prune, link, cluster, connect, with counters (names, distinct, shared, surviving, edges, communities, gold pair linked); toggle to the LLM extraction of the same paragraphs once it exists | The brief's "chunks to entities to edges to communities on real extractions"; the before/after is NLP vs LLM extraction on one input; shows where the graph does or does not connect the gold pair | s_nlp_extract, s_communities, s_examples (graphrag's own functions) |
| Community hierarchy explorer | Graph build lab | Level 0, 1, 2 communities of the pruned subset graph with top members and paragraph counts; click to descend | What GraphRAG summarises; exposes hubs that pruning leaves (month names) | build.json |
| Global map-reduce stepper | Graph build lab | Each community report's map step (best score, kept point), then the reduced answer beside a top-10 answer with calls and tokens | The global-search mechanism step by step on real outputs | pending: s_global.py |
| Before/after lab | own tab | Any of 200 questions, two retrievers side by side revealed rank by rank, gold marked, the linking sentence shown; filters for gains and losses | The brief's "plain retrieval vs graph traversal on the same question"; paired, so a reader can check wins are real | ppr_perq, s_examples |
| Both-gold-in-top-k curves, 7 systems, by question type | Reading 8 | Graph retrieval against BM25, dense, hybrid | The central multi-hop measurement in one picture | ppr.json |
| Entity resolution table and hand-label viewer | Reading 4 | Title recall, link recall, merges, ambiguity, precision of extra merges (30 hand labels per rule) | The precision/recall trade-off nobody shows with numbers | entities.json, merge_labels.json |
| Text-to-SQL lab, four prompt conditions animated | own tab | Same question with no schema, all 20 databases, 5 retrieved tables (gold green), own database; schema tokens to scale; the model's SQL and execution result once run; concert_singer as a Kùzu graph with Cypher | The brief's "with and without schema retrieval on the same questions" | sql_set, schema_ret, kuzu; pending sql_runs, cypher_runs |
| Schema-retrieval curve | Reading 10 | All gold tables in top k, BM25 vs bge-small, tokens per k | Shows lexical retrieval winning on schema, the reverse of passages | schema_ret.json |
| Cost calculator | own tab | Indexing calls and tokens from measured prompt overheads (graphrag 1,717, LightRAG derived), labelled assumptions, list prices, local hours; one global query against vector RAG | Turns "GraphRAG is expensive" into a formula with visible inputs; published anchors beside it (not reproduced, said) | prompt_tokens, lightrag_stub |
| Predict-then-reveal x2 | Reading 1 and 8 | Aggregates over more than 10 rows; agent recall vs dense recall | Belief elicitation on the two least intuitive results | sql_set, root strategies.json |
| Static knowledge-graph drawing | Reading 2 | The Kiss and Tell bridge chain | Defines entity, relation and bridge entity on the topic's own example | hand-drawn from two gold paragraphs |

## Rejected

| Idea | Why not |
|---|---|
| A force-directed drawing of the whole subset graph | 500 nodes and 2,539 edges is a hairball (the root's Agentic lab rejected the same); the per-question subgraph and the community cards carry the content |
| Running Microsoft's graphrag CLI end to end with the local model | Its standard extraction prompt (1,717 tokens) and JSON community reports at default lengths (2,000 words) are written for large hosted models; the page runs graphrag's own prompts and parsers through the root's generator module instead, on a 394-paragraph subset (pending), which isolates the same costs |
| LazyGraphRAG run | Not open source (graphrag 3.3.0 has only the NLP indexer); vendor claims are quoted and labelled |
| nano-graphrag run | Same shape as GraphRAG and LightRAG, unmaintained since 2024-10; its source is read instead |
| HippoRAG package run | Needs an OpenIE pass with a large LLM over the corpus; its PPR mechanism is reimplemented on the CPU (s_ppr.py) and its published tables quoted |
| Leiden vs Louvain animation | Louvain produced no disconnected community on either graph here, so an animation would show a failure that did not happen; the Leiden paper's numbers are quoted instead |
| LLM-judge win rates for the global answers | A 4 B judge on 5 questions would be noise; answers are shown side by side with their cost and breadth (paragraphs behind the points) |
| Spider exact-match metric | Execution accuracy is the standard now; exact match rejects correct rewrites |

## What the methodology lacked for this page
A rule for pages whose generator runs are queued behind other agents: here every generator-dependent number is a pending box with its command and estimated time, and build_data turns each into a result table when its data file appears, so the page is complete and honest at every stage.
