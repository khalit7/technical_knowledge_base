"""Join catalog.py (teaching text) with out/*.json (recorded runs) into ../parts/32_js_fail_data.js.
Run with any python3: python3 make_data.py. The page embeds the recorded outputs byte for byte; check_embed.py verifies."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import catalog

SECRET = re.compile(r"glpat-|sk-ant-|Bearer\s+eyJ|-----BEGIN [A-Z ]*PRIVATE KEY")


def load(name):
    return json.load(open(os.path.join(HERE, "out", name + ".json")))


def window_grid(out):
    rows = []
    for line in out.splitlines():
        m = re.match(r"rtt\s+(\d+) ms\s+window\s+([\d,]+) B\s+got ([\d.]+) MB in\s+([\d.]+) s\s+=\s+([\d.]+) MB/s", line)
        if m:
            rows.append({"rtt": int(m[1]), "win": int(m[2].replace(",", "")), "mbps": float(m[5])})
    return rows


def main():
    cases = []
    for c in catalog.CASES:
        rec = load(c["id"])
        runs = [{k: r[k] for k in ("cmd", "out", "rc", "note") if k in r} for r in rec["runs"]]
        for r in runs:
            if SECRET.search(r["cmd"] + r["out"]):
                sys.exit(f"secret-looking text in {c['id']}: fix the redaction before embedding")
        d = dict(c); d["runs"] = runs; d["recorded"] = rec["recorded"]
        if c["id"] == "window_rtt":
            d["grid"] = window_grid(runs[1]["out"])
        cases.append(d)
    meta = load("_meta")
    data = {"cases": cases, "meta": [{"cmd": r["cmd"], "out": r["out"]} for r in meta["runs"]], "recorded": meta["recorded"]}
    js = "window.FL_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";\n"
    p = os.path.join(HERE, "..", "parts", "32_js_fail_data.js")
    open(p, "w").write(js)
    print(f"{len(cases)} cases, {sum(len(c['runs']) for c in cases)} recorded runs, {len(js) / 1024:.1f} KB -> {os.path.relpath(p, HERE)}")


main()
