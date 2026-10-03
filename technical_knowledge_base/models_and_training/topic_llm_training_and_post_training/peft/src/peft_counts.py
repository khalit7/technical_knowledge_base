"""Count trainable parameters with the Hugging Face PEFT library itself, on empty (meta-device) models built from
the saved config.json files, so the page's own formulas (recompute.py, and the calculator's JS) can be checked
against the library's count. Writes inputs/peft_counts.json.

Usage: uv run --no-project --with torch --with transformers --with peft --with accelerate python peft_counts.py
"""
import json, warnings
warnings.filterwarnings("ignore")
import torch, transformers, peft
from accelerate import init_empty_weights
from transformers import AutoConfig, AutoModelForCausalLM
from peft import get_peft_model, LoraConfig, IA3Config, PromptTuningConfig, PrefixTuningConfig, VeraConfig

CFG = json.load(open("inputs/configs.json"))
ALL = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
METHODS = {
    "lora_r8_qv": lambda: LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM"),
    "lora_r1_all": lambda: LoraConfig(r=1, lora_alpha=32, target_modules=ALL, task_type="CAUSAL_LM"),
    "lora_r16_all": lambda: LoraConfig(r=16, lora_alpha=32, target_modules=ALL, task_type="CAUSAL_LM"),
    "lora_r32_qkvud": lambda: LoraConfig(r=32, lora_alpha=64, target_modules=["q_proj", "k_proj", "v_proj", "up_proj", "down_proj"], task_type="CAUSAL_LM"),
    "dora_r32_qkvud": lambda: LoraConfig(r=32, lora_alpha=64, use_dora=True, target_modules=["q_proj", "k_proj", "v_proj", "up_proj", "down_proj"], task_type="CAUSAL_LM"),
    "dora_r16_qkvud": lambda: LoraConfig(r=16, lora_alpha=32, use_dora=True, target_modules=["q_proj", "k_proj", "v_proj", "up_proj", "down_proj"], task_type="CAUSAL_LM"),
    "dora_r16_all": lambda: LoraConfig(r=16, lora_alpha=32, use_dora=True, target_modules=ALL, task_type="CAUSAL_LM"),
    "ia3_default": lambda: IA3Config(task_type="CAUSAL_LM"),
    "vera_r256_qv": lambda: VeraConfig(r=256, target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM"),
    "prompt_20": lambda: PromptTuningConfig(num_virtual_tokens=20, task_type="CAUSAL_LM"),
    "prefix_20": lambda: PrefixTuningConfig(num_virtual_tokens=20, task_type="CAUSAL_LM"),
}
out = {"peft": peft.__version__, "transformers": transformers.__version__, "models": {}}
for name, c in CFG.items():
    if name.startswith("_"): continue
    cfg = AutoConfig.from_pretrained(c["_repo"])
    row = {}
    with init_empty_weights():
        base = AutoModelForCausalLM.from_config(cfg)
    row["total"] = sum(p.numel() for p in base.parameters())
    for mk, mf in METHODS.items():
        try:
            with init_empty_weights():
                m = AutoModelForCausalLM.from_config(cfg)
            pm = get_peft_model(m, mf())
            tr, al = pm.get_nb_trainable_parameters()
            row[mk] = tr
        except Exception as e:
            row[mk] = "error: %s" % str(e)[:160]
    out["models"][name] = row
    print(name, row, flush=True)
json.dump(out, open("inputs/peft_counts.json", "w"), indent=1)
