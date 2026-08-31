# JIT-Agent: Scaling Harness Intelligence via Just-in-Time Harness Evolution

- **Authors/lab**: Guibin Zhang, Leo Lu, Fangzhou Xie, Kang Zhu, Junhao Wang, Zhifei Xie, Zhaochen Yu, Zihang Liu, Zhongxiang Sun, Qiankun Li, Yue Liao, Heng Chang, Xiaobin Hu, Qibing Ren, Wangchunshu Zhou, Shuicheng Yan (NUS and collaborators)
- **Date**: 2026-08-26 (arXiv v1)
- **Links**: [arXiv 2608.25593](https://arxiv.org/abs/2608.25593) | [HTML](https://arxiv.org/html/2608.25593)
- **Topics**: agentic-harnesses, agentic-frameworks, rl

*Added to the KB 2026-08-31.*

## Best resources

- [The paper](https://arxiv.org/abs/2608.25593).
- Read alongside [StateM](../2026-08_statem/summary.md) and [Prime Agent](../2026-08_prime-agent/summary.md); the three together are the current state of the harness-scaling argument.

## Problem

Every result in the harness-scaling literature is a hand-built artifact: someone writes a state machine, a skill set, or a subagent topology, tunes it against a benchmark, and reports the lift. That does not compose and does not transfer, and the paper's own ablation says why it cannot be fixed by picking a better default: **no fixed harness dominates across tasks**. ReAct wins some, Plan-and-Execute wins others, ReSum wins on long-horizon search. So the question becomes whether harness construction can be made a learned, inference-time capability instead of a human craft.

## Method

**A four-module harness protocol.** Any harness is factored into a tuple `h = (M, P, A, F)`:

- **M, Memory**: compresses and curates interaction history into the working context view.
- **P, Planning**: forms local directives and subgoals.
- **A, Action**: the control loop that updates state and emits the next action.
- **F, Capability orchestration**: selects and sequences tools, APIs, and skills.

This is the load-bearing idea. It is narrow enough that a model can emit a protocol-compliant program and have it validated before execution, and wide enough to express the harnesses people actually write. The archive is seeded with 13 hand-written reference harnesses (ReAct, Plan-and-Execute, ReSum, and others) expressed in the protocol.

**A 27B model trained in three stages** on Qwen3.6-27B:

1. **Customisation learning**: SFT on teacher-generated harnesses that pass protocol validation, then preference learning that favours harnesses improving reward without paying for it in latency or cost.
2. **Repair supervision**: failed generations get a structured diagnostic (compile errors, interface mismatches, runtime failures); a teacher proposes patches, and trajectories that become executable within two revisions enter training. The two-round cap deliberately restricts supervision to locally recoverable failures.
3. **Evo-GDPO** (evolutionary group-decoupled policy optimisation): candidates are scored against the incumbent designs in the harness archive, with reward, latency, and cost normalised separately, so the model learns to push the archive's frontier rather than to maximise a scalar.

**Self-evolution at test time.** The archive `B_n` grows during streaming inference: a candidate is validated, then retained only if it matches or exceeds the reward frontier *and* strictly improves latency or cost. Successful harnesses are indexed by task type with their observed metrics, so later generations retrieve task-matched priors.

## Results

Nine benchmarks across deep research (BrowseComp-Plus, DeepSearchQA, xBench-DeepSearch), daily work (AgentIF-Oneday, PinchBench), planning (DeepPlanning-Shopping, DeepPlanning-Travel), and workspace (OfficeBench, OdysseyBench).

- **GLM-5.2**: 74.1 to 81.8 average, +7.7 points, up to +20.2 on individual benchmarks.
- **DeepSeek-V4-Flash**: 66.7 to 75.5 average, +8.8 points.
- The cross-model claim is the headline: a JIT-harnessed **DeepSeek-V4-Flash beats bare GPT-5.6** on DeepSearchQA (+9.1) and OdysseyBench (+4.3).
- Largest single gain +24.8 on DeepPlanning-Shopping, a constraint-tracking task, which fits the pattern that harness lift concentrates where state management is the bottleneck.
- JIT-equipped systems rank first in 8 of 9 benchmark columns, at **14.9% to 54.1% lower cost** than fixed harnesses.

## Why it matters

This is the first attempt to make harness intelligence a *trainable* axis rather than an engineering one, and the economics are the interesting part: the lift comes with a cost reduction, because a task-conditioned harness does not pay for the machinery it does not need. If the result holds, the practical consequence for anyone serving agents is that the harness stops being a fixed asset you tune per product and becomes a per-task artifact you generate, which changes what you cache, what you version, and what you evaluate.

The honest caveat is in the paper: production harnesses such as Codex, Claude Code, and the DeepSeek harness *"expose substantially richer mechanisms than our four-module instantiation"*. The 27B generator is synthesising harnesses in a deliberately impoverished language, so the comparison to OpenCode and Claude Code is closer to parity than to dominance. The paper also does not analyse failure modes of the repair loop or the evolution mechanism beyond the two-round cap.

## Connections

- [Prime Agent](../2026-08_prime-agent/summary.md): the mirror image. Prime Agent gives an untrained model a rich harness and notes that models are not trained to operate it; JIT-Agent trains a model to build the harness but keeps the harness simple. Neither has yet done both.
- [StateM](../2026-08_statem/summary.md): the hand-built harness whose lift JIT-Agent is trying to automate; StateM's versioned YAML runbook is roughly a hand-tuned `(M, P, A, F)` instance.
- [Demystifying Agent Skills](../2026-08_agent-skills/summary.md): the `F` module is the skills question, and the 10% misapplication rate found there is a plausible source of JIT-Agent's residual failures.
- [SA-MRPO](../2026-08_learn-whats-left/summary.md): Evo-GDPO's separate normalisation of reward, latency, and cost is the same multi-objective RL problem, approached through frontier comparison rather than saturation-aware reweighting.
- [topics/agentic-harnesses](../../topics/agentic-harnesses/summary.md) (harness engineering); [topics/agentic-frameworks](../../topics/agentic-frameworks/summary.md).
