# Agora: Git as Shared Memory for Collective AutoResearch

⏱ 5 min read · +45m resources

Yifan Zhang, Yunheng Zou, Shaokun Zhang, Jian Hu, Hao Zhang, Binfeng Xu, Jan Kautz, Yi Dong. arXiv 2609.18094, 16 September 2026. Code at [https://github.com/yifanzhang-pro/Agora](https://github.com/yifanzhang-pro/Agora)

### The problem

Multi-agent research systems normally coordinate through a planner: some central process decides who does what, merges results and decides what is true. That planner is the bottleneck and the single point of failure, and it is also where reproducibility goes to die, because the record of what happened is a conversation transcript rather than an artifact anyone can re-execute.

### The mechanism

Agora removes the planner and replaces shared memory with a Git repository. Research is recorded as an append-only directed acyclic graph stored in Git, where every claim is a commit: the hypothesis, the code, the measured result and the parent commits it builds on. Any worker can check out any commit and rerun it. Coordination is emergent rather than assigned, because a worker picks what to extend by reading the graph, and duplicated work is visible as divergent branches from the same parent rather than hidden inside a planner's queue.

The design consequence worth carrying is that provenance and reproducibility stop being separate features. Git already gives content-addressed history, cheap branching, merge semantics and an ancestry relation, which is most of what a research memory needs; the contribution is recognising that the append-only DAG is the right data structure for collective agent work and that a tool built for exactly that structure already exists.

### Results

The evaluation is a 12-day run with 13 language-model workers on a weight-transfer problem: 141 donor models, a 119.6M-parameter target.

- 1,703 contributions published to the graph.
- Evaluator score moved from 3.39 to 1.899 bits per byte, closing 62% of the distance to a trained GPT-2 124M.
- The winning solution's ancestry runs to 145 commits across 15 accounts, which is the concrete evidence that the result was collective rather than one lucky worker.
- 165 independent reproductions, zero failures.
- One human intervention mid-run, to restore diversity after the population converged.

### Caveats

One problem, one 12-day run, and the single mid-run human correction is doing unmeasured work: the authors say it restored diversity, which implies the system drifts toward premature convergence without it. The bits-per-byte target is also a well-posed objective with a cheap automatic evaluator, which is the friendliest possible setting for this design. Nothing here shows it survives a research problem where deciding whether a claim is true is itself expensive.

### Connections

Read next to [SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness](../2026-09_sol-pi-recursively-scaling-auto/summary.md) and [Dream-RSI: Recursive Self-Improvement through Evolving Worlds](../2026-09_dream-rsi-recursive-self-improvement/summary.md): all three are auto-research loops, and they differ in where the loop's memory lives. Agora puts it in a shared commit graph, SoL-Pi puts it in harness-layer techniques discovered once and reused, Dream-RSI puts it in a replay simulator built from the search history. Read against [Emergence World: Adversarial Stress-Testing of Long-Horizon Multi-Agent Systems](../2026-09_emergence-world-adversarial-stress-testing/summary.md), which is the same shape of system under attack and finds that individually safe agents compose into systems with new failure modes; an append-only graph that any worker can extend is also an append-only graph an adversarial worker can poison, and Agora does not test that.
