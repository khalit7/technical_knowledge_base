# Visualisation ideas: TLS and certificates (2026-10-05)

Scores: teaching value x data quality x novelty against the parent and siblings (1 to 5 each).

| Rank | Idea | Score | Data | Placement | Status |
|---|---|---|---|---|---|
| 1 | Handshake, decrypted: every record of the running request as observer and as endpoint, TLS 1.3, mTLS, TLS 1.2 | 5x5x5 | `raw/hs_*.json` (MemoryBIO capture plus key log, decrypted with HKDF and AES-GCM; Finished and CertificateVerify recomputed) | Tab | built |
| 2 | Before/after animation: what a passive observer sees, TLS 1.2 against 1.3, same request (counters: bytes, readable bytes, certificate visible, round trips) | 5x5x4 | same recordings | Reading s2 | built |
| 3 | Before/after animation: server first flight in TCP segments against the initial window, ECDSA, RSA, ML-DSA-44, ML-DSA-65 | 5x5x5 | `raw/hs_rsa.json`, `hs_mldsa44.json`, `hs_mldsa65.json` (real ML-DSA chains made with OpenSSL 3.6) | Reading s8 | built |
| 4 | Certificate dissector: 12 real public chains, fields with explanations, client checks with faults (date, name, missing intermediate, missing root) | 5x5x4 | `raw/public_chains.json` | Tab | built |
| 5 | ACME stepper: every JWS message of a real issuance against Pebble, plus DNS-01 wildcard, 6-day profile, failed validation, badNonce retry, ARI | 5x5x5 | `raw/acme_flow.json` | Reading s5 | built |
| 6 | 0-RTT replay table: one captured flight replayed to two nginx front ends, backend counts generations; RFC 8470 425 fix | 5x5x5 | `raw/zero_rtt.json` | Reading s3 | built |
| 7 | Lifetime schedule chart with surveyed leaves placed at their issue dates | 4x5x3 | BR 6.3.2, 4.2.1; survey | Reading s5 | built |
| 8 | Trust-store variable matrix (7 clients x 5 settings) | 5x5x4 | `raw/trust_matrix.json` | Reading s9 | built |
| 9 | One-screen flight figure (HTML rows, not SVG, so labels never clip) | 4x5x3 | `raw/hs_tls13.json` | Reading top | built |
| 10 | Diffie-Hellman toy with small primes and the attacker's brute-force count | 3x4x3 | computed | Reading s1 | built (labelled illustrative) |
| 11 | HelloRetryRequest table on a 50 ms emulated path | 4x5x3 | `raw/hrr.json` | Reading s2 | built |
| 12 | Crypto speed bars (openssl speed) and handshake cost bars (full, resumed, kept-alive) | 3x5x3 | `raw/speed.txt`, `raw/hs_cost.json` | Reading s3, s8 | built |
| 13 | Rotation result (same SSLContext reloaded; old connection keeps old identity) | 4x5x4 | `raw/rotate.json` | Reading s7 | built |

## Rejected
- Re-timing TLS 1.2 against 1.3 and cold against resumed on an emulated path: the parent's On the wire tab owns it; linked.
- Re-running the eight TLS failures with five clients' error text: the parent's Failure lab owns them; linked by case name.
- Key-schedule tree animation (early, handshake, master secrets): the key log only exposes traffic secrets, so the upper half of the tree could not be shown with real values; the decrypted-records tab teaches the useful part.
- crt.sh search box: needs network from the page (sandboxed iframe); CT logs are named from the real SCTs instead.
- Merkle Tree Certificate size bar: no implementation to measure; stated in prose from the draft, not drawn.
- OpenSSL s_server anti-replay demo: the single test gave "Early data was rejected" even for the legitimate client, so it did not isolate the replay; dropped rather than shown ambiguously.

## What the methodology lacked
Protocol pages have no published figures to reproduce; the equivalent check here is decryption: the page's numbers come from records that `recompute.py` re-decrypts, and whose Finished MACs it recomputes from the key log.
