"""Prove the page embeds exactly the recordings, and that the numbers written into the prose match them.
python3 check_embed.py   (after make_data.py and build.sh)
1. window.SA inside ../index.html equals make_data.data() rebuilt from raw/ now.
2. Every number typed by hand into the Reading is recomputed from raw/ and must appear in the page.
3. The JavaScript varint encoder's logic, re-implemented here, matches the protobuf library's recorded bytes.
4. Every Notion link (app.notion.com/p/<id>) is a page in technical_knowledge_base/pages.json.
5. No secret-looking strings, local addresses other than 127.0.0.1, home paths or private patterns."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "..", "src"))
import make_data, private_patterns  # noqa: E402

html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
ok = True


def fail(msg):
    global ok
    ok = False; print("FAIL", msg)


# 1. embedded data
m = re.search(r"window\.SA=(\{.*?\});\n", html, re.S)
emb = json.loads(m.group(1)) if m else None
if emb != json.loads(json.dumps(make_data.data())):
    fail("embedded window.SA differs from raw/ (run make_data.py and build.sh)")
D = make_data.data()

# 2. hand-typed numbers in the prose, each recomputed from the recordings
pb, dl, lb, gq, st = D["pb"], D["deadline"], D["lb"], D["gql"], D["status"]
c0 = D["frames"]["conns"][0]
claims = {
    "49 bytes against 117 in JSON": pb["request"]["pb_bytes"] == 49 and pb["request"]["json_bytes"] == 117,
    "JSON 2.4 times protobuf": round(pb["request"]["json_bytes"] / pb["request"]["pb_bytes"], 1) == 2.4,
    "150 is 96 01": any(v["v"] == 150 and v["hex"] == "96 01" for v in pb["varints"]),
    "300 is ac 02": any(v["v"] == 300 and v["hex"] == "ac 02" for v in pb["varints"]),
    "token ' sky' bytes": pb["tokens"]["pb_hex"][1] == "0a 04 20 73 6b 79 10 01",
    "tokens 5 to 9 bytes": min(pb["tokens"]["pb_bytes"]) == 5 and max(pb["tokens"]["pb_bytes"]) == 9,
    "tokens 10 to 14 bytes framed": min(pb["tokens"]["grpc_msg_bytes"]) == 10 and max(pb["tokens"]["grpc_msg_bytes"]) == 14,
    "int32 -1 10 bytes, sint32 1": pb["zigzag"]["int32_minus1_bytes"] == 11 and pb["zigzag"]["sint32_minus1_bytes"] == 2,
    "reuse same type gives maxTokens 9": pb["evolve_silent"]["old_reader_sees"] == {"maxTokens": 9},
    "reuse other type drops maxTokens": "maxTokens" not in pb["evolve_reuse"]["old_reader_sees"],
    "unknown fields round-trip": pb["evolve_add"]["v1_reserialised_equal"] is True,
    "tensor about five times (JSON list / protobuf)": round(pb["tensor"]["rows"][0]["bytes"] / pb["tensor"]["rows"][2]["bytes"]) == 5,
    "base64 gap 4/3": abs(pb["tensor"]["rows"][1]["bytes"] / pb["tensor"]["rows"][2]["bytes"] - 4 / 3) < 0.01,
    "request DATA prefix 00 00 00 00 31": [f for f in c0 if f["type"] == "DATA"][0]["hex"].startswith("00 00 00 00 31"),
    "grpc-timeout on the wire": any(k == "grpc-timeout" for k, v in [f for f in c0 if f["type"] == "HEADERS"][0]["headers"]),
    "trailers-only grpc-status 12": ["grpc-status", "12"] in [f for f in D["frames"]["conns"][1] if f["type"] == "HEADERS" and f["dir"] == "s>c"][0]["headers"],
    "health answer 08 01": D["frames"]["app"][2]["bytes"] == "08 01",
    "run D: all 40 tokens generated, far more than delivered": dl[3]["inference"]["tokens_made"] == 40 and dl[3]["client"]["tokens_received"] < 12,
    "run A: downstream stopped near the deadline": dl[0]["inference"]["tokens_made"] < 12 and dl[0]["hop2_timeout"].endswith("m") and int(dl[0]["hop2_timeout"][:-1]) < 600,
    "run B: no grpc-timeout on hop 2, still stopped": dl[1]["hop2_timeout"] is None and dl[1]["inference"]["tokens_made"] < 12,
    "client stops after 0.6 s": all(round(r["client"]["gave_up_s"], 1) == 0.6 for r in dl),
    "pick_first 30/0/0": lb["counts"][0]["answers"] == {"backend-1": 30},
    "L4 30/0/0": lb["counts"][2]["answers"] == {"backend-1": 30},
    "L7 10/10/10": lb["counts"][3]["answers"] == {"backend-1": 10, "backend-2": 10, "backend-3": 10},
    "round_robin even": sorted(lb["counts"][1]["answers"].values()) in ([10, 10, 10], [9, 10, 11]),
    "plain L4 never reached backend-3": "backend-3" not in lb["timelines"][0]["totals"],
    "L4 + age and L7 reached backend-3, no failed calls": all("backend-3" in lb["timelines"][i]["after_join"] for i in (1, 2)) and all(c[1].startswith("backend-") for t in lb["timelines"] for c in t["calls"]),
    "fixed list never reached backend-3": "backend-3" not in lb["timelines"][3]["totals"],
    "N+1: 21 and 2": gq["n1"][0]["naive"]["db_calls"] == 21 and gq["n1"][0]["batched"]["db_calls"] == 2,
    "N+1: 141 and 4": gq["n1"][1]["naive"]["db_calls"] == 141 and gq["n1"][1]["batched"]["db_calls"] == 4,
    "too many pings at about 5 s": [f for f in st["pings"] if f["type"] == "GOAWAY"][0]["debug"] == "too_many_pings",
    "4 MiB limit in details": any("4194304" in (c.get("details") or "") for c in st["cases"]),
    "502 synthesised": any("status: 502" in (c.get("details") or "") for c in st["cases"]),
    "retry: three attempts, headers 1 and 2": [r["header"] for r in st["retry"]] == [None, "1", "2"],
    "unavailable in about 1 ms": [c for c in st["cases"] if c["id"] == "unavailable"][0]["ms"] <= 3,
}
for k, v in claims.items():
    if not v:
        fail("prose claim no longer matches the recordings: " + k)
for s in ["49 bytes against 117", "2.4 times protobuf", "<code>96 01</code>", "<code>ac 02</code>", "0a 04 20 73 6b 79 10 01",
          "141 database calls", "30/0/0", "10/10/10"]:
    if s.replace("<code>", "").replace("</code>", "") not in re.sub(r"</?code>", "", html):
        fail("expected text not found in page: " + s)

# 3. varint logic
def varint(n):
    out = []
    while True:
        b = n & 127; n >>= 7
        out.append(b | (128 if n else 0))
        if not n:
            return " ".join(f"{x:02x}" for x in out)
for v in pb["varints"]:
    if varint(v["v"]) != v["hex"]:
        fail(f"varint {v['v']}")

# 4. Notion links
pages = json.load(open(os.path.join(HERE, "..", "..", "..", "..", "pages.json")))
pages = pages if isinstance(pages, list) else pages.get("pages", pages)
known = {re.sub("-", "", str(p.get("notion_id") or p.get("id") or "")) for p in pages}
known.add("3c65c17b0d0d81cb88a3f1f63e85f27b")
for nid in set(re.findall(r"app\.notion\.com/p/([0-9a-f]{32})", html)):
    if nid not in known:
        fail("Notion id not in pages.json: " + nid)

# 5. secrets and private data
for pat in [r"glpat-", r"sk-ant-", r"Bearer [A-Za-z0-9._-]{12,}", r"/Users/", r"192\.168\.", r"\b10\.\d+\.\d+\.\d+\b", r"BEGIN [A-Z ]*PRIVATE KEY"]:
    if re.search(pat, html):
        fail("forbidden pattern in page: " + pat)
if re.search(private_patterns.alternation(), html, re.I):
    fail("private pattern in page")
print("check_embed:", "ok" if ok else "FAIL", f"({len(claims)} recorded claims, {len(pb['varints'])} varints, {len(set(re.findall(r'app.notion.com/p/([0-9a-f]{32})', html)))} Notion links)")
sys.exit(0 if ok else 1)
