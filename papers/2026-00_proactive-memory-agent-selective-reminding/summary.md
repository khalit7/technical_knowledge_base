# Proactive Memory Agent: selective reminding for long-horizon agents

⏱ 3 min read · +20m resources

Yifan Wu and colleagues, Meta AI. September 2026. **Provenance note:** this summary is built from The Batch's coverage of 18 September 2026. No arXiv identifier or primary URL was resolvable from the newsletter, whose links are tracking redirects, so the paper itself has not been read directly. Treat the figures as reported rather than verified, and attach the arXiv id when it surfaces.

### The mechanism

An acting agent does the work. A second model runs alongside it as a memory agent, watching the trajectory and deciding, at each step, whether the actor should be reminded of something it already knows and has lost from working context. The reminder is injected; nothing about the actor is retrained. That is the whole design, and the cheapness is the point: this is a harness-layer addition that can be bolted onto a model you do not control.

### Results

On **Terminal-Bench 2.0**:

- Claude Sonnet 4.5: 37.6% to **45.9%**
- Qwen3.5-27B: 37.6% to **41.1%**
On **tau2-Bench**:

- Claude Sonnet 4.5: 55.0% to **61.8%**
- Claude Opus 4.6: 66.2% to **68.7%**
The gains are larger for the weaker actor on Terminal-Bench and smaller for the stronger one on tau2-Bench, which is the pattern you would expect if the intervention is substituting for context management the stronger model partly does for itself.

### The non-obvious finding

Reminding **selectively** beats reminding at every step. A reminder is not free: it consumes context, and an irrelevant one competes with the actual task state for the actor's attention. So the memory agent's job is discrimination, not retrieval, and the result is evidence that the bottleneck in long-horizon agent work is knowing when to surface a fact rather than being able to find it. That distinguishes this from retrieval-augmented generation, where the ranking problem is the whole problem and the timing is fixed.

### Caveats

Second-hand provenance, as above. Two benchmarks, four model pairings, and no cost accounting is reported for running a second model continuously alongside the first, which is exactly the number needed to compare this against the harness-efficiency direction SoL-Pi opens.

### Connections

The constructive counterpart to [Topic: agentic-harnesses](../../topics/agentic-harnesses/summary.md)'s harness-scaling strategies: a second model supervising the first is the same delegating-coordinator shape, pointed at memory rather than at task decomposition. Read against SoL-Pi from the same window, which finds roughly half an agent's tokens are harness overhead: context compaction and selective reminding are the same lever pulled in opposite directions, one removing what is carried and the other restoring what was dropped, and nobody has yet measured them together.
