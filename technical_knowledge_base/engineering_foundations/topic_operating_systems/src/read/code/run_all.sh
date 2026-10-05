#!/bin/sh
# Record every measurement and output the Reading tab shows. Needs Docker and the shared image kb-os-lab:1
# (src/trace/lab/Dockerfile). Each experiment runs in its own capped container named os-rd-*.
# Raw outputs land in out/ and are redacted by redact.py; ../../parts/22_js_rd_data.js is generated from them by
# make_data.py. Usage: sh run_all.sh [name ...]   (no name: all)
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
JOB=$(cd "$HERE/../../trace/job" && pwd)
OUT="$HERE/out"; mkdir -p "$OUT"
IMG=kb-os-lab:1
ALL="$*"
want() { [ -z "$ALL" ] && return 0; case " $ALL " in *" $1 "*) return 0;; esac; return 1; }
dr() { n=$1; shift; SHM="--shm-size 256m"; [ "$n" = vm ] && SHM=""; docker run --rm --name "os-rd-$n" --cpus 2 --memory 3g $SHM -v "$HERE":/code:ro -v "$OUT":/out "$@"; }
cc='mkdir -p /b && cd /b && gcc -O2 -pthread -o $0 /code/$0.c'
if want syscall; then dr syscall $IMG sh -c "$cc && ./syscall_cost > /out/syscall_cost.txt" syscall_cost; fi
if want ctx; then dr ctx $IMG sh -c "$cc && ./ctxswitch > /out/ctxswitch.txt" ctxswitch; fi
if want tlb; then dr tlb $IMG sh -c "$cc && ./tlb > /out/tlb.txt" tlb; fi
if want malloc; then dr malloc --cap-add SYS_PTRACE $IMG sh -c "$cc && strace -e trace=brk,mmap,munmap,write ./malloc_sizes > /out/malloc_strace.txt 2>&1" malloc_sizes; fi
if want counter; then dr counter --cap-add SYS_PTRACE $IMG sh -c "$cc && ./counter > /out/counter.txt && strace -f -c -e trace=futex ./counter mutex > /dev/null 2> /out/counter_mutex_futex.txt" counter; fi
if want epoll; then dr epoll --cap-add SYS_PTRACE $IMG sh -c "strace -f -e trace=epoll_create1,epoll_ctl,epoll_wait,epoll_pwait python3 /code/asyncio_epoll.py > /out/asyncio_epoll.txt 2>&1"; fi
if want container; then dr container --pids-limit 256 $IMG sh /code/container_view.sh > "$OUT/container_view.txt" 2>&1; fi
if want write; then dr write $IMG python3 /code/write_journey.py /work/wj > "$OUT/write_journey.json"; fi
if want faults; then dr faults -v "$JOB":/job:ro $IMG sh -c "mkdir -p /work/data && python3 /job/make_data.py /work/data/train.bin > /dev/null && python3 /code/faults.py /work/data/train.bin > /out/faults.json"; fi
if want maps; then rm -rf "$OUT/maps"; dr maps -v "$JOB":/job:ro -e MAPS_OUT=/out/maps $IMG sh -c "mkdir -p /work/data /work/out && python3 /job/make_data.py /work/data/train.bin > /dev/null && python3 /code/maps_job.py > /out/maps_job.log 2>&1"; fi
if want vm; then dr vm $IMG sh -c 'for f in /sys/kernel/mm/transparent_hugepage/enabled /proc/sys/vm/overcommit_memory /proc/sys/vm/swappiness /proc/sys/vm/dirty_expire_centisecs /proc/sys/vm/dirty_writeback_centisecs /proc/sys/vm/dirty_ratio /proc/sys/vm/dirty_background_ratio; do echo "$f: $(cat $f)"; done; echo "## free -m"; free -m; echo "## numactl --hardware"; numactl --hardware; echo "## df -h /dev/shm (Docker default size)"; df -h /dev/shm; echo "## getconf PAGESIZE"; getconf PAGESIZE; echo "## cat /proc/self/oom_score /proc/self/oom_score_adj"; cat /proc/self/oom_score /proc/self/oom_score_adj' > "$OUT/vm_settings.txt" 2>&1; fi
if want env; then dr env $IMG sh -c 'uname -srm; python3 -V; python3 -c "import torch,numpy;print(\"torch\",torch.__version__,\"numpy\",numpy.__version__)"; gcc --version | head -1; nproc; head -1 /proc/meminfo' > "$OUT/env.txt"; fi
python3 "$HERE/redact.py" "$OUT"
