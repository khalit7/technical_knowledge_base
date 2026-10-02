// ---- Then and now: one card per version ----
(function(){
const ax=(id,t)=>A('https://arxiv.org/abs/'+id,t||('arXiv '+id));
const V=[
 {h:'FlashAttention (May 2022): IO-aware, on the A100',by:'Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré',gpu:'A100 (Ampere), also Turing',
  loop:'K, V blocks outside, Q blocks inside; O, ℓ, m read and written back to HBM on every outer step',
  what:['Tiling with online softmax, so the N × N matrix never reaches HBM','Recomputation in the backward pass from O and (m, ℓ)','One fused kernel: matrix multiply, mask, softmax, dropout, matrix multiply','Started from Apex FMHA; head dimensions 16, 32, 64, 128'],
  num:'2 to 4× over PyTorch attention on an A100; memory linear in N',src:'this paper, '+A(PAPER.meta.ax,'arXiv 2205.14135')},
 {h:'FlashAttention-2 (July 2023): better parallelism and work partitioning',by:'Tri Dao',gpu:'A100',
  left:'"FlashAttention is still not nearly as fast as optimized matrix-multiply (GEMM) operations, reaching only 25-40% of the theoretical maximum FLOPs/s."',
  loop:'Q blocks outside, K, V blocks inside: each Q block loaded once and its output written once; the outer loop "is embarrassingly parallel"',
  what:['Fewer non-matmul FLOPs: rescale the output once at the end instead of dividing at every step','Parallelise over the sequence length as well as batch and heads, which matters for long sequences with small batches','Partition work between warps to avoid the "split-K" scheme and its shared-memory traffic','Store one logsumexp L = m + log ℓ per row instead of (m, ℓ)'],
  num:'about 2× over FlashAttention, 50 to 73% of the A100\'s peak; 225 TFLOPs/s per A100 training GPT-style models (72% model FLOPs utilisation)',src:ax('2307.08691')},
 {h:'FlashAttention-3 (July 2024): asynchrony and low precision on Hopper',by:'Jay Shah, Ganesh Bikshandi, Ying Zhang, Vijay Thakkar, Pradeep Ramani, Tri Dao',gpu:'H100 (Hopper)',
  left:'"FlashAttention-2 achieving only 35% utilization on the H100 GPU."',
  loop:'as FA-2, with producer warps moving data (TMA) while consumer warps compute (Tensor Cores)',
  what:['Warp specialisation to overlap data movement and computation','Interleave block-wise matrix multiplies and softmax so the exponentials hide under the GEMMs','FP8 with block quantisation and incoherent processing for accuracy: multiplying Q and K by random ±1 diagonal matrices and a Hadamard matrix, O(d log d), which can be fused with the rotary embedding'],
  num:'1.5 to 2.0× over FA-2 on H100; up to 740 TFLOPs/s in FP16 (75% utilisation), close to 1.2 PFLOPs/s in FP8, with 2.6× lower FP8 error than a baseline FP8 attention',src:ax('2407.08608')},
 {h:'FlashAttention-4 (March 2026): co-design for asymmetric hardware scaling',by:'Ted Zadouri, Markus Hoehnerbach, Jay Shah, Timmy Liu, Vijay Thakkar, Tri Dao',gpu:'B200, GB200 (Blackwell), also Hopper',
  left:'On Blackwell "tensor core throughput doubles while other functional units (shared memory bandwidth, exponential units) scale more slowly or remain unchanged", so FA-3\'s Hopper design is no longer balanced.',
  loop:'fully asynchronous matrix-multiply pipelines with larger tiles; tensor memory and the 2-CTA MMA mode in the backward pass',
  what:['Software-emulated exponential and conditional softmax rescaling, to cut non-matmul work','Tensor memory and 2-CTA MMA to reduce shared-memory traffic and atomic adds in the backward pass','Written entirely in CuTe-DSL embedded in Python: 20 to 30× faster compile times than C++ templates'],
  num:'up to 1.3× over cuDNN 9.13 and 2.7× over Triton on B200 in BF16, up to 1,613 TFLOPs/s (71% utilisation)',src:ax('2603.05451')}];
function show(i){const v=V[i];$('thCard').innerHTML='<h3 style="margin-top:0">'+v.h+'</h3><p class="small mute">'+v.by+' · '+v.gpu+' · '+v.src+'</p>'+
  (v.left?'<p><b>What the previous version left:</b> '+v.left+'</p>':'')+'<p><b>Loop picture:</b> '+v.loop+(i<2?' ('+'<a href="#" data-tab="t-run">run both orders</a>)':'')+'.</p><ul>'+v.what.map(w=>'<li>'+w+'</li>').join('')+'</ul><p><b>Headline:</b> '+v.num+'.</p>';
  $('thCard').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t="t-run"]').click()}))}
const seg=$('thM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});show(+b.dataset.m)}));
show(0);
})();
