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

## 2026-11-07 rollout (split layout, renderer v2 stages, explained and autoplaying animations)
| # | Idea | Placement | Status |
|---|---|---|---|
| C1 | Hero as a 3D stage: Team A's agent at the centre, its tools (MCP), Team B's opaque agent (A2A), the person and the out-of-band grant, a merchant (UCP), payment (AP2 or x402), a lab device (MHS); orange glass gates; one link per step, the last step all | Reading top, Fig. 1 | built (replaces B1, the static two-layout diagram) |
| C2 | One job as a 3D stage: Team A, Team B's agent, the task on Team B's side changing state and collecting artifact pieces, requests and stream events as flowing dots; four recordings as modes, each grouped into its stretches (7, 5, 5, 4 steps) | Reading s5, Fig. 2 | built (replaces the s5 stepper instance of B4) |
| C3 | In-task auth on the same scene: the person and the grant straight to Team B, the stream staying open (7 stretches) | Reading s8, Fig. 3 | built (replaces the s8 stepper) |
| C4 | MCP against A2A on one stage: MCP in front (three tools), A2A behind (Team B's tools behind glass), glass columns filling to scale with the characters Team A's model reads | Reading s10, Fig. 4 | built (replaces the s10 stepper; before/after on one stage) |
| C5 | AP2 as parties with the signed objects travelling: checkout plate, mandate plates, present and not present as modes | Reading s13, Fig. 5 | built (replaces B7, the 2D chain) |
| C6 | MHS as layers: instruments, the standard driver with its reference file, the safety-limit plate below the model, MCP/CLI/code, the agent; the lessons as steps | Reading s14, Fig. 6 | built (new; the device section had no visual) |
| C7 | The three steppers merged into one raw-message widget (all six recordings, no autoplay, opens on an informative frame) in a closed block of s5 | Reading s5 | built (long-replay rule, case b: the raw frames are reference) |
| C8 | Kept 2D: what-contains-what (nesting reads flat), the two state diagrams (graphs), the dropped-stream timeline (a time axis), the error table, the x402 sequence diagram, the UCP labs (tables with controls) | Reading | kept, now each in the right column of its section |
| C9 | Agent driving a computer (screenshots or an accessibility tree, input events) as layers | none | rejected: the page covers MHS lab devices only and cites no computer-use source; adding it would be a fact from memory |
| C10 | Photo of a lab instrument beside MHS | none | rejected again (see B9): the layers figure carries what the section teaches; a photo of one vendor's instrument adds nothing about the protocol |
