"""Run every snippet in this folder on CPython 3.11 to 3.15 and record real output.
Usage: python3 run_versions.py  (interpreter paths come from ../env.sh environment variables)."""
import json, os, subprocess, glob, re
HERE = os.path.dirname(os.path.abspath(__file__))
VERS = [("3.11", "PY311"), ("3.12", "PY312"), ("3.13", "PY313"), ("3.14", "PY314"), ("3.15", "PY315")]
out = {"interpreters": {}, "runs": {}}
for v, k in VERS:
    out["interpreters"][v] = subprocess.run([os.environ[k], "-c", "import sys;print(sys.version.split()[0])"],
                                            capture_output=True, text=True).stdout.strip()
for f in sorted(glob.glob(os.path.join(HERE, "v1*.py"))):
    name = os.path.basename(f)[:-3]
    env = dict(os.environ)
    env.pop("PYTHONUTF8", None)
    if name == "v15_utf8_default":  # a Latin-1 locale shows the change (the C locale already turns UTF-8 mode on)
        env.update(LC_ALL="en_US.ISO8859-1", LANG="en_US.ISO8859-1")
    res = {}
    for v, k in VERS:
        p = subprocess.run([os.environ[k], os.path.basename(f)], capture_output=True, text=True, cwd=HERE, env=env)
        text = (p.stdout + p.stderr).replace(HERE + "/", "").replace(os.environ["PL"], "~/pl")
        lines = text.rstrip("\n").split("\n")
        if len(lines) > 6:  # keep the head of the traceback location and the error lines
            lines = lines[:1] + ["  ..."] + lines[-4:]
        res[v] = {"rc": p.returncode, "out": "\n".join(lines)}
    out["runs"][name] = res
json.dump(out, open(os.path.join(HERE, "..", "out", "versions.json"), "w"), indent=1)
for n, r in out["runs"].items():
    print(n.ljust(26), " ".join(f"{v}:{'ok' if r[v]['rc']==0 else 'X'}" for v, _ in VERS))
