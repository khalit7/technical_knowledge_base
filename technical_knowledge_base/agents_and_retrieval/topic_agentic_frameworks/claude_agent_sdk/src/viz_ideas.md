# Visualisation ideas: Claude Agent SDK

What the text needs a reader to see: (1) that the SDK is a second process talking JSON lines with yours; (2) the order in which a tool call is decided and where your code sits in it; (3) what each option turns into and which defaults bite; (4) what the cost fields count; (5) the connector pitfall in numbers. Every visual uses recorded data (`recordings/`, `data/numbers.json`); nothing is illustrative.

## Built (ranked by teaching value, score out of 5)
1. **Wire lab** (tab, 5). Replay of every stdin/stdout line of run s1 (83 kept lines) in two lanes, with captions, counters and the JSON body; toggle to run s3 (defaults, no callbacks: the pipe flows one way and refusals appear). Before/after on the same task, play/pause/step/scrub/speed, only on screen. Data: `wire.py` stand-in binary logs. Inspiration: the DeepSeek MLA before/after animation; sequence diagrams of protocols.
2. **Permission pipeline animation** (Reading, section 5, 5). Each recorded tool call of s1, s2 and s3 walked through the six documented stages, highlighting the stage that settled it (hook allow, your callback allow or deny, self-approval, refusal with nobody to ask), with running counters. Formula: stage chosen from the recording (hook output, callback log, refusal text). Source of the order: code.claude.com/docs/en/agent-sdk/permissions.
3. **Options lab** (tab, 5). Form over 15 options producing Python and TypeScript code, the exact command line (a port of `_build_command()` in 0.2.163), the `initialize` content, consequences tagged SOURCE/DOCS/MEASURED, and the nearest measured first-call context. Presets for five runs check the rebuilt command against the recorded one (all five match exactly).
4. **Architecture drawing** (Reading, section 1, 4). Three boxes and two pipes with the real line counts of s1; vertical layout under 560 px.
5. **Session phases** (Reading, section 2, 4). Four cards: reported (cumulative) and own cost per phase of s4, session ids, showing that totals accumulate across resume and fork.
6. **Cost bars** (Reading, section 9, 3) of all eight runs, s3 in the warning colour; and **connector bars** (3) of the six counting calls (434 to 128,306 tokens).
7. **Recordings tab** (4): run picker, stats, model_usage table with the list-price check, transcript with subagent indentation and callback events, diff, command line, connector and session-file tables.
8. **Old page claim table** (Reading, section 11).

## Rejected
- A token-by-token streaming view (`include_partial_messages`): shows Claude Code's stream, owned by the Claude Code child and the harnesses root; not specific to the SDK.
- A Python vs TypeScript side-by-side code diff tab: the Options lab's language toggle covers it in less space.
- A price-over-time chart for the SDK's model: not this page's subject (such tabs were removed elsewhere in the knowledge base).
- An animation of subagent message nesting: the Recordings tab's indented transcript of s5 shows the same with real data; an animation added little.
- Re-recording interrupts, budget stops and plan mode: already recorded on Building a harness and Claude Code, taken apart; linked instead.

## What the methodology lacked here
Nothing structural. One addition worth keeping: for a library that wraps a process, capturing the inter-process wire with a stand-in binary was the single most useful data source; the methodology's list of real data (logits, configs, templates) could name "the wire between components" too.
