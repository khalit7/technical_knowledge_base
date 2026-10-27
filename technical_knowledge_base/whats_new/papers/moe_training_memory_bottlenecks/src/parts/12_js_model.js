// ---- The four live sets as formulas (Table 1), shared by the Reading calculator and the live tab ----
// Sizes in bytes per rank. Every input is from the paper (Appendix A, Tables 2, 5, 10, 14) or a model config;
// the constants that turn Table 1's O() into numbers are stated beside each term and labelled illustrative on the page.
const HBM=141e9; // H200 SXM: 141 GB (NVIDIA product page)
const MODELS={
  oss20:{n:'gpt-oss-20b, 8 GPUs',H:2880,V:201088,k:4,L:24,nb:47,Th:21e9,W:8,src:'gpt-oss-20b config: hidden 2,880, 24 layers, top-4; 47 checkpoint boundaries (Table 5); 21B parameters (model card)'},
  m120:{n:'120B, 16 GPUs',H:7168,V:200000,k:8,L:7,nb:14,Th:120e9,W:16,src:'Appendix A: H = 7,168, 384 experts, top-8, V = 200,000, 7 layers'},
  m241:{n:'241B, 32 GPUs',H:7168,V:200000,k:8,L:14,nb:28,Th:241e9,W:32,src:'Appendix A: the same widths, 14 layers'},
  m667:{n:'667B, 64 GPUs',H:7168,V:200000,k:8,L:39,nb:78,Th:667e9,W:64,src:'Appendix A: the same widths, 39 layers'}
};
const BF=2, F32=4, PGRP=8, CBUD=6554, STAGE=2*142.076e6*16;
// before: the unbounded live set; after: the operator's bounded working set
function liveSets(m,N){const M=MODELS[m];return [
  {id:'disp',n:'Expert dispatch',sn:'Dispatch',c:'var(--c1)',op:'PipelinedLLEP',
   b:2*M.k*N*M.H*BF, a:2*M.k*Math.min(N,CBUD)*M.H*BF,
   hb:'2 R<sub>d</sub> H b with R<sub>d</sub> = kN, one destination\'s share under balanced routing (a skewed router under standard EP can multiply it)',
   ha:'one chunk of c = 6,554 tokens per source at the even share 2 k c H b (Table 8: strided chunks realise exactly that); the guarantee is E<sub>p</sub> times it'},
  {id:'logit',n:'Vocabulary projection',sn:'Logits',c:'var(--c2)',op:'Ring-DTP',
   b:3*N*M.V*F32, a:4*N*(M.V/PGRP)*F32,
   hb:'three N × V FP32 tensors (logits, log-softmax, their gradient), which is exactly what Table 10 measures',
   ha:'about four strips of N × V/P at P = 8, as Table 10 measures (6.15 GiB at N = 16,384)'},
  {id:'bnd',n:'Checkpoint boundaries',sn:'Boundaries',c:'var(--c3)',op:'SCO',
   b:M.nb*N*M.H*BF, a:2*N*M.H*BF,
   hb:'one N × H BF16 tensor per checkpoint boundary held from forward to backward',
   ha:'every boundary in host memory, at most two restored on the device (Eq. 4)'},
  {id:'state',n:'Model state',sn:'Model state',c:'var(--c4)',op:'offload + OffloadStreamAdamW',
   b:16*M.Th/M.W, a:4*M.Th/M.W+STAGE,
   hb:'16 bytes per parameter (§2), sharded over W ranks',
   ha:'4Θ/W of BF16 weights and gradients, plus 4.23 GiB of staging (two 142M-parameter buckets, Table 14)'}]}
// a rough peak: resident state + held boundaries + the larger of the two transients (they do not coexist)
const roughPeak=(S,on)=>{const v=id=>{const s=S.find(x=>x.id===id);return on[id]?s.a:s.b};return v('state')+v('bnd')+Math.max(v('disp'),v('logit'))};
