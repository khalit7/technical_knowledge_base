# The running example: one tiny training job

Every tab of Topic: operating-systems follows this one job through the operating system. It is a real
CPU-only PyTorch training run, small enough to trace every system call, and it does each thing a large
training job does to the OS:

| Phase marker | What happens | OS ideas it exercises |
|---|---|---|
| `start` | `python3` is exec'd; the dynamic loader maps libpython and libc | execve, the loader, mmap of shared libraries |
| `import_torch` .. `import_done` | `import numpy`, `import torch` | hundreds of openat/newfstatat calls, mmap of the big .so files, threads created by OpenMP |
| `dataset_open` | `np.memmap` of an 8 MiB file (8192 rows of 256 float32 features + 1 float32 label) | openat, mmap of a file, the page cache, page faults |
| `model_build` | the 256-128-10 MLP is created | a 1 GiB address-space reservation (anonymous mmap with MAP_NORESERVE, then madvise MADV_HUGEPAGE) made by the mimalloc allocator built into this wheel's libc10.so (gdb stack in src/trace/raw/hugepage_stack.txt) |
| `optim_build` | `torch.optim.SGD(...)`: the first optimizer lazily imports `torch._dynamo`, which pulls in sympy and `torch.distributed` | a second import storm about as large as `import torch` (measured in the Syscall tracer tab) |
| `loader_start` .. `first_batch` | a `DataLoader` with 2 worker processes | clone (fork) or clone + execve (spawn, forkserver), pipes, sockets, shared memory in `/dev/shm` |
| `step_0` .. `step_N` | SGD steps on a 256-128-10 MLP, batch 64 | futex (threads waking each other), reads from worker pipes, mmap of shared-memory batches |
| `ckpt_begin` .. `ckpt_end` | `torch.save` to `ckpt.pt.tmp`, `flush`, `fsync`, `os.replace` to `ckpt.pt`, `fsync` of the directory | write, fsync, renameat (the write-then-rename pattern) |
| (signal) | with `--sigterm-at-step K` the job sends itself SIGTERM; the handler sets a flag, the loop checkpoints and exits 0 | rt_sigaction, kill, signal delivery, rt_sigreturn |
| `exit` | the iterator is deleted, workers are told to stop and are joined | wait4, exit_group |

Phase markers are a deliberate, harmless system call: `phase(name)` calls `os.access("/phase/<name>")`, which shows in strace as
`faccessat(AT_FDCWD, "/phase/<name>", F_OK) = -1 ENOENT`. Cut any trace into phases with them.

## Files (all in `src/trace/job/`)
- `make_data.py`: writes the dataset deterministically (seed 0): `8,421,376` bytes.
- `train.py`: the job. Options: `--steps 20 --workers 2 --batch 64 --start-method {fork,spawn,forkserver} --sigterm-at-step K --threads 2 --no-ckpt --preload torch,numpy --second-iter --data /work/data/train.bin --out /work/out` (`--preload`: modules the forkserver imports once; `--second-iter`: also time the first batch of a fresh iterator, as at a new epoch).
- `run_job.sh`: one plain run inside `kb-os-lab:1` (mounts this folder read-only at `/job`; data and checkpoint go in the container's `/work`).

## How to run it
```sh
# from src/trace/job/ (set PREFIX to your agent's container prefix)
PREFIX=os-dbg- sh run_job.sh                               # 20 steps, default start method (fork on Linux, Python 3.11)
PREFIX=os-dbg- sh run_job.sh --start-method spawn --steps 40
PREFIX=os-dbg- sh run_job.sh --sigterm-at-step 12          # the graceful SIGTERM path

# or by hand, e.g. under strace or with your own limits
docker run --rm --name os-dbg-job --cpus 2 --memory 3g --shm-size 256m \
  -v "$PWD":/job:ro kb-os-lab:1 sh -c \
  'mkdir -p /work/data /work/out && python /job/make_data.py && python /job/train.py --steps 20'
```
`--sigterm-at-step` makes the job signal itself with `kill(getpid(), SIGTERM)`. In production the signal comes from outside
(the kubelet, Slurm, or a spot-instance preemption notice turned into SIGTERM); the delivery and the handler path are the same,
only the sender's pid differs. To send it from outside instead: `docker exec <container> pkill -TERM -f train.py`
(this also signals the workers, which is a different and instructive failure: see the Debug lab).

## Environment (recorded 2026-10-05)
- Image `kb-os-lab:1`, id `sha256:af5ef86352529947572e47a08155df0575810a1824dcafb78ef4a4a675642571`, Dockerfile in the scratchpad lab folder and copied to `src/trace/lab/Dockerfile`.
- Debian 12 (bookworm) arm64; Python 3.11.2; torch 2.14.1+cpu; numpy 2.4.6; strace 6.1; perf 6.1.187; bpftrace and bpfcc-tools installed (whether they work on this kernel is tested separately); ltrace has no arm64 package in bookworm.
- Docker Desktop's linuxkit VM on an Apple M1 laptop: Linux 5.10.104-linuxkit, 5 CPUs, about 10 GB RAM, cgroups v2, one NUMA node, no GPU.

## Real timings (2026-10-05, `--cpus 2`, untraced; the VM was shared with other agents' runs, so expect some spread)
Time from `iter(dl)` (workers created) to the first batch, 7 runs per start method (raw: `src/trace/raw/timing_first_batch.txt`):
fork median 0.021 s, spawn median 0.836 s, forkserver median 0.763 s. A second iterator (as at the start of each epoch, unless
`persistent_workers=True`) pays the cost again: spawn 0.807 s, forkserver 0.822 s, while forkserver with
`multiprocessing.set_forkserver_preload(["torch", "numpy"])` (`--preload torch,numpy`) pays 0.703 s once and then 0.035 s
(5 runs each, `timing_epochs.txt`). Under strace the same job takes about 170 s (fork) and 340 s (spawn, forkserver)
instead of about 1.5 to 2.4 s: strace timings are inflated, counts and order are exact.

Loss goes from 2.2969 at step 0 to 2.2241 at step 35: the job exists to exercise the OS, not to learn well.
