# The root page's running job, seen by the scheduler: every thread of every process, its class, nice, CPU and state,
# per-thread switch counts and time spent waiting for a CPU; and how often the DataLoader's worker processes are replaced.
. /exp/lib.sh
mkdir -p /work/data /work/out; python /job/make_data.py /work/data/train.bin > /dev/null
python /job/train.py --data /work/data/train.bin --out /work/out --steps 100000 --workers 2 --threads 2 --no-ckpt > /tmp/job.log 2>&1 &
sleep 7
sec "ps: every thread (LWP) of the job"
run "ps -eLo pid,lwp,ppid,cls,ni,pri,psr,stat,pcpu,comm | grep -E 'PID|python|pt_data'"
sec "per thread, read from /proc in one pass: state, last CPU, switches, time on CPU and time waiting on a run queue"
python - <<'PY'
import os
def rd(p):
    try: return open(p).read()
    except OSError: return None
pids = [p for p in os.listdir("/proc") if p.isdigit() and (rd(f"/proc/{p}/comm") or "").strip() in ("python", "pt_data_worker") and p != str(os.getpid())]
for p in sorted(pids, key=int):
    for t in sorted(os.listdir(f"/proc/{p}/task"), key=int):
        st = rd(f"/proc/{p}/task/{t}/stat"); ss = rd(f"/proc/{p}/task/{t}/schedstat"); sv = rd(f"/proc/{p}/task/{t}/status")
        if not (st and ss and sv): continue
        f = st[st.rindex(")") + 2:].split()
        vol = [l.split()[1] for l in sv.splitlines() if l.startswith("voluntary_ctxt")][0]
        inv = [l.split()[1] for l in sv.splitlines() if l.startswith("nonvoluntary_ctxt")][0]
        run_ns, wait_ns, slices = ss.split()
        print(f"pid {p} tid {t} comm {st[st.index('(')+1:st.rindex(')')]} state {f[0]} cpu {f[36]} vol {vol} invol {inv} "
              f"on_cpu_ms {int(run_ns)/1e6:.0f} runqueue_wait_ms {int(wait_ns)/1e6:.0f} timeslices {slices}")
PY
sec "worker pids, sampled every 0.5 s for 3 s (a new DataLoader iterator forks new workers each epoch)"
for i in 1 2 3 4 5 6 7; do echo "t+$(( (i-1)*5 ))00ms workers: $(pgrep -d, pt_data_worker) step: $(grep -o 'step [0-9]*' /tmp/job.log | tail -1)"; sleep 0.5; done
pkill -f train.py; wait 2>/dev/null; true
