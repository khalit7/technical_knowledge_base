#!/bin/sh
# E9b. What strace itself does per system call it traces: trace the tracer.
# The inner strace traces ./sysc doing N getppid calls; the outer strace counts the inner strace's own calls.
gcc -O2 -o /tmp/sysc /runs/c/sysc.c
for N in 1000 2000; do
  echo "== inner traced program: sysc $N (5 x $N getppid calls)"
  strace -c -o /tmp/outer.txt strace -o /dev/null /tmp/sysc $N > /dev/null
  cat /tmp/outer.txt
done
