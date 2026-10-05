# Three different "out of memory" errors that are not the OOM killer.
. /exp/lib.sh
sec "overcommit policy of this kernel (0 heuristic, 1 always, 2 never)"
run "cat /proc/sys/vm/overcommit_memory"
sec "a 1 TiB array is granted, because nothing has touched it yet"
run "python -c \"import numpy as np; a = np.zeros(1 << 40, dtype=np.uint8); print('allocated', a.nbytes >> 30, 'GiB'); print(''.join(l for l in open('/proc/self/status') if l.startswith(('VmSize', 'VmRSS'))), end='')\""
sec "with an address-space limit (ulimit -v, RLIMIT_AS) the same kind of request fails at once"
run "ulimit -v 8388608; python -c 'x = bytearray(12 << 30)' 2>&1 | tail -n 1"
run "ulimit -v 8388608; python -c 'import numpy as np; x = np.ones(12 << 30, dtype=np.uint8)' 2>&1 | tail -n 1"
run "ulimit -v 8388608; python -c 'import torch; x = torch.empty(12 << 30, dtype=torch.uint8)' 2>&1 | tail -n 1 | cut -c1-300"
