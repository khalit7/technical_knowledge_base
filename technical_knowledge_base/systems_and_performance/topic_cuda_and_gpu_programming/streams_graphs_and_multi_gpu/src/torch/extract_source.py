"""Facts read from the installed PyTorch (2.14.1) that the page quotes: DDP bucket defaults, the
torch.compile CUDA-graph knobs, the reasons Inductor gives for skipping CUDA graphs, and
make_graphed_callables' warm-up default. Writes out/torch_source.json."""
import inspect, json, os, re, sys
import torch, torch.distributed as dist
import torch.nn.parallel.distributed as D
from torch._inductor import config as ic
import torch._inductor.cudagraph_utils as cu
import torch._inductor.lowering as lw
import torch.cuda.graphs as G

root = os.path.dirname(torch.__file__)
def src(mod):
    return open(mod.__file__).read()

reasons = sorted(set(re.findall(r'format_default_skip_message\(\s*f?"([^"{]+)', src(cu)) + re.findall(r'msg = f?"([^"{]+)', src(cu))))
lower = sorted(set(re.findall(r'msg = "([^"]*CUDA graphs[^"]*|control flow operator[^"]*)"', src(lw))))
sig = inspect.signature(G.make_graphed_callables)
out = dict(
    torch=torch.__version__,
    ddp_default_bucket_cap_mb=D._DEFAULT_BUCKET_CAP_MB,
    ddp_first_bucket_bytes=dist._DEFAULT_FIRST_BUCKET_BYTES,
    ddp_side_stream_env="PYTORCH_DDP_USE_SIDE_STREAM" in src(D),
    inductor=dict(
        cudagraph_trees=ic.triton.cudagraph_trees,
        cudagraph_skip_dynamic_graphs=ic.triton.cudagraph_skip_dynamic_graphs,
        cudagraph_dynamic_shape_warn_limit=ic.triton.cudagraph_dynamic_shape_warn_limit,
        cudagraph_unexpected_rerecord_limit=ic.triton.cudagraph_unexpected_rerecord_limit,
        cudagraph_support_input_mutation=ic.triton.cudagraph_support_input_mutation,
        graph_partition=ic.graph_partition,
    ),
    skip_reasons_cudagraph_utils=reasons,
    skip_reasons_lowering=lower,
    make_graphed_callables_num_warmup_iters=sig.parameters["num_warmup_iters"].default,
    capture_error_modes=["global", "thread_local", "relaxed"] if '"global", "thread_local" or "relaxed"' in src(G) else None,
    compile_modes=re.findall(r'Can be either ("default", "reduce-overhead", "max-autotune" or "max-autotune-no-cudagraphs")',
                             open(os.path.join(root, "__init__.py")).read()),
)
json.dump(out, open(os.path.join(sys.argv[1], "torch_source.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
