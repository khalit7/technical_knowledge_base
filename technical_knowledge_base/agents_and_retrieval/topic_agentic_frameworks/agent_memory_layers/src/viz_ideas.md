# Visualisation ideas: Agent memory layers

What the reader must understand: (1) a memory layer is a write policy plus a read policy; (2) how each of the three designs handles a fact that changes; (3) where each one fails, with evidence; (4) that published benchmark numbers depend on who ran them.

## Built (ranked by how much they teach)
1. **One session, two Mem0s** (Reading section 2, before/after animation, score 9). The same session through the paper's extract-then-decide loop and through mem0ai 2.2.1's single ADD-only call, same writer (Haiku), four steps each, real stores from the recordings. Shows UPDATE overwriting history against ADD-only duplicates, and the "Last k Messages" re-extraction. Pick any of the 12 sessions.
2. **Graphiti edge timeline** (section 3, step animation over 12 sessions, score 9). Every edge as a validity bar from valid_at to invalid_at, appearing and closing session by session; wrongly closed edges marked from a hand judgement (inputs/graphiti_verdicts.json); undated edges faded; writer toggle Haiku / local 4B. Bi-temporal idea made visible (invalid_at in September, expired_at on the run day).
3. **Question matrix with the memory text behind each answer** (Memory lab tab, score 9). 25 questions by every system and reader; a click shows the answer, the reference, and exactly the retrieved memories (with dates, scores, validity windows, Letta's tool calls), evidence lines tinted.
4. **Results by ability** (section 5 heatmap, score 8). Systems by LongMemEval's five abilities per reader, plus the no-model "evidence reached the prompt" column, which separates memory failures from reader failures.
5. **LOCOMO dispute dot plot** (Published numbers tab, step animation, score 8). Every published LOCOMO score in date order, coloured by runner (vendor, rival, baseline): the same product from 58.44 to 80.32.
6. **Letta session stepper** (section 4, score 7). Tool calls per session, core block and archival notes: shows the agent filing diaries and leaving its core block alone.
6b. **Letta's notes pasted whole** as an extra row in every table: same store, no search step, separates write from read.
7. **Stores side by side** (Memory lab, score 6). Mem0, paper loop, Graphiti and Letta after each session.
8. Failure cards and the cost table (sections 6, 7): built from the recordings, each card with the real answer that failed.

## Rejected
- A force-directed drawing of the Graphiti graph: pretty, but the question is about time, and a timeline answers it; a force layout also clips at 390 px.
- An embedding-space scatter of memories (2-D projection): shows nothing about correctness and invites over-reading.
- A latency race between products: the runs share one busy local model server and the Claude CLI; seconds are not comparable across systems.
- Re-plotting vendor benchmark bars as "who wins": the point of the tab is that the numbers are not comparable.

## Data and formulas
- Recordings: src/recordings (redacted by redact.py). Grades: keyword rules in code/conv.py `grade`; evidence: `EVK` groups in code/conv.py checked against the memory text, no model.
- Mem0 hybrid score: (cos + sigmoid-normalised BM25 + entity boost) / (1 + 1 + 0.5), from mem0/utils/scoring.py at v2.2.1.
- Graphiti closing rule: invalid_at of the contradicted edge = valid_at of the new edge if the old one started earlier (edge_operations.py resolve_edge_contradictions at v0.30.2).
- Published numbers: inputs/research_claims.md (sources and quotes, read 6 Oct 2026).

## What the methodology lacked for this page
A rule for grading free-text answers without an LLM judge: keyword rules were used, with every answer shown so the reader can disagree, and abstention handled explicitly.
