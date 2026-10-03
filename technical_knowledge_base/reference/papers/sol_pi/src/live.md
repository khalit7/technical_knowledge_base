Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5 as of 2026-09-21T14:50:16.384Z:
<page url="https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness","Takeaway":"Apply recursive self-improvement at the harness layer rather than to the model: auto-research loops across varied environments discover four reusable efficiency techniques (action execution, context compaction, observation handling, delegated reading) that cut recorded token traffic 44.7 to 49.0% at parity on EdgeBench, saving \\$8.75 to \\$13.50 per hour against native Codex and Claude Code.","Topics":["agentic-harnesses","benchmarks","inference-and-serving"],"Year":"2026","url":"https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +45m resources
Song Han and collaborators including Haozhe Liu, Tian Ye and Sensen Gao (NVIDIA and academic partners). arXiv 2609.20519, 17 September 2026. Code at [https://github.com/NVlabs/SoL-Pi](https://github.com/NVlabs/SoL-Pi)
## The idea
Recursive self-improvement is normally discussed as a model-training story: a model improves the next model. SoL-Pi applies the same loop one layer up, to the harness. Auto-research loops run across a spread of environments, each loop proposing and testing changes to how the agent executes work rather than to the weights, and the improvements that survive across environments are kept as reusable harness techniques. The claim is generalisation: a technique discovered in one environment transfers, because it is a property of how agents burn tokens rather than a property of the task.
## The four techniques
1. **Action execution optimisation**: fewer and better-shaped tool calls for the same work.
2. **Context compaction**: shrink what is carried forward between turns.
3. **Observation handling**: stop paying full price for tool output the agent does not need in full.
4. **Delegated reading**: hand bulk reading to a cheaper subordinate process and carry back only the conclusion.
None of the four is novel on its own. The contribution is that they were found by a loop rather than written by an engineer, and that the loop is what establishes they transfer.
## Results on EdgeBench (51 tasks)
- Task performance at parity with the baselines.
- Recorded token traffic down 44.7 to 49.0%.
- API cost down roughly one third.
- \$8.75 to \$13.50 saved per hour against native Codex and Claude Code; \$4.36 to \$5.71 against the baseline Pi system.
## Why it matters here
This is the first result to put a number on how much of an agent's cost is harness inefficiency rather than model inefficiency, and the number is large: roughly half the tokens, at no loss in task performance. It also answers, in the affirmative and at small scale, the question <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/> has carried since 2026-08-31, that nobody had run the harness-improvement loop end to end. SoL-Pi runs it, but at the efficiency layer rather than the capability layer, which is the easier half: an efficiency change has a cheap automatic verifier (did it cost less and still pass?) where a capability change does not.
## Caveats
One benchmark, 51 tasks, and "recorded token traffic" is not the same as billed tokens once cache behaviour is accounted for. The hourly dollar figures depend on the vendor prices in force in September 2026.
## Connections
The efficiency counterpart to the five harness-scaling strategies already on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>, all of which optimise for capability. Read against [Z.ai](http://z.ai/)'s GLM-5.3 Infra Agent write-up from the same week, which reaches the same conclusion from production rather than from a benchmark: the binding constraint on an improvement loop is the quality of the feedback the loop receives, not the model driving it. Second of the week's three auto-research papers, with <mention-page url="https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900"/> and <mention-page url="https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54"/>. Read also against <mention-page url="https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c"/>, which pulls the same lever the other way: SoL-Pi's context compaction removes what the agent carries forward, selective reminding restores what it dropped, and no published result measures the two together.
</content>
</page>
