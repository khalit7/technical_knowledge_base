#!/bin/sh
# Runs inside kb-os-lab:1 with this folder mounted at /runs (read-only) and /out writable.
set -e
mkdir -p /tmp/b && cd /tmp/b
for f in spawn_cost sigqueue pipes fdshare cloexec lifecycle sysc; do gcc -O2 -o $f /runs/c/$f.c; done
echo "== env"; uname -srm; nproc; grep MemTotal /proc/meminfo; ldd --version | head -1
echo "== E3 pipes"; ./pipes
echo "== E2 sigqueue"; ./sigqueue 1000
echo "== E4 fdshare"; ./fdshare /tmp/fdshare.txt > /tmp/fd_stdout.txt 2>/tmp/fd_stderr.txt; cat /tmp/fd_stderr.txt; echo "--- stdout redirected to a file:"; cat /tmp/fd_stdout.txt
echo "== E5 cloexec"; ./cloexec 0; ./cloexec 1
echo "== E6 lifecycle"; ./lifecycle 0; ./lifecycle 1
echo "== E14 exec_keep (moved to run_exec.sh, see README)"
echo "== E9 sysc"; ./sysc 200000; echo "under strace:"; strace -f -o /dev/null ./sysc 20000
echo "== E9 python os.getppid"; python -c "import timeit,os; n=200000; print('python_os_getppid_ns_per_call %.1f'%(min(timeit.repeat(os.getppid,number=n,repeat=5))/n*1e9))"
echo "== E9 gdb: glibc's read() wrapper on arm64"; gdb -batch -ex 'disassemble read' /lib/aarch64-linux-gnu/libc.so.6 2>&1 | head -60
echo "== E1 spawn_cost"; ./spawn_cost 0 64 256 1024
