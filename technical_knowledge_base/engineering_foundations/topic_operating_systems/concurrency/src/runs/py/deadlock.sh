#!/bin/sh
# Run inside the container (needs CAP_SYS_PTRACE for py-spy). Starts deadlock.py, waits 1 s, then inspects it.
python3 /py/deadlock.py & PID=$!
sleep 1
echo "## py-spy dump --pid <pid>"
py-spy dump --pid $PID 2>&1 | sed 's/(python3 [^)]*)//'
echo "## per thread: name, state, kernel wait channel, system call number (98 = futex on arm64)"
for t in /proc/$PID/task/*; do printf '%s state %s wchan %s syscall %s\n' "$(cat $t/comm)" "$(awk '{print $3}' $t/stat)" "$(cat $t/wchan)" "$(cut -d' ' -f1 $t/syscall)"; done
kill -9 $PID
echo "## the same program with --ordered"
timeout 10 python3 /py/deadlock.py --ordered
