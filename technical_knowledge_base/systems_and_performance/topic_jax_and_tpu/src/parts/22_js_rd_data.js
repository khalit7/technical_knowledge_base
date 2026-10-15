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
 // the running example's train step (Compiler lab): primitive count in the jaxpr, fusions in optimised HLO, kernels launched by eager PyTorch per step
 trace:{ops:null,fusions:null,torchKernels:null},
 // the running example's train step through the pipeline (Compiler lab): lines or ops at each stage, and compile time
 xla:null
};
