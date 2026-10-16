"""Consumer side: load whatever the alias points at, by name, and score the held-out windows. Prints JSON."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch, torch.nn.functional as F
import mlflow, mlflow.pytorch
mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
d = sys.argv[1]  # folder with train.txt and val.txt of the champion's run
t = time.time(); m = mlflow.pytorch.load_model("models:/mi-tiny-gpt@champion"); secs = time.time() - t
chars = sorted(set(open(d + "/train.txt").read())); stoi = {c: i for i, c in enumerate(chars)}
val = torch.tensor([stoi[c] for c in open(d + "/val.txt").read()])
g = torch.Generator().manual_seed(7); ix = torch.randint(len(val) - 65, (256,), generator=g)
x = torch.stack([val[i:i + 64] for i in ix]); y = torch.stack([val[i + 1:i + 65] for i in ix])
with torch.no_grad():
    out = torch.cat([m(x[i:i + 1]) for i in range(len(x))])  # pt2 export specialised the batch dimension to 1
loss = F.cross_entropy(out.view(-1, len(chars)), y.view(-1)).item()
print(json.dumps({"loaded": type(m).__name__, "load_secs": round(secs, 2), "val_loss": loss}))
