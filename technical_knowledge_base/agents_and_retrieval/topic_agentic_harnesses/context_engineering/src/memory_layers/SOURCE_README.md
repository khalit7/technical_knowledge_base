# Agent memory layers: source

Child page of Topic: agentic-frameworks (new page, Notion 3f15c17b0d0d8170a200ce4476385ff5). `sh build.sh` runs `build_data.py` (recordings to `parts/22_js_fmem_data.js`) and writes `../index.html`.

## Tabs
- **Reading** (`parts/20_read*.html`, JS `23_js_fmem_a..f.js`): 0 in one screen, 1 from zero, 2 Mem0 paper vs library (before/after animation), 3 Graphiti (pipeline, edge timeline), 4 MemGPT/Letta (session stepper), 5 the experiment (results by ability), 6 failure modes, 7 costs, 8 choosing, mistakes, interview questions.
- **Memory lab** (`31_*`): every answer with its memory text; the stores side by side.
- **Published numbers, checked** (`33_*`): every benchmark number traced, with its runner; LOCOMO dispute animation.
- **Further reading** (`39_tab_more.html`).

## What was run (6 October 2026, Apple M1 Pro 16 GB)
Conversation and questions: `code/conv.py` (12 sessions: the parent root's four, from its `src/ops/code/mem_data.py`, plus eight; 25 questions in LongMemEval's five abilities; keyword grader; evidence words).
- **Mem0**: mem0ai 2.2.1 (`code/run_mem0.py`), Qdrant local mode, telemetry off. Writer Claude Haiku 4.5 through `code/llm_claude.py` (`claude -p`, tools off, own system prompt, `--strict-mcp-config --setting-sources project`, CLI 2.1.291, thinking off). The local model was not used as Mem0's writer: the extraction system prompt alone is 7,924 tokens with the Qwen3 tokenizer, over the shared local server's ~8K limit. Live use simulated by patching `mem0.configs.prompts._resolve_dates` to the session date (OSS `add()` has no timestamp).
- **Mem0 paper loop** (`code/mem_paper.py`): the parent's minimal ADD/UPDATE/DELETE/NOOP loop (whole store to the update call, no top-s retrieval), with Haiku and with the local model.
- **Graphiti** graphiti-core 0.30.2 (`code/run_graphiti.py`), FalkorDB 4.22.0 in Docker (Kuzu driver fails: `'KuzuDriver' object has no attribute '_database'`; FalkorDB `latest` 6.0.1 fails creating fulltext indexes). OpenAIGenericClient in `json_object` mode (schema in prompt). Writers: Haiku (adapter reads the first JSON object of the reply, as a schema-constrained call would return) and the local model (Graphiti's own parser, unchanged). The local-writer run was stopped after three episodes: from episode 2 on, the 4B model answered the resolve_edge prompt by echoing the JSON schema with an extra brace, identically on every retry at temperature 0; `code/finish_graphiti_local.py` wrote the partial run (edges and searches from the graph). Entity summaries dumped with `code/dump_nodes.py`.
- **Letta**: the archived server, letta 0.16.8 (last server release, 14 May 2026), installed with `uv pip install --exclude-newer 2026-05-15` (today's dependency versions break its imports); Postgres+pgvector in Docker; tables created from its ORM (`Base.metadata.create_all`) and the `messages.sequence_id` default added by hand (the wheel ships no migrations). Driven over REST (`code/run_letta.py`), default `letta_v1_agent` plus archival tools, 8,192-token window, local model only (Letta calls the model itself; the Claude CLI is not an endpoint). HOME pointed at a scratch folder for the server.
- **Letta's notes, pasted whole** (`answer.py lettastore`): the core block and all archival notes given to both readers, to separate Letta's write side (fine) from its read side (searches mostly empty).
- **Answers** (`code/answer.py`): readers Haiku and the local model on each system's memory text; Letta answers in its own loop, each question in a fresh conversation with isolated block copies.
- Embeddings for all three: BAAI/bge-small-en-v1.5 via `code/embed_server.py` (OpenAI-compatible, CPU).
- Local model: mlx-community/Qwen3-4B-Instruct-2507-4bit on mlx-lm 0.32.0 (shared server on 8090, every request under the shared lock via `mlx_call.py`, which lives in the agents scratch folder, not here).

## Pipeline
1. `python3 redact.py <scratch>/fmem/runs` writes `recordings/` (paths to /work, login, git identity and e-mails scrubbed, em-dashes to ", "; Mem0's fixed extraction prompt dropped, user prompts kept) and fails on any leak.
2. `sh build.sh` (runs `build_data.py`).
3. Hand judgements: `inputs/graphiti_verdicts.json` (is each closed Graphiti edge rightly closed). The Mem0 re-extraction list (`CARRY` in `build_data.py`) came from a word-overlap heuristic checked by hand (two false positives removed).

## Departures from the brief and the method
- Letta could only run with the local 4B model, so its result mixes design and model; said on the page.
- Mem0 2.2.1 only with Haiku (prompt size); the paper loop ran with both writers.
- Grading is keyword rules (code/conv.py `grade`: per-question keyword groups; abstention phrases; an answer that starts with "I don't know" is wrong; an explicit rule for the which-came-first question), not an LLM judge; every answer was scanned by hand for rule errors and is shown on the Memory lab tab. `check_numbers.py` regenerates the data and checks 35 prose claims against the recordings.
- No LongMemEval or LOCOMO rerun: too large for the shared machine; their published numbers are on the Published numbers tab with runners.

## Sources
`inputs/research_claims.md`: every published fact used, with URL, date and quote (papers, release notes, docs, pricing, the LOCOMO dispute, independent benchmarks), read 6 October 2026.
