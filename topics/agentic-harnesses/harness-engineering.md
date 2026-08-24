# Harness engineering: the transferable layer

*Updated: 2026-08-24*

## Best resources

- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents): the "simple loops beat frameworks" argument that set the field's direction
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): compaction, note-taking, subagents as the three levers
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): initializer/coding/verification loop for multi-hour work
- [Anthropic: Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents): tool-design principles with eval evidence
- [SWE-agent paper](https://arxiv.org/abs/2405.15793): the ACI results quantifying interface effects
- [Terminal-Bench](https://www.tbench.ai/leaderboard): agent+model pairs as leaderboard rows; the public dataset for harness effects

A harness is: a loop, a context policy, a toolset, a permission model, and a verification
strategy. This file is the engineering that transfers whether you use Claude Code or build
your own on the Agent SDK or the frameworks in
[../agentic-frameworks/](../agentic-frameworks/summary.md).

## 1. The agent loop

Every serious harness is the same while-loop: model emits tool calls, harness executes,
results append, repeat until no tool calls. Design decisions that differentiate:

- **Single-threaded main loop** (Claude Code) for debuggability; parallelism pushed to
  explicit subagents/teams rather than a DAG of cooperating agents.
- **Interruptibility**: mid-turn steering (message queueing, Esc-to-redirect) is a harness
  feature, not a model feature, and is a large share of perceived quality.
- **Deterministic apply layer**: parse model edits (diff / search-replace / structured tool
  args), validate (lint, syntax check), retry malformed output automatically. Aider's edit
  formats and SWE-agent's lint-gated edits are the reference designs.
- **Error recovery**: truncate huge tool outputs, surface exit codes plainly, make failure
  observable to the model instead of crashing the loop.

## 2. Context management

The context window is the scarce resource; "context engineering" replaced prompt
engineering as the discipline. The lever stack:

- **Curation before generation**: system prompt at the "right altitude" (heuristics, not
  hardcoded if-else logic); load memory files (CLAUDE.md/AGENTS.md/GEMINI.md) small; defer
  everything else.
- **Progressive disclosure**: skills load name+description until invoked; MCP tool schemas
  can be deferred and searched; agents read file excerpts before whole files.
- **Compaction**: near the limit, summarise the transcript (preserve decisions, unresolved
  bugs, implementation state; discard stale tool output) and reinitialise. Tune the
  compaction prompt for recall first, then precision. Cheap first pass: clear old tool
  results before summarising anything.
- **External memory / note-taking**: todo lists, scratchpad files, NOTES.md persisted
  outside the window and reloaded; survives compaction and sessions.
- **Sub-agent isolation**: exploration happens in a disposable context; only conclusions
  return. This is the main legitimate use of multi-agent patterns in coding harnesses.
- Long-horizon extension: for multi-hour autonomous runs, structure the work as
  initializer -> incremental feature loop -> verification, with state files and clean
  environment resets between sessions.

## 3. Tool-call design (ACI)

Tools are an interface for a model, designed like UX for a very literal user:

- Few, self-contained, unambiguous tools beat many overlapping ones; consolidate
  (one `search` with flags, not five variants).
- Token-efficient output: concise, high-signal results; pagination/truncation defaults;
  "no output" must be explicit ("0 matches") because silence confuses models.
- Prescriptive descriptions with examples and edge-case guidance; the description is
  prompt engineering.
- Validation inside the tool: reject broken edits with actionable errors (lint-on-edit);
  guardrails only where false-positive rate is ~0.
- Evaluate tools with agentic evals, and let an agent rewrite its own tool descriptions
  (Anthropic reports agents optimising their own tools beat human-written versions).

## 4. Permissions and sandboxing

The spectrum, roughly increasing isolation:

1. **Approval-per-action** (Cline diff approval, Claude Code default ask).
2. **Policy allowlists**: settings-file rules per tool/command pattern; per-agent
   permission matrices (OpenCode, Roo modes).
3. **App-layer guards**: hooks that block writes outside the repo, redact secrets.
4. **OS sandboxing**: Codex's kernel-level default (Seatbelt on macOS, Landlock+seccomp on
   Linux: filesystem write scoping + network deny); Claude Code sandboxed bash similar.
5. **Full VM isolation**: cloud agents (Jules, Codex cloud, Claude cloud sessions,
   OpenHands runtime) where `--yolo` autonomy is safe because blast radius is the container.

Design rule: autonomy and isolation must rise together. Prompt-injection via fetched web
content or tool outputs is the threat model that makes network egress control matter.

## 5. Planning modes and verification

- **Plan/act split** is universal now (Claude Plan Mode, Cline Plan/Act, Copilot Plan):
  a read-only phase producing an approved plan document; cheap insurance on long tasks.
- **Todo/task lists as visible state** keep multi-step work on track and give the human a
  supervision surface.
- **Verification is the real bottleneck**: harnesses win by closing the loop (run tests via
  Stop hooks, launch the app, browser-use screenshots, Antigravity's reviewable artifacts).
  An agent that can check its work converts model capability into reliability.
- **Best-of-N** (Codex `--attempts`, Cursor multi-model fan-out) trades tokens for quality
  when verification is cheap.

## 6. Memory

Layers, shortest-lived first: context window -> compaction summaries -> session resume
(`--continue`, checkpoints/rewind) -> repo memory files (CLAUDE.md/AGENTS.md hierarchy) ->
explicit memory tools/auto-memory directories -> org-level shared skills/plugins.
AGENTS.md emerged as the cross-vendor convention for repo memory. Keep always-loaded
memory tiny; push the rest behind retrieval or skills.

## 7. Benchmarks, and why harness quality moves scores

- **SWE-bench Verified**: 500 human-validated real GitHub issues; resolve rate. Frontier
  models cluster at 95%+ by Aug 2026: saturated, and contaminated-ish; still the
  standard reference. Variants: SWE-bench Pro (harder, contamination-resistant),
  Multilingual, SWE-rebench (continuously refreshed).
- **Terminal-Bench 2.0/2.1**: ~89 hard containerized terminal tasks (builds, DevOps,
  debugging); crucially the leaderboard row is **agent + model**, making harness effects
  visible: the same GPT-5.x-Codex scored ~57.5% under the neutral Terminus 2 scaffold vs
  ~64.7% under OpenAI's own Codex CLI (~7 points from harness alone).
- Studies in 2026 (Harness-Bench and similar) find 10-22 point SWE-bench swings across
  scaffolds on identical weights. Mechanism: the harness determines what the model can
  observe (repo context quality), express (edit format success rate), recover from (error
  feedback), and verify (test execution): each stage multiplies through a long trajectory.
- Consequences: vendor-reported scores are model+harness claims, not model claims; compare
  under a fixed scaffold (Terminus, mini-SWE-agent) for model ability, and fix the model to
  compare harnesses. Meanwhile mini-SWE-agent's ~65% with bash-only shows strong models
  need little scaffold on short tasks; harness engineering pays off mainly on long-horizon,
  underspecified, or safety-constrained work.

Cross-links: products in [summary.md](summary.md); Claude Code specifics in
[claude-code.md](claude-code.md); benchmark taxonomy in
[../benchmarks/](../benchmarks/summary.md); MCP in [../protocols/](../protocols/summary.md).
