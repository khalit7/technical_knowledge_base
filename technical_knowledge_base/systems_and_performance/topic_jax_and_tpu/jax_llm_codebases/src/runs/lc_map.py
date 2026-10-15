"""Codebase map data: the components of MaxText, Tunix and Levanter at their pinned commits, with measured size
(files and lines of Python or YAML), a role written for this page, the PyTorch-world counterpart, where the page or a
sibling teaches it, and the key symbols (file:line from ../out/source.json, located by pattern).
Run: python3 -B lc_map.py (needs JX_SCRATCH; run lc_source.py first) -> ../out/map.json"""
import os, json, glob
JX = os.environ["JX_SCRATCH"]; HERE = os.path.dirname(os.path.abspath(__file__))
SRC = json.load(open(os.path.join(HERE, "..", "out", "source.json")))["loc"]
ROOTS = {"maxtext": os.path.join(JX, "src", "maxtext"), "tunix": os.path.join(JX, "src", "tunix"), "levanter": os.path.join(JX, "src", "marin")}

def size(repo, paths, exts=(".py",)):
    files, lines = 0, 0
    for p in paths:
        full = os.path.join(ROOTS[repo], p)
        cands = [full] if os.path.isfile(full) else [f for f in glob.glob(os.path.join(full, "**", "*"), recursive=True) if os.path.isfile(f)]
        for f in cands:
            if not f.endswith(exts) or "/tests/" in f or f.endswith("_test.py"): continue
            files += 1; lines += sum(1 for _ in open(f, encoding="utf-8", errors="replace"))
    return files, lines

M = "src/maxtext/"; L = "lib/levanter/src/levanter/"
C = [
 # repo, id, name, paths, exts, group, role, pytorch, where (tab id or notion key), symbol keys
 ("maxtext", "mt_cfg", "configs/", [M + "configs"], (".py", ".yml"), "config",
  "One YAML of defaults (base.yml), one YAML per model that overrides it, command-line key=value overrides on top, all validated by a pydantic class with about 900 fields.",
  "Megatron-LM's arguments.py, torchtitan's TOML job config", "lc-s-cfg",
  ["base_yml_decoder_block", "pyconfig_initialize", "pyconfig_twice", "pyconfig_rules_merge", "types_config"]),
 ("maxtext", "mt_models", "models/", [M + "models"], (".py",), "model",
  "One file per model family (llama2, gemma3, deepseek, qwen3, gpt3, ...): each defines its decoder layer class; the decoder picks one by decoder_block.",
  "Hugging Face modeling_*.py files, torchtitan's models/", "lc-s-model",
  ["models_transformer", "decoder_block_enum", "gpt3_layer", "gpt3_layernorm"]),
 ("maxtext", "mt_layers", "layers/", [M + "layers"], (".py",), "model",
  "Shared building blocks: the decoder that embeds, scans the layers and computes logits (nnx_decoders.py), attention and its kernel choice, MLP and dense layers, MoE, pipeline parallelism, quantisation.",
  "Megatron-Core's transformer/ and tensor_parallel/ packages", "lc-s-model",
  ["decoder_layer_map_gpt3", "decoder_remat_policy", "decoder_checkpoint_scan", "attention_op_apply", "attention_op_cpu", "linears_activation"]),
 ("maxtext", "mt_kernels", "kernels/", [M + "kernels"], (".py",), "model",
  "Pallas kernels for TPU (megablox grouped matmul for MoE, ragged ops, splash attention through tokamax). They only run on TPU; on CPU MaxText falls back to plain dot-product attention.",
  "Triton kernels in Megatron or Liger", "pallas",
  ["attention_splash_import"]),
 ("maxtext", "mt_sharding", "utils/sharding.py", [M + "utils/sharding.py"], (".py",), "sharding",
  "Turns each array's logical axis names into a PartitionSpec with logical_axis_rules (first rule whose mesh axes are still free wins), checks parameters are sharded enough, builds data shardings.",
  "Megatron's parallel_state.py plus DTensor placements", "lc-s-shard",
  ["sharding_logical_to_spec", "sharding_first_rule", "base_yml_rules", "base_yml_mesh_axes"]),
 ("maxtext", "mt_utils", "utils/ (rest)", [M + "utils/maxtext_utils.py", M + "utils/train_utils.py", M + "utils/model_creation_utils.py", M + "utils/max_utils.py"], (".py",), "train",
  "Mesh creation from the ici_*/dcn_* degrees, abstract model creation (shapes and shardings, no memory), learning-rate schedules, the TFLOP count behind MFU, jit of the train step with shardings and donation.",
  "torchtitan's parallelisms/ and train utilities", "lc-s-step",
  ["create_device_mesh", "abstract_model", "train_setup", "train_jit", "train_donate", "lr_schedule", "tflops_fn"]),
 ("maxtext", "mt_pretrain", "trainers/pre_train/", [M + "trainers/pre_train"], (".py",), "train",
  "train.py: loss_fn, train_step (value_and_grad, clipping, optimizer update, metrics) and the train loop; train_compile.py compiles a step ahead of time for a named TPU topology.",
  "Megatron's training.py, torchtitan's train.py", "lc-s-step",
  ["train_loss_fn", "train_step", "train_value_and_grad", "train_apply", "train_loop"]),
 ("maxtext", "mt_posttrain", "trainers/post_train/", [M + "trainers/post_train"], (".py",), "post",
  "SFT, DPO, RL (GRPO, GSPO) and distillation entry points. They build MaxText models and hand them to Tunix trainers (imports of tunix.sft and tunix.rl).",
  "TRL or verl driving a Megatron model", "lc-s-tunix",
  ["sft_imports_tunix", "rl_imports_tunix", "dpo_imports_tunix", "post_train_tunix_pin"]),
 ("maxtext", "mt_input", "input_pipeline/", [M + "input_pipeline"], (".py",), "data",
  "Data loaders: grain (ArrayRecord, Parquet), Hugging Face datasets, tfds and synthetic; packing and per-host loading.",
  "torch DataLoader plus Megatron's indexed datasets", "training_stack",
  ["synthetic_iter", "base_yml_dataset_type"]),
 ("maxtext", "mt_ckpt", "common/checkpointing.py", [M + "common/checkpointing.py"], (".py",), "ckpt",
  "Orbax v1 Checkpointer (ocp.training.Checkpointer), async by default, auto-resume from the run's own directory, emergency and multi-tier variants.",
  "torch.distributed.checkpoint (DCP)", "training_stack",
  ["ckpt_create", "ckpt_v1_import", "ckpt_v1_checkpointer", "base_yml_auto_resume"]),
 ("maxtext", "mt_opt", "optimizers/", [M + "optimizers"], (".py",), "train",
  "optax AdamW (mask from adamw_mask), Adam-Pax, SGD and Muon, wrapped for frozen parameters.",
  "torch.optim", "training_stack",
  ["optimizer_adamw", "optimizer_mask"]),
 ("maxtext", "mt_infer", "inference/ + integration/", [M + "inference", M + "integration"], (".py",), "serve",
  "Decoding (decode.py, maxengine for JetStream, an offline engine) and the adapters that let vLLM's TPU backend and Tunix run MaxText models.",
  "vLLM model executors", "lc-s-serve", []),
 ("maxtext", "mt_conv", "checkpoint_conversion/", [M + "checkpoint_conversion"], (".py",), "ckpt",
  "Converters between Hugging Face checkpoints and MaxText's layout (stacked layers, logical names).",
  "Megatron's checkpoint converters", "lc-s-model", []),
 ("maxtext", "mt_exp", "experimental/", [M + "experimental"], (".py",), "other",
  "Research features not yet in the main path (for example lineage, omni pipeline).", "", "", []),
 ("tunix", "tx_sft", "sft/", ["tunix/sft"], (".py",), "post",
  "PeftTrainer: an nnx.jit of value_and_grad plus optimizer.update with the optimizer donated; LoRA when the model carries nnx.LoRAParam; gradient accumulation with optax.MultiSteps; DPO and ORPO in sft/dpo/.",
  "Hugging Face Trainer and TRL's SFTTrainer and DPOTrainer", "lc-s-tunix",
  ["tunix_peft_class", "tunix_train_step", "tunix_value_and_grad", "tunix_update", "tunix_jit", "tunix_lora_wrt", "tunix_multisteps", "tunix_dpo"]),
 ("tunix", "tx_rl", "rl/", ["tunix/rl"], (".py",), "post",
  "RLCluster holds the models by role (actor, critic, reference, reward, rollout), each on its own mesh or sharing one; learners for GRPO (and its variants) and PPO; agentic multi-turn rollout.",
  "verl, OpenRLHF, TRL's GRPOTrainer", "lc-s-tunix",
  ["tunix_role", "tunix_cluster_config", "tunix_role_to_mesh", "tunix_share_backbone", "tunix_grpo_config", "tunix_grpo_gen_adv", "tunix_ppo"]),
 ("tunix", "tx_gen", "generate/", ["tunix/generate"], (".py",), "serve",
  "Samplers for rollout: a built-in JAX sampler, vLLM (TPU backend) and SGLang-JAX.",
  "vLLM inside verl", "lc-s-serve",
  ["tunix_vllm", "tunix_sglang", "tunix_rollout_engine"]),
 ("tunix", "tx_models", "models/", ["tunix/models"], (".py",), "model",
  "Flax NNX implementations of Gemma, Gemma 3 and 4, Llama 3, Qwen 2 and 3, with safetensors loading from Hugging Face.",
  "Hugging Face transformers models", "lc-s-tunix", []),
 ("tunix", "tx_distill", "distillation/", ["tunix/distillation"], (".py",), "post",
  "Knowledge distillation trainer with logit and feature strategies.", "torchtune's distillation recipes", "lc-s-tunix", ["tunix_distill"]),
 ("tunix", "tx_cli", "cli/ + perf/ + utils/", ["tunix/cli", "tunix/perf", "tunix/utils"], (".py",), "other",
  "Command-line entry points with YAML configs, performance tracing, mesh helpers.", "", "", []),
 ("levanter", "lv_models", "models/", [L + "models"], (".py",), "model",
  "Models written with Haliax named axes and Equinox modules: GPT-2, Llama, Mistral, Mixtral, OLMo, Qwen, Gemma and more.",
  "Hugging Face models (but with named dimensions)", "lc-s-lev",
  ["lev_gpt2_attn", "lev_gpt2_unbind", "lev_gpt2_rename"]),
 ("levanter", "lv_trainer", "trainer.py + main/", [L + "trainer.py", L + "main"], (".py",), "train",
  "The Trainer (named_jit of the step, parameter and compute axis mappings) and entry points such as train_lm.py and train_dpo.py.",
  "Composer or Lightning Trainer", "lc-s-lev",
  ["lev_trainer_param_map"]),
 ("levanter", "lv_mesh", "utils/mesh.py + sharding.py", [L + "utils/mesh.py", L + "sharding.py"], (".py",), "sharding",
  "MeshConfig: physical axes (data, replica, model; replica_dcn across slices) and the logical-to-physical mappings, separately for parameters and for compute.",
  "DTensor device meshes", "lc-s-lev",
  ["lev_mesh_ici", "lev_mesh_defaults", "lev_param_mapping"]),
 ("levanter", "lv_data", "data/ + store/", [L + "data", L + "store"], (".py",), "data",
  "Preprocessing caches written once and read with random access, so a resumed run seeks without replaying data; permutation and block shuffling; mixtures.",
  "MosaicML Streaming", "lc-s-lev", ["lev_permutation"]),
 ("levanter", "lv_ckpt", "checkpoint.py + tensorstore_serialization.py", [L + "checkpoint.py", L + "tensorstore_serialization.py"], (".py",), "ckpt",
  "Distributed checkpoints through TensorStore.", "torch.distributed.checkpoint", "training_stack", []),
 ("levanter", "lv_optim", "optim/", [L + "optim"], (".py",), "train",
  "Optimizers beyond AdamW: Muon, SOAP, Kron, Adam-mini, Scion and others.", "torch.optim plus research optimizers", "training_stack", []),
 ("levanter", "lv_grug", "grug/", [L + "grug"], (".py",), "model",
  "Array-first building blocks (attention, loss, sharding helpers) shared by the newer grug model templates.", "", "lc-s-lev", []),
 ("levanter", "lv_rest", "inference/ + eval + kernels/ + compat/", [L + "inference", L + "eval.py", L + "eval_harness.py", L + "kernels", L + "compat"], (".py",), "other",
  "Inference engine, evaluation harness integration, Pallas kernels, Hugging Face checkpoint import and export.", "", "", []),
]
rows = []
for repo, cid, name, paths, exts, group, role, pt, where, syms in C:
    f, l = size(repo, paths, exts)
    for s in syms: assert s in SRC, s
    rows.append({"repo": repo, "id": cid, "name": name, "paths": paths, "files": f, "lines": l, "group": group,
                 "role": role, "pytorch": pt, "where": where,
                 "symbols": [{"key": s, "file": SRC[s]["file"], "line": SRC[s]["line"], "text": SRC[s]["text"]} for s in syms]})
tot = {r: size(r, [M] if r == "maxtext" else (["tunix"] if r == "tunix" else [L]), (".py",)) for r in ROOTS}
out = {"commits": {"maxtext": "main 1a95d1e5 (2026-10-15)", "tunix": "v0.1.7 ce63a9fd (2026-06-09)", "levanter": "marin main 1290cfb5 (2026-10-15), lib/levanter"},
       "totals_py": {k: {"files": v[0], "lines": v[1]} for k, v in tot.items()}, "components": rows}
json.dump(out, open(os.path.join(HERE, "..", "out", "map.json"), "w"), indent=1)
for r in rows: print(f'{r["repo"]:9s} {r["name"]:42s} {r["files"]:4d} {r["lines"]:7d}')
print(out["totals_py"])
