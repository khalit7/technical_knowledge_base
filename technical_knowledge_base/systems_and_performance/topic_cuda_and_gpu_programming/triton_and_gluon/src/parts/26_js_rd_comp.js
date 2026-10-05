// ---- Reading sections 7 and 8: stages boxes, the pass strip, before/after IR, the linear layout print ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id),esc=RD.esc;
  const main={};D.main.forEach(r=>main[r.key+'.'+r.target]=r);
  const m=main['matmul.sm_90a'];
  const nf=n=>n.toLocaleString('en-US');
  const st=[
    ['Python source','the @triton.jit function','The decorator parses your function; nothing runs in Python at launch except building the key.','var(--c6)'],
    ['TTIR',nf(m.ttir_lines)+' lines','Triton IR: tt.load, tt.dot, tt.reduce on whole tensors, no threads. The same for every NVIDIA target.','var(--c1)'],
    ['TTGIR',nf(m.ttgir_lines)+' lines','TritonGPU IR: the same program with a layout on every tensor, shared-memory buffers, async copies and the chosen MMA. Target-specific.','var(--c2)'],
    ['LLVM IR',nf(m.llir_lines)+' lines','Per-thread scalar code with NVVM (or AMDGPU) intrinsics: from here on it is an ordinary compiler.','var(--c3)'],
    ['PTX / AMDGCN',nf(m.ptx_lines)+' lines','NVIDIA\'s virtual ISA from LLVM\'s NVPTX back end, or AMD machine assembly.','var(--c4)'],
    ['cubin / hsaco',nf(m.sass_lines)+' SASS instructions','ptxas (bundled in the Triton wheel) turns PTX into SASS for one GPU; AMD links a code object.','var(--c5)']];
  $('rd-stages').innerHTML=st.map(s=>'<div style="--sc:'+s[3]+'"><div class="k">'+s[0]+'</div><div class="v">'+s[1]+'</div><p>'+s[2]+'</p></div>').join('');
  // ---- pass strip ----
  const CAT=[[/^(inline|canonicalize|cse|symbol-dce|sccp|triton-combine|triton-reorder-broadcast|triton-loop-unroll|triton-licm|triton-loop-aware-cse|gluon-inline|triton-rewrite-tensor-descriptor-to-pointer)$/,'var(--dim)','clean-up'],
    [/^(convert-triton-to-tritongpu|tritongpu-coalesce|tritongpu-remove-layout-conversions|tritongpu-optimize-thread-locality|tritongpu-reduce-data-duplication|triton-nvidia-gpu-plan-cta|triton-nvidia-optimize-descriptor-encoding|triton-nvidia-optimize-tmem-layouts|tritongpu-coalesce-async-copy)$/,'var(--c1)','layouts'],
    [/^(tritongpu-F32DotTC|tritongpu-accelerate-matmul|tritongpu-optimize-dot-operands|triton-nvidia-mma-lowering|triton-nvidia-tmem-load-reduce|triton-nvidia-interleave-tmem)$/,'var(--c2)','matmul'],
    [/^(tritongpu-fuse-nested-loops|tritongpu-combine-tensor-select-and-if|nvgpu-warp-specialization|tritongpu-assign-latencies|tritongpu-schedule-loops|tritongpu-pipeline|tritongpu-prefetch|tritongpu-reorder-instructions|convert-scf-to-cf|triton-nvidia-tma-lowering)$/,'var(--c3)','loops'],
    [/^(tritongpu-allocate-warp-groups|allocate-shared-memory-nv|triton-tensor-memory-allocation|triton-nvidia-check-matmul-two-cta|triton-nvidia-gpu-fence-insertion|triton-nvidia-gpu-proxy-fence-insertion|triton-nvidia-gpu-tmem-barrier-insertion|initialize-ws-cluster-barriers)$/,'var(--c4)','memory, barriers'],
    [/./,'var(--c5)','to LLVM']];
  const cat=n=>CAT.find(c=>c[0].test(n));
  const DESC={
    'convert-triton-to-tritongpu':'Attaches a default blocked layout to every tensor and records num-warps and the target: TTIR becomes TTGIR.',
    'tritongpu-coalesce':'Gives each load and store the layout with the longest run of contiguous, aligned elements per thread (so the widest vector access), inserting convert_layout around them.',
    'tritongpu-F32DotTC':'Rewrites FP32 dots for the precision you asked for (e.g. splits for tf32x3). Nothing to do for FP16 inputs.',
    'tritongpu-remove-layout-conversions':'Propagates layouts through the program and deletes the convert_layout operations it can; each one left costs a data exchange between threads.',
    'tritongpu-accelerate-matmul':'Chooses the tensor-core path for tt.dot and its accumulator layout: mma.sync (nvidia_mma v2) on sm_80, warp_group_dot (v3) on sm_90a, tc_gen5_mma with tensor memory on sm_100a; operands are routed through shared memory where the instruction reads them there.',
    'tritongpu-optimize-dot-operands':'Picks how operands reach the MMA (shared-memory layouts, transposes folded into the load).',
    'tritongpu-optimize-thread-locality':'Rearranges reductions so more of the work happens inside each thread before threads exchange values.',
    'nvgpu-warp-specialization':'Splits loops marked warp_specialize into producer and consumer warp partitions (not used by this kernel).',
    'tritongpu-assign-latencies':'Marks which operations (the loads) take long and how many iterations ahead they must start, from num_stages.',
    'tritongpu-schedule-loops':'Assigns each operation in the loop a pipeline stage and order (loop.stage, loop.cluster attributes): loads in stage 0, the MMA in the last stage.',
    'tritongpu-pipeline':'Rewrites the loop as a software pipeline: allocates the multi-buffered shared memory, turns loads into async copies, peels a prologue that starts the first copies, and inserts the waits.',
    'tritongpu-prefetch':'(mma.sync path) Loads the next slice of the operands from shared memory into registers while the current MMAs run.',
    'tritongpu-reduce-data-duplication':'Avoids several threads holding the same values when converting layouts.',
    'tritongpu-reorder-instructions':'Moves operations closer to their uses to shorten live ranges (fewer registers).',
    'triton-nvidia-gpu-fence-insertion':'Inserts the memory fences the asynchronous units need before they read shared memory written by threads.',
    'tritongpu-allocate-warp-groups':'Assigns warps to warp-specialised partitions and records the total warp count.',
    'allocate-shared-memory-nv':'Gives every shared buffer an offset and sets the program\'s total shared memory (the metadata.shared that the launcher checks).',
    'triton-tensor-memory-allocation':'Allocates Blackwell tensor-memory columns for accumulators.',
    'convert-triton-gpu-to-llvm':'Lowers everything to the LLVM dialect, per thread: each tensor op becomes the scalar or vector code for the registers this thread owns. The IR grows by two orders of magnitude here.',
    'canonicalize-llvm-ir':'Cleans the freshly lowered code; with the next cse it shrinks it severalfold.',
    'convert-nv-gpu-to-llvm':'Lowers NVIDIA-specific operations (wgmma, barriers, TMA) to inline PTX.',
    'convert-nvvm-to-llvm':'Lowers remaining NVVM operations to LLVM intrinsics; after this the module goes to LLVM, then PTX.'};
  let key='matmul.sm_90a',sel=-1;
  function strip(){
    const P=D.passes[key].rows,box=$('rd-pass-strip'),W=Math.min(860,RD.width(box)),per=Math.max(6,Math.floor((W-4)/Math.min(P.length,W<500?37:P.length))),cols=Math.floor((W-4)/per),rows=Math.ceil(P.length/cols),H=rows*(per+4)+4;
    let g='';P.forEach((p,i)=>{const c=cat(p[0]),x=2+(i%cols)*per,y=2+Math.floor(i/cols)*(per+4);
      g+='<rect data-i="'+i+'" x="'+x+'" y="'+y+'" width="'+(per-2)+'" height="'+per+'" rx="2" fill="'+(p[1]?c[1]:'var(--bg)')+'" stroke="'+c[1]+'" stroke-width="'+(i===sel?2.6:1.2)+'" style="cursor:pointer"><title>'+i+': '+p[0]+'</title></rect>'});
    box.innerHTML=RD.svg(W,H,g,'Compiler passes');
    if(sel<0)sel=P.findIndex(p=>p[0]===(key.startsWith('vadd')?'tritongpu-coalesce':'tritongpu-accelerate-matmul'));
    if(sel<0)sel=0;cap();
  }
  function cap(){const P=D.passes[key].rows,p=P[sel],c=cat(p[0]),nx=P[sel+1];
    $('rd-pass-cap').innerHTML='<div class="t">Pass '+(sel+1)+' of '+P.length+': <code>'+esc(p[0])+'</code> <span class="mute small">('+c[2]+')</span></div><p>'+esc(DESC[p[0]]||(p[1]?'Simplifies or tidies the IR.':'No visible effect on this kernel.'))+'</p><p class="small mute">IR before: '+nf(p[2])+' lines'+(nx?'; after: '+nf(nx[2])+' lines':'')+(p[1]?'':' (unchanged)')+'.</p>';
    $('rd-pass-strip').querySelectorAll('rect').forEach(r=>r.setAttribute('stroke-width',+r.dataset.i===sel?2.6:1.2))}
  $('rd-pass-strip').addEventListener('click',e=>{const r=e.target.closest('rect');if(!r)return;sel=+r.dataset.i;cap()});
  RD.seg($('rd-pass-k'),k=>{key=k;sel=-1;strip()});
  const R=D.passes['matmul.sm_90a'].rows,chg=R.filter(r=>r[1]).length,ll=R.find(r=>r[0]==='convert-triton-gpu-to-llvm'),li=R.indexOf(ll);
  $('rd-npass').textContent=R.length+' passes, of which '+chg+' changed the IR; the lowering to LLVM takes it from '+nf(ll[2])+' lines to '+nf(R[li+1][2])+', and clean-up brings that back to '+nf(R[li+3][2]);
  strip();RD.onRender(strip);RD.onResize(strip);
  // ---- before / after ----
  const S=D.passes['matmul.sm_90a'].snaps;let bm='acc',side='before';
  const hl=(l,re)=>re.test(l)?'<mark>'+esc(l)+'</mark>':esc(l);
  function ba(){
    let lines,re,capt;
    if(bm==='acc'){lines=S[side+' tritongpu-accelerate-matmul'].x;re=/tt\.dot|warp_group_dot|#mma|nvmma_shared|local_alloc|dot_op/;
      capt=side==='before'?'Before: tt.dot works on register tensors in a generic blocked layout, with its operands converted to dot_op layouts. No tensor-core instruction has been chosen yet.':'After: tt.dot became ttng.warp_group_dot (wgmma). It reads A and B from shared memory (local_alloc into nvmma_shared buffers with 64- and 128-byte swizzles) and accumulates in the #mma layout, versionMajor 3, instrShape [16, 128, 16].'}
    else{lines=S[side+' tritongpu-pipeline'].x;re=/async|local_alloc|loop\.stage|warp_group_dot|scf\.for/;
      if(side==='before'){const i=lines.findIndex(l=>/tt\.store/.test(l));lines=lines.slice(0,i+1)}
      capt=side==='before'?'Before: one load of A and one of B per iteration, then the MMA. schedule-loops has tagged the loads loop.stage = 0 and the MMA loop.stage = 3: with num_stages = 4, loads run 3 iterations ahead.':'After: two 4-deep buffers (memdesc<4x128x32>, memdesc<4x32x128>), a prologue that starts 3 iterations of async copies before the loop, and in the loop an async_wait {num = 4} (wait until at most 4 groups of copies are still in flight), an asynchronous wgmma, a wait leaving 1 MMA pending, and the copies for 3 iterations ahead.'}
    $('rd-ba-ir').innerHTML=lines.map(l=>hl(l,re)).join('\n');$('rd-ba-cap').innerHTML='<p>'+esc(capt)+'</p>';
  }
  RD.seg($('rd-ba-mode'),v=>{bm=v;ba()});RD.seg($('rd-ba-side'),v=>{side=v;ba()});ba();
  // ---- linear layout print ----
  const L0=D.gluon.layouts[0];
  $('rd-ll-print').textContent=L0.printed.replace('DistributedLinearLayout(','').replace(/\)$/,'').replace(/, (?=\w+_bases|shape)/g,',\n');
  $('rd-ll-row').textContent=D.exp.tutorial_table_row0.join(', ');
})();
