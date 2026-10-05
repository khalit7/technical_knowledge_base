// ---- Compiler explorer: 7. occupancy from the resource report ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-occ'))return;
  const ks=D.kernels.filter(k=>!k.hidden);
  let kid='k3_matmul_tiled',arch='sm_90a';
  const sk=X.$('cmp-occ-k');sk.innerHTML=ks.map(k=>'<option value="'+k.id+'"'+(k.id===kid?' selected':'')+'>'+X.esc(k.title)+'</option>').join('');
  X.$('cmp-occ-a').innerHTML=D.archs.map(a=>'<button data-m="'+a+'"'+(a===arch?' class="on"':'')+'>'+a+'</button>').join('');
  const sb=X.$('cmp-occ-b');
  function setK(){const K=D.kernels.find(k=>k.id===kid);sb.value=Math.max(1,Math.round(K.block/32));sb.disabled=!!K.fixedBlock}
  function draw(){
    const K=D.kernels.find(k=>k.id===kid),R=K.arch[arch],thr=+sb.value*32;X.$('cmp-occ-bv').textContent=thr+(K.fixedBlock?' (fixed by the kernel)':'');
    const el=X.$('cmp-occ-svg');
    if(!R.ok){el.innerHTML='';X.$('cmp-occ-cap').innerHTML='This kernel does not compile for '+arch+'; see section 6.';X.$('cmp-occ-note').innerHTML='';return}
    const o=X.occ(arch,R.res.regs,R.res.smem,thr,K.dsmem||0,R.res.bars),W=X.width(el),lw=W<520?110:170,bh=22,gap=8,x0=lw+6,x1=W-60;
    const rows=[['Registers',o.limits.reg],['Shared memory',o.limits.smem],['Warp slots',o.limits.warps],['Block slots',o.limits.blocks]];
    const mx=Math.max(...rows.map(r=>Math.min(r[1],64)),1);
    let s='';
    rows.forEach((r,j)=>{const y=4+j*(bh+gap),v=Math.min(r[1],64),bind=r[1]===o.blocks;
      s+='<text x="'+lw+'" y="'+(y+15)+'" font-size="12" text-anchor="end" fill="var(--ink)"'+(bind?' font-weight="700"':'')+'>'+r[0]+'</text>'+
        '<rect x="'+x0+'" y="'+y+'" width="'+Math.max(2,(x1-x0)*v/mx)+'" height="'+bh+'" rx="3" fill="'+(bind?'var(--bad)':'var(--c1)')+'" opacity="'+(bind?1:.55)+'"/>'+
        '<text x="'+(x0+Math.max(2,(x1-x0)*v/mx)+5)+'" y="'+(y+15)+'" font-size="11.5" fill="var(--ink)">'+(r[1]>=1e6?'no limit':r[1]+' block'+(r[1]===1?'':'s'))+'</text>'});
    const H=4+rows.length*(bh+gap);
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Blocks per SM allowed by each resource">'+s+'</svg>';
    const ai=D.archinfo[arch];
    X.$('cmp-occ-cap').innerHTML='Each bar is how many blocks of '+thr+' threads that resource alone would allow on one SM; the shortest (red) wins. <b>'+o.blocks+' block'+(o.blocks===1?'':'s')+' x '+Math.ceil(thr/32)+' warps = '+o.warps+' of '+o.maxW+' warps: occupancy '+Math.round(o.occ*100)+'%</b>, limited by '+o.lim+'.'+
      ' Inputs: '+R.res.regs+' registers per thread and '+R.res.smem+' B static shared memory per block from ptxas'+(K.dsmem?', plus '+K.dsmem+' B dynamic':'')+'; '+ai.cc+' limits: '+ai.maxW+' warps, '+ai.maxB+' blocks, '+(ai.smemSM/1024)+' KB shared memory per SM.';
    X.$('cmp-occ-note').innerHTML=o.detail;
  }
  sk.addEventListener('change',()=>{kid=sk.value;setK();draw()});
  sb.addEventListener('input',draw);
  X.seg(X.$('cmp-occ-a'),m=>{arch=m;draw()});
  setK();X.onRender(draw);X.onResize(draw);
  // the documented per-SM limits used, and the validation against NVIDIA's calculator
  let h='<table class="cmp-t"><thead><tr><th>Per-SM limit (CUDA Programming Guide v'+X.esc(D.meta.guide)+', tables 30 and 31)</th>'+D.archs.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  [['Compute capability','cc'],['Max resident warps','maxW'],['Max resident blocks','maxB'],['32-bit registers','regs'],['Max registers per thread','maxR'],['Max shared memory per SM (KB)','smemSMk'],['Max shared memory per block (KB)','smemBk']].forEach(r=>{
    h+='<tr><td>'+r[0]+'</td>'+D.archs.map(a=>'<td class="num">'+(r[1]==='smemSMk'?D.archinfo[a].smemSM/1024:r[1]==='smemBk'?D.archinfo[a].smemBlock/1024:D.archinfo[a][r[1]])+'</td>').join('')+'</tr>'});
  X.$('cmp-occ-lim').innerHTML=h+'</tbody></table><p class="cmp-note">'+D.occCheck.note+'</p>';
})();
