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

## 2026-10-24 rebuild
| # | Idea | Placement | Status |
|---|---|---|---|
| B1 | Hero: who talks to whom, orange approval gates | Reading top | built (static diagram, two layouts) |
| B2 | What contains what: context, task, status, history, artifacts, parts | Reading s3 | built (static) |
| B3 | Task states as a clickable state diagram in bands (replaces A2's chips) | Reading s4 | built |
| B4 | A1 split into three inline stepper instances (s5, s8, s10); no playback on mode switch | Reading | moved from tab |
| B5 | A6 and A7 (UCP labs) | Reading s12 | moved from tab |
| B6 | UCP checkout statuses as a clickable state diagram | Reading s12 | built |
| B7 | AP2 human present against not present | Reading s13 | built (toggle-compare) |
| B8 | x402 sequence: 402, signed retry, verify, settle, receipt | Reading s13 | built (static) |
| B9 | Real photo of a lab instrument for MHS | none | rejected: the page is about protocols; a photo would not teach the device layer, and the contract keeps diagrams for mechanisms |
| B10 | Live x402 run on a testnet | none | rejected: needs a funded wallet and a facilitator; the spec's own example is shown |
