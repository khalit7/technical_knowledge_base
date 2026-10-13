"""Defaults lab: the running example trained for N steps through a plain loop, the Hugging Face Trainer,
Lightning and Accelerate, first with every setting matched to the plain loop, then with one library default
switched back on at a time, then with all of the Trainer's defaults.

Deterministic (CPU, 2 threads, seeded model and batches): no timing, no bench lock.
Records per step: the training loss of that step's batch, the pre-clip gradient norm, the learning rate;
every 10 steps: the loss on 4 fixed probe batches (the same for every variant).

Run: python defaults_lab.py   (shared venv; LIB_SCRATCH = a scratch folder for Trainer output)"""
from common import *
import math
torch.set_num_threads(2)
from model import GPTConfig, GPT, make_model, get_batch, make_optimizer

N = int(os.environ.get("LIB_STEPS", 150))
cfg = GPTConfig()
PROBE = [get_batch(cfg, 10_000 + i) for i in range(4)]
BATCHES = [get_batch(cfg, k) for k in range(N)]
ROWS = [{"input_ids": x[i], "labels": y[i]} for x, y in BATCHES for i in range(x.shape[0])]


def probe(m):
    with torch.no_grad():
        return round(sum(GPT.forward(m, x, y)[1].item() for x, y in PROBE) / len(PROBE), 5)


def grad_norm(m):
    return torch.linalg.vector_norm(torch.stack([p.grad.detach().norm() for p in m.parameters() if p.grad is not None])).item()


class Rec:
    """Per-variant record, filled by hooks so every library is measured the same way."""
    def __init__(s, m, opt):
        s.m, s.opt, s.loss, s.gn, s.lr, s.probe, s.calls = m, opt, [], [], [], [], 0
        opt.register_step_pre_hook(lambda o, a, k: s._pre())
        opt.register_step_post_hook(lambda o, a, k: s._post())

    def _pre(s):
        if getattr(s, "manual", False): return   # Lightning: the closure (forward, backward) runs inside step()
        s.gn.append(round(s._gn_now, 5) if hasattr(s, "_gn_now") else round(grad_norm(s.m), 5))
        s.lr.append(s.opt.param_groups[0]["lr"])

    def _post(s):
        s.calls += 1
        if s.calls % 10 == 0 or s.calls == 1:
            s.probe.append([s.calls, probe(s.m)])

    def out(s):
        return {"loss": s.loss, "grad_norm_seen_by_step": s.gn, "lr": s.lr, "probe": s.probe}


class DictGPT(GPT):
    """The same model; forward(input_ids, labels) returns a dict (what the HF Trainer expects) and records the loss."""
    rec = None

    def forward(self, input_ids, labels=None):
        logits, loss = super().forward(input_ids, labels)
        if torch.is_grad_enabled() and DictGPT.rec is not None:
            DictGPT.rec.loss.append(round(loss.item(), 5))
        return {"loss": loss, "logits": logits}


def new_model(cls=GPT):
    torch.manual_seed(cfg.seed)
    m = cls(cfg)
    ref = make_model(cfg, "cpu")
    m.load_state_dict(ref.state_dict())
    return m


res = {"steps": N, "batch": [cfg.batch_size, cfg.block_size], "probe_batches": "get_batch(cfg, 10000..10003)"}

# ---- 1. plain loop (the reference) -------------------------------------------------------------
m = new_model(); opt = make_optimizer(m); r = Rec(m, opt)
pre_clip = []
for x, y in BATCHES:
    _, loss = m(x, y); r.loss.append(round(loss.item(), 5)); loss.backward()
    opt.step(); opt.zero_grad(set_to_none=True)
res["plain"] = r.out()

# ---- 2. HF Trainer ------------------------------------------------------------------------------
from transformers import Trainer, TrainingArguments


class RowDS(torch.utils.data.Dataset):
    def __len__(s): return len(ROWS)
    def __getitem__(s, i): return ROWS[i]


def hf(name, own_opt=True, sched="constant", **targs):
    m = new_model(DictGPT)
    o = make_optimizer(m) if own_opt else None
    sch = torch.optim.lr_scheduler.LambdaLR(o, lambda s: 1.0) if (own_opt and sched == "constant") else None
    base = dict(output_dir=os.path.join(SCRATCH, "hf_" + name), max_steps=N, per_device_train_batch_size=8, report_to=[],
                use_cpu=True, save_strategy="no", logging_steps=10, dataloader_drop_last=True, disable_tqdm=True)
    base.update(targs)
    args = TrainingArguments(**base)
    t = Trainer(model=m, args=args, train_dataset=RowDS(), optimizers=(o, sch))
    if o is None:
        t.create_optimizer_and_scheduler(num_training_steps=N)
        if sched == "constant":
            t.lr_scheduler = torch.optim.lr_scheduler.LambdaLR(t.optimizer, lambda s: 1.0)
    r = Rec(m, t.optimizer); DictGPT.rec = r
    # pre-clip norm: the Trainer clips inside its loop, so read the norm before clipping via a hook on clip
    orig = t._clip_grad_norm
    def clip_and_record(model):
        r._gn_now = grad_norm(m)
        return orig(model)
    t._clip_grad_norm = clip_and_record
    t.train()
    DictGPT.rec = None
    o = t.optimizer
    d = r.out()
    d["optimizer"] = {"class": type(o).__name__, "lr": o.defaults["lr"], "betas": list(o.defaults["betas"]),
                      "fused": o.defaults.get("fused"), "foreach": o.defaults.get("foreach"),
                      "groups_weight_decay": [g["weight_decay"] for g in o.param_groups],
                      "groups_sizes": [len(g["params"]) for g in o.param_groups]}
    d["sampler"] = type(t._get_train_sampler()).__name__
    d["scheduler"] = type(t.lr_scheduler).__name__
    d["max_grad_norm"] = t.args.max_grad_norm
    res["hf_" + name] = d
    print(name, d["loss"][:3], d["loss"][-1], d["probe"][-1])


SEQ = dict(train_sampling_strategy="sequential", max_grad_norm=0.0)
hf("matched", **SEQ)                                                   # every setting = the plain loop
hf("clip", train_sampling_strategy="sequential")                       # + clipping at max_grad_norm=1.0 (default)
hf("sched", sched="trainer", lr_scheduler_type="linear", **SEQ)       # + linear decay to 0 over N steps (default)
hf("shuffle", max_grad_norm=0.0)                                       # + RandomSampler (default), seed 42
hf("optim", own_opt=False, **SEQ)                                      # + the Trainer's optimizer: lr 5e-5, betas 0.999, wd 0, fused
hf("all", own_opt=False, sched="trainer")                              # every default at once
hf("all_lr", own_opt=False, sched="trainer", learning_rate=6e-4)       # every default, but our learning rate

# ---- 3. Lightning ---------------------------------------------------------------------------------
import lightning as L


def pl(name, **kw):
    holder = {}
    class LM(L.LightningModule):
        def __init__(s):
            super().__init__(); s.m = new_model()
        def training_step(s, b, i):
            _, loss = s.m(*b); holder["r"].loss.append(round(loss.item(), 5)); return loss
        def configure_optimizers(s):
            o = make_optimizer(s.m); holder["r"] = Rec(s.m, o); holder["r"].manual = True; return o
        def on_before_optimizer_step(s, o):
            r = holder["r"]; r.manual = True   # before Lightning clips
            r.gn.append(round(grad_norm(s.m), 5)); r.lr.append(o.param_groups[0]["lr"])
    class DS(torch.utils.data.IterableDataset):
        def __iter__(s): yield from BATCHES
    tr = L.Trainer(max_steps=N, accelerator="cpu", devices=1, logger=False, enable_checkpointing=False, enable_progress_bar=False,
                   enable_model_summary=False, default_root_dir=os.path.join(SCRATCH, "pl_" + name), **kw)
    tr.fit(LM(), torch.utils.data.DataLoader(DS(), batch_size=None))
    d = holder["r"].out(); d["trainer_settings"] = {"gradient_clip_val": tr.gradient_clip_val, "precision": str(tr.precision), "accumulate_grad_batches": tr.accumulate_grad_batches}
    res["pl_" + name] = d
    print(name, d["loss"][:3], d["loss"][-1], d["probe"][-1])


pl("default")
pl("clip", gradient_clip_val=1.0)

# ---- 4. Accelerate --------------------------------------------------------------------------------
from accelerate import Accelerator
acc = Accelerator(cpu=True)
m = new_model(); o = make_optimizer(m)
pm, po = acc.prepare(m, o); r = Rec(m, po.optimizer)
for x, y in BATCHES:
    _, loss = pm(x, y); r.loss.append(round(loss.item(), 5)); acc.backward(loss); po.step(); po.zero_grad(set_to_none=True)
res["acc_default"] = r.out()

# ---- summary: max abs difference of the loss curve against the plain loop ----------------------
ref = res["plain"]["loss"]
res["diff_vs_plain"] = {k: max(abs(a - b) for a, b in zip(v["loss"], ref)) for k, v in res.items()
                        if isinstance(v, dict) and "loss" in v and len(v["loss"]) == len(ref)}
res["clip_active_steps_plain"] = sum(1 for g in res["plain"]["grad_norm_seen_by_step"] if g > 1.0)
print(res["diff_vs_plain"], res["clip_active_steps_plain"])
save("defaults_lab", res)
