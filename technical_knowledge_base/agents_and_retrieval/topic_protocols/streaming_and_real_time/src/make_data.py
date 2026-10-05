"""Join the recorded outputs in raw/ into parts/22_js_data.js (window.SDATA) and compute the key numbers
the prose quotes (K). check_embed.py proves the built page carries exactly these values."""
import json, os, statistics, sys

H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(H, "lab"))
from edge_cases import CASES  # noqa: E402

R = lambda f: json.load(open(os.path.join(H, "raw", f)))


def median_run(m):
    runs = sorted(m["runs"], key=lambda r: r["arrivals"][-1][1])
    return runs[len(runs) // 2]


def fourways():
    out = {}
    for rtt, f in (("50", "four_ways_rtt50.json"), ("100", "four_ways_rtt100.json")):
        d = R(f); out[rtt] = {}
        for name, m in d["methods"].items():
            r = median_run(m)
            out[rtt][name] = {"arr": [[e, round(t, 4)] for e, t in r["arrivals"]], "req": r["request_times"],
                              "requests": r["requests"], "up": r["up"], "down": r["down"],
                              "med_last": m["median_arrival_s"][-1], "med_first_token": m["median_arrival_s"][1],
                              "med_requests": m["median_requests"], "med_up": m["median_up"], "med_down": m["median_down"],
                              "reps": d["reps"]}
    return out


def shown(b):
    s = ""
    for ch in b:
        if ch == 10: s += "␊"          # LF shown as a symbol
        elif ch == 13: s += "␍"
        elif ch == 0: s += "␀"
        elif ch < 32 or ch > 126: s += "\\x%02x" % ch
        else: s += chr(ch)
    return s


def parsers():
    rows = [json.loads(l) for l in open(os.path.join(H, "raw", "parsers.jsonl"))]
    names = []
    for r in rows:
        k = (r["parser"], r["version"], r["lang"])
        if k not in names:
            names.append(k)
    res = {}
    for r in rows:
        res.setdefault(r["parser"], {})[r["case"]] = r["events"] if r["error"] is None else {"error": r["error"]}
    cases = [{"id": k, "title": c["title"], "rule": c["rule"], "spec": c["spec"], "chunks": [shown(x) for x in c["chunks"]]}
             for k, c in CASES.items()]
    return {"parsers": [{"name": a, "version": b, "lang": c} for a, b, c in names], "cases": cases, "res": res}


def deviations(p):
    dev = {}
    for pr in p["parsers"]:
        n = 0
        for c in p["cases"]:
            if p["res"][pr["name"]][c["id"]] != c["spec"]:
                n += 1
        dev[pr["name"]] = n
    return dev


def main():
    fw = fourways(); p = parsers(); rc = R("reconnect.json"); cancel = R("cancel.json"); wsb = R("ws_bytes.json")
    wsp = R("ws_proxy.json"); wsn = R("ws_proxy_node.json"); defl = R("ws_deflate.json"); hooks = R("webhooks.json")
    six = R("six_limit.json"); wm = R("wikimedia.json")
    dev = deviations(p)
    # reconnect delay: from the error to the next open, no retry field
    cl = rc["scenarios"]["ids"]["client"]
    gaps = [round(cl[i + 1][0] - cl[i][0], 3) for i in range(len(cl) - 1) if cl[i][1] == "error" and cl[i + 1][1] == "open"]
    cl2 = rc["scenarios"]["ids_retry_204"]["client"]
    gaps2 = [round(cl2[i + 1][0] - cl2[i][0], 3) for i in range(len(cl2) - 1) if cl2[i][1] == "error" and cl2[i + 1][1] == "open"]
    cw = {c["tag"]: c for c in cancel}
    s = defl["settings"]
    K = {
        "fw50_sse_last": fw["50"]["SSE"]["med_last"], "fw50_ws_last": fw["50"]["WebSocket"]["med_last"],
        "fw50_lp_last": fw["50"]["long polling"]["med_last"], "fw50_sp_last": fw["50"]["short polling"]["med_last"],
        "fw100_sse_last": fw["100"]["SSE"]["med_last"], "fw100_lp_last": fw["100"]["long polling"]["med_last"],
        "fw100_sp_last": fw["100"]["short polling"]["med_last"], "fw100_ws_last": fw["100"]["WebSocket"]["med_last"],
        "fw50_lp_req": fw["50"]["long polling"]["med_requests"], "fw50_sp_req": fw["50"]["short polling"]["med_requests"],
        "fw100_lp_req": fw["100"]["long polling"]["med_requests"],
        "fw50_sse_down": fw["50"]["SSE"]["med_down"], "fw50_sse_up": fw["50"]["SSE"]["med_up"],
        "fw50_ws_down": fw["50"]["WebSocket"]["med_down"], "fw50_ws_up": fw["50"]["WebSocket"]["med_up"],
        "fw50_lp_down": fw["50"]["long polling"]["med_down"], "fw50_lp_up": fw["50"]["long polling"]["med_up"],
        "fw50_sp_down": fw["50"]["short polling"]["med_down"], "fw50_sp_up": fw["50"]["short polling"]["med_up"],
        "es_reconnect_s": statistics.median(gaps), "es_reconnect_retry_s": statistics.median(gaps2),
        "parsers_n": len(p["parsers"]), "cases_n": len(p["cases"]),
        "cancel_think_naive_s": cw["think_careful0"]["server"]["work_seconds"],
        "cancel_think_careful_s": cw["think_careful1"]["server"]["work_seconds"],
        "cancel_tok_naive_written": cw["tokens_careful0"]["server"]["events_written"],
        "cancel_tok_naive_read": cw["tokens_careful0"]["events_client_read"],
        "defl_short_none": s["no compression"]["short"], "defl_short_ctx": s["deflate, zlib defaults (window 2^15, memLevel 8), context kept"]["short"],
        "defl_long_none": s["no compression"]["long"], "defl_long_ctx": s["deflate, zlib defaults (window 2^15, memLevel 8), context kept"]["long"],
        "defl_long_ws": s["deflate, websockets defaults (window 2^12, memLevel 5), context kept"]["long"],
        "defl_long_nct": s["deflate, no context takeover (each message compressed alone)"]["long"],
        "defl_words": defl["long_answer_words"],
        "hooks_naive_work": hooks["delivery"]["naive"]["times_work_done"],
        "hooks_careful_work": hooks["delivery"]["careful"]["times_work_done"],
        "wm_events": wm["complete_events_in_4s"], "wm_bytes": wm["bytes_in_4s"],
        "six_opened": len(six["opened"]),
    }
    for k, v in dev.items():
        K["dev_" + k] = v
    data = {"fw": fw, "parsers": p, "dev": dev, "rc": rc, "cancel": cancel, "wsb": wsb, "wsp": wsp, "wsn": wsn,
            "defl": defl, "hooks": hooks, "six": six, "wm": wm, "K": K,
            "txt": {f: open(os.path.join(H, "raw", f)).read() for f in ("ws_no_upgrade_curl.txt", "ws_good_curl.txt", "ws_nginx_error.txt")}}
    js = "window.SDATA=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(H, "parts", "22_js_data.js"), "w").write(js)
    print(f"22_js_data.js {len(js)} bytes")
    for k, v in K.items():
        print(f"  {k} = {v}")


if __name__ == "__main__":
    main()
