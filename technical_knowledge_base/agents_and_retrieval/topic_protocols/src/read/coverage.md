# Coverage of the old pages by the Reading tab (2026-10-05)

The old root and its ten children are saved verbatim in `old/` (`save_old.py`, read-only Notion fetches). They were treated as unverified notes. Each fact below is marked:

- **verified**: checked today against the primary source named (see `sources/notes.md` and `sources/rfc_index_check.txt`), and where it lives on the page (R = Reading section, M = Further reading);
- **corrected**: the old text was wrong or stale; the correction and source;
- **unconfirmed**: not checked against a primary source today; not on the page unless marked;
- **child**: detail that belongs to a child page; kept here as input for it, not on the root.

Numbers measured for this page are in `code/out/` and checked by `check_embed.py`.

## Old root (00_root_topic_protocols.md)

| Fact | Verdict | Where / source |
|---|---|---|
| Throughput is window over RTT; BDP; one stream cannot fill a long fat pipe | verified (RFC 7323 s2, Mathis 1997) | R3, with derived numbers and an animation |
| NCCL opens 16 sockets per peer on AWS | corrected: 2 threads x 8 sockets per connection between two ranks, socket transport only (NCCL env docs; atlas agent agrees) | R3 |
| UDP has no receive-buffer autotuning; QUIC substrate | QUIC substrate verified (RFC 9000); autotuning: child | R3 / child |
| RoCEv2 is RDMA in UDP port 4791, needs near-lossless fabric | port unconfirmed today; "RoCE carries RDMA over Ethernet inside UDP" kept without the port | R3 |
| TLS 1.3: one round trip, forward secrecy mandatory, everything after ServerHello encrypted | verified (RFC 9846 s2; own capture) | R4 |
| PQ hybrid past 60% of client traffic, ~10% of origins | verified (Cloudflare blog 2026-02-27). Atlas agent lists "adoption percentages" as unconfirmed; this tab cites the Cloudflare post directly | R4 |
| Certificate lifetimes to 47 days by 2029 with 10-day validation reuse | verified (CA/B SC-081v3; DigiCert summary) | R4 |
| SSH hybrid PQ default since OpenSSH 9.0 | verified (9.0 2022-04-08 sntrup761x25519; 10.0 2025-04-09 mlkem768x25519; RFC 10042 Aug 2026) | R4 |
| SSH certificates, ProxyJump | child | child (SSH) |
| HTTP versions as fixes for head-of-line blocking; semantics version-independent | verified (RFC 9110-9114); measured by On the wire (h2 all streams +68/+56/+43 ms, h3 one stream +66 ms; checked in src/wire/raw/hol) | R5 |
| LLM APIs: SSE as answer to a POST, proxy timeouts, idempotency keys | verified (WHATWG 9.2, nginx docs, Stripe, IETF draft) | R5, R6 |
| Webhooks: HMAC over raw body, at-least-once, unordered | verified as practice (Stripe docs pattern); no single standard | R6 |
| CSWSH: WebSockets not covered by same-origin policy | verified in substance (Origin check); detail child | R6 / child |
| REST at Richardson level 2; gRPC protobuf, four streaming modes, deadlines, L4 LB pinning; GraphQL | verified (Fielding ch5; gRPC docs and LB blog; protobuf encoding) | R7 |
| MCP Nov 2024, JSON-RPC, host/client/server, tools/resources/prompts, stdio and Streamable HTTP | verified (anthropic.com 2024-11-25; spec) | R9 |
| MCP 2026-07-28 stateless core, extensions framework | verified (changelog) | R9 |
| Remote MCP servers as OAuth 2.1 resource servers with audience-bound tokens | verified (spec authorization, RFC 9728, RFC 8707) | R9 |
| A2A Google-origin, under Linux Foundation since June 2025, v1.x, 150+ members | partly corrected: v1.0.0 current (March 2026), joined the Agentic AI Foundation 2026-08-27; LF June 2025 not re-checked; "150+" unconfirmed, dropped | R9 |
| Agent Card at well-known URL; task lifecycle; JSON-RPC over HTTP with SSE | verified and extended: `/.well-known/agent-card.json`, eight states, JSON-RPC, gRPC and HTTP+JSON bindings | R9 |
| ACP merged into A2A; AGNTCY archived its ACP SDK April 2026 | unconfirmed; dropped from the root | child (agent protocols) |
| UCP: Shopify with Google, /.well-known/ucp, intersection negotiation, reverse-domain extensions, states incomplete/requires_escalation/ready_for_complete, Embedded Checkout Protocol over JSON-RPC 2.0, published January 2026 | verified (Shopify Engineering 2026-01-11) | R9 (short, dated) |
| UCP supported by Etsy, Target, Walmart, Wayfair; layered core/capabilities/extensions; payment negotiation | unconfirmed today | child |
| Meta Muse buying through Shop Pay over UCP; Amazon blocking Muse (September 2026) | unconfirmed, no primary source found; dropped | none |
| Paper2Agent: 74 of 100 papers, Nature September 2026 | verified ("Among the 100 computational biology papers, 74 were successfully agentified"; online 2026-09-16). "with no manual intervention" not checked, not used | R9 |
| Paper2Agent's failing 26% due to operational knowledge missing | unconfirmed interpretation; dropped | none |
| MHS research preview 2026-08-27, model-agnostic, reachable over MCP, selected labs | verified (Anthropic news) | R9 |
| MHS results: Genentech drug discovery; Janelia "weeks to a day"; QuEra 58% to 99.3% | corrected: Janelia integration time "multi-day project" to "a few minutes"; QuEra figure shown only as the 99.3% result (atlas agent: 58% and 99.3% are two measurements) | R9 |
| Google Home MCP early access September 2026, Premium Advanced, Cloud project | partly verified: Google's Home developer site features "Home MCP"; date and requirements unconfirmed; not on the root | none |
| OAuth 2.1 still a draft; three flows; OIDC; JWTs; IAM SigV4; mTLS | verified (datatracker draft-16 2026-09-03; RFC 7636, 8628, 7519, 8725; AWS docs) | R8 |
| Token passthrough banned; confused deputy | verified (MCP security best practices, quoted) | R9, R8 |
| Muse Spark 1.3 credential service and OS-level approvals | unconfirmed (The Batch only); dropped. The design idea (approvals outside the conversation) is kept as a general rule in R8 without attribution | R8 |
| "Which to reach for when" table | rebuilt and checked | R10 |
| Best starting resources (HPBN, MDN, MCP spec and blog, A2A repo, OAuth 2.1, Parecki) | link-checked 2026-10-05; Parecki described as an editor of the OAuth 2.1 draft (old "co-designed MCP's auth" not verified) | M |

## TCP, UDP, and IP (tcp_udp_ip.md)

| Fact | Verdict | Where |
|---|---|---|
| IPv4 20-byte header, IPv6 40 | verified (RFC 791 s3.1, RFC 8200) | R1 |
| RFC 1918 ranges | verified | R3 |
| CGNAT 100.64/10 (RFC 6598); 169.254.169.254 metadata | RFC 6598 verified in index; child | child |
| Google IPv6 50.10% on 2026-03-28; APNIC ~42% | unconfirmed | child |
| MTU 1500, MSS 1460/1440; PMTUD blackhole; tcp_mtu_probing | MTU and blackhole concept on page; exact MSS values child | R3 / child |
| AWS jumbo frames 9001, IGW 1500, 8500 for peering/NAT | unconfirmed today | child |
| NAT gateway 55,000 connections per destination, 350 s idle | verified (AWS NAT troubleshooting: 350 s idle then RST; 55,000 per IPv4 address) | R3 (350 s) |
| BDP table (10 Gbps x 100 ms = 125 MB, ...) | verified by arithmetic | R3 calculator |
| Without window scaling a 100 ms path caps at about 5 Mbps | verified: 65,535 x 8 / 0.1 = 5.2 Mbit/s | R3 |
| Mathis: about 37 Mbps at MSS 1460, 100 ms, p=1e-5 | corrected: with the paper's constant C = sqrt(3/2) it is 45 Mbit/s; 37 omits C | R3 |
| Nagle plus delayed ACK 40 ms stall; TCP_NODELAY | unconfirmed today (Failure lab measures Nagle) | child |
| TIME_WAIT 60 s, 28,232 ephemeral ports, ~470 conn/s | unconfirmed | child |
| Keepalive 7200 s + 9 x 75 s = 2 h 11 min | verified (man 7 tcp) | R3 |
| somaxconn 4096 since 5.4 | unconfirmed today | child |
| CUBIC default, RFC 9438; BBR | CUBIC/RFC 9438 verified; BBRv3 draft status unconfirmed | R3 / child |
| TCP Fast Open effectively dead | unconfirmed | child |
| UDP 8-byte header | verified (RFC 768) | R3 |
| 1232-byte DNS Flag Day; QUIC 1200-byte minimum | unconfirmed today | child |
| AWS single flow 5 Gbps, 10 in placement group, 25 with ENA Express | verified (AWS EC2 bandwidth doc) | R3 |
| NCCL bootstraps over TCP; NCCL_SOCKET_IFNAME | verified (NCCL docs) | R3, R10 |
| 70B checkpoint arithmetic, s5cmd, S3 per-prefix rates | unconfirmed | child |
| io_uring zero-copy in 6.15; HTTP/3 ~40% of sites; L4S RFCs | L4S RFC numbers verified; others unconfirmed | child |

## DNS (dns.md)

| Fact | Verdict | Where |
|---|---|---|
| Stub, recursive, authoritative; iterative referrals | verified (RFC 1034 s5.3.3) | R2 |
| 13 root identities | verified (own NS lookup) | R2 |
| ~1,900 anycast instances | unconfirmed; dropped | none |
| QNAME minimisation RFC 9156; EDNS RFC 6891; TCP RFC 7766; serve-stale RFC 8767 | RFC numbers verified in index | child |
| Negative TTL = min(SOA MINIMUM, SOA TTL) | verified (RFC 2308 s5); measured on anthropic.com | R2 |
| .com delegation 48-hour TTL | not checked; the measured NS TTL of com from the resolver was 52,811 s remaining | child |
| JVM caching; Python caches nothing | Python statement kept (stdlib calls libc each time); JVM detail kept generic | R2 |
| glibc vs musl | unconfirmed | child |
| Kubernetes ndots:5 amplification | verified (Kubernetes docs); old count "ten packets" corrected to "four names, up to eight queries" with three search domains (a node may add more) | R2 |
| conntrack race and 5-second timeouts; NodeLocal DNSCache | 5 s resolver timeout verified (resolv.conf(5)); conntrack detail child | R2 / child |
| CoreDNS loop plugin; VPC resolver 1,024 pps per ENI | unconfirmed | child |
| Headless services and publishNotReadyAddresses for training rendezvous | unconfirmed today | child |
| DNSSEC 36% validating, 7% signed; .de outage 2026-05-05 | unconfirmed; dropped | child |
| DoT/DoH/DoQ RFCs | verified (index) | R2 |
| DNS rebinding, SSRF | verified in substance (MCP security best practices) | R2 |
| AWS us-east-1 2025-10-19 empty DNS record; "DynamoDB impact 14 h 32 m" | corrected: DynamoDB DNS impact 11:48 PM to 2:40 AM PDT, 2 h 52 min (AWS summary) | R2 |
| Cloudflare 1.1.1.1 2025-07-14 62 minutes | unconfirmed | child |
| Root KSK rollover 2026-10-11, KSK-2024 key tag 38696 | verified on ICANN's KSK rollover page today. The atlas agent lists it as unconfirmed: the two tabs disagree; this tab keeps it with the ICANN link | R2 |

## TLS and PKI (tls_and_pki.md)

| Fact | Verdict | Where |
|---|---|---|
| RFC 9846 July 2026 obsoletes RFC 8446 | verified (RFC index) | R4 |
| RFC 10024 hybrid groups, codepoints, 1216/1120 B shares | verified (RFC 10024 s4.1, s4.2) and measured in own capture | R4 |
| ECH is RFC 9849 (March 2026), RFC 9848 | verified | R4 |
| HelloRetryRequest on wrong group | verified in concept (RFC 9846 s2.1) | child |
| Ciphersuites list, AES-GCM vs ChaCha20 | own capture shows the three suites | R4 |
| 0-RTT replayable; never on inference endpoints | verified (RFC 9846 s8) | R4 |
| ALPN h2 needed for gRPC | verified in concept (RFC 9113) | child |
| FIPS 203/204/205 dates; HQC | unconfirmed today | child |
| Cloudflare PQ figures; iOS 26 2% to 11% | 60%/10% verified; iOS 26 figure not in the post: unconfirmed, dropped | R4 |
| OpenSSL 3.5.0 prefers hybrid by default | consistent with own capture (OpenSSL 3.5.9 offered X25519MLKEM768 first) | R4 |
| ML-DSA sizes; Merkle Tree Certificates; Let's Encrypt plan | unconfirmed | child |
| Chain of trust, server sends intermediates not root | verified in practice (own openssl output) | R4 |
| SC-081 schedule | verified | R4 |
| ACME RFC 8555, ARI RFC 9773 | verified (index) | R4 / child |
| LE OCSP off 2025-08-06; 6-day certs; ACM ACMEv2 | unconfirmed | child |
| mTLS mechanics; SPIFFE; mesh | verified in substance | R4 / child |
| Public CA clientAuth removal Feb 2027 | unconfirmed (atlas agent also lists it as unconfirmed); dropped | child |
| Failure modes: expired, missing intermediate, trust stores, MITM proxies, verify=False | verified in substance; own run shows an intercepted name failing verification | R4 |
| Ray TLS off by default; NCCL has no TLS | NCCL point kept generically; Ray unconfirmed | R4 / child |

## HTTP (http_1_1_2_3_llm_services.md)

| Fact | Verdict | Where |
|---|---|---|
| Version history and HoL table | verified (RFCs); h2/h3 loss behaviour measured by On the wire | R5 |
| HTTP/2 server push removed by Chrome | unconfirmed | child |
| 0-RTT and connection migration in QUIC | verified (RFC 9000) | R3 |
| Methods' safe/idempotent properties | verified (RFC 9110 s9.2) | R5 |
| Status codes list | verified (RFC 9110 s15, RFC 6585 s4) | R5 |
| Caching headers, content negotiation | child | child |
| Proxy buffering, X-Accel-Buffering | verified (nginx docs) | R6 |
| Idempotency-Key draft | verified exists (datatracker) | R5 |
| Streaming resets idle timers | verified in substance | R5 |

## Real-time and event delivery (realtime_and_event_delivery.md)

| Fact | Verdict | Where |
|---|---|---|
| Four mechanisms table | rebuilt | R6 |
| SSE format, Last-Event-ID, 15 s comment advice | verified (WHATWG 9.2, 9.2.7) | R6 |
| Anthropic SSE event types, OpenAI [DONE] | Anthropic flow verified (streaming docs, incl. mid-stream overloaded_error); OpenAI sentinel unconfirmed today | R6, R5 |
| MCP Streamable HTTP is SSE; 2026-07-28 removed SSE resumability | verified (changelog) | R9 |
| Webhook practices; Stripe 3-day retries | practices kept; 3 days unconfirmed | R6 |
| Meteor DDP section | child (not a protocol an ML engineer meets); kept for the real-time child | child |
| Realtime voice APIs use WebSockets/WebRTC/SIP; GPT-Live-1 full duplex Sept 2026 at $0.05/min | WebSockets for voice kept generically; GPT-Live-1 unconfirmed, dropped | R6 |

## WebSocket RFC 6455 (websocket_rfc6455.md)

| Fact | Verdict | Where |
|---|---|---|
| Handshake and Sec-WebSocket-Accept computation | verified by running the RFC example (s1.3) | R6 |
| "STD 34" | corrected: RFC 6455 is a Proposed Standard (RFC index; atlas agent agrees). Not stated on the page | none |
| Framing, masking, close codes, permessage-deflate, RFC 8441/9220, WebTransport, scaling, CSWSH details | child | child |
| 2 to 14 bytes framing per message | verified (RFC 6455 s5.2 frame layout) | R6 |

## RPC and API styles (rpc_and_api_styles.md)

| Fact | Verdict | Where |
|---|---|---|
| REST constraints (Fielding ch5) | verified | R7 |
| Richardson levels, pagination, versioning, errors, LRO | child / Building a backend API page | linked |
| gRPC protobuf, field numbers, four modes, deadlines, status codes, L4 LB pinning | verified (gRPC docs, LB blog, encoding guide; own protobuf run) | R7 |
| tRPC comparison | child | child |
| GraphQL costs | kept in summary | R7 |
| Triton, Ray, vector DBs, OTLP speak gRPC | Triton and OTLP kept; others unconfirmed today | R7 |

## Auth (auth_oauth_oidc_jwt.md)

| Fact | Verdict | Where |
|---|---|---|
| OAuth 2.1 consolidates 2.0 + PKCE + BCP; flows that survive | verified (draft-16; RFC 9700 index) | R8 |
| PKCE mechanics | verified by running RFC 7636 appendix B | R8 |
| Device grant RFC 8628 | verified | R8 |
| OIDC ID token claims; never use ID tokens as API credentials | verified in substance | R8 |
| JWT pitfalls (alg none, audience) | verified by running PyJWT 2.15.1 and RFC 8725 | R8 |
| API key hygiene | kept | R8 |
| SigV4 HMAC-signed requests | verified (AWS docs link) | R8 |
| MCP OAuth details: RFC 9728, RFC 8707, CIMD, RFC 9207 | verified (spec changelog; old "replaced DCR" corrected to "deprecated DCR") | R9 |
| Token exchange RFC 8693 | verified (index) | R8 |

## MCP (model_context_protocol_mcp.md)

| Fact | Verdict | Where |
|---|---|---|
| Spec revision history table | 2026-07-28 row verified from the changelog; earlier rows unconfirmed today | R9 (current revision only) / child |
| Sampling, Roots, Logging deprecated (12-month window) | verified | child |
| No Mcp-Session-Id; _meta per request; Mcp-Method/Mcp-Name headers | verified and recorded (Python SDK 2.3.0 run) | R9 |
| "MCP declared dead" InfoQ August 2026 | unconfirmed; dropped | none |
| Prompt injection via tool results; lethal trifecta | verified (Willison 2025-06-16) and demonstrated with a recorded call | R9 |
| Tool poisoning, supply chain, session hijacking | child (2026-07-28 replaces session hijacking with state-handle hijacking in the spec) | child |
| Official registry, ~2k servers, PulseMCP/Smithery counts | unconfirmed | child |
| Roadmap 2026-08-22, HN 240+ points | unconfirmed; dropped | none |
| managedMcpServers (Claude Code, Sept 2026); Emergence World stress test 46 hours | unconfirmed; dropped | child |
| Log to stderr with stdio | verified in substance (2026-07-28 changelog suggests stderr for logging) | child |

## SSH (ssh.md)

| Fact | Verdict | Where |
|---|---|---|
| OpenSSH 9.0 and 10.0 PQ defaults, 10.1 WarnWeakCrypto, release dates 10.4 2026-07-06 and 10.5 2026-08-11 | verified (release notes) | R4 (9.0/10.0/10.1) / child |
| DSA removed in 10.0 | verified | child |
| RFC 9987 SSH agent protocol May 2026 | verified (index) | child |
| Host keys and trust on first use | verified in substance | R4 |
| regreSSHion, Terrapin, CVE-2025-* details; config examples; cluster workflows | child | child |
