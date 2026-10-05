"""Turn the raw captures in raw/ into parts/31_js_wi_0data.js (window.WI_DATA), the only source of
numbers and bytes for the On the wire tab. Standard library only. Deterministic: the same raw/
gives the same file, which check_wire.py relies on.
Usage: python3 build_data.py [--print]   (writes ../parts/31_js_wi_0data.js)
"""
import csv, glob, json, os, re, statistics, sys

HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "parts", "31_js_wi_0data.js")


def J(name):
    return json.load(open(os.path.join(R, name)))


def T(name):
    return open(os.path.join(R, name), encoding="utf-8", errors="replace").read()


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 2) if xs else None


def env():
    e = {}
    for line in T("env.txt").splitlines():
        k, _, v = line.partition(": "); e[k] = v.strip()
    return e


# ---------- the request ----------
def request():
    arr = J("h1_arrivals.json")
    return {"body": T("../request.json"), "h1_request": open(os.path.join(R, "h1_request.bin"), "rb").read().decode(),
            "h1_response": open(os.path.join(R, "h1_response.bin"), "rb").read().decode(), "arrivals": arr}


# ---------- waterfalls ----------
PH = ["tcp_ms", "tls_ms", "sent_ms", "first_byte_ms", "first_token_ms", "last_token_ms"]


def client_runs(name):
    d = J(name); rows = []
    for r in d["runs"]:
        s, t = r["setup"], r["timing"]
        rows.append({"dns": s["dns_ms"], "tcp": s["tcp_ms"], "tls": s["tls_ms"], "sent": t["sent_ms"], "fb": t["first_byte_ms"],
                     "ft": t["first_token_ms"], "lt": t["last_token_ms"]})
    return rows


def h3_runs(name):
    return [{"dns": None, "tcp": None, "tls": r["connect_ms"], "sent": r["connect_ms"], "fb": r["headers_ms"], "ft": r["first_token_ms"], "lt": r["last_token_ms"]}
            for r in J(name)["runs"]]


def summarize(rows):
    keys = ["dns", "tcp", "tls", "sent", "fb", "ft", "lt"]
    return {"n": len(rows), "median": {k: med([r[k] for r in rows]) for k in keys}, "runs": rows}


def curl_tsv(name, keycol):
    rows = list(csv.DictReader(open(os.path.join(R, name)), delimiter="\t")); g = {}
    for r in rows:
        k = r[keycol] + "|" + r["http_version"] if keycol == "path" else r[keycol]
        g.setdefault(k, []).append(r)
    out = {}
    for k, rs in g.items():
        f = lambda c: [float(x[c]) * 1000 for x in rs]
        out[k] = {"n": len(rs), "http_version": rs[0]["http_version"], "remote_ip": rs[0]["remote_ip"],
                  "dns": med(f("time_namelookup")), "tcp": med(f("time_connect")), "tls": med(f("time_appconnect")),
                  "ttfb": med(f("time_starttransfer")), "total": med(f("time_total")),
                  "first": {c: round(float(rs[0][c]) * 1000, 2) for c in ["time_namelookup", "time_connect", "time_appconnect", "time_starttransfer", "time_total"]},
                  "runs": [{c: round(float(x[c]) * 1000, 2) for c in ["time_namelookup", "time_connect", "time_appconnect", "time_starttransfer", "time_total"]} for x in rs]}
    return out


def waterfall():
    return {
        "local": {"h1": summarize(client_runs("client_h1.json")), "h2": summarize(client_runs("client_h2.json")), "h3": summarize(h3_runs("h3_local_runs.json"))},
        "netem": {"h1": summarize(client_runs("client_h1_netem.json")), "h2": summarize(client_runs("client_h2_netem.json")), "h3": summarize(h3_runs("h3_netem.json"))},
        "curl_local": curl_tsv("curl_local.tsv", "path"), "curl_netem": curl_tsv("curl_netem.tsv", "path"),
        "public": curl_tsv("public_curl.tsv", "host"),
    }


# ---------- TLS parsing (records and the two hello messages, RFC 8446) ----------
GROUPS = {0x001d: "x25519", 0x0017: "secp256r1", 0x0018: "secp384r1", 0x0019: "secp521r1", 0x001e: "x448", 0x11ec: "X25519MLKEM768",
          0x0100: "ffdhe2048", 0x0101: "ffdhe3072", 0x0102: "ffdhe4096", 0x0103: "ffdhe6144", 0x0104: "ffdhe8192", 0x11eb: "SecP256r1MLKEM768", 0x11ed: "SecP384r1MLKEM1024"}
SUITES = {0x1301: "TLS_AES_128_GCM_SHA256", 0x1302: "TLS_AES_256_GCM_SHA384", 0x1303: "TLS_CHACHA20_POLY1305_SHA256"}
CTYPE = {20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data"}


def records(chunks):
    """Split each direction's byte stream into TLS records: 5-byte header (type, version, length)."""
    out, buf = [], {"in": b"", "out": b""}
    for c in chunks:
        d = c["dir"]; buf[d] += bytes.fromhex(c["hex"])
        while len(buf[d]) >= 5:
            n = int.from_bytes(buf[d][3:5], "big")
            if len(buf[d]) < 5 + n:
                break
            rec = buf[d][:5 + n]; buf[d] = buf[d][5 + n:]
            out.append({"t_ms": c["t_ms"], "dir": d, "type": CTYPE.get(rec[0], str(rec[0])), "len": n, "head_hex": rec[:5].hex(), "body": rec[5:]})
    return out


def exts(b):
    out = {}
    while len(b) >= 4:
        t = int.from_bytes(b[:2], "big"); n = int.from_bytes(b[2:4], "big"); out[t] = b[4:4 + n]; b = b[4 + n:]
    return out


def client_hello(body):
    h = body[4:]  # msg type + 3-byte length
    p = 2 + 32; sid = h[p]; p += 1 + sid
    cs = int.from_bytes(h[p:p + 2], "big"); suites = [int.from_bytes(h[p + 2 + i:p + 4 + i], "big") for i in range(0, cs, 2)]; p += 2 + cs
    p += 1 + h[p]; el = int.from_bytes(h[p:p + 2], "big"); e = exts(h[p + 2:p + 2 + el])
    sni = e[0][5:].decode() if 0 in e else None
    alpn, a = [], e.get(16, b"")[2:]
    while a:
        alpn.append(a[1:1 + a[0]].decode()); a = a[1 + a[0]:]
    ks, k = [], e.get(51, b"")[2:]
    while len(k) >= 4:
        g = int.from_bytes(k[:2], "big"); n = int.from_bytes(k[2:4], "big"); ks.append({"group": GROUPS.get(g, hex(g)), "bytes": n}); k = k[4 + n:]
    sg = e.get(10, b"")[2:]; groups = [GROUPS.get(int.from_bytes(sg[i:i + 2], "big"), hex(int.from_bytes(sg[i:i + 2], "big"))) for i in range(0, len(sg), 2)]
    sv = e.get(43, b"")[1:]; versions = ["TLS 1.3" if sv[i:i + 2] == b"\x03\x04" else "TLS 1.2" if sv[i:i + 2] == b"\x03\x03" else sv[i:i + 2].hex() for i in range(0, len(sv), 2)]
    return {"len": len(body), "sni": sni, "alpn": alpn, "key_shares": ks, "groups": groups, "versions": versions,
            "suites": [SUITES.get(s, hex(s)) for s in suites][:8], "n_suites": len(suites), "n_ext": len(e)}


def server_hello(body):
    h = body[4:]; p = 2 + 32; sid = h[p]; p += 1 + sid
    suite = int.from_bytes(h[p:p + 2], "big"); p += 3; el = int.from_bytes(h[p:p + 2], "big"); e = exts(h[p + 2:p + 2 + el])
    ks = e.get(51, b""); g = int.from_bytes(ks[:2], "big") if len(ks) >= 4 else None
    return {"len": len(body), "suite": SUITES.get(suite, hex(suite)), "group": GROUPS.get(g, hex(g)) if g else None,
            "key_share_bytes": int.from_bytes(ks[2:4], "big") if len(ks) >= 4 else None, "psk": 41 in e}


H2T = {0: "DATA", 1: "HEADERS", 4: "SETTINGS", 6: "PING", 7: "GOAWAY", 8: "WINDOW_UPDATE", 3: "RST_STREAM"}


def anatomy():
    d = J("client_h2.json"); r = d["runs"][0]
    recs = records(r["wire"]); hs = [x for x in recs if x["type"] == "handshake"]
    ch = client_hello(hs[0]["body"]); sh = server_hello([x for x in hs if x["dir"] == "in"][0]["body"])
    rec_list = [{k: v for k, v in x.items() if k != "body"} for x in recs]
    # one token's journey: the DATA frame and the TLS record that carried it
    frames = r["h2_frames"]
    data_in = [f for f in frames if f["dir"] == "in" and f["type"] == "DATA" and f["len"] > 0]
    app_in = [x for x in rec_list if x["dir"] == "in" and x["type"] == "application_data"]
    h1 = J("client_h1.json")["runs"][0]
    h1recs = [{k: v for k, v in x.items() if k != "body"} for x in records(h1["wire"])]
    # HTTP/3: datagrams the client received, from its qlog
    q = json.load(open(glob.glob(os.path.join(R, "qlog_h3", "*.qlog"))[0]))["traces"][0]["events"]
    q0 = q[0]["time"]; h3pk = []
    for e in q:
        if e["name"] == "transport:packet_received":
            fr = [{"type": f.get("frame_type"), "stream": f.get("stream_id"), "offset": f.get("offset"), "len": f.get("length")} for f in e["data"].get("frames", [])]
            h3pk.append({"t_ms": round(e["time"] - q0, 3), "pn": e["data"]["header"].get("packet_number"), "ptype": e["data"]["header"].get("packet_type"),
                         "size": e["data"].get("raw", {}).get("length"), "frames": [f for f in fr if f["type"] in ("stream", "crypto", "ack", "handshake_done")]})
    sclient = T("s_client_local_tls13.txt")
    sc_lines = [l for l in sclient.splitlines() if l.startswith((">>>", "<<<"))]
    return {"local_port": r["local_port"], "setup": r["setup"], "tls_msgs": r["tls_msgs"], "records": rec_list, "client_hello": ch, "server_hello": sh,
            "h2_frames": frames, "data_frames": data_in, "app_records_in": app_in, "h1_records": h1recs, "h1_timing": h1["timing"], "h2_timing": r["timing"],
            "h3_packets": h3pk, "s_client_tls13": sc_lines, "s_client_tls12": [l for l in T("s_client_local_tls12.txt").splitlines() if l.startswith((">>>", "<<<"))],
            "dig": T("dig_api.anthropic.com.txt"), "dig_trace": T("dig_trace_api.anthropic.com.txt"), "dig_root": T("dig_root_norecurse.txt"),
            "doh": J("doh_api.anthropic.com.json"), "doh_blocked": T("doh_by_name_blocked.txt"), "dig_repeat": list(csv.DictReader(open(os.path.join(R, "dig_repeat.tsv")), delimiter="\t")),
            "chain_public": T("chain_api.anthropic.com.txt"), "chain_local": T("chain_local.txt"), "curl_verbose": T("curl_local_h2_verbose.txt")}


# ---------- head-of-line blocking ----------
def hol():
    H = os.path.join(R, "hol"); out = {"stall_ms": int(open(os.path.join(H, "quic_stall_ms.txt")).read().strip())}
    for tag in ("base", "loss"):
        for p in ("h1", "h2", "h3"):
            d = json.load(open(os.path.join(H, "%s_%s.json" % (tag, p))))
            ev = [json.loads(l) for l in open(os.path.join(H, "nt_%s_%s.log" % (tag, p)))]
            hit = [e for e in ev if e.get("held") or e.get("dropped")]
            out["%s_%s" % (tag, p)] = {"sent": d["sent_ms"], "tokens": d["token_ms"], "setup": d["setup"], "event": hit[0] if hit else None}
    # which QUIC packet was lost, and when its bytes came again (client qlog of the loss run)
    q = json.load(open(glob.glob(os.path.join(H, "qlog_loss", "*.qlog"))[0]))["traces"][0]["events"]; q0 = q[0]["time"]; pk = []
    for e in q:
        if e["name"] == "transport:packet_received" and e["data"]["header"].get("packet_type") == "1RTT":
            pk.append({"t_ms": round(e["time"] - q0, 1), "pn": e["data"]["header"]["packet_number"],
                       "stream": [[f["stream_id"], f["offset"], f["length"]] for f in e["data"].get("frames", []) if f.get("frame_type") == "stream"]})
    pns = [p["pn"] for p in pk]; missing = [n for n in range(min(pns), max(pns)) if n not in pns]
    out["quic_packets"] = pk; out["quic_missing_pn"] = missing
    return out


# ---------- TLS 1.2 vs 1.3, resumption, keep-alive ----------
def hs_bytes(r):
    if not r.get("wire"):
        return None
    lim = r["setup"]["tls_ms"]; b = {"out": 0, "in": 0}
    for x in r["wire"]:
        if x["t_ms"] <= lim:
            b[x["dir"]] += x.get("bytes", len(x.get("hex", "")) // 2)
    return b


def conn_runs(name):
    out = []
    for r in J(name)["runs"]:
        s = r["setup"]
        out.append({"new": r["new_connection"], "resumed": s.get("resumed"), "tls_version": s.get("tls_version"), "tcp_ms": s.get("tcp_ms"), "tls_ms": s.get("tls_ms"),
                    "first_byte_ms": r["timing"].get("first_byte_ms"), "first_token_ms": r["timing"].get("first_token_ms"),
                    "msgs": [[m["dir"], m["msg"], m["len"], m["t_ms"]] for m in r.get("tls_msgs", [])], "hs_bytes": hs_bytes(r)})
    return out


def handshakes():
    return {"tls12_netem": conn_runs("tls1.2_netem.json"), "tls13_netem": conn_runs("tls1.3_netem.json"),
            "tls12_public": conn_runs("public_tls1.2_cloudflare.json"), "tls13_public": conn_runs("public_tls1.3_cloudflare.json"),
            "resume_netem": conn_runs("resume_netem.json"), "keepalive_netem": conn_runs("keepalive_netem.json"),
            "h3_resume_netem": J("h3_resume_netem.json")["runs"], "h3_0rtt_netem": J("h3_0rtt_netem.json")["runs"]}


def server():
    src = open(os.path.join(HERE, "llm_server.py")).read()
    g = lambda k: float(re.search(k + r' = float\(os.environ.get\("' + k + r'", "([0-9.]+)"\)\)', src).group(1))
    return {"first_token_delay_s": g("FIRST_TOKEN_DELAY"), "token_gap_s": g("TOKEN_GAP"), "tokens": json.loads(re.search(r"TOKENS = (\[.*\])", src).group(1))}


def main():
    data = {"env": env(), "server": server(), "request": request(), "waterfall": waterfall(), "anatomy": anatomy(), "hol": hol(), "hs": handshakes()}
    s = json.dumps(data, separators=(",", ":"), sort_keys=True)
    for bad in ("glpat-", "sk-ant-", "Bearer "):
        assert bad not in s, bad
    js = "// generated by src/wire/build_data.py from src/wire/raw/: do not edit by hand\nwindow.WI_DATA=" + s + ";\n"
    open(OUT, "w").write(js)
    print("wrote", OUT, len(js), "bytes")
    if "--print" in sys.argv:
        print(json.dumps(data, indent=1)[:4000])


if __name__ == "__main__":
    main()
