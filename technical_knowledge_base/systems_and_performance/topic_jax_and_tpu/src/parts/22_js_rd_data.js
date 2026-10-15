// ---- Reading tab data (Topic: jax-and-tpu). Published figures are copied from their sources (see src/read/facts.md);
// measured figures come from the labs' outputs via src/read/make_read_data.py (null until a lab has measured them).
window.RDJ={
 // vendor specs as verified on the Hardware topic's TPU page: bf16 peak FLOP/s, HBM bytes/s, HBM capacity in GB (1e9 bytes)
 tpu:[
  {n:'v5e',peak:197e12,bw:819e9,hbm:16,hbmTxt:'16 GB'},
  {n:'v5p',peak:459e12,bw:2765e9,hbm:95*1.073741824,hbmTxt:'95 GiB'},
  {n:'v6e',peak:918e12,bw:1638e9,hbm:32,hbmTxt:'32 GB'},
  {n:'Ironwood',peak:2307e12,bw:7380e9,hbm:192*1.073741824,hbmTxt:'192 GiB'}],
 // parameter counts: the running example (setup's src/data/README.md), a 7B-class model (illustrative round number),
 // LLaMA 3-70B (scaling book part 6: about 70.4e9), Llama 3.1 405B (its name)
 models:[
  {n:'Running example',p:826368,src:'src/data/equiv.json n_params'},
  {n:'7B-class model',p:7e9,src:'illustrative round number'},
  {n:'LLaMA 3-70B',p:70.4e9,src:'scaling book, part 6'},
  {n:'Llama 3.1 405B',p:405e9,src:'model name'}],
 bytesPerParam:16,
 devices:[8,16,64,256,1024,2048,4096,8960],
 // Hugging Face Hub library filter, 2026-10-15
 hf:{pytorch:255916,jax:12404,date:'2026-10-15'},
 // the running example's train step (Compiler lab, src/xla/out/read_numbers.json): jaxpr equations, kernels after XLA (fusions plus
 // library calls such as matmuls; reduction combiner bodies not counted), of which fusions; and the PyTorch twin's eager step: aten operators that do work (views, allocations
 // and scalar reads excluded). The Training lab's torch_ops.json counts 1,309 top-level ATen calls including those; this page quotes 1,302.
 trace:{"ops": 3411, "kernels": 816, "fusions": 783, "torchKernels": 1302},
 // the same train step at each stage, compile times (wall and CPU) and memory_analysis without and with donation (Compiler lab)
 xla:{"stages": [{"n": "jaxpr equations", "v": 3411, "c": "var(--c1)"}, {"n": "StableHLO operations", "v": 5318, "c": "var(--c4)"}, {"n": "HLO instructions (before XLA)", "v": 4932, "c": "var(--c4)"}, {"n": "kernels after XLA (fusions, matmuls, ...)", "v": 816, "c": "var(--c2)"}, {"n": "of which fusions", "v": 783, "c": "var(--c2)"}], "compile_s": 3.596, "compile_cached_s": 0.5827, "compile_cpu_s": 2.335, "compile_cached_cpu_s": 0.1646, "trace_s": 1.624, "mem_no": {"argument_size_in_bytes": 9949192, "output_size_in_bytes": 9918120, "temp_size_in_bytes": 365969476, "alias_size_in_bytes": 0, "total_allocation_bytes": 385839716}, "mem_don": {"argument_size_in_bytes": 9949192, "output_size_in_bytes": 9918120, "temp_size_in_bytes": 366625412, "alias_size_in_bytes": 9916424, "total_allocation_bytes": 376579228}}
};
