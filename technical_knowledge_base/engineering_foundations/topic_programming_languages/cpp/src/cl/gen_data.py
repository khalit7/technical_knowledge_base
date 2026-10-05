# Turn out/ (recorded by run_all.sh) and code/ into ../parts/50_js_cl_0data.js (window.CL).
# The page shows nothing that is not in this file.
import json, re, statistics, pathlib
H = pathlib.Path(__file__).resolve().parent
O = H / "out"
rd = lambda n: (O / n).read_text()
v, out = {}, {}

# versions and commit
ver = rd("versions.txt")
commit = re.search(r"llama.cpp commit: (\w+)", ver).group(1)
v["commit7"] = commit[:7]
v["commit_date"] = "5 October 2026"
assert "Oct 5" in ver and "2026" in ver
v["model_url"] = re.search(r"model: (\S+)", ver).group(1)
v["model_sha"] = re.search(r"sha256 measured: (\w+)", ver).group(1)
assert v["model_sha"] == re.search(r"sha256 expected: (\w+)", ver).group(1)
v["model_bytes"] = int(re.search(r"model bytes: (\d+)", ver).group(1))
out["versions"] = ver

# load averages seen during the runs
loads = [float(x) for f in ("build.txt", "bench_load.txt", "simple_cpu.txt") for x in re.findall(r"\{ ([\d.]+)", rd(f))]
v["load_lo"], v["load_hi"] = min(loads), max(loads)

# repository map
rm = json.loads(rd("repo_map.json"))
CPP = ["C++"]; C = ["C"]
v["lines_total"] = sum(rm["total"].values())
v["lines_cpp"] = rm["total"].get("C++", 0)
v["lines_c"] = rm["total"].get("C", 0)
v["lines_hdr"] = rm["total"].get("C/C++ header", 0)
v["lines_cpu"] = next(a["total"] for a in rm["areas"] if a["area"] == "ggml CPU backend")
repo = rm["areas"]

# build
b = rd("build.txt")
out["build"] = "\n".join(l for l in b.split("\n") if not l.startswith("load average") and not l.startswith("real"))
v["build_s"] = float(re.findall(r"^real ([\d.]+)", b, re.M)[1])
v["build_steps"] = int(re.search(r"\[(\d+)/(\d+)\] Linking CXX executable bin/llama-cli", b).group(2))
out["build_cmd"] = ("cmake -S llama.cpp -B build -G Ninja -DCMAKE_BUILD_TYPE=Release   # configure: asks about the machine\n"
                    "cmake --build build -j 4 --target llama-simple llama-cli llama-bench llama-server   # compile and link")

# GGUF
out["gguf_read"] = rd("gguf_read.txt")
out["gguf_dump"] = rd("gguf_dump.txt")
gr = rd("gguf_read.txt")
v["n_tensors"] = int(re.search(r"tensors=(\d+)", gr).group(1))
v["n_kv"] = int(re.search(r"kv=(\d+)", gr).group(1))
v["hdr_end"] = int(re.search(r"header ends at byte (\d+)", gr).group(1))
v["data_start"] = int(re.search(r"tensor data starts at byte (\d+)", gr).group(1))
v["data_bytes"] = v["model_bytes"] - v["data_start"]
v["embd_bytes"] = int(re.search(r"token_embd.weight .*bytes=(\d+)", gr).group(1))
q = json.loads(rd("quant_demo.json"))
gt = json.loads(rd("gguf_tensors.json"))
assert gt["data_start"] == v["data_start"]
fmap = gt["tensors"]
out["quant_demo"] = rd("quant_demo.txt")

# llama-simple on the CPU and on Metal
sc = rd("simple_cpu.txt").split("\n", 1)[1].strip()
out["simple_cpu"] = sc
log = rd("simple_cpu_log.txt")
keep = r"(print_info: (file size|model type|model params|arch|n_layer |n_embd |n_head |n_head_kv|n_ff )|done_getting_tensors|model buffer size|llama_context: (n_ctx  |n_batch|flash_attn)|KV buffer|llama_kv_cache: size|compute buffer size =|graph: nodes|^main: decoded|llama_perf|load_tensors: loading)"
out["simple_cpu_log"] = "\n".join(l for l in log.split("\n") if re.search(keep, l))
def num(pat, s=log, g=1, f=float): return f(re.search(pat, s).group(g))
v["load_ms"] = num(r"load time =\s+([\d.]+) ms")
v["pp_ms"] = num(r"prompt eval time =\s+([\d.]+) ms")
v["pp_ms_tok"] = num(r"prompt eval time .*\(\s+([\d.]+) ms per token")
v["tg_ms_tok"] = num(r"\n.*?  eval time .*\(\s+([\d.]+) ms per token")
v["tg_runs"] = num(r"  eval time .*/\s+(\d+) runs", f=int)
v["graphs_reused"] = num(r"graphs reused =\s+(\d+)", f=int)
v["nodes"] = num(r"graph: nodes = (\d+)", f=int)
v["mapped_mib"] = num(r"CPU_Mapped model buffer size =\s+([\d.]+)")
v["repack_mib"] = num(r"CPU_REPACK model buffer size =\s+([\d.]+)")
v["kv_mib"] = num(r"CPU KV buffer size =\s+([\d.]+)")
v["compute_mib"] = num(r"CPU compute buffer size =\s+([\d.]+)")
v["n_ctx"] = num(r"n_ctx\s+=\s+(\d+)", f=int)
v["params_m"] = num(r"model params\s+=\s+([\d.]+)")
v["kv_bytes_formula"] = 2 * 30 * v["n_ctx"] * 192 * 2
assert abs(v["kv_bytes_formula"] / 2**20 - v["kv_mib"]) < 0.01
out["simple_metal"] = rd("simple_metal.txt").strip()
ml = rd("simple_metal_log.txt")
out["simple_metal_log"] = "\n".join(l for l in ml.split("\n") if re.search(r"offload|model buffer size|KV buffer|compute buffer size =|graph: nodes|llama_perf_context_print: +(load|prompt|eval|graphs)", l))
v["metal_cpu_mib"] = num(r"CPU_Mapped model buffer size =\s+([\d.]+)", ml)
v["metal_splits"] = num(r"splits = (\d+)", ml, f=int)
out["simple_q4_0"] = rd("simple_q4_0.txt").strip()

# the graph of one token
nodes = []
for l in rd("evalcb_nodes.txt").strip().split("\n"):
    m = re.match(r"(.*?) = \((\w+)\)\s+(\w+)\((.*)\) = \{([\d, ]+)\}", l)
    name, typ, op, srcs, shape = m.groups()
    srcs = [s for s in re.findall(r"([^{}]+?)\{([\d, ]+)\}", srcs)]
    nodes.append([name.strip(), typ, op, [[a.strip(" ,"), [int(x) for x in b.split(",")]] for a, b in srcs], [int(x) for x in shape.split(",")]])
assert len(nodes) == v["nodes"]
hist = {}
for n in nodes: hist[n[2]] = hist.get(n[2], 0) + 1
v["n_mulmat"] = hist["MUL_MAT"]
v["real_ops"] = len(nodes) - sum(hist.get(k, 0) for k in ("NONE", "RESHAPE", "TRANSPOSE", "VIEW", "PERMUTE"))
first_l1 = next(i for i, n in enumerate(nodes) if n[0] == "norm-1")
last_l29 = next(i for i, n in enumerate(nodes) if n[0] == "norm-29")
v["nodes_per_layer"] = first_l1 - next(i for i, n in enumerate(nodes) if n[0] == "norm-0")
trace = {"head": nodes[:next(i for i, n in enumerate(nodes) if n[0] == "norm-0")], "layer0": nodes[next(i for i, n in enumerate(nodes) if n[0] == "norm-0"):first_l1],
         "tail": nodes[last_l29:], "hist": sorted(hist.items(), key=lambda kv: -kv[1])}
info = rd("evalcb_info.txt")
v["paris_id"] = int(re.search(r"^\s*(\d+)\s*$", info, re.M).group(1))

# which kernels run
cnt = {}
for l in rd("counts.txt").split("\n"):
    m = re.match(r"(\S+(?: repack=\d)?) CL_COUNTS (.*)", l)
    if m: cnt[m.group(1)] = {k: int(x) for k, x in re.findall(r"(\w+)=(\d+)", m.group(2))}
v["gemv_tok"] = cnt["n=2"]["gemv_q8_0_4x4"] - cnt["n=1"]["gemv_q8_0_4x4"]
assert v["gemv_tok"] == cnt["n=3"]["gemv_q8_0_4x4"] - cnt["n=2"]["gemv_q8_0_4x4"]
v["gemm_prompt"] = cnt["n=1"]["gemm_q8_0_4x4"]
v["gemv_prompt"] = cnt["n=1"]["gemv_q8_0_4x4"]
v["chunks_per_mm"] = v["gemv_tok"] / v["n_mulmat"]
assert v["chunks_per_mm"] == 16
v["vecdot_off"] = cnt["repack=0"]["vec_dot_q8_0_q8_0"]
v["fwd_off"] = cnt["repack=0"]["forward_mul_mat"]
v["sgemm_off"] = cnt["repack=0"]["llamafile_sgemm"]
# 1-row products per run with repack off: the output projection (49,152 rows) and the last layer's three FFN products
v["rows_1tok"] = 49152 + 1536 + 1536 + 576
assert v["vecdot_off"] == 2 * v["rows_1tok"]
out["counts"] = rd("counts.txt")
out["sched_splits"] = rd("sched_splits.txt")
v["splits_off"] = int(re.search(r"splits = (\d+) /", out["sched_splits"]).group(1))
out["threadpool"] = rd("threadpool_offsets.txt")
tp = {k: int(x) for k, x in re.findall(r"(\w+)=(\d+)", out["threadpool"])}

# quantize to Q4_0
qs = rd("quantize_summary.txt")
v["q4_bytes"] = int(re.search(r"Q4_0 file bytes: (\d+)", qs).group(1))
v["q4_mib"] = float(re.search(r"quant size\s+=\s+([\d.]+)", qs).group(1))
v["q4_bpw"] = float(re.search(r"quant size .*\(([\d.]+) BPW", qs).group(1))
v["q8_bpw"] = float(re.search(r"model size .*\(([\d.]+) BPW", qs).group(1))
out["quantize"] = qs

# speed
def bench(f):
    rows = []
    for r in json.loads(rd(f)):
        rows.append({"t": r["n_threads"], "rp": bool(r["repack"]), "test": "pp" if r["n_prompt"] else "tg",
                     "med": statistics.median(r["samples_ts"]), "s": [round(x, 1) for x in r["samples_ts"]], "ngl": r["n_gpu_layers"]})
    return rows
B = {"cpu": bench("bench_cpu.json"), "metal": bench("bench_metal.json"), "q4": bench("bench_q4_cpu.json"), "load": rd("bench_load.txt").strip()}
pick = lambda rows, **k: next(r for r in rows if all(r[a] == b for a, b in k.items()))
v["tg4"] = pick(B["cpu"], t=4, rp=True, test="tg")["med"]
v["tg4_off"] = pick(B["cpu"], t=4, rp=False, test="tg")["med"]
v["tg8"] = pick(B["cpu"], t=8, rp=True, test="tg")["med"]
v["tg1"] = pick(B["cpu"], t=1, rp=True, test="tg")["med"]
v["pp1_off"] = pick(B["cpu"], t=1, rp=False, test="pp")["med"]
v["pp1_on"] = pick(B["cpu"], t=1, rp=True, test="pp")["med"]
v["metal_tg"] = pick(B["metal"], test="tg")["med"]
v["metal_pp"] = pick(B["metal"], test="pp")["med"]
v["q4_tg4"] = pick(B["q4"], test="tg")["med"]
v["q4_pp4"] = pick(B["q4"], test="pp")["med"]

# server
out["server"] = rd("server.txt")
out["server_log"] = rd("server_log.txt")
sj = json.loads(out["server"].split("\n", 3)[3])
v["srv_pp_ms"] = sj["timings"]["prompt_ms"]; v["srv_tg_ms_tok"] = sj["timings"]["predicted_per_token_ms"]

out["reproduce"] = """# 1. the source, pinned
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp
git checkout 8e1642198dcd4e408f8776222d6ae31b74d01187

# 2. build (Release; CPU, Accelerate and Metal are the macOS defaults)
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DLLAMA_CURL=OFF
cmake --build build -j 4 --target llama-simple llama-cli llama-bench llama-server llama-eval-callback llama-quantize

# 3. the model (145 MB), and check it
curl -L -o smollm2-q8.gguf https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q8_0.gguf
shasum -a 256 smollm2-q8.gguf   # 5a1395716f7913741cc51d98581b9b1228d80987a9f7d3664106742eb06bba83

# 4. one prompt on the CPU, then on the GPU
build/bin/llama-simple -m smollm2-q8.gguf -n 8 -ngl 0 "The capital of France is"
build/bin/llama-simple -m smollm2-q8.gguf -n 8 -ngl 99 "The capital of France is"

# 5. every node of one token's graph
build/bin/llama-eval-callback -m smollm2-q8.gguf -p "Paris" -ngl 0 -t 4 -n 1

# 6. speed: threads x repack on the CPU, then Metal
build/bin/llama-bench -m smollm2-q8.gguf -ngl 0 -t 1,2,4,8 --repack 0,1 -p 64 -n 32 -r 5
build/bin/llama-bench -m smollm2-q8.gguf -ngl 99 -p 64 -n 32 -r 5

# 7. a 4-bit copy
build/bin/llama-quantize --allow-requantize smollm2-q8.gguf smollm2-q4_0.gguf Q4_0"""

# code shown on the page
out["gguf_read_py"] = (H / "code/gguf_read.py").read_text()
out["features_cpp"] = (H / "code/features.cpp").read_text()
out["features"] = rd("features.txt")
src = json.loads(rd("excerpts.json"))
assert src["commit"] == commit

CL = {"commit": commit, "v": v, "out": out, "src": src["excerpts"], "repo": repo, "trace": trace, "counts": cnt,
      "bench": B, "quant": q, "tp": tp, "fmap": fmap}
js = "// generated by src/cl/gen_data.py from src/cl/out/ (recorded by src/cl/run_all.sh); do not edit\nwindow.CL=" + json.dumps(CL, separators=(",", ":"), ensure_ascii=False) + ";\n"
p = H.parent / "parts/50_js_cl_0data.js"
p.write_text(js)
print(p, len(js), "bytes;", len(v), "values")
