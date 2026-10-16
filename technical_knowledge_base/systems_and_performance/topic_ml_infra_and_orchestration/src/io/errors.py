#!/usr/bin/env python3
"""Storage lab: what a checkpoint that will not restore looks like (real error messages), one process.

1. truncated : a torch.save file cut off part-way (what a crash mid-write leaves without write-then-rename)
2. missing   : a DCP checkpoint with one rank's shard file gone (a rank whose write failed, or a partial copy)
3. one_rank  : the complete DCP checkpoint written by 4 ranks, loaded by ONE process into a plain model (no
               process group): DCP reshards on load; compared tensor by tensor with the full state
4. shape     : the consolidated file loaded into a model built with a different width
usage: errors.py --train-py PATH --src DCP_DIR (written by dist_ckpt.py --mode make_src) --work DIR > errors.json
"""
import argparse, importlib.util, json, os, shutil, traceback
import torch
import torch.distributed.checkpoint as dcp

ap = argparse.ArgumentParser(); ap.add_argument("--train-py", required=True); ap.add_argument("--src", required=True); ap.add_argument("--work", required=True)
a = ap.parse_args()
spec = importlib.util.spec_from_file_location("mi_train", a.train_py)
T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
os.makedirs(a.work, exist_ok=True)
out = {}


def last_line(e):
    msg = f"{type(e).__name__}: {e}"
    return msg.strip().splitlines()[0][:400] if len(msg) > 400 else msg.strip()


# 1. truncated torch.save file
full = os.path.join(a.src + "_full", "full.pt")
size = os.path.getsize(full)
cut = os.path.join(a.work, "step_000050.pt")
with open(full, "rb") as f, open(cut, "wb") as g: g.write(f.read(size // 2))
try:
    torch.load(cut, map_location="cpu", weights_only=True); out["truncated"] = {"error": None}
except BaseException as e:  # DCP's CheckpointException derives from BaseException
    out["truncated"] = {"bytes_written": size // 2, "of": size, "error": last_line(e)}

# 2. one shard missing
bad = os.path.join(a.work, "dcp_missing")
shutil.rmtree(bad, ignore_errors=True); shutil.copytree(a.src, bad)
files = sorted(os.listdir(bad)); os.remove(os.path.join(bad, "__1_0.distcp"))
torch.manual_seed(0)
m = T.GPT(65, 512, 8, 8, 64)
sd = {"model": m.state_dict()}
try:
    dcp.load(sd, checkpoint_id=bad); out["missing"] = {"error": None}
except BaseException as e:  # DCP's CheckpointException derives from BaseException
    inner = [l for l in str(e).splitlines() if l.strip()][-1].replace(bad + os.sep, "<ckpt>/")  # the rank's own error, path shortened
    out["missing"] = {"files_before": files, "removed": "__1_0.distcp", "error": last_line(e), "inner": inner}

# 3. complete checkpoint, one process, no process group
sd = {"model": m.state_dict()}
dcp.load(sd, checkpoint_id=a.src)
ref = torch.load(full, map_location="cpu", weights_only=False)["model"]
out["one_rank"] = {"tensors": len(ref), "identical": all(torch.equal(sd["model"][k], ref[k]) for k in ref),
                   "files": {f: os.path.getsize(os.path.join(a.src, f)) for f in sorted(os.listdir(a.src))}}

# 4. wrong shape
m2 = T.GPT(65, 256, 8, 8, 64)
try:
    m2.load_state_dict(ref); out["shape"] = {"error": None}
except BaseException as e:  # DCP's CheckpointException derives from BaseException
    msg = str(e).strip().splitlines()
    out["shape"] = {"error": type(e).__name__ + ": " + msg[0], "next": msg[1].strip() if len(msg) > 1 else "", "lines": len(msg)}
out["torch"] = torch.__version__
print(json.dumps(out, indent=1))
