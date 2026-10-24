"""Every client era against every server era over stdio (the spec's compatibility matrix, run for real).
Usage: python compat.py PY2 PY1 OUT.json  (PY2: venv with mcp 2.3.0, PY1: venv with mcp 1.30.0)"""
import json, os, subprocess, sys
PY2, PY1, OUT = sys.argv[1:4]
H = os.path.dirname(os.path.abspath(__file__))
servers = {"modern-only (hand-rolled, 2026-07-28)": [PY2, os.path.join(H, "modern_only.py")],
           "dual-era (SDK 2.3.0)": [PY2, os.path.join(H, "ckpt_server.py"), "stdio"],
           "legacy-only (SDK 1.30.0, 2025-11-25)": [PY1, os.path.join(H, "legacy_server.py")]}
clients = {"modern-only (SDK 2.3.0 pinned to 2026-07-28)": [PY2, os.path.join(H, "compat_client2.py"), "2026-07-28"],
           "dual-era (SDK 2.3.0, auto)": [PY2, os.path.join(H, "compat_client2.py"), "auto"],
           "legacy (SDK 1.30.0)": [PY1, os.path.join(H, "compat_client1.py")]}
res = []
for cn, cc in clients.items():
    for sn, sc in servers.items():
        tee = os.path.join(H, "compat_tee.jsonl"); open(tee, "w").close()
        cmd = cc + [PY2, os.path.join(H, "tee_stdio.py"), tee, "--"] + sc
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=30).stdout.strip().splitlines()[-1]
            o = json.loads(out)
        except Exception as e:
            o = {"ok": False, "detail": f"harness: {e}"}
        o["wire"] = [json.loads(l) for l in open(tee)]
        o["client"], o["server"] = cn, sn
        res.append(o); print(cn, "|", sn, "|", o["ok"], o.get("version"), o["detail"][:110])
json.dump(res, open(OUT, "w"), indent=1)
