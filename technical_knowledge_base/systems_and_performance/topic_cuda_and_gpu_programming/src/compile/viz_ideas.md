# Compiler explorer tab: visual ideas (built and rejected)

Question the tab answers: "what does the GPU actually execute when I write this kernel, and what does the compiler's report tell me about how fast it can be?"
Everything is real compiler output (nvcc and ptxas from the CUDA toolkit in the kb-gpu-lab:1 image; Triton's own compiler with an explicit target). Nothing was run on an NVIDIA GPU: no timings here.

## Built
1. **Pipeline animation, before/after (CUDA C++ path vs Triton path) on the same op (vector add).** Each step shows the real text the stage produced for the line `c[i] = a[i] + b[i]` (source, PTX, SASS; Triton: Python, TTIR, TTGIR, LLVM IR, PTX, SASS). Score: high (the reader has never seen PTX or SASS; one input through every stage is Khalid's favourite pattern).
2. **Three-pane explorer (source | PTX | SASS) with line mapping.** Click a source line: the PTX lines (from `.loc` directives) and SASS lines (from `nvdisasm -g`) it produced light up. Kernel and target selectable; resource card from `ptxas -v`; instruction mix bar; occupancy with its limiting resource. Score: high (this is what godbolt does, offline, with annotations in plain words for each opcode from NVIDIA's instruction-set table).
3. **Before/after: naive vs tiled matmul, animated over the real inner-loop SASS.** Steps through the instructions of one loop iteration with counters (global loads, shared loads, FMAs); the ratio of memory instructions to FMAs is the point.
4. **Before/after: one multiply-add per thread (FFMA) vs one tensor-core instruction (HMMA, HGMMA, UTCHMMA).** Bar chart (log scale) of multiply-adds per issued instruction, derived from the instruction shapes in the PTX ISA; which architecture accepts which instruction is taken from real compile results.
5. **Register pressure ladder.** Registers, spill bytes and implied occupancy as the per-thread accumulator count N grows, per architecture, from real `ptxas -v`.
6. **What compiled where (matrix).** Every kernel x target, green if it compiled, with the real error message when not: evidence for "sm_120 has no wgmma or tcgen05" and "sm_90a code is architecture-specific".
7. **Occupancy from the compiler's numbers.** Block-size slider; registers, shared memory, warps and blocks each give a limit; the smallest wins. Validated against NVIDIA's own `cuda_occupancy.h` (run on the CPU in the container).
8. **Triton for the same ops.** Registers, shared memory and the tensor-core instruction Triton chose per target, from Triton's own compile.
9. Predict-then-reveal drills and interview questions.

## Rejected
- Live compilation in the page: impossible (sandboxed iframe, no network, no compiler in the browser).
- Timings of the compiled kernels: no NVIDIA GPU; the Kernel lab tab owns real timings (Apple M1 Pro GPU).
- Full SASS dumps for every kernel x target: too large; the page keeps the kernel body and trims nothing inside it, but stores each SASS without addresses and encodings.
- A control-flow-graph view of SASS: costly, and the kernels here are short enough to read linearly.

## What the build found (2026-10-05) and how it changed the tab
- The FP8 `mma.sync` row of the tensor-core table became a finding: native QMMA only on sm_120; F2FP unpack + 2 HMMA on sm_90a and sm_100a.
- The pipeline gained a "Fat binary" step from a real `cuobjdump -lelf -lptx` listing, and a "Load and run" step labelled as explanation (not output).
- The Triton table gained a fifth row (the same FP16 matmul compiled without Triton's launch specialisation), because the first compile, done without the hints, used 2-byte loads and spilled; that contrast teaches more than either alone.
- The register ladder was extended to N = 320 and 384 after N = 256 spilled only 160 to 208 bytes; at 384 ptxas switched strategy on sm_80 (32 registers, 1,504-byte stack frame).
- Softmax loops carry `#pragma unroll 1` so the listing stays readable (said in the source comment).
- Size: the tab's data file is about 290 KB (every SASS listing for 10 kernels x 4 targets, deduplicated PTX). Trimmed by storing listings as joined text, deduplicating PTX, keeping loops as index ranges and dropping PTX of failed compiles.

## What the methodology lacked
Nothing to reproduce here is a published number; the equivalent of "reproduce the figure" was "reproduce the vendor's own calculator" (cuda_occupancy.h, 1,988 of 1,988 cases) and "show the compiler's own words" for every claim about what an architecture supports.
