#!/bin/sh
# Runs INSIDE kb-gpu-lab:1: compile and run the two host programs (no GPU, no driver).
# The TMA program is run against the toolkit's driver stub (libcuda.so in lib64/stubs, linked as libcuda.so.1).
cd /work; mkdir -p out/host /tmp/stub
ln -sf /usr/local/cuda/lib64/stubs/libcuda.so /tmp/stub/libcuda.so.1
nvcc -std=c++17 -O2 -o /tmp/lt host/lt_gelu_bias.cu -lcublasLt > out/host/lt_gelu_bias.compile.txt 2>&1; echo "exit=$?" >> out/host/lt_gelu_bias.compile.txt
/tmp/lt > out/host/lt_gelu_bias.run.txt 2>&1; echo "exit=$?" >> out/host/lt_gelu_bias.run.txt
nvcc -std=c++17 -O2 -o /tmp/tm host/tma_descriptor.cu -L/usr/local/cuda/lib64/stubs -lcuda > out/host/tma_descriptor.compile.txt 2>&1; echo "exit=$?" >> out/host/tma_descriptor.compile.txt
LD_LIBRARY_PATH=/tmp/stub /tmp/tm > out/host/tma_descriptor.run.txt 2>&1; echo "exit=$?" >> out/host/tma_descriptor.run.txt
