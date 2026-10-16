#!/usr/bin/env python3
"""Storage lab: where the running example's 1,386,049 checkpoint bytes go.

Builds train.py's model and AdamW exactly as train.py does, takes one step (so AdamW has its two moment
buffers), saves the checkpoint the way train.py does (torch.save to "<dir>/step_000050.pt.tmp", a path
string), and lists the zip archive torch.save writes: one entry per tensor storage plus the pickle.
usage: ckpt_anatomy.py --train-py PATH --dir DIR  > anatomy.json
"""
import argparse, importlib.util, json, os, zipfile
import torch

p = argparse.ArgumentParser(); p.add_argument("--train-py", required=True); p.add_argument("--dir", required=True)
a = p.parse_args()
spec = importlib.util.spec_from_file_location("mi_train", a.train_py)
T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
torch.manual_seed(1234)
m = T.GPT(65, 64, 2, 2, 64)
opt = torch.optim.AdamW(m.parameters(), lr=3e-3)
x = torch.randint(65, (8, 64))
torch.nn.functional.cross_entropy(m(x).view(-1, 65), x.view(-1)).backward(); opt.step()
os.makedirs(a.dir, exist_ok=True)
path = os.path.join(a.dir, "step_000050.pt.tmp")
torch.save({"model": m.state_dict(), "opt": opt.state_dict(), "step": 50}, path)
n = sum(p.numel() for p in m.parameters())
z = zipfile.ZipFile(path)
ents = z.infolist()
data = [e for e in ents if "/data/" in e.filename]
pkl = [e for e in ents if e.filename.endswith("data.pkl")]
model_b = sum(t.numel() * t.element_size() for t in m.state_dict().values())
mom_b = sum(v.numel() * v.element_size() for s in opt.state.values() for k, v in s.items() if k in ("exp_avg", "exp_avg_sq"))
step_b = sum(v.numel() * v.element_size() for s in opt.state.values() for k, v in s.items() if k == "step")
total = os.path.getsize(path)
tensor_payload = sum(e.file_size for e in data)
out = {
    "params": n, "file_bytes": total, "zip_entries": len(ents), "tensor_entries": len(data),
    "model_fp32_bytes": model_b, "adamw_moments_bytes": mom_b, "adamw_step_tensors_bytes": step_b,
    "tensor_payload_bytes": tensor_payload, "pickle_bytes": sum(e.file_size for e in pkl),
    "zip_overhead_bytes": total - sum(e.file_size for e in ents),
    "other_entries_bytes": sum(e.file_size for e in ents) - tensor_payload - sum(e.file_size for e in pkl),
    "bytes_per_param": round(total / n, 3),
    "entry_names_sample": [e.filename for e in ents[:4]],
    "torch": torch.__version__,
}
os.remove(path)
print(json.dumps(out, indent=1))
