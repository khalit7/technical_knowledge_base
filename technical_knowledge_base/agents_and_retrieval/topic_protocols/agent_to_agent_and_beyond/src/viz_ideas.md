# Visual ideas for the Agent-to-agent page

Central question: what does delegating a job to someone else's agent look like on the wire, and where must a person stay in the loop?

| # | Idea | Placement | Score (computable 2, reproduces/measures 2, shows what prose cannot 2, absent elsewhere 2, animation 1, minus cost) | Status |
|---|---|---|---|---|
| A1 | One job, two protocols: the same evaluation as MCP tools driven by Team A against an A2A task delegated to Team B, recorded, replayed as a sequence diagram with counters (requests, bytes, text the caller's model reads); four more A2A modes (dropped stream, push, in-task auth, cancel) | Own tab | 2+2+2+2+1 = 9 | built |
| A2 | Task-state explorer: eight states in active / interrupted / terminal bands, each with its recorded event | Reading s4 | 2+2+1+2 = 7 | built |
| A3 | Dropped-stream timeline: stream 1, the gap, GetTask, SubscribeToTask snapshot | Reading s5 | 2+2+2+2 = 8 | built |
| A4 | Recorded error table (12 hostile or malformed requests), click for both messages | Reading s7 | 2+2+1+2 = 7 | built |
| A5 | Agent Card viewer (JSON, wire with 304, field by field) and the signing check (valid, tampered) | Reading s2 | 2+2+1+2 = 7 | built |
| A6 | UCP negotiation against a real merchant profile, the spec's three-step intersection with pruning | Commerce lab | 2+2+2+2 = 8 | built |
| A7 | UCP escalation decision from the spec's own example messages | Commerce lab | 2+1+1+2 = 6 | built |
| A8 | Predict-then-reveal drills (task store survival, contextId without taskId) | Reading | 2+1+2+2 = 7 | built |
| A9 | gRPC binding recording beside JSON-RPC and HTTP+JSON | none | binary frames add little over the Service APIs page's dissection; listed as unrecorded | rejected |
| A10 | Animated UCP checkout with a real merchant | none | would need a real purchase or an authenticated store; a static status explorer plus the decision lab teach the same | rejected |
| A11 | MHS device simulator | none | no public specification or endpoint; anything built would be invented | rejected |
| A12 | Adoption chart of agent protocols | none | no primary adoption figures | rejected |

What the methodology lacked: as on the MCP page, the measurable object is a message sequence; the replacement was "record it, replay it, count it", plus a fair-comparison rule (count the same thing on both sides: discovery text and every result the caller's model reads).
