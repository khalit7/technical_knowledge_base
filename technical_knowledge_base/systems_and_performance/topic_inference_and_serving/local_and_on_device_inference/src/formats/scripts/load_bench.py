"""Load the same Qwen3-0.6B weights from a pickle checkpoint and from safetensors; time and peak memory.

Usage: python3 -I load_bench.py <model.safetensors> <work dir> <out.json> [reps]
Makes <work>/pytorch_model.bin with torch.save (same tensors), then runs each method in a fresh
child process, reps times, in rotating order. The page cache is warm for both files (macOS cannot
drop it without root), so this measures parsing and copying, not disk speed.
Methods:
  bin_full      torch.load(weights_only=True)            parse the pickle, read every storage
  bin_mmap      torch.load(weights_only=True, mmap=True) parse the pickle, map storages lazily
  st_full       safetensors.torch.load_file              read every tensor
  st_one        safe_open(...).get_tensor(one name)      read the header and one tensor
  <m>+touch     the same, then read one value in every 16 KiB page of every tensor (forces every page in)
Each child reports seconds to return and its peak resident memory (ru_maxrss), minus a baseline
child that only imports torch and safetensors.
"""
import sys, os, json, time, subprocess, platform

st, work, outp = sys.argv[1], sys.argv[2], sys.argv[3]
reps = int(sys.argv[4]) if len(sys.argv) > 4 else 3
os.makedirs(work, exist_ok=True)
binp = os.path.join(work, 'pytorch_model.bin')
ONE = 'model.layers.0.self_attn.q_proj.weight'
CHILD = r'''
import sys, time, resource, torch
from safetensors.torch import load_file
from safetensors import safe_open
m, st, binp, one = sys.argv[1:5]
touch = m.endswith('+touch'); m = m.replace('+touch', '')
t0 = time.perf_counter()
if m == 'bin_full': d = torch.load(binp, weights_only=True); n = len(d)
elif m == 'bin_mmap': d = torch.load(binp, weights_only=True, mmap=True); n = len(d)
elif m == 'st_full': d = load_file(st); n = len(d)
elif m == 'st_one':
    with safe_open(st, 'pt') as f: x = f.get_tensor(one); n = 1
else: n = 0
if touch and n:
    # read one element per 16 KiB page of every tensor, so every page is brought in
    ts = list(d.values()) if m != 'st_one' else [x]
    acc = 0.0
    for t in ts:
        v = t.reshape(-1); step = max(1, 16384 // v.element_size())
        acc += float(v[::step].float().sum())
t1 = time.perf_counter()
print(round(t1 - t0, 4), resource.getrusage(resource.RUSAGE_SELF).ru_maxrss, n)
'''
if not os.path.exists(binp):
    import torch
    from safetensors.torch import load_file
    t0 = time.perf_counter(); torch.save(load_file(st), binp); res_save = time.perf_counter() - t0
else:
    res_save = None
methods = ['base', 'bin_full', 'bin_mmap', 'st_full', 'st_one', 'bin_full+touch', 'bin_mmap+touch', 'st_full+touch']
runs = {m: [] for m in methods}
for r in range(reps):
    order = methods[r % len(methods):] + methods[:r % len(methods)]
    for m in order:
        o = subprocess.run([sys.executable, '-I', '-c', CHILD, m, st, binp, ONE], capture_output=True, text=True)
        s, rss, n = o.stdout.split()
        runs[m].append({'s': float(s), 'rss_bytes': int(rss), 'n': int(n)})  # macOS ru_maxrss is bytes
    print(r, {m: runs[m][-1] for m in methods}, os.getloadavg())
out = {'bin_bytes': os.path.getsize(binp), 'st_bytes': os.path.getsize(st), 'save_seconds': res_save,
       'runs': runs, 'loadavg_end': os.getloadavg(), 'machine': platform.machine(), 'python': platform.python_version()}
import torch, safetensors
out['torch'] = torch.__version__; out['safetensors'] = safetensors.__version__
json.dump(out, open(outp, 'w'), indent=1)
