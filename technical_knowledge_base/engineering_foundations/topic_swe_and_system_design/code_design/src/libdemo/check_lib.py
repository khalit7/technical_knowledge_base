"""Build the demo package and exercise its deprecation shim. Run from this folder (about 20 s):
  uv run --no-project --python 3.12 --with pydantic --with httpx --with build --with mypy python check_lib.py
Writes ../inputs/libdemo.json."""
import json, pathlib, subprocess, sys, tempfile, warnings, zipfile
HERE = pathlib.Path(__file__).parent
DIST = pathlib.Path(tempfile.mkdtemp())
r = subprocess.run([sys.executable, "-m", "build", "--wheel", "--outdir", str(DIST), str(HERE)],
                   capture_output=True, text=True)
whl = sorted(DIST.glob("chatsummary-*.whl"))[-1]
names = zipfile.ZipFile(whl).namelist()
sys.path.insert(0, str(HERE / "src"))
import chatsummary as cs
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    out = cs.render_transcript([cs.Message("user", "hello")], max_chars=5)
mypy = subprocess.run([sys.executable, "-m", "mypy", "--strict", "src/chatsummary"], cwd=HERE, capture_output=True, text=True).stdout.strip().splitlines()[-1:]
res = {"wheel": whl.name, "files": names, "old_name_result": out, "warning": f"{w[0].category.__name__}: {w[0].message}",
       "warning_points_at": f"{pathlib.Path(w[0].filename).name}:{w[0].lineno}", "public": cs.__all__, "mypy": mypy}
print(json.dumps(res, indent=1))
(HERE.parent / "inputs" / "libdemo.json").write_text(json.dumps(res, indent=1))
