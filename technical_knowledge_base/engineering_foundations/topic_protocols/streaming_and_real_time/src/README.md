# src: Streaming and real-time

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembler as the HTTP sibling: `{{text|url}}` links, `n:<id>` for Notion, `#t-<tab>` for tabs; every JS part in its own script; error box).
Data: `python3 make_data.py` joins `raw/` into `parts/22_js_data.js` (window.SDATA) and computes the key numbers K.
Checks: `python3 html_utils/ledger.py check <page>` (knowledge ledger, `ledger.json`), `python3 check_embed.py` (page embeds exactly the current data; every quoted number in the prose, written as `<span data-k>`, equals K; no secrets or private patterns), `node check_ui.mjs <absolute path to html_utils/node_modules> <shot dir>` (clicks every control at 390 dark and 920 light; NaN, undefined, errors, sideways scroll).
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

## The 2026-10-24 rebuild to the teaching contract
Editing only; no new runs (every measured number is from the 5 October 2026 runs in `raw/`).
- **Top**: the core idea in one sentence, a static hero (five mini sequence diagrams: who opens, which way bytes flow, how long it lives), "You need" (HTTP, Networking foundations), New terms. The old "in one screen" table, "Five things to remember" box and Glossary were restatements and are gone (ledger labels them; terms live in New terms and at first use).
- **Tabs**: Reading and Further reading only. The Parser test tab moved into a closed block of section 2 (it is depth: parsing edge cases); the WebSocket bytes tab moved inline into section 7 (it is the visual of framing). Their JS is now `27_js_rd_parse.js` and `28_js_rd_wsb.js`.
- **New visuals** (`30_js_rd_figs.js`, all static, measured width): hero; six connections on HTTP/1.1 against one HTTP/2 connection (section 3, measured 6 of 8, HTTP/2 panel illustrative); LLM stream anatomy drawn to scale on the measured SSE run with the client-side TTFT (section 4); resumable-stream log (section 5, design pattern); cancellation bars from `cancel.json` (section 5, replaces the table); frame header bits of the token "The" (section 7); permessage-deflate sizes to scale (section 7); proxy path with the three failure points (section 8); a gRPC call as HTTP/2 frames (section 10). The reconnect stepper got a connection timeline strip (`24_js_rd.js`).
- **New content this page owns** (brief 2026-10-24): time to first token as the client sees it (two new keys `fw50_sse_first`, `fw100_sse_first` in `make_data.py`); gRPC streaming at the transport level, sourced from gRPC's PROTOCOL-HTTP2.md and PROTOCOL-WEB.md (read 24 October 2026).
- **Moved to closed blocks**: bytes per mechanism and the one-hour derivation, parser test, Wikimedia stream, compression numbers, frame field and close-code reference tables, WebSockets over HTTP/2 and 3, the measured three-client proxy table with curl and nginx log, per-connection cost, serverless and observability, signature formats and verification evidence, provider audio formats, sync engines, the debugging symptom table, interview questions, corrections to the old pages.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `stream-page-tab`); mode switches and frame picks no longer start playback (checked with a scroll-and-wait script: every scrubber stays at 0).
- **Drills**: seven became three (nginx 504, status 200 with an in-stream error, close code 1006); the others' answers are in the prose or became predict prompts before the steppers.
- **Images**: none. Protocols have no physical object to photograph; diagrams carry the mechanisms.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 51.6 min | 34.8 min |
| Reading, closed details | 3.7 min | 17.0 min |
| Other tabs, core | Parser test 2.2 + WebSocket bytes 1.3 + Further reading 2.6 | Further reading 2.5 |
| Visuals drawn in Reading (svg, canvas, img) | 1 | 14 |

Why about 35 minutes is right: the page owns six mechanisms (polling and long polling, SSE with its clients, LLM token streams, cut/resume/cancel, WebSockets from handshake to production, webhooks) plus voice transports, gRPC streaming and WebTransport, and almost every claim is a measured run with its number. About a fifth of the core words are the captions, counters and step lists of the four steppers (four ways, reconnect, webhook replay, frame decoder). What made the old page long without teaching (recaps, glossary, the overview table, reference tables, extra drills) is cut or closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
546 units: core 408, depth 98, fat 40, owned 0, volatile 0. Fat units carry a `note` (headings, wind-ups, glossary and overview restatements, removed drill options, cards for removed tabs). Three units the first draft had dropped were restored on the page (a line with no colon; unknown field names ignored; where an ML engineer meets webhooks).

## Departures from the method
Child-page shape as in `.claude/skills/explainer-page/page-kinds/topic-child.md`. Simulated parts are labelled on the page: the relay models delay only; the webhook schedule is scaled down 60 times and truncated to four attempts; "think" stands for prefill.

## Not run
HTTP/2 and HTTP/3 versions of the SSE and cancellation measurements (EventSource over h2 would need the browser to trust the lab CA); RFC 8441/9220 WebSockets; WebTransport; real voice APIs (credentials). Packet captures (no root).
