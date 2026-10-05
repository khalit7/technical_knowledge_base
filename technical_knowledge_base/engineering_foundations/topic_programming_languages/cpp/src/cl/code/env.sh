# Shared paths for Part 3 (cl). Everything big lives in the session scratchpad, never in the repo.
S=${PL:-${TMPDIR:-/tmp}/pl}
CL=$S/cl
LL=$S/llama.cpp                       # pinned clone, commit 8e1642198dcd4e408f8776222d6ae31b74d01187
B=$CL/build                           # default build (CPU + BLAS + Metal)
BI=$CL/build-instr                    # instrumented copy (call counters)
MODEL=$CL/SmolLM2-135M-Instruct-Q8_0.gguf
MODEL_URL=https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q8_0.gguf
MODEL_SHA=5a1395716f7913741cc51d98581b9b1228d80987a9f7d3664106742eb06bba83
CLT=/Library/Developer/CommandLineTools
export PATH=$S/uvtools/cmake/bin:$S/uvtools/ninja/bin:$S/bin:$PATH
export UV_PYTHON_INSTALL_BIN=0
