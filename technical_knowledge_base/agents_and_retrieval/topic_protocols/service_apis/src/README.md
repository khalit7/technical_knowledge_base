# Service APIs page: sources and how to rebuild

`sh build.sh` writes `../index.html` from `parts/` (same assembler as the HTTP sibling: `{{text|url}}` links, `n:<id>` for Notion, `#t-<tab>` for tab links; every JS part in its own script; error box). Tabs: Reading (`20_read*.html`, JS `23_js_read_a.js`, `24_js_read_b.js`), One gRPC call (`31_*`), Balancer lab (`32_*`), Further reading (`39_tab_more.html`). `21_js_common.js` (RD helpers, step-animation controller) is copied from the HTTP page.

## Data
Everything measured lives in `raw/` and reaches the page only through `make_data.py` -> `parts/22_js_data.js` (`window.SA`). Prose numbers that vary between runs are written through `data-sa="path"` placeholders filled from that object, so a rerun cannot leave stale text.

| Script (`lab/`) | Records | Raw file |
|---|---|---|
| `llm.proto`, `llm_v2.proto` | the running request as protobuf; v2 and a bad reuse for the evolution runs | |
| `pb_bytes.py` | the request byte by byte (own wire walker), JSON vs protobuf, varints, zigzag, packed, evolution, 1M-float tensor in four formats | `pb.json` |
| `infer_server.py`, `frame_proxy.py`, `frames_run.py` | three gRPC calls through a logging h2c proxy (hyperframe + hpack decode each direction) | `frames.json` |
| `gateway.py`, `deadline_run.py` | client -> gateway -> inference, four propagation modes | `deadline.json` |
| `nginx_lb.conf.in`, `lb_run.py` | L4 (stream) and L7 (grpc_pass) nginx, client policies, scale-up timelines | `lb.json` |
| `status_run.py` | 12 failure cases, retry policy, keepalive GOAWAY, reflection | `status.json` |
| `graphql_run.py` | N+1 with and without a loader, fan-out and static cost, partial failure, over-fetching (toy data) | `graphql.json` |

Rerun everything: `WORK=<scratch> NGINX=<nginx 1.31 with http_v2 and stream> sh run_all.sh` (about 2 minutes; ports 30500 to 30549 on 127.0.0.1; only its own processes are stopped; no network needed). nginx is the root Failure lab's build (`../../src/fail/README.md`). Versions: Python 3.13, grpcio 1.84.0, protobuf 7.36.2 (upb), graphql-core 3.3.0, h2 4.4.1, hpack 4.2.0, hyperframe 6.1.0, nginx 1.31.6, macOS 27 on an M1 Pro.

## Checks
- `python3 check_embed.py`: the embedded data equals `make_data.data()`; 35 hand-typed prose claims recomputed from `raw/`; the page's varint logic against the library's bytes; every Notion link is in `pages.json`; no secrets, home paths, LAN addresses or private patterns (`../../src/private_patterns.py`).
- `node src/check_ui.mjs <out dir>` from the repo root: every control at 390 px dark and 920 px light (reduced motion), all four deadline runs and all frames scrubbed, no errors, NaN, undefined, missing values or sideways scroll; card screenshots.
- `sh html_utils/checkpage.sh <this folder>`.

## Departures from the child-page method
None of substance. The page links rather than repeats: balancing algorithms (Capacity planning), REST design (Building a backend API), HTTP/2 framing and timeouts (HTTP), the root's Failure lab cases. `coverage.json` maps every fact of the old page; `viz_ideas.md` lists built and rejected visuals; `inputs/sources.md` lists the primary sources.

## What could not be seen or run
No packet capture (no sudo): the frame proxy sees exactly the bytes the two programs exchanged, not TCP segments. No real GPU or model: the inference service emits fixed tokens on a configured schedule (0.12 s, then every 0.05 s). Envoy was not run (nginx covers L7); KV-cache-aware routing is described from project sources, not measured.
