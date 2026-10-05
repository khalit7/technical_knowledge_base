// ---- GPU simulator: 6 tiling and reuse ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-tile-card'))return;
  const N=8,TS=4,NB=N/TS;
  let mode='naive';
  const steps=[];for(let bi=0;bi<NB;bi++)for(let bj=0;bj<NB;bj++)for(let k=0;k<NB;k++)steps.push({bi,bj,k});
  const fig=$('sim-tile-fig');
  function counts(i){
    const a=[],b=[];for(let r=0;r<N;r++){a.push(new Array(N).fill(0));b.push(new Array(N).fill(0))}
    let loads=0;
    for(let s=0;s<i;s++){const {bi,bj,k}=steps[s];
      for(let r=bi*TS;r<bi*TS+TS;r++)for(let kk=k*TS;kk<k*TS+TS;kk++)a[r][kk]+=mode==='naive'?TS:1;
      for(let kk=k*TS;kk<k*TS+TS;kk++)for(let c=bj*TS;c<bj*TS+TS;c++)b[kk][c]+=mode==='naive'?TS:1;
      loads+=mode==='naive'?TS*TS*2*TS:2*TS*TS}
    return {a,b,loads};
  }
  function draw(i){
    const W=U.width(fig),across=W>=520,cs=Math.max(18,Math.min(30,Math.floor((across?(W-40)/3:W-20)/N)));
    const g=N*cs,cur=i>0?steps[i-1]:null,ct=counts(i);
    const pos=k=>across?[k*(g+20),18]:[0,18+k*(g+28)];
    let b='';
    const grid=(k,title,val,hl)=>{const [ox,oy]=pos(k);let s=U.t(ox,oy-5,title,{fs:11,w:600});
      for(let r=0;r<N;r++)for(let c=0;c<N;c++){const v=val(r,c),h=hl(r,c);
        s+=U.rect(ox+c*cs,oy+r*cs,cs-1,cs-1,h?'var(--acc2)':'var(--soft)',{st:h?'var(--acc)':'var(--line)',sw:h?1.5:.6});
        if(v)s+=U.t(ox+c*cs+cs/2-.5,oy+r*cs+cs*0.66,v,{fs:Math.min(11,cs*0.45),a:'middle',fill:v>2?'var(--bad)':'var(--ink)',w:v>2?600:null})}
      return s};
    b+=grid(0,'A: times each element was loaded',(r,c)=>ct.a[r][c],(r,c)=>cur&&Math.floor(r/TS)===cur.bi&&Math.floor(c/TS)===cur.k);
    b+=grid(1,'B: times each element was loaded',(r,c)=>ct.b[r][c],(r,c)=>cur&&Math.floor(r/TS)===cur.k&&Math.floor(c/TS)===cur.bj);
    const done=(r,c)=>{const bi=Math.floor(r/TS),bj=Math.floor(c/TS);const last=(bi*NB+bj)*NB+NB;return i>=last};
    b+=grid(2,'C: finished outputs',(r,c)=>done(r,c)?'✓':'',(r,c)=>cur&&Math.floor(r/TS)===cur.bi&&Math.floor(c/TS)===cur.bj);
    const H=across?18+g+6:pos(2)[1]+g+6;
    fig.innerHTML=U.svg(W,H,b,'Loads from global memory in an 8 by 8 matmul');
    const tot=C.tileAnim(N,TS);
    $('sim-tile-cap').textContent=!cur?'Nothing loaded yet. C has 64 outputs; each needs 8 multiply-adds, one row of A times one column of B.':
      'Block ('+cur.bi+', '+cur.bj+'), k-slice '+cur.k+': '+(mode==='naive'?'each of the 16 threads reads its own 4 values of A and 4 of B from global memory, 128 loads, so every element of the slice is fetched 4 times.':'the block loads the 4 x 4 slice of A and of B into shared memory once, 32 loads; the 16 threads then read them from shared memory.');
    $('sim-tile-out').innerHTML=U.stat('Loads from global memory',ct.loads,'of '+(mode==='naive'?tot.naive:tot.staged)+' in total')+U.stat('Multiply-adds done',i*TS*TS*TS,'of 512')+
      U.stat('Multiply-adds per load',U.fmt(i?i*TS*TS*TS/ct.loads:0,2),mode==='naive'?'0.5: one per 2 loads':'2: tile side / 2')+U.stat('Whole matmul',(mode==='naive'?tot.naive:tot.staged)+' loads',mode==='naive'?'2 n³ = 1,024':'2 n³ / T = 256');
  }
  const A=U.anim({card:'sim-tile-card',ctl:'sim-tile-ctl',n:steps.length+1,draw,ms:900,label:'Block step'});
  U.seg($('sim-tile-mode'),m=>{mode=m;A.reset(steps.length+1);A.play()});
  U.onResize(()=>A.redraw());

  // ---------- across tile sizes ----------
  const P=D&&D.pub||{},M1=P.m1||{};
  const ch=P.chips||{};
  const S={m:7,n:7,k:5,el:2,db:true,size:8192};
  const CC={'H100 SXM':'var(--c2)','B200 (HGX)':'var(--c4)','RTX 5090':'var(--c5)','A100 SXM':'var(--c6)'};
  function ridges(){
    const r=[];
    if(S.el===4){
      if(M1.fp32_measured)r.push(['Apple M1 Pro, fp32 (measured)',M1.fp32_measured/M1.read_measured,'var(--c3)']);
      for(const [k,v] of Object.entries(ch))r.push([k+', fp32 cores',v.fp32/v.bw,CC[k]||'var(--c2)']);
    }else{
      if(M1.fp16_measured)r.push(['Apple M1 Pro, fp16 (measured)',M1.fp16_measured/M1.read_measured,'var(--c3)']);
      for(const [k,v] of Object.entries(ch))r.push([k+', bf16 tensor, dense',v.bf16/v.bw,CC[k]||'var(--c2)']);
    }
    return r.sort((a,b)=>a[1]-b[1]);
  }
  const tfig=$('sim-tc-fig');
  function tdraw(){
    const bm=2**S.m,bn=2**S.n,bk=2**S.k;
    $('sim-tc-mv').textContent=bm;$('sim-tc-nv').textContent=bn;$('sim-tc-kv').textContent=bk;
    const r=C.tiling(S.size,bm,bn,S.el),smem=(bm*bk+bk*bn)*S.el*(S.db?2:1);
    const fits=Object.entries(C.ARCH).filter(([k,a])=>smem<=a.smemBlock).map(([k])=>k);
    const h=ch['H100 SXM'];
    const tm=r.bytes/h.bw,tc=r.flops/(S.el===4?h.fp32:h.bf16);
    $('sim-tc-out').innerHTML=U.stat('Arithmetic intensity',U.fmt(r.ai,r.ai<10?2:0)+' FLOP/B','2 BM BN / ((BM + BN) x '+S.el+' B)')+
      U.stat('Bytes from DRAM',U.fmt(r.bytes/1e9,r.bytes<1e10?2:1)+' GB','for one '+S.size.toLocaleString('en-US')+'-cube matmul ('+U.fmt(r.flops/1e12,1)+' TFLOP)')+
      U.stat('Shared memory per block',U.fmt(smem/1024,smem%1024?1:0)+' KB',(S.db?'2 stages':'1 stage')+' of (BM + BN) x BK; fits '+(fits.length?fits.join(', '):'no GPU listed'))+
      U.stat('On an H100 SXM, no L2 reuse',tm>tc?'memory-bound':'compute-bound','DRAM '+U.fmt(tm*1e3,2)+' ms against math '+U.fmt(tc*1e3,2)+' ms ('+(S.el===4?'fp32 cores':'bf16 tensor cores')+')');
    // chart
    const W=U.width(tfig),H=250,ml=44,mr=10,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb;
    const lo=Math.log2(0.1),hi=Math.log2(1000),Y=v=>mt+ph*(1-(Math.log2(Math.max(0.1,v))-lo)/(hi-lo)),X=t=>ml+pw*t/8;
    let b='';
    [0.1,1,10,100,1000].forEach(v=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.t(ml-4,Y(v)+3.5,v,{fs:10,a:'end',fill:'var(--mute)'})});
    const rg=ridges().sort((a,c)=>c[1]-a[1]);let prevTy=-99;
    rg.forEach(([nm,v,col])=>{const y=Y(v);b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="'+col+'" stroke-dasharray="5 3" stroke-width="1.2"/>';
      const ty=Math.max(y-3,prevTy+12);prevTy=ty;
      if(W>=520)b+=U.t(W-mr-2,ty,nm+' '+U.fmt(v,0),{fs:9.5,a:'end',fill:col})});
    const leg=W<520?'<div class="sim-leg">'+rg.map(([nm,v,col])=>'<span><i style="background:'+col+'"></i>'+nm+': '+U.fmt(v,0)+' FLOP/B</span>').join('')+'</div>':'';
    let d='';for(let t=0;t<=8;t++){const v=C.tiling(S.size,2**t,2**t,S.el).ai;d+=(t?'L':'M')+X(t).toFixed(1)+' '+Y(v).toFixed(1)}
    b+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    for(let t=0;t<=8;t++){b+='<circle cx="'+X(t)+'" cy="'+Y(C.tiling(S.size,2**t,2**t,S.el).ai)+'" r="2.5" fill="var(--c1)"/>';b+=U.t(X(t),H-mb+14,2**t,{fs:10,a:'middle',fill:'var(--mute)'})}
    const xt=(S.m+S.n)/2;b+='<circle cx="'+X(xt)+'" cy="'+Y(r.ai)+'" r="5.5" fill="var(--bad)"/>';
    b+=U.t(ml+pw/2,H-3,'square tile side T (log scale); red: your BM x BN tile',{fs:10,a:'middle',fill:'var(--mute)'});
    b+=U.t(ml+4,mt+10,'FLOP per byte (log)',{fs:10,fill:'var(--mute)'});
    tfig.innerHTML=U.svg(W,H,b,'Arithmetic intensity against tile size, with ridge points')+leg;
    $('sim-tc-note').innerHTML='Dashed lines are ridge points: peak FLOP/s divided by memory bandwidth. Below its line a GPU waits on memory; above, on arithmetic. <span class="sim-tag doc">PUBLISHED</span>NVIDIA peak and bandwidth figures: '+Object.entries(ch).map(([k,v])=>'<a href="'+v.url+'" target="_blank" rel="noopener noreferrer">'+k+'</a> ('+U.fmt(S.el===4?v.fp32/1e12:v.bf16/1e12,1)+' TFLOP/s, '+U.fmt(v.bw/1e12,2)+' TB/s)').join(', ')+', vendor pages read 2026-10-05, dense rates. <span class="sim-tag meas">MEASURED</span>The M1 line uses the peak FMA rate and read bandwidth measured by the Roofline lab on {{Topic: hardware|n:3c65c17b0d0d8118beeefaed56da6f8e}} ('+U.fmt((S.el===4?M1.fp32_measured:M1.fp16_measured)/1e12,2)+' TFLOP/s, '+U.fmt(M1.read_measured/1e9,1)+' GB/s); the M1 has no bf16 tensor rate, so the bf16 view shows its fp16 rate. The model assumes no cache reuse between blocks, so it is a worst case for DRAM traffic: L2 lets neighbouring blocks share tiles.';
  }
  [['m','sim-tc-m'],['n','sim-tc-n'],['k','sim-tc-k']].forEach(([k,id])=>$(id).addEventListener('input',e=>{S[k]=+e.target.value;tdraw()}));
  U.seg($('sim-tc-dt'),m=>{S.el=+m;tdraw()});
  $('sim-tc-db').addEventListener('change',e=>{S.db=e.target.checked;tdraw()});
  $('sim-tc-size').addEventListener('change',e=>{S.size=+e.target.value;tdraw()});
  U.onRender(tdraw);U.onResize(tdraw);

  if(D&&D.m&&D.m.tiling){
    const cs=D.m.tiling.slice().sort((a,b)=>a.tile-b.tile),mx=Math.max(...cs.map(c=>c.gflops));
    const nm=c=>c.tile===1?'naive, no tiles':'tile '+c.tile+' x '+c.tile;
    const rows=cs.map(c=>'<div class="row"><span class="nm">'+nm(c)+' <span class="mute">('+U.fmt(c.tile/4,c.tile<4?2:0)+' FLOP/B)</span></span><span class="track"><span class="fill" style="width:'+(100*c.gflops/mx)+'%;background:'+(c.tile===1?'var(--c2)':'var(--c3)')+'"></span></span><span class="val">'+U.fmt(c.gflops,0)+' GFLOP/s</span></div>').join('');
    const g=t=>cs.find(c=>c.tile===t);
    const rc=P.roof_cross||{},rn=rc['matmul naive, custom (fp32, 2048)'],rt=rc['matmul tiled 16x16, custom (fp32, 2048)'];
    $('sim-tile-meas-body').innerHTML='<p class="small" style="margin:0 0 6px">C = A B with n = 2,048 in fp32 (17.2 GFLOP per call), one thread per output; the tiled kernels stage T x T tiles of A and B in threadgroup memory, threadgroups of T x T threads. In brackets: the intensity the model above gives (T / 4).</p><div class="sim-hb">'+rows+'</div>'+
      '<p class="small" style="margin:6px 0 0">8 x 8 tiles double the naive kernel ('+U.fmt(g(8).gflops/g(1).gflops,2)+'x); 16 x 16 is about the same ('+U.fmt(g(16).gflops,0)+'); 32 x 32 is slower ('+U.fmt(g(32).gflops,0)+'), though it moves the fewest bytes. All are far from the '+U.fmt(M1.fp32_measured/1e9,0)+' GFLOP/s FMA peak: with one output per thread, every multiply-add also costs two threadgroup-memory reads, and 1,024-thread groups with a barrier every 32 steps leave the cores waiting. Fewer bytes from DRAM is necessary, not sufficient; the next steps (several outputs per thread from registers, wider loads, the M1\'s matrix instructions) are timed on the same 2,048 matmul in the {{Kernel lab|#t-lab}}, which also shows what an uncoalesced naive kernel costs.'+
      (rn?' The Roofline lab on Topic: hardware timed its own copies of the naive and 16 x 16 kernels independently on the same machine: '+U.fmt(rn,0)+' and '+U.fmt(rt,0)+' GFLOP/s, within a few percent of the figures here.':'')+' Median of 3 runs; Apple M1 Pro GPU, MLX '+D.meta.mlx+', '+D.meta.date+'.</p>';
  }
})();
