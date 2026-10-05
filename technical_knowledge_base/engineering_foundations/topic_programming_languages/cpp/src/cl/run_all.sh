#!/bin/bash
# Reproduce every output shown in Part 3 (Reading llama.cpp). About 10 minutes on an M1 Pro.
# Big things (the llama.cpp clone, builds, the model) live in the session scratchpad ($CL); outputs go to out/.
set -u
H="$(cd "$(dirname "$0")" && pwd)"; O=$H/out; mkdir -p $O
. $H/code/env.sh
PY=$S/py/cpython-3.13.16-macos-aarch64-none/bin/python3.13
la() { echo "load average: $(sysctl -n vm.loadavg)"; }
filt() { grep -v -E "^llama_model_loader: - (kv|tensor)|^load_tensors: (layer|tensor)|^create_tensor:|^repack: repack tensor|^llama_graph_n_input_tensors|^llama_kv_cache: layer|^graph_reserve|^resolve_fused_ops|^load: control token|^print_info: (n_merges|LF token|EOG|EOS|BOS|EOT|PAD|FIM|max token|general.name|vocab type|n_vocab)|^\.+$"; }

# 0. versions and the pinned commit
{ echo "llama.cpp commit: $(git -C $LL rev-parse HEAD)"; echo "commit date: $(git -C $LL log -1 --format=%cd)"
  echo "C/C++ compiler: $($CLT/usr/bin/clang++ --version | head -1)"; echo "cmake: $(cmake --version | head -1)"; echo "ninja: $(ninja --version)"
  echo "python: $($PY --version)"; echo "machine: $(sysctl -n machdep.cpu.brand_string), $(sysctl -n hw.perflevel0.physicalcpu) P + $(sysctl -n hw.perflevel1.physicalcpu) E cores, macOS $(sw_vers -productVersion)"
  echo "cpu features: $(sysctl hw.optional.arm.FEAT_DotProd hw.optional.arm.FEAT_I8MM | tr "\n" " ")"; echo "model: $MODEL_URL"; echo "model sha256 expected: $MODEL_SHA"
  [ -f $MODEL ] || curl -sL -o $MODEL "$MODEL_URL"; echo "model sha256 measured: $(shasum -a 256 $MODEL | cut -d' ' -f1)"; echo "model bytes: $(stat -f %z $MODEL)"
} > $O/versions.txt

# 1. the repository map
python3 $H/code/repo_map.py $LL $O/repo_map.json > $O/repo_map.txt

# 2. build (CPU + BLAS + Metal: the macOS defaults), timed
{ la; /usr/bin/time -p cmake -S $LL -B $B -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CLT/usr/bin/clang -DCMAKE_CXX_COMPILER=$CLT/usr/bin/clang++ -DCMAKE_OSX_SYSROOT=$CLT/SDKs/MacOSX.sdk -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF 2>&1 | grep -E "Including|OpenMP not found|Accelerate|Metal framework|^real"
  cmake --build $B --target clean > /dev/null
  /usr/bin/time -p cmake --build $B -j 4 --target llama-cli llama-bench llama-simple llama-server llama-gguf llama-quantize llama-eval-callback 2>&1 | grep -E "^\[[0-9]+/[0-9]+\] Linking|^real"; la
  grep -E "^GGML_(METAL|BLAS|CPU_REPACK|LLAMAFILE|NATIVE|OPENMP|CUDA):" $B/CMakeCache.txt; ls $B/bin | grep -E "^(llama-[a-z-]+|lib[a-z-]+\.dylib)$"; } > $O/build.txt 2>&1

# 3. GGUF: our 41-line reader, gguf-py's dump, and real Q8_0 bytes
$PY $H/code/gguf_read.py $MODEL > $O/gguf_read.txt
UV_CACHE_DIR=$S/uvcache $S/bin/uv run -q --no-project --python $PY --with numpy --with pyyaml --with tqdm --with sentencepiece env PYTHONPATH=$LL/gguf-py python -m gguf.scripts.gguf_dump $MODEL 2>&1 | grep -v "^INFO" > $O/gguf_dump_full.txt
{ sed -n 1,30p $O/gguf_dump_full.txt; echo "..."; sed -n '/tensor(s)/,$p' $O/gguf_dump_full.txt | head -12; } > $O/gguf_dump.txt; rm $O/gguf_dump_full.txt
$PY $H/code/gguf_tensors.py $MODEL $O/gguf_tensors.json > /dev/null
$PY $H/code/quant_demo.py $MODEL $O/quant_demo.json > $O/quant_demo.txt

# 4. one prompt through llama-simple on the CPU (-ngl 0), and the same on the GPU (Metal, -ngl 99)
cd $CL
{ la; $B/bin/llama-simple -m $MODEL -n 8 -ngl 0 "The capital of France is" 2> $O/simple_cpu_err.txt; } > $O/simple_cpu.txt
filt < $O/simple_cpu_err.txt > $O/simple_cpu_log.txt; rm $O/simple_cpu_err.txt
$B/bin/llama-simple -m $MODEL -n 8 -ngl 99 "The capital of France is" > $O/simple_metal.txt 2> $O/simple_metal_err.txt
filt < $O/simple_metal_err.txt | grep -v "^ggml_metal_library_compile\|^ggml_metal_init\|^ggml_metal_device_init" > $O/simple_metal_log.txt; rm $O/simple_metal_err.txt

# 5. every graph node of one decoded token ("Paris"), via the eval callback
$B/bin/llama-eval-callback -m $MODEL -p "Paris" -ngl 0 -t 4 -n 1 2> $O/evalcb_err.txt | grep "common_debug_cb_eval:" | sed 's/^common_debug_cb_eval: *//' > $O/evalcb_nodes.txt
grep -E "system_info|input tokens|^ *[0-9]+ *$|   [0-9]+$" $O/evalcb_err.txt | sed 's/^[0-9.]* I //' > $O/evalcb_info.txt; rm $O/evalcb_err.txt

# 6. which CPU kernels really run: call counters in an instrumented copy (CPU only)
rm -rf $CL/llama-instr $BI; rsync -a --exclude /.git --exclude /models $LL/ $CL/llama-instr/
python3 $H/code/instrument.py $CL/llama-instr > $O/instrument.txt
cmake -S $CL/llama-instr -B $BI -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CLT/usr/bin/clang -DCMAKE_CXX_COMPILER=$CLT/usr/bin/clang++ -DCMAKE_OSX_SYSROOT=$CLT/SDKs/MacOSX.sdk -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DGGML_METAL=OFF -DGGML_BLAS=OFF "-DCMAKE_C_FLAGS=-include $CL/llama-instr/cl_count.h" "-DCMAKE_CXX_FLAGS=-include $CL/llama-instr/cl_count.h" > /dev/null 2>&1
cmake --build $BI -j 4 --target llama-simple llama-bench llama-quantize > /dev/null 2>&1
Q4=$CL/SmolLM2-135M-Instruct-Q4_0.gguf
{ echo "# llama-simple, 5-token prompt, -n N: N=1 is the prompt only, each extra N is one more decoded token (4 threads)"
  for n in 1 2 3; do echo "n=$n $($BI/bin/llama-simple -m $MODEL -n $n "The capital of France is" 2>&1 >/dev/null | grep CL_COUNTS)"; done
  echo "# llama-bench, same work (-p 5 -n 1 -r 1, 4 threads, includes one warm-up run), repack on and off"
  for rp in 1 0; do echo "repack=$rp $($BI/bin/llama-bench -m $MODEL -p 5 -n 0 -r 1 -t 4 --repack $rp 2>&1 | grep CL_COUNTS)"; done
  $BI/bin/llama-quantize --allow-requantize $MODEL $Q4 Q4_0 > $O/quantize.txt 2>&1
  echo "# the same with the Q4_0 file"
  for rp in 1 0; do echo "q4_0 repack=$rp $($BI/bin/llama-bench -m $Q4 -p 5 -n 0 -r 1 -t 4 --repack $rp 2>&1 | grep CL_COUNTS)"; done
} > $O/counts.txt
grep -E "llama_model_quantize_impl: (model size|quant size)|^main: (quantize time|total time)|falling back" $O/quantize.txt > $O/quantize_summary.txt
echo "Q4_0 file bytes: $(stat -f %z $Q4)" >> $O/quantize_summary.txt
$B/bin/llama-simple -m $Q4 -n 8 -ngl 0 "The capital of France is" > $O/simple_q4_0.txt 2> /dev/null

# 7. speed: llama-bench, CPU threads x repack, Metal; 5 repetitions; load average around each
{ la; $B/bin/llama-bench -m $MODEL -ngl 0 -t 1,2,4,8 --repack 0,1 -p 64 -n 32 -r 5 -o json > $O/bench_cpu.json 2>/dev/null; la
  $B/bin/llama-bench -m $MODEL -ngl 99 -p 64 -n 32 -r 5 -o json > $O/bench_metal.json 2>/dev/null; la
  $B/bin/llama-bench -m $Q4 -ngl 0 -t 4 -p 64 -n 32 -r 5 -o json > $O/bench_q4_cpu.json 2>/dev/null; la; } > $O/bench_load.txt

# 8. the server: one completion request over HTTP
$B/bin/llama-server -m $MODEL -ngl 0 --port 8737 -c 2048 -np 2 > $O/server_err.txt 2>&1 &
SP=$!; for i in $(seq 1 60); do curl -s localhost:8737/health | grep -q ok && break; sleep 1; done
{ echo '$ curl -s localhost:8737/health'; curl -s localhost:8737/health; echo
  echo '$ curl -s localhost:8737/completion -d '"'"'{"prompt": "The capital of France is", "n_predict": 8, "temperature": 0}'"'"
  curl -s localhost:8737/completion -d '{"prompt": "The capital of France is", "n_predict": 8, "temperature": 0}' | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps({k:d[k] for k in ['content','tokens_predicted','tokens_evaluated','stop_type','timings'] if k in d},indent=1))"; } > $O/server.txt
kill $SP; sleep 1
grep -E "slot|srv  +init|main: (server is listening|model loaded)|n_parallel|update_slots|launch_slot|print_timing|prompt eval|eval time|total time" $O/server_err.txt | sed 's/^[0-9.]* [A-Z] //' | head -40 > $O/server_log.txt; rm $O/server_err.txt

{ for rp in 0 1; do echo "# --repack $rp, 1 thread, 64-token prompt"; $B/bin/llama-bench -m $MODEL -ngl 0 -t 1 --repack $rp -p 64 -n 0 -r 1 -v 2>&1 | grep -E "model buffer size|splits"; done; } > $O/sched_splits.txt
bash $H/code/threadpool_offsets.sh > $O/threadpool_offsets.txt

# 8b. four C++ features llama.cpp uses, in a small program
bash $H/code/features.sh > $O/features.txt 2>&1

# 9. the excerpts shown on the page, cut from the pinned clone
python3 $H/code/excerpts.py $LL $O/excerpts.json > /dev/null
echo done
