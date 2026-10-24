# Source of "Topic: protocols"

Root of the topic (storage key `protocols-tab`). Built 2026-10-05 by a team of tab agents (Reading, On the wire, Failure lab, Protocol atlas); the Reading tab was rebuilt as a map at the topic close on 2026-10-24, after the ten children had been rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). No new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`.
- `sh html_utils/checkpage.sh <this page>`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24).
- `python3 html_utils/ledger.py check <this page>`: problems 0.
- Own checks, all passing on 2026-10-24: `read/check_embed.py` (recordings embedded exactly, 15 recorded numbers), `node read/check_read.mjs` (every Reading stepper in every mode at 390 dark and 920 light, nothing moves before the reader acts, details, tab links), `wire/check_wire.py` and `node wire/ui_check.mjs <index.html> <dir>`, `fail/check_embed.py` (39 cases, 167 runs), `atlas/check_embed.py` and `node atlas/at_check.mjs <dir>`.
- `parts/21_js_rd_common.js` and `parts/99_js_tabs.js` are the skill templates (no autoplay; a `#t-...` hash opens that tab).

## Tabs
| Tab | Decision on 2026-10-24, and why |
|---|---|
| Reading `t-read` | **Rebuilt as a map** (below). |
| On the wire `t-wire` | **Kept.** The running request on HTTP/1.1, 2 and 3 with DNS, TCP, TLS and HTTP timed on one waterfall, one lost packet across the three versions, TLS 1.2 against 1.3 and cold, resumed and reused connections: it spans Networking foundations, TLS and HTTP, and the children link to it rather than re-measuring it. |
| Failure lab `t-fail` | **Kept, case names unchanged** (Auth cites "Expired JWT", "Wrong audience", "Missing scope: authenticated but not allowed", "OAuth redirect URI mismatch", "mTLS: client certificate missing" and the 429 case; HTTP, Streaming, Service APIs, TLS and DNS cite others). 39 failures from every layer on one request, organised by symptom: the cross-layer debugging tool. One stale pointer fixed: the ndots case pointed to DNS's removed Pod resolver lab, now to its sections 6 and 7 (`fail/catalog.py` and the embedded data). |
| Protocol atlas `t-atlas` | **Kept.** The root-owned map of 32 protocols. |
| Further reading `t-more` | Child pages in reading order with the times their headers state; section numbers updated; Building a backend API's line now says API design lives on Service APIs. |

## What changed in the Reading tab
- **Top**: the core idea in one sentence and a hero stepper, "One request's journey": eight steps (DNS, TCP, TLS, HTTP, auth, the provider's internal services, SSE, MCP and A2A), each with its measured cost from this page's recordings, how it fails, and the child that owns it; a round-trip counter (`parts/25_js_rd_hero.js`; captions are static HTML, so the ledger sees them). New terms (six).
- **One screen**: the comparison table, now with "how it usually fails" and an Owner column, plus SSH and the GPU fabric.
- **One short section per layer**, each with only the distinction that shows across children and a Go deeper line naming the child's sections: layers with the to-scale wrapping stepper (kept: it spans HTTP, TLS, TCP and IP on the running request) and a one-command-per-layer toolbox table; **round trips** (new section: which handshakes the transport, TLS and reuse choices cost, a static bar figure, the measured 53 against 107 ms and 108 against 54 ms); DNS (caching as the failure surface, rebinding where DNS meets agents); transport (TCP, UDP and QUIC compared in one table; idle timeouts as the cross-layer fact; RDMA in two sentences); TLS against SSH (one trust table); HTTP (the version table, and the three HTTP facts other layers must handle); streaming (the four delivery mechanisms); service APIs (the four styles, deadlines, L4 against L7); auth (seven credentials compared); agent protocols (MCP, A2A and commerce compared; the trust boundary); debugging and choosing (kept); child cards with header times.
- **Retired** (every unit is `owned:` with its key on the child): the TCP window animation and BDP calculator (Networking foundations sections 3 to 5), the TLS handshake recording (TLS section 2), the DNS walk and recorded answers (DNS sections 2, 5 and 10; DNS records the same interception finding and the same 1,800 s negative cache), the HTTP status table and request panes (HTTP sections 1, 2 and 6), the SSE byte dump and WebSocket and webhook paragraphs (Streaming sections 2, 6 and 9), protobuf and REST, gRPC and GraphQL detail (Service APIs sections 2, 8 and 15), keys, OAuth flows, PKCE example and the JWT recording (Auth sections 2, 4 to 7), MCP roles and the protocol-level threats (MCP sections 1, 3 and 8), A2A and UCP detail (Agent-to-agent sections 2, 11 and 12), the ten interview questions (each answer restated a kept section; labelled fat). Old parts are kept in `read/retired/parts/`.
- **Kept in a closed block**: the recorded MCP tool call carrying a hidden instruction (`parts/27_js_rd_mcp.js`), because MCP and its siblings link to it as the root's evidence for the trust boundary and no child records it; the toolbox recordings.
- **Correction**: the old section 3 quoted the lsof pair as port 59598; the recording (`read/code/out/t5_lsof.txt`) says 49197, which the toolbox caption now shows.
- **Privacy**: the lsof recording showed the login name as process owner; it reads `dev` in the recording, the embedded data and `read/old/ssh.md`, and `read/gen_data.py` and `read/code/r1_toolbox.sh` now rewrite it at run time.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 63 min | 33 min |
| Reading, closed details | 5 min | 6 min |
| On the wire | 8 + 2 | 8 + 2 |
| Failure lab | 1 + 1 (39 cases drawn by script) | unchanged |
| Protocol atlas | 6 | 6 |
| Further reading | 5 | 7 (child cards added) |
| Visuals in Reading | 4 steppers (layers, TCP, TLS, MCP) | 3 steppers (journey, layers, MCP in a closed block) and one static figure (round trips) |

Why about 33 minutes is right: the topic has ten children of 32 to 46 minutes each, and the root is the only place that compares them on the same request, so it keeps a comparison table per layer (transports, TLS against SSH, HTTP versions, delivery mechanisms, API styles, credentials, agent protocols), the definitions those tables need for a reader new to networks, and the two cross-child tables (symptom to layer, which protocol when). Every mechanism is now one orienting sentence and a link. Shorter would mean dropping a comparison table that no child holds.

## Knowledge ledger (`ledger.json`)
651 units drafted by `ledger.py init` from the page as built before the close: core 348, depth 69, owned 167 (Networking foundations 31, DNS 28, Auth 27, TLS 26, Streaming 15, Service APIs 14, MCP 11, HTTP 11, Agent-to-agent 4), fat 66, volatile 1 (Paper2Agent, carried by the 21 September 2026 tech-news issue); problems 0. Keys were found by script (whole sentence, then numbers with a neighbour word, then phrases of five to nine words, the root first and the section's owning child next) and the residue labelled by hand; fat units are headings, wind-ups, widget instructions, navigation, interview question stems and answers that restate kept sections. Some owned keys are the owner's own phrasing of the same fact (the DNS recording's per-cache TTL countdown, TLS's ClientHello size with the hybrid share), because the child recorded the same thing with its own numbers.

## For other pages
- Auth section 9 was trimmed at this close: MCP's authorization flow (eight steps, the recorded SDK stepper and the mix-up) is now one paragraph and a link to MCP section 7, which owns it; Auth keeps audience binding, no passthrough, the confused deputy and the credential rules.
- Outside this topic, stale links (not edited here): Gateways and routing cites "Service APIs (its Balancer lab)" (twice) and "HTTP (its Timeout chain tab)"; those are now sections 13 and 9.
