#!/bin/bash
# Run ty, mypy and pyright on each snippet; write ../out/types.json. Versions pinned.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; cd $HERE
export MYPY_CACHE_DIR=$WORK/mypycache_types RUFF_CACHE_DIR=$WORK/ruffcache
TY=ty@0.0.84; MYPY=mypy@2.4.0; PYRIGHT=pyright@1.1.414
python3 - "$TY" "$MYPY" "$PYRIGHT" <<'PY'
import json, subprocess, sys, glob, os, re
ty, mypy, pyright = sys.argv[1:4]
out = {"versions": {}, "runs": {}}
# opt-in rules: the same file with the flag that turns the check on
EXTRA = {"t4_unannotated": {"mypy": ["--strict"]},
         "t5_unbound": {"ty": ["--error", "possibly-unresolved-reference"], "mypy": ["--enable-error-code", "possibly-undefined"]}}
def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr)
out["versions"]["ty"] = run(["uvx", ty, "--version"])[1].strip()
out["versions"]["mypy"] = run(["uvx", mypy, "--version"])[1].strip()
out["versions"]["pyright"] = run(["uvx", "--from", pyright, "pyright", "--version"])[1].strip().splitlines()[-1]
for f in sorted(glob.glob("t*.py")):
    r = {}
    rc, t = run(["uvx", ty, "check", "--python-version", "3.14", "--no-progress", "--color", "never", f]); r["ty"] = {"rc": rc, "out": t}
    rc, t = run(["uvx", mypy, "--python-version", "3.14", "--no-incremental", "--no-color-output", "--no-error-summary", f]); r["mypy"] = {"rc": rc, "out": t}
    rc, t = run(["uvx", "--from", pyright, "pyright", "--pythonversion", "3.14", f]); r["pyright"] = {"rc": rc, "out": t}
    for k in r:
        s = r[k]["out"].replace(os.getcwd() + "/", "").replace(os.environ["PL"], "~/pl")
        s = re.sub(r"^(Installed|Downloading|Downloaded|Resolved|Prepared).*\n", "", s, flags=re.M)
        r[k]["out"] = s.strip()
    for k, extra in EXTRA.get(f[:-3], {}).items():
        if k == "ty":
            rc, t = run(["uvx", ty, "check", "--python-version", "3.14", "--no-progress", "--color", "never", *extra, f])
        elif k == "mypy":
            rc, t = run(["uvx", mypy, "--python-version", "3.14", "--no-incremental", "--no-color-output", "--no-error-summary", *extra, f])
        r[k + " " + " ".join(extra)] = {"rc": rc, "out": t}
    out["runs"][f[:-3]] = r
    print(f, {k: v["rc"] for k, v in r.items()})
json.dump(out, open("../out/types.json", "w"), indent=1)
print(out["versions"])
PY
