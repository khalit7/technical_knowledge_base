# Protocol atlas (tab t-atlas)

Parts: `parts/33_tab_atlas.html` (markup and CSS scoped under `#t-atlas`), `parts/33_js_0data.js` (generated data, `window.AT_DATA`), `parts/33_js_atlas.js` (helpers, view switch, detail card, corrections table), `parts/33_js_stack.js` (stack map with lines and the path walk animation), `parts/33_js_choose.js` (which protocol when), `parts/33_js_cmp.js` (compare two), `parts/33_js_time.js` (timeline). Element ids start with `at-`; renders register in `window.TAB_RENDER['t-atlas']`.

## Data
- `data_a.py` (IP, TCP, UDP, QUIC, DNS with DoT/DoH/DoQ, TLS 1.3, X.509/PKI/ACME, mTLS/SPIFFE, SSH), `data_b.py` (HTTP/1.1, 2, 3, WebSockets, SSE, webhooks, REST/OpenAPI, gRPC/protobuf, GraphQL, JSON-RPC 2.0), `data_c.py` (OAuth 2.1, OIDC, JWT/JWS/JWK, API keys, SigV4, MCP, A2A, UCP, MHS, and one-line RDMA, RoCEv2, InfiniBand, NCCL). Each entry: layer, problem, how it works, runs on, what it adds, costs, when not to use, replaced and competitors, where an ML engineer meets it, its classic failure (symptom, cause, command), a real recording, and sources.
- `meta.py`: stack rows, the chooser's questions and ordered rules, notes for common compare pairs.
- `corrections.md`: old Notion claims checked (parsed into the page, shown in each entry and in the "Old notes checked" view). `unconfirmed.md`: what was dropped and why.
- `fetch_sources.py` (run 2026-10-05) writes `sources/rfc_meta.json` (RFC Editor JSON for 97 RFCs), `sources/drafts.json` (Datatracker), `sources/github.json` (releases and repository states). RFC titles, months and statuses, draft revisions and release dates on the page come from these files, never typed by hand. `sources/mcp_2026-07-28_auth_security.mdx` is a verbatim copy of an MCP spec file read (the 2026-07-28 changelog was read online and is not copied because it contains em dashes).
- `build_data.py` writes `atlas.json` and `../parts/33_js_0data.js`; it fails on unknown ids, missing fields, missing recordings, em dashes or secret-looking strings. Then `sh ../build.sh`.

## Recordings (wire/)
`wire/run_public.sh` (read-only, unauthenticated requests to public endpoints, one each) and `wire/run_local.sh` (gRPC health server and SSE server on 127.0.0.1 from `local_servers.py`; `webhook_sign.py`, `jwt_demo.py`, `sigv4_demo.py` with made-up or AWS's documented example credentials) call `rec.sh`, which writes `wire/out/<id>.txt` (command, output, exit code). `wire/redact.py` replaces the name of the recording machine's device-management DNS filter (it intercepts DoH and serves its own certificate) and fails on anything secret-looking. Machine and tool versions: `wire/out/meta.txt`. OpenSSL 3.6.5 came from a conda-forge build in the session scratchpad; macOS curl 8.7.1 has no HTTP/3, so QUIC is shown through the `alt-svc` advertisement only.

## Checks
- `python3 check_embed.py`: the page embeds exactly `atlas.json` and every recording byte for byte; no secrets; every RFC named is in the fetched metadata.
- `node at_check.mjs`: clicks every chip, walk control and path, every chooser answer, timeline filter, compare pair and select, at 390 px dark and 920 px light (1,438 clicks); fails on errors, NaN, undefined, sideways scroll or overflow; checks the line count per selection and that the walk does not autoplay under reduced motion.

## Departures from the topic method
None in shape: a data tab that compares everything (Part A). The before/after animation is the path walk: the same message going down the stack, with a path selector that runs it again over another path (SSE on HTTP/2 on TLS on TCP, against SSE on HTTP/3 on QUIC on UDP).
