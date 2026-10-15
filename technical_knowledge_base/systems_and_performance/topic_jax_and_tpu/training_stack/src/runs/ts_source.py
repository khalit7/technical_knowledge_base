"""Locate every source line the page quotes, by pattern, in the pinned clones ($JX_SCRATCH/src), so the line
numbers on the page are checked rather than typed. Output: out/source.json {key: {repo, path, line, text, url}}."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

C = T.C
REPOS = {
    "flax": ("google/flax", "d1f0d69b49a4f208e0a854039d7914c1c7c431e3"),
    "optax": ("google-deepmind/optax", "107e9ad20ca62bcbee1a8c016daab71c690a678c"),
    "orbax": ("google/orbax", "a2a87a55da9caa8a76770f5e0fa544b0b5aff421"),
    "grain": ("google/grain", "d2568262e43ef1e43a7400e59caba2b2f3e1c35f"),
    "equinox": ("patrick-kidger/equinox", "dfadb04884a0fc067fb85282c994f8e5c106941f"),
    "maxtext": ("AI-Hypercomputer/maxtext", "1a95d1e5371021aab8d0574c53d2cca425474318"),
}
OB = "checkpoint/orbax/checkpoint/"
REFS = {
    # flax
    "flax_graph_mode_flag": ("flax", "flax/configurations.py", "name='nnx_graph_mode'"),
    "flax_graph_updates_flag": ("flax", "flax/configurations.py", "name='nnx_graph_updates'"),
    "flax_eager_shard_flag": ("flax", "flax/configurations.py", "name='flax_always_shard_variable'"),
    "flax_split": ("flax", "flax/nnx/graphlib.py", "^def split(", -1),
    "flax_merge": ("flax", "flax/nnx/graphlib.py", "^def merge(", 0),
    "flax_update": ("flax", "flax/nnx/graphlib.py", "def update("),
    "flax_graphdef": ("flax", "flax/nnx/graphlib.py", "class GraphDef("),
    "flax_tree_mode_msg": ("flax", "flax/nnx/graphlib.py", "def _tree_mode_suggestion_api"),
    "flax_jit": ("flax", "flax/nnx/transforms/compilation.py", "def jit("),
    "flax_grad": ("flax", "flax/nnx/transforms/autodiff.py", "def grad("),
    "flax_scan": ("flax", "flax/nnx/transforms/iteration.py", "def scan("),
    "flax_vmap": ("flax", "flax/nnx/transforms/iteration.py", "def vmap("),
    "flax_split_rngs": ("flax", "flax/nnx/rnglib.py", "def split_rngs("),
    "flax_rngs": ("flax", "flax/nnx/rnglib.py", "class Rngs("),
    "flax_rngstream": ("flax", "flax/nnx/rnglib.py", "class RngStream("),
    "flax_variable": ("flax", "flax/nnx/variablelib.py", "class Variable("),
    "flax_param": ("flax", "flax/nnx/variablelib.py", "class Param("),
    "flax_batchstat": ("flax", "flax/nnx/variablelib.py", "class BatchStat("),
    "flax_optimizer": ("flax", "flax/nnx/training/optimizer.py", "class Optimizer("),
    "flax_optimizer_wrt": ("flax", "flax/nnx/training/optimizer.py", "As of Flax 0.11.0 the `wrt` argument is required"),
    "flax_multimetric": ("flax", "flax/nnx/training/metrics.py", "class MultiMetric("),
    "flax_with_partitioning": ("flax", "flax/nnx/spmd.py", "def with_partitioning("),
    "flax_get_partition_spec": ("flax", "flax/nnx/spmd.py", "def get_partition_spec("),
    "flax_tonnx": ("flax", "flax/nnx/bridge/wrappers.py", "class ToNNX("),
    "flax_flip_tree_goal": ("flax", "docs_nnx/flip/5310-tree-mode-nnx.md", "The goal will be to have the default value"),
    "flax_flip_grad": ("flax", "docs_nnx/flip/5310-tree-mode-nnx.md", "uses argnums=nnx.DiffState(0, nnx.Param)"),
    # optax
    "optax_gt": ("optax", "optax/_src/base.py", "class GradientTransformation("),
    "optax_adamw": ("optax", "optax/_src/alias.py", "def adamw("),
    "optax_lion": ("optax", "optax/_src/alias.py", "def lion("),
    "optax_chain": ("optax", "optax/transforms/_combining.py", "def chain("),
    "optax_partition": ("optax", "optax/transforms/_combining.py", "def partition("),
    "optax_multi_alias": ("optax", "optax/__init__.py", "multi_transform = transforms.partition"),
    "optax_inject": ("optax", "optax/schedules/_inject.py", "def inject_hyperparams("),
    "optax_multisteps": ("optax", "optax/transforms/_accumulation.py", "class MultiSteps:"),
    "optax_if_finite": ("optax", "optax/transforms/_conditionality.py", "def apply_if_finite("),
    "optax_wcd": ("optax", "optax/schedules/_schedule.py", "def warmup_cosine_decay_schedule("),
    "optax_muon": ("optax", "optax/contrib/_muon.py", "def muon("),
    "optax_muon_coeffs": ("optax", "optax/contrib/_muon.py", "_DEFAULT_NS_COEFFS = ("),
    "optax_muon_2d": ("optax", "optax/contrib/_muon.py", "lambda x: 'muon' if x.ndim == 2 else 'adam'"),
    "optax_ns_iter": ("optax", "optax/contrib/_muon.py", "def _base_newton_schulz_iteration("),
    # orbax
    "orbax_deprecated_max_to_keep": ("orbax", OB + "checkpoint_manager.py", "deprecated, do not use. use `preservation_policy` instead."),
    "orbax_async_default": ("orbax", OB + "checkpoint_manager.py", "enable_async_checkpointing: bool = True"),
    "orbax_best_mode_reverse": ("orbax", OB + "checkpoint_manager.py", "reverse=(options.best_mode == 'min')"),
    "orbax_track_best": ("orbax", OB + "checkpoint_manager.py", "metrics is not None and self._track_best"),
    "orbax_bestn": ("orbax", OB + "_src/checkpoint_managers/preservation_policy.py", "class BestN("),
    "orbax_bestn_keep": ("orbax", OB + "_src/checkpoint_managers/preservation_policy.py", "i for i, _ in indexed_checkpoints_with_metrics[-self.n :]"),
    "orbax_preempt_policy": ("orbax", OB + "_src/checkpoint_managers/save_decision_policy.py", "class PreemptionCheckpointingPolicy("),
    "orbax_emergency_cm": ("orbax", OB + "experimental/emergency/checkpoint_manager.py", "class CheckpointManager("),
    "orbax_emergency_local_interval": ("orbax", OB + "experimental/emergency/checkpoint_manager.py", "save_interval_steps: int = 10"),
    "orbax_emergency_persistent_interval": ("orbax", OB + "experimental/emergency/checkpoint_manager.py", "save_interval_steps: int = 1000"),
    "orbax_emergency_warning": ("orbax", OB + "experimental/emergency/checkpoint_manager.py", "WARNING: This class is experimental"),
    "orbax_v1": ("orbax", OB + "experimental/v1/__init__.py", "import orbax.checkpoint.experimental.v1 as ocp"),
    # grain
    "grain_shuffle": ("grain", "grain/_src/python/dataset/dataset.py", "  def shuffle(self, seed: int | None = None) -> MapDataset[T]:"),
    "grain_shuffle_epoch": ("grain", "grain/_src/python/dataset/dataset.py", "In multi-epoch training each epoch will be shuffled differently"),
    "grain_random_map_seed": ("grain", "grain/_src/python/dataset/dataset.py", "The generator is"),
    "grain_repeat": ("grain", "grain/_src/python/dataset/dataset.py", "self, num_epochs: int | None = None, *, reseed_each_epoch: bool = True"),
    "grain_mp_prefetch": ("grain", "grain/_src/python/dataset/dataset.py", "  def mp_prefetch("),
    "grain_mp_warning": ("grain", "grain/_src/python/dataset/dataset.py", "WARNING: If the dataset contains many-to-one transformations", -1),
    "grain_threads": ("grain", "grain/_src/python/options.py", "num_threads: int | AutotuneParameter = 16"),
    # equinox
    "eqx_filter_jit": ("equinox", "equinox/_jit.py", "def filter_jit("),
    # maxtext
    "maxtext_dtype": ("maxtext", "src/MaxText/configs/base.yml", 'dtype: "bfloat16"'),
    "maxtext_weight_dtype": ("maxtext", "src/MaxText/configs/base.yml", 'weight_dtype: "float32"'),
}


def find(repo, path, pat, occ=0):
    full = C.path("src", repo, path)
    with open(full, encoding="utf-8") as f:
        lines = f.read().split("\n")
    if pat.startswith("^"):
        hits = [i + 1 for i, l in enumerate(lines) if l.startswith(pat[1:])]
    else:
        hits = [i + 1 for i, l in enumerate(lines) if pat in l]
    if not hits:
        raise SystemExit(f"pattern not found: {repo}/{path}: {pat}")
    n = hits[occ]
    return n, lines[n - 1].strip(), len(hits)


out = {}
for k, spec in REFS.items():
    repo, path, pat = spec[:3]
    try:
        n, text, nh = find(repo, path, pat, *(spec[3:]))
    except FileNotFoundError:
        print("missing file", repo, path); continue
    gh, sha = REPOS[repo]
    out[k] = {"repo": repo, "path": path, "line": n, "text": text[:160], "hits": nh,
              "url": f"https://github.com/{gh}/blob/{sha}/{path}#L{n}"}
    print(f"{k}: {path}:{n}  {text[:90]}")
T.save("source", out)
