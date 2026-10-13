"""Source quoted on the page, cut by line number from the pinned versions.
torch 2.14.1: the installed wheel's Python files (torch/_library/custom_ops.py checked byte-identical to the v2.14.1
tag) and two C++ files fetched from the tag; torchao 0.18.0 and helion 1.4.0: their wheels.
Usage: python quotes.py <site-packages dir> <helion unpacked dir> <dir with fetched C++ files>
Writes src/inputs/quotes.json: per quote the repository path, first and last line, link, text.
"""
import os, re, sys
from common import save

SP, HEL, CPP = sys.argv[1:4]
TORCH = "https://github.com/pytorch/pytorch/blob/v2.14.1/"
AO = "https://github.com/pytorch/ao/blob/v0.18.0/"
HL = "https://github.com/pytorch/helion/blob/v1.4.0/"

# key: (base dir, path in repo, file on disk relative to base, regex of the first line, number of lines, link root)
Q = {
    "co_register": (SP, "torch/_library/custom_ops.py", r"def _register_to_dispatcher\(self", 13, TORCH),
    "co_fake_missing": (SP, "torch/_library/custom_ops.py", r"def _register_fake_dispatcher_impl", 16, TORCH),
    "co_kernel_key": (SP, "torch/_library/custom_ops.py", r"if device_types is None or isinstance\(device_types, str\)", 4, TORCH),
    "co_cea": (SP, "torch/_library/custom_ops.py", r'self._name, backend_impl, "CompositeExplicitAutograd"', 1, TORCH),
    "ag_no_formula": (SP, "torch/_library/autograd.py", r"Trying to backward through \{op\} but no autograd", 3, TORCH),
    "lib_reg_autograd": (SP, "torch/library.py", r"info = _library.autograd.Info\(backward, setup_context\)", 5, TORCH),
    "opcheck_tests": (SP, "torch/testing/_internal/optests/generate_tests.py", r"^DEFAULT_TEST_UTILS = \[", 6, TORCH),
    "triton_op_doc": (SP, "torch/_library/triton.py", r"Use :func:`torch.library.triton_op` instead of", 7, TORCH),
    "triton_op_impl": (SP, "torch/_library/triton.py", r"def dec\(fn: Callable\[\.\.\., object\]\) -> CustomOpDef:", 20, TORCH),
    "wrap_triton_doc": (SP, "torch/_library/triton.py", r"^def wrap_triton\(", 8, TORCH),
    "ops_cache_init": (SP, "torch/_ops.py", r"self._dispatch_cache: dict\[DispatchKey", 1, TORCH),
    "ops_cache_store": (SP, "torch/_ops.py", r"r = self.py_kernels.get\(final_key, final_key\)", 5, TORCH),
    "aot_cache_flag": (SP, "torch/_functorch/config.py", r"^enable_autograd_cache: bool = Config\(", 5, TORCH),
    "dtensor_new": (SP, "torch/distributed/tensor/_api.py", r"r = torch.Tensor._dtensor__new__\(", 7, TORCH),
    "dtensor_dispatch": (SP, "torch/distributed/tensor/_api.py", r"def __torch_dispatch__\(cls, func, types, args=\(\), kwargs=None\):", 6, TORCH),
    "dtensor_flatten": (SP, "torch/distributed/tensor/_api.py", r"def __tensor_flatten__\(self\):", 8, TORCH),
    "flop_sdpa": (SP, "torch/utils/flop_counter.py", r"@register_flop_formula\(\[aten._scaled_dot_product_efficient_attention,", 3, TORCH),
    "pu1_rename": (SP, "torch/utils/backend_registration.py", r"^def rename_privateuse1_backend", 1, TORCH),
    "nf4_new": (SP, "torchao/quantization/quantize_/workflows/nf4/nf4_tensor.py", r"nf4tensor = torch.Tensor._make_wrapper_subclass\(", 1, AO),
    "nf4_flatten": (SP, "torchao/quantization/quantize_/workflows/nf4/nf4_tensor.py", r"def __tensor_flatten__\(self\):", 12, AO),
    "nf4_dispatch": (SP, "torchao/quantization/quantize_/workflows/nf4/nf4_tensor.py", r"def __torch_dispatch__\(cls, func, types, args, kwargs=None\):", 12, AO),
    "nf4_linear": (SP, "torchao/quantization/quantize_/workflows/nf4/nf4_tensor.py", r"@implements_torch_function\(F.linear\)", 2, AO),
    "fsdp_hooks": (SP, "torch/distributed/fsdp/_fully_shard/_fsdp_param.py", r'has_fsdp_pre_all_gather = hasattr\(inner_tensor, "fsdp_pre_all_gather"\)', 5, TORCH),
    "f8_new": (SP, "torchao/float8/float8_training_tensor.py", r"self = torch.Tensor._make_wrapper_subclass\(", 1, AO),
    "f8_dispatch": (SP, "torchao/float8/float8_training_tensor.py", r"def __torch_dispatch__\(cls, func, types, args, kwargs=None\):", 12, AO),
    "int8_names": (SP, "torchao/quantization/quantize_/workflows/int8/int8_tensor.py", r"tensor_data_names = \[\"qdata\", \"scale\"\]", 8, AO),
    "helion_backends": (HEL, "helion/runtime/settings.py", r'"backend": \($', 5, HL),
    "helion_metal": (HEL, "helion/_compiler/metal/backend.py", r"^class MetalBackend\(Backend\):", 2, HL),
    "helion_hop": (HEL, "helion/_compiler/_dynamo/higher_order_ops.py", r"^class HelionKernelWrapperMutation", 1, HL),
    "helion_ref": (HEL, "helion/runtime/settings.py", r"def _get_ref_mode\(\) -> RefMode:", 2, HL),
    "cpp_subclass_helper": (CPP, "torch/csrc/autograd/python_variable.cpp", r"// Shared code factored out of THPVariable_make_wrapper_subclass and", 2, TORCH),
    "cpp_fast_path": (CPP, "torch/csrc/autograd/python_variable.cpp", r"First, we will try to short-circuit Python entirely using the fast path", 1, TORCH),
    "torch_library_macro": (CPP, "torch/library.h", r"#define TORCH_LIBRARY\(ns, m\)", 1, TORCH),
}
out = {}
for k, (base, path, rx, n, link) in Q.items():
    fn = os.path.join(base, path) if base != CPP else os.path.join(base, os.path.basename(path))
    lines = open(fn, encoding="utf-8").read().splitlines()
    hits = [i for i, ln in enumerate(lines) if re.search(rx, ln)]
    if not hits:
        raise SystemExit(f"no match for {k}: {rx}")
    i = hits[0]
    txt = "\n".join(lines[i:i + n])
    out[k] = {"path": path, "first": i + 1, "last": i + n, "text": txt,
              "url": f"{link}{path}#L{i + 1}" + (f"-L{i + n}" if n > 1 else "")}
    print(k, path, i + 1, i + n)
save("quotes.json", out)
