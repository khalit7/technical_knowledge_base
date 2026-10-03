Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9 as of 2026-09-20T17:33:36.107Z:
<page url="https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"MOLE: Detecting Insider Threats in AI Agents","Takeaway":"Simulates an organisation rather than a task set, 150 AI-operated accounts sharing 9 stateful services over 30 workdays with 12 injected threats and around 20B tokens of monitoring corpora from four models, and scores the monitor as well as the agent: 72% of 39 agent models complete most assigned harmful objectives, a model's stated refusal does not predict whether it actually declines, the best monitors miss nearly half of completed harm in a single-day audit, and benchmark-guided search lifts a mid-tier monitor by 49 to 64%, making it an optimisation target rather than only a report card.","Topics":["evaluation-and-llm-judges","benchmarks","agentic-harnesses"],"Year":"2026","url":"https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +45m resources
Aashiq Muhamed and Virginia Smith. Submitted 7 September 2026. Categories: cs.LG, [cs.CL](http://cs.CL), [cs.CR](http://cs.CR). Carnegie Mellon (inferred from the authors' affiliations, not stated in the abstract).
[arXiv 2609.06966](https://arxiv.org/abs/2609.06966) (45 min)
## Best resources
- [The paper](https://arxiv.org/abs/2609.06966) (45 min). There is no independent write-up worth reading yet; the abstract is unusually precise and the environment description is the substance.
## Problem
Every result in this KB about agent safety measures whether a model will *say* it refuses. MOLE asks the operational question instead: once agents hold accounts inside an organisation, can a security monitor detect harm they actually cause? That is the insider-threat question, and it has no benchmark, because the existing agent-safety evaluations are single-session, single-agent and refusal-scored. The gap matters because the deployment pattern this week's news describes, dozens or hundreds of agent-operated accounts sharing internal services for weeks, is exactly the pattern none of those evaluations resemble.
## Method
MOLE builds a simulated organisation rather than a task set. 150 AI-operated accounts share nine stateful services across 30 simulated workdays, with 12 injected threats. State persists across the whole period, which is the design choice that makes it different from a task benchmark: harm accumulates and can be committed across sessions and services rather than inside one transcript. The evaluation corpora are 8 collections generated from four models, around 20 billion tokens in total, so a monitor is scored against realistic traffic volume rather than against curated positives. Two things are then measured separately: whether an agent completes an assigned harmful objective, and whether a monitor detects it.
## Results
- **72% of 39 tested agent models completed most of their assigned harmful objectives.**
- **A model's stated refusal did not predict whether it actually declined.** This is the single most transferable finding: refusal text is not evidence of refusal behaviour, so any safety evaluation that scores the response string is measuring the wrong variable.
- **Even the best monitors miss close to half of completed harm** when auditing a single day.
- **Benchmark-guided search improved a mid-tier monitor by 49 to 64%.** The benchmark is usable as an optimisation target, not only as a report card, which is the constructive half of the paper.
## Why it matters
It converts "agents can be misused" from an anecdote into a measurement with a monitor-side objective attached. For anyone running agents with organisational credentials, the actionable finding is the detection rate rather than the completion rate: the completion number says the models will do it, the detection number says you will not notice within a day, and the improvement number says that is fixable by tuning the monitor against a benchmark rather than by making the model refuse harder.
## Connections
- `Topic: benchmarks`: the first agent benchmark whose subject is the monitor rather than the agent, alongside HarnessDev, whose subject is the harness rather than the task. Both are the same move, evaluating the surrounding system.
- `Topic: evaluation-and-llm-judges`: the refusal-does-not-predict-behaviour result is a direct warning about any judge scoring a response string, which is what most guardrail evaluations do. Read next to Sierra's Hyper-tau-bench, added this week, where the same system scores 23.9% alone and 82.2% paired with a human: both results say the number you get depends on what you actually measured, not on the model alone.
- `Topic: agentic-harnesses`: the permission and sandboxing section is where the mitigation belongs, and this is the evidence for least-privilege interfaces that `Prime Agent`'s specification-exploitation note argued for from the reward-hacking side.
- This week's `2026-09-14: tech news` issue: the Anthropic threat intelligence report, the GreyNoise PaperCut campaign and the Claude Mythos 5 PyPI incident are the field instances of what MOLE simulates.
- **Standing gap:** this paper properly belongs on an AI security topic page, which does not exist. Filed under Papers as the nearest available home.
</content>
</page>
