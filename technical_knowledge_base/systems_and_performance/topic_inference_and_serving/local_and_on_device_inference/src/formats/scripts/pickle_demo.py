"""Show that a PyTorch checkpoint's pickle is a program, safely.

Usage: python3 -I pickle_demo.py <work dir> <out.json>
1. torch.save a tiny benign state dict; list the zip archive; disassemble data.pkl with pickletools.
2. Build a pickle whose REDUCE calls builtins.print (harmless) and disassemble it (never loaded by us
   with plain pickle in this process); load it with torch.load(weights_only=True) to show the refusal,
   then, in a child process, with pickle.loads to show that loading runs the call.
"""
import sys, os, io, json, zipfile, pickle, pickletools, subprocess, collections
import torch

work, outp = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
res = {'torch': torch.__version__}

# 1. a benign checkpoint: two tiny tensors
torch.manual_seed(0)
sd = {'layer.weight': torch.randn(2, 3).to(torch.bfloat16), 'layer.bias': torch.zeros(2)}
p = os.path.join(work, 'tiny.pt')
torch.save(sd, p)
z = zipfile.ZipFile(p)
res['zip'] = [[i.filename.split('/', 1)[-1], i.file_size, i.compress_type] for i in z.infolist()]
pk = [n for n in z.namelist() if n.endswith('data.pkl')][0]
data = z.read(pk)
buf = io.StringIO(); pickletools.dis(data, out=buf)
res['tiny_pkl_bytes'] = len(data)
res['tiny_dis'] = buf.getvalue()
ops = collections.Counter(op.name for op, arg, pos in pickletools.genops(data))
res['tiny_ops'] = dict(ops)
res['tiny_globals'] = [arg for op, arg, pos in pickletools.genops(data) if op.name in ('GLOBAL', 'STACK_GLOBAL')]
res['tiny_file_bytes'] = os.path.getsize(p)


# 2. a pickle that calls a function when loaded (harmless payload: print)
class Payload:
    def __reduce__(self):
        return (print, ('LOADING THIS FILE RAN print(): it could have been any function',))


evil = pickle.dumps({'layer.weight': Payload()}, protocol=2)
buf = io.StringIO(); pickletools.dis(evil, out=buf)
res['evil_dis'] = buf.getvalue()
res['evil_hex'] = evil.hex()
# put it inside a torch-style zip so torch.load sees a normal-looking checkpoint
ep = os.path.join(work, 'evil.pt')
with zipfile.ZipFile(ep, 'w') as ez:
    ez.writestr('evil/data.pkl', evil)
    ez.writestr('evil/version', '3\n')
try:
    torch.load(ep, weights_only=True)
    res['weights_only'] = 'loaded (unexpected)'
except Exception as e:
    res['weights_only'] = type(e).__name__ + ': ' + str(e).split('\n')[0][:300]
    res['weights_only_full'] = str(e)[:1500]
# child process: plain pickle.loads executes the REDUCE
code = 'import pickle,sys;pickle.loads(bytes.fromhex(sys.argv[1]));print("(returned normally)")'
r = subprocess.run([sys.executable, '-I', '-c', code, evil.hex()], capture_output=True, text=True)
res['pickle_loads_stdout'] = r.stdout
json.dump(res, open(outp, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if 'dis' not in k and k != 'evil_hex'}, indent=1))
print(res['tiny_dis'][:1500]); print(res['evil_dis'])
