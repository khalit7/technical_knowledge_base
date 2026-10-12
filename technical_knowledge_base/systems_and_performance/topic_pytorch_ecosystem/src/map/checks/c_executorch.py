"""ExecuTorch 1.5.1 on the running example, CPU: torch.export -> to_edge_transform_and_lower (XNNPACK) -> .pte -> run with the ExecuTorch runtime.
Installed with --no-deps plus flatbuffers, ruamel.yaml, tabulate (the full dependency set pulls coremltools, scikit-learn, pandas)."""
from common import *
import torch
torch.set_num_threads(2)
from model import GPTConfig, make_model, get_batch
res = {}
cfg = GPTConfig(); m = make_model(cfg, "cpu").eval()
x, _ = get_batch(cfg, 0); x = x[:1]
with torch.no_grad(): ref, _ = m(x)
ep = torch.export.export(m, (x,))
res["export"] = {"graph_nodes": len(list(ep.graph.nodes)), "call_function_nodes": sum(1 for n in ep.graph.nodes if n.op == "call_function"),
    "first_ops": sorted({str(n.target) for n in ep.graph.nodes if n.op == "call_function"})[:40]}
try:
    import executorch
    from executorch.exir import to_edge_transform_and_lower
    from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner
    et = to_edge_transform_and_lower(ep, partitioner=[XnnpackPartitioner()]).to_executorch()
    p = os.path.join(SCRATCH, "tiny_gpt_xnnpack.pte"); open(p, "wb").write(et.buffer)
    res["pte_bytes"] = len(et.buffer)
    g = et.exported_program().graph
    res["lowered_delegate_calls"] = sum(1 for n in g.nodes if n.op == "call_function" and "executorch_call_delegate" in str(n.target))
    res["non_delegated_ops"] = sorted({("memory.alloc" if "function alloc" in str(n.target) else str(n.target)) for n in g.nodes if n.op == "call_function" and "executorch_call_delegate" not in str(n.target) and "getitem" not in str(n.target)})
    try:
        from executorch.runtime import Runtime
        rt = Runtime.get(); prog = rt.load_program(p); meth = prog.load_method("forward")
        out = meth.execute([x])[0]
        res["runtime"] = {"ok": True, "max_abs_diff_vs_eager": float((out - ref).abs().max()), "out_shape": list(out.shape)}
    except Exception as e:
        res["runtime"] = {"ok": False, "error": repr(e)[:400]}
except Exception as e:
    import traceback; res["lower_error"] = traceback.format_exc()[-800:]
save("executorch", res)
