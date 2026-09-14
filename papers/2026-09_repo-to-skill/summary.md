# Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills

⏱ 6 min read · +45m resources

**Authors**: Jianlyu Chen, Yuyang Hu, Hongjin Qian, Jiawei Liu, Wenqing Wei, Xiaolong Chen, Defu Lian, Zhicheng Dou, Chaozhuo Li, Qiwei Ye, Zheng Liu

**Date**: 2026-09-02

**Links**: [arXiv 2609.02749](https://arxiv.org/abs/2609.02749) (45 min)

## Best resources

- [The paper itself](https://arxiv.org/abs/2609.02749) (45 min). The AREX-Skill Library is the artifact worth looking at if it is released; check the paper for the link.

## Problem

Autonomous machine-learning research agents fail in a specific and unglamorous way: they know the method and cannot make it run. The paper names the missing ingredient **operational knowledge**, the practical expertise of implementing a technique successfully, which lives in READMEs, config files, issue threads and the folklore of a codebase rather than in the paper describing the method. Agent skills are the obvious vehicle for it, but skills have been written by hand, one at a time, which does not scale to the breadth of machine-learning practice.

## Method

**DisCo** is an agent system that distils operational knowledge out of repositories into reusable skills, in two modes. **Task-agnostic** distillation mines an existing repository for whatever it knows how to do, producing skills before any task is known. **Task-oriented** distillation generates skills targeted at the task currently in front of the agent. The distillation step converts material written for humans into compact, machine-actionable procedures, which is the part that distinguishes this from retrieval over documentation. The output artifact is the **AREX-Skill Library**: more than 5,000 verified skills distilled from 1,000 widely used machine-learning repositories, organised into 20 areas and 178 capability families.

## Results

With a GPT-5.5 backbone under a fixed computational budget, the skill-equipped agent improves by **134.3% on MLE-bench**, **34.4% on PaperBench**, **9.2% on FrontierCS** and **14.0% on PassNet**. The fixed budget is the important qualifier: this is not more compute buying more attempts, it is the same compute spent less wastefully because the agent stops rediscovering how to run things.

## Why it matters

The MLE-bench figure is the largest single-intervention gain the KB currently records on that benchmark, and it comes from supplying procedure rather than capability. That is the same mechanism `Demystifying Agent Skills` identified when it found skills work as **procedural anchors** rather than as knowledge injection, and it is the first work to supply those anchors at library scale rather than by hand. It also reframes what a repository is for an agent: not a thing to read when needed, but a source of pre-compiled procedure that can be distilled once and reused. The caution carried over from `Demystifying Agent Skills` applies directly and is not addressed here: skills introduce a roughly 10% misapplication failure mode, and retrieval precision decouples from downstream success, so a 5,000-skill library is also 5,000 opportunities to apply the wrong procedure confidently.

## Connections

- `Demystifying Agent Skills`: the mechanistic account of why this works, and the source of the misapplication caveat this paper does not engage with.
- `HarnessDev`: skills are a component a self-built harness must assemble; this is the supply side of that component, at scale.
- `Terminal-Universe`: the same week, the same shape of idea, applied to environments instead of skills. Both mine artifacts that already exist (repositories, trajectories) for something the field was manufacturing by hand.
- `EnvHarness` and `Prime Agent`: Prime Agent lets the agent version its own skills inline and finds the policy underuses the affordance; Repo-To-Skill removes the authoring burden entirely, which is a different answer to the same complaint.
- `Topic: agentic-harnesses`, harness-scaling section.
