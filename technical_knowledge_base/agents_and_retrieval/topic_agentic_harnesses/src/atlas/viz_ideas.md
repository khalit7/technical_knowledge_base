# Visual ideas for the Harness atlas

Central question: which harness, on which axes, and how much does that choice change what a model scores and costs?

## Built (score out of 14, methodology section 2)
1. **Atlas matrix with filters and click-through** (12): 23 harnesses x 9 axes, every cell sourced; family and property filters.
2. **Same model, different harness dumbbell** (13): five evidence sets (TB 2.0 board, TB 2.1 board, SWE-bench Verified bash-only against scaffolds and vendor figures, HarnessTax success and cost); provider, third-party, neutral and bash-only harnesses coloured; unverified rows hollow; spread column.
3. **Harness-tax before/after animation** (12): same model and task, small harness against Claude Code, real per-call tokens from two recordings, to scale, running API-price counters reproducing the CLI's cost; HarnessTax startup-context bars underneath.
4. **Edit formats, one fix six ways** (10): the running example's real fix in six formats with character counts.
5. **SFT against RL stepper** (9): the same task as a recorded trajectory and as an environment with four rollouts, rewards and GRPO advantages (illustrative rewards, labelled).
6. **Compare two, chooser with stated rules** (9), **SWE RL environment table** (8), **LEGO-RL before/after bars** (8), paper cards, drills, interview questions.

## Rejected
- A mini-SWE-agent run table beside Claude Code: the run failed under the text adapter; shown as a lesson instead.
- Re-recording Claude Code: the Trace lab already has the runs; budget cap of 8 further invocations.
- A cost-per-solve Pareto chart of HarnessTax: Agentic benchmarks owns the study; the dumbbell's cost view shows the harness share only.
- A release timeline of harnesses: first-release dates were unconfirmed for six products.

## What the methodology lacked
A rule for categorical product data that changes monthly: keep the read date per cell, show status badges (renamed, acquired, shut down) in the row, and keep tags (for filtering) apart from the sourced text (the evidence).
