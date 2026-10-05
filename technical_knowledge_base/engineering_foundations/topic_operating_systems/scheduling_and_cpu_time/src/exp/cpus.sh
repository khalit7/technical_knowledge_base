# What a program inside a container believes about its CPUs. Run under several docker flag sets.
. /exp/lib.sh
python - <<'PY'
import os, torch
cm = open("/sys/fs/cgroup/cpu.max").read().split(); cs = open("/sys/fs/cgroup/cpuset.cpus.effective").read().strip()
q = "max" if cm[0] == "max" else f"{int(cm[0]) / int(cm[1]):g}"
print(f"cpu.max quota/period {q}; cpuset.cpus.effective {cs}; os.cpu_count() {os.cpu_count()}; "
      f"len(os.sched_getaffinity(0)) {len(os.sched_getaffinity(0))}; torch.get_num_threads() {torch.get_num_threads()}; "
      f"torch.get_num_interop_threads() {torch.get_num_interop_threads()}")
PY
echo "nproc $(nproc); nproc --all $(nproc --all)"
