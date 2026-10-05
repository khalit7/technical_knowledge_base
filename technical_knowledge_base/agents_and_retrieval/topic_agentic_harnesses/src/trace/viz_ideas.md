# Visual ideas for the Trace and context lab

Central question: what does a harness put in front of the model on each call, and what does that cost as the session grows?

## Built (score out of 14, methodology section 2)
1. **Trace viewer** (13): per-call stacked token bars to scale (cache read, cache write, fresh, output), token or price view, cumulative cost line, click-through to every message; reproduces the CLI's cost from usage in 21 of 22 runs.
2. **Caching before/after animation** (13): first eight calls of a real session, billed input per call with and without caching on the same scale, counters for tokens and dollars; Khalid's preferred before/after pattern.
3. **Budget model with validation table** (12): S, g, o, N model of context and cost; lands within 2% of 13 recorded costs (by construction for the inputs, independently for the caching arithmetic); click a run to load it.
4. **Startup-context bars** (11): six one-call runs isolate the cost of tool definitions, the Agent tool and the default tool set.
5. **Compaction before/after animation** (10): real per-call growth, toy window, summary replacing history; labelled illustrative where it is.
6. **Run-to-run dot strips** (9): Haiku, Sonnet and Haiku+CLAUDE.md, three runs each, six metrics.
7. **All-runs table, experiment cards, predict-then-reveal drills, interview questions.**

## Rejected
- Showing the system prompt text: not in the stream; cited the docs instead of guessing.
- A recorded compaction: would need a 100K+ token session for the 100K minimum `--autocompact`; too costly on a shared subscription for one picture.
- A "no caching" recording: no switch disabled caching on 2.1.289 (tried `DISABLE_PROMPT_CACHING=1`); the uncached side is derived arithmetic.
- Opus runs: not needed for any comparison here.
- Per-call output from assistant records: they carry partial counts only; per-call output comes from `message_delta` stream events instead.

## What the methodology lacked
A rule for traces: keep the configuration the harness reports (init) apart from what it actually did (per-call model, TTL), since they can disagree (plan mode answered by Sonnet).
