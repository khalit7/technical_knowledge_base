"""Defaults that make a wrapper's step differ from a plain loop unless you set them (read from the installed packages)."""
from common import *
from transformers import TrainingArguments
a = TrainingArguments(output_dir=os.path.join(SCRATCH, "d"), report_to=[])
import lightning as L
t = L.Trainer(accelerator="cpu", logger=False, enable_checkpointing=False, enable_progress_bar=False, enable_model_summary=False, default_root_dir=os.path.join(SCRATCH, "pl"))
save("defaults", {"hf_trainer": {"max_grad_norm": a.max_grad_norm, "learning_rate": a.learning_rate, "lr_scheduler_type": str(a.lr_scheduler_type.value),
    "warmup_steps": a.warmup_steps, "weight_decay": a.weight_decay, "optim": str(a.optim.value), "seed": a.seed, "gradient_accumulation_steps": a.gradient_accumulation_steps},
    "lightning": {"gradient_clip_val": t.gradient_clip_val, "precision": str(t.precision), "accumulate_grad_batches": t.accumulate_grad_batches}})
