# Insert call counters into a COPY of llama.cpp (never the pinned clone) to learn which CPU kernels really run.
# Usage: python3 instrument.py <copy of llama.cpp>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
HDR = root / "cl_count.h"
HDR.write_text("""#pragma once
#ifdef __cplusplus
extern "C" {
#endif
extern unsigned long long cl_cnt[16];
#ifdef __cplusplus
}
#endif
#define CL_COUNT(i) __atomic_fetch_add(&cl_cnt[(i)], 1ULL, __ATOMIC_RELAXED)
""")
# (file, line that starts the definition, counter index)
SITES = [
    ("ggml/src/ggml-cpu/arch/arm/repack.cpp", "void ggml_gemv_q8_0_4x4_q8_0(int", 0),
    ("ggml/src/ggml-cpu/arch/arm/repack.cpp", "void ggml_gemm_q8_0_4x4_q8_0(int", 1),
    ("ggml/src/ggml-cpu/arch/arm/quants.c", "void ggml_vec_dot_q8_0_q8_0(int", 2),
    ("ggml/src/ggml-cpu/llamafile/sgemm.cpp", "bool llamafile_sgemm(", 3),
    ("ggml/src/ggml-cpu/ggml-cpu.c", "void ggml_compute_forward_mul_mat(", 4),
    ("ggml/src/ggml-cpu/arch/arm/quants.c", "void ggml_vec_dot_q4_0_q8_0(int", 5),
    ("ggml/src/ggml-cpu/arch/arm/repack.cpp", "void ggml_gemv_q4_0_4x4_q8_0(int", 6),
    ("ggml/src/ggml-cpu/arch/arm/repack.cpp", "void ggml_gemm_q4_0_4x4_q8_0(int", 7),
]
NAMES = ["gemv_q8_0_4x4", "gemm_q8_0_4x4", "vec_dot_q8_0_q8_0", "llamafile_sgemm", "forward_mul_mat",
         "vec_dot_q4_0_q8_0", "gemv_q4_0_4x4", "gemm_q4_0_4x4"]
for f, start, idx in SITES:
    p = root / f
    lines = p.read_text().split("\n")
    i = next(k for k, l in enumerate(lines) if l.startswith(start))
    while not lines[i].rstrip().endswith("{"):
        i += 1
    lines.insert(i + 1, f"    CL_COUNT({idx});")
    p.write_text("\n".join(lines))
    print("patched", f, "line", i + 2)
c = root / "ggml/src/ggml-cpu/ggml-cpu.c"
fmt = " ".join(n + "=%llu" for n in NAMES)
args = ", ".join(f"cl_cnt[{i}]" for i in range(len(NAMES)))
c.write_text(c.read_text() + f"""
unsigned long long cl_cnt[16];
__attribute__((destructor)) static void cl_dump(void) {{
    fprintf(stderr, "CL_COUNTS {fmt}\\n", {args});
}}
""")
