# Agentic lab (t-agent): visual ideas, built and rejected

Question the tab keeps returning to: who should drive retrieval (a fixed pipeline, a fixed decomposition, or the model in a loop), and what does each cost in searches, tokens and seconds for what accuracy?

## Built

| Idea | What it shows | Why | Data |
|---|---|---|---|
| Trajectory replay, before/after on one question | The recorded thoughts, search queries, results (gold marked) and answers of one real question, step by step, under the single-shot pipeline, the agent loop and decomposition, for either generator; running counters (calls, searches, gold seen, tokens billed and prefilled, seconds) and a bar per generator call showing billed against computed prompt tokens | The brief's centrepiece: the same input under the method and the one it replaces, with the cost growing as you watch; nothing is regenerated in the page | run.py, make_data.py (replay picks in out/replay_picks.json) |
| Cost-accuracy chart of the strategies | One dot per strategy (F1, EM or gold paragraphs seen, against tokens, seconds or searches), hollow dots for the other generator joined by a dashed line | The tab's central trade-off in one picture, with model size as a second axis | summarize.py (out/strategies.json) |
| Full strategy table with CIs and paired wins/losses against top 5 | Every number behind the chart, by question type | Lets the reader check that a gap is larger than its bootstrap interval | summarize.py |
| Both-gold-in-top-k curves per retriever, predict-then-reveal | The first hop is found almost always, the second often is not | Motivates the loop with the set's own numbers | hops.py |
| Tokens per agent call | Prompt length at each call, newly prefilled tokens, running billed total; table by number of calls used; search-count histogram and failure kinds | The quadratic growth, and what a prompt cache saves | summarize.py (out/steps.json) |
| Long context table | Top 5 / top 10 / own 10 paragraphs / 8k-token window, with prompt tokens and seconds | Long context as the best case (gold always present) against retrieval | runs |
| Position-sensitivity chart, predict-then-reveal | F1 or EM with the gold block at 5 positions among the same 20 paragraphs, both generators | Lost in the middle reproduced (or not) on the local model, as the brief asks | position.py |
| Router table and token bars | Always pipeline, always agent, two routers, oracle; routing accuracy, F1 by question kind, searches, tokens, seconds | Measures what routing saves on a mixed set | router.py |
| GraphRAG small-scale panel | Indexing cost counters, local graph-hop retrieval against dense (top k switch, disagreeing examples), a global question answered by community map-reduce next to top-10 retrieval, community summaries | Indexing cost in tokens and time, one measured use, one qualitative use, labelled small-scale | graphrag.py |

## Rejected

| Idea | Why not |
|---|---|
| Animated agent "thinking" re-generated live in the page | The page has no network and no model; the replay of recorded runs is exact and reproducible |
| Full GraphRAG pipeline (graphrag 3.3.0 package) | Needs an OpenAI-compatible endpoint with JSON-mode extraction prompts written for large models; the 1.7B model at that scale (thousands of calls) is hours here, and the child page GraphRAG and structured retrieval owns the depth. A LightRAG-style one-call-per-paragraph extraction gives the indexing cost shape |
| Graph drawing of the entity graph | Hundreds of nodes give a hairball that teaches nothing; the community table and the measured local hop carry the content |
| Lost in the middle with one gold paragraph (Liu et al.'s setup) | Every HotpotQA question needs two paragraphs; the gold pair is moved as one block instead, said on the page |
| Long context at 32k tokens | About 25 s or more of prefill per question for the 1.7B model here (extrapolated from the measured 9.3 s at 7.6k); 200 questions would take hours for a point the 8k run already makes |
| Judge-based answer quality (LLM-as-judge) | HotpotQA has gold answers; EM and F1 with the official normalisation are deterministic. Judged metrics belong to the RAG evaluation page |
| Frontier-model runs | Mac, local only (no API keys); what transfers is said in words |
