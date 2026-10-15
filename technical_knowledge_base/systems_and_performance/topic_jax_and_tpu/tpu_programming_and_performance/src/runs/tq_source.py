"""File:line of every source line the page quotes, located by pattern in the pinned clones
(jax-v0.11.2, maxtext main 1a95d1e5), so the page's line numbers are checked, not typed."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tq_common as T

Q = {
    "prec_doc": ("jax", "jax/_src/lax/lax.py", r"Has no impact on CPU backends"),
    "prec_high": ("jax", "jax/_src/lax/lax.py", r"performs float32 computations in 3"),
    "prec_highest": ("jax", "jax/_src/lax/lax.py", r"performs float32 computations in 6"),
    "x6": ("jax", "jax/_src/lax/lax.py", r"BF16_BF16_F32_X6 = enum.auto"),
    "megacore": ("jax", "jax/_src/tpu_info.py", r"supports_megacore"),
    "tpu_info": ("jax", "jax/_src/tpu_info.py", r"def _get_tpu_info_impl"),
    "create_mesh": ("jax", "jax/_src/mesh_utils.py", r"^def create_device_mesh\("),
    "nothing_saveable": ("jax", "jax/_src/ad_checkpoint.py", r"^def nothing_saveable"),
    "dots_saveable": ("jax", "jax/_src/ad_checkpoint.py", r"dots_saveable = DotsSaveable\(False\)"),
    "offload_names": ("jax", "jax/_src/ad_checkpoint.py", r"^def save_and_offload_only_these_names"),
    "mt_remat_opts": ("maxtext", "src/maxtext/configs/base.yml", r"^# Choose 'remat_policy' between"),
    "mt_remat_default": ("maxtext", "src/maxtext/configs/base.yml", r"^remat_policy: 'full'"),
    "mt_custom": ("maxtext", "src/maxtext/configs/base.yml", r"^decoder_layer_input: 'device'"),
    "mt_get_remat": ("maxtext", "src/maxtext/layers/nnx_decoders.py", r"def get_remat_policy"),
    "mt_offload": ("maxtext", "src/maxtext/layers/nnx_decoders.py", r'remat_policy == "custom"'),
    "mt_mesh_axes": ("maxtext", "src/maxtext/configs/base.yml", r"^mesh_axes:"),
    "mt_dcn_data": ("maxtext", "src/maxtext/configs/base.yml", r"^dcn_data_parallelism: -1"),
    "mt_ici_fsdp": ("maxtext", "src/maxtext/configs/base.yml", r"^ici_fsdp_parallelism: -1"),
    "mt_dcn_tensor": ("maxtext", "src/maxtext/configs/base.yml", r"^dcn_tensor_parallelism: 1 # never recommended"),
    "mt_num_slices": ("maxtext", "src/maxtext/configs/base.yml", r"^num_slices: -1"),
    "mt_vmem": ("maxtext", "benchmarks/xla_flags_library.py", r"^_DENSE_VMEM_LIMIT = 98304"),
    "mt_vmem_flag": ("maxtext", "benchmarks/xla_flags_library.py", r"^DENSE_VMEM_LIMIT_FLAG"),
    "mt_sc_ar": ("maxtext", "benchmarks/xla_flags_library.py", r"^ENABLE_SPARSECORE_OFFLOADING_FOR_ALL_REDUCE ="),
    "mt_host_offload": ("maxtext", "benchmarks/xla_flags_library.py", r"^HOST_OFFLOAD_FLAGS"),
    "mt_l31_8b": ("maxtext", "benchmarks/maxtext_trillium_model_configs.py", r'model_name="llama3_1-8b-8192",'),
    "mt_tflops": ("maxtext", "src/maxtext/utils/maxtext_utils.py", r"^def calculate_tflops_training_per_device"),
    "mt_causal": ("maxtext", "src/maxtext/utils/maxtext_utils.py", r"causal_attention_flops = noncausal_attention_flops / 2"),
    "mt_quant": ("maxtext", "src/maxtext/configs/base.yml", r'^quantization: ""'),
    "mt_matprec": ("maxtext", "src/maxtext/configs/base.yml", r'^matmul_precision: "default"'),
    "mt_aqt": ("maxtext", "src/maxtext/layers/quantizations.py", r"^from aqt.jax.v2 import config as aqt_config"),
    "mt_l2_70b": ("maxtext", "benchmarks/maxtext_trillium_model_configs.py", r'model_name="llama2-70b-4096",'),
}
out = {}
for k, (repo, rel, pat) in Q.items():
    out[k] = {"file": rel, "line": T.src_line(repo, rel, pat), "repo": repo,
              "text": open(T.src_file(repo, rel)).read().splitlines()[T.src_line(repo, rel, pat) - 1].strip()[:200]}
    print(k, rel, out[k]["line"])
fn = out["mt_tflops"]["line"]
ln = T.src_line_after("maxtext", "src/maxtext/utils/maxtext_utils.py", r"causal_attention_flops = noncausal_attention_flops / 2", fn)
out["mt_causal"].update(line=ln)
print("mt_causal fixed", ln)
T.save("source.json", out)
