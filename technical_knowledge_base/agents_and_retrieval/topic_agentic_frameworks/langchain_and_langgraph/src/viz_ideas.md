# Visual ideas: LangChain and LangGraph

Central question: what does the LangGraph runtime actually do between your nodes, and what does the checkpoint save you from?

## Built (score = teaches / real data / not elsewhere, each 1 to 3)
| Idea | Score | Placement | Data |
|---|---|---|---|
| Super-step player: graph lit per phase (plan, execute, update), channel table with versions and changes, pending writes, versions_seen, counters; before/after pairs (reducer vs none, plain edges vs join) | 3/3/3 | Super-step lab (7 graphs) and inline in Reading s3 (reducer toggle) | e1_supersteps.json, recorded checkpoints and task events |
| Real killed-and-resumed run: process lanes to scale, killed call hatched, counters (calls, tokens, cost), caption per event, sync vs exit toggle on the same input | 3/3/3 | Crash lab (animated), Reading s5 (static, both modes) | recordings/e6 |
| Database contents at the moment of death (pending writes, __error__) | 3/3/3 | Crash lab | e2 raw_after_first |
| Interrupt re-execution animation: code lines highlighted, e-mail counter, before vs after placement | 3/3/2 | Reading s6 | e4 counters |
| Storage growth chart: add_messages vs DeltaChannel, SQLite and Postgres | 3/3/3 | Reading s4 | e3 series |
| Checkpoint inspector (pick a step, see the raw checkpoint) | 2/3/3 | Reading s4 | e1 linear |
| Stream-mode picker with recorded events | 2/3/3 | Reading s7 | e5 streams |
| create_agent compiled graph with and without middleware; transcript of two local-model runs with different reviewers; first request body; HITL payload | 3/3/3 | Reading s9 | e7, e7b |
| Tables: interrupt rules measured, subgraph styles, store across threads, durability overhead, kill outcomes | 2/3/2 | Reading | e2, e4, e5 |

## Rejected
- A time-travel fork animation: the parent's Orchestration lab already replays a recorded fork; linked instead.
- A Temporal comparison: owned by the parent's Orchestration lab.
- A LangGraph vs plain loop code diff: owned by the parent's Same agent, six ways tab.
- A token-streaming animation from the messages mode: the local server was reached through a lock shared with other agents, so token timing is not meaningful; chunk counts only.
- A cost calculator for checkpoint storage: one measured chart with the quadratic explanation teaches the point; a calculator would add fitted inputs.
- A semantic-search store demo: needs an embedding model; described from docs.

## What the methodology lacked
Nothing published to reproduce; the "defaults reproduce" rule became: the page's numbers regenerate from the redacted records (check_page.py), costs reproduce from list prices, and defaults quoted from docs were checked in the installed source (durability default async, RetryPolicy defaults, recursion limit per version from the wheels).
