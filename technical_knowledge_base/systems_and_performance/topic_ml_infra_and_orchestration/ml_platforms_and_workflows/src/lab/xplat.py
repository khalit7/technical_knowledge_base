"""Compare the native (macOS arm64) and container (Linux aarch64, mi-train:1) runs of the same command. Writes ../runs/xplat.json.
Inputs (scratch): work/<run>/logs (native 200 steps, from the flow), xplat/logs (container 200 steps), n1 and l1 (70 steps, logged every step)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
S = os.environ["MP_SCRATCH"]; RUN = sys.argv[1]
st = lambda p: [r for r in C.read_jsonl(p) if r["ev"] == "step"]
a, b = st(f"{S}/work/{RUN}/logs/rank0.jsonl"), st(f"{S}/xplat/logs/rank0.jsonl")
n1, l1 = st(f"{S}/xplat/n1/rank0.jsonl"), st(f"{S}/xplat/l1/rank0.jsonl")
d = f"{S}/work/{RUN}/data"
cv, _, _ = C.evaluate(f"{S}/xplat/ckpt/step_000200.pt", d + "/train.txt", d + "/val.txt")
out = dict(cmd="torchrun --nnodes 1 --nproc-per-node 2 train.py --data train.txt --steps 200 --lr 0.01 --seed 1234",
           native="macOS (Darwin 27) arm64 (M1 Pro), torch 2.14.1 (PyPI macOS wheel), Python 3.12.11",
           container="mi-train:1, Linux aarch64 in the Docker Desktop VM, torch 2.14.1+cpu, Python 3.12.15",
           logged=[[x["step"], x["gloss"], y["gloss"]] for x, y in zip(a, b)],
           every_step=[[x["step"], x["loss"], y["loss"], x["gloss"], y["gloss"]] for x, y in zip(n1, l1)],
           native_ckpt_sha=C.sha256_file(f"{S}/work/{RUN}/ckpt/step_000200.pt")[:12],
           container_ckpt_sha=C.sha256_file(f"{S}/xplat/ckpt/step_000200.pt")[:12],
           container_val_loss=cv)
json.dump(out, open(os.path.join(C.LAB, "..", "runs", "xplat.json"), "w"), indent=0)
print(out["native_ckpt_sha"], out["container_ckpt_sha"], cv)
