"""The same three training steps of the running example entered four ways (plain loop, Lightning, HF Trainer, accelerate),
recording (a) the losses, (b) the Python call stack at the moment GPT.forward starts and at the moment optimizer.step starts.
CPU, 2 threads, no timing. Run: python c_stacks.py   (accelerate with 2 processes: torchrun --nproc_per_node 2 c_stacks.py ddp)"""
from common import *
import sys, re, traceback, torch
torch.set_num_threads(2)
from model import GPTConfig, GPT, make_model, get_batch, make_optimizer, train_step
cfg = GPTConfig()

def frames(skip_tail=1):
    out = []
    for fr in traceback.extract_stack()[:-skip_tail]:
        f = fr.filename.replace("\\", "/")
        m = re.search(r"site-packages/(.*)$", f)
        if m: mod = m.group(1)
        elif "/checks/" in f: mod = "checks/" + f.split("/checks/")[-1]
        elif "/model/" in f: mod = "model/" + f.split("/model/")[-1]
        else: continue
        if mod.startswith(("threading", "runpy")): continue
        out.append({"file": mod, "line": fr.lineno, "fn": fr.name})
    return out

def instrument(model, opt, store):
    def pre(mod, args, kwargs=None):
        if "forward" not in store: store["forward"] = frames(2)
    model.register_forward_pre_hook(pre)
    def opre(o, a, k):
        if "step" not in store: store["step"] = frames(2)
    opt.register_step_pre_hook(opre)

class DictGPT(GPT):
    """Same model; forward(input_ids, labels) returns a dict, the shape HF Trainer expects."""
    def forward(self, input_ids, labels=None):
        logits, loss = super().forward(input_ids, labels)
        return {"loss": loss, "logits": logits}

def batches():
    return [get_batch(cfg, k) for k in range(3)]

res = {}
mode = sys.argv[1] if len(sys.argv) > 1 else "single"
if mode == "single":
    # 1 plain loop
    st = {}; m = make_model(cfg, "cpu"); o = make_optimizer(m); instrument(m, o, st)
    ls = [round(train_step(m, o, x, y).item(), 5) for x, y in batches()]
    res["plain"] = {"losses": ls, **st}
    # 2 Lightning
    import lightning as L
    st = {}
    class LM(L.LightningModule):
        def __init__(s): super().__init__(); s.m = make_model(cfg, "cpu")
        def training_step(s, b, i): _, loss = s.m(*b); return loss
        def configure_optimizers(s):
            o = make_optimizer(s.m); instrument(s.m, o, st); return o
    ls = []
    class CB(L.Callback):
        def on_train_batch_end(s, tr, pl, out, b, i): ls.append(round(out["loss"].item(), 5))
    class DS(torch.utils.data.IterableDataset):
        def __iter__(s): yield from batches()
    tr = L.Trainer(max_steps=3, accelerator="cpu", devices=1, logger=False, enable_checkpointing=False, enable_progress_bar=False,
                   enable_model_summary=False, default_root_dir=os.path.join(SCRATCH, "pl"), callbacks=[CB()])
    tr.fit(LM(), torch.utils.data.DataLoader(DS(), batch_size=None))
    res["lightning"] = {"losses": ls, **st}
    # 3 HF Trainer (same model class, dict output; no grad clipping, sequential order, constant lr: the plain loop's settings)
    from transformers import Trainer, TrainingArguments
    torch.manual_seed(cfg.seed); hm = DictGPT(cfg)
    ref = make_model(cfg, "cpu"); hm.load_state_dict(ref.state_dict())
    rows = []
    for x, y in batches():
        for i in range(x.shape[0]): rows.append({"input_ids": x[i], "labels": y[i]})
    class RowDS(torch.utils.data.Dataset):
        def __len__(s): return len(rows)
        def __getitem__(s, i): return rows[i]
    o = make_optimizer(hm); sch = torch.optim.lr_scheduler.LambdaLR(o, lambda s: 1.0)
    st = {}; instrument(hm, o, st)
    class SeqTrainer(Trainer):
        def _get_train_sampler(self, *a, **k): return torch.utils.data.SequentialSampler(self.train_dataset)
    args = TrainingArguments(output_dir=os.path.join(SCRATCH, "hf"), max_steps=3, per_device_train_batch_size=8, report_to=[], use_cpu=True,
                             save_strategy="no", logging_steps=1, max_grad_norm=0.0, dataloader_drop_last=True)
    t = SeqTrainer(model=hm, args=args, train_dataset=RowDS(), optimizers=(o, sch))
    t.train()
    hl = [round(e["loss"], 5) for e in t.state.log_history if "loss" in e]
    res["hf_trainer"] = {"losses": hl, "loss_note": "Trainer logs the loss rounded as it reports it", **st}
    # 4 accelerate, one process
    from accelerate import Accelerator
    acc = Accelerator(cpu=True); m = make_model(cfg, "cpu"); o = make_optimizer(m)
    pm, po = acc.prepare(m, o); st = {}; instrument(m, po.optimizer, st)
    ls = []
    for x, y in batches():
        _, loss = pm(x, y); acc.backward(loss); po.step(); po.zero_grad(set_to_none=True); ls.append(round(loss.item(), 5))
    res["accelerate_1proc"] = {"losses": ls, "prepared_type": type(pm).__name__, **st}
    save("stacks", res)
else:
    import torch.distributed as dist
    from accelerate import Accelerator
    acc = Accelerator(cpu=True); m = make_model(cfg, "cpu"); o = make_optimizer(m)
    pm, po = acc.prepare(m, o); st = {}; instrument(m, po.optimizer, st)
    ls = []
    for k in range(3):
        x, y = get_batch(cfg, 2 * k + acc.process_index)   # each rank its own batch
        _, loss = pm(x, y); acc.backward(loss); po.step(); po.zero_grad(set_to_none=True); ls.append(round(loss.item(), 5))
    p0 = [p.detach().clone() for p in m.parameters()][:1]
    g = [torch.zeros_like(p0[0]) for _ in range(acc.num_processes)]; dist.all_gather(g, p0[0])
    if acc.process_index == 0:
        save("stacks_ddp", {"accelerate_ddp_2proc": {"losses_rank0": ls, "prepared_type": type(pm).__module__ + "." + type(pm).__name__,
            "weights_identical_across_ranks_after_3_steps": bool(torch.equal(g[0], g[1])), **st}})
