"""Source lines the page quotes, located by regular expression in the pinned sources so a wrong line number fails the
build instead of drifting. Writes out/source.json.

Pinned: jax tag jax-v0.11.2 (32544801, 2026-09-17), shallow clone in $JX_SCRATCH/src/jax; tokamax 0.0.16, the PyPI
sdist (sha256 a0114239...c3c314, uploaded 2026-10-09), unpacked in $JX_SCRATCH/src/tokamax_016.
Also extracts the autotuned block-size table of ragged paged attention and the published v5e outputs of the Pallas
TPU matmul guide notebook, as committed at that tag.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ast, collections, json, re
import pk_common as P

JAX = P.jax_src()
TOK = os.path.join(os.environ["JX_SCRATCH"], "src", "tokamax_016", "tokamax-0.0.16")
PS = "jax/_src/pallas/"
OPS = "jax/experimental/pallas/ops/"
ITEMS = [
    # (key, root, file, pattern, nth, what it shows)
    ("pallas_call", JAX, PS + "pallas_call.py", r"^def pallas_call\(", 0, "pallas_call(kernel, out_shape, *, grid_spec, grid, in_specs, out_specs, scratch_shapes, input_output_aliases, debug, interpret, name, compiler_params, cost_estimate, metadata)"),
    ("interpret_doc", JAX, PS + "pallas_call.py", r"interpret: runs the ``pallas_call`` as a ``jax.jit`` of a scan", 0, "interpret: \"runs the pallas_call as a jax.jit of a scan over the grid whose body is the kernel lowered as a JAX function ... the only way to run Pallas kernels on CPU\""),
    ("gpu_default_triton", JAX, PS + "pallas_call.py", r"compiler_params = triton_core.CompilerParams\(\)", 0, "on cuda and rocm, a pallas_call with no compiler_params lowers through Triton"),
    ("blockspec", JAX, PS + "core.py", r"^class BlockSpec:", 0, "BlockSpec(block_shape, index_map, memory_space, pipeline_mode)"),
    ("buffered", JAX, PS + "core.py", r"^class Buffered:", 0, "Buffered(buffer_count, use_lookahead, revisit, prefetched_count): how a block is buffered"),
    ("memspace_any", JAX, PS + "core.py", r'ANY = "any"  # Unrestricted memory space \(usually HBM\)', 0, "pl.ANY: \"Unrestricted memory space (usually HBM)\": nothing is copied for you"),
    ("trivial_window", JAX, PS + "core.py", r"def has_trivial_window", 0, "a trivial window: block shape equal to the array and an index map of zeros"),
    ("tpu_memspace", JAX, PS + "mosaic/core.py", r'VMEM = "vmem"', 0, "pltpu.MemorySpace: VMEM, VMEM_SHARED, SMEM, CMEM, SEMAPHORE, HBM"),
    ("vmem_limit", JAX, PS + "mosaic/core.py", r"vmem_limit_bytes: Overrides the default VMEM limit", 0, "vmem_limit_bytes \"must be used in conjunction with the --xla_tpu_scoped_vmem_limit_kib=N flag\""),
    ("prefetch_spec", JAX, PS + "mosaic/core.py", r"^class PrefetchScalarGridSpec", 0, "PrefetchScalarGridSpec(num_scalar_prefetch, grid, in_specs, out_specs, scratch_shapes)"),
    ("prefetch_smem", JAX, PS + "mosaic/core.py", r"jax_core.ShapedArray\(aval.shape, aval.dtype\), MemorySpace.SMEM", 0, "the prefetched scalars become refs in SMEM"),
    ("default_semantics", JAX, PS + "mosaic/lowering.py", r'dimension_semantics = \("arbitrary",\) \* len\(user_grid\)', 0, "no dimension_semantics given: every axis \"arbitrary\""),
    ("force_single_buffer", JAX, PS + "mosaic/lowering.py", r"Force single-buffering pipelining for trivial windowing in VMEM", 0, "a block with a trivial window is single-buffered automatically"),
    ("buffer_limit", JAX, PS + "mosaic/lowering.py", r"Only single \(1\) and double \(2\) buffering are supported", 0, "the pallas_call pipeline accepts Buffered(1) or Buffered(2) only"),
    ("make_async_copy", JAX, PS + "mosaic/primitives.py", r"^def make_async_copy\(", 0, "make_async_copy(src_ref, dst_ref, sem): a DMA you start() and wait()"),
    ("emit_pipeline", JAX, PS + "mosaic/pipeline.py", r"^def emit_pipeline\(", 0, "emit_pipeline(body, grid, in_specs, out_specs, tiling, core_axis, dimension_semantics, ...): a pipeline written inside a kernel"),
    ("dma_on_wait", JAX, PS + "mosaic/interpret/params.py", r'dma_execution_mode: Literal\["eager", "on_wait"\] = "on_wait"', 0, "TPU interpreter: DMA data lands only when the kernel waits on its semaphore (default \"on_wait\")"),
    ("random_seed", JAX, PS + "mosaic/interpret/params.py", r"random_seed: Seed for random number generator", 0, "TPU interpreter: \"parallel\" grid axes are visited in a random order"),
    ("detect_races", JAX, PS + "mosaic/interpret/params.py", r"detect_races: bool = False", 0, "TPU interpreter: race detector, off by default"),
    ("fa_blocksizes", JAX, OPS + "tpu/flash_attention.py", r"^class BlockSizes:", 0, "BlockSizes: forward blocks plus seven backward blocks (dkv and dq)"),
    ("fa_default128", JAX, OPS + "tpu/flash_attention.py", r"# TODO\(apaszke,sharadmv\): Select better parameters based on a heuristic", 0, "default block sizes: 128 everywhere, with a TODO to choose them by heuristic"),
    ("fa_sm_scale", JAX, OPS + "tpu/flash_attention.py", r"    sm_scale: float = 1.0,", 0, "sm_scale defaults to 1.0, not 1/sqrt(head_dim)"),
    ("fa_custom_vjp", JAX, OPS + "tpu/flash_attention.py", r"^@functools.partial\(jax.custom_vjp, nondiff_argnums=range\(5, 10\)\)", 0, "the kernel's gradient is a jax.custom_vjp"),
    ("fa_bwd", JAX, OPS + "tpu/flash_attention.py", r"^def _flash_attention_bwd\(", 0, "the VJP: di = rowsum(o * do), then dK dV, then dQ"),
    ("fa_min_block", JAX, OPS + "tpu/flash_attention.py", r"^MIN_BLOCK_SIZE = 128", 0, "MIN_BLOCK_SIZE = 128"),
    ("fa_lm_lanes", JAX, OPS + "tpu/flash_attention.py", r"m_scratch = pltpu.VMEM\(\(block_b, 1, block_q, MIN_BLOCK_SIZE\)", 0, "the running max and sum are stored 128 lanes wide, one value repeated"),
    ("fa_clamp", JAX, OPS + "tpu/flash_attention.py", r"next_kv_index = lax.select\(", 0, "masked key blocks: the index map re-uses the previous block (no copy)"),
    ("fa_dkv", JAX, OPS + "tpu/flash_attention.py", r"^def _flash_attention_dkv_kernel\(", 0, "backward kernel 1: dK and dV"),
    ("fa_dq", JAX, OPS + "tpu/flash_attention.py", r"^def _flash_attention_dq_kernel\(", 0, "backward kernel 2: dQ"),
    ("splash_maskinfo", JAX, OPS + "tpu/splash_attention/splash_attention_mask_info.py", r"^class MaskInfo\(NamedTuple\):", 0, "splash attention's MaskInfo: data_next, mask_next, block_mask \"placed in TPU scalar-memory\""),
    ("splash_next", JAX, OPS + "tpu/splash_attention/splash_attention_kernel.py", r"next_j = to_i32\(data_next_ref\[h, i, j\]\)", 0, "the index map reads the next key block to fetch from the prefetched data_next"),
    ("gmm_prefetch", JAX, OPS + "tpu/megablox/gmm.py", r"num_scalar_prefetch=2,", 0, "megablox gmm: group metadata by scalar prefetch"),
    ("gmm_metadata", JAX, OPS + "tpu/megablox/gmm.py", r"^def make_group_metadata\(", 0, "make_group_metadata: which group and which row tile each grid step works on"),
    ("rpa_table", JAX, OPS + "tpu/ragged_paged_attention/tuned_block_sizes.py", r"^TUNED_BLOCK_SIZES = \{", 0, "ragged paged attention: an autotuned table of block sizes per TPU generation"),
    ("rpa_lookup", JAX, OPS + "tpu/ragged_paged_attention/tuned_block_sizes.py", r"^def get_tuned_block_sizes\(", 0, "the lookup: round the key to powers of two, fall back if missing"),
    ("paged_prefetch", JAX, OPS + "tpu/paged_attention/paged_attention_kernel.py", r"grid_spec=pltpu.PrefetchScalarGridSpec\(", 0, "paged attention: lengths and page indices by scalar prefetch"),
    ("gpu_attn_deprecated", JAX, OPS + "gpu/attention.py", r'"jax.experimental.pallas.ops.gpu.attention is deprecated. Please use "', 0, "the GPU (Triton) attention op is deprecated in favour of tokamax.dot_product_attention"),
    ("gpu_ln_dwdb", JAX, OPS + "gpu/layer_norm.py", r"^def layer_norm_backward_kernel_dw_db\(", 0, "GPU layer norm: dscale and dbias in a second kernel, each program looping over all rows with masked loads"),
    ("tok_readme_gpu", TOK, "README.md", r"We currently support the following GPU kernels", 0, "tokamax README: GPU kernels dot_product_attention, gated_linear_unit, layer_norm; both: ragged_dot; TPU: linear_softmax_cross_entropy_loss"),
    ("tok_attn_tpu", TOK, "tokamax/_src/ops/attention/api.py", r'_IMPLEMENTATIONS\["mosaic_tpu"\] = \(', 0, "the code also registers a Mosaic TPU attention (built on its own copy of splash attention)"),
    ("tok_autotune", TOK, "tokamax/_src/autotuning/api.py", r"^def autotune\(", 0, "tokamax.autotune: times every config in each op's search space"),
    ("tok_rd_space", TOK, "tokamax/_src/ops/ragged_dot/pallas_mosaic_tpu.py", r"# Based on some empirical TPU tiling performance", 0, "ragged_dot search space: m tiles 128 to 1,024 (\"no need ... to search for larger tiles for m\")"),
    ("tok_xent_space", TOK, "tokamax/_src/ops/linear_softmax_cross_entropy_loss/pallas_mosaic_tpu.py", r"def _get_autotuning_configs", 0, "fused linear + cross-entropy: batch, hidden and vocabulary block ranges in multiples of 128"),
    ("doc_parallel", JAX, "docs/pallas/tpu/details.rst", r"grid. Only ``parallel`` dimensions can be partitioned over cores", 0, "\"Only parallel dimensions can be partitioned over cores. As a rule of thumb, the dimensions are parallel, unless the output window does not vary.\""),
    ("doc_sequential", JAX, "docs/pallas/tpu/details.rst", r"Ergo, the grid is generally not processed in parallel, but sequentially", 0, "\"the grid is generally not processed in parallel, but sequentially\""),
    ("doc_vmap", JAX, "docs/pallas/design/design.md", r"^#### `vmap-of-pallas_call`", 0, "vmap of pallas_call: an extra grid dimension for the batch"),
    ("doc_grad", JAX, "docs/pallas/design/design.md", r"^#### `grad-of-pallas_call`", 0, "grad of pallas_call: possible in principle, slow when transposed; custom_vjp \"a viable escape hatch\""),
    ("doc_matmul_perf", JAX, "docs/pallas/tpu/matmul.md", r"^## Performance of pipelined kernels", 0, "Pallas TPU matmul guide: bandwidth (m k n / bn + k n m / bm + m n) x size; \"make the blocks as big as possible\""),
    ("doc_multibuf", JAX, "docs/pallas/tpu/pipelining.md", r"^### Multiple Buffering", 0, "Pallas TPU pipelining guide: multiple buffering, emit_pipeline, lookahead, megacore"),
    ("doc_prefetch", JAX, "docs/pallas/tpu/sparse.md", r"^## Dynamic Block Indexing with Scalar Prefetch", 0, "Pallas TPU sparse guide: scalar prefetch and block-sparse kernels"),
]
rows = []
for key, root, rel, pat, nth, what in ITEMS:
    ln = P.src_line(root, rel, pat, nth)
    rows.append(dict(key=key, src="jax" if root == JAX else "tokamax", file=rel, line=ln, what=what))
    print(f"{key:22s} {rel}:{ln}")

# ---- the autotuned table of ragged paged attention
rel = OPS + "tpu/ragged_paged_attention/tuned_block_sizes.py"
src = open(os.path.join(JAX, rel)).read()
i = src.find("TUNED_BLOCK_SIZES = {"); j = src.find("\n}\n", i)
tab = ast.literal_eval(src[i + len("TUNED_BLOCK_SIZES = "):j + 2])
gens = sorted(tab)
keys = sorted(set(tab[gens[0]]) & set(tab[gens[1]]))
diff = [k for k in keys if tab[gens[0]][k] != tab[gens[1]][k]]
# one slice to draw: q heads per block 8, kv heads per block 2, head_dim 128, every page size and context length
fields = ["q_dtype", "kv_dtype", "num_q_heads_per_blk", "num_kv_heads_per_blk", "head_dim", "page_size",
          "max_num_batched_tokens", "max_model_len"]
sl = collections.defaultdict(dict)
for g in gens:
    for k_, v_ in tab[g].items():
        if k_[2] == 8 and k_[3] == 2 and k_[4] == 128 and k_[6] == 512:
            sl[g][f"{k_[5]}|{k_[7]}"] = list(v_)
rpa = dict(generations=gens, n={g: len(tab[g]) for g in gens}, common=len(keys), differ=len(diff),
           key_fields=fields, value_fields=["num_kv_pages_per_block", "num_queries_per_block"],
           top={g: [[list(a), b] for a, b in collections.Counter(tab[g].values()).most_common(6)] for g in gens},
           slice=dict(desc="q heads per block 8, kv heads per block 2, head_dim 128, max_num_batched_tokens 512",
                      cells={g: dict(sl[g]) for g in gens}),
           page_sizes=sorted(set(k_[5] for k_ in keys)), model_lens=sorted(set(k_[7] for k_ in keys)))

# ---- the published v5e outputs of the Pallas TPU matmul guide (as committed at the tag)
nb = json.load(open(os.path.join(JAX, "docs/pallas/tpu/matmul.ipynb")))
pub = []
for c in nb["cells"]:
    if c["cell_type"] != "code":
        continue
    txt = "".join("".join(o.get("text", [])) for o in c.get("outputs", []))
    src_ = "".join(c["source"])
    if "FLOP/s utilization" not in txt:
        continue
    impl = "XLA (jnp.matmul)" if "mm = jnp.matmul" in src_ else "Pallas"
    blk = None
    for part in re.split(r"=+(bm=\d+, bk=\d+, bn=\d+|\s*XLA matmul\s*)=+", txt):
        m = re.match(r"bm=(\d+), bk=(\d+), bn=(\d+)", part.strip())
        if m:
            blk = [int(x) for x in m.groups()]; continue
        if "XLA matmul" in part:
            blk = None; continue
        for size, t, util in re.findall(r"----- (\d+) x \d+ x \d+ -----\nMatmul time:\s+([\d.e-]+)\nMatmul FLOP/s:\s+[\d.e+]+\nFLOP/s utilization: ([\d.]+)%", part):
            pub.append(dict(impl=impl, block=blk, n=int(size), time_s=float(t), util=float(util),
                            first_line=src_.splitlines()[0][:60]))
    if impl == "XLA (jnp.matmul)":
        pass
# keep the first Pallas cell (plain f32-accumulating kernel on bf16) and the XLA cell
seen = set(); first = []
for r in pub:
    k_ = (r["impl"], tuple(r["block"] or []), r["n"])
    if k_ in seen:
        continue
    seen.add(k_); first.append(r)
sp = json.load(open(os.path.join(JAX, "docs/pallas/tpu/sparse.ipynb")))
sptxt = "\n".join("".join("".join(o.get("text", [])) for o in c.get("outputs", [])) for c in sp["cells"] if c["cell_type"] == "code")
kern = [float(x) for x in re.findall(r"Sparse Kernel: ([\d.]+) ms", sptxt)]
refs = [float(x) for x in re.findall(r"Reference: ([\d.]+) ms", sptxt)]
dev = re.findall(r"Running on (TPU[^\n]*)", sptxt)
P.save("source.json", dict(items=rows, rpa=rpa, matmul_guide=first, sparse_guide=dict(
    kernel_ms=kern, reference_ms=refs, device=dev[0] if dev else None,
    cases=["block-sparse x dense matmul, M = N = K = 16,384, blocks 512", "dense x dense with a block-sparse output mask"])))
print(rpa["n"], rpa["differ"], rpa["top"])
for r in first:
    print(r)
