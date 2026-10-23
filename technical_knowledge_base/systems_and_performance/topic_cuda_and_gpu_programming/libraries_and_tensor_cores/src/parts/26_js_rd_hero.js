// ---- Reading tab, top: the hero (static annotated diagram): one PyTorch call down four layers to one tensor-core instruction ----
// Structure only, no data; the keys it shows are repeated in the HTML caption under it.
(function(){
  const el=document.getElementById('lt-hero');if(!el)return;
  const L=[
    {t:'Your code (PyTorch)',c:[['F.linear(x, w, b), then GELU','one call, the running example']]},
    {t:'A library picks a prebuilt kernel',c:[['cuBLAS','plain GEMM (2)'],['cuBLASLt','GEMM + epilogue (2)'],['cuDNN','fused graphs (4)'],['CUTLASS / CuTe','build your own (7)']]},
    {t:'One kernel: six ingredients',c:[['1 tiles on chip','swizzled smem (7)'],['2 tensor-core instr.','per generation (5)'],['3 async pipeline','cp.async, TMA (6)'],['4 warp roles','producer, consumers (6)'],['5 schedule on SMs','waves, Stream-K (3)'],['6 fused epilogue','bias, GELU (2)']]},
    {t:'One tensor-core instruction per generation',hl:1,c:[['Ampere: mma.sync','1 warp, registers'],['Hopper: wgmma','4 warps, operands in smem'],['Blackwell: tcgen05','1 thread, accumulator in TMEM']]}];
  function cols(n,w){let c=Math.min(n,Math.floor((w-16)/150));if(n===6&&(c===4||c===5))c=3;if(n===4&&c===3)c=2;if(n===3&&c===2)c=1;return Math.max(1,c)}
  function draw(){
    const w=RD.width(el),ch=38,g=6,arrow=20;let y=2,b='<defs><marker id="lt-har" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    L.forEach((l,i)=>{const n=l.c.length,k=cols(n,w),rows=Math.ceil(n/k),cw=(w-16-(k-1)*g)/k,h=24+rows*(ch+g)+2;
      b+='<rect x="1" y="'+y+'" width="'+(w-2)+'" height="'+h+'" rx="8" fill="none" stroke="'+(l.hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(l.hl?2:1)+'"/>';
      b+=RD.t(10,y+16,l.t,{fs:12,w:600,fill:l.hl?'var(--acc)':'var(--ink)'});
      l.c.forEach((c,j)=>{const x=8+(j%k)*(cw+g),yy=y+22+Math.floor(j/k)*(ch+g);
        b+='<rect x="'+x.toFixed(1)+'" y="'+yy+'" width="'+cw.toFixed(1)+'" height="'+ch+'" rx="5" fill="'+(l.hl?'var(--acc2)':'var(--soft)')+'" stroke="var(--line)"/>';
        b+=RD.t(x+cw/2,yy+15,c[0],{a:'middle',fs:12,w:600})+RD.t(x+cw/2,yy+30,c[1],{a:'middle',fs:11,fill:'var(--mute)'})});
      y+=h;if(i<L.length-1){b+='<line x1="'+(w/2)+'" y1="'+(y+2)+'" x2="'+(w/2)+'" y2="'+(y+arrow-3)+'" stroke="var(--mute)" stroke-width="2" marker-end="url(#lt-har)"/>';y+=arrow}});
    el.innerHTML=RD.svg(w,y+2,b,'From one PyTorch call through a library and one kernel to the tensor-core instruction of each generation');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
