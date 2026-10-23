// ---- Reading top: the hero, a static annotated ladder of the memory spaces a CUDA programmer touches (H100 sizes, H800 latencies) ----
(function(){
  const el=document.getElementById('rd-hero');if(!el||!window.RD)return;
  // [title, detail, latency or note, highlighted (reuse happens here)]
  const ROWS=[
    [['Registers: one thread','65,536 x 32-bit per SM, up to 255 per thread','read by the ALUs directly',1]],
    [['Shared memory: one block','up to 228 KB per SM; LDS, STS','29.0 cycles',1],['L1: one SM','same SRAM pool; caches LDG','40.7 cycles',0]],
    [['L2: whole GPU','50 MB; every DRAM access passes here','263.0 cycles',0]],
    [['DRAM (HBM3): 80 GB at 3.35 TB/s','global LDG/STG, local LDL/STL, constant LDC','478.8 cycles',0]],
    [['Host RAM, pinned','copy engines over PCIe or NVLink-C2C','copies, not loads',0]]];
  function draw(){
    const W=RD.width(el),narrow=W<520,bh=narrow?50:46,gap=narrow?20:18,x0=2,x1=W-2;let s='',y=4;
    const box=(x,w,r,yy)=>{const hl=r[3];
      s+='<rect x="'+x.toFixed(1)+'" y="'+yy+'" width="'+w.toFixed(1)+'" height="'+bh+'" rx="6" style="fill:'+(hl?'var(--acc2)':'var(--soft)')+';stroke:'+(hl?'var(--acc)':'var(--line)')+'"/>';
      s+=RD.t(x+8,yy+16,r[0],{fs:12,w:600});
      const fit=t=>{const max=Math.floor((w-14)/6.1);return t.length>max?t.slice(0,max-1)+'.':t};
      s+=RD.t(x+8,yy+30,fit(r[1]),{fs:11,fill:'var(--ink)'})+RD.t(x+8,yy+43,fit(r[2]),{fs:11,fill:'var(--mute)'});};
    const rows=narrow?[ROWS[0],[ROWS[1][0]],[ROWS[1][1]],ROWS[2],ROWS[3],ROWS[4]]:ROWS;
    const labs=narrow?['LDS / STS','same SRAM pool','LDG through L1','LDG, LDGSTS, TMA','cudaMemcpyAsync (DMA)']:['LDS / STS; loads land in registers','LDG via L1; LDGSTS and TMA fill shared memory','LDG, STG','cudaMemcpyAsync (DMA)'];
    rows.forEach((row,i)=>{
      if(row.length===1)box(x0,x1-x0,row[0],y);
      else{const hw=(x1-x0-8)/2;box(x0,hw,row[0],y);box(x0+hw+8,hw,row[1],y)}
      if(i<rows.length-1){const ay=y+bh,cx=W*0.18,lab=labs[i];
        s+='<line x1="'+cx+'" y1="'+(ay+gap-2)+'" x2="'+cx+'" y2="'+(ay+3)+'" style="stroke:var(--acc);stroke-width:2"/><path d="M'+(cx-4)+' '+(ay+8)+' L'+cx+' '+(ay+2)+' L'+(cx+4)+' '+(ay+8)+'" style="fill:none;stroke:var(--acc);stroke-width:2"/>';
        s+=RD.t(cx+10,ay+gap/2+4,lab,{fs:11,fill:'var(--mute)'});}
      y+=bh+gap;});
    el.innerHTML=RD.svg(W,y-gap+4,s,'The GPU memory ladder: registers, shared memory and L1, L2, DRAM, host memory, with sizes, latencies and SASS instructions');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
