// ---- Reading tab, section 6: what fits on one SM, to scale: pipeline stages in a block's shared memory, and the register split ----
// Stage size and counts from window.LT.stages (recompute.py); 227 KB and 99 KB per block from the CUDA Programming Guide;
// 40 and 232 registers from CUTLASS example 48's SASS (USETMAXREG 0x28 and 0xe8).
(function(){
  const el=document.getElementById('lt-bud');if(!el)return;
  const S=window.LT.stages;
  function draw(){
    const w=RD.width(el),bw=w-4;let y=2,b='';
    const kb=bw/227;
    [['H100 block: 227 KB of shared memory',227,S.max_stages_h100],['RTX 5090 block: 99 KB',99,S.max_stages_rtx]].forEach(([t,tot,n])=>{
      b+=RD.t(2,y+12,t,{fs:12,w:600});y+=18;
      for(let i=0;i<n;i++){const x=2+i*S.stage_kb*kb;b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(S.stage_kb*kb-2).toFixed(1)+'" height="24" rx="3" fill="var(--acc)" opacity="0.6"/>'+RD.t(x+S.stage_kb*kb/2,y+16,'stage '+(i+1),{a:'middle',fs:11,w:600})}
      const used=n*S.stage_kb,left=tot-used,x=2+used*kb;
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,left*kb-1).toFixed(1)+'" height="24" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
      y+=24;b+=RD.t(2,y+14,n+' x '+S.stage_kb+' KB = '+used+' KB; '+left+' KB left for the epilogue',{fs:11,fill:'var(--mute)'});y+=26});
    // registers: 65,536 per SM
    const R=65536,p=128*40,c=256*232,u=R-p-c,rs=bw/R;
    b+=RD.t(2,y+12,'Registers per SM: 65,536 (example 48, after setmaxnreg)',{fs:12,w:600});y+=18;
    b+='<rect x="2" y="'+y+'" width="'+(p*rs-1).toFixed(1)+'" height="24" rx="3" fill="var(--c2)"/>';
    b+='<rect x="'+(2+p*rs).toFixed(1)+'" y="'+y+'" width="'+(c*rs-1).toFixed(1)+'" height="24" rx="3" fill="var(--acc)" opacity="0.6"/>'+RD.t(2+p*rs+c*rs/2,y+16,'consumers: 256 x 232 = 59,392',{a:'middle',fs:11,w:600});
    b+='<rect x="'+(2+(p+c)*rs).toFixed(1)+'" y="'+y+'" width="'+Math.max(1,u*rs).toFixed(1)+'" height="24" rx="2" fill="var(--soft)" stroke="var(--line)"/>';
    y+=24;b+=RD.t(2,y+14,'producer: 128 x 40 = 5,120 (left); unused: 1,024 (right)',{fs:11,fill:'var(--mute)'});y+=20;
    el.innerHTML=RD.svg(w,y,b,'Shared-memory stages and register split on one SM, to scale');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
