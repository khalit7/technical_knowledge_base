// ---- Reading tab: predictions, recorded outputs, charts and tables filled from window.LT ----
(function(){
  const L=window.LT,C=window.CUTE,esc=RD.esc,$=id=>document.getElementById(id);
  // predict-then-reveal
  document.querySelectorAll('#t-read .rd-pr').forEach(pr=>{
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.a==='1'?'right':'wrong',x===b||x.dataset.a==='1'));
      pr.querySelector('.ans').hidden=false}))});
  // the cuBLASLt program's recorded run (no GPU)
  $('lt-ltrun').textContent=L.host.lt_gelu_bias.join('\n');
  // --- epilogue fusion on the M1 ---
  function epi(){
    const el=$('lt-epi');
    const V=[['gemm_only_ms','GEMM only','var(--c3)'],['addmm_compiled_ms','bias in GEMM, then GELU','var(--c1)'],['compiled_tail_ms','GEMM, then fused bias+GELU','var(--c6)'],['unfused_ms','eager: GEMM, bias, GELU','var(--c2)']];
    let h='';
    L.m1.epi.forEach(r=>{
      const mx=Math.max(...V.map(v=>r[v[0]]));
      h+='<div class="band">K = '+r.K.toLocaleString('en-US')+' (GEMM '+(2*r.M*r.N*r.K/1e9).toFixed(0)+' GFLOP)</div><div class="bars">';
      V.forEach(v=>{const x=r[v[0]];h+='<div class="row" title="median '+x+' ms, range '+r[v[0]+'_lo']+' to '+r[v[0]+'_hi']+' ms"><span class="nm">'+v[1]+'</span><span class="track"><span class="fill" style="width:'+(100*x/mx).toFixed(1)+'%;background:'+v[2]+'"></span></span><span class="val">'+x.toFixed(2)+' ms</span></div>'});
      h+='</div>'});
    el.innerHTML=h;
  }
  epi();
  // --- cuBLAS inventory per architecture ---
  function inv(){
    const el=$('lt-inv');const w=RD.width(el);const by=L.cublas.lt_by_arch,hid=L.cublas.lt_hidden_by_arch;
    const archs=Object.keys(by).filter(a=>by[a]>20);const mx=Math.max(...archs.map(a=>by[a]));
    const lab=w<480?62:96,bw=w-lab-60,rh=20,H=archs.length*rh+24;
    const name={sm_75:'sm_75 Turing',sm_80:'sm_80 A100',sm_86:'sm_86 RTX 30',sm_89:'sm_89 Ada',sm_90:'sm_90 Hopper',sm_90a:'sm_90a Hopper',sm_100:'sm_100 Blackwell',sm_110:'sm_110 Jetson',sm_120:'sm_120 RTX 50'};
    let b='<defs><pattern id="lt-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--c4)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--bg)" stroke-width="2"/></pattern></defs>';
    archs.forEach((a,i)=>{const y=i*rh+4,v=by[a],hv=hid[a]||0,x=bw*v/mx,xh=bw*hv/mx;
      b+=RD.t(lab-6,y+13,w<480?a:(name[a]||a),{a:'end',fs:11})+'<rect x="'+lab+'" y="'+y+'" width="'+(x-xh).toFixed(1)+'" height="'+(rh-6)+'" fill="var(--c1)" rx="2"><title>'+a+': '+v+' kernels, '+hv+' with hidden names</title></rect>';
      if(hv)b+='<rect x="'+(lab+x-xh).toFixed(1)+'" y="'+y+'" width="'+Math.max(1,xh).toFixed(1)+'" height="'+(rh-6)+'" fill="url(#lt-hatch)"/>';
      b+=RD.t(lab+x+4,y+12,v.toLocaleString('en-US'),{fs:11})});
    b+=RD.t(lab,H-4,'kernels in libcublasLt.so.13.8.0.4 per target ('+L.cublas.lt_total.toLocaleString('en-US')+' in all)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,H,b,'cuBLASLt kernels per architecture');
  }
  inv();RD.onResize(()=>{inv()});
  $('lt-c3').textContent=L.cublas.cutlass3x.example[0];
  // --- kernel-name decoder ---
  const NM=[['sm90','sm90: built for Hopper (compute capability 9.0, the sm_90a build that can use wgmma)'],['xmma','xmma: NVIDIA\'s internal GEMM template family (the "5x_cublas" suffix names its cuBLAS build); not documented'],['gemm','gemm: a matrix multiply (other families: gemv, syrk, trsm)'],['bf16bf16','A and B are BF16'],['bf16f32','output D in BF16, with FP32 used for C/the accumulator (our reading)'],['f32','compute and scale type FP32'],['tn','transpose flags in cuBLAS\'s column-major convention: A transposed, B not (section 2)'],['n','a further layout flag for C/D (our reading: not transposed)'],['tilesize128x128x64','the CTA tile: 128 rows of M by 128 columns of N, 64 of K per pipeline stage'],['cgasize1x1x1','cluster shape (CGA, cooperative grid array, is NVIDIA\'s internal name for a cluster; the SASS register SR_CgaCtaId is a CTA\'s rank in it): 1 x 1 x 1, no cluster'],['warpgroupsize1x1x1','how consumer warpgroups are arranged over the tile (1 here; 2x1x1 variants exist)'],['aligna4','A aligned to 4 elements (our reading; aligna2 and aligna8 twins exist)'],['alignc4','C/D aligned to 4 elements (our reading)'],['execute','execution variant follows'],['segment_k_off','no K segmentation; "segment_k_on" twins exist for every kernel (our reading: a split of K inside the kernel; unconfirmed)'],['kernel','the GPU entry point'],['_5x_cublas','build tag']];
  const nmEl=$('lt-nm'),nmX=$('lt-nmx');
  nmEl.innerHTML=NM.map((p,i)=>'<span data-i="'+i+'" tabindex="0" role="button" style="cursor:pointer;background:'+['var(--acc2)','var(--open2)','var(--closed2)','var(--hl)'][i%4]+'">'+p[0]+'</span>').join('_');
  const pick=i=>{nmEl.querySelectorAll('span').forEach(s=>s.style.outline=+s.dataset.i===i?'2px solid var(--ink)':'');nmX.innerHTML='<b>'+esc(NM[i][0])+'</b>: '+esc(NM[i][1])};
  nmEl.addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(s)pick(+s.dataset.i)});
  nmEl.addEventListener('keydown',e=>{const s=e.target.closest('span[data-i]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(+s.dataset.i)}});
  pick(8);
  // --- mma.sync across targets ---
  const M=L.matrix.kernels;
  const rows=[['i01_mma_f16','FP16','m16n8k16'],['i02_mma_bf16','BF16','m16n8k16'],['i03_mma_tf32','TF32','m16n8k8'],['i04_mma_s8','INT8','m16n8k32'],['i05_mma_e4m3','FP8 E4M3','m16n8k32']];
  const tg=['sm_80','sm_89','sm_90a','sm_100a','sm_120'];
  const cell=(k,t)=>{const e=M[k].t[t];if(!e.ok){const m=e.msg[0]||'',q=(m.match(/requires (.target \S+)/)||[])[1];return '<td class="mute small" title="'+esc(m)+'">&#10007; refused'+(q?' ('+esc(q.replace('.target ','needs '))+')':'')+'</td>'}
    const ops=Object.keys(e.ops).filter(o=>/MMA|F2FP/.test(o));return '<td><code>'+ops.map(o=>esc(o)+(e.ops[o]>1?' &times;'+e.ops[o]:'')).join('<br>')+'</code></td>'};
  $('lt-mmatab').innerHTML=rows.map(r=>'<tr><td><b>'+r[1]+'</b></td><td><code>'+r[2]+'</code></td>'+tg.map(t=>cell(r[0],t)).join('')+'</tr>').join('');
  // --- CUTLASS examples compiled ---
  const CU=[['tut_sgemm_sm80','CuTe tutorial sgemm_sm80 (sm_80)'],['tut_wgmma_sm90','CuTe tutorial wgmma_sm90 (sm_90a)'],['tut_wgmma_tma_sm90','CuTe tutorial wgmma_tma_sm90 (sm_90a)'],['ex48_hopper_ws','48 Hopper warp-specialised GEMM (sm_90a)'],['tut_bw02_mma_tma','CuTe Blackwell tutorial 02 mma + TMA (sm_100a)'],['tut_bw04_2sm','CuTe Blackwell tutorial 04 two-SM (sm_100a)'],['tut_bw05_epi','CuTe Blackwell tutorial 05 TMA epilogue (sm_100a)'],['ex70_bw_fp16','70 Blackwell FP16 GEMM (sm_100a)'],['ex79a_geforce_nvfp4','79a GeForce NVFP4 GEMM (sm_120a)']];
  const show=['HMMA','HGMMA','UTCHMMA','OMMA','LDGSTS','LDSM','UTMALDG','UTMASTG','LDTM','STSM','USETMAXREG','UTCBAR'];
  $('lt-cutab').innerHTML=CU.map(([k,n])=>{const v=L.cutlass[k],g=v.kernels[0];
    return '<tr><td>'+n+'</td><td class="num">'+v.seconds+'</td><td class="num">'+g.regs+'</td><td class="num">'+g.n.toLocaleString('en-US')+'</td><td class="small"><code>'+show.filter(o=>g.ops[o]).map(o=>o+' '+g.ops[o]).join(', ')+'</code></td></tr>'}).join('');
  // --- mini layout grids ---
  function grid(el,L0,opt){opt=opt||{};const g=C.grid(L0),R=g.length,Q=g[0].length;const w=RD.width(el);
    const cs=Math.max(16,Math.min(40,Math.floor((w-30)/Q))),H=R*cs+18;const mx=Math.max(...g.flat());
    let b='';for(let r=0;r<R;r++)for(let c=0;c<Q;c++){const v=g[r][c];const hue=opt.color?opt.color(r,c,v):'hsl('+(200+140*v/Math.max(1,mx))+',55%,'+(document.documentElement&&matchMedia('(prefers-color-scheme: dark)').matches?'34%':'82%')+')';
      b+='<rect x="'+(c*cs+1)+'" y="'+(r*cs+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="2" fill="'+hue+'"/>'+RD.t(c*cs+cs/2,r*cs+cs/2+4,v,{a:'middle',fs:cs<22?9:11})}
    b+=RD.t(0,H-3,C.lstr(L0)+'  (row = mode 0, column = mode 1; number = offset)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(Math.max(Q*cs+2,Math.min(w,330)),H,b,'layout '+C.lstr(L0))}
  let mini='(4,8):(1,4)';const drawMini=()=>grid($('lt-mini'),C.parse(mini));
  RD.seg($('lt-mini-sel'),m=>{mini=m;drawMini()});drawMini();RD.onResize(drawMini);
  window.LTGRID=grid;
  // --- mma.sync thread-value fragments (from CuTe's TV layouts) ---
  const TVD={sm80_m16n8k16_C:{rows:16,cols:8,txt:L.cute.sm80_m16n8k16_C.txt,what:'C/D, 16 x 8 FP32'},sm80_m16n8k16_A:{rows:16,cols:16,txt:L.cute.sm80_m16n8k16_A.txt,what:'A, 16 x 16 BF16'},sm80_m16n8k16_B:{rows:16,cols:8,txt:L.cute.sm80_m16n8k16_B.txt,what:'B, 16 (K) x 8 (N) BF16',kn:true}};
  let tvSel='sm80_m16n8k16_C',lane=0;
  function tv(){const d=TVD[tvSel],l=C.parse(d.txt),T=C.size(l.s[0]),V=C.size(l.s[1]);
    // B is stored N x K in CuTe (rows = N = 8); show it as K x N
    const R=d.kn?16:d.rows,Q=d.kn?8:d.cols;const own=new Array(R*Q);
    for(let t=0;t<T;t++)for(let v=0;v<V;v++){const idx=C.at(l,t+T*v);let r,c;
      if(d.kn){const n=idx%8,k=Math.floor(idx/8);r=k;c=n}else{r=idx%d.rows;c=Math.floor(idx/d.rows)}
      own[r*Q+c]={t,v}}
    const el=$('lt-tv');el.style.gridTemplateColumns='repeat('+Q+',minmax(0,1fr))';el.style.maxWidth=(Q*34)+'px';
    el.innerHTML=own.map((o,i)=>'<div data-t="'+o.t+'" title="lane '+o.t+', value '+o.v+'" class="'+(o.t===lane?'on':'')+'" style="background:hsl('+(o.t*360/32)+',55%,'+(o.t===lane?'60%':'80%')+');color:#222">'+o.t+'</div>').join('');
    const mine=own.map((o,i)=>o.t===lane?'('+Math.floor(i/Q)+','+(i%Q)+')':null).filter(Boolean);
    $('lt-tvx').innerHTML='<b>'+d.what+'</b>: lane '+lane+' holds '+mine.length+' values at (row, column) '+mine.join(' ')+'. Layout '+esc(d.txt)+'.'}
  $('lt-tv').addEventListener('click',e=>{const c=e.target.closest('div[data-t]');if(c){lane=+c.dataset.t;tv()}});
  RD.seg($('lt-tvsel'),m=>{tvSel=m;tv()});tv();
})();
