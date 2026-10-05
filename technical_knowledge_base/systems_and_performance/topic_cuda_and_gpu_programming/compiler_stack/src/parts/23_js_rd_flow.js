// ---- Reading: the two roads (clickable stages), the predict box, and the nvcc --dryrun animation ----
(function(){
  const D=window.CSD,E=RD.esc;
  const A=[
    ['CUDA C++','softmax.cu','You write a kernel and the host code that launches it.','the source','var(--c1)'],
    ['gcc -E, cudafe++','.ii, .cudafe1.cpp','Preprocess; split host from device; replace each launch with a stub.','nvcc --dryrun, --keep','var(--c1)'],
    ['cicc (NVVM)','PTX','Optimise with LLVM, print PTX, the portable assembly language.','nvcc -ptx, --keep, cuobjdump -ptx','var(--c4)'],
    ['ptxas','SASS in a cubin','Allocate registers, schedule, encode machine code for one GPU.','-Xptxas -v, cuobjdump -sass, nvdisasm','var(--c2)'],
    ['fatbinary','fat binary','Pack every SASS and PTX image into one container inside the .o.','cuobjdump -lelf -lptx','var(--c5)'],
    ['driver','loaded module','Pick the SASS for this GPU, or JIT-compile the PTX, and cache it.','CUDA_CACHE_PATH, CUDA_FORCE_PTX_JIT','var(--c3)']];
  const B=[
    ['Python','your model','Ordinary PyTorch code, run under torch.compile.','the source','var(--c1)'],
    ['Dynamo','FX graph + guards','Read the bytecode, record tensor operations into a graph, write guards that say when it can be reused.','TORCH_LOGS=graph_code,guards,graph_breaks','var(--c6)'],
    ['AOTAutograd','forward and backward graphs','Trace the backward pass ahead of time; decide what to save and what to recompute.','TORCH_LOGS=aot_graphs','var(--c4)'],
    ['Inductor','Triton (GPU) or C++ (CPU)','Lower to loops, fuse, write one kernel per fused group plus a Python wrapper; matmuls go to libraries.','TORCH_LOGS=output_code,fusion','var(--c2)'],
    ['Triton compiler','PTX','TTIR, TTGIR (layouts), LLVM IR, PTX: the Triton page owns these stages.','MLIR_ENABLE_DUMP=1, the Triton cache','var(--c5)'],
    ['ptxas, driver','SASS','The same assembler and the same loading rules as road 1.','cuobjdump on Triton’s cubin','var(--c3)']];
  function draw(id,arr,road){const el=document.getElementById(id);
    el.innerHTML=arr.map((s,i)=>'<div tabindex="0" role="button" data-i="'+i+'" style="--sc:'+s[4]+'"><b>'+E(s[0])+'</b><code>'+E(s[1])+'</code></div>').join('');
    el.addEventListener('click',e=>{const d=e.target.closest('div[data-i]');if(!d)return;pick(road,+d.dataset.i)});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'){const d=e.target.closest('div[data-i]');if(d)pick(road,+d.dataset.i)}});}
  function pick(road,i){const arr=road==='A'?A:B,s=arr[i];
    document.querySelectorAll('#cs-flowA>div,#cs-flowB>div').forEach(d=>d.classList.remove('on'));
    document.querySelector('#cs-flow'+road+'>div[data-i="'+i+'"]').classList.add('on');
    document.getElementById('cs-flowInfo').innerHTML='<b>'+E(s[0])+'</b> produces <b>'+E(s[1])+'</b>. '+E(s[2])+'<br><span class="small mute">How to see it: <code>'+E(s[3])+'</code></span>';}
  draw('cs-flowA',A,'A');draw('cs-flowB',B,'B');pick('A',2);
  // predict box
  const pr=document.getElementById('cs-pr0');
  pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='2')x.classList.add('right')});
    if(b.dataset.a!=='2')b.classList.add('wrong');
    const im=D.fat.arch_sm90a.images.map(x=>x[0]+' '+x[1]).join(', ');
    const a=pr.querySelector('.ans');a.hidden=false;
    a.innerHTML='Three. <code>cuobjdump -lelf -lptx</code> on the object lists: <b>'+E(im)+'</b>. The NVCC manual says why: with an architecture-specific target "both architecture-specific and non-architecture-specific virtual code are added" (<a href="https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/index.html#gpu-architecture-arch" target="_blank" rel="noopener noreferrer">nvcc manual, --gpu-architecture</a>). <code>-arch=sm_90</code> gives two: '+E(D.fat.arch_sm90.images.map(x=>x[0]+' '+x[1]).join(', '))+'.';});
  // nvcc --dryrun animation
  const keep={};D.keep.forEach(k=>keep[k[0]]=+k[1]);
  const kb=n=>n>=1e6?(n/1e6).toFixed(2)+' MB':n>=1e3?(n/1e3).toFixed(1)+' KB':n+' B';
  // per step: tool prefix (checked against the real command), title, text, files made (keep names; sizes from the sm_90a --keep build)
  const SA=[
    ['gcc','Preprocess the host side','The host compiler expands includes and macros once for the CPU side. __CUDA_ARCH_LIST__=900 tells headers which targets are being built.',['softmax.cpp4.ii']],
    ['cudafe++','Split host from device','NVIDIA’s front end keeps the host code, replaces the launch with a stub, and writes C++ the host compiler can build.',['softmax.compute_90a.cudafe1.cpp','softmax.compute_90a.cudafe1.stub.c']],
    ['gcc','Preprocess for compute_90','The device side again, with __CUDA_ARCH__=900: the generic Hopper target.',['softmax.compute_90.cpp1.ii']],
    ['"$CICC_PATH/cicc"','cicc: device code to PTX (compute_90)','Parse, optimise with LLVM, print PTX for the generic virtual target.',['softmax.compute_90.ptx']],
    ['ptxas','Check the generic PTX','ptxas -arch=compute_90 assembles nothing; it only checks that this PTX is valid. A Hopper-only instruction fails here (section 4).',[]],
    ['gcc','Preprocess for compute_90a','The device side a third time, now also defining __CUDA_ARCH_FEAT_SM90_ALL and __CUDA_ARCH_SPECIFIC__=900: the Hopper-specific target.',['softmax.compute_90a.cpp1.ii']],
    ['"$CICC_PATH/cicc"','cicc: device code to PTX (compute_90a)','The PTX that may use wgmma and setmaxnreg.',['softmax.compute_90a.ptx']],
    ['ptxas','ptxas: PTX to SASS for sm_90a','Register allocation, scheduling, encoding: the H100’s machine code, in a cubin.',['softmax.compute_90a.sm_90a.cubin']],
    ['fatbinary','Pack the fat binary','Three images: PTX compute_90, SASS sm_90a, PTX compute_90a, written as a C array the host compiler can include.',['softmax.fatbin','softmax.fatbin.c']],
    ['rm','Clean up','The binary form is no longer needed; the C array carries it.',[]],
    ['gcc','Compile the host side','The host C++ with the stub and the fat binary inside: the object your linker will see.',['softmax.o']]];
  const SP=[
    ['gcc','Preprocess the host side','As before.',['softmax.cpp4.ii']],
    ['cudafe++','Split host from device','As before.',['.cudafe1.cpp','.cudafe1.stub.c']],
    ['gcc','Preprocess for compute_90','One device pass only: there is no architecture-specific target.',['.cpp1.ii']],
    ['"$CICC_PATH/cicc"','cicc: device code to PTX (compute_90)','The generic PTX.',['.ptx']],
    ['ptxas','ptxas: PTX to SASS for sm_90','Machine code for compute capability 9.0, from the same PTX that will be shipped.',['.sm_90.cubin']],
    ['fatbinary','Pack the fat binary','Two images: SASS sm_90 and PTX compute_90.',['.fatbin.c']],
    ['rm','Clean up','',[]],
    ['gcc','Compile the host side','',['softmax.o']]];
  let mode='a';
  const cmds=()=>mode==='a'?D.dryrun:D.dryrun_sm90, meta=()=>mode==='a'?SA:SP;
  function drawStep(i){const M=meta()[i],c=cmds()[i];const ok=c.startsWith(M[0]);
    document.getElementById('cs-nvccCap').innerHTML='<div class="t">Command '+(i+1)+' of '+cmds().length+': '+E(M[1])+(ok?'':' <span class="ann">(order differs)</span>')+'</div><p>'+E(M[2])+'</p>';
    document.getElementById('cs-nvccCmd').textContent=c.length>420?c.slice(0,420)+' ...':c;
    const made=[];for(let j=0;j<=i;j++)meta()[j][3].forEach(f=>made.push([f,j===i]));
    document.getElementById('cs-nvccFiles').innerHTML='<div class="small mute">Files so far'+(mode==='a'?' (sizes from the --keep build)':'')+'</div>'+made.map(f=>'<span class="cs-pill'+(f[1]?' a':'')+'">'+E(f[0])+(mode==='a'&&keep[f[0]]?' '+kb(keep[f[0]]):'')+'</span>').join('');
    const done=meta().slice(0,i+1);
    const nptx=done.filter(m=>m[3].some(f=>/\.ptx$/.test(f))).length,ncub=done.filter(m=>m[3].some(f=>/cubin$/.test(f))).length;
    document.getElementById('cs-nvccCnt').innerHTML=RD.stat('commands run',i+1)+RD.stat('PTX files written',nptx)+RD.stat('cubins (SASS)',ncub)+RD.stat('images in the fat binary',i>=meta().findIndex(m=>m[0]==='fatbinary')?(mode==='a'?D.fat.arch_sm90a.images.length:D.fat.arch_sm90.images.length):'not yet');}
  const an=RD.anim({card:'cs-nvccCard',ctl:'cs-nvccCtl',n:SA.length,draw:drawStep,ms:1900,label:'nvcc command'});
  RD.seg(document.getElementById('cs-nvccMode'),m=>{mode=m;an.reset(meta().length)});
})();
