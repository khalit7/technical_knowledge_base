# Topic: protocols

Notion: https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Follows one LLM request on the wire, taught from zero: layers, DNS, TCP/UDP/QUIC, TLS 1.3 and certificates, HTTP/1.1, 2 and 3, streaming (SSE, WebSockets, webhooks), REST and gRPC, auth (API keys, OAuth 2.1, OIDC, JWT, mTLS), agent protocols (MCP, A2A, newer shapes, the trust boundary), debugging and choosing. Tabs: Reading (`src/read/`), On the wire (`src/wire/`: a local stand-in LLM API over HTTP/1.1, 2 and 3, measured waterfalls, handshakes and one lost packet), Failure lab (`src/fail/`: 39 failures reproduced locally, drill mode), Protocol atlas (`src/atlas/`: 32 protocols checked against RFCs and specs), Further reading.
Privacy: recordings are redacted of machine addresses and of the recording machine's DNS-filter vendor; the check scripts read machine-specific patterns from the git-ignored `src/.private_patterns` (see `src/private_patterns.py`). Private keys stay in the scratchpad. All runs on an Apple M1 Pro, 2026-10-05.
The old written root and its ten children are saved verbatim in `src/read/old/`; their claims are checked in `src/read/coverage.md` and `src/atlas/corrections.md`. The Notion page keeps an old narrated video (to be deleted by Khalid) and the ten old child pages.
