"""Copy short, exact excerpts from a pinned llama.cpp clone into excerpts.json.
Run: python3 extract.py [path to clone]. check.py re-reads them from the clone if present."""
import json, subprocess, sys, os
CLONE = sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/llama.cpp"
EX = [  # id, file, first line, last line, what it shows
 ("extern_c", "ggml/include/ggml.h", 344, 346, "ggml's public header is C; C++ code includes it inside extern \"C\" so names are not mangled"),
 ("block_q4_0", "ggml/src/ggml-common.h", 194, 199, "a quantised block: a plain struct with a fixed byte layout, checked at compile time"),
 ("tensor", "ggml/include/ggml.h", 685, 693, "a tensor is a struct of sizes, byte strides and a raw data pointer"),
 ("tensor_data", "ggml/include/ggml.h", 710, 710, "the raw pointer to the tensor's bytes"),
 ("mmap", "src/llama-mmap.cpp", 495, 498, "model weights are mapped from the GGUF file into memory, not read"),
 ("deleters", "include/llama-cpp.h", 11, 13, "RAII around the C API: a deleter struct ..."),
 ("unique_ptr", "include/llama-cpp.h", 31, 31, "... and a unique_ptr that calls it when the owner goes out of scope"),
 ("dot_generic", "src/ggml-cpu/quants.c", 0, 0, "placeholder"),
 ("template_dup", "ggml/src/ggml-cpu/ops.cpp", 46, 49, "a C++ template: one copy of the function per (source, destination) type pair"),
 ("threads", "ggml/src/ggml-cpu/ggml-cpu.c", 445, 446, "the CPU backend's threads are plain POSIX threads behind C macros"),
 ("ith_nth", "ggml/src/ggml-cpu/ops.cpp", 58, 59, "each op splits its rows by thread index and thread count"),
 ("simd", "ggml/src/ggml-cpu/arch/arm/quants.c", 336, 343, "the same dot product with ARM NEON intrinsics, 16 bytes at a time"),
 ("cmake", "ggml/CMakeLists.txt", 199, 199, "backends are chosen at build time with CMake options"),
]
EX = [e for e in EX if e[0] != "dot_generic"] + [("dot_generic", "ggml/src/ggml-cpu/quants.c", 242, 256, "the portable reference loop: unpack two 4-bit weights per byte, multiply, accumulate")]
commit = subprocess.check_output(["git", "-C", CLONE, "log", "-1", "--format=%H %cs"], text=True).split()
out = {"repo": "https://github.com/ggml-org/llama.cpp", "commit": commit[0], "date": commit[1], "excerpts": {}}
for i, f, a, b, why in EX:
    lines = open(os.path.join(CLONE, f), encoding="utf-8").read().split("\n")[a - 1:b]
    out["excerpts"][i] = {"file": f, "start": a, "end": b, "why": why, "text": "\n".join(lines)}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "excerpts.json"), "w"), indent=1, ensure_ascii=False)
print(commit, len(EX))
