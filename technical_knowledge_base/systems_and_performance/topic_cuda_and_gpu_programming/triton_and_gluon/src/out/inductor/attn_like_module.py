# AOT ID: ['1_inference']
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


# kernel path: /tmp/ind/x2/cx2rhqgfmtj5vi3glzp56h2wm66t5s6merqtpikbgsapmwzissrv.py
# Topologically Sorted Source Nodes: [softmax], Original ATen: [aten.mul, aten.eq, aten.abs, aten.ne, aten.all, aten.amax, aten.sub, aten._softmax]
# Source node to ATen node mapping:
#   softmax => div, exp, sum_1, where_self
# Graph fragment:
#   %arg0_1 : Tensor "f32[64, 256][256, 1]cpu" = PlaceHolder[target=arg0_1]
#   %any_dims : Tensor "b8[64, 1][1, 64]cpu" = PlaceHolder[target=any_dims]
#   %amax_default : Tensor "f32[64, 1][1, 64]cpu" = PlaceHolder[target=amax_default]
#   %amax_default_1 : Tensor "f32[64, 1][1, 64]cpu" = PlaceHolder[target=amax_default_1]
#   %exp : Tensor "f32[64, 256][256, 1]cpu" = PlaceHolder[target=exp]
#   %sum_1 : Tensor "f32[64, 1][1, 64]cpu" = PlaceHolder[target=sum_1]
#   %mul_tensor : Tensor "f32[64, 256][256, 1]cpu"[num_users=4] = call_function[target=torch.ops.aten.mul.Tensor](args = (%arg0_1, 0.125), kwargs = {})
#   %eq_tensor : Tensor "b8[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.eq.Tensor](args = (%mul_tensor, %mul_tensor), kwargs = {})
#   %abs_default : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.abs.default](args = (%mul_tensor,), kwargs = {})
#   %ne_scalar : Tensor "b8[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.ne.Scalar](args = (%abs_default, inf), kwargs = {})
#   %mul_tensor_3 : Tensor "b8[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%eq_tensor, %ne_scalar), kwargs = {})
#   %logical_not_default : Tensor "b8[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.logical_not.default](args = (%mul_tensor_3,), kwargs = {})
#   %any_dims : Tensor "b8[64, 1][1, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.any.dims](args = (%logical_not_default, [-1], True), kwargs = {})
#   %logical_not_default_1 : Tensor "b8[64, 1][1, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.logical_not.default](args = (%any_dims,), kwargs = {})
#   %mul_tensor_1 : Tensor "f32[64, 256][256, 1]cpu"[num_users=2] = call_function[target=torch.ops.aten.mul.Tensor](args = (%arg0_1, 1), kwargs = {})
#   %amax_default : Tensor "f32[64, 1][1, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.amax.default](args = (%mul_tensor_1, [-1], True), kwargs = {})
#   %sub_tensor : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.sub.Tensor](args = (%mul_tensor_1, %amax_default), kwargs = {})
#   %mul_tensor_2 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.mul.Tensor](args = (%sub_tensor, 0.125), kwargs = {})
#   %amax_default_1 : Tensor "f32[64, 1][1, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.amax.default](args = (%mul_tensor, [-1], True), kwargs = {})
#   %sub_tensor_1 : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.sub.Tensor](args = (%mul_tensor, %amax_default_1), kwargs = {})
#   %where_self : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.where.self](args = (%logical_not_default_1, %mul_tensor_2, %sub_tensor_1), kwargs = {})
#   %exp : Tensor "f32[64, 256][256, 1]cpu"[num_users=2] = call_function[target=torch.ops.aten.exp.default](args = (%where_self,), kwargs = {})
#   %sum_1 : Tensor "f32[64, 1][1, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.sum.dim_IntList](args = (%exp, [-1], True), kwargs = {})
#   %div : Tensor "f32[64, 256][256, 1]cpu"[num_users=1] = call_function[target=torch.ops.aten.div.Tensor](args = (%exp, %sum_1), kwargs = {})
#   return %any_dims,%amax_default,%amax_default_1,%exp,%sum_1,%div
triton_per_fused__softmax_abs_all_amax_eq_mul_ne_sub_0 = async_compile.triton('triton_per_fused__softmax_abs_all_amax_eq_mul_ne_sub_0', '''
import triton
import triton.language as tl

from torch._inductor.runtime import triton_helpers, triton_heuristics
from torch._inductor.runtime.triton_helpers import libdevice, math as tl_math
from torch._inductor.runtime.hints import AutotuneHint, ReductionHint, TileHint, DeviceProperties
triton_helpers.set_driver_to_cpu()

@triton_heuristics.persistent_reduction(
    size_hints={'x': 64, 'r0_': 256},
    reduction_hint=ReductionHint.INNER,
    filename=__file__,
    triton_meta={'signature': {'in_out_ptr0': '*fp32', 'in_ptr0': '*fp32', 'xnumel': 'i32', 'r0_numel': 'i32', 'XBLOCK': 'constexpr'}, 'device': DeviceProperties(type='cpu', index=None, multi_processor_count=5, cc='', major=None, regs_per_multiprocessor=None, max_threads_per_multi_processor=None, max_threads_per_block=1024, warp_size=None), 'constants': {}, 'native_matmul': False, 'enable_fp_fusion': True, 'launch_pdl': False, 'disable_ftz': False, 'configs': [{(0,): [['tt.divisibility', 16]], (2,): [['tt.divisibility', 16]], (3,): [['tt.divisibility', 16]]}]},
    inductor_meta={'grid_type': 'Grid1D', 'kernel_name': 'triton_per_fused__softmax_abs_all_amax_eq_mul_ne_sub_0', 'mutated_arg_names': ['in_out_ptr0'], 'optimize_mem': True, 'no_x_dim': None, 'atomic_add_found': False, 'num_load': 1, 'num_store': 1, 'num_reduction': 4, 'autotune_hints': set(), 'tiling_scores': {'x': 0, 'r0_': 196608}, 'backend_hash': 'nodevice', 'assert_indirect_indexing': True, 'autotune_local_cache': True, 'autotune_pointwise': True, 'autotune_remote_cache': None, 'force_disable_caches': False, 'dynamic_scale_rblock': True, 'incremental_autotune': False, 'max_autotune': False, 'max_autotune_pointwise': False, 'min_split_scan_rblock': 256, 'spill_threshold': 16, 'store_cubin': False, 'deterministic': False, 'batch_invariant': False, 'force_filter_reduction_configs': False, 'mix_order_reduction_allow_multi_stages': True, 'dynamic_disable_pipelining': True, 'are_deterministic_algorithms_enabled': False}
)
@triton.jit
def triton_per_fused__softmax_abs_all_amax_eq_mul_ne_sub_0(in_out_ptr0, in_ptr0, xnumel, r0_numel, XBLOCK : tl.constexpr):
    xnumel = 64
    r0_numel = 256
    R0_BLOCK: tl.constexpr = 256
    rnumel = r0_numel
    RBLOCK: tl.constexpr = R0_BLOCK
    xoffset = tl.program_id(0) * XBLOCK
    xindex = xoffset + tl.arange(0, XBLOCK)[:, None]
    xmask = xindex < xnumel
    r0_index = tl.arange(0, R0_BLOCK)[None, :]
    r0_offset = 0
    r0_mask = tl.full([R0_BLOCK], True, tl.int1)[None, :]
    roffset = r0_offset
    rindex = r0_index
    r0_1 = r0_index
    x0 = xindex
    tmp0 = tl.load(in_ptr0 + (r0_1 + 256*x0), xmask, eviction_policy='evict_first', other=0.0)
    tmp1 = tl.full([1, 1], 0.125, tl.float32)
    tmp2 = tmp0 * tmp1
    tmp3 = tmp2 == tmp2
    tmp4 = tl_math.abs(tmp2)
    tmp5 = tl.full([1, 1], float("inf"), tl.float32)
    tmp6 = tmp4 != tmp5
    tmp7 = tmp3 & tmp6
    tmp8 = tmp7 == 0
    tmp9 = tl.broadcast_to(tmp8, [XBLOCK, R0_BLOCK])
    tmp11 = tl.where(xmask, tmp9, False)
    tmp12 = triton_helpers.any(tmp11, 1)[:, None].to(tl.int1)
    tmp13 = tl.full([1, 1], 1.0, tl.float32)
    tmp14 = tmp0 * tmp13
    tmp15 = tl.broadcast_to(tmp14, [XBLOCK, R0_BLOCK])
    tmp17 = tl.where(xmask, tmp15, float("-inf"))
    tmp18 = triton_helpers.max2(tmp17, 1)[:, None].to(tl.float32)
    tmp19 = tl.broadcast_to(tmp2, [XBLOCK, R0_BLOCK])
    tmp21 = tl.where(xmask, tmp19, float("-inf"))
    tmp22 = triton_helpers.max2(tmp21, 1)[:, None].to(tl.float32)
    tmp23 = tmp12 == 0
    tmp24 = tmp14 - tmp18
    tmp25 = tmp24 * tmp1
    tmp26 = tmp2 - tmp22
    tmp27 = tl.where(tmp23, tmp25, tmp26)
    tmp28 = libdevice.exp(tmp27)
    tmp29 = tl.broadcast_to(tmp28, [XBLOCK, R0_BLOCK])
    tmp31 = tl.where(xmask, tmp29, 0)
    tmp32 = tl.sum(tmp31, 1)[:, None].to(tl.float32)
    tmp33 = (tmp28 / tmp32)
    tl.store(in_out_ptr0 + (r0_1 + 256*x0), tmp33, xmask)
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
        arg0_1, arg1_1 = args
        args.clear()
        assert_size_stride(arg0_1, (64, 256), (256, 1), 'input')
        buf3 = empty_strided_cpu((64, 256), (256, 1), torch.float32)
        buf5 = buf3; del buf3  # reuse
        # Topologically Sorted Source Nodes: [softmax], Original ATen: [aten.mul, aten.eq, aten.abs, aten.ne, aten.all, aten.amax, aten.sub, aten._softmax]
        raw_streamNone = get_raw_stream(None)
        triton_per_fused__softmax_abs_all_amax_eq_mul_ne_sub_0.run(buf5, arg0_1, 64, 256, stream=raw_streamNone)
        del arg0_1
        assert_size_stride(arg1_1, (256, 32), (32, 1), 'input')
        buf6 = empty_strided_cpu((64, 32), (32, 1), torch.float32)
        # Topologically Sorted Source Nodes: [softmax, matmul], Original ATen: [aten._softmax, aten.mm]
        extern_kernels.mm(buf5, arg1_1, out=buf6)
        del arg1_1
        return (buf6, )

runner = Runner(partitions=[])
call = runner.call
recursively_apply_fns = runner.recursively_apply_fns


def get_args():
    from torch._dynamo.testing import rand_strided
    arg0_1 = rand_strided((64, 256), (256, 1), device='cpu', dtype=torch.float32)
    arg1_1 = rand_strided((256, 32), (32, 1), device='cpu', dtype=torch.float32)
    return [arg0_1, arg1_1]


def benchmark_compiled_module(args, times=10, repeat=10):
    from torch._inductor.utils import print_performance
    fn = lambda: call(list(args))
    return print_performance(fn, times=times, repeat=repeat, device='cpu')


if __name__ == "__main__":
    from torch._inductor.wrapper_benchmark import compiled_module_main
    args = get_args()
    compiled_module_main('None', lambda times, repeat: benchmark_compiled_module(args, times=times, repeat=repeat))
