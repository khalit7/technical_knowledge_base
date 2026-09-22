# Demystifying Agent Skills: Why They Work - Until They Don't

⏱ 10 min read · +~1h 20m resources

- **Authors/lab**: Zhiyuan Jiang, Fangrui Huang, Hanwen Xing, Xander Wu, Yipeng Gao, Rui Cao, Mengdi Wang, Shilong Liu, Yijiang Li (Princeton, UC San Diego, Stanford, USC, Johns Hopkins)
- **Date**: August 2026 (arXiv v1 2026-08-14)
- **Links**: [arXiv 2608.14036](https://arxiv.org/abs/2608.14036) (~45 min) | [PDF](https://arxiv.org/pdf/2608.14036) (same paper)
- Added to KB: 2026-08-24

### Best resources

- [Anthropic engineering: Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) (~15 min): the canonical description of the SKILL.md abstraction this paper dissects (progressive disclosure, folder layout, when to write one).
- [anthropics/skills (GitHub)](https://github.com/anthropics/skills) (repo, ~20 min for the README and a couple of skills): the public skill repository the paper cites as its reference skill-usage protocol; useful for seeing what production skills actually contain.

### Problem

Skills (SKILL.md-style packaged procedural knowledge, as popularized by Anthropic and now used across Claude Code, Codex, and Gemini CLI) are usually evaluated only by aggregate task success: load the skill, see if more tasks pass. That says skills matter but not why. It does not reveal what changes in the agent's behavior when a skill is loaded, which parts of execution get stabilized, why the same skill helps one task and hurts another, or whether gains come from the distilled procedure itself versus outcome labels, retrieval quality, or framework coupling. The authors ask when skills help, why they work, and where they fail, treating skill use as a controlled transformation of prior agent experience rather than a black-box prompt add-on.

### Method

**Controlled representation study (RQ1-RQ2).** For each task, collect successful and failed raw trajectories in fixed Docker environments, then build a fixed-budget composition grid over source-evidence mixtures from 5 successes / 0 failures (5s0f) through 0s5f. From the identical trajectory pool, construct two artifacts: Workflow Memory (cleaned procedural traces appended directly) and Skill (the same workflows distilled into a standardized SKILL.md). Compare three arms on matched tasks: Raw (no prior experience), Workflow Memory, and Skill. This holds the underlying experience constant and varies only its representation. A no-hint variant removes success/failure annotations during skill creation to isolate the role of outcome labels (RQ2). Skills are placed in the execution environment as reusable resources, not inlined into context, following the standard agent-skill protocol.

**Setups.** Codex + GPT-5.3-Codex and Gemini CLI + Gemini-3.1-Pro-Preview, on Terminal-Bench 2.0 (89 tasks), Terminal-Bench-Pro (200-task public split), and SkillsBench (86 tasks with native task-skill ground-truth annotations). Harbor evaluation workflow, n = 5 trials per task. RQ3 tests cross-framework transfer: artifacts built in the Codex setting are evaluated in Gemini CLI against Gemini's own Raw baseline.

**Contrastive trajectory taxonomy.** 8,135 trial records are normalized into one manifest (7,837 with transcripts). An open-coding pass over 240 sampled trajectories yields 238 valid unique labels, merged by a two-round batched LLM induction into a canonical taxonomy of 3 high-level categories and 12 modes: SC1 guided success (skill-guided, workflow-guided, autonomous), SC2 execution and verification failures (env/infrastructure, output-format/schema mismatch, background-service lifecycle, shell corruption, algorithmic logic error, static verification without runtime), SC3 invocation and boundary failures (timeout/budget exhaustion, skill guidance misapplied or ignored, capability/safety limit). The judge is Claude Sonnet 4.6 with tools disabled and fixed transcript budgets; a human check over 714 trajectory-label pairs confirms all labels, and human-vs-LLM taxonomy aggregation reaches 95.8 percent exact agreement (Cohen's kappa 0.952). The unit of analysis is a paired triple (raw, workflow, skill for the same task): 528 triples, 1,584 arm-level assignments, each with a mechanism label (procedural_anchor, knowledge_injection, failure_warning, none, counterproductive).

**Retrieval study (RQ4).** Each task gets a candidate pool containing its ground-truth skill plus k-1 real distractors (random, semantically similar, or dissimilar), k in {5, 10, 20, 50, 100}. Three independent arms: (1) embedding retrieval with Qwen3-Embedding-0.6B, (2) explicit agent selection without execution, (3) full-pool real execution with parsed skill use plus verifier outcome. Outputs are never passed between arms, so offline identification and execution-time use are measured separately.

### Results

- **Skills beat workflow memory, not just raw.** Oracle-status success: Skill 61.9 percent vs Raw 59.1 vs Workflow Memory 55.9. The robust paired effect is Skill over Workflow Memory: +6.06 points (95 percent bootstrap CI [+0.76, +11.36]). Same trajectories, different packaging; representation itself is doing the work. Lightweight compact-hint baselines (instruction-derived short plan 47.7 percent, workflow-derived test-first template 59.2) fall well below skill injection (79.2 on the same Terminal-Bench-2 subset), so the gain is not just "any short procedural hint".
- **Mechanism: procedural anchoring, not knowledge injection.** procedural_anchor accounts for 65.7 percent of skill mechanism labels vs 4.5 percent for explicit knowledge_injection. Skills stabilize action (setup order, tool sequences, intermediate checks, known pitfalls) rather than supply missing facts. Concretely, environment_infrastructure_failure drops from 5.3 percent (raw) to 0.2 with skills; output_format_schema_mismatch 7.4 to 3.2; background_service_lifecycle_failure 2.7 to 0.8. But algorithmic_logic_error and static-verification failures persist across arms: skills do not fix tasks needing reformulation or stronger runtime verification.
- **Skills create a new failure surface.** skill_guidance_misapplied_or_ignored appears in 10.0 percent of skill-arm cases (vs 0.8 raw): the skill is present and plausible but applied mechanically, out of context, or with stale assumptions. Workflow memory instead fails by process overload: timeout_budget_exhaustion in 10.6 percent of workflow cases vs 4.4 with skills and 1.7 raw, because verbose traces carry failed branches and debugging noise.
- **Outcome labels matter once failures enter the pool.** With success-only source pools, removing success/failure annotations barely hurts; with mixed pools the gap grows (Gemini on TB-2 at 3s2f: 0.7462 normal vs 0.4000 no-hint). Labels guide distillation about what to keep.
- **Transfer works.** Skills distilled from Codex trajectories improve Gemini CLI over its own Raw baseline and beat transferred workflow memory; distillation is the more portable representation.
- **Retrieval precision and task success decouple.** As pools grow 5 to 100, embedding top-1 precision falls 88.3 to 76.9 percent, agent selection 70.0 to 63.7, and parsed actual-use precision collapses 29.6 to 3.3 percent, yet downstream success stays roughly flat (36.4 to 39.3 percent averaged). Semantically similar distractors are the main stressor (top-1 on similar pools: 70.5 percent at k=5 down to 53.4 at k=100, vs 97.7 to 84.1 for random). Exact ground-truth invocation is neither sufficient nor necessary: agents succeed while invoking related non-ground-truth skills, and fail with the right skill in hand.

### Why it matters

This is the first mechanistic account of why the SKILL.md pattern works, and it directly informs how to write and manage skills for harnesses like Claude Code. Practical readings: write skills as procedural anchors (setup sequences, checklists, verification steps, pitfalls), not as fact sheets; distill aggressively rather than pasting raw session transcripts into memory, since verbose traces measurably cause timeouts; keep success/failure labels attached when generating skills from mixed experience; expect skills to transfer across harnesses; and worry less about perfect retrieval than about confusable near-duplicate skills in the library and about the agent's judgment in applying a retrieved skill. It also reframes evaluation for self-evolving agents: aggregate pass rates hide that skills trade execution-layer failures for a new class of misapplication failures, so skill pipelines need lifecycle-level evaluation (generate, retrieve, invoke, adapt), not just end-to-end success.

### Connections

- ReAct (2022-10_react): the baseline acting paradigm these agents run; skills sit on top as reusable procedural memory.
- Agent Workflow Memory (Wang et al., 2024, arXiv 2409.07429): the direct-workflow-memory representation used as the contrast arm here.
- SkillsBench (Li et al., 2026, arXiv 2602.12670) and Terminal-Bench (Merrill et al., 2026, arXiv 2601.11868): the benchmarks; SkillsBench supplies the task-skill ground truth for the retrieval study.
- SWE-Skills-Bench (Han et al., 2026, arXiv 2603.15401): marginal utility of skill documents in real SWE settings, success-rate-level; this paper adds the mechanism layer.
- Anthropic Agent Skills (2025): the skill format and usage protocol under study.
- Topics: agentic harnesses (Claude Code/Codex/Gemini CLI skill systems), agentic frameworks, benchmarks, evaluation and LLM judges (the validated LLM-judge taxonomy pipeline is a reusable pattern).
