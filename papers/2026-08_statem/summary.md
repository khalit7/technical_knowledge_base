# StateM: Reaching 95.3% Raw Accuracy, or a $15 Frontier Run, on Terminal-Bench 2.1 via Harness Scaling

⏱ 11 min read · +~1h resources

- **Authors/lab**: Ziheng Qin, Yaxin Lu, Zhangyang "Atlas" Wang, Kai Wang (independent work done in the authors' personal time; Ziheng Qin and Yaxin Lu are equal-first)
- **Date**: August 2026 (arXiv v1, 2026-08-15)
- **Links**: [arXiv 2608.15089](https://arxiv.org/abs/2608.15089) (~45 min) | code and runtime cases open sourced on GitHub (linked from the abstract) | [Terminal-Bench 2.1 submission PR #142](https://github.com/harbor-framework/terminal-bench-2-1/pull/142) (~15 min)

The paper names and systematically tests **harness scaling**: improving the stateful control layer around a fixed agent instead of the model. A YAML state-machine runbook wrapped around Codex takes GPT-5.5 from 83.1% to 92.1% on Terminal-Bench 2.1 (a model-generation-sized gain with frozen weights), transfers unchanged to GPT-5.6 Sol xhigh for a 95.3% raw public submission, and, after ~$37 of adaptation, lets DeepSeek-V4-Flash match the reported GPT-5.6 Sol max score with about $15 of final-evaluation API spend versus $574.68 for the GPT reference.

## Best resources

- Paper is two weeks old; no good external explainers yet. The arXiv abstract plus Figures 1 (control-layer design space), 2 (runbook anatomy), and 5 (cost-accuracy frontier) are the fastest path in.

## Problem

Long-horizon CLI agents fail even when the model can solve every constituent step: they lose track of mutable state, drift from their plan, skip known checks, repeat lessons already learned in earlier runs, or stop early and self-declare completion. The dominant fix is more model (pretraining, post-training, test-time reasoning, extra agents). The authors ask the orthogonal question: how much apparent model failure is actually failure of the harness that maintains state, constrains execution, verifies progress, and recovers from errors?

Two operational hypotheses motivate an external control layer: **control-signal dilution** (the plan and its completion criteria get buried under an ever-longer trace) and **mutable-state ambiguity** (current state must be reconstructed from an append-only history instead of read from an authoritative record). Existing options sit at the wrong points of the design space: graph runtimes (LangGraph, StateFlow) give strong control but developer-owned orchestration that decomposes the agent into node-local calls; CLI agents (Codex, Claude Code) keep autonomy but their plans, TODO lists, memory files, and hooks never form one authoritative, transition-aware control surface.

## Method

**StateM runtime.** A lightweight agent-native runtime for CLI agents. A versioned YAML **runbook** defines a directed state machine B = (S, s0, S_T, E, Phi): phase-level states (plan, execute, verify, repair, handoff), permitted transitions, and per-state prompts, hooks, checks, and repair routes. The agent operates it through its ordinary CLI action space (inspect state, request `goto`, examine failed conditions, review history); the user can read, edit, version, and audit the same artifact. Two principles:

- **States are context-and-contract boundaries.** Entering a state runs an `in_hook` that refreshes phase-local instructions and durable progress (fighting dilution); leaving requires the `before_transfer` checks to pass (an agent's declaration of done is not verification). An `out_hook` persists progress and receipts.
- **Checked, logged, recoverable transitions.** Every `goto` runs a six-step protocol: edge exists, source checks pass, out_hook, edge guards, commit-with-history, target in_hook. Failed pre-commit checks keep the run in the source state for inspection and repair. Checks carry graded evidentiary strength: `command`/`predicate` (host-verified, reproducible), `manual` (human decision), `checklist`/`message` (structured self-attestation), `llm_review` (semantic judgment, not deterministic proof).

Per-run mutable state (current state, transition history, check outcomes, evidence references) lives outside the runbook, so one profile serves many concurrent runs and a restarted agent resumes from an explicit phase rather than a transcript. Host-level stop hooks for Codex/Claude Code refuse premature termination when obligations are unmet, enabling e.g. a 22-hour unattended development run.

**Failure-driven harness optimization.** After runs, failures are classified into three gaps: **epistemic** (needed knowledge not active; fix: state-local in_hook context), **procedural-compliance** (known procedure incompletely followed; fix: checks, transition guards, evidence requirements), **procedural-memory** (lesson from a past run not reactivated; fix: versioned prompts, checks, activation rules). A hyper-agent plus human "golden rules" (prefer minimal reusable control, route from visible task semantics not task identity, separate development feedback from frozen evaluation) turn selected failures into new runbook versions. Design rule stated bluntly: experience must be filtered before it becomes memory; more remembered procedure is not better memory (BusinessBench improves when profiles get thinner or replaced by the right invariants).

**Evaluation regimes.** Four transfer tests of increasing distance: fixed-model lift, frozen cross-generation transfer (GPT-5.5-developed profile applied untouched to GPT-5.6), adapted cross-provider transfer (DeepSeek-V4-Flash), and held-out task generalization (BusinessBench, per-family profiles frozen before one-shot held-out evaluation). Profile development may only use visible task specs, workspace artifacts, and observable execution feedback; never hidden tests, verifier internals, or task identifiers as routing keys.

## Results

- **Fixed model (GPT-5.5 xhigh)**: 83.1% -> 92.1% on Terminal-Bench 2.1 (89 tasks x 5 trials), 88/89 tasks solved at least once; numerically above the 91.9% GPT-5.6 Sol Ultra reference. The harness gain (+9.0) exceeds the observed model-generation shift (83.1 -> 84.9 for GPT-5.5 -> 5.6 under the reference harness).
- **Frozen transfer**: the same runbook on GPT-5.6 Sol xhigh gives 424/445 = 95.28% raw accuracy (95.3% at one decimal) in a public submission, vs 84.9% reference, with every task solved at least once; it also lifts GPT-5.6 Luna 76.7% -> 85.4%. Disclosure caveat: the submission PR is unmerged; scoring 4 review-flagged trajectories as zero gives 94.38%, all nine flagged gives 93.26%; submission-reported model cost is $1,062.95 over 1.178B tokens.
- **Adapted cross-provider (DeepSeek-V4-Flash)**: frozen GPT profile fails to transfer exactly (82.7% -> 82.0%), but $37.02 of adaptation reaches 392/445 = 88.09% under standard timeouts, 89.09% on the 88-task common core, and a descriptive 88.8% full-suite aggregate (extended timeout on one latency-bound task) matching the reported GPT-5.6 Sol max score. Final-score evidence cost: ~$15.20, roughly 1/38 of the $574.68 GPT-5.6 Sol max submission; total DeepSeek spend $52.22. Transfer follows model distance: exact profiles move within a family, structure and principles move across providers.
- **BusinessBench (Codex + GPT-5.6 Luna, 405 treated instances, 6 families)**: frozen one-shot held-out macro +0.55, micro +1.34; the two mechanism-matched families jump +10.04 macro (Budget Approval +12.21, Machine Operating +9.21). Negative transfer on RefactorBench (-2.78) and WooCommerce (-3.70) traces to control bound at the wrong boundary; corrected profiles recover both in post-evaluation matched reruns. Lesson: harness generalization follows mechanism match, not task diversity, and abstention (attendance-payroll) can be the correct control decision.
- Task-level evidence (Table 3): the biggest wins cluster at consequential boundaries; e.g. configure-git-webserver goes 0/5 -> 5/5 purely because handoff is gated on a fresh clone-commit-push-curl consumer-facing proof.

## Why it matters

- **A named, testable axis orthogonal to model scaling.** In these settings the model is explicitly "not the (main) bottleneck": the same weights complete far more jobs when state, checks, and recovery are externalized and enforced. For anyone building agent harnesses this is the strongest quantified argument yet that runtime engineering is a first-class capability lever.
- **Changes deployment economics.** A ~$52 adaptation campaign moved a cheap model to the reported frontier score at ~1/38 the evaluation cost; "buy the strongest model" now competes against "invest in the harness".
- **A concrete middle point in the control design space**: enforceable state transitions plus broad agent autonomy plus a control artifact jointly editable by agent and user, versus soft plans (no enforcement) or developer-owned graphs (no autonomy). The graded check taxonomy (host-verified vs self-attested vs llm_review) is directly reusable in any harness design.
- **Honest transfer boundaries**: exact controls transfer within a model family only; across providers and task families you transfer the method (runbook structure, golden rules, failure-driven loop) and re-derive the practices. Negative transfer results and the adjudication caveats are disclosed rather than buried.

## Connections

- **Benchmarks**: Terminal-Bench 2.1 (primary), BusinessBench (task-family generalization); adjudication and submission-pipeline mechanics are a good case study for [topics/benchmarks](../../topics/benchmarks/summary.md).
- **Agentic harnesses**: builds on and contrasts with Codex and Claude Code control fragments (plans, memory files, hooks); the stop-hook integration targets both. See [topics/agentic-harnesses](../../topics/agentic-harnesses/summary.md).
- **Orchestration frameworks**: StateFlow (state-driven execution) and LangGraph (durable graph runtimes) provide the capabilities StateM reorganizes around the agent instead of around a developer controller; relevant to [topics/agentic-frameworks](../../topics/agentic-frameworks/summary.md).
- **Harness adaptation line**: Agentic Harness Engineering, Life-Harness, Self-Harness, and Better Harnesses, Smaller Models (Yang et al. 2026, the BusinessBench source); AgingBench for longitudinal agent reliability, which StateM treats as complementary (within-run control vs lifespan diagnostics).
- **In this repo**: [2026-08_envharness](../2026-08_envharness/) and [2026-08_agent-skills](../2026-08_agent-skills/) sit in the same harness-over-model wave; the runbook-as-procedural-memory idea also connects to skills-as-files in agent harnesses.
