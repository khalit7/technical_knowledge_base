// ---- Compiler explorer: versions, quizzes, sources ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('t-compile'))return;
  const M=D.meta;
  document.querySelectorAll('#t-compile [data-cmp="nvccver"]').forEach(e=>{e.textContent='nvcc from CUDA '+M.cuda+' ('+M.nvcc+')'});
  document.querySelectorAll('#t-compile [data-cmp="tritonver"]').forEach(e=>{e.textContent='Triton '+M.triton});
  document.querySelectorAll('#t-compile .cmp-q').forEach(q=>X.quiz(q));
  const a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  X.$('cmp-src').innerHTML='<ul>'+
    '<li><b>Toolchain (run here, '+M.date+'):</b> CUDA toolkit '+M.cuda+' ('+X.esc(M.nvcc)+') for Linux arm64, Docker image <code>kb-gpu-lab:1</code> ('+X.esc(M.image)+'...), base <code>'+X.esc(M.base.split('@')[0])+'</code>; Triton '+M.triton+' (its wheel bundles '+X.esc(M.tritonPtxas)+'); PyTorch '+M.torch+' (CPU build, for the interpreter check). No NVIDIA GPU: compile only.</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/compute-capabilities.html','CUDA Programming Guide v'+M.guide+', 5.1 Compute Capabilities')+': per-SM limits (tables 30 and 31), architecture-specific ("a") and family-specific ("f") targets.</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/cuda-platform.html','CUDA Programming Guide 1.3.4')+': binary compatibility, PTX compatibility, JIT compilation, binary finalization.</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/parallel-thread-execution/index.html','PTX ISA '+M.ptxisa)+': mma, wgmma and tcgen05 shapes, matrix descriptors, Tensor Memory (512 columns x 128 lanes of 32-bit cells per CTA on sm_100a).</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/cuda-binary-utilities/index.html','CUDA Binary Utilities 13.4')+': cuobjdump, nvdisasm and the SASS instruction-set tables used for every opcode description on this tab.</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/index.html','nvcc documentation')+': the compilation trajectory, <code>-arch</code>/<code>-gencode</code>, <code>--keep</code>, <code>-Xptxas -v</code>.</li>'+
    '<li>'+a('https://docs.nvidia.com/cuda/ampere-tuning-guide/index.html','NVIDIA Ampere tuning guide')+': "CUDA reserves 1 KB of shared memory per thread block".</li>'+
    '<li>NVIDIA <code>cuda_occupancy.h</code> (in the toolkit): the occupancy rules ported here and used to validate them.</li>'+
    '<li>'+a('https://triton-lang.org/main/python-api/generated/triton.language.dot.html','Triton tl.dot documentation')+' (TF32 default for FP32 inputs) and Triton\'s source (<code>triton/runtime/jit.py</code>, <code>backends/compiler.py</code>) for launch specialisation.</li>'+
    '<li>'+a('https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/','NVIDIA Hopper architecture in depth')+' (H100 SXM5: 132 SMs).</li>'+
    '</ul><p>All raw outputs (PTX, SASS, ptxas reports, errors, Triton IR at every stage) and the scripts that produced them are in <code>src/compile/</code> of this page; <code>run_all.sh</code> reproduces them.</p>';
})();
