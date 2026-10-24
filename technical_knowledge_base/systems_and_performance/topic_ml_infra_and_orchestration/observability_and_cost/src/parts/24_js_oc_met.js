// ---- Reading section 2: one simulated H100 over one sample window, every counter from its definition (was the Metrics explainer tab) ----
window.OCM=(function(){
  const SM=132,WMAX=64,SL=20;
  const gemm=()=>({f:1,g:[{n:132,w:12,t:.75,k:'t'}],dram:.35,nvl:0});
  const idle=()=>({f:0,g:[],dram:0,nvl:0});
  const rep=(fn,a,b)=>{const o=[];for(let i=0;i<SL;i++)o.push(fn(i));return o};
  // each case: before and after, 20 slices; progress = does training advance in this window
  const CASES={
    gemm:{lab:'Healthy matmuls',bef:rep(gemm),aft:rep(gemm),pb:true,pa:true,
      cb:'Large BF16 matrix multiplies on every SM. Only about 12 of 64 warp slots are used per SM (big tiles, many registers per warp), so occupancy is low and that is fine: the tensor pipes are busy three quarters of the time.',
      ca:'Nothing to fix: this is the reference the other situations are compared with.'},
    grid:{lab:'Too few blocks',bef:rep(()=>({f:1,g:[{n:26,w:32,t:.7,k:'t'}],dram:.1,nvl:0})),aft:rep(gemm),pb:true,pa:true,
      cb:'A kernel launched with about a fifth as many thread blocks as there are SMs (a small matrix, micro-batch 1). A kernel is always running, so utilisation reads 100%; four fifths of the chip has nothing resident.',
      ca:'More work per launch (a larger micro-batch, or a kernel that splits the work into more blocks) fills all 132 SMs. GPU util was 100% before and after: only SM activity and tensor activity moved.'},
    gaps:{lab:'Launch-bound (CPU gaps)',bef:rep(()=>({f:.55,g:[{n:132,w:12,t:.5,k:'t'}],dram:.25,nvl:0})),aft:rep(()=>({f:.95,g:[{n:132,w:12,t:.5,k:'t'}],dram:.25,nvl:0})),pb:true,pa:true,
      cb:'Many short kernels with the GPU idle between them while Python launches the next one: kernels run 55% of the time. Every counter falls together.',
      ca:'Fewer, larger launches (CUDA graphs, torch.compile, fused kernels) keep a kernel running 95% of the time. The step log shows it as a shorter step.'},
    loader:{lab:'Input stall',bef:rep(i=>i<8?gemm():idle()),aft:rep(gemm),pb:true,pa:true,
      cb:'The step computes for 8 of 20 slices, then waits for the next batch from the data loader. Utilisation 40%: here the default counter is right, and the step log will say where the time went (data wait).',
      ca:'Prefetching batches (more loader workers, pinned memory, a faster store) removes the wait.'},
    mem:{lab:'Memory-bound phase',bef:rep(()=>({f:1,g:[{n:132,w:48,t:0,k:'m'}],dram:.9,nvl:0})),aft:rep(i=>i<6?{f:1,g:[{n:132,w:48,t:0,k:'m'}],dram:.9,nvl:0}:gemm()),pb:true,pa:true,
      cb:'An elementwise or optimizer phase: every SM full of warps (high occupancy), the memory interface busy 90% of the time, the tensor pipes idle. Everything looks busy except the counter that tracks matmul work.',
      ca:'Fusing the phase (a fused optimizer, a compiled block) moves fewer bytes, so it takes 6 slices instead of the whole window and the next matmuls start sooner. Tensor activity rises because the slow phase got shorter, not because it changed kind.'},
    comm:{lab:'Exposed all-reduce',bef:rep(i=>i<14?gemm():{f:1,g:[{n:16,w:4,t:0,k:'c'}],dram:.2,nvl:.8}),aft:rep(i=>i<6?{f:1,g:[{n:116,w:12,t:.75,k:'t'},{n:16,w:4,t:0,k:'c'}],dram:.4,nvl:.8}:gemm()),pb:true,pa:true,
      cb:'The gradient all-reduce runs after the backward pass with nothing to overlap: for 6 slices a communication kernel holds 16 SMs and the NVLink counters peak while the tensor pipes idle.',
      ca:'Bucketed all-reduce overlapped with the backward pass (what DDP and FSDP do by default): the same bytes move while the other 116 SMs keep computing.'},
    hang:{lab:'Hung collective',bef:rep(()=>({f:1,g:[{n:8,w:4,t:0,k:'c'}],dram:0,nvl:0})),aft:rep(i=>i<6?{f:1,g:[{n:116,w:12,t:.75,k:'t'},{n:16,w:4,t:0,k:'c'}],dram:.4,nvl:.8}:gemm()),pb:false,pa:true,
      cb:'A peer died or froze inside an all-reduce. The communication kernel stays resident on a few SMs (8 here, illustrative), polling for data that never arrives. A kernel is executing, so GPU util reads 100%; nothing moves on NVLink and no step completes.',
      ca:'After the job is restarted without the bad node, the window is a normal step again. The fix is detection: an alert on the step counter, not on GPU util.'}
  };
  function readings(sl){let u=0,a=0,o=0,t=0,d=0,v=0;
    sl.forEach(s=>{const n=s.g.reduce((x,g)=>x+g.n,0);u+=s.f;a+=s.f*n/SM;o+=s.f*s.g.reduce((x,g)=>x+g.n*g.w,0)/(SM*WMAX);
      t+=s.f*s.g.reduce((x,g)=>x+g.n*g.t,0)/SM;d+=s.f*s.dram;v+=s.f*s.nvl});
    const k=sl.length||1;return {util:u/k,act:a/k,occ:o/k,ten:t/k,dram:d/k,nvl:v/k}}
  // draw the grid of one slice
  function grid(W,s){const cols=W<480?12:22,rows=Math.ceil(SM/cols),gap=2,cw=Math.max(8,Math.floor((W-gap*(cols-1))/cols)),ch=Math.min(cw,W<480?18:16);
    let x=0,body='',idx=0;const per=[];s.g.forEach(g=>{for(let i=0;i<g.n;i++)per.push(g)});
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(idx>=SM)break;const g=idx<per.length&&s.f>0?per[idx]:null;
      let fill='var(--dim)',op=1;if(g){fill=g.k==='t'?'var(--c1)':g.k==='c'?'var(--c4)':'var(--c2)';op=g.k==='t'?(.35+.65*g.t)*Math.max(.35,s.f):Math.max(.35,.3+.7*g.w/WMAX)*Math.max(.35,s.f)}
      body+='<rect x="'+(c*(cw+gap))+'" y="'+(r*(ch+gap))+'" width="'+cw+'" height="'+ch+'" rx="2" fill="'+fill+'" opacity="'+op.toFixed(2)+'"/>';idx++}
    return {body,h:rows*(ch+gap)}}
  const pct=x=>Math.round(x*100)+'%',dec=x=>x.toFixed(2);
  return {SM,WMAX,SL,CASES,readings,grid,pct,dec};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('oc-me-card'))return;
  const M=OCM,C=M.CASES;let cm='hang',fx=0;
  $('oc-me-case').innerHTML=Object.keys(C).map(k=>'<button data-m="'+k+'"'+(k===cm?' class="on"':'')+'>'+C[k].lab+'</button>').join('');
  function cur(){return fx?C[cm].aft:C[cm].bef}
  function draw(i){const sl=cur(),W=RD.width($('oc-me-svg')),s=sl[Math.min(i,M.SL-1)];
    const g=M.grid(W,s);const tl=22,y0=g.h+10;let tb='';
    const sw=W/M.SL;sl.forEach((x,j)=>{tb+='<rect x="'+(j*sw+1)+'" y="'+y0+'" width="'+(sw-2)+'" height="'+tl+'" rx="2" fill="'+(x.f>0?(x.g.some(q=>q.k==='t')?'var(--c1)':x.g.some(q=>q.k==='c')?'var(--c4)':'var(--c2)'):'var(--dim)')+'" opacity="'+(j<=i?(.35+.65*x.f).toFixed(2):'.15')+'"/>'});
    tb+='<rect x="'+(i*sw)+'" y="'+(y0-3)+'" width="'+sw+'" height="'+(tl+6)+'" fill="none" stroke="var(--ink)" stroke-width="1.5" rx="3"/>';
    tb+=RD.t(0,y0+tl+14,'slice '+(i+1)+' of '+M.SL+' of the sample window (time runs left to right)',{fs:11,fill:'var(--mute)'});
    $('oc-me-svg').innerHTML=RD.svg(W,y0+tl+20,g.body+tb,'SM grid, slice '+(i+1));
    const r=M.readings(sl.slice(0,i+1)),rb=M.readings(C[cm].bef),ra=M.readings(C[cm].aft),done=i>=M.SL-1;
    const row=(k,n,fld,f,a,b,c,hint)=>'<tr><td>'+n+'<div class="small mute">'+fld+'; '+hint+'</div></td><td class="num"><b>'+f(a[k])+'</b></td><td class="num">'+f(b[k])+'</td><td class="num">'+f(c[k])+'</td></tr>';
    $('oc-me-read').innerHTML='<div class="tw"><table class="oc-tbl"><thead><tr><th>Counter</th><th class="num">So far</th><th class="num">Before</th><th class="num">After</th></tr></thead><tbody>'+
      row('util','GPU util','DCGM_FI_DEV_GPU_UTIL, nvidia-smi',M.pct,r,rb,ra,'on by default')+
      row('act','SM active','DCGM_FI_PROF_SM_ACTIVE',M.dec,r,rb,ra,'commented out in dcgm-exporter defaults')+
      row('occ','SM occupancy','DCGM_FI_PROF_SM_OCCUPANCY',M.dec,r,rb,ra,'commented out by default')+
      row('ten','Tensor active','DCGM_FI_PROF_PIPE_TENSOR_ACTIVE',M.dec,r,rb,ra,'on; the closest counter to MFU')+
      row('dram','DRAM active','DCGM_FI_PROF_DRAM_ACTIVE',M.dec,r,rb,ra,'on')+
      row('nvl','NVLink busy','share of link bandwidth, from the NVLink byte counters',M.dec,r,rb,ra,'NVLink total on by default')+
      '<tr><td>Training steps in this window<div class="small mute">from the training log, not the GPU</div></td><td class="num"><b>'+((fx?C[cm].pa:C[cm].pb)?'yes':'none')+'</b></td><td class="num">'+(C[cm].pb?'yes':'none')+'</td><td class="num">'+(C[cm].pa?'yes':'none')+'</td></tr></tbody></table></div>';
    $('oc-me-cap').innerHTML='<b>'+C[cm].lab+(fx?', after the fix':'')+'.</b> '+(fx?C[cm].ca:C[cm].cb)+(done?'':' <span class="mute">(readings so far cover slices 1 to '+(i+1)+')</span>')}
  const A=RD.anim({card:'oc-me-card',ctl:'oc-me-ctl',n:M.SL,ms:450,draw,label:'Slice of the sample window'});
  RD.seg($('oc-me-case'),m=>{cm=m;A.reset(M.SL);A.go(M.SL-1)});
  RD.seg($('oc-me-fix'),m=>{fx=+m;A.reset(M.SL);A.go(M.SL-1)});
  // the definitions and decoder tables are static HTML in 20_read_b.html (written from this engine on 2026-10-24); check/check_data.mjs recomputes the decoder readings
  A.go(M.SL-1);RD.onRender(()=>A.redraw());RD.onResize(()=>A.redraw());
})();
