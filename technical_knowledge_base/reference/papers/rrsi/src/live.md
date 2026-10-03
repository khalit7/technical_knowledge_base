Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a as of 2026-09-28T07:19:21.138Z:
<page url="https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"RRSI: Regularized Recursive Self-Improvement of Agent Harnesses","Takeaway":"Regularising recursive harness evolution with an annealed edit budget, a critic and a pruner buys +14.1 points in distribution, +4.7 out of distribution and 30% fewer policy tokens, which is the first evidence the loop's gains survive leaving the benchmark it was scored on.","Topics":["agentic-harnesses","llm-training-and-post-training","benchmarks"],"Year":"2026","url":"https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +45m resources
Peng Xia, Rujun Han, Zifeng Wang, Yanfei Chen, Yufan Zhuang, Yoonho Lee, Chengsong Huang, Han Yu, Zhongying CuiZhu, Yifei Ming, Huaxiu Yao, Burak Gokturk, Tomas Pfister and Chen-Yu Lee. Submitted 21 September 2026, revised 23 September 2026. [arXiv 2609.24972](https://arxiv.org/abs/2609.24972) (45 min), [regularized-rsi.com](https://regularized-rsi.com/)
## The framing
An agent's capability is largely magnified by its **harness**, meaning the prompts, control flow, tooling, memory and context management wrapped around a frozen backbone. Recursive evolution of that harness therefore looks like free capability, and the obvious objection is that the loop overfits whatever benchmark it is scored against. Every earlier system in this line measures only whether the loop improved the thing it was pointed at. This is the first to ask whether the gains survive leaving it.
## Mechanism, in three parts
- **A temporally annealed edit budget** on the proposer, limiting how many changes a single candidate may bundle, so a late-stage proposal cannot rewrite the harness wholesale and claim the result. The proposer is also pushed toward trajectories absent from the evolution history.
- **A critic** that screens proposals which are specific to the benchmark rather than to the task.
- **A pruner** that removes edits too small to matter, too expensive to keep, or made redundant once later edits landed.
## Results
Across eight benchmarks spanning coding, agentic workspace and engineering-design tasks: **+14.1 points in distribution**, **+4.7 points across five out-of-distribution benchmarks**, and **30% fewer policy tokens** than unregularised evolution.
Read the three numbers as one result. The out-of-distribution gain is about a third of the in-distribution gain, which is the honest shape of a generalisation claim and says the loop still partly fits its target; that it is positive at all is what none of the earlier work established. The token reduction says the regularisation is not bought with compute, which matters because a pruner that only ever removed cheap edits would improve the score by spending more.
## Connections
- <mention-page url="https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5"/> runs the same loop for cost rather than capability and finds roughly half of agent token traffic is harness overhead. Between them the loop now has both a cost objective and a generalisation guard, which are the two things a self-modifying system needs before anyone should leave it running.
- <mention-page url="https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900"/> and <mention-page url="https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54"/> differ in where the loop's memory lives, and neither measures generalisation.
- <mention-page url="https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b"/> attacks a system of this shape.
Integrated on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>.
</content>
</page>
