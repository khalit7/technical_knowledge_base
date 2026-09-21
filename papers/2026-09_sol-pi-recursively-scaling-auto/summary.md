# SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness

⏱ 5 min read · +45m resources

Song Han and collaborators including Haozhe Liu, Tian Ye and Sensen Gao (NVIDIA and academic partners). arXiv 2609.20519, 17 September 2026. Code at [https://github.com/NVlabs/SoL-Pi](https://github.com/NVlabs/SoL-Pi)

### The idea

Recursive self-improvement is normally discussed as a model-training story: a model improves the next model. SoL-Pi applies the same loop one layer up, to the harness. Auto-research loops run across a spread of environments, each loop proposing and testing changes to how the agent executes work rather than to the weights, and the improvements that survive across environments are kept as reusable harness techniques. The claim is generalisation: a technique discovered in one environment transfers, because it is a property of how agents burn tokens rather than a property of the task.

### The four techniques

1. **Action execution optimisation**: fewer and better-shaped tool calls for the same work.
2. **Context compaction**: shrink what is carried forward between turns.
3. **Observation handling**: stop paying full price for tool output the agent does not need in full.
4. **Delegated reading**: hand bulk reading to a cheaper subordinate process and carry back only the conclusion.
None of the four is novel on its own. The contribution is that they were found by a loop rather than written by an engineer, and that the loop is what establishes they transfer.

### Results on EdgeBench (51 tasks)

- Task performance at parity with the baselines.
- Recorded token traffic down 44.7 to 49.0%.
- API cost down roughly one third.
- $8.75 to $13.50 saved per hour against native Codex and Claude Code; $4.36 to $5.71 against the baseline Pi system.

### Why it matters here

This is the first result to put a number on how much of an agent's cost is harness inefficiency rather than model inefficiency, and the number is large: roughly half the tokens, at no loss in task performance. It also answers, in the affirmative and at small scale, the question [Topic: agentic-harnesses](../../topics/agentic-harnesses/summary.md) has carried since 2026-08-31, that nobody had run the harness-improvement loop end to end. SoL-Pi runs it, but at the efficiency layer rather than the capability layer, which is the easier half: an efficiency change has a cheap automatic verifier (did it cost less and still pass?) where a capability change does not.

### Caveats

One benchmark, 51 tasks, and "recorded token traffic" is not the same as billed tokens once cache behaviour is accounted for. The hourly dollar figures depend on the vendor prices in force in September 2026.

### Connections

The efficiency counterpart to the five harness-scaling strategies already on [Topic: agentic-harnesses](../../topics/agentic-harnesses/summary.md), all of which optimise for capability. Read against [Z.ai](http://z.ai/)'s GLM-5.3 Infra Agent write-up from the same week, which reaches the same conclusion from production rather than from a benchmark: the binding constraint on an improvement loop is the quality of the feedback the loop receives, not the model driving it. Second of the week's three auto-research papers, with [Agora: Git as Shared Memory for Collective AutoResearch](../2026-09_agora-git-as-shared-memory/summary.md) and [Dream-RSI: Recursive Self-Improvement through Evolving Worlds](../2026-09_dream-rsi-recursive-self-improvement/summary.md). Read also against [Proactive Memory Agent: selective reminding for long-horizon agents](../2026-00_proactive-memory-agent-selective-reminding/summary.md), which pulls the same lever the other way: SoL-Pi's context compaction removes what the agent carries forward, selective reminding restores what it dropped, and no published result measures the two together.
