"""Export a Qwen3-architecture model to ONNX and look inside the graph.

Usage: python3 -I onnx_demo.py <work dir> <out.json> tiny|<path to HF Qwen3 folder>
tiny: a 2-layer Qwen3 config with random weights (seed 0), so the whole graph can be listed.
A real folder (Qwen3-0.6B) shows what a real decoder becomes, and the 2 GB protobuf limit
(weights go to an external .data file).
Exports logits for input_ids with a dynamic batch and sequence axis, no KV cache (use_cache=False),
then runs the graph in ONNX Runtime on the same input and compares with PyTorch.
"""
import sys, os, json, time, collections
import torch, numpy as np, onnx, onnxruntime as ort
from transformers import Qwen3Config, Qwen3ForCausalLM

work, outp, which = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(work, exist_ok=True)
torch.manual_seed(0)
if which == 'tiny':
    cfg = Qwen3Config(vocab_size=512, hidden_size=64, intermediate_size=128, num_hidden_layers=2,
                      num_attention_heads=4, num_key_value_heads=2, head_dim=16, max_position_embeddings=256,
                      tie_word_embeddings=True)
    model = Qwen3ForCausalLM(cfg).eval()
    tag = 'tiny'
else:
    model = Qwen3ForCausalLM.from_pretrained(which, torch_dtype=torch.float32).eval()
    tag = 'qwen3_06b'
model.config.use_cache = False


class Wrap(torch.nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, input_ids): return s.m(input_ids=input_ids, use_cache=False).logits


w = Wrap(model).eval()
ids = torch.randint(0, model.config.vocab_size, (2, 12))  # batch 2: torch.export fixes a size-1 example dim to 1
with torch.no_grad(): ref = w(ids).numpy()
path = os.path.join(work, tag + '.onnx')
t0 = time.perf_counter()
B, T = torch.export.Dim('batch'), torch.export.Dim('seq', max=4096)
prog = torch.onnx.export(w, (ids,), dynamic_shapes={'input_ids': {0: B, 1: T}}, dynamo=True,
                         input_names=['input_ids'], output_names=['logits'])
prog.save(path, external_data=(tag != 'tiny'))
t_export = time.perf_counter() - t0
m = onnx.load(path, load_external_data=False)
ops = collections.Counter(n.op_type for n in m.graph.node)
inits = m.graph.initializer
files = sorted(f for f in os.listdir(work) if f.startswith(tag))
res = {
    'tag': tag, 'torch': torch.__version__, 'onnx': onnx.__version__, 'onnxruntime': ort.__version__,
    'export_seconds': round(t_export, 2), 'files': {f: os.path.getsize(os.path.join(work, f)) for f in files},
    'ir_version': m.ir_version, 'opset': [[o.domain or 'ai.onnx', o.version] for o in m.opset_import],
    'producer': m.producer_name + ' ' + m.producer_version, 'n_nodes': len(m.graph.node), 'op_counts': dict(ops.most_common()),
    'n_initializers': len(inits), 'external_initializers': sum(1 for i in inits if i.data_location == 1),
    'inputs': [[i.name, [d.dim_param or d.dim_value for d in i.type.tensor_type.shape.dim]] for i in m.graph.input],
    'outputs': [[o.name, [d.dim_param or d.dim_value for d in o.type.tensor_type.shape.dim]] for o in m.graph.output],
    'n_functions': len(m.functions),
}
# first nodes of the graph, to show what attention turned into
res['first_nodes'] = [[n.op_type, n.name] for n in m.graph.node[:40]]
sess = ort.InferenceSession(path, providers=['CPUExecutionProvider'])
t0 = time.perf_counter(); out = sess.run(None, {'input_ids': ids.numpy()})[0]; res['ort_first_run_s'] = round(time.perf_counter() - t0, 3)
res['max_abs_diff'] = float(np.max(np.abs(out - ref))); res['argmax_equal'] = bool((out.argmax(-1) == ref.argmax(-1)).all())
ids2 = torch.randint(0, model.config.vocab_size, (3, 30))
with torch.no_grad(): ref2 = w(ids2).numpy()
out2 = sess.run(None, {'input_ids': ids2.numpy()})[0]
res['dynamic_shape_max_abs_diff'] = float(np.max(np.abs(out2 - ref2)))
json.dump(res, open(outp, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'first_nodes'}, indent=0)[:3000])
