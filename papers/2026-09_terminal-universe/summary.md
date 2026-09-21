# Terminal-Universe: Turning Agent Trajectories into Scalable Terminal Environments

⏱ 6 min read · +45m resources

**Authors**: Jie Wu, Zhenru Zhang, Beichen Zhang, Xuwu Wang, Yuhui Su, Mouxiang Chen, Peng Wang, Zhihai Wang, Que Shen, Hao Zhou, An Yang, Fei Huang, Yujiu Yang, Dayiheng Liu

**Date**: 2026-09-03

**Links**: [arXiv 2609.04148](https://arxiv.org/abs/2609.04148) (45 min)

### Best resources

- [The paper itself](https://arxiv.org/abs/2609.04148) (45 min).

### Problem

Post-training a code agent needs **executable environments**, not demonstrations. Demonstrations of agent behaviour are now abundant, because every deployed harness produces trajectories; environments that an agent can actually be trained against, with real dependencies installed and real commands that succeed or fail, remain scarce and are built by hand. That asymmetry is the bottleneck: the field has far more recorded behaviour than it has places to practise.

### Method

The observation the method rests on is that **the trajectories already contain the environments**. An agent trace records the file operations it performed, and those operations are enough to reconstruct the workspace they were performed in. Terminal-Universe replays the recorded operations to rebuild the workspace, then fills in the dependencies the replay reveals to be missing, producing a runnable environment from a log. It then generates new tasks in that environment along two dimensions. **Breadth**: synthesise cross-workspace queries that mimic real development patterns, so the agent is not confined to the single task the original trajectory performed. **Depth**: extend single-turn tasks into multi-round sessions with iterative feedback, which is the shape production work actually has. Applied to public trajectories the pipeline yields **37,300 usable environments**.

### Results

Fine-tuning **Qwen3.5-27B** on the generated data improves **Terminal-Bench 2.1 by 11.9 points** and **EvoCode-Bench v2 MT@4 (multi-round) by 13.8 points**. The larger gain on the multi-round evaluation is consistent with the depth axis being the more valuable of the two, since multi-round interaction is exactly what a single replayed trajectory does not contain and the task-extension step manufactures.

### Why it matters

This is environment scarcity solved by recycling rather than by construction, and the supply it unlocks is proportional to deployed agent usage rather than to human authoring effort. It also closes a loop worth naming: agents produce trajectories, trajectories produce environments, environments train better agents. That is a genuine data flywheel for agentic post-training, of the kind that pretraining had with web crawl and agent training has so far lacked. The obvious open risk, which the abstract does not address, is distributional: environments reconstructed from trajectories inherit whatever the recorded agents were doing, so the flywheel can narrow rather than broaden if the trajectory pool is dominated by a few harnesses and a few task types.

### Connections

- `EnvHarness`: the complement. EnvHarness wraps existing frozen environments with composable Stage/Contract/Chain components and auto-customises them against a policy's diagnosed weaknesses; Terminal-Universe manufactures new environments from artifacts nobody treated as environments. Use both and the pipeline covers supply and adaptation.
- `Repo-To-Skill`: the same week, the same move, applied to skills instead of environments, both mining artifacts that already exist.
- `HarnessDev`: a harness-building model needs somewhere to practise; this is that somewhere.
- `Topic: benchmarks`: the reported gains are against Terminal-Bench 2.1, which as of 2026-09-07 is one version behind current (4.0), so the numbers are not directly comparable to model cards published from September onward.
- `Topic: agentic-harnesses`, harness-scaling section, and `Topic: rl` for the post-training use. The [Mercor and SkyRL 397B recipe](https://www.mercor.com/blog/training-frontier-knowledge-work-agents-a-397b-rl-training-guide-with-skyrl/) filed on 2026-09-07 is the practitioner-side counterpart: it argues that environment robustness and harness design decide an RL run as much as the algorithm does, which is exactly the input this paper industrialises.
