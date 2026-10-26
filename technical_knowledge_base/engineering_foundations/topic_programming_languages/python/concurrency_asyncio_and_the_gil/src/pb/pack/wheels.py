"""Read PyPI's JSON API for popular compiled packages: for the latest release, which wheel tags exist
(free-threaded cp314t/cp315t, abi3, manylinux/musllinux/macOS/Windows). Writes ../out/wheels.json."""
import json, re, urllib.request, datetime
PKGS = ["numpy", "pandas", "polars-runtime-32", "pyarrow", "scipy", "scikit-learn", "torch", "tokenizers", "safetensors",
        "pydantic-core", "orjson", "msgspec", "cryptography", "lxml", "regex", "tiktoken", "uvloop", "psutil",
        "pillow", "zstandard", "grpcio", "jiter", "rpds-py", "markupsafe", "pyyaml"]
UA = {"User-Agent": "kb-python-page/1.0"}
out = {"fetched": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "pkgs": {}}
for p in PKGS:
    with urllib.request.urlopen(urllib.request.Request(f"https://pypi.org/pypi/{p}/json", headers=UA), timeout=60) as r:
        d = json.load(r)
    v = d["info"]["version"]
    files = [f["filename"] for f in d["urls"] if f["packagetype"] == "bdist_wheel"]
    up = min((f["upload_time_iso_8601"] for f in d["urls"]), default="")[:10]
    tags = set()
    for f in files:
        parts = f[:-4].split("-")
        tags.add((parts[-3], parts[-2]))
    has = lambda pat: any(re.fullmatch(pat, py + "-" + abi) for py, abi in tags)
    plats = set(f[:-4].split("-")[-1] for f in files)
    out["pkgs"][p] = {
        "version": v, "uploaded": up, "wheels": len(files),
        "cp314": has(r"cp314-cp314"), "cp314t": has(r"cp314t?-cp314t"), "cp315": has(r"cp315-cp315"),
        "cp315t": has(r"cp315t?-cp315t"), "abi3": has(r"cp3\d+-abi3(\.abi3t)?"), "abi3t": any("abi3t" in abi for _, abi in tags),
        "pure": has(r"py3-none") or has(r"py2\.py3-none"),
        "manylinux": any("manylinux" in x for x in plats), "musllinux": any("musllinux" in x for x in plats),
        "macos_arm64": any("macosx" in x and ("arm64" in x or "universal2" in x) for x in plats),
        "windows": any(x.startswith("win") for x in plats),
        "abi3t_file": next((f for f in files if "abi3t" in f and "macosx" in f), next((f for f in files if "abi3t" in f), "")),
        "example": next((f for f in files if "cp314t" in f and "macosx" in f), next((f for f in files if "macosx" in f and "arm64" in f), files[0] if files else "")),
    }
    print(p, v, {k: out["pkgs"][p][k] for k in ("cp314t", "cp315", "cp315t", "abi3", "abi3t")})
json.dump(out, open("../out/wheels.json", "w"), indent=1)
