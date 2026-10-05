# AOT ID: ['0_inference']
from ctypes import c_void_p, c_long, c_int
import torch
import math
import random
import os
import tempfile
from math import inf, nan
from cmath import nanj
from torch._inductor.hooks import run_intermediate_hooks
from torch._inductor.utils import maybe_profile
from torch._inductor.codegen.memory_planning import _align as align
from torch import device, empty_strided
from torch._inductor.async_compile import AsyncCompile
from torch._inductor.select_algorithm import extern_kernels
import triton
import triton.language as tl
from torch._inductor.runtime.triton_heuristics import start_graph, end_graph

def get_raw_stream(_):
    return 0


aten = torch.ops.aten
inductor_ops = torch.ops.inductor
_quantized = torch.ops._quantized
assert_size_stride = torch._C._dynamo.guards.assert_size_stride
assert_size_stride_grouped = torch._C._dynamo.guards.assert_size_stride_grouped
assert_alignment = torch._C._dynamo.guards.assert_alignment
empty_strided_cpu = torch._C._dynamo.guards._empty_strided_cpu
empty_strided_cpu_pinned = torch._C._dynamo.guards._empty_strided_cpu_pinned
empty_strided_cuda = torch._C._dynamo.guards._empty_strided_cuda
empty_strided_xpu = torch._C._dynamo.guards._empty_strided_xpu
empty_strided_mtia = torch._C._dynamo.guards._empty_strided_mtia
reinterpret_tensor = torch._C._dynamo.guards._reinterpret_tensor
alloc_from_pool = torch.ops.inductor._alloc_from_pool
async_compile = AsyncCompile()
empty_strided_p2p = torch._C._distributed_c10d._SymmetricMemory.empty_strided_p2p


# kernel path: /tmp/ind/yn/cynvbho5ystb7oaegikvsvnnhq4ysqomcowfxj5sq3pcoqycdyeo.py
# Topologically Sorted Source Nodes: [gelu, sigmoid, mul, add], Original ATen: [aten.gelu, aten.sigmoid, aten.mul, aten.add]
# Source node to ATen node mapping:
#   add => add_1
#   gelu => add, erf, mul, mul_1, mul_2
#   mul => mul_3
#   sigmoid => sigmoid
# Graph fragment:
#   %arg0_1 : Tensor "f32[64, 256][256, 1]cpu" = PlaceHolder[target=arg0_1]
#   %mul : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%arg0_1, 0.5), kwargs = {})
#   %mul_1 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%arg0_1, 0.7071067811865476), kwargs = {})
#   %erf : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.erf.default](args = (%mul_1,), kwargs = {})
#   %add : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.add.Tensor](args = (%erf, 1), kwargs = {})
#   %mul_2 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%mul, %add), kwargs = {})
#   %sigmoid : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.sigmoid.default](args = (%arg0_1,), kwargs = {})
#   %mul_3 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%mul_2, %sigmoid), kwargs = {})
#   %add_1 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.add.Tensor](args = (%mul_3, 1), kwargs = {})
#   return %add_1
triton_poi_fused_add_gelu_mul_sigmoid_0 = async_compile.triton('triton_poi_fused_add_gelu_mul_sigmoid_0', '''
import triton
import triton.language as tl

from torch._inductor.runtime import triton_helpers, triton_heuristics
from torch._inductor.runtime.triton_helpers import libdevice, math as tl_math
from torch._inductor.runtime.hints import AutotuneHint, ReductionHint, TileHint, DeviceProperties
triton_helpers.set_driver_to_cpu()

@triton_heuristics.pointwise(
    size_hints={'x': 16384}, 
    filename=__file__,
    triton_meta={'signature': {'in_ptr0': '*fp32', 'out_ptr0': '*fp32', 'xnumel': 'i32', 'XBLOCK': 'constexpr'}, 'device': DeviceProperties(type='cpu', index=None, multi_processor_count=5, cc='', major=None, regs_per_multiprocessor=None, max_threads_per_multi_processor=None, max_threads_per_block=1024, warp_size=None), 'constants': {}, 'native_matmul': False, 'enable_fp_fusion': True, 'launch_pdl': False, 'disable_ftz': False, 'configs': [{(1,): [['tt.divisibility', 16]], (2,): [['tt.divisibility', 16]]}]},
    inductor_meta={'grid_type': 'Grid1D', 'kernel_name': 'triton_poi_fused_add_gelu_mul_sigmoid_0', 'mutated_arg_names': [], 'optimize_mem': True, 'no_x_dim': False, 'atomic_add_found': False, 'num_load': 1, 'num_store': 1, 'num_reduction': 0, 'autotune_hints': set(), 'tiling_scores': {'x': 196608}, 'backend_hash': 'nodevice', 'assert_indirect_indexing': True, 'autotune_local_cache': True, 'autotune_pointwise': True, 'autotune_remote_cache': None, 'force_disable_caches': False, 'dynamic_scale_rblock': True, 'incremental_autotune': False, 'max_autotune': False, 'max_autotune_pointwise': False, 'min_split_scan_rblock': 256, 'spill_threshold': 16, 'store_cubin': False, 'deterministic': False, 'batch_invariant': False, 'force_filter_reduction_configs': False, 'mix_order_reduction_allow_multi_stages': True, 'dynamic_disable_pipelining': True, 'are_deterministic_algorithms_enabled': False},
    min_elem_per_thread=0
)
@triton.jit
def triton_poi_fused_add_gelu_mul_sigmoid_0(in_ptr0, out_ptr0, xnumel, XBLOCK : tl.constexpr):
    xnumel = 16384
    xoffset = tl.program_id(0) * XBLOCK
    xindex = xoffset + tl.arange(0, XBLOCK)[:]
    xmask = tl.full([XBLOCK], True, tl.int1)[:]
    x0 = xindex
    tmp0 = tl.load(in_ptr0 + (x0), None)
    tmp1 = tl.full([1], 0.5, tl.float32)
    tmp2 = tmp0 * tmp1
    tmp3 = tl.full([1], 0.7071067811865476, tl.float32)
    tmp4 = tmp0 * tmp3
    tmp5 = libdevice.erf(tmp4)
    tmp6 = tl.full([1], 1.0, tl.float32)
    tmp7 = tmp5 + tmp6
    tmp8 = tmp2 * tmp7
    tmp9 = tl.sigmoid(tmp0)
    tmp10 = tmp8 * tmp9
    tmp11 = tmp10 + tmp6
    tl.store(out_ptr0 + (x0), tmp11, None)
''', device_str='cpu')


async_compile.wait(globals())
del async_compile

class Runner:
    def __init__(self, partitions):
        self.partitions = partitions

    def recursively_apply_fns(self, fns):
        new_callables = []
        for fn, c in zip(fns, self.partitions):
            new_callables.append(fn(c))
        self.partitions = new_callables

    def call(self, args):
        arg0_1, = args
        args.clear()
        assert_size_stride(arg0_1, (64, 256), (256, 1), 'input')
        buf0 = empty_strided_cpu((64, 256), (256, 1), torch.float32)
        # Topologically Sorted Source Nodes: [gelu, sigmoid, mul, add], Original ATen: [aten.gelu, aten.sigmoid, aten.mul, aten.add]
        raw_streamNone = get_raw_stream(None)
        triton_poi_fused_add_gelu_mul_sigmoid_0.run(arg0_1, buf0, 16384, stream=raw_streamNone)
        del arg0_1
        return (buf0, )

runner = Runner(partitions=[])
call = runner.call
recursively_apply_fns = runner.recursively_apply_fns


def get_args():
    from torch._dynamo.testing import rand_strided
    arg0_1 = rand_strided((64, 256), (256, 1), device='cpu', dtype=torch.float32)
    return [arg0_1]


def benchmark_compiled_module(args, times=10, repeat=10):
    from torch._inductor.utils import print_performance
    fn = lambda: call(list(args))
    return print_performance(fn, times=times, repeat=repeat, device='cpu')


if __name__ == "__main__":
    from torch._inductor.wrapper_benchmark import compiled_module_main
    args = get_args()
    compiled_module_main('None', lambda times, repeat: benchmark_compiled_module(args, times=times, repeat=repeat))
