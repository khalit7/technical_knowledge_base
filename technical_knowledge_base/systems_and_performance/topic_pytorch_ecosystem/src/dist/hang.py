"""What a hang looks like, on purpose. Two ranks, a 10 s collective timeout, the flight recorder on.

    sh run.sh 2 hang.py skip       # rank 1 skips one all_reduce that rank 0 calls
    sh run.sh 2 hang.py shape      # ranks all_reduce tensors of different sizes
    TORCH_DISTRIBUTED_DEBUG=DETAIL sh run.sh 2 hang.py shape   # the same, with the collective checker
    sh run.sh 2 hang.py barrier    # rank 1 never arrives; monitored_barrier names it

Each rank records the exception text (paths removed), how long it took to surface, and its flight-recorder
entries, the evidence you would read after a real hang.
"""
import re, sys
from datetime import timedelta
from common import *

case = sys.argv[1]
rank, world = init(timeout_s=10)
t = torch.ones(1000)
for _ in range(3):
    dist.all_reduce(t)                       # three collectives that match
res = {"case": case, "debug": os.environ.get("TORCH_DISTRIBUTED_DEBUG", "OFF")}
t0 = time.time()
try:
    if case == "skip":
        if rank == 0:
            dist.all_reduce(t)               # rank 1 never calls this one
        else:
            time.sleep(15)
        dist.barrier()
    elif case == "shape":
        dist.all_reduce(torch.ones(1000 if rank == 0 else 999))
        dist.barrier()
    elif case == "barrier":
        if rank == 0:
            dist.monitored_barrier(timeout=timedelta(seconds=5))
        else:
            time.sleep(8)
    res["error"] = None
except Exception as e:
    msg = str(e)
    msg = re.sub(r"(/[^\s:'\"]+)+", "<path>", msg)       # no local paths in the record
    msg = re.sub(r"\[[0-9a-f:.]+\]:\d+", "<addr>", msg)
    res["error"] = type(e).__name__ + ": " + msg[:1200]
res["seconds"] = round(time.time() - t0, 2)
ent, _ = fr_entries()
res["fr"] = [{k: e[k] for k in ("collective_seq_id", "profiling_name", "input_sizes", "state")} for e in ent]
dump(f"hang_{case}_{res['debug'].lower()}", rank, res)
# no merge: the process group may be broken; files are merged by build_data.py
os._exit(0)
