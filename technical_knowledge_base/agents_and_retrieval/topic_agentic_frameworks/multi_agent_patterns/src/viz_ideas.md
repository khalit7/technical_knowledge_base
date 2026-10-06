# Visualisation ideas: Multi-agent patterns

Method: html_utils/interactive-html-ideas.md section 2, and Part B of html_utils/methods/topic_pages.md. The page explains mechanisms that replaced or compete with each other (one loop against several; handoff against agent-as-tool; debate against voting), so each gets a before/after view on the same input, drawn from real recordings.

## What the text needs to be understood
1. What "who decides" and "who sees what" mean for each pattern (shapes).
2. Why a single loop fails on wide material (context growth, skipped reading) and what isolation changes, in time and in tokens.
3. What a handoff passes to the next agent compared with an agent called as a tool.
4. Why parallel writers fail (implicit decisions), concretely.
5. Whether debate beats voting at equal cost.
6. Where the money goes (fresh, written, cached, output).

## Built (ranked by teaching value)
| # | Idea | Where | Data | Score (insight/fidelity/effort) | Why it earns its place |
|---|---|---|---|---|---|
| 1 | **Lanes replay**: one row per model loop, one bar per call (height = context sent, to one scale), a time cursor with play/pause/step/scrub/speed; toggle single / lead + 6 / fan-out / blackboard / Sonnet single, all on the same clock | Reading 3 (animated), Audit lab (static, every run) | redacted stream-json: timestamps and per-call usage | 5/5/3 | The before/after of the page: the single agent's bars climb toward the window line while the workers stay low and run side by side |
| 2 | **Request stacks for handoff vs agent-as-tool**: step through every request the local model received (proxy log), new messages outlined, with what it answered | Reading 6 | logging proxy around mlx_lm.server | 5/5/3 | Shows literally that the specialist gets the whole history in one design and a generated sentence in the other, and the SDK's "Multiple handoffs detected" tool result |
| 3 | **Two halves side by side** with the names each writer produced and read highlighted, plus the merged output | Reading 7 | the files the writers wrote, the hidden check's output | 5/5/2 | Makes "implicit decision" concrete: `length` against `word_count` |
| 4 | **Accuracy against tokens** scatter for five aggregation methods on the same calls; exact vote-of-k curve; debate transition counts; puzzle grid with per-call answers diffed letter by letter | Reading 8, Debate lab | 270 recorded calls | 4/5/3 | A paired comparison, so the gaps are not sampling noise between methods |
| 5 | **Pattern picker**: eight small diagrams (control arrows solid, passed content dashed) with who decides / who sees / cost shape / examples | Reading 1 | definitions, sourced | 4/4/2 | The vocabulary of the page in one card |
| 6 | **Cost by component** stacked bars per design (fresh, written, cached, output), cache-write price implied from the reported total | Reading 9 | result.modelUsage | 4/5/1 | Shows the square-law term is cheap under caching and output/thinking dominate |
| 7 | **Found/missed matrix**: 16 planted bugs x every run | Audit lab | answers vs key | 3/5/1 | Shows which bugs the single agent never looked at |

## Rejected
- An animated message-passing "swarm" graph: no recorded data would drive it; it would be decoration.
- A token calculator with sliders for T, k, g, S: the formula is in the text and the real bills are shown; a free calculator would invite numbers the page cannot check.
- Simulating debate dynamics: the recorded transitions are better evidence.
- Recording Claude Code agent teams: they are not spawned in `-p` or SDK sessions (docs), so they would need an interactive session.

## Inspiration
- DeepSeek MLA explainer (before/after on one input, controls) for the lanes and the handoff stepper.
- The parent page's Orchestration lab lane view (single vs lead + subagents) extended to seven designs and more agents.

## What the methodology lacked here
- Guidance for comparing designs whose runs vary a lot between repeats: shown here by listing every run's value rather than a mean alone.
- Guidance on answer keys that are themselves imperfect: here the generator left two defensible kinds of "extra" report, so the page reports recall against the key and classifies extras instead of calling them false.
