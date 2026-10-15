"""Locate every source line the page quotes, by pattern, in the pinned clones (jax-v0.11.2, MaxText main 1a95d1e5,
optax v0.2.8) and the XLA files fetched at 91888df6. The page's file:line references come from ../out/source.json.

    JX_SCRATCH=<shared folder> python3 -I -B ss_source.py
"""
import json
import os
import re

S = os.path.join(os.environ["JX_SCRATCH"], "src")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "source.json")

REFS = [
    # key, repo-relative path (under S), regex, how many lines to keep
    ("make_mesh", "jax/jax/_src/sharding_impls.py", r"^def make_mesh\(", 1),
    ("make_mesh_explicit_default", "jax/jax/_src/sharding_impls.py", r"axis_types = \(AxisType\.Explicit,\) \* len", 1),
    ("named_to_gspmd", "jax/jax/_src/named_sharding.py", r"def _to_xla_hlo_sharding\(", 1),
    ("named_to_sdy", "jax/jax/_src/named_sharding.py", r"def _to_sdy_sharding\(", 1),
    ("dup_spec", "jax/jax/_src/named_sharding.py", r"has duplicate entries", 1),
    ("shardy_flag", "jax/jax/_src/config.py", r"name='jax_use_shardy_partitioner'", 3),
    ("cpu_coll_default", "jax/jax/_src/config.py", r'^DEFAULT_CPU_COLLECTIVES_IMPL = "gloo"', 1),
    ("contracting_err", "jax/jax/_src/lax/lax.py", r"'Contracting dimensions are sharded and it is ambiguous how the'", 1),
    ("gather_err", "jax/jax/_src/lax/slicing.py", r"Use `\.at\[\.\.\.\]\.get\(out_sharding=\)` to provide output PartitionSpec", 1),
    ("reshard", "jax/jax/_src/pjit.py", r"^def reshard\(", 1),
    ("auto_axes", "jax/jax/_src/pjit.py", r"^def auto_axes\(", 1),
    ("explicit_axes", "jax/jax/_src/pjit.py", r"^def explicit_axes\(", 1),
    ("wsc", "jax/jax/_src/pjit.py", r"^def with_sharding_constraint\(", 1),
    ("typeof", "jax/jax/_src/core.py", r"^def typeof\(", 1),
    ("shard_map", "jax/jax/_src/shard_map.py", r"^def shard_map\[F: Callable, G: Callable\]\(", 1),
    ("ppermute", "jax/jax/_src/lax/parallel.py", r"^def ppermute\(", 1),
    ("all_to_all", "jax/jax/_src/lax/parallel.py", r"^def all_to_all\(", 1),
    ("ragged_all_to_all", "jax/jax/_src/lax/parallel.py", r"^def ragged_all_to_all\(", 1),
    ("all_gather", "jax/jax/_src/lax/parallel.py", r"^def all_gather\(", 1),
    ("psum_scatter", "jax/jax/_src/lax/parallel.py", r"^def psum_scatter\(", 1),
    ("dist_init", "jax/jax/_src/distributed.py", r"^def initialize\(", 1),
    ("make_array_pl", "jax/jax/_src/array.py", r"^def make_array_from_process_local_data\(", 1),
    ("device_put_check", "jax/jax/_src/dispatch.py", r"multihost_utils\.assert_equal\(", 1),
    ("process_allgather", "jax/jax/experimental/multihost_utils.py", r"^def process_allgather\(", 1),
    ("assert_equal", "jax/jax/experimental/multihost_utils.py", r"^def assert_equal\(", 1),
    ("mt_bubble", "maxtext/src/maxtext/configs/base.yml", r"^# The bubble fraction is", 1),
    ("mt_repeats", "maxtext/src/maxtext/configs/base.yml", r"^num_pipeline_repeats:", 1),
    ("mt_microbatches", "maxtext/src/maxtext/configs/base.yml", r"^num_pipeline_microbatches:", 1),
    ("mt_shard_mode", "maxtext/src/maxtext/configs/base.yml", r'^shard_mode: "auto"', 1),
    ("mt_mesh_axes", "maxtext/src/maxtext/configs/base.yml", r"^mesh_axes:", 1),
    ("mt_rules", "maxtext/src/maxtext/configs/base.yml", r"^logical_axis_rules: \[", 1),
    ("mt_dcn_data", "maxtext/src/maxtext/configs/base.yml", r"^dcn_data_parallelism:", 1),
    ("mt_ici_fsdp", "maxtext/src/maxtext/configs/base.yml", r"^ici_fsdp_parallelism:", 1),
    ("mt_dcn_tensor", "maxtext/src/maxtext/configs/base.yml", r"^dcn_tensor_parallelism:", 1),
    ("mt_cp_strategy", "maxtext/src/maxtext/configs/base.yml", r'^context_parallel_strategy:', 1),
    ("mt_cp_balance", "maxtext/src/maxtext/configs/base.yml", r"^context_parallel_load_balance:", 1),
    ("mt_capacity", "maxtext/src/maxtext/configs/base.yml", r"^capacity_factor:", 1),
    ("mt_pipe_class", "maxtext/src/maxtext/layers/pipeline.py", r"^class PipelineBase\(", 1),
    ("mt_pipe_ids", "maxtext/src/maxtext/layers/pipeline.py", r"def get_microbatch_and_repeat_ids\(", 1),
    ("mt_pipe_rotate", "maxtext/src/maxtext/layers/pipeline.py", r'return jax\.lax\.ppermute\(arr, axis_name="stage", perm=perm\)', 1),
    ("mt_pipe_vmap", "maxtext/src/maxtext/layers/pipeline.py", r"def get_main_vmap_func_for_iterations\(", 1),
    ("mt_moe_ragged", "maxtext/src/maxtext/layers/moe.py", r"x = jax\.lax\.ragged_all_to_all\(", 1),
    ("optax_tree_sum", "optax/optax/tree_utils/_tree_math.py", r"sums = jax\.tree\.map\(jnp\.sum, tree\)", 1),
    ("optax_moment", "optax/optax/tree_utils/_tree_math.py", r"\(1 - decay\) \* \(g\*\*order\) \+ decay \* t", 1),
    ("optax_apply", "optax/optax/_src/update.py", r"None if p is None else jnp\.asarray\(p \+ u\)", 1),
    ("xla_cpu_shardy", "xla_files/cpu_compiler.cc", r"AddPass<sdy::ShardyXLA>", 1),
    ("xla_cpu_gspmd", "xla_files/cpu_compiler.cc", r"AddPass<ShardingPropagation>", 1),
    ("xla_gpu_rs", "xla_files/gpu_compiler.cc", r"ReduceScatterCreator", 1),
    ("xla_gpu_arr", "xla_files/gpu_compiler.cc", r"AllReduceReassociate", 1),
]


def find(path, pat):
    full = os.path.join(S, path)
    files = [full] if os.path.isfile(full) else sorted(
        os.path.join(dp, f) for dp, _, fs in os.walk(full) for f in fs if f.endswith(".py"))
    rx = re.compile(pat)
    for fp in files:
        with open(fp, errors="replace") as fh:
            for i, line in enumerate(fh, 1):
                if rx.search(line):
                    return os.path.relpath(fp, S), i, line.strip()[:200]
    return None


def main():
    res, miss = {}, []
    for key, path, pat, _ in REFS:
        r = find(path, pat)
        if r is None:
            miss.append(key)
            continue
        rel, line, text = r
        rel = rel.replace("xla_files/", "xla/service/cpu/" if "cpu_compiler" in rel else "xla/service/gpu/")
        res[key] = {"file": rel.split("/", 1)[1] if rel.split("/")[0] in ("jax", "maxtext", "optax") else rel, "line": line, "text": text}
    with open(OUT, "w") as f:
        json.dump({"pins": {"jax": "jax-v0.11.2 (32544801, 2026-09-17)", "maxtext": "main 1a95d1e5 (2026-10-15)",
                            "optax": "v0.2.8 (107e9ad2)", "xla": "openxla/xla 91888df6 (pinned by jax-v0.11.2)"},
                   "refs": res, "missing": miss}, f, indent=1)
        f.write("\n")
    for k, v in res.items():
        print(k, v["file"], v["line"])
    print("missing", miss)


if __name__ == "__main__":
    main()
