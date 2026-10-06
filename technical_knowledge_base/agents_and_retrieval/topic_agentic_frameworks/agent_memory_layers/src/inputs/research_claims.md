# Research notes: Agent memory layers (Mem0, Zep/Graphiti, Letta/MemGPT)
Collected 2026-10-06. No em-dashes. UNCONFIRMED marks anything not verified from a primary source.

## 5. Versions, stars, licences (read 2026-10-06)
Source: https://pypi.org/pypi/<pkg>/json (latest version + upload time of that version, UTC)
- mem0ai 2.2.1, uploaded 2026-09-25
- graphiti-core 0.30.2, uploaded 2026-09-08
- letta 0.34.4, uploaded 2026-10-04
- letta-client 1.12.1, uploaded 2026-06-02 (classifier Apache Software License)
- zep-cloud 3.30.0, uploaded 2026-09-24
- langmem 0.0.30, uploaded 2025-10-27 (MIT)
Source: https://api.github.com/repos/<owner>/<repo> (read 2026-10-06)
- mem0ai/mem0: 66,670 stars, Apache-2.0, last push 2026-10-06
- getzep/graphiti: 31,489 stars, Apache-2.0, last push 2026-10-06
- letta-ai/letta: 25,049 stars, Apache-2.0, last push 2026-09-10
- getzep/zep: 4,950 stars, Apache-2.0, not archived, last push 2026-10-04
- langchain-ai/langmem: 1,696 stars, MIT

## 1. Mem0 paper
Source: https://arxiv.org/abs/2504.19413 (submitted 28 Apr 2025), "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory", Chhikara et al. Read from https://arxiv.org/html/2504.19413
Pipeline (Sec 2.1):
- Extraction input = new message pair (m_{t-1}, m_t) + conversation summary S (refreshed by an async summary module) + last m messages. "we configured the system with 'm' = 10 previous messages for contextual reference and 's' = 10 similar memories for comparative analysis. All language model operations utilized GPT-4o-mini as the inference engine."
- Update phase: per candidate fact, retrieve top s similar memories by vector embedding, LLM chooses via tool call: "ADD for creation of new memories when no semantically equivalent memory exists; UPDATE for augmentation of existing memories with complementary information; DELETE for removal of memories contradicted by new information; and NOOP when the candidate fact requires no modification".
Mem0g (graph variant, Sec 2.2): directed labeled graph, nodes = entities with type, embedding, creation timestamp; edges = relation triplets (source, relation, destination). Two-stage extraction: entity extractor then relationship generator. Node matching by embedding similarity above threshold. Conflict detection; "An LLM-based update resolver determines if certain relationships should be obsolete, marking them as invalid rather than physically removing them to enable temporal reasoning." Retrieval: entity-centric (anchor nodes + incoming/outgoing edges subgraph) plus semantic triplet matching. Neo4j; GPT-4o-mini with function calling.
Baselines setup: LangMem/Zep/etc with gpt-4o-mini, text-embedding-3-small ("text-embedding-small-3" as written). Judge J: 10 runs, mean +- 1 sd. Categories used: single-hop, multi-hop, open-domain, temporal (adversarial category not reported in the tables).
Table 1 (LOCOMO, J per category: single-hop / multi-hop / open-domain / temporal):
- A-Mem* (their re-run): 39.79 / 18.85 / 54.05 / 49.91
- LangMem: 62.23 / 47.92 / 71.12 / 23.43
- Zep: 61.70 / 41.35 / 76.60 / 49.31
- OpenAI: 63.79 / 42.92 / 62.29 / 21.71
- Mem0: 67.13 / 51.15 / 72.93 / 55.51
- Mem0g: 65.71 / 47.19 / 75.71 / 58.13
Table 2 (overall J; memory tokens; search p50/p95 s; total p50/p95 s):
- Full-context: J 72.90; 26,031 tokens; total 9.870 / 17.117
- Best RAG: k=2, chunk 256: J 60.97 (total 0.802 / 1.907); k=2, 8192: 60.53
- A-Mem: 48.38; 2,520 tok; search 0.668/1.485; total 1.410/4.374
- LangMem: 58.10; 127 tok; search 17.99/59.82; total 18.53/60.40
- Zep: 65.99; 3,911 tok; search 0.513/0.778; total 1.292/2.926
- OpenAI: 52.90; 4,437 tok; total 0.466/0.889
- Mem0: 66.88; 1,764 tok; search 0.148/0.200; total 0.708/1.440
- Mem0g: 68.44; 3,616 tok; search 0.476/0.657; total 1.091/2.590
Abstract quote: "Mem0 attains a 91% lower p95 latency and saves more than 90% token cost". Sec 4: "Mem0 reaches 67% ... [Mem0g] reaches over 68%"; full-context "approximately 73%".
Memory footprint claim (Sec 4.4): Mem0 ~7k tokens per conversation, Mem0g ~14k, "Zep's memory graph consumes in excess of 600k tokens"; raw conversation ~26k. Also claims Zep retrieval right after ingestion often failed, better "after a delay of several hours".
Note: the Mem0 numbers on 'Overall J' in Table 2 (66.88) differ slightly from Table 1 single-hop J 67.13; the 67% / 68% headline numbers are Table 2 overall.

## 2. Zep paper
Source: https://arxiv.org/abs/2501.13956 (submitted 20 Jan 2025), "Zep: A Temporal Knowledge Graph Architecture for Agent Memory", Rasmussen et al. Read from https://arxiv.org/html/2501.13956
- Graph G = (N, E, phi) with "three hierarchical tiers of subgraphs: an episode subgraph, a semantic entity subgraph, and a community subgraph." Episodes = raw messages/text/JSON, "a non-lossy data store"; entity nodes + semantic edges (facts); communities = clusters of entities with summaries, built with label propagation (not Leiden) with a dynamic one-step extension and periodic refreshes.
- Bi-temporal (Sec 2.2.3): "the system tracks four timestamps: t'_created and t'_expired [in T', transactional timeline] monitor when facts are created or invalidated in the system, while t_valid and t_invalid [in T, event timeline] track the temporal range during which facts held true." (symbol names from the paper; HTML rendering drops the math, names confirmed by the paper's notation T and T'.) Contradiction: LLM compares new edge with semantically related edges; "it invalidates the affected edges by setting their t_invalid to the t_valid of the invalidating edge ... Graphiti consistently prioritizes new information". Prompt fields in appendix: valid_at, invalid_at.
- Retrieval: three search functions: "cosine semantic similarity search, Okapi BM25 full-text search, and breadth-first search" (first two via Neo4j's Lucene). Fields searched: edge fact, entity name, community name. Rerankers: RRF, MMR, "episode-mentions reranker", "node distance reranker" (distance from a centroid node), cross-encoders ("highest computational cost").
- DMR (Table 1; DMR = 500 conversations, 5 sessions, up to 12 messages each, from Multi-Session Chat): Recursive summarization gpt-4-turbo 35.3%; Conversation summaries gpt-4-turbo 78.6%; MemGPT gpt-4-turbo 93.4%; Full-conversation gpt-4-turbo 94.4%; Zep gpt-4-turbo 94.8%; Conversation summaries gpt-4o-mini 88.0%; Full-conversation gpt-4o-mini 98.0%; Zep gpt-4o-mini 98.2%. Zep itself says: "each conversation contains only 60 messages, easily fitting within current LLM context windows" and criticises DMR (single-turn fact questions, ambiguous phrasing).
- LongMemEval_S (Table 2; ~115k tokens per conversation; judge GPT-4o; experiments Dec 2024 to Jan 2025; Zep in AWS us-west-2 from a laptop in Boston):
  - Full-context gpt-4o-mini 55.4%, latency 31.3 s (IQR 8.76), 115k tokens
  - Zep gpt-4o-mini 63.8%, 3.20 s (IQR 1.31), 1.6k tokens
  - Full-context gpt-4o 60.2%, 28.9 s (IQR 6.01), 115k
  - Zep gpt-4o 71.2%, 2.58 s (IQR 0.684), 1.6k
  - "Using gpt-4o-mini, Zep achieved a 15.2% accuracy improvement over the baseline, while gpt-4o showed an 18.5% improvement"; "reducing response times by approximately 90%".
- Table 3 per type (full-context -> Zep):
  gpt-4o-mini: single-session-preference 30.0 -> 53.3; single-session-assistant 81.8 -> 75.0 (a drop, delta 9.06%); temporal-reasoning 36.5 -> 54.1; multi-session 40.6 -> 47.4; knowledge-update 76.9 -> 74.4 (drop, 3.36%); single-session-user 81.4 -> 92.9.
  gpt-4o: single-session-preference 20.0 -> 56.7 (+184%); single-session-assistant 94.6 -> 80.4 (drop 17.7%); temporal-reasoning 45.1 -> 62.4; multi-session 44.3 -> 57.9; knowledge-update 78.2 -> 83.3; single-session-user 81.4 -> 92.9.
- MemGPT on LongMemEval: "we were unable to achieve successful question responses using this approach" (loaded into archival memory).

## 4a. LongMemEval
Source: https://arxiv.org/abs/2410.10813 (v1 14 Oct 2024; ICLR 2025), Wu et al., "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory". Read from https://arxiv.org/html/2410.10813
- "LongMemEval consists of 500 manually created questions to test five core memory abilities: information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention."
- Seven question types. Counts (verified by counting the released file https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_oracle.json on 2026-10-06): temporal-reasoning 133, multi-session 133, knowledge-update 78, single-session-user 70, single-session-assistant 56, single-session-preference 30 (total 500); 30 of these are abstention ("_abs") variants: "we draw 30 questions from the previous question types and modify them into 'false premise' questions".
- Sizes: "LongMemEval_S (115k tokens/question) and LongMemEval_M (500 sessions, 1.5M tokens)". README (https://github.com/xiaowu0162/LongMemEval): S is "roughly ... 115k tokens (~40 history sessions) for Llama 3"; paper text also says "LongMemEval_S is still short (50 sessions)". README note [2025/09]: a cleaned version was released (longmemeval-cleaned on Hugging Face).
- Judge: gpt-4o-2024-08-06, "more than 97% agreement with human experts".
- Commercial systems (97 questions, 3-6 session histories, Aug 2024): "ChatGPT and Coze instantiated with GPT-4o exhibits 37% and 64% performance drop, respectively" versus offline reading.
- Long-context LLMs (Fig 3b, Oracle vs S, no CoN): GPT-4o 0.870 -> 0.606 (30.3% drop); Llama 3.1 70B 0.744 -> 0.334 (55.1%); Llama 3.1 8B 0.710 -> 0.454 (36.1%); Phi-3 14B 0.702 -> 0.380 (45.9%); Phi-3.5 Mini 0.660 -> 0.342 (48.1%). With CoN: GPT-4o 0.924 -> 0.640 (30.7%). Text: "these LLMs showed a 30% to 60% performance decline".
- Design findings: "round is the more optimal granularity" (vs session); fact compression hurts overall but helps multi-session reasoning; key expansion with user facts: "9.4% higher recall@k ... 5.4% higher accuracy"; time-aware query expansion "improving the memory recall for temporal reasoning by 6.8%~11.3% when a strong LLM is employed" (11.3% with rounds as value, 6.8% with sessions). Reading: JSON format + Chain-of-Note; bad reading strategy costs up to 10 points even with perfect retrieval. Retriever Stella V5 1.5B; indexing LLM Llama 3.1 8B.

## 4b. LOCOMO
Source: https://arxiv.org/abs/2402.17753 (submitted 27 Feb 2024; ACL 2024), Maharana et al., "Evaluating Very Long-Term Conversational Memory of LLM Agents".
- "LoCoMo, a datset of 50 high-quality very long conversations, each encompassing 300 turns and 9K tokens on avg., over up to 35 sessions". Generated by LLM agents grounded on personas and temporal event graphs, then human-edited; multimodal (image sharing).
- Five QA categories: single-hop, multi-hop, temporal reasoning, open-domain knowledge, adversarial ("designed to trick the agent ... the expectation that the agent will correctly identify them as unanswerable").
- Findings: long-context LLMs and RAG lag humans "by 56%", temporal "by 73%"; gpt-3.5-turbo-16k adversarial accuracy "drops to a mere 2.1%".
- Note: Mem0 paper says full-context baseline ingests ~26,000 tokens per conversation (Table 2: 26,031), much more than the paper's "9K tokens on avg."; the publicly released set is 10 conversations (see section 3).
- Released data: https://github.com/snap-research/locomo data/locomo10.json (README: "This release is a subset of the conversations released previously with our first Arxiv version in March 2024. The initial release contained 50 conversations. We sampled a subset of the data to retain the longest conversations with high-quality annotations"). Counted 2026-10-06 from the file: 10 conversations, 19 to 32 sessions each, 369 to 689 turns (mean 588), mean ~13.4k words per conversation (consistent with Mem0's ~26k tokens incl. formatting/timestamps; token count itself not verified). 1,986 QA: category 4 = 841, 5 = 446, 2 = 321, 1 = 282, 3 = 96. Category 5 = adversarial (446, which Mem0/Zep/Letta evaluations drop). Mapping of numbers 1-4 to names is not documented in the README; commonly used mapping (1 multi-hop, 2 temporal, 3 open-domain, 4 single-hop) UNCONFIRMED from a primary source. Questions evaluated excluding category 5: 1,540.

## 8a. MemGPT paper
Source: https://arxiv.org/abs/2310.08560 (v1 12 Oct 2023), Packer et al., "MemGPT: Towards LLMs as Operating Systems". Read from https://arxiv.org/html/2310.08560
- Main context (prompt) = system instructions + working context + FIFO queue; external context = archival storage and recall storage. "MemGPT uses functions to move data between main context and external context".
- Eviction: "When the prompt tokens exceed the 'warning token count' ... (e.g. 70% of the context window), the queue manager inserts a system message ... (a 'memory pressure' warning)"; at "'flush token count' (e.g. 100% of the context window)" it evicts messages "(e.g. 50% of the context window), generates a new recursive summary"; evicted messages "are stored indefinitely in recall storage".
- DMR (MSC-based, 5 sessions, ~a dozen messages each), accuracy (ROUGE-L): GPT-3.5 Turbo 38.7% (0.394) vs MemGPT 66.9% (0.629); GPT-4 32.1% (0.296) vs MemGPT 92.5% (0.814); GPT-4 Turbo 35.3% (0.359) vs MemGPT 93.4% (0.827). Baselines are fixed-context with recursive summary.
- Nested KV: 140 UUID pairs (~8k tokens), nesting 0 to 4, 30 orderings. "GPT-3.5 ... hitting 0 percent accuracy at 1 nesting level"; GPT-4 and GPT-4 Turbo "hit 0 percent accuracy by 3 nesting levels"; "MemGPT with GPT-4 on the other hand is unaffected with the number of nesting levels". MemGPT with GPT-4 Turbo and GPT-3.5 "begin to drop off in performance at 2 nesting levels".
- Models: GPT-4 = gpt-4-0613, GPT-4 Turbo = gpt-4-1106-preview, GPT-3.5 Turbo = gpt-3.5-turbo-1106.

## 3. The LOCOMO dispute
### Zep response to Mem0
Source: https://www.getzep.com/blog/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/ (old URL blog.getzep.com redirects here). Byline "Daniel Chalef, Preston Rasmussen May 06, 2025 ... Updated Jun 03, 2026". Title "Lies, Damn Lies, & Statistics: Is Mem0 Really SOTA in Agent Memory?"
- Correction banner: "In an earlier version of this article, we erred in how we calculated Zep's LoCoMo score. We've updated the article to reflect Zep's corrected result is 75.14% +/- 0.17, with Zep outperforming Mem0 by 10%." The page's subtitle still says "Zep outperforms it by 24%" (left over from the earlier version; the earlier uncorrected score itself is not shown on the page; a figure of ~84% is widely cited for the first version: UNCONFIRMED from a primary source).
- "Our evaluation shows Zep achieving an 75.14% +/- 0.17 J score, significantly outperforming Mem0's best configuration (Mem0 Graph) by approximately 10% relative improvement. This starkly contrasts with the 65.99% score reported for Zep in the Mem0 paper".
- Configuration errors alleged: (1) "Incorrect User Model: Mem0 utilized a user graph structure designed for single user-assistant interactions but assigned the user role to both participants"; (2) "Improper Timestamp Handling: Timestamps were passed by appending them to messages, rather than using Zep's dedicated created_at field"; (3) "Sequential vs. Parallel Searches ... artificially inflating Zep's reported search latency".
- Latency: "p95 search latency of 0.632 seconds" vs "0.778 seconds reported by Mem0 for Zep" and Mem0 graph 0.657 s.
- LOCOMO critique: conversations "average around 16,000-26,000 tokens ... easily within the context window"; full-context ~73% beats Mem0's best ~68%; no knowledge-update questions; "Category 5 was unusable due to missing ground truth answers, forcing both Mem0 and Zep to exclude it"; multimodal errors (BLIP image captions); incorrect speaker attribution; underspecified questions (camping in both July and August).
- Banner at top (text as printed, with an obvious year typo): "December 9, 2015: We've published new LoCoMo scores for Zep: 80% at <200ms latency." linking to https://www.getzep.com/blog/the-retrieval-tradeoff-what-50-experiments-taught-us-about-context-engineering/ (presumably 9 Dec 2025).
- Verified in data (locomo10.json, 2026-10-06): 444 of 446 category-5 questions have no "answer" field, only "adversarial_answer", consistent with the "missing ground truth" complaint (the intended correct behaviour is to say the question is unanswerable).

### Zep follow-up, 9 Dec 2025
Source: https://www.getzep.com/blog/the-retrieval-tradeoff-what-50-experiments-taught-us-about-context-engineering/ (published 9 Dec 2025, modified 3 Jun 2026, Daniel Chalef). Read via WebFetch summary 2026-10-06.
- "gpt-4o-mini for both the agent and grader". LoCoMo accuracy by (edges/nodes retrieved): 5/2 69.62% (p50 retrieval 149 ms); 10/2 73.72% (161 ms); 15/5 default 77.06% (199 ms); 20/20 80.06% (241 ms); 30/30 80.32% (189 ms). Context 347 to 1,997 tokens. Diminishing returns: 5/2 -> 20/20 "+10.4 percentage points" at "roughly 4x the tokens". "modern LLMs filter irrelevant context well but can't infer facts that aren't there".

### Letta filesystem
Source: https://www.letta.com/blog/benchmarking-ai-agent-memory/ (12 Aug 2025, Letta). Read via WebFetch summary 2026-10-06.
- "74.0% accuracy on LoCoMo" with gpt-4o-mini, conversation history stored as files; tools "grep", "search_files", "open", "close", "answer_question". Compared with Mem0's reported "68.5% score for their top-performing graph variant" (note Mem0 paper Table 2 says 68.44). Says Mem0 "did not respond" to requests to clarify how its benchmark numbers were computed. Conclusion: "It's much more important to consider whether an agent will be able to effectively use a retrieval tool ... rather than focusing on the exact retrieval mechanisms". Points to the Letta Memory Benchmark / leaderboard for agentic memory.

### Mem0 reply (GitHub issue)
Source: https://github.com/getzep/zep-papers/issues/5 "Revisiting Zep's 84% LoCoMo Claim: Corrected Evaluation & 58.44% Accuracy", opened 8 May 2025 by deshraj (Mem0 co-founder and CTO, per the issue text); closed 19 May 2025.
- So Zep's first blog version claimed 84% (confirmed via this issue; earlier "UNCONFIRMED" for 84% is now confirmed as Mem0's description of it and Zep's acknowledgement of an error).
- Mem0: Zep's calculation "used a denominator that excluded Category 5 questions while including Category 5 correct answers in the numerator"; "Zep achieves 58.44 % accuracy,not the 84 % reported" (Mem0's replication under Mem0's prompt/template); also alleges prompt and retrieval-template changes and single run.
- Zep reply, 12 May 2025 (danielchalef): "Thanks for pointing out the error in our calculation of Zep's LoCoMo score. The corrected score is 75.14% +/- 0.17 (over 10 runs)"; "We stand by our critique"; defends its prompt change ("timestamps mark when events occurred, not when they were mentioned"); "We performed 10 independent runs for Zep, not just one".
- Timeline: Mem0 paper 28 Apr 2025 (Zep 65.99) -> Zep blog 6 May 2025 (84%) -> Mem0 issue 8 May 2025 (58.44%) -> Zep correction 12 May 2025 (75.14 +- 0.17) -> Letta filesystem 12 Aug 2025 (74.0%) -> Zep 9 Dec 2025 (up to 80.32%, gpt-4o-mini judge).

## 6. Mem0 current open-source code (mem0ai 2.2.1, sdist from PyPI, read 2026-10-06)
Source: https://pypi.org/project/mem0ai/2.2.1/ (sdist mem0ai-2.2.1.tar.gz), files mem0/configs/base.py, mem0/memory/main.py, mem0/memory/storage.py, mem0/llms/openai.py, mem0/embeddings/openai.py
- MemoryItem fields: id, memory, hash, metadata, score, created_at, updated_at. Scoping ids user_id / agent_id / run_id passed to add() (stored in payload/metadata); search()/get_all() take filters={"user_id": ...} and reject top-level ids in 2.x.
- History DB default: os.path.join(mem0_dir, "history.db") with mem0_dir = $MEM0_DIR or ~/.mem0. SQLite table history(id, memory_id, old_memory, new_memory, event, created_at, updated_at, is_deleted, actor_id, role).
- Defaults: OpenAI LLM default model "gpt-5-mini" (mem0/llms/openai.py); OpenAI embedder default "text-embedding-3-small"; LLM reranker default "gpt-5-mini". (So gpt-4.1-nano is NOT the current default in 2.2.1; it may have been in 1.x: UNCONFIRMED.)
- add(messages, user_id, agent_id, run_id, metadata, timestamp, expiration_date, infer=True, memory_type, prompt). Docstring: "infer (bool, optional): If True (default), an LLM is used to extract key facts from 'messages' and decide whether to add, update, or delete related memories. If False, 'messages' are added as raw memories directly." memory_type "procedural_memory" supported (agent_id). timestamp is "Platform-only temporal parameter. Not supported in OSS."
- IMPORTANT, current 2.x pipeline differs from the paper: the infer path is "Phase 2: LLM extraction (single call)" with ADDITIVE_EXTRACTION_PROMPT, seeing the top_k=10 existing memories (UUIDs mapped to integers "anti-hallucination") and last messages; extracted memories are embedded, deduplicated by MD5 hash, stored with a BM25 lemmatized text field, and every stored record is reported with event "ADD". UPDATE and DELETE events in 2.2.1 come only from explicit update()/delete() calls in this code. In other words, the paper's per-fact ADD/UPDATE/DELETE/NOOP tool-call loop is not what the 2.2.1 OSS add() does (the docstring still says add/update/delete).
- No graph_store field in MemoryConfig in 2.2.1 (grep for "graph" finds only a kuzu error example and Neptune Analytics as a vector store). Graph memory in OSS appears removed or moved in 2.x: see docs check below.

### Mem0 v2.0.0 redesign (16 Apr 2026)
Source: https://github.com/mem0ai/mem0/releases/tag/v2.0.0 (published 2026-04-16). Quotes:
- "A ground-up redesign of how memories are extracted, stored, and retrieved"
- "New extraction algorithm: single-pass, ADD-only, roughly half the latency"; "One LLM call per add(). No separate UPDATE/DELETE pass. ... agent-generated facts ('I've booked your flight for March 3rd') are captured as first-class memories for the first time. Hash-based deduplication prevents exact duplicates; ranking at retrieval time handles the rest."
- "Multi-signal hybrid retrieval: semantic + BM25 keyword + entity matching fused into one score"
- "Entity linking (replaces graph memory) ... stored in a parallel {collection}_entities collection inside your existing vector store ... No Neo4j, Memgraph, Kuzu, or Apache AGE deployment needed: ~4,000 lines of graph driver code have been removed from the SDK." (dash replaced)
- "custom_fact_extraction_prompt -> renamed to custom_instructions (consolidates with custom_update_memory_prompt, which was deprecated)"
- CLI release cli-v0.2.4 (2026-04-22): "Graph memory is now a project-level setting on the Platform"; add/search/list moved to v3 API endpoints (POST /v3/memories/add/ etc).
- Same day: Node SDK ts-v3.0.0.
- Reranker default changed to gpt-5-mini (was gpt-4o-mini) in v2.0.15 (2026-08-01).
Consequence for the page: the paper's ADD/UPDATE/DELETE/NOOP update phase and Mem0g (Neo4j graph) describe the 2025 paper system and Mem0 1.x; the current OSS (2.x, since Apr 2026) is ADD-only extraction + hybrid retrieval + entity linking, graph memory is a Platform setting.

### Mem0 docs (read 2026-10-06; no page dates shown)
Source: https://docs.mem0.ai/core-concepts/how-it-works (docs.mem0.ai/core-concepts/memory-types serves the same content)
- "The automatic extraction path is additive. If a user says, 'I moved from Austin to Seattle,' Mem0 can store the new fact without silently rewriting the old one. Use explicit update or delete operations when your application needs to correct or remove a memory."
- Scoping: "Scope memory by user_id, agent_id, run_id, and metadata"; "Always scope searches with filters such as user_id, agent_id, or run_id." Platform: "Organize Platform memories by user, agent, app, and run." infer=False stores raw content.
- No "layers (conversation, user, organisation) with promotion between layers" concept appears in the paper or the current docs. The paper has no such layering; the docs talk about scoping by ids (user / agent / app / run) only. Verdict: the old page's claim is NOT supported (treat as UNCONFIRMED/incorrect).
Source: https://docs.mem0.ai/core-concepts/memory-evaluation
- Pipeline (current): async store; context lookup; "Single-pass LLM extraction produces ADD-only facts"; hash dedup + embed; "Graph Memory (Entity Linking)"; separate temporal reasoning pass that tags each memory with when it occurred, ongoing/completed, precision, and memory type "(event, state, plan, preference, relationship, absence)".
- Storage layers: Vector DB (text, embeddings, metadata: timestamps, hash, categories, attributed_to); Graph/Entity store (entities + embeddings + linked memory IDs); SQL DB ("History log (ADD events) + rolling message window").
- "The key architectural decision is ADD-only extraction. New facts are stored alongside old ones. Nothing is overwritten or deleted."
- Retrieval: semantic + BM25 (with verb lemmatization) + entity boost + temporal score, "fused via rank scoring".
- Vendor-reported scores (managed platform, "single-pass retrieval setup ... at a top_200 retrieval budget"; judge and answer model not stated on this page): LoCoMo 92.5 overall (single-hop 91.2, multi-hop 91.3, open-domain 72.7, temporal 92.0; mean 6,956 tokens); LongMemEval 94.4 (SSU 98.6, SSA 98.2, SSP 96.7, KU 93.6, TR 97.0, MS 88.0; 6,787 tokens); BEAM 1M 64.1, BEAM 10M 48.6. "Scores reflect Mem0's managed platform, which includes proprietary optimizations not available in the open-source SDK." Also notes knowledge update "remains the hardest category for an additive, ADD-only architecture".
Source: https://github.com/mem0ai/mem0 README (main, read 2026-10-06), section "New Memory Algorithm (April 2026)":
- Table Old -> New, tokens, latency p50: LoCoMo 71.4 -> 92.5 (7.0K, 0.88 s); LongMemEval 67.8 -> 94.4 (6.8K, 1.09 s); BEAM 1M 64.1 (6.7K, 1.00 s); BEAM 10M 48.6 (6.9K, 1.05 s). "Single-pass retrieval (one call, no agentic loops) at a top_200 retrieval budget." Same managed-platform caveat. Note the "Old" LoCoMo 71.4 is not the paper's 66.88/68.44 (different setup; not explained).
- "What changed: Single-pass ADD-only extraction -- one LLM call, no UPDATE/DELETE. Memories accumulate; nothing is overwritten."
- Feature list still says: "Multi-Level Memory: Seamlessly retains User, Session, and Agent state with adaptive personalization". This is the closest real Mem0 concept to "layers"; there is no promotion between levels anywhere.
- Evaluation framework: https://github.com/mem0ai/memory-benchmarks; paper link https://mem0.ai/research.

### Mem0 Platform pricing
Source: https://mem0.ai/pricing (read 2026-10-06 via WebFetch summary)
- Hobby: Free; 10,000 add requests/month; 1,000 retrieval requests/month; 1 project.
- Starter: $19/month; 50,000 add; 5,000 retrieval; 1 project.
- Pro: $249/month; 500,000 add; 50,000 retrieval; unlimited projects; "Graph memory (entity linking)", "Dream (Memory Consolidation)", advanced analytics, private Slack support.
- Enterprise: custom; unlimited; SLA, on-prem deployment, audit logs, SSO.
- So graph memory is a Pro-tier Platform feature as of 2026-10-06.

## 7. Zep current state
### Community Edition
Source: https://blog.getzep.com/announcing-a-new-direction-for-zeps-open-source-strategy/ (now on www.getzep.com/blog/...; published Apr 02, 2025, updated Jun 03, 2026): "we've decided to stop maintaining and releasing Zep Community Edition. The existing repository will remain open under the Apache 2.0 license, but we will no longer provide updates or active support." Open-source focus moves to Graphiti.
Source: https://github.com/getzep/zep README (read 2026-10-06): "Zep Community Edition is no longer supported. Its code has been moved to the legacy/ folder."
### Graphiti README
Source: https://github.com/getzep/graphiti README (main, read 2026-10-06)
- Now framed as "context graph": "each fact in a context graph has a validity window: when it became true, and when (if ever) it was superseded"; components Entities (nodes, evolving summaries), Facts/Relationships (edges, triplets "with temporal validity windows"), Episodes (provenance, "Every derived fact traces back here"), Custom Types (Pydantic ontology). "old facts are invalidated, not deleted" (dash replaced). Comparison table: "Explicit bi-temporal tracking with automatic fact invalidation".
- Requirements: "Python 3.10 or higher"; "Neo4j 5.26 / FalkorDB 1.1.2 / Amazon Neptune Database Cluster or Neptune Analytics Graph + Amazon OpenSearch Serverless collection (serves as the full text search backend) / Kuzu 0.11.2 (deprecated ...)". "Kuzu is deprecated and will be removed in a future release: the upstream Kuzu project is no longer maintained." FalkorDB Lite embedded option (Python 3.12+).
- "Graphiti defaults to OpenAI for LLM inference and embedding"; "Graphiti works best with LLM services that support Structured Output (such as OpenAI, Anthropic, and Gemini)." Also Anthropic, Gemini, Groq extras, Azure OpenAI; OpenAI-compatible endpoints (DeepSeek, Together, OpenRouter, Ollama, vLLM, llama.cpp, LM Studio). Ingestion concurrency SEMAPHORE_LIMIT default 10.
- Zep (commercial) runs on a proprietary "Context Graph Engine", not a third-party graph DB; "sub-200ms performance at scale"; SDKs Python, TypeScript, Go.
- MCP server in mcp_server/: "Episode management (add, retrieve, delete); Entity management and relationship handling; Semantic and hybrid search capabilities; Group management; Graph maintenance operations"; Docker with Neo4j.
### Zep Cloud pricing
Source: https://www.getzep.com/pricing/ (read 2026-10-06 via WebFetch summary)
- Credit: "1 credit per Episode up to 350 bytes; +1 credit per additional 350 bytes (or part)".
- Free: 10,000 credits/month, 2 projects, 1 Memory MCP Server seat, no rollover.
- Flex: $125/month, 50,000 credits; overage "$25 / 10,000 credits"; 600 requests/min; 5 projects.
- Flex Plus: $375/month, 200,000 credits; overage "$75 / 40,000 credits"; 1,000 requests/min; 10 projects.
- Enterprise: custom.

## 8b. Letta current docs (read 2026-10-06; docs pages have no dates)
Source: https://docs.letta.com/llms.txt
- Letta now centres on "The Letta Harness (formerly Letta Code) ... It provides a git-versioned memory filesystem (MemFS), multi-conversation memory, skills, schedules, and sleep-time subagents for reflection and memory organization." "Letta agents learn by actively managing their own context ... rather than by updating model weights." Context Constitution: https://github.com/letta-ai/context-constitution
Source: https://docs.letta.com/agent-sdk/memory/index.md
- Memory set at creation as objects with label and value: "Each entry becomes a Markdown file in the agent's memory repository, named from its label". "Files under system/ are in the system prompt every turn. Everything else stays out of context: the agent sees the file tree and reads what it needs." (No "limit" field shown in this current SDK page.)
- Dreaming: "uses background subagents to review recent conversations, consolidate lessons, and update memory without interrupting active work"; config trigger "off" | "step-count" | "compaction-event", behavior "reminder" | "auto-launch", stepCount (example 25).
Source: https://docs.letta.com/concepts/memfs/index.md
- "MemFS is how a Letta agent works with its long-term memory ... held in a git repository that belongs to the agent"; "MemFS is also called a context repository" (https://www.letta.com/blog/context-repositories). "All Letta agents use MemFS."
- "Files at the memory root are loaded into the agent's system prompt on every turn ... Older agents use a system/ directory instead." "Directories with their own MEMORY.md index stay out of context until they are needed."
- "MemFS does not include a semantic or vector index by default. Agents find memory in its Markdown files with normal file-search and read tools." Optional memfs-search mod (keyword; semantic/hybrid via QMD).
- "Conversation-history search is separate from MemFS. On Letta Cloud, letta messages search supports full-text, vector, and hybrid search over messages; local backends ... full-text matching only." (This is the descendant of recall memory.)
- "Every memory edit is committed to the MemFS git repository." Dreaming and memory doctor subagents use git worktrees.

### Letta repository and packaging changes (important)
Source: https://github.com/letta-ai/letta README (main, read 2026-10-06): "Letta (f.k.a. MemGPT) is actively developed. The current source code lives in letta-ai/letta-code, which includes the agent harness, interactive terminal UI, App Server, channels, and the runtime used by the desktop and web apps." "The archive branch contains the retired Letta V1 API server. Existing tags and releases remain available for reproducibility".
- Commit "chore: archive the legacy server repository (#3430)" dated 2026-08-16 (GitHub API commits on README.md). Earlier: "docs: update README to Letta Agent SDK, add AGENTS.md deprecation notice (#3393)" 2026-07-03.
- So the 25,049 stars on letta-ai/letta belong to a repo that now holds only a README pointer. letta-ai/letta-code: 3,529 stars, Apache-2.0, created 2025-10-25 (GitHub API 2026-10-06).
- PyPI "letta" 0.34.4 (2026-10-04) summary "Letta Code: stateful agents in your terminal", binary wheels only. npm @letta-ai/letta-code 0.34.4 published 2026-10-04.
- Pricing (https://docs.letta.com/pricing/index.md, read 2026-10-06): Free $0 (BYOK, "limited to 3 stateful agents"); Pro $20/month (Letta Auto quotas, remote sandboxes); Teams Pro $20/seat/month; API Plan $20/month: "Unlimited agents", "$0.10 / active agent / mo", "$0.00015 / sec tool execution", pay-as-you-go LLM usage via credits.

### Classic Letta (V1 server, archived) memory model
Source: https://github.com/letta-ai/letta/tree/archive files letta/schemas/block.py and letta/constants.py (read 2026-10-06)
- Block fields: value ("Value of the block."), limit ("Character limit of the block.", default CORE_MEMORY_BLOCK_CHAR_LIMIT), label ("e.g. 'human', 'persona'"), description, read_only, hidden.
- Constants: CORE_MEMORY_PERSONA_CHAR_LIMIT 20000, CORE_MEMORY_HUMAN_CHAR_LIMIT 20000, CORE_MEMORY_BLOCK_CHAR_LIMIT 100000 (final archived values; older releases used smaller defaults such as 5000: UNCONFIRMED).
- Tools: BASE_TOOLS = send_message, conversation_search, archival_memory_insert, archival_memory_search (archival_* listed as DEPRECATED_LETTA_TOOLS at archive time); memory tools core_memory_append, core_memory_replace, memory, memory_apply_patch; V2 memory_replace, memory_insert; sleep-time agent tools memory_replace, memory_insert, memory_rethink; sleep-time chat agent tools send_message, conversation_search, archival_memory_search.
- Mapping to MemGPT paper: core memory blocks = working context in the prompt; recall memory = searchable message history (conversation_search); archival memory = vector store (archival_memory_*).

### Rename and sleep-time
- Source: https://www.letta.com/blog/memgpt-and-letta/ ("COMPANY, SEP 23, 2024", "MemGPT Is Now Part of Letta"): "MemGPT should refer to the original agent design pattern described in the research paper (empowering LLMs with self-editing memory tools)", and Letta is the company/framework name. Same day: https://www.letta.com/blog/announcing-letta/ (seed round led by Felicis, $10M per secondary sources: UNCONFIRMED from primary here).
- Source: https://arxiv.org/abs/2504.13171 (submitted 17 Apr 2025), "Sleep-time Compute: Beyond Inference Scaling at Test-time" (Lin, Snell, Wang, Packer, Wooders, Stoica, Gonzalez). Abstract: reduces test-time compute "by ~5x on Stateful GSM-Symbolic and Stateful AIME" and "by scaling sleep-time compute we can further increase accuracy by up to 13% on Stateful GSM-Symbolic and 18% on Stateful AIME"; amortising across related queries cuts average cost per query by 2.5x. Blog: https://www.letta.com/blog/sleep-time-compute/. Sleep-time agents shipped in Letta 0.7.0 (per secondary sources; UNCONFIRMED from release notes). Current docs call the feature "dreaming" (configured via /sleeptime in the CLI).

## 9. Hosted reference points
### Anthropic memory tool
Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool (read 2026-10-06; no page date; tool version string dates it to 2025-08-18)
- Tool entry: {"type": "memory_20250818", "name": "memory"}. "The memory tool operates client-side: Claude requests file operations, and your application executes them." Files under "/memories" ("a prefix that your handler maps onto real storage").
- Commands: view (with optional view_range), create, str_replace, insert, delete, rename.
- "The memory tool is available on all Claude 4 and later models." "the memory tool itself doesn't require a beta header" (SDK helpers live in beta namespace: BetaAbstractMemoryTool, BetaLocalFilesystemMemoryTool).
- Auto-added system prompt text: "IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE. ... ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory."
- Pairs with context editing (client-side clearing of tool results) and compaction (server-side summarisation). Security: path traversal protection required.
- Positioning for the page: a pure "agent edits its own files" memory, the same shape as Letta MemFS / MemGPT self-editing memory, with no extraction or retrieval pipeline.

### OpenAI ChatGPT memory (openai.com and help.openai.com return 403 to fetches; facts below from search snippets of the primary pages plus secondary coverage)
- Saved memories launched (as a test) Feb 2024 in "Memory and new controls for ChatGPT", https://openai.com/index/memory-and-new-controls-for-chatgpt/ (original date 13 Feb 2024: UNCONFIRMED, page not readable).
- 10 Apr 2025: "Starting today, memory in ChatGPT can now reference all of your past chats" (OpenAI post on X, https://x.com/OpenAI/status/1910378768172212636, quote from search snippet; community thread https://community.openai.com/t/chatgpt-can-now-reference-all-past-conversations-april-10-2025/1229453 quotes Sam Altman "it can now reference all your past conversations"). Two settings: "Reference saved memories" and "Reference chat history" (names from search snippets: treat as UNCONFIRMED until read on help.openai.com).
- 3 Jun 2025: memory improvements began rolling out to free users, a "lightweight version ... short term continuity" (search snippet of the OpenAI page update: UNCONFIRMED from a readable primary).
- 4 Jun 2026: OpenAI "Dreaming: Better memory for a more helpful ChatGPT", https://openai.com/index/chatgpt-memory-dreaming/ : a background process that synthesises preferences and context across conversations; reported factual recall on OpenAI's own eval from 41.5% to 82.8%; rollout first to Plus/Pro in the US. All UNCONFIRMED (page 403; numbers from secondary coverage, e.g. https://www.startuphub.ai/ai-news/artificial-intelligence/2026/chatgpt-gets-smarter-memory).
- Note convergence of vocabulary: OpenAI "Dreaming" (Jun 2026), Letta "dreaming" (sleep-time subagents), Mem0 Pro "Dream (Memory Consolidation)".

### LangMem memory types
Source: https://langchain-ai.github.io/langmem/concepts/conceptual_guide/ (read 2026-10-06; no page date). langmem 0.0.30 (PyPI, 2025-10-27, MIT); repo still receiving dependency bumps (last commit 2026-10-02).
- Table "Types of Memory": Semantic = "Facts & Knowledge", agent example "User preferences; knowledge triplets", storage "Profile or Collection"; Episodic = "Past Experiences", "Few-shot examples; Summaries of past conversations", storage "Collection"; Procedural = "System Behavior", "Core personality and response patterns", storage "Prompt rules or Collection".
- Collections: "The system must reconcile new information with previous beliefs, either deleting/invalidating or updating/consolidating existing memories." Recall "should combine similarity with 'importance' ... and the memory's 'strength', which is a function of how recently/frequently it was used."
- "Episodic memory preserves successful interactions as learning examples that guide future behavior." "Procedural memory encodes how an agent should behave and respond ... evolves through feedback" (prompt optimisation).
- Formation: "Conscious Formation" = "in the hot path" (agent saves during the conversation, adds latency); "Subconscious Formation" = reflect after the conversation ("background"), "perfect for ensuring higher recall".

## 10. Independent comparisons
### MemoryAgentBench
Source: https://arxiv.org/abs/2507.05257 "Evaluating Memory in LLM Agents via Incremental Multi-Turn Interactions", Hu, Wang (equal contribution), McAuley (UCSD). v1 7 Jul 2025; v4 28 Jun 2026 (read from https://arxiv.org/html/2507.05257, which serves v4). Four competencies: Accurate Retrieval (AR), Test-Time Learning (TTL), Long-Range Understanding (LRU), Selective Forgetting (SF). Inputs fed incrementally as chunks. "All RAG agents and commercial memory agents use GPT-4o-mini as the backbone." Retrieval top-10 chunks in Table 3.
Table 3 (v4), columns: AR [SH-QA, MH-QA, LME(S*), EventQA, Avg] | TTL [MCC, Recom, Avg] | LRU [Summ, DetQA, Avg] | SF [FC-SH, FC-MH, Avg] | Overall:
- GPT-4o-mini long-context (128K): AR 64.0/43.0/30.7/59.0 avg 49.2 | TTL 82.0/15.1 avg 48.6 | LRU 28.9/63.4 avg 46.2 | SF 45.0/5.0 avg 25.0 | overall 42.2 (42.3 in the repeated row)
- GPT-4o (128K) overall 48.8; Claude-3.7-Sonnet 49.6; GPT-5-mini (400K) 60.6; GPT-4.1-mini (1M) 46.9; Gemini-2.0-Flash 42.4
- BM25: AR avg 60.5 | TTL 44.5 | LRU 35.6 | SF 25.5 | overall 41.5
- Text-Embed-3-Large: overall 38.0; HippoRAG-v2: AR 65.1, overall 41.6
- Mem0: AR 25.0/32.0/36.0/37.5 avg 32.6 | TTL 32.4/10.0 avg 21.2 | LRU 4.8/36.6 avg 20.7 | SF 18.0/2.0 avg 10.0 | overall 21.1
- Cognee: overall 20.6
- Zep: AR 44.0/25.0/38.3/42.5 avg 37.5 | TTL 62.8/12.1 avg 37.5 | LRU 4.2/28.2 avg 16.2 | SF 7.0/3.0 avg 5.0 | overall 24.0
- MemGPT (agentic memory): AR 41.0/38.0/32.0/26.2 avg 34.3 | TTL 67.6/14.0 avg 40.8 | LRU 2.5/42.3 avg 22.4 | SF 28.0/3.0 avg 15.5 | overall 28.3
- MIRIX 26.2 (gpt-4o-mini), MIRIX (4.1-mini) 37.7; Self-RAG 18.7
Findings quoted: RAG better on accurate retrieval; "Long-context models achieve the best performance on TTL and LRU. This highlights a fundamental limitation of RAG methods and commercial memory agents"; selective forgetting: "all methods fail on the multi-hop situation (with achieving at most 28% accuracy)".
Caveats: Mem0 and Zep were run as of 2025 (Mem0 1.x pipeline), under document-style chunked inputs, not conversational chat; the setup is far from what vendors tune for. Which Mem0/Zep versions: not stated in what I read (UNCONFIRMED).

### AMA-Bench
Source: https://arxiv.org/abs/2602.22769 "AMA-Bench: Evaluating Long-Horizon Memory for Agentic Applications" (v1 26 Feb 2026; read from https://arxiv.org/html/2602.22769). Memory over agent trajectories (not chat).
- Table 5 (base model Qwen-32B, real-world subset; mean accuracy with sd in brackets), average column: BM25 0.3436; Qwen3-Emb-4B 0.4227; GraphRAG 0.3258; HippoRAG2 0.4480; MemoRAG 0.4606; A-Mem 0.3186; MemGPT 0.3304; MemoryBank 0.3397; Mem-alpha 0.3117; MemAgent 0.2768; Mem0 0.2104; Mem1 0.1229; Simple mem 0.1811. Mem0 per capability: Recall 0.2011, Causal inference 0.2645, State updating 0.2101, State abstraction 0.1516. Zep/Letta product not evaluated (MemGPT is the paper method implementation inserted into archival memory).
- Paper describes Mem0 as LLM fact extraction into "atomic facts" in a vector DB; MemGPT as core (in-context) + archival memory with the trajectory inserted into archival memory.

### Others checked
- AgentMemBench, https://arxiv.org/abs/2608.00009 (dated 16 Jun 2026): compares five memory strategies via its own re-implementations (incl. "a faithful MemGPT-style adapter") on LoCoMo, MultiDoc2Dial etc.; does not benchmark the Mem0/Zep/Letta products themselves (from grep of the HTML; tables not transcribed).
- MemBench, https://arxiv.org/abs/2506.21605 (20 Jun 2025): mentions Mem0/MemGPT; product numbers not extracted (UNCONFIRMED whether it benchmarks them).
- Mem0 claims the Mem0 paper appeared at ECAI 2025 (search snippet of mem0.ai blog; UNCONFIRMED).
- Overall: no independent third-party paper found that runs current Mem0 (2.x), Zep Cloud and Letta (MemFS) side by side on LoCoMo or LongMemEval with a shared answer model. MemoryAgentBench is the best independent comparison of Mem0, Zep and MemGPT (2025 versions, gpt-4o-mini).

## Summary of corrections to likely old-page claims
- "Layers (conversation, user, organisation) with promotion between layers" is not a Mem0 concept. Real: scoping ids user_id / agent_id / run_id (+ app on Platform); README "Multi-Level Memory: User, Session, and Agent state".
- Mem0's ADD/UPDATE/DELETE/NOOP describes the 2025 paper and 1.x; since v2.0.0 (16 Apr 2026) the OSS add() is single-pass ADD-only with hash dedup, hybrid retrieval, entity linking replacing graph memory (graph memory now a Platform Pro feature).
- Letta's open-source server (letta-ai/letta) was archived on 16 Aug 2026; development continues in letta-ai/letta-code; memory is now MemFS (git-backed Markdown files, root files in prompt) plus dreaming; classic memory blocks (label/value/limit), archival and recall memory are the V1 model.
- Zep Community Edition ended 2 Apr 2025; Graphiti is the OSS piece; Zep Cloud runs on a proprietary Context Graph Engine.
