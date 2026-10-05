"""raw/*.json -> parts/21_js_data.js (window.D). Only what the page shows; recompute.py and check_embed.py re-derive
the same numbers from raw/ and confirm the page embeds them. Run from src/."""
import json, os, re, statistics

R = lambda n: json.load(open(os.path.join("raw", n)))
D = {}


def hs(mode):
    d = R("hs_%s.json" % mode)
    recs = []
    for r in d["records"]:
        o = {"t": r["t_ms"], "d": r["dir"], "o": r["outer"], "n": r["len"], "h": r["head_hex"][:26]}
        for k in ("inner", "pad", "app_bytes", "note"):
            if k in r:
                o[{"inner": "i", "pad": "p", "app_bytes": "a", "note": "note"}[k]] = r[k]
        if "app_text" in r:
            o["at"] = r["app_text"][:70]
        ms = []
        for m in r.get("msgs", []):
            x = {"t": m["type"], "n": m["len"], "v": m["visible"]}
            if "hello" in m:
                x["hello"] = m["hello"]
            if "certs" in m:
                x["certs"] = [{"s": c["subject"], "i": c["issuer"], "b": c["der_bytes"], "san": c["san"], "na": c["not_after"]} for c in m["certs"]]
            for k in ("sigalg", "sig_bytes", "note", "ext"):
                if k in m:
                    x[k] = m[k]
            if "verify_data" in m:
                x["vd"] = m["verify_data"][:24]
            ms.append(x)
        if ms:
            o["m"] = ms
        recs.append(o)
    return {"info": d["info"], "wire": d["wire_bytes"], "checks": d["checks"], "openssl": d["openssl"], "python": d["python"],
            "recorded": d["recorded"], "recs": recs}


D["hs"] = {m: hs(m) for m in ("tls13", "mtls", "tls12")}


def flight(mode):
    """Server's first flight (ServerHello to Finished), as record bytes on the wire (5-byte headers included)."""
    d = R("hs_%s.json" % mode)
    parts, tot = {}, 0
    for r in d["records"]:
        if r["dir"] != "s2c":
            continue
        names = [m["type"] for m in r.get("msgs", [])]
        if "NewSessionTicket" in names or r.get("inner") == "application_data":
            break
        key = names[0] if names else "ChangeCipherSpec"
        parts[key] = parts.get(key, 0) + r["len"] + 5; tot += r["len"] + 5
    cert = [m for r in d["records"] for m in r.get("msgs", []) if m["type"] == "Certificate" and r["dir"] == "s2c"][0]
    return {"total": tot, "parts": parts, "chain": [c["der_bytes"] for c in cert["certs"]],
            "sig": [m.get("sig_bytes") for r in d["records"] for m in r.get("msgs", []) if m["type"] == "CertificateVerify"][0]}


D["flight"] = {m: flight(m) for m in ("tls13", "rsa", "mldsa44", "mldsa65")}

z = R("zero_rtt.json")
D["zr"] = {"nginx": z["nginx"], "openssl": z["openssl"], "recorded": z["recorded"], "runs": [
    {"label": r["label"], "steps": [{"step": s["step"], "cl": [l for l in s.get("s_client", []) if not l.startswith("Verify")][:4],
                                     "ff": s.get("first_flight_bytes"),
                                     "be": [[b["front"], b["early_data_header"], b["status"], b["generation"]] for b in s["backend"]]}
                                    for s in r["steps"]]} for r in z["runs"]]}

h = R("hrr.json")
D["hrr"] = {"delay": h["one_way_delay_ms"], "cases": [{"label": c["label"], "cg": c["client_groups"], "sg": c["server_groups"], "hrr": c["hello_retry"],
            "neg": c["negotiated"], "fin": c["client_finished_ms"],
            "ch": [m["len"] + 5 for m in c["records"] if m.get("msg") == "ClientHello"],
            "seq": [[m["dir"], m.get("msg", ""), m["len"] + 5, m["t_ms"]] for m in c["records"]][:12]} for c in h["cases"]]}

D["rot"] = R("rotate.json")
t = R("trust_matrix.json")
D["tm"] = {"vars": t["vars"], "rows": [{"c": r["client"], "cells": {k: [v["ok"], v["out"][:110]] for k, v in r["cells"].items()}} for r in t["rows"]],
           "repl": t["replace_check"], "certifi": t["certifi"], "node": t["node"], "curl": t["curl"]}
c = R("hs_cost.json")
D["cost"] = {"median": c["median_ms"], "p90": c["p90_ms"], "n": c["n"], "resumed": c["resumed_count"]}

p = R("public_chains.json")
D["pub"] = {"recorded": p["recorded"], "openssl": p["openssl"], "hosts": [
    {"host": x["host"], "proto": x.get("protocol"), "cipher": x.get("cipher"), "group": x.get("group"), "verify": x.get("verify"),
     "chain": [{k: cc[k] for k in ("subject", "issuer", "ca", "not_before", "not_after", "validity_days", "key", "sig", "san_count",
                                   "san_first", "san", "eku", "ocsp_url", "ca_issuers_url", "crl_url", "policy", "der_bytes")} |
               {"scts": len(cc["scts"]), "sct_logs": [s["log_id"][:16] for s in cc["scts"]]} for cc in x.get("chain_sent", [])]}
    for x in p["hosts"] if "skipped" not in x]}
ct = R("ct_caa.json")
D["ct"] = {"logs": ct["ct_logs_seen"], "caa": ct["caa"], "recorded": ct["recorded"]}

sp = open("raw/speed.txt").read()
def num(pat):
    m = re.search(pat, sp)
    return float(m.group(1)) if m else None
D["speed"] = {"ver": sp.splitlines()[0],
              "ecdsa_sign": num(r"ecdsa \(nistp256\)\s+\S+\s+\S+\s+([\d.]+)"), "ecdsa_verify": num(r"ecdsa \(nistp256\)\s+\S+\s+\S+\s+[\d.]+\s+([\d.]+)"),
              "rsa_sign": num(r"rsa  2048 bits\s+\S+\s+\S+\s+\S+\s+\S+\s+([\d.]+)"), "rsa_verify": num(r"rsa  2048 bits\s+\S+\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+([\d.]+)"),
              "x25519": num(r"ecdh \(X25519\)\s+\S+\s+([\d.]+)"),
              "mlkem_encaps": num(r"ML-KEM-768\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+([\d.]+)"), "mlkem_decaps": num(r"ML-KEM-768\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+[\d.]+\s+([\d.]+)"),
              "mldsa44_sign": num(r"ML-DSA-44\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+([\d.]+)"), "mldsa44_verify": num(r"ML-DSA-44\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+[\d.]+\s+([\d.]+)"),
              "mldsa65_sign": num(r"ML-DSA-65\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+([\d.]+)"), "mldsa65_verify": num(r"ML-DSA-65\s+\S+\s+\S+\s+\S+\s+[\d.]+\s+[\d.]+\s+([\d.]+)"),
              "aesgcm_kBps": num(r"AES-128-GCM\s+([\d.]+)k"), "chacha_kBps": num(r"ChaCha20-Poly1305\s+([\d.]+)k")}

a = R("acme_flow.json")
def trim(b):
    s = json.dumps(b)
    return json.loads(s) if len(s) < 700 else s[:700] + "..."
D["acme"] = {"recorded": a["recorded"], "issued": a["issued"], "failed": a["failed_validation"],
             "log": [{"step": e["step"], "m": e.get("method", "local"), "url": e.get("url"), "prot": e.get("protected"), "pl": e.get("payload"),
                      "st": e.get("status"), "loc": e.get("location"), "ra": e.get("retry_after"), "body": trim(e.get("body"))} for e in a["log"]]}

js = "// Generated by make_data.py from raw/ (do not edit)\nwindow.D=" + json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
open("parts/21_js_data.js", "w").write(js)
print("parts/21_js_data.js", len(js), "bytes")
