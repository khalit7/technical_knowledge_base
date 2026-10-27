"""Transcribe the paper's tables (printed precision kept) and join the leaderboard extract.
Sources: arXiv 2608.15089v1 LaTeX source (aw_exp.tex, main_arxiv.tex), PDF pages given per table.
usage: python3 mk_tables.py   (build.sh runs it; writes tables.json)"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = {}
T['t4'] = {'title': 'Table 4: Terminal-Bench 2.1 system-level results and transfer regimes', 'page': 25,
  'cols': ['System', 'Result source / profile status', 'Evaluation scope', 'Score', 'Five-trial coverage'],
  'rows': [
   ['GPT-5.5 xhigh + Codex', 'Published reference', '89 tasks, 445 trials', 83.1, 'not reported', 'ref', 'gpt55'],
   ['GPT-5.5 xhigh + StateM', 'Our developed profile', '89 tasks, 445 trials', 92.1, '88/89', 'ours', 'gpt55'],
   ['GPT-5.6 Sol xhigh + Codex', 'Published reference', '89 tasks, 445 trials', 84.9, 'not reported', 'ref', 'sol'],
   ['GPT-5.6 Sol xhigh + StateM', 'Frozen GPT profile; public submission', '89 tasks, 445 trials', 95.28, '89/89', 'ours', 'sol'],
   ['GPT-5.6 Luna + Codex', 'Published reference', '89 tasks, 445 trials', 76.7, 'not reported', 'ref', 'luna'],
   ['GPT-5.6 Luna + StateM', 'Frozen GPT profile', '89 tasks, 445 trials', 85.4, 'not reported', 'ours', 'luna'],
   ['DeepSeek-V4-Flash', 'Our baseline', '89 tasks, standard timeout', 82.7, '', 'base', 'ds'],
   ['DeepSeek-V4-Flash + StateM', 'Frozen GPT profile', '89 tasks, standard timeout', 82.0, '', 'ours', 'ds'],
   ['DeepSeek-V4-Flash + StateM', 'Adapted profile', '89 tasks, standard timeout', 88.09, '392/445 trials', 'ours', 'ds'],
   ['DeepSeek-V4-Flash + StateM', 'Adapted profile', '88-task common core', 89.09, '392/440 trials', 'ours', 'ds'],
   ['DeepSeek-V4-Flash + StateM', 'Adapted profile; descriptive aggregate', '89 tasks, one extended-timeout task', 88.76, '395/445 trials', 'ours', 'ds']]}
T['t3'] = {'title': 'Table 3: Representative Terminal-Bench 2.1 task-level improvements for GPT-5.5', 'page': 17,
  'cols': ['Task', 'Codex CLI', 'StateM-Codex', 'Associated StateM control'],
  'rows': [['configure-git-webserver', 0, 5, 'Service/deploy state and consumer-facing verification'],
   ['dna-insert', 0, 5, 'State-local biological and primer contract checks'],
   ['dna-assembly', 1, 5, 'Transition gate for primer, Tm, and assembly invariants'],
   ['filter-js-from-html', 0, 4, 'HTML/script extraction boundary checks and negative controls'],
   ['db-wal-recovery', 2, 5, 'Preflight preservation before destructive consumers'],
   ['sanitize-git-repo', 4, 5, 'Modification-range verification'],
   ['protein-assembly', 2, 5, 'Constraint checklist and self-review'],
   ['pypi-server', 3, 5, 'Service-lifetime and readiness gate'],
   ['install-windows-3.11', 3, 5, 'VM setup and lifecycle completion'],
   ['pytorch-model-recovery', 3, 5, 'Task-visible model evidence'],
   ['qemu-alpine-ssh', 2, 4, 'Service readiness and repeated consumer check'],
   ['extract-moves-from-video', 0, 2, 'Candidate-first bounded refinement']]}
T['t1'] = {'title': 'Table 1: Frozen one-shot BusinessBench results with Codex + GPT-5.6 Luna', 'page': 15,
  'cols': ['Scope / task family', 'Codex CLI', 'StateM-Codex', 'Delta (printed)'],
  'groups': [['Frozen one-shot aggregate results', [['Held-out, family macro', 84.67, 85.22, 0.55], ['Held-out, instance micro', 84.44, 85.78, 1.34], ['Development', 86.07, 91.71, 5.64], ['All StateM-treated', 84.76, 88.72, 3.96]]],
   ['Exploratory mechanism-matched held-out subgroup', [['Budget Approval + Machine Operating, family macro', 71.91, 81.94, 10.04]]],
   ['Frozen Round-1 family aggregates', [['budget-approval', 62.91, 75.12, 12.21], ['machine-operating', 90.79, 100.00, 9.21], ['refactorbench', 80.56, 77.78, -2.78], ['webarena', 88.00, 92.00, 4.00], ['webtest', 98.25, 98.75, 0.50], ['woocommerce-stock', 92.59, 88.89, -3.70]]],
   ['Abstention control, excluded from StateM aggregates', [['attendance-payroll', 88.43, None, None]]]]}
T['t2'] = {'title': 'Table 2: Post-evaluation diagnostic validation after selective profile refinement', 'page': 16,
  'cols': ['Post-evaluation validation scope', 'Codex / prior arm', 'Refined StateM', 'Interpretation'],
  'rows': [['Held-out, instance micro', None, 86.67, 'Selectively refined aggregate'], ['Development', None, 92.21, 'Selectively refined aggregate'], ['All StateM-treated', None, 89.42, 'Selectively refined aggregate'],
   ['refactorbench, overall', 76.39, 79.17, 'Matched rerun'], ['refactorbench, development', 75.00, 80.56, 'Obligation-and-closure profile'], ['refactorbench, reused held-out', 77.78, 77.78, 'No held-out change'],
   ['webtest, overall', 99.75, 99.75, 'Saturated'], ['webtest, development', 100.0, 100.0, 'Saturated'], ['webtest, reused held-out', 99.5, 99.5, 'Saturated'],
   ['woocommerce-stock, overall', 86.42, 90.12, 'Invariant-matched profile'], ['woocommerce-stock, reused held-out', 85.37, 90.24, 'Invariant-matched profile']]}
T['t5'] = {'title': 'Table 5: Generalized BusinessBench workflow controls distilled into StateM', 'page': 26,
  'cols': ['Abstract failure mode', 'Generalized StateM control', 'Enforcement and evidence', 'Main applications'],
  'rows': [
   ['Phase and side-effect leakage', 'Separate read-only discovery and planning from execution. File edits and external mutations are permitted only after the task-derived plan is ready.', 'Workspace snapshots and read-only locks enforce the phase boundary; subsequent scope checks compare against the active task workspace.', 'RefactorBench, WebTest, side-effect workflows'],
   ['Arithmetic and dependency drift', 'Route consequential arithmetic through exact-decimal tools, separate numeric inputs from narrative metadata, and reconcile derived values before acting.', 'Compact calculation templates record task-visible operands, operations, units, rounding, and independently checked outputs.', 'Budget approval, payroll, machine operations'],
   ['Missing, duplicated, or partial effects', 'Use a task-derived effect manifest followed by execute and fresh-read reconciliation. Every mandatory effect must succeed exactly once before handoff.', 'Structured receipts compare declared, attempted, succeeded, failed, and freshly observed effects; optional effects remain explicitly distinguishable.', 'Budget approval, WooCommerce, WebArena'],
   ['Cross-destination entity mismatch', "Freeze one global task-derived entity set, then derive each destination's write delta from its observed state and selected write mode.", 'Batch closure checks submitted, succeeded, failed, and observed entity IDs, cardinality, deduplication, and destination-required fields.', 'WooCommerce and other multi-sink workflows'],
   ['Bulk-data distortion and context bloat', 'Keep tables and repeated records at the tool or file boundary instead of repeatedly transporting them through the dialogue context.', 'Batch tools consume structured inputs and return compact counts, aggregates, errors, and receipts rather than full payloads.', 'Machine operations, payroll, commerce workflows'],
   ['Transient versus deterministic failure', 'Retry only failures classified as transient, with a bounded retry budget; do not retry contract, validation, or deterministic task failures unchanged.', 'Each retry uses fresh state where necessary and is followed by a public fresh-read check. Terminal errors remain explicit incomplete outcomes.', 'All tool-using families and benchmark runner'],
   ['Service and session persistence', 'Ensure required services survive the agent command session and verify them through a fresh client or authenticated round trip.', 'Readiness depends on observable behavior, stable process ownership, and post-action state rather than fixed sleeps or shell-local process existence.', 'WebArena, WebTest, machine operations'],
   ['Visible-contract and scope drift', 'Prioritize visible-contract fidelity and required reference closure; compatibility is preserved only with visible evidence, and minimality is a tie-breaker rather than the primary objective.', 'Read-only contract extraction, task-derived edit scope, focused public tests, and a final repository-wide stale-reference scan.', 'RefactorBench and repository maintenance'],
   ['Ambiguous API migration', 'Prefer named keyword arguments when the visible contract names a parameter, and prefer direct symbol imports when consistent with the requested migration.', 'These are soft defaults. Positional-only APIs, cycles, lazy or optional imports, monkeypatching, module identity, and repository conventions override them when supported by public evidence.', 'RefactorBench and general code changes'],
   ['Incorrect test or tool boundary', 'Keep inspection physically read-only and require authored tests to use the configured evaluator-free public runner rather than an incompatible host tool.', 'The workspace unlocks only on execute; host test entry points are shadowed, while public-runner results provide the verification receipt.', 'WebTest'],
   ['Verification overhead and repeated gating', 'Generate templates and receipts at tool boundaries, advance state from validated tool events, and compress multiple checks into one evidence-bearing boundary.', 'Normal paths avoid repeated StateM round trips. A read-only reviewer runs only for elevated visible-contract risk and sufficient remaining time; unknown findings never block.', 'All families; reviewer used for RefactorBench']]}
T['lb'] = json.load(open(os.path.join(HERE, 'inputs', 'tb21_leaderboard.json')))
open(os.path.join(HERE, 'tables.json'), 'w').write(json.dumps(T, indent=1, ensure_ascii=False))
print('tables', list(T))
