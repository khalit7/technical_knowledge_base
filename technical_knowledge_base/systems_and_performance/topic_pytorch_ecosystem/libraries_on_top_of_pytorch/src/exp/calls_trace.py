"""What calls what: the running example trained for 3 steps through each library, with every call from library
code (or from this script) into PyTorch recorded by apitrace.Tracer. Deterministic, CPU, no timing.

One process:   python calls_trace.py single            -> inputs/calls_single.json (plain, hf, accelerate, lightning)
Two processes: torchrun --nproc_per_node 2 --master_addr 127.0.0.1 --master_port 2956x calls_trace.py <mode>
               mode in acc_ddp, pl_ddp, pl_fsdp2, hf_ddp, ds_z0, ds_z1, ds_z2, ds_z3, ds_z3_noclip  -> inputs/calls_<mode>.json
Each rank r trains on batch 2k + r at step k (as the root's Distributed lab does), so rank 0's losses can be
compared with its recorded DDP losses 3.80137, 3.09551, 3.16247."""
from common import *
import json, sys
torch.set_num_threads(1)
from model import GPTConfig, GPT, make_model, get_batch, make_optimizer
from apitrace import Tracer

cfg = GPTConfig()
STEPS = 3
ME = os.path.abspath(__file__)
mode = sys.argv[1] if len(sys.argv) > 1 else "single"


def new_model(cls=GPT):
    torch.manual_seed(cfg.seed); m = cls(cfg); m.load_state_dict(make_model(cfg, "cpu").state_dict()); return m


def watch(m, tr):
    def pre(mod, args):
        tr.phase = "loop"
    return m.register_forward_pre_hook(pre)


class DictGPT(GPT):
    def forward(self, input_ids, labels=None):
        logits, loss = super().forward(input_ids, labels)
        return {"loss": loss, "logits": logits}


def summarize(tr, losses, extra=None):
    d = {"losses": [round(x, 5) for x in losses], "edges": tr.result()}
    if extra:
        d.update(extra)
    return d


out = {}
rank = int(os.environ.get("RANK", 0)); world = int(os.environ.get("WORLD_SIZE", 1))

if mode == "single":
    batches = [get_batch(cfg, k) for k in range(STEPS)]
    # plain loop: what you call yourself
    m = new_model(); tr = Tracer([os.path.basename(ME)]); losses = []
    with tr:
        o = make_optimizer(m); watch(m, tr)
        for x, y in batches:
            _, l = m(x, y); l.backward(); o.step(); o.zero_grad(set_to_none=True); losses.append(l.item())
    out["plain"] = summarize(tr, losses)

    # HF Trainer with its defaults except the three settings that make it the plain loop's step
    from transformers import Trainer, TrainingArguments
    rows = [{"input_ids": x[i], "labels": y[i]} for x, y in batches for i in range(x.shape[0])]
    class DS(torch.utils.data.Dataset):
        def __len__(s): return len(rows)
        def __getitem__(s, i): return rows[i]
    m = new_model(DictGPT); tr = Tracer([os.path.basename(ME)]); losses = []
    m.register_forward_hook(lambda mod, a, o: losses.append(o["loss"].item()) if torch.is_grad_enabled() else None)
    with tr:
        o = make_optimizer(m); watch(m, tr)
        args = TrainingArguments(output_dir=os.path.join(SCRATCH, "tr_hf"), max_steps=STEPS, per_device_train_batch_size=8, report_to=[],
                                 use_cpu=True, save_strategy="no", disable_tqdm=True, train_sampling_strategy="sequential", max_grad_norm=0.0)
        t = Trainer(model=m, args=args, train_dataset=DS(), optimizers=(o, torch.optim.lr_scheduler.LambdaLR(o, lambda s: 1.0)))
        t.train()
    out["hf"] = summarize(tr, losses)
    # HF Trainer, all defaults (clip 1.0, its own fused AdamW, linear schedule, random sampler)
    m = new_model(DictGPT); tr = Tracer([os.path.basename(ME)]); losses = []
    m.register_forward_hook(lambda mod, a, o: losses.append(o["loss"].item()) if torch.is_grad_enabled() else None)
    with tr:
        watch(m, tr)
        args = TrainingArguments(output_dir=os.path.join(SCRATCH, "tr_hf2"), max_steps=STEPS, per_device_train_batch_size=8, report_to=[],
                                 use_cpu=True, save_strategy="no", disable_tqdm=True)
        Trainer(model=m, args=args, train_dataset=DS()).train()
    out["hf_defaults"] = summarize(tr, losses)

    # Accelerate
    from accelerate import Accelerator
    m = new_model(); tr = Tracer([os.path.basename(ME)]); losses = []
    with tr:
        acc = Accelerator(cpu=True); o = make_optimizer(m); pm, po = acc.prepare(m, o); watch(m, tr)
        for x, y in batches:
            _, l = pm(x, y); acc.backward(l); po.step(); po.zero_grad(set_to_none=True); losses.append(l.item())
    out["accelerate"] = summarize(tr, losses)

    # Lightning
    import lightning as L
    losses = []; tr = Tracer([os.path.basename(ME)])
    class LM(L.LightningModule):
        def __init__(s): super().__init__(); s.m = new_model()
        def training_step(s, b, i):
            _, l = s.m(*b); losses.append(l.item()); return l
        def configure_optimizers(s): return make_optimizer(s.m)
    class IDS(torch.utils.data.IterableDataset):
        def __iter__(s): yield from batches
    with tr:
        lm = LM(); watch(lm.m, tr)
        L.Trainer(max_steps=STEPS, accelerator="cpu", devices=1, logger=False, enable_checkpointing=False, enable_progress_bar=False,
                  enable_model_summary=False, default_root_dir=os.path.join(SCRATCH, "tr_pl")).fit(lm, torch.utils.data.DataLoader(IDS(), batch_size=None))
    out["lightning"] = summarize(tr, losses)
    save("calls_single", out)
    sys.exit(0)

# ---------------- two processes (torchrun, gloo) ----------------
batches = [get_batch(cfg, 2 * k + rank) for k in range(STEPS)]
tr = Tracer([os.path.basename(ME)]); losses = []; extra = {}

if mode == "acc_ddp":
    from accelerate import Accelerator
    m = new_model()
    with tr:
        acc = Accelerator(cpu=True); o = make_optimizer(m); pm, po = acc.prepare(m, o); watch(m, tr)
        for x, y in batches:
            _, l = pm(x, y); acc.backward(l); po.step(); po.zero_grad(set_to_none=True); losses.append(l.item())
    extra["wrapped"] = type(pm).__module__ + "." + type(pm).__name__

elif mode in ("pl_ddp", "pl_fsdp2"):
    import lightning as L
    from lightning.pytorch.strategies import ModelParallelStrategy
    class LM(L.LightningModule):
        def __init__(s): super().__init__(); s.m = new_model()
        def configure_model(s):
            if mode == "pl_fsdp2":
                from torch.distributed.fsdp import fully_shard
                mesh = s.device_mesh["data_parallel"]
                for b in s.m.blocks:
                    fully_shard(b, mesh=mesh)
                fully_shard(s.m, mesh=mesh)
        def training_step(s, b, i):
            _, l = s.m(*b); losses.append(l.item()); return l
        def configure_optimizers(s): return make_optimizer(s.m)
    class IDS(torch.utils.data.IterableDataset):
        def __iter__(s): yield from batches
    strat = ModelParallelStrategy(data_parallel_size=2, tensor_parallel_size=1) if mode == "pl_fsdp2" else "ddp"
    with tr:
        lm = LM(); watch(lm.m, tr)
        t = L.Trainer(max_steps=STEPS, accelerator="cpu", devices=2, strategy=strat, logger=False, enable_checkpointing=False,
                      enable_progress_bar=False, enable_model_summary=False, use_distributed_sampler=False,
                      default_root_dir=os.path.join(SCRATCH, "tr_" + mode))
        t.fit(lm, torch.utils.data.DataLoader(IDS(), batch_size=None))
    extra["strategy"] = type(t.strategy).__name__
    extra["param_types"] = sorted({type(p).__name__ for p in lm.m.parameters()})

elif mode == "hf_ddp":
    from transformers import Trainer, TrainingArguments
    # each rank must see its own batch 2k + rank: the Trainer shards one dataset across ranks, so interleave rows
    allb = [get_batch(cfg, j) for j in range(2 * STEPS)]
    rows = [{"input_ids": x[i], "labels": y[i]} for x, y in allb for i in range(x.shape[0])]
    class DS(torch.utils.data.Dataset):
        def __len__(s): return len(rows)
        def __getitem__(s, i): return rows[i]
    m = new_model(DictGPT)
    m.register_forward_hook(lambda mod, a, o: losses.append(o["loss"].item()) if torch.is_grad_enabled() else None)
    with tr:
        o = make_optimizer(m); watch(m, tr)
        args = TrainingArguments(output_dir=os.path.join(SCRATCH, "tr_hfddp"), max_steps=STEPS, per_device_train_batch_size=8, report_to=[],
                                 use_cpu=True, save_strategy="no", disable_tqdm=True, train_sampling_strategy="sequential", max_grad_norm=0.0,
                                 ddp_backend="gloo")
        t = Trainer(model=m, args=args, train_dataset=DS(), optimizers=(o, torch.optim.lr_scheduler.LambdaLR(o, lambda s: 1.0)))
        t.train()
    extra["wrapped"] = type(t.model_wrapped).__module__ + "." + type(t.model_wrapped).__name__
    extra["note"] = "the Trainer's distributed sampler deals rows round-robin, so rank batches differ from 2k + rank"

elif mode.startswith("ds_"):
    import deepspeed
    stage = int(mode[4]); noclip = mode.endswith("noclip")
    conf = {"train_micro_batch_size_per_gpu": cfg.batch_size, "gradient_accumulation_steps": 1,
            "zero_optimization": {"stage": stage}, "steps_per_print": 1000}
    if noclip:
        conf["gradient_clipping"] = 0.0
    m = new_model()
    with tr:
        deepspeed.init_distributed(dist_backend="gloo")
        o = make_optimizer(m)
        eng, opt, _, _ = deepspeed.initialize(model=m, optimizer=o, config=conf)
        watch(m, tr)
        for x, y in batches:
            _, l = eng(x, y); eng.backward(l); eng.step(); losses.append(l.item())
    extra["engine"] = type(eng).__name__
    extra["optimizer_wrapper"] = type(opt).__name__
    extra["gradient_clipping"] = eng.gradient_clipping()
    # bytes of optimizer state and of parameters each rank holds
    inner = getattr(opt, "optimizer", opt)
    st = sum(t.numel() * t.element_size() for s in inner.state.values() for t in s.values() if torch.is_tensor(t) and t.dim() > 0)
    extra["optimizer_state_bytes_rank"] = st
    if stage == 3:
        held = sum(p.ds_tensor.numel() * p.ds_tensor.element_size() for p in m.parameters())
        persist = [n for n, p in m.named_parameters() if getattr(p, "ds_persist", False)]
        extra["param_bytes_held_rank"] = held
        extra["persistent_params"] = len(persist)
        extra["partitioned_params"] = sum(1 for _ in m.parameters()) - len(persist)

out = summarize(tr, losses, extra)
out["world"] = world
if rank == 0:
    save("calls_" + mode, out)
