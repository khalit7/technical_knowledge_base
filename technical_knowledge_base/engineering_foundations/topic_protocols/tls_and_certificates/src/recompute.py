"""Re-derive every computed number on the page from raw/, independently of the recording scripts.
Needs the `cryptography` package for the decryption checks (any venv: run_all.sh's WORK/.venv has it).
Run from src/: python recompute.py   (exit status 1 if any check fails)"""
import hashlib, hmac, json, math, os, sys
sys.path.insert(0, "lab")
from tlsparse import records, hs_messages, read_keylog, Dec, hkdf_expand_label, suite_params

R = lambda n: json.load(open(os.path.join("raw", n)))
fails = 0


def ok(name, cond, detail=""):
    global fails
    print(("ok   " if cond else "FAIL ") + name + (": " + str(detail) if detail else ""))
    fails += 0 if cond else 1


# 1. Decrypt the TLS 1.3 recordings again from the logged bytes and the key log; recompute both Finished values
for mode in ("tls13", "mtls", "rsa", "mldsa44", "mldsa65"):
    d = R("hs_%s.json" % mode); keys = read_keylog(d["keylog"]); suite = d["info"]["cipher"]; h = suite_params(suite)[0]
    dec = {"c2s": Dec(keys["CLIENT_HANDSHAKE_TRAFFIC_SECRET"], suite), "s2c": Dec(keys["SERVER_HANDSHAKE_TRAFFIC_SECRET"], suite)}
    app = {"c2s": "CLIENT_TRAFFIC_SECRET_0", "s2c": "SERVER_TRAFFIC_SECRET_0"}
    rest = {"c2s": b"", "s2c": b""}; transcript = []; fin = {}; n_dec = 0; plain_resp = b""
    for f in d["flights"]:
        if "raw" not in f:
            continue
        recs, rest[f["dir"]] = records(rest[f["dir"]] + bytes.fromhex(f["raw"]))
        for ct, hdr, frag in recs:
            if ct == 22:
                transcript += [m for _, m in hs_messages(frag)]
            elif ct == 23:
                inner, content, pad = dec[f["dir"]].open(hdr, frag); n_dec += 1
                if inner == 22:
                    for t, m in hs_messages(content):
                        if t == 20:
                            sec = keys["SERVER_HANDSHAKE_TRAFFIC_SECRET" if f["dir"] == "s2c" else "CLIENT_HANDSHAKE_TRAFFIC_SECRET"]
                            fk = hkdf_expand_label(sec, b"finished", b"", h().digest_size, h)
                            fin[f["dir"]] = hmac.compare_digest(hmac.new(fk, h(b"".join(transcript)).digest(), h).digest(), m[4:])
                        if t != 4:
                            transcript.append(m)
                        if t == 20:
                            dec[f["dir"]] = Dec(keys[app[f["dir"]]], suite)
                elif inner == 23 and f["dir"] == "s2c":
                    plain_resp += content
    resp = open("../../src/wire/raw/h1_response.bin", "rb").read()
    ok("%s: %d records decrypted, both Finished values recomputed" % (mode, n_dec), fin.get("c2s") and fin.get("s2c"), fin)
    ok("%s: decrypted response equals the root's recorded response bytes" % mode, plain_resp == resp, len(plain_resp))

# 2. Record overheads stated on the page
t13 = R("hs_tls13.json"); t12 = R("hs_tls12.json")
req13 = [r for r in t13["records"] if r["dir"] == "c2s" and r.get("app_bytes")][0]
ok("TLS 1.3 request record = 277 + 1 + 16", req13["len"] == 277 + 17 and req13["app_bytes"] == 277, req13["len"])
req12 = [r for r in t12["records"] if r["dir"] == "c2s" and r["outer"] == "application_data"][0]
ok("TLS 1.2 request record = 277 + 8 + 16", req12["len"] == 277 + 24, req12["len"])
toks = [r["len"] for r in t13["records"] if r["dir"] == "s2c" and r.get("app_bytes") and r["t_ms"] > 100][:5]
ok("token records 139 to 143 bytes", min(toks) == 139 and max(toks) == 143, toks)

# 3. Hybrid share sizes = ML-KEM-768 sizes + 32 (FIPS 203: encapsulation key 1184, ciphertext 1088)
ch = t13["records"][0]["msgs"][0]["hello"]["key_share"]; sh = t13["records"][1]["msgs"][0]["hello"]["key_share"]
ok("client hybrid share 1184 + 32", ch[0] == {"group": "X25519MLKEM768", "bytes": 1216}, ch)
ok("server hybrid share 1088 + 32", sh[0] == {"group": "X25519MLKEM768", "bytes": 1120}, sh)

# 4. Server first flight against the initial window (RFC 6928: 10 segments; 1460-byte segments)
for mode in ("tls13", "rsa", "mldsa44", "mldsa65"):
    d = R("hs_%s.json" % mode); tot = 0
    for r in d["records"]:
        if r["dir"] != "s2c":
            continue
        names = [m["type"] for m in r.get("msgs", [])]
        if "NewSessionTicket" in names or r.get("inner") == "application_data":
            break
        tot += r["len"] + 5
    seg = math.ceil(tot / 1460)
    print("     %s: first flight %d bytes = %d segments" % (mode, tot, seg))
    ok("%s fits the initial window: %s" % (mode, seg <= 10), (seg <= 10) == (mode != "mldsa65"), seg)

# 5. HelloRetryRequest costs about one round trip (2 x one-way delay)
h = R("hrr.json"); c = h["cases"]; rtt = 2 * h["one_way_delay_ms"]
extra = [c[2]["client_finished_ms"] - c[1]["client_finished_ms"], c[3]["client_finished_ms"] - c[0]["client_finished_ms"]]
ok("HRR adds one round trip (%g ms) within 15 ms" % rtt, all(abs(e - rtt) < 15 for e in extra), extra)
ok("HRR exactly in the two mismatched cases", [x["hello_retry"] for x in c] == [False, False, True, True, False])

# 6. Every surveyed leaf respects the lifetime cap in force at its issue date (BR 6.3.2), and Chrome's SCT counts
p = R("public_chains.json")
for x in p["hosts"]:
    L = x["chain_sent"][0]
    cap = 398 if L["not_before"] < "2026-03-15" else 200
    ok("%s: %.0f days <= %d" % (x["host"], L["validity_days"], cap), L["validity_days"] <= cap)
    need = 2 if L["validity_days"] <= 180 else 3
    ok("%s: %d SCTs >= %d" % (x["host"], len(L["scts"]), need), len(L["scts"]) >= need)
pq = sum(1 for x in p["hosts"] if "MLKEM" in (x.get("group") or ""))
ok("10 of 12 hosts negotiated the hybrid group", pq == 10 and len(p["hosts"]) == 12, pq)
ok("11 of 12 leaves serverAuth only", sum(1 for x in p["hosts"] if x["chain_sent"][0]["eku"] == ["serverAuth"]) == 11)
ok("5 of 12 leaves carry an OCSP URL, 11 a CRL URL", (sum(x["chain_sent"][0]["ocsp_url"] for x in p["hosts"]), sum(bool(x["chain_sent"][0]["crl_url"]) for x in p["hosts"])) == (5, 11))

# 7. Small derived numbers in the prose
ok("5 min of skew on a 1 h SVID = 8%", round(5 / 60 * 100) == 8)
a = R("acme_flow.json"); ari = [e for e in a["log"] if "ARI" in e["step"]][0]["body"]["suggestedWindow"]
from datetime import date
iss = date.fromisoformat(a["recorded"]); s0 = date.fromisoformat(ari["start"][:10]); s1 = date.fromisoformat(ari["end"][:10])
ok("ARI window about two thirds into 90 days", 0.6 < (s0 - iss).days / 90 < 0.72, ((s0 - iss).days, (s1 - iss).days))
z = R("zero_rtt.json"); run1 = z["runs"][0]["steps"]
replays = sum(1 for s in run1[2:] for b in s["backend"] if b["status"] == 200)
ok("three replays, three billed generations", replays == 3, replays)
ok("RFC 8470 run: no generation from early data", all(b["status"] == 425 for s in z["runs"][1]["steps"][1:] for b in s["backend"]))
rot = R("rotate.json")["steps"]
ok("rotation: new connections see the new certificate, the old connection keeps the old", rot[0]["conn1_sees"] != rot[2]["conn2_sees"] and rot[3]["conn1_still_sees"] == rot[0]["conn1_sees"])
cost = R("hs_cost.json")["median_ms"]
ok("kept-alive request at least 10x cheaper than a full handshake", cost["new connection, full handshake"] / cost["one kept-alive connection"] > 10, cost)
print("\n%d failed" % fails)
sys.exit(1 if fails else 0)
