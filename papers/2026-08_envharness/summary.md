# EnvHarness: Awakening Static Worlds for Agent Learning

- **Authors/lab**: Chengsong Huang (Washington University in St. Louis, work done at Google), Zifeng Wang, Rujun Han, Jun Yan, Yanfei Chen, Chen-Yu Lee et al. (Google Cloud AI Research; with Google Cloud and UNC Chapel Hill)
- **Date**: August 2026 (arXiv 2608.19880, v1 20 Aug 2026)
- **Links**: [arXiv](https://arxiv.org/abs/2608.19880) | [GitHub](https://github.com/google-research/envharness) | [Project page](https://www.envharness.com)

## Best resources

- [arXiv abstract](https://arxiv.org/abs/2608.19880) and the [project page](https://www.envharness.com): paper is days old, no good third-party explainers yet; the repo README is the practical entry point

## Problem

LLM agents learn from interacting with environments (SWE repos, web UIs, embodied simulators), but those environments are hand-built and static: they behave identically regardless of which agent trains in them or how good it has become, so they cannot target a specific policy's weaknesses and run out of things to teach once the agent solves the existing tasks. The obvious fix, automated environment generation, has two structural flaws: pipelines are domain-specific (a web-env generator does not transfer to SWE or tool use), and LLM-generated environments plus LLM-generated verifiers are unreliable, forcing heavy over-generation and filtering without correctness guarantees.

## Method

**EnvHarness: an "agent harness for environments".** The core move is an explicit analogy: an agent harness wraps a frozen LLM with plug-in components (tools, memory, skills) to make it capable without touching weights; EnvHarness wraps a frozen environment with plug-in components to make it customizable without touching its code. Formally, an environment is a tuple E = (S, A, O, T, R, s0) and a component is an environment-agnostic transformation w with E' = w(E), operating strictly at the standard reset/step interface. Because the base simulator, tasks, and verifier are untouched, every reshaped environment inherits the original trusted human-built verifier, sidestepping the generated-verifier reliability problem.

Three concrete component types, freely composable (nesting order matters, they do not commute):

- **Stage**: overrides reset() by applying a scripted action sequence to the initial state s0. Makes tasks harder (hide the target mug in a drawer, forcing search) or easier (pre-complete early subgoals to shorten the horizon).
- **Contract**: a triplet of maps (f_A, f_T, f_O) rewriting the action space, transition dynamics, and observation space. Examples: block an action until a precondition holds (with structured feedback like "open the container first"), truncate observations to force multi-step spatial reasoning, remove shortcut actions like teleport navigation.
- **Chain**: composes the base environment with an extra environment E_ext under a composition logic g, exposing one interface. Extends horizons and tests goal persistence (finish the mug task, then also "heat a potato"); reward fires only when both verifiers pass.

**EnvRigger: automated, task-policy-conditioned customization.** A component is policy-agnostic, but choosing and parameterizing components must depend on the target policy pi and task t. EnvRigger closes this loop with four stages: **Observe** (roll out pi on the base task, collect trajectories), **Diagnose** (identify root-cause flaws such as dead-loop action repetition, long-observation parsing failures, misread tool constraints; if pi is at 100 percent, diagnose that the env is too easy and harden it), **Write** (synthesize candidate components as code targeting the diagnosis), **Validate** (wrap the env, run fresh rollouts, accept only candidates that are solvable, challenging, and give a well-scaled signal; otherwise refine or reject). The policy is a pure black box. The same machinery also accepts explicit user-specified targets (a desired success rate, or a weakness described in natural language, e.g. "submits patches without running the failing test", from which EnvRigger writes a Contract that rejects submissions until tests are run).

**Training paradigms evaluated**: (1) skill-based learning: run EnvRigger on training instances, extract skills from trajectories in the customized environments (ReasoningBank-style), equip the frozen policy, evaluate on held-out instances; (2) online RL: GRPO training directly in the reshaped environments.

## Results

Five benchmarks in four domains: ALFWorld (embodied), WebArena (web), SWE-bench Verified (SWE), OfficeQA and SpreadsheetBench (office automation). EnvRigger and the policy share the same backbone (Gemini 3.1 Flash-Lite or 3.5 Flash), so gains are not distillation from a stronger model.

- **Skill learning**: EnvHarness beats both original environments and domain-specific generation pipelines everywhere, up to +9.0 points (ALFWorld OOD, 70.4 vs 61.4). SWE-bench Verified 52.58 vs 49.88 for original-env skills with 9.8 percent fewer steps (49.6 vs 55.0; static-env skills actually lengthen trajectories, and on SpreadsheetBench they fall below the no-skill baseline). Beats purpose-built SWE-smith by 2.46 points, GenEnv by 5.7 avg on ALFWorld, and VeriEnv by 2.0 avg on WebArena.
- **RL**: GRPO on Qwen3-8B-base trained purely in EnvHarness environments beats training in the originals on 3 of 4 metrics (ALFWorld in-dist 87.9 vs 81.4; WebShop score 79.2 vs 75.6), i.e. the reshaped envs are a genuine standalone optimization signal, not just auxiliary data.
- **Scaling**: under an identical environment budget on SWE-bench Verified, EnvHarness climbs 47.67 to 54.79 at 300 environments and is still rising, while original envs (52.13) and SWE-smith generated envs (50.37) flatten. The key mechanism is co-evolution: each batch is synthesized against the current, already-improved policy.
- **Chain**: Chain-derived skills cut average steps from 53.58 to 41.96; combined Stage/Contract + Chain skills give the best of both (SR 54.30, AS 43.12).
- **Cross-model**: consistent +2.7 to +3.7 absolute over original-env skills across Gemini 3.1 Flash-Lite, Qwen3.6 27B, Gemini 3.5 Flash, and Claude Sonnet 4.6 (base rates 30.7 to 67.2), so the loop neither breaks on weak policies nor saturates on strong ones.

## Why it matters

Environment supply is emerging as the bottleneck for agent training the way data curation was for pretraining, and this paper reframes it: environment construction becomes a wrapping problem rather than an authoring problem. Wrapping keeps the one thing generation pipelines cannot reliably produce, a trusted verifier, and the interface-level design makes one implementation domain-agnostic. The task-policy-conditioned angle matters most for RL practitioners: it is essentially automated curriculum design driven by black-box behavioral diagnosis, and the scaling result (targeted environments keep paying off after static and generated ones flatten) suggests policy-environment co-evolution is the right axis to scale, not raw environment count. The agent-harness analogy is also a memorable design lens: freeze the expensive artifact, customize through plug-ins at the interface.

## Connections

- [DeepSeekMath / GRPO](../2024-02_deepseekmath-grpo/): the RL algorithm used in the online-RL experiments
- [DeepSeek-R1](../2025-01_deepseek-r1/): RLVR lineage; EnvHarness preserves verifiable rewards by keeping original verifiers
- [Agent Skills](../2026-08_agent-skills/): the skill abstraction EnvHarness feeds via ReasoningBank-style extraction, and the agent-harness side of the paper's central analogy
- [ReAct](../2022-10_react/): the basic agent interaction loop being trained
- Broader lineage: unsupervised environment design and curricula (PAIRED, Prioritized Level Replay, POET), environment generation (SWE-smith, SWE-Gym, GenEnv, InSTA), self-evolving agents (Voyager, Reflexion, ReasoningBank)
- Topics: `topics/rl` (RL for LLM agents, curricula), `topics/llm-training-and-post-training` (agent post-training, RLVR)
