# Visualisation ideas: Personal agents (child of Topic: agentic-harnesses)

Built 2026-10-06. Scores: teaching value / data honesty / cost to build, each out of 5.

## Built
1. **One day, two shapes** (Reading 1; 5/4/5). The same six events met by an invoked harness and by a resident agent, two lanes on a time axis, step by step with counters (handled on arrival, runs with nobody watching, waiting, never handled). Illustrative schedule, labelled as such; it teaches the "invoked vs resident" idea before any detail. Before/after on the same input.
2. **The same correction, four ways** (Reading 4; 5/5/4). Real recordings: steer vs follow-up x gate on vs off on one request plus one mid-run correction, Haiku (3 runs for the no-gate cells) and Sonnet; chips per action coloured by class, the incoming message placed where the harness delivered it, outcomes at the end (sent, held, drafted). The strongest piece of evidence on the page: follow-up without a gate sent the booking in 4 of 4 runs, steer in 0 of 6.
3. **Who decides to look** (Reading 5; 5/5/5). Bars: four history configurations x model, graded right/wrong, every answer listed with what the gateway retrieved. Shows "the model never searches" and "retrieval missed the deciding line" as real failure modes.
4. **Old page, claim by claim** (Reading 10; 4/5/5). Filterable table from src/old_claims.json.
5. **A day, replayed** (tab; 5/5/3). Step player over the two recorded days: model text, action, class, gate decision, and the fake world's state (calendar, approval queue, sent, drafts, staged memory, refused, undo log) as it changes.
6. **Gate designer** (tab; 4/4/4). Policy grid (class x trigger origin) applied to all 64 proposed non-read actions; counters for irreversible actions done unasked, known-wrong actions executed, approvals asked, refused. Presets; "This page's gate" reproduces all 45 recorded gate-on decisions (src/check.py). Distinct from Agent security's gate tabs, which are about shell-command rules.

## Rejected
- Star-history chart for OpenClaw and Hermes: no primary dated series (GitHub API gives only the current count; growth claims unconfirmed). Rejected as unsourceable.
- OpenRouter token-volume chart: only rolling windows; one day's ranking quoted in prose instead.
- CVE timeline chart: ~680 OpenClaw keyword hits in NVD include noise and the count is not a measure of risk; a dated table of the incidents that teach something was chosen instead.
- Running the real OpenClaw or Hermes Agent to record their prompts and tool lists: the session's permission policy refused installing them (untrusted code from the internet). Would be the best next addition, with fake accounts only.
- Local model (Qwen3-4B on mlx-lm) runs of the same scenarios: the shared server's generation thread died while batched with other agents' long prompts (HTTP 404 "generation thread died"); not restarted (not ours). Recorded with Claude only.
- Animated injection examples: out of scope (defensive and conceptual only; Agent security owns the threat model).

## What the methodology lacked
Nothing for a page about a product category with no published benchmark; the "build a toy that completes something published" rule became "build a small agent and record the mechanisms the docs describe" (steering, memory tiers, gating), with every recorded claim checked by src/check.py.
