# src: Streaming and real-time

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembler as the HTTP sibling: `{{text|url}}` links, `n:<id>` for Notion, `#t-<tab>` for tabs; every JS part in its own script; error box).
Data: `python3 make_data.py` joins `raw/` into `parts/22_js_data.js` (window.SDATA) and computes the key numbers K.
Checks: `python3 check_embed.py` (page embeds exactly the current data; every quoted number in the prose, written as `<span data-k>`, equals K; no secrets or private patterns), `node check_ui.mjs <html_utils/node_modules> <shot dir>` (clicks every control at 390 dark and 920 light; NaN, undefined, errors, sideways scroll).
Rerun the measurements: `WORK=<scratch> NGINX=<nginx 1.31.6> HNM=<html_utils/node_modules> sh run_all.sh` (about 3 minutes; ports 30401-30411 and 30420).

## Lab (`lab/`)
| File | What |
|---|---|
| `lab_server.py` | aiohttp server: the root's running answer as SSE (ids, pings, drop, retry, 204, careful cancellation), polling, long polling, WebSocket, edge-case byte streams, a log |
| `relay.py` | TCP relay adding a one-way delay and counting bytes |
| `four_ways.py` | the answer by polling, long polling, SSE, WebSocket through the relay |
| `edge_cases.py`, `parsers_py.py`, `parsers_node.mjs` | 18 SSE parsing cases through 8 parsers (Chrome EventSource via puppeteer) |
| `reconnect.mjs`, `six_limit.mjs` | Chrome EventSource: reconnect timing and Last-Event-ID; six connections per host on HTTP/1.1 |
| `cancel.py` | what the server does after the client leaves |
| `ws_server.py`, `ws_bytes.py` | websockets 17.2 server; a raw-socket client recording every byte |
| `ws_proxy.py`, `ws_proxy_node.mjs`, `nginx_ws.conf.in` | upgrade dropped, idle timeout, Origin check, through nginx, three clients |
| `ws_deflate.py` | permessage-deflate sizes with the library's encoder (input: `inputs/rfc6455_s1.1.txt`) |
| `webhooks.py` | GitHub test vector, Standard Webhooks verification, a delivery run with retries against two receivers |

`raw/wikimedia.json` is a redacted extract of 4 s of Wikimedia's public EventStreams (command in run_all.sh); field values were not kept.
`inputs/` holds the Standard Webhooks spec and GitHub's validation doc as read on 5 October 2026, and the RFC 6455 text used as a long answer.

## Departures from the method
Child-page shape as in methods/topic_pages.md Part B. Three before/after animations live inline in the Reading tab because each belongs to one section's argument; the two standalone visuals (Parser test, WebSocket bytes) got tabs. Simulated parts are labelled on the page: the relay models delay only; the webhook schedule is scaled down 60 times and truncated to four attempts; "think" stands for prefill.

## Not run
HTTP/2 and HTTP/3 versions of the SSE and cancellation measurements (EventSource over h2 would need the browser to trust the lab CA); RFC 8441/9220 WebSockets; WebTransport; real voice APIs (credentials). Packet captures (no root).
