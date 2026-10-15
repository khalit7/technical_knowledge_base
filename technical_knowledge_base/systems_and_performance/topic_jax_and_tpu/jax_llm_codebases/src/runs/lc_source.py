"""Locate every source line this page quotes, by pattern, in the pinned clones, so file:line on the page is checked.
Each entry: key -> (repo, path inside the repo, regex). The first match is recorded with its line text.
Fails loudly if a pattern is missing or matches nothing.

Run: python3 -B lc_source.py   (needs JX_SCRATCH)   -> ../out/source.json
"""
import os, re, json, sys
JX = os.environ["JX_SCRATCH"]
REPOS = {"maxtext": (os.path.join(JX, "src", "maxtext"), "1a95d1e5"), "tunix": (os.path.join(JX, "src", "tunix"), "v0.1.7"),
         "levanter": (os.path.join(JX, "src", "marin"), "marin 1290cfb5"), "levanter_frozen": (os.path.join(JX, "src", "levanter"), "982cef7f"),
         "root": (os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data")), "this repo")}
M = "src/maxtext/"
Q = [
 # MaxText config
 ("base_yml_decoder_block", "maxtext", M + "configs/base.yml", r"^decoder_block:"),
 ("base_yml_remat", "maxtext", M + "configs/base.yml", r"^remat_policy:"),
 ("base_yml_remat_choices", "maxtext", M + "configs/base.yml", r"^# Choose 'remat_policy' between"),
 ("base_yml_scan", "maxtext", M + "configs/base.yml", r"^scan_layers:"),
 ("base_yml_param_scan_axis", "maxtext", M + "configs/base.yml", r"^param_scan_axis:"),
 ("base_yml_attention", "maxtext", M + "configs/base.yml", r"^attention: "),
 ("base_yml_shard_mode", "maxtext", M + "configs/base.yml", r"^shard_mode:"),
 ("base_yml_mesh_axes", "maxtext", M + "configs/base.yml", r"^mesh_axes:"),
 ("base_yml_rules", "maxtext", M + "configs/base.yml", r"^logical_axis_rules:"),
 ("base_yml_rule_embed", "maxtext", M + "configs/base.yml", r"\['embed', \['fsdp', 'fsdp_transpose'"),
 ("base_yml_rule_mlp", "maxtext", M + "configs/base.yml", r"\['mlp', \['fsdp_transpose', 'tensor'"),
 ("base_yml_rule_heads", "maxtext", M + "configs/base.yml", r"\['heads', \['tensor'"),
 ("base_yml_rule_vocab", "maxtext", M + "configs/base.yml", r"\['vocab', \['tensor'"),
 ("base_yml_rule_norm", "maxtext", M + "configs/base.yml", r"\['norm', \['tensor'\]\]"),
 ("base_yml_ici_fsdp", "maxtext", M + "configs/base.yml", r"^ici_fsdp_parallelism:"),
 ("base_yml_dcn_data", "maxtext", M + "configs/base.yml", r"^dcn_data_parallelism:"),
 ("base_yml_bubble", "maxtext", M + "configs/base.yml", r"^# The bubble fraction is"),
 ("base_yml_dataset_type", "maxtext", M + "configs/base.yml", r"^dataset_type:"),
 ("base_yml_adamw_mask", "maxtext", M + "configs/base.yml", r"^adamw_mask:"),
 ("base_yml_lr_schedule", "maxtext", M + "configs/base.yml", r"^lr_schedule_type:"),
 ("base_yml_warmup", "maxtext", M + "configs/base.yml", r"^warmup_steps_fraction:"),
 ("base_yml_learning_rate", "maxtext", M + "configs/base.yml", r"^learning_rate:"),
 ("base_yml_async_ckpt", "maxtext", M + "configs/base.yml", r"^async_checkpointing:"),
 ("base_yml_ckpt_period", "maxtext", M + "configs/base.yml", r"^checkpoint_period:"),
 ("base_yml_auto_resume", "maxtext", M + "configs/base.yml", r"If there is already a checkpoint for this run_name, we load the latest"),
 ("base_yml_orbax_v1", "maxtext", M + "configs/base.yml", r"Orbax v1 is now always used"),
 ("base_yml_hardware", "maxtext", M + "configs/base.yml", r"^hardware:"),
 ("base_yml_dtype", "maxtext", M + "configs/base.yml", r"^dtype:"),
 ("base_yml_weight_dtype", "maxtext", M + "configs/base.yml", r"^weight_dtype:"),
 ("base_yml_per_device_batch", "maxtext", M + "configs/base.yml", r"^per_device_batch_size:"),
 ("base_yml_trainable_position_size", "maxtext", M + "configs/base.yml", r"^trainable_position_size:"),
 ("base_yml_log_config", "maxtext", M + "configs/base.yml", r"^log_config:"),
 ("llama2_7b_norm_rule", "maxtext", M + "configs/models/llama2-7b.yml", r"^logical_axis_rules:"),
 ("pyconfig_initialize", "maxtext", M + "configs/pyconfig.py", r"^def _initialize_pydantic"),
 ("pyconfig_twice", "maxtext", M + "configs/pyconfig.py", r"^def validate_no_keys_overridden_twice"),
 ("pyconfig_rules_merge", "maxtext", M + "configs/pyconfig.py", r"# 4\. Manually merge logical_axis_rules"),
 ("pyconfig_merge_rules_fn", "maxtext", M + "configs/pyconfig.py", r"^def _merge_logical_axis_rules"),
 ("pyconfig_env_prefix", "maxtext", M + "configs/pyconfig.py", r'^_MAX_PREFIX = "M_"'),
 ("types_config", "maxtext", M + "configs/types.py", r"^class MaxTextConfig"),
 ("decoder_block_enum", "maxtext", M + "common/common_types.py", r"^class DecoderBlockType"),
 # model
 ("models_transformer", "maxtext", M + "models/models.py", r"^class Transformer\(nnx\.Module\)"),
 ("decoder_layer_map_gpt3", "maxtext", M + "layers/nnx_decoders.py", r"DecoderBlockType\.GPT3: \[gpt3\.Gpt3DecoderLayer\]"),
 ("decoder_pos_embed", "maxtext", M + "layers/nnx_decoders.py", r"if cfg\.trainable_position_size > 0 and self\.position_embedder:"),
 ("decoder_remat_policy", "maxtext", M + "layers/nnx_decoders.py", r"^  def get_remat_policy"),
 ("decoder_minimal_policy", "maxtext", M + "layers/nnx_decoders.py", r"^  def minimal_policy"),
 ("decoder_checkpoint_scan", "maxtext", M + "layers/nnx_decoders.py", r"layer_fn_wrapped = jax\.checkpoint\(layer_fn, policy=policy"),
 ("decoder_seq_split", "maxtext", M + "layers/nnx_decoders.py", r"graphdef, params, state = nnx\.split\(layers, nnx\.Param, \.\.\.\)"),
 ("decoder_scan_axis_move", "maxtext", M + "layers/nnx_decoders.py", r"jnp\.moveaxis\(x, scan_axis, 0\)", "decoder_seq_split"),
 ("gpt3_layernorm", "maxtext", M + "models/gpt3.py", r"^class Gpt3LayerNorm"),
 ("gpt3_scale_plus_one", "maxtext", M + "models/gpt3.py", r"scale \+ 1,"),
 ("gpt3_scale_init", "maxtext", M + "models/gpt3.py", r"scale_init: Initializer = jax\.nn\.initializers\.zeros"),
 ("gpt3_layer", "maxtext", M + "models/gpt3.py", r"^class Gpt3DecoderLayer"),
 ("gpt3_heads_assert", "maxtext", M + "models/gpt3.py", r"self\.config\.num_query_heads == self\.config\.num_kv_heads"),
 ("gpt3_depth_scaling", "maxtext", M + "models/gpt3.py", r"query /= depth_scaling"),
 ("gpt3_checkpoint_name", "maxtext", M + "models/gpt3.py", r'checkpoint_name\(query, "query_proj"\)'),
 ("linears_activation", "maxtext", M + "layers/linears.py", r"return getattr\(jax\.nn, fn_or_string\)"),
 ("attention_op_apply", "maxtext", M + "layers/attention_op.py", r"^  def apply_attention\("),
 ("attention_op_cpu", "maxtext", M + "layers/attention_op.py", r'self\.attention_kernel == "autoselected" and target_hardware == "cpu"'),
 ("attention_op_flash", "maxtext", M + "layers/attention_op.py", r'elif self\.attention_kernel in \("flash", "autoselected"\):'),
 ("attention_splash_import", "maxtext", M + "layers/attention_op.py", r"from jax\.experimental\.pallas\.ops\.tpu\.splash_attention import splash_attention_kernel"),
 # sharding
 ("sharding_logical_to_spec", "maxtext", M + "utils/sharding.py", r"^def logical_to_spec"),
 ("sharding_first_rule", "maxtext", M + "utils/sharding.py", r"Rules are \(logical name, mesh axes\) pairs in priority order"),
 ("create_device_mesh", "maxtext", M + "utils/maxtext_utils.py", r"^def create_device_mesh"),
 ("abstract_model", "maxtext", M + "utils/model_creation_utils.py", r"^def create_nnx_abstract_model"),
 # train step
 ("train_loss_fn", "maxtext", M + "trainers/pre_train/train.py", r"^def loss_fn"),
 ("train_step", "maxtext", M + "trainers/pre_train/train.py", r"^def train_step"),
 ("train_merge", "maxtext", M + "trainers/pre_train/train.py", r"state = nnx\.merge\(model, state\)  # reconstruct TrainStateNNX"),
 ("train_value_and_grad", "maxtext", M + "trainers/pre_train/train.py", r"grad_func = jax\.value_and_grad\(diff_wrapper"),
 ("train_clip", "maxtext", M + "trainers/pre_train/train.py", r"grads = maxtext_utils\.apply_gradient_clipping\(raw_grads"),
 ("train_apply", "maxtext", M + "trainers/pre_train/train.py", r"^    state\.apply_gradients\(grads\)$"),
 ("train_loop", "maxtext", M + "trainers/pre_train/train.py", r"^def train_loop"),
 ("train_setup", "maxtext", M + "utils/train_utils.py", r"^def setup_train_loop"),
 ("train_jit", "maxtext", M + "utils/train_utils.py", r"^def jit_train_step"),
 ("train_donate", "maxtext", M + "utils/maxtext_utils.py", r"donate_argnums = 0"),
 ("lr_schedule", "maxtext", M + "utils/maxtext_utils.py", r"^def create_learning_rate_schedule"),
 ("lr_warmup_from_zero", "maxtext", M + "utils/maxtext_utils.py", r"optax\.linear_schedule\(init_value=0\.0, end_value=lr"),
 ("optimizer_adamw", "maxtext", M + "optimizers/optimizers.py", r"base_opt = optax\.adamw\("),
 ("optimizer_mask", "maxtext", M + "optimizers/optimizers.py", r"^def get_adamw_mask"),
 ("tflops_fn", "maxtext", M + "utils/maxtext_utils.py", r"^def calculate_tflops_training_per_device"),
 ("tflops_causal", "maxtext", M + "utils/maxtext_utils.py", r"causal_attention_flops = noncausal_attention_flops / 2", "tflops_fn"),
 ("tflops_x3_comment", "maxtext", M + "utils/maxtext_utils.py", r"multiply by 3 to account for 1 forward pass \+ 2 backward passes", "tflops_fn"),
 ("synthetic_iter", "maxtext", M + "input_pipeline/synthetic_data_processing.py", r"^class SyntheticDataIterator"),
 ("ckpt_create", "maxtext", M + "common/checkpointing.py", r"^def create_orbax_checkpoint_manager"),
 ("ckpt_v1_import", "maxtext", M + "common/checkpointing.py", r"^from orbax\.checkpoint import v1 as ocp"),
 ("ckpt_v1_checkpointer", "maxtext", M + "common/checkpointing.py", r"manager = ocp\.training\.Checkpointer\("),
 ("tiering_md", "maxtext", "docs/reference/models/tiering.md", r"^\| Llama 3\.1 8B"),
 ("perf_md_causal", "maxtext", "docs/reference/performance_metrics.md", r"^Attention Flops ~= 2 \* sequence"),
 ("decoupled_md", "maxtext", "docs/run_maxtext/decoupled_mode.md", r"Set `DECOUPLE_GCLOUD=TRUE`"),
 ("cpu_test", "maxtext", "tests/unit/compile_cache_test.py", r'"hardware=cpu",'),
 ("readme_nnx", "maxtext", "README.md", r"MaxText has migrated to \[Flax NNX\]"),
 ("readme_tunix", "maxtext", "README.md", r"Post-Training \(SFT, RL\) via \[Tunix\]"),
 ("readme_main_not_prod", "maxtext", "README.md", r"is not expected to be production-ready"),
 ("pyproject_py", "maxtext", "pyproject.toml", r'^requires-python = ">=3\.12"'),
 ("post_train_tunix_pin", "maxtext", "src/dependencies/extra_deps/post_train_github_deps.txt", r"^google-tunix @ https://github\.com/google/tunix/archive/"),
 ("post_train_tpu_inference_pin", "maxtext", "src/dependencies/extra_deps/post_train_github_deps.txt", r"^tpu-inference @"),
 ("sft_imports_tunix", "maxtext", M + "trainers/post_train/sft/train_sft.py", r"^from tunix\.sft import diffusion as tunix_diffusion_sft"),
 ("rl_imports_tunix", "maxtext", M + "trainers/post_train/rl/train_rl.py", r"^from tunix\.rl\.grpo\.grpo_learner import GrpoConfig, GrpoLearner"),
 ("dpo_imports_tunix", "maxtext", M + "trainers/post_train/dpo/train_dpo.py", r"^from tunix\.sft\.dpo\.dpo_trainer import DPOTrainer"),
 # Tunix
 ("tunix_peft_class", "tunix", "tunix/sft/peft_trainer.py", r"^class PeftTrainer"),
 ("tunix_train_step", "tunix", "tunix/sft/peft_trainer.py", r"^  def _train_step\("),
 ("tunix_value_and_grad", "tunix", "tunix/sft/peft_trainer.py", r"grad_fn = nnx\.value_and_grad\("),
 ("tunix_update", "tunix", "tunix/sft/peft_trainer.py", r"optimizer\.update\(model, grads\)"),
 ("tunix_jit", "tunix", "tunix/sft/peft_trainer.py", r'nnx\.jit\(\s*$|train_step, donate_argnames=\("optimizer",\)'),
 ("tunix_lora_wrt", "tunix", "tunix/sft/peft_trainer.py", r"nnx\.Optimizer\(self\.model, optimizer, wrt=nnx\.LoRAParam\)"),
 ("tunix_multisteps", "tunix", "tunix/sft/peft_trainer.py", r"optimizer = optax\.MultiSteps\("),
 ("tunix_default_loss", "tunix", "tunix/sft/peft_trainer.py", r"^def _default_loss_fn"),
 ("tunix_norm_factor", "tunix", "tunix/sft/peft_trainer.py", r"norm_factor = 1 / \(jnp\.sum\(target_mask\) \+ 1e-8\)"),
 ("tunix_dpo", "tunix", "tunix/sft/dpo/dpo_trainer.py", r"^class DPOTrainer"),
 ("tunix_role", "tunix", "tunix/rl/rl_cluster.py", r"^class Role\(enum\.Enum\)"),
 ("tunix_cluster_config", "tunix", "tunix/rl/rl_cluster.py", r"^class ClusterConfig"),
 ("tunix_role_to_mesh", "tunix", "tunix/rl/rl_cluster.py", r"role_to_mesh: Mapping from model role to mesh"),
 ("tunix_rollout_engine", "tunix", "tunix/rl/rl_cluster.py", r'rollout_engine: Rollout engine to use\. E\.g\. "vanilla", "vllm", "sglang_jax"'),
 ("tunix_share_backbone", "tunix", "tunix/rl/rl_cluster.py", r"if self\.r2m\[Role\.ACTOR\] == self\.r2m\[Role\.ROLLOUT\]:"),
 ("tunix_sync_weights", "tunix", "tunix/rl/rl_cluster.py", r"^  def sync_weights"),
 ("tunix_update_actor", "tunix", "tunix/rl/rl_cluster.py", r"^  def update_actor"),
 ("tunix_lora_ref_share", "tunix", "tunix/rl/rl_cluster.py", r"if reference and self\.r2m\[Role\.ACTOR\] == self\.r2m\[Role\.REFERENCE\]:"),
 ("tunix_grpo_config", "tunix", "tunix/rl/grpo/grpo_learner.py", r"^class GRPOConfig"),
 ("tunix_grpo_num_gen", "tunix", "tunix/rl/grpo/grpo_learner.py", r"^  num_generations: int = 2"),
 ("tunix_grpo_beta", "tunix", "tunix/rl/grpo/grpo_learner.py", r"^  beta: float = 0\.04"),
 ("tunix_grpo_eps", "tunix", "tunix/rl/grpo/grpo_learner.py", r"^  epsilon: float = 0\.2"),
 ("tunix_grpo_gen_adv", "tunix", "tunix/rl/grpo/grpo_learner.py", r"^  def _generate_and_compute_advantage\("),
 ("tunix_grpo_generate", "tunix", "tunix/rl/grpo/grpo_learner.py", r"rollout_output = self\.rl_cluster\.generate\("),
 ("tunix_grpo_ref", "tunix", "tunix/rl/grpo/grpo_learner.py", r"ref_per_token_logps = self\.rl_cluster\.get_ref_per_token_logps\("),
 ("tunix_grpo_adv", "tunix", "tunix/rl/grpo/grpo_learner.py", r"advantages = advantage_estimator\("),
 ("tunix_adv_fn", "tunix", "tunix/rl/algo_core.py", r"^def compute_advantages\(rewards: np\.ndarray, num_generations: int\)"),
 ("tunix_adv_std", "tunix", "tunix/rl/algo_core.py", r"return \(rewards - mean_grouped_rewards\) / \(std_grouped_rewards \+ 1e-6\)"),
 ("tunix_ppo", "tunix", "tunix/rl/ppo/ppo_learner.py", r"^class PPOLearner"),
 ("tunix_vllm", "tunix", "tunix/generate/vllm_sampler.py", r"^class VllmSampler"),
 ("tunix_sglang", "tunix", "tunix/generate/sglang_jax_sampler.py", r"^class SglangJaxSampler"),
 ("tunix_distill", "tunix", "tunix/distillation/distillation_trainer.py", r"^class DistillationTrainer"),
 ("tunix_ckpt", "tunix", "tunix/sft/checkpoint_manager.py", r"self\._checkpoint_manager: ocp\.CheckpointManager"),
 ("tunix_readme_v2", "tunix", "README.md", r"\*\*Current Status: V2 Release\*\*"),
 # the root's running example (plain JAX), for the side-by-side in the One train step tab
 ("re_make_train_step", "root", "model_jax.py", r"^def make_train_step"),
 ("re_value_and_grad", "root", "model_jax.py", r"loss, grads = jax\.value_and_grad\(loss_fn\)"),
 ("re_tx_update", "root", "model_jax.py", r"updates, opt_state = tx\.update\(grads, opt_state, params\)"),
 ("re_apply_updates", "root", "model_jax.py", r"params = optax\.apply_updates\(params, updates\)"),
 ("re_jit", "root", "model_jax.py", r"return jax\.jit\(train_step, donate_argnums=\(0, 1\)\)"),
 ("re_loss_fn", "root", "model_jax.py", r"^def loss_fn"),
 ("re_apply", "root", "model_jax.py", r"^def apply\("),
 ("re_block", "root", "model_jax.py", r"^def block\("),
 ("re_attention", "root", "model_jax.py", r"^def attention\("),
 ("re_mlp", "root", "model_jax.py", r"^def mlp\("),
 ("re_layer_norm", "root", "model_jax.py", r"^def layer_norm\("),
 ("re_linear", "root", "model_jax.py", r"^def linear\("),
 ("re_softmax", "root", "model_jax.py", r"jax\.nn\.softmax\(s, axis=-1\)"),
 ("re_make_optimizer", "root", "model_jax.py", r"^def make_optimizer"),
 ("re_clip", "root", "model_jax.py", r"optax\.clip_by_global_norm\(cfg\[\"clip\"\]\)"),
 ("re_gelu", "root", "model_jax.py", r"jax\.nn\.gelu\(linear\(p\[\"fc1\"\], x\), approximate=False\)"),
 ("re_head", "root", "model_jax.py", r"layer_norm\(params\[\"ln_f\"\]"),
 ("re_emb", "root", "model_jax.py", r"params\[\"tok_emb\"\]\[idx\]"),
 # Levanter (Marin monorepo)
 ("lev_readme_merged", "levanter_frozen", "README.md", r"Levanter has been merged into"),
 ("lev_readme_bitwise", "levanter", "lib/levanter/README.md", r"\*\*Reproducible\*\*: Levanter is bitwise deterministic"),
 ("lev_pyproject_jax", "levanter", "lib/levanter/pyproject.toml", r'"jax>=0\.9\.2,<0\.12"'),
 ("lev_mesh_defaults", "levanter", "lib/levanter/src/levanter/utils/mesh.py", r'^DEFAULT_SHARED_MAPPING'),
 ("lev_mesh_ici", "levanter", "lib/levanter/src/levanter/utils/mesh.py", r'^DEFAULT_ICI_AXIS_SPEC'),
 ("lev_param_mapping", "levanter", "lib/levanter/src/levanter/utils/mesh.py", r'param_mapping: Mapping\[str, list\[str\] \| str\] = field\(default_factory=lambda: \{"embed": "data"\}\)'),
 ("lev_gpt2_attn", "levanter", "lib/levanter/src/levanter/models/gpt2.py", r"^class Gpt2Attention"),
 ("lev_gpt2_unbind", "levanter", "lib/levanter/src/levanter/models/gpt2.py", r'q, k, v = qkv_out\.unbind\("qkv"\)'),
 ("lev_gpt2_rename", "levanter", "lib/levanter/src/levanter/models/gpt2.py", r'k = k\.rename\(\{"position": "key_position"\}\)'),
 ("lev_trainer_param_map", "levanter", "lib/levanter/src/levanter/trainer.py", r"hax\.shard\(new_state, self\.parameter_axis_mapping\)"),
 ("lev_permutation", "levanter", "lib/levanter/docs/design/Data-Loader-Design.md", r"PermutationDataset is a dataset that permutes the indices"),
 ("lev_release_bitwise", "levanter", "lib/levanter/docs/Levanter-1.0-Release.md", r"^# Reproducibility: Bitwise Determinism with Levanter and JAX"),
]
out = {"repos": {k: v[1] for k, v in REPOS.items()}, "loc": {}}
bad = []
for ent in Q:
    key, repo, path, pat = ent[:4]
    after = out["loc"][ent[4]]["line"] if len(ent) > 4 else 0
    root = REPOS[repo][0]
    fp = os.path.join(root, path)
    try:
        lines = open(fp, encoding="utf-8").read().split("\n")
    except FileNotFoundError:
        bad.append((key, "missing file " + path)); continue
    rx = re.compile(pat)
    hit = next((i for i, l in enumerate(lines) if i >= after and rx.search(l)), None)
    if hit is None:
        bad.append((key, "no match " + pat)); continue
    out["loc"][key] = {"repo": repo, "file": path, "line": hit + 1, "text": lines[hit].strip()[:160], "n_lines": len(lines)}
if bad:
    print("FAILED:", bad); sys.exit(1)
here = os.path.dirname(os.path.abspath(__file__))
json.dump(out, open(os.path.join(here, "..", "out", "source.json"), "w"), indent=1)
print(len(out["loc"]), "locations")
for k, v in out["loc"].items(): print(f'{k:28s} {v["file"]}:{v["line"]}')
