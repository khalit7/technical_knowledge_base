"""Line numbers of the pinned jax-v0.11.2 source quoted on the TPU and Pallas lab. Writes out/source.json.
Each entry is found by a regex, so a wrong line number fails loudly instead of drifting."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import tp_common as T

Q = [  # key, file, regex, what it shows
 ("pallas_call", "jax/_src/pallas/pallas_call.py", r"^def pallas_call\(", "the entry point: kernel, out_shape, grid, in_specs, out_specs, scratch_shapes, interpret, compiler_params"),
 ("interpret_doc", "jax/_src/pallas/pallas_call.py", r"interpret: runs the ``pallas_call`` as a ``jax.jit`` of a scan over the grid", "docstring: interpret mode is a jit of a scan over the grid, \"the only way to run Pallas kernels on CPU\""),
 ("lowering", "jax/_src/pallas/pallas_call.py", r"^def _pallas_call_lowering\(", "one lowering rule, three outcomes: interpret, TPU (Mosaic), GPU (Triton or Mosaic GPU)"),
 ("interp_branch", "jax/_src/pallas/pallas_call.py", r"impl = partial\(hlo_interpreter.pallas_call_hlo_interpret", "interpret=True picks the HLO interpreter; an InterpretParams object picks the TPU interpreter"),
 ("cpu_error", "jax/_src/pallas/pallas_call.py", r"Only interpret mode is supported on CPU backend", "the error you get without interpret=True on CPU"),
 ("blockspec", "jax/_src/pallas/core.py", r"^class BlockSpec:", "BlockSpec(block_shape, index_map, memory_space, pipeline_mode)"),
 ("gridspec", "jax/_src/pallas/core.py", r"^class GridSpec:", "GridSpec: grid plus in/out specs plus scratch shapes"),
 ("hlo_interp", "jax/_src/pallas/hlo_interpreter.py", r"^def pallas_call_hlo_interpret\(", "the plain interpreter"),
 ("hlo_ignores", "jax/_src/pallas/hlo_interpreter.py", r"del mesh, compiler_params, cost_estimate", "it drops compiler_params, so dimension_semantics is ignored"),
 ("hlo_while", "jax/_src/pallas/hlo_interpreter.py", r"= loops\.while_loop\(", "the while loop over grid points"),
 ("hlo_dslice", "jax/_src/pallas/hlo_interpreter.py", r"output = slicing\.dynamic_slice\(", "blocks are cut with dynamic_slice, which clamps out-of-range starts (no error)"),
 ("uninit", "jax/_src/pallas/hlo_interpreter.py", r"output_vals\.append\(primitives\.uninitialized_value\(", "outputs start uninitialised (NaN on CPU), so a forgotten zero-init shows"),
 ("tpu_params", "jax/_src/pallas/mosaic/interpret/params.py", r"^class InterpretParams\(", "TPU interpret mode: DMAs, semaphores, cores, race detection, random order of parallel axes"),
 ("detect_races", "jax/_src/pallas/mosaic/interpret/params.py", r"^  detect_races: bool = False", "race detector off by default"),
 ("oob", "jax/_src/pallas/mosaic/interpret/interpret_pallas_call.py", r"f'Out-of-bounds block index \{block_indices\} for'", "the TPU interpreter raises on an out-of-range block"),
 ("randomize", "jax/_src/pallas/mosaic/interpret/interpret_pallas_call.py", r"randomized_grid_coordinates = _get_randomized_grid_coordinates\(", "parallel grid axes are walked in a random order"),
 ("semantics_doc", "jax/_src/pallas/mosaic/core.py", r"dimension_semantics: A list of dimension semantics for each grid dimension", "\"parallel\" (any order) or \"arbitrary\" (sequential)"),
 ("vmem_limit", "jax/_src/pallas/mosaic/core.py", r"vmem_limit_bytes: Overrides the default VMEM limit", "per-kernel VMEM limit, tied to --xla_tpu_scoped_vmem_limit_kib"),
 ("default_arbitrary", "jax/_src/pallas/mosaic/lowering.py", r'dimension_semantics = \("arbitrary",\) \* len\(user_grid\)', "the default: every axis arbitrary, so nothing is split over a megacore's two cores"),
 ("tpu_info", "jax/_src/tpu_info.py", r"^def _get_tpu_info_impl\(", "per-generation table: lanes, sublanes, MXU size and count, VMEM, SMEM, HBM"),
 ("megacore", "jax/_src/tpu_info.py", r"def supports_megacore\(self\)", "megacore only on v4 and v5p"),
]
out = {}
for k, f, rx, what in Q:
    out[k] = dict(file=f, line=T.src_line(f, rx), what=what)
    print(k, f, out[k]["line"])
T.save("source.json", out)
