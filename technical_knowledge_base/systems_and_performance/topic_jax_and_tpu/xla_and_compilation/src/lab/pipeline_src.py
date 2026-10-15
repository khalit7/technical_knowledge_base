"""XLA's CPU and GPU pass pipelines read from the pinned source (openxla/xla 91888df6, files fetched one by one).

For every AddPass<Class> in cpu_compiler.cc, gpu_compiler.cc and gpu/fusion_pipeline.cc: line and class.
For the passes that matter on this page: the pass's name() string located in its header (so the names seen in
dump file names map to classes by evidence, not guesswork), the CPU and GPU lines that add it, and whether it
changed the attention block or the train step in the dumps (lab/out/passes_diff.json).
Also: the fusion rules quoted from instruction_fusion.cc and cpu_instruction_fusion.cc, the FusionKind enum,
the YNNPACK default, the rematerialisation pass in the GPU pipeline.
Output: lab/out/pipeline_src.json
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

XL = X.xla_locate


def addpasses(rel):
    lines = open(X.xla_file(rel)).read().splitlines()
    out = []
    for i, l in enumerate(lines):
        for m in re.finditer(r"AddPass<\s*([A-Za-z_:]+)", l):
            out.append({"line": i + 1, "cls": m.group(1).split("::")[-1]})
    return out


cpu = addpasses("xla/service/cpu/cpu_compiler.cc")
gpu = addpasses("xla/service/gpu/gpu_compiler.cc")
gfu = addpasses("xla/service/gpu/fusion_pipeline.cc")
cpu_cls = collections.defaultdict(list)
gpu_cls = collections.defaultdict(list)
for a in cpu:
    cpu_cls[a["cls"]].append(a["line"])
for a in gpu:
    gpu_cls[a["cls"]].append(a["line"])
for a in gfu:
    gpu_cls[a["cls"]].append("fusion_pipeline.cc:%d" % a["line"])

# pass name (as in dump file names) -> class and header, verified by locating `return "<name>"` in the header
NAMES = [
    ("algsimp", "AlgebraicSimplifier", "xla/hlo/transforms/simplifiers/algebraic_simplifier.h"),
    ("dce", "HloDCE", "xla/hlo/transforms/simplifiers/hlo_dce.h"),
    ("cse", "HloCSE", "xla/service/hlo_cse.h"),
    ("call-inliner", "CallInliner", "xla/service/call_inliner.h"),
    ("flatten-call-graph", "FlattenCallGraph", "xla/hlo/transforms/simplifiers/flatten_call_graph.h"),
    ("dot_decomposer", "DotDecomposer", "xla/hlo/transforms/expanders/dot_decomposer.h"),
    ("batched_gather_scatter_normalizer", "BatchedGatherScatterNormalizer", "xla/service/batched_gather_scatter_normalizer.h"),
    ("dynamic-dimension-simplifier", "DynamicDimensionSimplifier", "xla/hlo/transforms/simplifiers/dynamic_dimension_simplifier.h"),
    ("gather_expander", "GatherExpander", "xla/service/gather_expander.h"),
    ("gather_simplifier", "GatherSimplifier", "xla/hlo/transforms/simplifiers/gather_simplifier.h"),
    ("tree_reduction_rewriter", "TreeReductionRewriter", "xla/hlo/transforms/simplifiers/tree_reduction_rewriter.h"),
    ("reshape-mover", "ReshapeMover", "xla/hlo/transforms/simplifiers/reshape_mover.h"),
    ("constant_folding", "HloConstantFolding", "xla/hlo/transforms/simplifiers/hlo_constant_folding.h"),
    ("scatter_simplifier", "ScatterSimplifier", "xla/service/scatter_simplifier.h"),
    ("transpose-folding", "TransposeFolding", "xla/service/transpose_folding.h"),
    ("layout-assignment", "CpuLayoutAssignment", "xla/service/layout_assignment.h"),
    ("shape-canonicalizer", "ShapeCanonicalizer", "xla/hlo/transforms/shape_canonicalizer.h"),
    ("reshape-decomposer", "ReshapeDecomposer", "xla/hlo/transforms/expanders/reshape_decomposer.h"),
    ("dot-library-rewriter", "LibraryRewriter", "xla/backends/cpu/transforms/library_rewriter.h"),
    ("fusion", "CpuInstructionFusion", "xla/service/instruction_fusion.h"),
    ("fusion-wrapper", "FusionWrapper", "xla/service/cpu/fusion_wrapper.h"),
    ("cpu-parallel-task-assigner", "ParallelTaskAssigner", "xla/service/cpu/parallel_task_assignment.h"),
    ("copy-insertion", "CopyInsertion", "xla/service/copy_insertion.h"),
    ("cpu_multi_output_fusion", "CpuMultiOutputFusion", "xla/service/cpu/cpu_multi_output_fusion.h"),
    ("rematerialization", "HloRematerialization", "xla/hlo/transforms/simplifiers/hlo_rematerialization.h"),
    ("tuple-simplifier", "TupleSimplifier", "xla/hlo/transforms/simplifiers/tuple_simplifier.h"),
]
pd = json.load(open(os.path.join(X.OUT, "passes_diff.json")))
seen = {w: collections.Counter(s["pass"] for s in pd["programs"][w]["steps"]) for w in ("attn", "step")}

catalog = []
for name, cls, hdr in NAMES:
    try:
        loc = XL(hdr, r'return "%s"' % re.escape(name))
    except (ValueError, FileNotFoundError) as e:
        loc = {"error": str(e)}
    gl = gpu_cls.get(cls, [])
    if cls == "AlgebraicSimplifier":
        gl = gpu_cls.get("GpuAlgebraicSimplifier", [])
    if cls == "CpuLayoutAssignment":
        gl = gpu_cls.get("GpuLayoutAssignment", [])
    if cls == "CpuInstructionFusion":
        gl = gpu_cls.get("PriorityFusion", [])
    if cls == "CpuMultiOutputFusion":
        gl = gpu_cls.get("MultiOutputFusion", [])
    catalog.append({"name": name, "cls": cls, "header": loc, "cpu_lines": cpu_cls.get(cls, []), "gpu_lines": gl,
                    "changed_attn": seen["attn"].get(name, 0), "changed_step": seen["step"].get(name, 0)})
    print("%-34s %-28s %s:%s cpu %s gpu %s attn %d step %d" % (name, cls, loc.get("file", "?"), loc.get("line", "?"),
          cpu_cls.get(cls, [])[:4], gl[:3], seen["attn"].get(name, 0), seen["step"].get(name, 0)))

# GPU-only passes worth naming (fusion, Triton, collectives, remat, scheduling)
GPU_ONLY = ["PriorityFusion", "MultiOutputFusion", "GemmFusion", "SoftmaxRewriterTriton", "GemmRewriter",
            "HloRematerialization", "ReduceScatterCreator", "AllReduceReassociate", "GpuAllReduceCombiner",
            "CollectivePipeliner", "DotMerger", "LayoutNormalization", "HostOffloader", "DoubleBufferLoopUnrolling"]
gpu_only = [{"cls": c, "gpu_lines": gpu_cls.get(c, []), "in_cpu": c in cpu_cls} for c in GPU_ONLY]
for g in gpu_only:
    print("GPU", g)

quotes = {
    "fusion_kinds": XL("xla/hlo/ir/hlo_instruction.h", r"^  enum class FusionKind \{", ctx=5),
    "kinds_doc_input": XL("xla/hlo/ir/hlo_instruction.h", r"//  - kInput: The primary node is the root"),
    "kinds_doc_output": XL("xla/hlo/ir/hlo_instruction.h", r"//  - kOutput: The primary node is not the root", ctx=3),
    "kinds_doc_loop": XL("xla/hlo/ir/hlo_instruction.h", r"//  - kLoop: The primary node is the root of the fused", ctx=4),
    "kinds_doc_custom": XL("xla/hlo/ir/hlo_instruction.h", r"//  - kCustom: Custom category", ctx=1),
    "kinds_todo": XL("xla/hlo/ir/hlo_instruction.h", r"TODO\(b/79869434\): This categorization scheme is not great", ctx=1),
    "is_expensive": XL("xla/service/instruction_fusion.cc", r"^/\*static\*/ bool InstructionFusion::IsExpensive\("),
    "expensive_exp": XL("xla/service/instruction_fusion.cc", r"case HloOpcode::kExp:"),
    "cheap_list_start": XL("xla/service/instruction_fusion.cc", r"// Cheap instructions\.$"),
    "no_duplicate": XL("xla/service/instruction_fusion.cc", r"// Cost condition: don't duplicate expensive instructions\.", ctx=12),
    "root_rule": XL("xla/service/instruction_fusion.cc", r'"not fusing into the output of the root instruction"'),
    "base_kind": XL("xla/service/instruction_fusion.cc", r"^HloInstruction::FusionKind InstructionFusion::ChooseKind\(", ctx=3),
    "cpu_should_fuse": XL("xla/service/cpu/cpu_instruction_fusion.cc", r"^FusionDecision CpuInstructionFusion::ShouldFuse\("),
    "cpu_nonscalar_const": XL("xla/service/cpu/cpu_instruction_fusion.cc", r'"Don\'t fuse non-scalar constants\."'),
    "cpu_concat": XL("xla/service/cpu/cpu_instruction_fusion.cc", r'"Concatenate fusion is inefficient\."'),
    "cpu_not_profitable": XL("xla/service/cpu/cpu_instruction_fusion.cc", r"// Cost condition: not fuse \(simple, expensive producers\) and \(consumers who", ctx=6),
    "cpu_max_reductions": XL("xla/service/cpu/cpu_instruction_fusion.cc", r"static constexpr int64_t kMaxReductionsInFusion = 5;"),
    "cpu_no_output_fusion": XL("xla/service/cpu/cpu_instruction_fusion.cc", r"// Output fusion is not currently supported on CPUs\.", ctx=4),
    "cpu_dot_blackbox": XL("xla/service/cpu/cpu_instruction_fusion.cc", r'// In the general case we call out to optimized "black box" GEMM routines', ctx=1),
    "cpu_dup": XL("xla/service/cpu/cpu_instruction_fusion.cc", r'"Code duplication too high"'),
    "cpu_choose_kind": XL("xla/service/cpu/cpu_instruction_fusion.cc", r"^HloInstruction::FusionKind CpuInstructionFusion::ChooseKind\(", ctx=4),
    "cpu_fusion_added": XL("xla/service/cpu/cpu_compiler.cc", r"pipeline\.AddPass<CpuInstructionFusion>\(", ctx=2),
    "cpu_mof_cond": XL("xla/service/cpu/cpu_compiler.cc", r"if \(use_multi_output_fusion\) \{", ctx=3),
    "cpu_library": XL("xla/service/cpu/cpu_compiler.cc", r'HloPassPipeline lib_pipeline\("dot-library-passes"\);', ctx=3),
    "cpu_copy_insertion_comment": XL("xla/service/cpu/cpu_compiler.cc", r"// Copy insertion should be performed immediately before IR emission to", ctx=5),
    "ynn_defaults": XL("xla/debug_options_flags.cc", r"opts\.add_xla_cpu_experimental_ynn_fusion_type\(", ctx=5),
    "ynn_help": XL("xla/debug_options_flags.cc", r'"xla_cpu_experimental_ynn_fusion_type",$', ctx=17, nth=0),
    "gpu_priority_fusion": XL("xla/service/gpu/fusion_pipeline.cc", r"fusion\.AddPass<PriorityFusion>\("),
    "gpu_multi_output": XL("xla/service/gpu/fusion_pipeline.cc", r"fusion\.AddPass<MultiOutputFusion>\("),
    "gpu_remat": XL("xla/service/gpu/gpu_compiler.cc", r"pipeline\.AddPass<HloRematerialization>\("),
    "gpu_softmax_triton": XL("xla/service/gpu/gpu_compiler.cc", r"pipeline\.AddPass<SoftmaxRewriterTriton>\("),
    "gpu_gemm_fusion": XL("xla/service/gpu/gpu_compiler.cc", r"pipeline\.AddPass<GemmFusion>\("),
    "remat_modes": XL("xla/hlo/transforms/simplifiers/hlo_rematerialization.h", r"struct RematerializationModeConfig", ctx=8),
    "remat_algorithms": XL("xla/hlo/transforms/simplifiers/hlo_rematerialization.h", r"enum class RematAlgorithm \{", ctx=7),
    "remat_min_limit": XL("xla/hlo/transforms/simplifiers/hlo_rematerialization.h", r"kMinimumCostEstimateMemoryLimitBytes =", ctx=1),
    "cse_doc": XL("xla/service/hlo_cse.h", r"^// A pass which performs common-subexpression elimination", ctx=3),
}
for k, v in quotes.items():
    print(k, v["file"], v["line"])

X.save("pipeline_src.json", {
    "xla_commit": X.XLA_REV, "jax_pin": "jax-v0.11.2 MODULE.bazel pins this commit",
    "counts": {"cpu_addpass": len(cpu), "gpu_addpass": len(gpu) + len(gfu),
               "cpu_classes": len(cpu_cls), "gpu_classes": len(gpu_cls),
               "shared_classes": len(set(cpu_cls) & set(gpu_cls))},
    "catalog": catalog, "gpu_only": gpu_only, "quotes": quotes,
})
