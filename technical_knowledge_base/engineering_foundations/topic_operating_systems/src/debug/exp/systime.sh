. /exp/lib.sh
sec "64 MiB from the page cache, three read sizes"
run "python /exp/systime.py"
sec "strace -c counts the system calls (64-byte reads of the first 1 MiB)"
run "head -c 1048576 /dev/urandom > /work/small.bin; strace -c -e trace=read python -c \"import os; fd = os.open('/work/small.bin', os.O_RDONLY); [os.read(fd, 64) for _ in range(16384)]\" 2>&1 | tail -n 5"
