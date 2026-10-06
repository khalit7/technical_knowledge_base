# Visualisations: built and rejected

What the text needs to be understood: what fills one request and in what order; why order decides the cache bill; how big tool outputs become small; what compaction does to a session and what it loses; what a skill costs against a memory file; what a subagent keeps out of the parent; how recall changes with length.

## Built (score out of 10 for teaching value, real data, interactivity)
1. **Compaction call by call, before/after (Reading s4, Compaction lab)**: 9. One column per real model call, to scale, play/pause/step/scrub/speed, captions from the recording (user message, tools, compaction event); toggle between a compacted session and the uncompacted control of the same task, and the automatic big-history pair. The mechanism replaced (unbounded growth) against the one that replaced it (summary and restart) on the same task, which is the DeepSeek MLA before/after pattern this knowledge base asks for. Starts at the last call under reduced motion.
2. **Cache simulator (Cache lab)**: 9. The documented rules (order, breakpoints, 20-position lookback, minimum length, lifetimes, prices) applied block by block to a session you configure; animated call by call with the request drawn as blocks coloured read, written or fresh; cumulative cost with and without caching. Checked against the eleven recorded one-call runs: the read boundary reproduces by construction for the static run and independently for the three others.
3. **Recorded cache placement (Reading s2)**: 8. Eleven real calls as stacked bars with their input-side cost: the clearest single picture of "volatile last".
4. **Tool-output policies on one log (Reading s3)**: 8. Measured tokens on a log scale with a dot for whether the five relevant lines survived.
5. **Window budget switcher (Reading s1)**: 7. Six recorded `/context` breakdowns as one stacked bar each.
6. **Skill against CLAUDE.md (Reading s5)** and **subagent isolation (Reading s6)**: 7 each. Simple bars of measured startup context and of main window, subagent window and total processed.
7. **Needle grids (Needle lab)**: 7. Graded cells per task, depth or seed, and length, click for the reply; two models.
8. **Summaries verbatim with fact chips (Compaction lab)**: 8. The text the next model call is told to continue from, with the three headings that matter highlighted.

## Rejected
- A re-implementation of the parent's budget model or startup-context bars: the Trace and context lab owns them; linked instead.
- A toy compaction animation with an illustrative window: the parent already has one; this page forced real compactions instead.
- A heatmap of needle depth against length in the classic Kamradt style for Haiku: all green at these lengths, so it would say nothing; the grid keeps tracking seeds, where the failures are.
- A token-by-token tokenizer view: interesting (the same log is 228K tokens to Haiku 4.5 and 305K to Sonnet 5.5) but not central; one sentence carries it.
- A live cost calculator for compaction: one measured table says more than a model with guessed inputs.

## Data and formulas
- Input-side cost: fresh x $1 + 1-hour write x $2 + read x $0.10 per million tokens (Haiku 4.5 list prices, FACTS.md, platform.claude.com pricing read 5 Oct 2026).
- Hidden compaction call (automatic run): session `modelUsage` input minus the sum of the streamed calls before the first result record.
- Policy token counts: input tokens of a one-call Haiku session with the text as prompt minus the same with a one-character prompt (529).

## What the methodology lacked here
Recorded agent sessions are paths, not samples: a before/after on "the same input" means the same task, not the same trajectory. Every pairing here says so on the chart.
