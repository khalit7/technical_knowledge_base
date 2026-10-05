# Visual ideas for the MCP page

Central question: what actually crosses the wire between host, client and server, and what breaks when you deploy it?

| # | Idea | Placement | Score (computable 2, reproduces/measures 2, shows what prose cannot 2, absent elsewhere 2, animation 1, minus cost) | Status |
|---|---|---|---|---|
| M1 | Two replicas: one confirm-then-delete call through a round-robin balancer, 2025-11-25 session against 2026-07-28 MRTR, with affinity and shared-key toggles; lanes, replica memory, counters, every recorded message | Own tab | 2+2+2+2+1 = 9 | built |
| M2 | Compatibility matrix 3 x 3, predict then click to reveal, with the wire of each cell | Reading s6 | 2+2+2+2 = 8 | built |
| M3 | OAuth flow stepper: 15 recorded exchanges with stage strip and captions | Wire lab | 2+2+1+2+1 = 8 | built |
| M4 | Transport table (cold, warm, bytes) and each transport's opening messages | Reading s4, Wire lab | 2+2+1+2 = 7 | built |
| M5 | Hostile-request table (header mismatch, versions, Origin, Host, tampered requestState) | Reading s4, Wire lab | 2+2+1+2 = 7 | built |
| M6 | Predict-then-reveal drills (unknown tool, JSON or SSE, round robin with per-process keys) | Reading | 2+1+2+2 = 7 | built |
| M7 | Stateless-vs-session animation of a single call | none | already on the root page (section 9); M1 extends it to replicas | rejected (duplicate) |
| M8 | Scripted-agent attack lab (injection, poisoned tools) with host policy toggles | none | dropped during the build; threats taught from primary sources, root's benign recording linked | rejected |
| M9 | Registry growth chart | none | counts not confirmable from a primary source today | rejected |
| M10 | Latency bar chart across transports | none | all within 1 to 3 ms on loopback, noise up to 0.5 ms; a table says it better | rejected |

What the methodology lacked: guidance for protocol pages, where the measurable object is a message sequence, not a curve; the replacement was "record it, replay it, count it".
