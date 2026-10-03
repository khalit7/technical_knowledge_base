Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f as of 2026-09-20T17:34:01.976Z:
<page url="https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"HarnessDev: Can LLMs Create and Evolve Their Own Agent Harness?","Takeaway":"Moves evaluation from task performance to infrastructure construction: Creation (build an execution system from minimal components and sample cases) then Evolution (refine it from feedback), across six creator LLMs, four domains, five downstream benchmarks and 2,207 instances, scored on capability and execution-token cost; generated harnesses lag mature human references on code and search but match or beat them on writing and ML experimentation, while evolution gains are unstable, transfer poorly, and stay strongly dependent on which model executes the harness.","Topics":["agentic-harnesses","agentic-frameworks","benchmarks"],"Year":"2026","url":"https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +45m resources
**Authors**: Yuhao Wu, Jingyuan Zhang, Jiajun Shi, Xinping Lei, Qingshui Gu, Yuxuan Zhang, Zexuan Wang, Chen He, Chen Huang, Maojia Song, Zhiyuan Zeng, Shaowen Wang, Jinkai Liu, Yunfeng Shi, Jiaheng Liu, Shen Yan, Wenhao Huang, Ge Zhang, Wenxuan Zhang
**Date**: 2026-09-01
**Links**: [arXiv 2609.01437](https://arxiv.org/abs/2609.01437) (45 min)
## Best resources
- [The paper itself](https://arxiv.org/abs/2609.01437) (45 min). No third-party writeup of quality exists yet; this summary is from the abstract and results, and should be refreshed once the code or a proper analysis lands.
## Problem
Every harness-scaling result of the last month showed that the wrapper around a model moves benchmark scores by tens of points on identical weights: Prime Agent, StateM, JIT-Agent, WikiSkill. All of them evaluate the harness by the task score it produces, which means the literature has no way to ask the obvious next question. Can a model build the wrapper itself, and if it can, how good is what it builds compared to something a team spent a year on? Task score cannot answer that, because a good score confounds the harness with the model executing it.
## Method
HarnessDev is a benchmark whose unit of evaluation is the infrastructure, not the task. It has two phases. In **Creation**, an agent is given minimal components and a handful of sample cases and must assemble a working execution system from them. In **Evolution**, it iteratively refines that system using performance feedback from its own runs. The evaluation then runs the produced harness on held-out downstream benchmarks and scores it on two axes at once: **capability**, the task success it achieves, and **efficiency**, the execution-token cost of achieving it, which is the axis that stops a harness from winning by brute force. The sweep covers six creator LLMs, four domains and five downstream benchmarks, totalling 2,207 unique downstream instances. Method detail here is at abstract granularity; the component inventory and the feedback signal are not reproduced in this summary.
## Results
The headline is a split by domain rather than a single number. Model-generated harnesses stay **substantially behind mature human-engineered references on code and on search**, but **match or exceed the selected references on writing and on machine-learning experimentation**. Evolution turns out to be the weak phase: improvements are unstable across iterations and show limited transfer to unseen tasks. Across everything, results remain **strongly dependent on which model executes the harness**, so a harness cannot be scored in isolation from the policy that runs it.
## Why it matters
Three things. First, it supplies the missing measuring instrument for a research programme that had already produced four competing strategies and no way to compare the construction step. Second, the domain split is a diagnosis, not just a result: the domains where human references win (code, search) are the ones where the reference harness encodes years of accumulated, domain-specific tooling, while the domains where generated harnesses compete are the ones where general agent structure is most of what a harness is. That predicts where hand-built harnesses will keep their advantage and where they will not. Third, the finding that evolution is unstable and non-transferable is a direct check on the self-improving-harness line: Prime Agent's Continual Harness versions its own prompts and skills across trajectories, and this benchmark says that in general such refinement does not reliably compound.
## Connections
- `Prime Agent` and `JIT-Agent` in Papers, and the harness-scaling section of `Topic: agentic-harnesses`: HarnessDev is the benchmark those two needed and did not have. JIT-Agent trains a model to emit a harness per task and reports parity with production harnesses in a much poorer protocol language; HarnessDev measures exactly that gap and finds it is domain-dependent rather than uniform.
- `StateM`: the opposite pole, a human-written state machine that constrains the agent. HarnessDev's finding that generated harnesses lag most where domain tooling is deepest is consistent with StateM's win coming from encoded domain procedure.
- `Demystifying Agent Skills` and `Repo-To-Skill`: skills are one of the components a harness assembles, and Repo-To-Skill is the supply side of the same problem.
- `Terminal-Universe`: supplies the environments a harness-building model would need to practise in.
- The 2026-09-07 ARC Prize result on `Topic: benchmarks`: an existence proof that a provider-side harness can beat any harness a third party is able to construct, which bounds what HarnessDev's Creation phase can ever reach for models with opaque state.
- The [harness architecture playbook](https://stencil.so/blog/harness-playbook) filed on `Topic: agentic-harnesses` on 2026-09-07 is the human-written counterpart: it argues that unavoidable complexity belongs in a harness's core abstractions rather than in extensions, which is one hypothesis for why generated harnesses lag where domain tooling runs deepest.
</content>
</page>
