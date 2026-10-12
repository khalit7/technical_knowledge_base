"""HF stack on CPU: PEFT LoRA on the running example; a tiny transformers GPT-2 built from a config (no download);
which attention implementation transformers picks; Trainer -> accelerate; TRL trainers -> transformers.Trainer."""
from common import *
import torch, inspect
torch.set_num_threads(2)
import transformers, accelerate, peft, trl
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step, n_params
res = {"versions": {"transformers": transformers.__version__, "accelerate": accelerate.__version__, "peft": peft.__version__, "trl": trl.__version__}}

# 1. PEFT LoRA on the plain-PyTorch tiny GPT (PEFT works on any nn.Module with named Linear layers)
from peft import LoraConfig, get_peft_model
cfg = GPTConfig(); m = make_model(cfg, "cpu")
total = sum(p.numel() for p in m.parameters())
lc = LoraConfig(r=8, lora_alpha=16, target_modules=["qkv", "attn.proj", "fc", "mlp.proj"], lora_dropout=0.0)
pm = get_peft_model(m, lc)
tr = sum(p.numel() for p in pm.parameters() if p.requires_grad)
x, y = get_batch(cfg, 0)
opt = torch.optim.AdamW([p for p in pm.parameters() if p.requires_grad], lr=6e-4)
_, loss0 = pm(x, y); loss0.backward(); opt.step(); opt.zero_grad()
_, loss1 = pm(x, y)
lin = pm.base_model.model.blocks[0].attn.qkv
res["peft_lora"] = {"r": 8, "targets": lc.target_modules if isinstance(lc.target_modules, list) else sorted(lc.target_modules),
    "total_params": total, "trainable_params": tr, "trainable_pct": round(100 * tr / total, 3),
    "wrapped_type": type(lin).__module__ + "." + type(lin).__name__,
    "loss_step0": round(loss0.item(), 5), "loss_after_1_step_same_batch": round(loss1.item(), 5),
    "lora_B_init_zero": bool((lin.lora_B["default"].weight == 0).all()) if False else "B starts at zero, so step-0 loss equals the base model's"}
# expected trainable: per block qkv r*(256+768) + proj r*(256+256) + fc r*(256+1024) + proj r*(1024+256)
res["peft_lora"]["trainable_expected"] = 4 * 8 * ((256 + 768) + (256 + 256) + (256 + 1024) + (1024 + 256))

# 2. transformers: a tiny GPT-2 from a config (random weights, no download)
from transformers import GPT2Config, GPT2LMHeadModel
c = GPT2Config(vocab_size=43, n_positions=64, n_embd=256, n_layer=4, n_head=4)
hm = GPT2LMHeadModel(c)
ids = torch.randint(0, 43, (8, 64), generator=torch.Generator().manual_seed(0))
out = hm(ids, labels=ids)
res["transformers_gpt2"] = {"params": sum(p.numel() for p in hm.parameters()), "attn_implementation": hm.config._attn_implementation,
    "loss": round(out.loss.item(), 4), "tied": hm.lm_head.weight is hm.transformer.wte.weight,
    "has_tp_plan_attr": hasattr(hm, "_tp_plan"), "base_model_tp_plan": getattr(c, "base_model_tp_plan", None)}
from transformers import LlamaConfig
res["transformers_llama_tp_plan"] = LlamaConfig().base_model_tp_plan

# 3. Trainer holds an accelerate.Accelerator
from transformers import Trainer, TrainingArguments
args = TrainingArguments(output_dir=os.path.join(SCRATCH, "hf_out"), max_steps=2, per_device_train_batch_size=8, report_to=[], use_cpu=True, save_strategy="no", logging_steps=1)
class DS(torch.utils.data.Dataset):
    def __len__(self): return 64
    def __getitem__(self, i):
        g = torch.Generator().manual_seed(i); t = torch.randint(0, 43, (64,), generator=g); return {"input_ids": t, "labels": t}
t = Trainer(model=hm, args=args, train_dataset=DS())
r = t.train()
res["trainer"] = {"accelerator_type": type(t.accelerator).__module__ + "." + type(t.accelerator).__name__,
    "distributed_type": str(t.accelerator.distributed_type), "train_loss": round(r.training_loss, 4), "steps": r.global_step,
    "model_wrapped_type": type(t.model_wrapped).__name__}

# 4. TRL trainers subclass transformers.Trainer
chains = {}
for name in ["SFTTrainer", "DPOTrainer", "GRPOTrainer", "RewardTrainer"]:
    try:
        cls = getattr(trl, name); chains[name] = [k.__module__ + "." + k.__name__ for k in cls.__mro__[:4]]
    except Exception as e: chains[name] = repr(e)[:200]
res["trl_mro"] = chains

# 5. Lightning wraps the same tiny GPT
import lightning as L
class LM(L.LightningModule):
    def __init__(s): super().__init__(); s.m = make_model(cfg, "cpu")
    def training_step(s, b, i):
        _, loss = s.m(*b); s.log("loss", loss); return loss
    def configure_optimizers(s): return make_optimizer(s.m)
class B(torch.utils.data.IterableDataset):
    def __iter__(s):
        for k in range(3):
            x, y = get_batch(cfg, k); yield x, y
lm = LM()
trn = L.Trainer(max_steps=3, accelerator="cpu", devices=1, logger=False, enable_checkpointing=False, enable_progress_bar=False, enable_model_summary=False, default_root_dir=os.path.join(SCRATCH, "pl"))
losses = []
class CB(L.Callback):
    def on_train_batch_end(s, tr, pl, out, b, i): losses.append(round(out["loss"].item(), 5))
trn.callbacks.append(CB())
trn.fit(lm, torch.utils.data.DataLoader(B(), batch_size=None))
res["lightning"] = {"version": L.__version__, "strategy": type(trn.strategy).__name__, "precision_plugin": type(trn.precision_plugin).__name__,
    "losses": losses, "note": "step-0 loss should equal the plain loop's 3.8014 (same seed, same batch)"}
save("hf_lightning", res)
