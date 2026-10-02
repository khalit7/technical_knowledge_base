// ---- Then and now: parallel layouts from Megatron-LM (2019) to 2026 ----
(function(){if(!$('thx'))return;
  const L=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>',N=id=>'https://app.notion.com/p/'+id;
  // node: GPUs per server; inner: the axis that fills a server; deg: degrees across the run (null = not stated; 1 = not used)
  const S=[
   {t:'2019: Megatron-LM, 8.3B',node:16,inner:'TP',tpIn:8,gpus:'512 V100',deg:{TP:8,PP:1,DP:64,CP:1,EP:1},coll:'2 all-reduces forward, 2 backward',perf:'15.1 PFLOP/s, 74 to 76% of linear',
    c:'This paper: 8-way tensor parallelism inside each 16-GPU DGX-2H server (two groups per server), 64-way data parallelism across all 32 servers ('+L(PAPER.meta.ax+'#A2.SS1','Appendix B.1')+'). No pipeline.'},
   {t:'2020: GPT-3, 175B',node:null,inner:null,gpus:'V100 cluster (count not stated)',deg:{TP:null,PP:null,DP:null,CP:1,EP:1},coll:'not stated',perf:'not stated',
    c:'"We use a mixture of model parallelism within each matrix multiply and model parallelism across the layers of the network" ('+L('https://arxiv.org/abs/2005.14165','GPT-3 §2.3')+', '+L(N('3c65c17b0d0d8193ac92c7648cfaca12'),'KB page')+'): tensor plus pipeline parallelism, degrees not published.'},
   {t:'2021: PTD-P, 1T parameters',node:8,inner:'TP',tpIn:8,gpus:'3,072 A100',deg:{TP:8,PP:null,DP:null,CP:1,EP:1},coll:'2 all-reduces forward, 2 backward',perf:'502 PFLOP/s, 52% of peak',
    c:'Tensor parallelism inside each 8-GPU DGX A100, pipeline parallelism across servers, data parallelism on top: "For large enough models, we use a tensor-model-parallel size of 8", and peak performance came when "the tensor-parallel size is equal to the number of GPUs in a single node" ('+L('https://arxiv.org/abs/2104.04473','Narayanan et al. 2021')+').'},
   {t:'2022: MT-NLG, 530B',node:8,inner:'TP',tpIn:8,gpus:'280 A100 per replica',deg:{TP:8,PP:35,DP:null,CP:1,EP:1},coll:'2 all-reduces forward, 2 backward',perf:'not quoted here',
    c:'"Each 530 billion parameter model replica spans 280 NVIDIA A100 GPUs, with 8-way tensor-slicing within a node and 35-way pipeline parallelism across nodes", then data parallelism "to thousands of GPUs" ('+L('https://arxiv.org/abs/2201.11990','MT-NLG §2.2')+'): DeepSpeed and Megatron together, the "3D" layout.'},
   {t:'2022: sequence parallelism',node:8,inner:'TP',tpIn:8,gpus:'2,240 A100',deg:{TP:8,PP:35,DP:8,CP:1,EP:1},coll:'2 all-gathers + 2 reduce-scatters forward (same bytes)',perf:'54.2% MFU on the 530B model',
    c:'The same TP groups, but LayerNorm and dropout now run on a slice of the sequence instead of being duplicated: <i>g</i> becomes an all-gather and its conjugate a reduce-scatter, which together move what one all-reduce did. With selective recomputation, activation memory falls 5× ('+L('https://arxiv.org/abs/2205.05198','Korthikanti et al. 2022')+').'},
   {t:'2024: Llama 3, 405B',node:8,inner:'TP',tpIn:8,gpus:'16,384 H100',deg:{TP:8,PP:16,DP:8,CP:16,EP:1},coll:'TP 8 inside each machine',perf:'380 TFLOP/s per GPU, 38% MFU',
    c:'"4D parallelism": TP 8, CP 16, PP 16 and FSDP-style DP 8 for the 131,072-token stage (at 8,192 tokens: TP 8, PP 16, DP 128). "Within each machine, the high NVLink bandwidth enables the use of tensor parallelism (Shoeybi et al., 2019)" ('+L('https://arxiv.org/abs/2407.21783','Llama 3 §3.3.2, Table 4')+', '+L(N('3c65c17b0d0d81aca58ccb9d720b474e'),'KB page')+').'},
   {t:'2024: DeepSeek-V3, 671B MoE',node:8,inner:'EP',gpus:'2,048 H800',deg:{TP:1,PP:16,DP:null,CP:1,EP:64},coll:'no TP in training',perf:'2.788M H800 GPU hours',
    c:'"16-way Pipeline Parallelism, 64-way Expert Parallelism spanning 8 nodes, and ZeRO-1 Data Parallelism", and "without using costly Tensor Parallelism" ('+L('https://arxiv.org/abs/2412.19437','DeepSeek-V3 §3.2')+', '+L(N('3c65c17b0d0d815fb8dac9ba1e35ab81'),'KB page')+'). For MoE models the expert axis takes the room TP had; serving still uses TP 4 with sequence parallelism for attention (§3.4.1).'},
   {t:'2026: serving',node:8,inner:'TP',tpIn:8,gpus:'one 8-GPU server',deg:{TP:8,PP:1,DP:1,CP:1,EP:1},coll:'2 all-reduces per layer, forward only',perf:'',
    c:'Inference has no backward pass, so a TP layer costs 2 all-reduces per token step. It is the default way to serve a model that does not fit one GPU: '+L('https://docs.vllm.ai/en/latest/serving/parallelism_scaling.html','vLLM')+' and '+L('https://nvidia.github.io/TensorRT-LLM/features/parallel-strategy.html','TensorRT-LLM')+' call it tensor_parallel_size, SGLang tp_size. See '+L(N('3c65c17b0d0d81c08b3bc95ff45c7b13'),'Topic: inference-and-serving')+'.'}];
  const AX=[['TP','var(--c1)'],['CP','var(--c6)'],['PP','var(--c4)'],['EP','var(--c5)'],['DP','var(--c3)']];
  function draw(m,k,e,w){const s=S[k],pv=k?S[k-1]:s,narrow=w<560,nw=narrow?w-16:Math.min(300,w*.42),bx0=narrow?8:nw+40,bwid=w-bx0-10,top=8;let q='';
    // the server
    const n=s.node||8,cols=n===16?8:4,cs=Math.min(30,(nw-24)/cols),rows=n/cols,nh=rows*cs+40;
    q+=rc(8,top,nw,nh,'none',{r:8,s:'var(--mute)',da:s.node?null:'4 3'})+tx(16,top+16,s.node?'one server, '+s.node+' GPUs':'server layout not stated',{fs:11,c:'var(--mute)'});
    for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols,x=16+c*cs,y=top+24+r*cs;let f='var(--soft)';
      if(s.inner==='TP')f=Math.floor(i/(s.tpIn||8))%2?'var(--acc2)':'var(--c1)';else if(s.inner==='EP')f='var(--c5)';
      q+=rc(x,y,cs-3,cs-3,f,{r:3,op:s.inner&&k&&pv.inner!==s.inner?(.35+.65*e):1,s:s.inner?null:'var(--line)'})}
    q+=tx(16,top+nh-6,s.inner==='TP'?'filled by the tensor-parallel group'+(s.node===16?'s (two of 8)':''):s.inner==='EP'?'filled by experts (EP), no TP':'',{fs:11,c:'var(--mute)'});
    // degrees across the run
    const y0=narrow?top+nh+14:top,lab=26,BW=bwid-lab-56,X=v=>v*BW/7;
    q+=tx(bx0,y0+10,'degree across the run (log scale, 1 to 128)',{fs:11,c:'var(--mute)'});
    AX.forEach(([a,c],i)=>{const y=y0+18+i*24,d=s.deg[a],d0=pv.deg[a],lv=d==null?null:Math.log2(d),lv0=d0==null?lv:Math.log2(d0),v=lv==null?null:(lv0==null?lv:lv0+(lv-lv0)*e);
      q+=tx(bx0,y+12,a,{fs:11,w:600});
      if(v==null)q+=rc(bx0+lab,y+2,X(3.5),14,'none',{r:2,s:c,da:'3 2'})+tx(bx0+lab+X(3.5)+4,y+13,'not stated',{fs:11,c:'var(--mute)'});
      else{q+=rc(bx0+lab,y+2,Math.max(2,X(v)),14,c,{r:2});q+=tx(bx0+lab+Math.max(2,X(v))+4,y+13,d===1?'1 (not used)':String(d),{fs:11})}});
    const H=narrow?y0+18+5*24+4:Math.max(top+nh,y0+18+5*24)+6;return svgW(w,H,q,'Parallel layout')}
  makeAnim({id:'thx',modes:{x:S.map(s=>({t:s.t,c:s.c}))},mode:'x',dur:3200,draw,counters:(m,k)=>{const s=S[k];return stat('GPUs',s.gpus,'')+stat('Tensor parallel',s.deg.TP==null?'used, degree not stated':s.deg.TP===1?'none':s.deg.TP+'-way',s.coll)+(s.perf?stat('Reported',s.perf,''):'')}});
})();
