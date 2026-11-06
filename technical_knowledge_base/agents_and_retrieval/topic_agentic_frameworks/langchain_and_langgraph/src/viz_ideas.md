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

## 2026-10-24 rebuild
- Added: hero figure (static annotated diagram: the stack and the super-step loop with checkpoints and resume); section 1's LCEL pipeline (static HTML diagram with the real values of one call, E8); cost stats (E8).
- Moved inline: the Super-step lab player (section 3) and the Crash lab replay (section 5); the old static two-run lanes and the two-graph reducer card were removed as duplicates of them.
- Added: section 12's comparison table (need, plain loop, LangGraph).
- Rejected: an LCEL overhead slider (one number with nothing worth moving; a stat says it); a photo or paper figure (no physical object; Pregel's paper figure would add nothing the hero does not show).

## 2026-11-06 rollout (split layout, renderer v2)
- Built: Fig. 1, a 3D hero stage of run A (graph, state, model plate, checkpoint stack, pending write and interrupt chips, process plates), replacing the static SVG hero; Fig. 2, a 3D super-step stage over the seven recorded graphs (plan, execute, update inside each step; channel columns by version; checkpoint slabs), replacing the 2D player.
- Turned into a widget: the crash replay (14 and 17 events; opens on the end of the run).
- Kept 2D: the drawn graphs of sections 2 and 9, the storage curve, the crash lanes (a timeline), the LCEL card, the checkpoint JSON and stream viewers.
- Rejected: a 3D interrupt stage for section 6 (its point is which code line re-runs, which is text; Fig. 1 already shows the pause and resume through the checkpoint); a 3D storage chart (a curve on axes reads better flat); a near-camera view on Fig. 1's kill step (it cropped the checkpoint stack the step is about).
