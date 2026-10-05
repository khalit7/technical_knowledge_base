# Reading tab: visual ideas

Central question: you have a model API and a job to automate; what do you build it from, and what does each choice buy and cost?

## Built
| Idea | Why it earns its place | Data |
|---|---|---|
| Layer map (click a layer) | the four layers and their relation in one picture, each linked to its section | text |
| Ownership axis: five positions, nine pieces, who writes each (you, library, vendor) | the topic's one axis made concrete; turns "framework" from a word into a list of jobs | this page's reading of each library's docs, labelled as such |
| Who picks the next step (before/after on the same input): chain steps (code or model) against the free agent's tool calls, lit together | the workflow/agent definition shown on real recordings, not timing (the Orchestration lab owns timing) | orch/recordings chain and agent |
| Structured output before/after on the same request: prompt-only JSON (fenced, json.loads fails) against --json-schema (StructuredOutput tool, parsed object) | a real failure and its fix, with token and turn cost of the fix | read/recordings A and B (2 runs, 6 Oct 2026) |
| One agent against lead + 2 subagents, bars with a metric switch | the multi-agent multiplier on the same input, next to the published 4x/15x | orch/recordings agent and multi |
| Stream records to spans stepper | shows what a trace is by building one from a real stream; teaches that streamed usage is placeholder and the result record holds the counts | read/recordings B |
| Memory: three stores on one illustrative fact change | what each style keeps, side by side | illustrative, labelled |
| Decision chart (five questions, printed rules) | "how to choose" as stated rules, not a black box | rules in the JS |

## Rejected
- Pattern replay, durable-execution replay, multi-agent lanes: owned by the Orchestration lab; linked.
- Prompt-inflation animation: owned by the Same agent tab; numbers quoted once in s2.
- Gateway error-trace simulator, OTel trace tree of a full agent run, memory before/after answers: owned by the Production stack tab.
- A retry demo (schema violation fed back): could not be provoked reliably in one or two runs; ModelRetry is shown on the Same agent tab.
- A framework popularity chart (downloads, stars): no sourced series fetched; would not answer the central question.

## What the methodology lacked
Nothing published to reproduce; the recordings are the primary data. The equivalent check is `check_read.py`: the page embeds data regenerated from the redacted recordings, and every measured number typed in prose matches it.
