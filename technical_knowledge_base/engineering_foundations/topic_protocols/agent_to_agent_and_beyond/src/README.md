# src: Agent-to-agent and beyond

- `build.sh` writes `../index.html` from `parts/` (the protocols assembler; `{{text|url}}` links, `n:` for Notion ids, `#t-...` for tabs).
- `parts/`: `01_head.html` (shared CSS plus this page's), `10_header.html`, `20_read_a..i.html` (Reading: the idea, then sections 1 to 16), `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates; storage key `a2a-tab`; nothing moves before the reader acts), `22_js_data.js` (generated), `23_js_rd_fig.js` (hero, what-contains-what, x402 sequence, AP2 chain, the clickable state-graph helper `RDF.graph`), `25_js_read_a.js` (drills, Agent Card, signing, anatomy, bindings), `26_js_read_b.js` (task-state graph, dropped-stream timeline, errors, in-task auth stats, UCP profile, checkout-status graph), `27_js_replay.js` (the recorded sequence-diagram stepper, three instances), `28_js_ucp.js` (UCP negotiation and escalation labs), `39_tab_more.html`.
- `lab/`: every recording. `sh lab/run_all.sh <scratch dir>` re-runs them in under a minute (a venv with a2a-sdk 1.2.2 and mcp 2.3.0 in the scratch dir; ports 30801-30842 on 127.0.0.1) and redacts `lab/out/` (`redact.py`).
  - `eval_agent.py`: Team B's scripted eval agent, official SDK server, JSON-RPC and HTTP+JSON bindings, bearer-token middleware, push sender, an out-of-band grant route.
  - `run_a2a.py`: Team A's orchestrator (SDK client) and raw requests through `tcp_tap.py`: discovery and 304, no token, the running example, twelve error cases, both bindings, dropped stream and resubscribe, push (and a screening agent), in-task auth, reject, cancel, Agent Card signing (the ES256 private key stays in the scratch dir).
  - `mcp_eval_server.py` + `mcp_same_job.py`: the same job as MCP tools driven step by step.
- `gen_data.py` turns `lab/out/*.json` and `inputs/ucp_allbirds_profile.json` (one read-only fetch of a real store's `/.well-known/ucp`, 5 Oct 2026) into `parts/22_js_data.js`.
- Checks: `check_embed.py` (page embeds the current data, 29 prose claims against the recordings, private-pattern grep); `check_ui.mjs` (every control at 390 px dark and 920 px light, every replayer step, and a no-autoplay check in normal and reduced motion: 240 clicks); `ledger.json` (`python3 html_utils/ledger.py check <page>`).
- `old_root_excerpt.md` and `coverage.json`: the old Topic: protocols paragraphs this page carries (its floor, 2026-10-05). `unconfirmed.md`: what was left out and why. `viz_ideas.md`: visuals built and rejected.

## The 2026-10-24 rebuild to the teaching contract
Editing plus one new source (x402, read 24 October 2026); no new runs.
- **Top:** the core idea in one sentence and a hero figure (static, drawn at the measured width, two layouts): Team A's agent, MCP to tools, A2A to Team B's opaque agent, UCP to a merchant, AP2 or x402 to pay, MHS to a device, with orange marking every approval outside the model. The same orange marks interrupted task states, `requires_escalation`, AP2's trusted surface and x402's signature throughout. "You need" and the running example; new terms in a closed list.
- **Tabs removed, visuals moved inline:** "One job, recorded" became three stepper instances beside the claims they prove (section 5: stream, dropped stream, push, cancel; section 8: in-task auth; section 10: MCP against A2A, the before/after). "Commerce lab" moved into section 12 (negotiation against the real profile, the escalation decision). Mode switches no longer start playback.
- **New visuals:** what-contains-what (context, task, status, history, artifacts, parts); the eight task states as a clickable state diagram with interrupted, active and terminal bands (replaced chip buttons); UCP checkout statuses as a clickable state diagram; AP2 human present against not present (toggle); x402 as a sequence diagram.
- **New content (ownership asked for agent payments "AP2, x402 and similar"):** section 13, AP2 moved out of commerce and x402 added from the x402 Foundation's specification v2 at a pinned commit (402 with `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`, facilitator verify and settle, EIP-3009 nonce, the A2A transport reusing `input-required`), and x402 rows in the dated table and the trust-boundary table. 0.01 USDC is derived (10000 atomic units, 6 decimals).
- **One dated table** (section 11) now holds every version, governance and adoption fact; the provenance quotes went into a closed block. Agent security is linked for injection and the lethal trifecta.
- **Into closed blocks:** the operation mapping table, both bindings recorded and the 0.3 wire format; UCP names, versions, transports, the Embedded Protocol, payment handlers and request signing; ACP's statuses; x402's signed payload and flows; MHS partner results; debugging table; interview rehearsal (four design questions kept; the six that restated sections were cut as fat).
- **Corrections** stay in visible boxes (AGNTCY archive month, A2A membership, UCP versioning, MHS figures).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core | 42.2 min | 34.4 min |
| Reading, closed details | 2.3 min | 8.6 min |
| Other tabs (One job, Commerce lab, Further reading) | 6.2 min | 2.3 min (Further reading only) |
| Visuals inline in Reading | 1 | 10 |

The core fell by 8 minutes while absorbing two tabs (4 min) and a new payments section. It stays at 34 minutes because the page owns a whole protocol end to end (discovery, task model, delivery, bindings, errors, auth, security) plus commerce, payments and devices, and about a fifth of the counted words are the recorded messages and captions inside the visuals themselves. Each section now carries only what is needed to use A2A correctly; reference material is closed.

## Ledger
438 units (432 drafted, 6 added by hand for script-rendered tables and labs): core 308, depth 57, volatile 7 (kept on this page in the dated table), fat 66 (headings, wind-ups, pointers to the removed tabs, the agent definition, interview answers restating sections). `ledger.py check`: problems 0.
