# Cut every excerpt shown in Part 3 from the pinned llama.cpp clone, by file and line range.
# Keys shared with the root page's src/design/llama/excerpts.json keep the root's name (same commit).
import json, subprocess, sys
LL, OUT = sys.argv[1], sys.argv[2]
E = [  # key, file, first line, last line
    ("simple_setup",   "examples/simple/simple.cpp", 91, 141),
    ("simple_loop",    "examples/simple/simple.cpp", 178, 218),
    ("batch_helper",   "examples/simple/simple.cpp", 8, 17),
    ("api_process",    "include/llama.h", 1086, 1090),
    ("deleters",       "include/llama-cpp.h", 11, 13),
    ("unique_ptr",     "include/llama-cpp.h", 31, 31),
    ("cmake_opts",     "ggml/CMakeLists.txt", 189, 199),
    ("gguf_format",    "ggml/include/gguf.h", 1, 30),
    ("gguf_strides",   "ggml/src/gguf.cpp", 756, 768),
    ("gguf_align",     "ggml/src/gguf.cpp", 780, 788),
    ("loader_mmap",    "src/llama-model-loader.cpp", 1638, 1656),
    ("arch_types",     "src/models/llama.cpp", 15, 22),
    ("repack_pick",    "ggml/src/ggml-cpu/repack.cpp", 5105, 5115),
    ("tensor",         "ggml/include/ggml.h", 685, 717),
    ("mul_mat_lazy",   "ggml/src/ggml.c", 3350, 3365),
    ("transpose_view", "ggml/src/ggml.c", 3943, 3959),
    ("graph_template", "src/models/llama.cpp", 94, 124),
    ("graph_attn",     "src/models/llama.cpp", 137, 178),
    ("graph_head",     "src/models/llama.cpp", 229, 250),
    ("llama_process",  "src/llama-context.cpp", 4480, 4486),
    ("process_ubatch", "src/llama-context.cpp", 1400, 1475),
    ("alloc_refcount", "ggml/src/ggml-alloc.c", 793, 818),
    ("backend_iface",  "ggml/src/ggml-backend-impl.h", 122, 128),
    ("sched_assign",   "ggml/src/ggml-backend.cpp", 1061, 1090),
    ("threadpool",     "ggml/src/ggml-cpu/ggml-cpu.c", 481, 492),
    ("barrier",        "ggml/src/ggml-cpu/ggml-cpu.c", 576, 610),
    ("cache_align",    "ggml/src/ggml-cpu/ggml-cpu.c", 61, 64),
    ("compute_thread", "ggml/src/ggml-cpu/ggml-cpu.c", 3129, 3159),
    ("chunks",         "ggml/src/ggml-cpu/ggml-cpu.c", 1410, 1471),
    ("repack_chunks",  "ggml/src/ggml-cpu/repack.cpp", 4711, 4716),
    ("gemm_or_gemv",   "ggml/src/ggml-cpu/repack.cpp", 4636, 4647),
    ("block_x4",       "ggml/src/ggml-cpu/repack.h", 26, 29),
    ("block_x4_use",   "ggml/src/ggml-cpu/repack.h", 44, 44),
    ("gemv_kernel",    "ggml/src/ggml-cpu/arch/arm/repack.cpp", 1736, 1767),
    ("logits_out",     "src/llama-context.cpp", 1939, 1951),
    ("block_q4_0",     "ggml/src/ggml-common.h", 194, 199),
    ("block_q8_0",     "ggml/src/ggml-common.h", 251, 256),
    ("block_q4_K",     "ggml/src/ggml-common.h", 323, 338),
    ("quant_q8_0",     "ggml/src/ggml-quants.c", 276, 299),
    ("quant_q4_0",     "ggml/src/ggml-quants.c", 113, 148),
    ("dot_q8_generic", "ggml/src/ggml-cpu/quants.c", 451, 479),
    ("dot_q8_neon",    "ggml/src/ggml-cpu/arch/arm/quants.c", 1352, 1379),
    ("kv_class",       "src/llama-kv-cache.h", 20, 21),
    ("kv_get_k",       "src/llama-kv-cache.cpp", 1296, 1314),
    ("kv_cpy_k",       "src/llama-kv-cache.cpp", 1348, 1378),
    ("sampler_iface",  "include/llama.h", 1380, 1386),
    ("greedy",         "src/llama-sampler.cpp", 1053, 1060),
    ("greedy_vtable",  "src/llama-sampler.cpp", 1092, 1098),
    ("server_slot",    "tools/server/server-context.cpp", 231, 237),
    ("server_decode",  "tools/server/server-context.cpp", 3874, 3882),
]
commit = subprocess.run(["git", "-C", LL, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {"commit": commit, "excerpts": {}}
for k, f, a, b in E:
    lines = open(f"{LL}/{f}", encoding="utf-8").read().split("\n")[a - 1:b]
    out["excerpts"][k] = {"file": f, "start": a, "end": b, "text": "\n".join(lines)}
    print(f"{k}: {f} L{a}-L{b}")
json.dump(out, open(OUT, "w"), indent=1)
