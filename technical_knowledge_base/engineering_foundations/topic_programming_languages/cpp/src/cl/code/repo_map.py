# Lines of code per area and language in the pinned llama.cpp clone (git ls-files, newline count).
import json, subprocess, sys, collections
LL = sys.argv[1]
files = subprocess.run(["git", "-C", LL, "ls-files"], capture_output=True, text=True, check=True).stdout.split()
LANG = {".c": "C", ".h": "C/C++ header", ".cpp": "C++", ".hpp": "C/C++ header", ".cu": "CUDA", ".cuh": "CUDA",
        ".m": "Objective-C", ".metal": "Metal", ".py": "Python", ".comp": "GLSL", ".glsl": "GLSL", ".wgsl": "WGSL", ".cl": "OpenCL"}
AREAS = [  # first match wins
    ("ggml/src/ggml-cpu/", "ggml CPU backend"), ("ggml/src/ggml-cuda/", "ggml CUDA backend"),
    ("ggml/src/ggml-metal/", "ggml Metal backend"), ("ggml/src/ggml-", "ggml other backends"),
    ("ggml/src/gguf.cpp", "ggml core"), ("ggml/src/", "ggml core"), ("ggml/include/", "ggml core"),
    ("ggml/", "ggml other"), ("src/models/", "src/models (one file per architecture)"), ("src/", "src (libllama)"),
    ("include/", "include (public API)"), ("common/", "common"), ("tools/server/", "tools/server"),
    ("tools/", "tools (other)"), ("examples/", "examples"), ("tests/", "tests"), ("gguf-py/", "gguf-py"),
    ("vendor/", "vendor (third party)")]
tab = collections.defaultdict(lambda: collections.Counter())
nfiles = collections.defaultdict(lambda: collections.Counter())
for f in files:
    ext = f[f.rfind("."):] if "." in f.rsplit("/", 1)[-1] else ""
    lang = LANG.get(ext)
    if not lang: continue
    if f.startswith("ggml/src/ggml-") and f.count("/") >= 3 and not any(f.startswith(p) for p, _ in AREAS[:3]):
        area = "ggml other backends"          # a backend folder: ggml/src/ggml-<name>/...
    else:
        area = next((a for p, a in AREAS if f.startswith(p) and p != "ggml/src/ggml-"), None)
    if not area: continue
    with open(f"{LL}/{f}", "rb") as fh: n = fh.read().count(b"\n")
    tab[area][lang] += n; nfiles[area][lang] += 1
order = [a for _, a in AREAS]
seen = []
for a in order:
    if a in tab and a not in seen: seen.append(a)
out = [{"area": a, "lines": dict(tab[a]), "files": dict(nfiles[a]), "total": sum(tab[a].values())} for a in seen]
tot = collections.Counter()
for r in out: tot.update(r["lines"])
for r in out:
    print(f"{r['area']:42s} {r['total']:>8,d}  " + ", ".join(f"{k} {v:,d}" for k, v in sorted(r['lines'].items(), key=lambda kv: -kv[1])))
print(f"{'all':42s} {sum(tot.values()):>8,d}  " + ", ".join(f"{k} {v:,d}" for k, v in tot.most_common()))
json.dump({"areas": out, "total": dict(tot)}, open(sys.argv[2], "w"), indent=0)
