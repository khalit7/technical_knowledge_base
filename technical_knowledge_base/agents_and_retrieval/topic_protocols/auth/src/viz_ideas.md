# Visualisation ideas: Auth page

Scores: teaching value (T), honesty of data (D), cost (C, lower is cheaper), each 1 to 5.

## Built
| # | Idea | Where | T | D | C | Data |
|---|---|---|---|---|---|---|
| 1 | One login, three ways: implicit, code without PKCE, code with PKCE, with an attacker lane; counters for credentials in browser URLs and what the attacker holds; play/pause/step/scrub/speed, on-screen and visible-tab only, paused under reduced motion | Reading s4 (`23_js_oauthanim.js`) | 5 | 4 (steps from the specs; the PKCE refusal text is recorded) | 3 | RFC 9700 s4.1 to 4.5, draft-16 s10.1, lab flows P |
| 2 | Recorded MCP authorization stepper: 9 steps (8 recorded exchanges plus the untapped CIMD fetch), lanes, spec rule per step, exact bytes | tab MCP auth flow | 5 | 5 (official SDK client and server, taps) | 4 | `lab/out/wire.json`, `sdk_flow.json` |
| 3 | Before/after: passthrough to a careful upstream, to a careless upstream, and token exchange; token chips labelled by audience; counters for tokens, audience received, who the upstream believes is calling | tab MCP auth flow | 5 | 5 (recorded) | 3 | phases C and D |
| 4 | JWT lab: 12 tokens, pinned and naive verdicts both executed in Python, claim checks toggled live, presets, scoreboard of forgeries accepted | tab JWT lab | 5 | 5 | 3 | `lab/out/jwt.json` |
| 5 | HS256 tamper box (browser SHA-256/HMAC, byte-identical to PyJWT) | tab JWT lab | 4 | 5 | 2 | recompute.py |
| 6 | SigV4 calculator showing canonical request, string to sign, signing key, header; defaults reproduce two botocore test-suite vectors independently | Reading s7 | 4 | 5 | 2 | `inputs/sigv4_vectors.json` |
| 7 | API key checksum checker | Reading s2 | 3 | 5 | 1 | `small.json` |
| 8 | Recorded tables: refresh rotation and reuse, device polling timeline, client credentials, revocation versus offline JWT, DPoP stolen-token attempts, passthrough results, real discovery documents, algorithm sizes and timings | Reading s4 to s9 | 4 | 5 | 1 | lab outputs, `inputs/real_discovery.json` |

## Rejected
- A token "lifetime" timeline chart (access versus refresh lifetimes): numbers vary per provider; a sentence says it.
- RS256 verification in the browser via WebCrypto: the Notion iframe may not be a secure context; the verdicts are recorded from Python instead and labelled.
- An animated DPoP proof builder: the recorded three-way theft table teaches the point with less code.
- Live fetching of JWKS in the page: no network in the iframe; fetched once, dated.
- A separate "Choose your flow" decision-tree widget: the choosing table is shorter and scannable.

## What the methodology lacked
Nothing structural. For protocol pages, "recorded bytes from the official SDK, replayed with a spec rule per step" proved a stronger default than a hand-drawn sequence diagram; worth adding as an idea pattern.
