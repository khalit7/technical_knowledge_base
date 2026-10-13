"""torchtitan 0.3.0 configs for this Mac's CPU, built from its own llama3_debugmodel config (dim 256, 6 layers,
16 heads, vocabulary 2048, c4_test data from the repository's tests/assets). Changes, all for CPU speed:
sequence 256 (not 2048), local batch 4 on one process or 2 on each of two, 10 steps, no validation."""
from torchtitan.models.llama3.config_registry import llama3_debugmodel
from torchtitan.distributed.activation_checkpoint import FullAC


def _base(local_batch):
    c = llama3_debugmodel()
    c.training.seq_len = 256
    c.training.local_batch_size = local_batch
    c.training.steps = 10
    c.validator.enable = False
    c.debug.seed = 0             # the debug config leaves the seed unset (random initialisation per run)
    return c


def titan_cpu():            # one process: no sharding, activation checkpointing = the debug config's SelectiveAC
    return _base(4)


def titan_cpu_noac():       # the same without activation checkpointing
    c = _base(4); c.activation_checkpoint = None; return c


def titan_cpu_fullac():     # the same with full activation checkpointing
    c = _base(4); c.activation_checkpoint = FullAC.Config(); return c


def titan_cpu_fsdp():       # two processes: FSDP2 over both (data_parallel_shard_degree -1 = all ranks), fp32 params
    c = _base(2); c.training.mixed_precision_param = "float32"; return c


def titan_cpu_fsdp_bf16():  # the same with the default bfloat16 parameters for compute
    c = _base(2); c.training.steps = 3; return c


def titan_cpu_fp32():       # one process with float32 parameters for compute (the default is bfloat16, applied by fully_shard even on one rank)
    c = _base(4); c.training.mixed_precision_param = "float32"; return c
