"""Header bytes per request: HTTP/1.1 text against HPACK (HTTP/2) and QPACK (HTTP/3), for three real header sets.

1. Captures the exact request the Anthropic Python SDK sends (to echo_backend.py; no real API) for its header list.
2. Encodes three header sets with the h2 library's own encoder path (H2Connection, as a client would) on one connection,
   request after request, and parses each HEADERS block with hpack_parse (kind and bytes of every field):
   the running request (x-api-key), the same with "authorization: Bearer" instead, and the SDK's full header set.
3. Encodes the same sets with pylsqpack (aioquic's QPACK) with and without a dynamic table.
Writes raw/hpack_sizes.json and raw/sdk_request_anthropic.txt.
Usage: python hpack_sizes.py <echo port> <echo.jsonl> <raw dir>
"""
import json, os, sys, time
import anthropic, h2.config, h2.connection, pylsqpack
from hpack_parse import Parser

EPORT, ECHO, RAW = int(sys.argv[1]), sys.argv[2], sys.argv[3]
KEY = "sk-wirelab-not-a-real-key"
n0 = sum(1 for _ in open(ECHO))
try:
    anthropic.Anthropic(api_key=KEY, base_url=f"http://127.0.0.1:{EPORT}", max_retries=0).messages.create(
        model="wire-lab-1", max_tokens=16, messages=[{"role": "user", "content": "What colour is the sky?"}])
except Exception:
    pass  # the echo backend answers "ok", which the SDK cannot parse; only the request matters here
raw = [json.loads(l) for l in open(ECHO)][n0]["raw"]
open(os.path.join(RAW, "sdk_request_anthropic.txt"), "w").write(raw)
head = raw.split("\r\n\r\n")[0].split("\r\n")
sdk_fields = [(l.split(":", 1)[0].lower(), l.split(":", 1)[1].strip()) for l in head[1:]]
body_len = len(raw.split("\r\n\r\n", 1)[1])

PSEUDO = [(":method", "POST"), (":scheme", "https"), (":authority", "api.llm.test"), (":path", "/v1/messages")]
SETS = {
    "running": PSEUDO + [("content-type", "application/json"), ("x-api-key", KEY), ("content-length", "117")],
    "bearer": PSEUDO + [("content-type", "application/json"), ("authorization", "Bearer " + KEY), ("content-length", "117")],
    "sdk": PSEUDO + [(k, v) for k, v in sdk_fields if k not in ("host", "connection")],
}


def h1_bytes(fields):
    host = dict(fields)[":authority"]
    lines = ["POST /v1/messages HTTP/1.1", "Host: " + host] + [f"{k}: {v}" for k, v in fields if not k.startswith(":")]
    return len(("\r\n".join(lines) + "\r\n\r\n").encode())


out = {"recorded": time.strftime("%Y-%m-%d"), "sdk": "anthropic " + anthropic.__version__, "sdk_body_bytes": body_len, "sets": {}}
for name, fields in SETS.items():
    c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True))
    c.initiate_connection(); c.data_to_send()
    p = Parser(); reqs = []
    for i in range(3):
        sid = c.get_next_available_stream_id()
        c.send_headers(sid, fields)
        d = c.data_to_send()
        ln = int.from_bytes(d[0:3], "big"); assert d[3] == 1
        reqs.append({"block": ln, "frame": ln + 9, "fields": p.parse(d[9:9 + ln])})
    q = {}
    for label, cap in [("static_only", 0), ("dynamic_4096", 4096)]:
        enc = pylsqpack.Encoder()
        enc.apply_settings(max_table_capacity=cap, blocked_streams=16 if cap else 0)
        sizes = []
        for i in range(3):
            ins, block = enc.encode(4 * i, [(k.encode(), v.encode()) for k, v in fields])
            sizes.append({"block": len(block), "encoder_stream": len(ins)})
        q[label] = sizes
    out["sets"][name] = {"fields": fields, "h1_head_bytes": h1_bytes(fields), "hpack": reqs, "qpack": q}
    print(name, h1_bytes(fields), [r["block"] for r in reqs], q)
json.dump(out, open(os.path.join(RAW, "hpack_sizes.json"), "w"), indent=1)
