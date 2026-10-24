"""Confirm the built page embeds exactly the recorded outputs (after redaction), that no secret-like or
local-network string is embedded, and that the numbers quoted in the Reading prose match the recordings.
Usage: python3 check_embed.py   (after sh ../build.sh)"""
import json, pathlib, re, sys
H = pathlib.Path(__file__).parent; page = (H.parents[1] / "index.html").read_text()
O = H / "code" / "out"; bad = 0
m = re.search(r"window\.RDX=(\{.*?\});\n", page, re.S)
X = json.loads(m.group(1))
RED = re.compile(r"(glpat-[\w-]+|sk-ant-[\w-]+|Bearer [A-Za-z0-9._-]{20,}|\b2a0a:[0-9a-f:]+)")
for f in O.glob("*.txt"):
    want = RED.sub("[redacted]", f.read_text())
    if f.name == "t5_lsof.txt": want = re.sub(r" 0x[0-9a-f]+ ", " ", want)
    if X["txt"].get(f.stem) != want: print("MISMATCH", f.name); bad += 1
for k in ["tls", "dns", "small", "mcp"]:
    if X["json"][k] != json.loads(RED.sub("[redacted]", (O / f"{k}.json").read_text())): print("MISMATCH", k); bad += 1
if re.search(r"glpat-|sk-ant-|\b2a0a:", page): print("SECRET OR LOCAL ADDRESS IN PAGE"); bad += 1
t, d = X["json"]["tls"], X["json"]["dns"]
recs = [e for e in t["tls"]["log"] if "records" in e]
text = re.sub(r"<[^>]+>", "", page)
checks = {
    "ClientHello message 1,482 bytes": recs[0]["records"][0]["len"] == 1482,
    "ClientHello 1,487 B on wire (tab)": recs[0]["bytes"] == 1487,
    "key shares 1216 + 32, server 1120": [k["bytes"] for k in recs[0]["records"][0]["readable_by_eavesdropper"]["key_share"]] == [1216, 32]
        and recs[1]["records"][0]["readable_by_eavesdropper"]["key_share"][0]["bytes"] == 1120,
    "request record 299 B": recs[3]["bytes"] == 299,
    "about 3.5 KB handshake": abs(recs[0]["bytes"] + recs[1]["bytes"] + recs[2]["bytes"] - 3500) < 100,
    "token records 146 to 148": sorted({e["bytes"] for e in recs if e["dir"] == "server->client" and len(e["records"]) == 1 and e["records"][0]["len"] > 130}) == [146, 147, 148],
    "TTL 115 then 79": "115 IN A" in d["a1"]["answer"][0] and " 79 IN A" in d["a2"]["answer"][0],
    "getaddrinfo 3.0 ms": d["getaddrinfo"]["ms"] == 3.0,
    "root check RA, 104 ms": "RA" in d["root_check"]["flags"] and round(d["root_check"]["ms"]) == 104,
    "NS TTLs 52,811 and 898": "52811" in d["ns_com"]["answer"][0] and " 898 " in d["ns_dom"]["answer"][0],
    "PKCE matches RFC": X["json"]["small"]["pkce"]["match"], "WS accept matches RFC": X["json"]["small"]["websocket_accept"]["match"],
    "protobuf 08 96 01": X["json"]["small"]["protobuf_150"]["bytes_hex"] == "08 96 01",
    "curl ClientHello 314": "[314 bytes data]" in X["txt"]["t3_curl_h1_v"],
    "MCP 2026-07-28 headers": "mcp-method: tools/call" in X["json"]["mcp"]["http"][0] and "mcp-name: fetch_page" in X["json"]["mcp"]["http"][0],
}
for k, v in checks.items():
    if not v: print("PROSE NUMBER NOT IN RECORDING:", k); bad += 1
print("checks", len(checks), "bad", bad); sys.exit(1 if bad else 0)
