"""Fetch current versions and release dates from official registries and release feeds.
Writes versions_raw.json. Run: python3 fetch_versions.py"""
import json, urllib.request, re, datetime, sys, concurrent.futures as cf

UA = {"User-Agent": "kb-toolchain-atlas/1.0 (research script)"}
def get(url, accept=None):
    h = dict(UA)
    if accept: h["Accept"] = accept
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
        return r.read().decode("utf-8", "replace")

PYPI = ["uv", "ruff", "mypy", "pyright", "ty", "pytest", "py-spy", "scalene", "memray", "sphinx", "mkdocs",
        "mkdocs-material", "maturin", "pybind11", "nanobind", "cmake", "ninja", "conan", "jupyterlab", "ipython",
        "twine", "hatchling", "pdoc", "cffi", "marimo", "pip", "poetry", "setuptools", "scikit-build-core", "debugpy", "pyinstrument"]
CRATES = ["pyo3", "flamegraph", "cargo-nextest", "wasm-bindgen", "cxx", "bindgen", "mdbook", "evcxr_repl",
          "criterion", "napi", "cargo-edit", "maturin", "tokio", "serde", "clap", "cbindgen", "cargo-llvm-cov", "insta"]
NPM = ["typescript", "@typescript/native-preview", "@biomejs/biome", "eslint", "typescript-eslint", "vitest", "pnpm", "bun", "deno",
       "prettier", "typedoc", "tsx", "jest", "@napi-rs/cli", "node-gyp", "oxlint", "yarn", "npm", "jsr", "@types/node",
       "tslab", "wasm-pack", "node-addon-api", "esbuild", "vite", "tsdown", "zx"]
GH = ["astral-sh/uv", "astral-sh/ruff", "astral-sh/ty", "rust-lang/rust", "rust-lang/rustup", "oven-sh/bun", "denoland/deno",
      "microsoft/TypeScript", "microsoft/typescript-go", "Kitware/CMake", "ninja-build/ninja", "llvm/llvm-project",
      "microsoft/vcpkg", "conan-io/conan", "pnpm/pnpm", "biomejs/biome", "nodejs/node", "python/cpython",
      "PyO3/pyo3", "PyO3/maturin", "vitest-dev/vitest", "eslint/eslint", "microsoft/pyright", "python/mypy",
      "nvm-sh/nvm", "Schniz/fnm", "pyenv/pyenv", "rust-lang/rust-clippy", "rust-lang/miri", "doxygen/doxygen",
      "mesonbuild/meson", "bazelbuild/bazel", "pybind/pybind11", "wjakob/nanobind", "napi-rs/napi-rs", "jsr-io/jsr",
      "jupyter/notebook", "evcxr/evcxr", "jdx/mise", "volta-cli/volta", "google/googletest", "catchorg/Catch2",
      "brendangregg/FlameGraph", "flamegraph-rs/flamegraph", "benfred/py-spy", "plasma-umass/scalene", "dotnet/vscode-csharp"]

def pypi(name):
    d = json.loads(get(f"https://pypi.org/pypi/{name}/json"))
    v = d["info"]["version"]
    files = d["releases"].get(v, [])
    t = min((f["upload_time_iso_8601"] for f in files), default=None)
    return {"src": "pypi", "name": name, "version": v, "date": t and t[:10], "url": f"https://pypi.org/project/{name}/{v}/"}

def crate(name):
    d = json.loads(get(f"https://crates.io/api/v1/crates/{name}"))
    c = d["crate"]; v = c.get("max_stable_version") or c["max_version"]
    date = next((x["created_at"][:10] for x in d["versions"] if x["num"] == v), None)
    return {"src": "crates", "name": name, "version": v, "date": date, "url": f"https://crates.io/crates/{name}/{v}"}

def npm(name):
    d = json.loads(get(f"https://registry.npmjs.org/{name.replace('/', '%2F')}"))
    v = d["dist-tags"].get("latest")
    tags = d["dist-tags"]
    return {"src": "npm", "name": name, "version": v, "date": d["time"].get(v, "")[:10], "dist_tags": {k: tags[k] for k in list(tags)[:8]},
            "tag_dates": {k: d["time"].get(tags[k], "")[:10] for k in list(tags)[:8]},
            "url": f"https://www.npmjs.com/package/{name}/v/{v}"}

def gh(repo):
    x = get(f"https://github.com/{repo}/releases.atom")
    ents = re.findall(r"<entry>(.*?)</entry>", x, re.S)
    out = []
    for e in ents[:12]:
        title = re.search(r"<title>(.*?)</title>", e, re.S).group(1).strip()
        upd = re.search(r"<updated>(.*?)</updated>", e).group(1)[:10]
        link = re.search(r'<link[^>]*href="([^"]+)"', e).group(1)
        out.append({"title": title, "date": upd, "link": link})
    return {"src": "github", "name": repo, "entries": out, "url": f"https://github.com/{repo}/releases"}

jobs = [(pypi, n) for n in PYPI] + [(crate, n) for n in CRATES] + [(npm, n) for n in NPM] + [(gh, r) for r in GH]
res = {}
def run(j):
    f, n = j
    try: return (f.__name__ + ":" + n, f(n))
    except Exception as e: return (f.__name__ + ":" + n, {"error": repr(e)})
with cf.ThreadPoolExecutor(8) as ex:
    for k, v in ex.map(run, jobs): res[k] = v
res["_checked"] = datetime.datetime.utcnow().isoformat() + "Z"
json.dump(res, open("versions_raw.json", "w"), indent=1)
for k, v in res.items():
    if k.startswith("_"): continue
    if "error" in v: print(k, "ERROR", v["error"][:100])
    elif v["src"] == "github": print(k, "|", " ; ".join(f'{e["title"][:40]} {e["date"]}' for e in v["entries"][:3]))
    else: print(k, v["version"], v["date"])
