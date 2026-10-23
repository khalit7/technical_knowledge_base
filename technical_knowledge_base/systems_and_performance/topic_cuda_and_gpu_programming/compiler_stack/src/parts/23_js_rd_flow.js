// ---- Reading: the hero (six front ends, one assembler), the predict box, and the nvcc --dryrun animation ----
(function(){
  const D=window.CSD,E=RD.esc;
  // ---- hero: six front ends, one assembler (static annotated diagram; click a box for what it produces) ----
  // each road: [name, [box labels top to bottom], 'ptx' or 'sass' (where its last box leads), the label on that link]
  const ROADS=[
    ['CUDA C++',['CUDA C++','cudafe++','cicc: NVVM IR'],'ptx','cicc'],
    ['Triton',['Triton','TTIR, TTGIR','LLVM IR'],'ptx','LLVM NVPTX'],
    ['PyTorch',['PyTorch','Dynamo: FX','Inductor'],'ptx','via Triton'],
    ['JAX',['JAX','StableHLO','XLA HLO'],'ptx','LLVM or Triton'],
    ['TVM',['TVM','Relax','TensorIR'],'ptx','CUDA C, NVRTC'],
    ['cuTile',['cuTile','Tile IR','tileiras'],'sass','no PTX']];
  // info per box: [produces, what it does, how to see it]
  const INFO={
    'CUDA C++|0':['softmax.cu','You write a kernel and the host code that launches it.','the source'],
    'CUDA C++|1':['.ii, .cudafe1.cpp','gcc -E preprocesses; cudafe++ splits host from device and replaces each launch with a stub.','nvcc --dryrun, --keep'],
    'CUDA C++|2':['PTX','Optimise with LLVM inside NVIDIA’s closed cicc, print PTX, the portable assembly language. Fusion is whatever you wrote in one kernel.','nvcc -ptx, --keep, cuobjdump -ptx'],
    'Triton|0':['a block-level kernel','You write one program per block of data; what goes in one @triton.jit is your fusion decision.','the source'],
    'Triton|1':['TTIR, TTGIR (MLIR dialects)','Triton’s passes choose layouts, pipelining and tensor-core instructions: the Triton page owns these stages.','MLIR_ENABLE_DUMP=1, the Triton cache'],
    'Triton|2':['LLVM IR, then PTX','LLVM’s NVPTX back end prints PTX (.version 8.8); Triton then runs the ptxas it ships.','the .llir and .ptx files in the Triton cache'],
    'PyTorch|0':['your model','Ordinary PyTorch code, run under torch.compile.','the source'],
    'PyTorch|1':['FX graph + guards','Dynamo reads the bytecode, records tensor operations into a graph and writes guards; AOTAutograd adds the backward graph and decides what to save.','TORCH_LOGS=graph_code,guards,graph_breaks,aot_graphs'],
    'PyTorch|2':['Triton (GPU) or C++ (CPU)','Lower to loops, fuse, write one kernel per fused group plus a Python wrapper; matmuls go to libraries. Its Triton then takes the Triton road.','TORCH_LOGS=output_code,fusion'],
    'JAX|0':['a traced function','jax.jit traces your function into a jaxpr.','jax.make_jaxpr'],
    'JAX|1':['StableHLO (an MLIR dialect)','One lowering rule per primitive; PJRT hands the module to XLA.','jit(f).lower(x).as_text()'],
    'JAX|2':['fused HLO, then LLVM IR or Triton','XLA’s passes fuse (a cost model on GPUs; one fusion is one kernel), call cuBLAS and cuDNN, and emit PTX through LLVM or through Triton.','XLA_FLAGS=--xla_dump_to=DIR'],
    'TVM|0':['a Relax module','Imported from another framework or written directly.','the module’s script()'],
    'TVM|1':['Relax after graph passes','Operator fusion and layout rewrites at the graph level.','print the module between passes'],
    'TVM|2':['TensorIR, then CUDA C','Tensor programs scheduled by hand or by MetaSchedule’s search; TVM 0.11 printed CUDA C and compiled it with NVRTC.','the generated source (inspect_source)'],
    'cuTile|0':['a tile-level kernel','You write tiles, never threads.','the source'],
    'cuTile|1':['CUDA Tile IR bytecode','An MLIR dialect serialised as bytecode: the tile counterpart of PTX.','tileirdisasm'],
    'cuTile|2':['SASS in a cubin','tileiras decides threads, layouts and load widths, and writes SASS directly: no PTX on this road.','cuobjdump -sass on the cubin'],
    'PTX':['PTX text','The virtual instruction set nearly every road meets at; ptxas, or the driver’s copy of it, reads it.','cuobjdump -ptx'],
    'ptxas':['SASS in a cubin','Register allocation, instruction scheduling, stall counts and scoreboards, encoding for one GPU generation.','-Xptxas -v, cuobjdump -sass, nvdisasm'],
    'fat':['a fat binary in the .o or .so','Every SASS and PTX image in one container; at run time the driver picks the SASS for this GPU or JIT-compiles the PTX, and caches it.','cuobjdump -lelf -lptx; CUDA_CACHE_PATH']};
  let heroSel='ptxas';
  function hero(){const el=document.getElementById('cs-hero');if(!el)return;const W=RD.width(el);
    const narrow=W<600,per=narrow?3:6,blocks=narrow?[ROADS.slice(0,3),ROADS.slice(3)]:[ROADS];
    const gap=narrow?6:8,bh=narrow?40:34,vg=14,fs=narrow?11:12;let s='',y=4;
    const box=(k,x,yy,w,h,lab,acc)=>{const on=heroSel===k;const L=String(lab).split('\n');
      return '<g class="nd'+(on?' on':'')+'" data-k="'+k+'" tabindex="0" role="button" aria-label="'+E(L.join(' '))+'"><rect x="'+x+'" y="'+yy+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(acc?'var(--acc2)':'var(--soft)')+'" stroke="'+(acc?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2.2:1)+'"/>'+
        L.map((l,j)=>RD.t(x+w/2,yy+h/2+4+(j-(L.length-1)/2)*13,E(l),{a:'middle',fs:fs,fill:'var(--ink)',w:j===0&&acc?600:null})).join('')+'</g>'};
    const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#csArr)"/>';
    s+='<defs><marker id="csArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>';
    const cw=(W-gap*(per-1))/per;
    blocks.forEach((roads,bi)=>{
      const top=y;
      roads.forEach((r,i)=>{const x=i*(cw+gap);
        r[1].forEach((lab,j)=>{const yy=top+j*(bh+vg);
          // split long labels at narrow widths
          const t=narrow&&lab.length>9?(lab.includes(': ')?lab.replace(': ','\n'):lab.includes(', ')?lab.replace(', ',',\n'):lab.replace(' ','\n')):lab;
          s+=box(r[0]+'|'+j,x,yy,cw,bh,t,false);
          if(j<2)s+=arrow(x+cw/2,yy+bh,x+cw/2,yy+bh+vg-1);});
        });
      const lg=24,yP=top+3*(bh+vg)-vg+lg,yA=yP+bh+vg,yF=yA+bh+vg;
      // the link from each road's last box down to PTX (or, for cuTile, straight to SASS)
      roads.forEach((r,i)=>{const x=i*(cw+gap),yb=top+2*(bh+vg)+bh;
        if(r[2]==='ptx')s+=arrow(x+10,yb,x+10,yP-1);
        else s+='<path d="M'+(x+10)+','+yb+' L'+(x+10)+','+(yF-1)+'" fill="none" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#csArr)"/>';
        s+=RD.t(x+17,yb+lg/2+5,E(r[3]),{fs:11,fill:'var(--mute)'});});
      const wPtx=roads.some(r=>r[2]==='sass')?(per-1)*(cw+gap)-gap:W;
      s+=box('PTX',0,yP,wPtx,bh,'PTX: the shared virtual ISA',true);
      s+=arrow(wPtx/2,yP+bh,wPtx/2,yA-1);
      s+=box('ptxas',0,yA,wPtx,bh,(wPtx<320?'ptxas: registers, schedule':'ptxas: registers, schedule, stall counts'),true);
      s+=arrow(wPtx/2,yA+bh,wPtx/2,yF-1);
      s+=box('fat',0,yF,W,bh,narrow?'SASS in a fat binary;\ndriver picks or JITs':'SASS in a cubin, packed in a fat binary; the driver picks an image or JIT-compiles PTX',false);
      y=yF+bh+(bi<blocks.length-1?22:4);
    });
    el.innerHTML=RD.svg(W,y,s,'The GPU compiler stack: six front ends meeting at PTX and ptxas');
    el.querySelectorAll('.nd').forEach(g=>{g.addEventListener('click',()=>{heroSel=g.dataset.k;hero();info()});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();heroSel=g.dataset.k;hero();info()}})});}
  function info(){const I=INFO[heroSel];if(!I)return;const nm=heroSel.includes('|')?heroSel.split('|')[0]+': '+ROADS.find(r=>r[0]===heroSel.split('|')[0])[1][+heroSel.split('|')[1]]:heroSel==='fat'?'fat binary and driver':heroSel;
    document.getElementById('cs-heroInfo').innerHTML='<div class="t">'+E(nm)+' produces '+E(I[0])+'</div><p>'+E(I[1])+' <span class="mute">How to see it: <code>'+E(I[2])+'</code></span></p>';}
  hero();info();RD.onRender(hero);RD.onResize(hero);
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
