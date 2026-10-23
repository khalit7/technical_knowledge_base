// ---- Reading, top: the hero, a static annotated diagram of the library layers (who takes which part of the loop) ----
// Four families as columns, levels of hand-over as rows, PyTorch underneath. Notes in --acc are defaults that change
// the loss (the page's highlight colour); every fact is from sections 2 to 9. Drawn at the measured width.
(function(){
  const el=document.getElementById('lib-hero');if(!el)return;
  const COLS=[{w:'Hugging Face',n:['Hugging Face']},{w:'Lightning',n:['Lightning']},{w:'DeepSpeed, NVIDIA',n:['DeepSpeed,','NVIDIA']},{w:'PyTorch-native',n:['PyTorch-','native']}];
  // chip: n = name lines, m = muted note lines, a = accent note lines (a default that changes the loss), d = no longer maintained
  const ROWS=[
    {l:['A config file','is the whole run'],c:[[{n:['Axolotl'],a:['cosine']},{n:['Unsloth'],m:['own kernels']},{n:['LLaMA-Factory'],nn:['LLaMA-','Factory'],m:['web UI']}],[],[],[]]},
    {l:['Post-training','trainers'],c:[[{n:['TRL'],m:['SFT, DPO,','GRPO'],a:['bf16','lr 1e-6 GRPO']}],[],[],[]]},
    {l:['The library','runs the loop'],c:[[{n:['HF Trainer'],a:['clip 1.0','lr 5e-5','shuffles']}],[{n:['Lightning','Trainer'],m:['no clip']}],[{n:['Megatron','Core'],m:['NVIDIA only']}],[{n:['torchtitan'],a:['bf16','clip 1.0'],m:['fork it']},{n:['torchtune'],m:['unmaintained'],d:1}]]},
    {l:['You keep','the loop'],c:[[{n:['Accelerate'],m:['your loop']}],[{n:['Fabric'],m:['your loop']}],[{n:['DeepSpeed','engine'],a:['clip 1.0','since 0.19.3']}],[{n:['plain loop'],m:['you set all']}]]}
  ];
  const CORE=['loss.backward()','clip_grad_norm_','optimizer.step()','DDP','fully_shard (FSDP2)','DeviceMesh, DTensor','DCP'];
  const chipH=(c,nar)=>8+14*((nar&&c.nn)||c.n).length+13*((c.m||[]).length+(c.a||[]).length);
  function draw(){
    const w=RD.width(el),nar=w<560,G=nar?0:132,gap=nar?4:8,top=nar?30:22;
    const cw=(w-G-gap*3)/4,X=j=>G+j*(cw+gap);
    let s='',y=top;
    COLS.forEach((h,j)=>{const lines=nar?h.n:[h.w];lines.forEach((t,k)=>s+=RD.t(X(j)+cw/2,(nar?11:14)+k*12,t,{a:'middle',fill:'var(--mute)',w:600}))});
    const spineTop=[null,null,null,null];
    const rowY=[];
    ROWS.forEach(r=>{
      if(nar){r.ly=y;y+=16}
      const hs=r.c.map(cell=>cell.reduce((a,c)=>a+chipH(c,nar),0)+Math.max(0,cell.length-1)*4);
      const rh=Math.max(...hs,nar?0:30);rowY.push([y,rh,r]);
      r.c.forEach((cell,j)=>{if(cell.length&&spineTop[j]===null)spineTop[j]=y+10});
      y+=rh+(nar?8:12);
    });
    const coreY=y+(nar?18:4);
    // spines first, so the chips sit on top: every column ends in the PyTorch band
    spineTop.forEach((t,j)=>{if(t!==null)s+='<line x1="'+(X(j)+cw/2)+'" x2="'+(X(j)+cw/2)+'" y1="'+t+'" y2="'+coreY+'" stroke="var(--dim)" stroke-width="3"/>'});
    rowY.forEach(([ry,rh,r])=>{
      if(nar){const t=r.l.join(' ');s+='<rect x="0" y="'+(r.ly)+'" width="'+(t.length*6.4+6)+'" height="14" fill="var(--bg)"/>'+RD.t(0,r.ly+10,t,{fill:'var(--mute)',w:600})}
      if(!nar){s+='<line x1="0" x2="'+(w)+'" y1="'+(ry-6)+'" y2="'+(ry-6)+'" stroke="var(--line)"/>';r.l.forEach((t,k)=>s+=RD.t(16,ry+12+k*13,t,{fill:'var(--ink)'}))}
      r.c.forEach((cell,j)=>{let cy=ry;cell.forEach(c=>{const h=chipH(c,nar),x=X(j);
        s+='<g'+(c.d?' opacity=".55"':'')+'><rect x="'+(x+1)+'" y="'+cy+'" width="'+(cw-2)+'" height="'+h+'" rx="6" fill="var(--bg)" stroke="'+(c.a?'var(--acc)':'var(--line)')+'"'+(c.d?' stroke-dasharray="3 3"':'')+'/>';
        let ty=cy+15;((nar&&c.nn)||c.n).forEach(t=>{s+=RD.t(x+cw/2,ty,t,{a:'middle',w:600,fs:11.5});if(c.d)s+='<line x1="'+(x+cw/2-30)+'" x2="'+(x+cw/2+30)+'" y1="'+(ty-4)+'" y2="'+(ty-4)+'" stroke="var(--bad)"/>';ty+=14});
        (c.m||[]).forEach(t=>{s+=RD.t(x+cw/2,ty,t,{a:'middle',fill:'var(--mute)'});ty+=13});
        (c.a||[]).forEach(t=>{s+=RD.t(x+cw/2,ty,t,{a:'middle',fill:'var(--acc)',w:600});ty+=13});
        s+='</g>';cy+=h+4})})});
    if(!nar){const y0=rowY[rowY.length-1][0]+rowY[rowY.length-1][1],y1=rowY[0][0];
      s+='<line x1="6" x2="6" y1="'+y0+'" y2="'+(y1+2)+'" stroke="var(--acc)" stroke-width="2"/><path d="M1,'+(y1+8)+' L6,'+(y1-2)+' L11,'+(y1+8)+'" fill="none" stroke="var(--acc)" stroke-width="2"/>'}
    // the PyTorch band: chips flow and wrap across the full width
    const bandTop=coreY;let cx=8,cy=bandTop+38,body='';
    const chipW=t=>t.length*6.6+14;
    CORE.forEach(t=>{const cwid=chipW(t);if(cx+cwid>w-8){cx=8;cy+=24}body+='<rect x="'+cx+'" y="'+(cy-14)+'" width="'+cwid+'" height="20" rx="10" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(cx+cwid/2,cy,t,{a:'middle'});cx+=cwid+6});
    const bandH=cy-bandTop+12;
    s+='<rect x="0" y="'+bandTop+'" width="'+w+'" height="'+bandH+'" rx="8" fill="var(--acc2)" stroke="var(--acc)"/>';
    s+=RD.t(8,bandTop+(nar?14:16),nar?'PyTorch underneath: every column ends in these calls':'PyTorch underneath: every column ends in the same calls',{w:600});
    s+=body;
    el.innerHTML=RD.svg(w,bandTop+bandH+2,s,'Libraries on top of PyTorch as layers: config tools, post-training trainers, trainers that run the loop, helpers that keep your loop, and PyTorch underneath');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
