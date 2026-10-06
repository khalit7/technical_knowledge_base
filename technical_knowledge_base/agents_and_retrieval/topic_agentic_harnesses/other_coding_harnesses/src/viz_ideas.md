# Visual ideas: Other coding harnesses

Central question: what does each open harness decide differently around the same loop, and what does each decision cost when a model goes wrong?

Scores out of 14 as in the methodology (teaches the mechanism, real data, interaction earns its place, phone-friendly).

## Built
1. **Action boundary, before/after on the same input (Reading section 1)** (13). Two recorded runs of mini-SWE-agent's text mode with Claude Haiku 4.5 through `claude -p`: reply passed through untouched vs cut after the first action block. Step through model calls side by side; action blocks and model-invented output highlighted; running counters (blocks written, replies refused, output tokens). Real recordings, no simulation. Khalid's preferred shape (same input, mechanism toggled, step controls).
2. **Every run as a bar (Reading section 8)** (10). Input tokens summed per run, coloured by outcome, click-through to the run.
3. **Run board + call strip + call inspector (tab Same task, every harness)** (12). The wire view of every run from the logging proxy or the claude -p adapter log: per call kind (main, subagent, title, commit message, history summary, condenser, compaction), tokens, the last message the model was answering, the reply, the tool calls; for adapter runs the text before and after the cut.
4. **First-request anatomy (same tab)** (11). System prompt, tool definitions and user content in characters as sent on the wire, per harness, with the tool table and the prompt text readable. Answers "what does a harness cost before the model does anything".
5. **Repo map lab (tab)** (12). Aider 0.86.2's own RepoMap on mini-SWE-agent v2.4.6's source: PageRank bars for three situations (nothing in chat, a file in chat, file plus message) animated as a before/after sequence, four token budgets with the real map text and which files made the cut.

## Rejected
- **A 9-axis comparison matrix**: the parent topic's Harness atlas owns it; this page links it and goes deeper per harness.
- **"One fix, six edit formats" again**: the atlas has it; this page shows real edits from the recordings instead (SEARCH/REPLACE verbatim, Codex patch to the grammar).
- **A simulated matcher ladder (opencode's nine replacers vs Gemini's four vs Aider's)**: would need faithful ports of three codebases; a static, sourced description was judged enough. Candidate for later: run the real matchers offline (aider in Python, opencode via its TypeScript) on a set of drifted SEARCH strings.
- **Wall-clock comparisons**: the local MLX server was shared with other agents; seconds are shown per call but not ranked.
- **Star-count or release timeline charts**: they go stale in weeks and teach nothing about mechanisms.

## What the methodology lacked
A rule for runs on a weak model whose purpose is to expose harness behaviour rather than to rank: label them as demonstrations, show the mechanism that failed (refused reply, repeated call, prose instead of a tool call), and never aggregate them into a score.
