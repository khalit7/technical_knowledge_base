"""Helpers for the ML platforms lab: data split, hashing, evaluation.

Used by flow.py (Metaflow) and reproduce.py. CPU only; 1 thread per process.
"""
import hashlib, json, os, platform, sys

LAB = os.path.dirname(os.path.abspath(__file__))
DATA_SHA = "86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed"  # TinyShakespeare, root src/data/README.md


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def code_sha():
    """One hash over the code that defines a run: flow.py, common.py, train.py."""
    h = hashlib.sha256()
    for name in ("flow.py", "common.py", "train.py"):
        with open(os.path.join(LAB, name), "rb") as f:
            h.update(name.encode() + b"\0" + f.read())
    return h.hexdigest()


def split_text(src, out_dir, frac):
    """First frac of the characters for training, the rest held out. Returns paths and hashes."""
    text = open(src, encoding="utf-8").read()
    n = int(len(text) * frac)
    os.makedirs(out_dir, exist_ok=True)
    tr, va = os.path.join(out_dir, "train.txt"), os.path.join(out_dir, "val.txt")
    open(tr, "w", encoding="utf-8").write(text[:n])
    open(va, "w", encoding="utf-8").write(text[n:])
    return dict(train_path=tr, val_path=va, train_chars=n, val_chars=len(text) - n,
                train_sha=sha256_file(tr), val_sha=sha256_file(va))


def evaluate(ckpt_path, train_path, val_path, n_windows=256, ctx=64, seed=7):
    """Mean cross-entropy of the checkpoint on n_windows fixed windows of the held-out text."""
    import torch
    import torch.nn.functional as F
    sys.path.insert(0, LAB)
    import train as T
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    chars = sorted(set(open(train_path, encoding="utf-8").read()))
    stoi = {c: i for i, c in enumerate(chars)}
    val = torch.tensor([stoi[c] for c in open(val_path, encoding="utf-8").read()], dtype=torch.long)
    st = torch.load(ckpt_path, map_location="cpu")
    model = T.GPT(len(chars), 64, 2, 2, ctx)
    model.load_state_dict(st["model"])
    model.eval()
    g = torch.Generator().manual_seed(seed)
    ix = torch.randint(len(val) - ctx - 1, (n_windows,), generator=g)
    x = torch.stack([val[i:i + ctx] for i in ix])
    y = torch.stack([val[i + 1:i + 1 + ctx] for i in ix])
    with torch.no_grad():
        loss = F.cross_entropy(model(x).view(-1, len(chars)), y.view(-1)).item()
    return loss, model, st["step"]


def env_info():
    import torch
    return dict(python=platform.python_version(), torch=torch.__version__,
                os=platform.system(), machine=platform.machine())


def read_jsonl(path):
    return [json.loads(l) for l in open(path) if l.strip()]
