# Reading and Further reading tabs (Topic: protocols)

Owner files: `../parts/20_read.html` (wrapper, scoped CSS, section nav), `20_read_a.html` to `20_read_l.html` (one screen, sections 1 to 10, glossary), `22_js_rd_data.js` (generated), `23_js_rd_util.js`, `24_js_rd_layers.js`, `25_js_rd_tcp.js`, `26_js_rd_tls.js`, `27_js_rd_mcp.js`, `39_tab_more.html`. Ids start with `rd-`. Animations use `RD.anim` from the shared `21_js_rd_common.js`.

## Reproduce
1. `sh code/run_all.sh <venv python> <scratch dir>`: the venv needs Python 3.13 with OpenSSL 3.5 (for the post-quantum key share) and `mcp pyjwt cryptography h2 httpx dnspython protobuf hypercorn aioquic`. Starts the Wire Lab server (`../wire/serve.sh`) on ports 9443/9080 with a throwaway CA in the scratch dir, runs `r1_toolbox.sh` (nc, openssl, curl -v, curl timing, lsof), `r2_tls_wire.py` (TLS 1.3 and plain HTTP, every byte), `r3_dns.py` (a dozen read-only queries about api.anthropic.com), `r5_small.py` (PKCE, WebSocket accept, protobuf, JWT), `r6_mcp/run.py` (one MCP tool call through a logging proxy), kills only its own server, redacts local network addresses, records versions in `code/out/versions.txt`.
2. `python3 gen_data.py` writes `../parts/22_js_rd_data.js` from `code/out/` (plus the JS/TS page's MCP recording).
3. `sh ../build.sh`; `python3 check_embed.py` (page embeds exactly the recordings; prose numbers match them; no secrets or local addresses); `node check_read.mjs` from the repo root (every animation step and mode, sliders, details, tab links at 390 dark and 920 light); `shot.mjs` for single screenshots.

## Notes
- `old/`: the old root and ten children, verbatim (`save_old.py` extracts them from the session transcript). `coverage.md`: every old fact as verified, corrected, unconfirmed or child. `sources/`: RFC index extract and source-check notes.
- No model is called anywhere; the MCP host's next model request is built in the Messages API shape and labelled.
- Departure from Part A of the topic method: the Reading is about 40 minutes rather than 15 to 20, because Khalid asked for a from-zero teaching overview of a topic he has never studied (brief of 2026-10-05); every section ends with a "Go deeper" note so the children can take the depth.
