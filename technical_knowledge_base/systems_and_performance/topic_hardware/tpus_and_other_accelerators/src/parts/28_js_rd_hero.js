// ---- Reading, top: the hero. Memory per chip (where the weights wait) and chips on one fast fabric, log scales ----
// Every number is quoted in a section of the page (see the caption); recompute.py checks the GiB conversions.
(function(){
  const el=document.getElementById('rd-hero-svg');if(!el)return;
  const GIB=1.073741824;
  // name, short name, memory per chip in GB, kind, fabric min, fabric max, fabric label
  const R=[
    ['NVIDIA B200','B200',180,'HBM',8,72,'8 to 72'],
    ['Google TPU7x','TPU7x',192*GIB,'HBM',9216,9216,'9,216'],
    ['AMD MI355X','MI355X',288,'HBM',8,8,'8 (Helios: 72 MI455X)'],
    ['AWS Trainium2','Trainium2',96*GIB,'HBM',16,64,'16 to 64'],
    ['Intel Gaudi 3','Gaudi 3',128,'HBM',8,8,'8'],
    ['Groq 3 LPU','Groq 3',128/256,'SRAM',256,256,'256'],
    ['Cerebras WSE-3','WSE-3',44,'SRAM',1,1,'1 wafer']];
  const L70=70553706496*2/1e9; // Llama 3.1 70B, bf16, GB
  const fmtGB=v=>v>=100?Math.round(v)+' GB':v>=10?Math.round(v)+' GB':v+' GB';
  function panel(x0,y0,pw,lab,title,lo,hi,ticks,tlab,bar){
    const row=24,ax=x0+lab+8,aw=pw-lab-16,sx=v=>ax+aw*(Math.log10(v)-lo)/(hi-lo);
    let h=RD.t(x0,y0+12,title,{fs:12,w:600});
    const top=y0+34,bot=top+R.length*row;
    ticks.forEach((t,i)=>{const x=sx(t);h+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+bot+'" stroke="var(--line)"/>'+
      RD.t(x,bot+14,tlab[i],{a:i===0?'start':i===ticks.length-1?'end':'middle',fs:11,fill:'var(--mute)'})});
    R.forEach((r,i)=>{const y=top+i*row;h+=RD.t(ax-6,y+16,lab<110?r[1]:r[0],{a:'end',fs:11});h+=bar(r,y,sx,ax,aw)});
    return {h,bot:bot+18,sx,top};
  }
  function draw(){
    const w=RD.width(el),wide=w>=640,lab=w<480?72:112;
    const pw=wide?(w-16)/2:w;
    const memBar=(r,y,sx,ax0)=>{const ax=ax0-8;const x1=sx(r[2]),c=r[3]==='SRAM'?'var(--c2)':'var(--c1)';
      const txt=(r[2]<1?r[2].toFixed(1):Math.round(r[2]))+' GB '+r[3];
      const inside=x1-ax>92;
      return '<rect x="'+ax+'" y="'+(y+5)+'" width="'+Math.max(2,x1-ax).toFixed(1)+'" height="14" rx="2" fill="'+c+'" fill-opacity=".85"/>'+
        RD.t(inside?x1-4:x1+4,y+16,txt,{a:inside?'end':'start',fs:11,w:600,fill:inside?'var(--bg)':'var(--ink)'})};
    const domBar=(r,y,sx,ax,aw)=>{const a=sx(r[4]),b=sx(r[5]);const right=b>ax+aw*0.62;
      return '<line x1="'+a+'" x2="'+b+'" y1="'+(y+12)+'" y2="'+(y+12)+'" stroke="var(--acc)" stroke-width="3"/>'+
        '<circle cx="'+a+'" cy="'+(y+12)+'" r="4.5" fill="var(--acc)"/><circle cx="'+b+'" cy="'+(y+12)+'" r="4.5" fill="var(--acc)"/>'+
        RD.t(right?a-8:b+8,y+16,r[6],{a:right?'end':'start',fs:11})};
    const p1=panel(0,0,pw,lab,'Memory per chip (where the weights wait)',-1,3,[0.1,1,10,100,1000],['0.1 GB','1','10','100','1,000 GB'],memBar);
    const x70=p1.sx(L70);
    let h=p1.h+'<line x1="'+x70+'" x2="'+x70+'" y1="'+(p1.top-4)+'" y2="'+(p1.bot-18)+'" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="1.5"/>'+
      RD.t(x70-3,p1.top-6,'70B bf16',{a:'end',fs:11,fill:'var(--bad)'});
    const x2=wide?pw+16:0,y2=wide?0:p1.bot+12;
    const p2=panel(x2,y2,pw,lab,'Chips on one fast fabric',0,4,[1,10,100,1000,10000],['1','10','100','1,000','10,000'],domBar);
    h+=p2.h;
    const H=Math.max(p1.bot,p2.bot)+4;
    el.innerHTML=RD.svg(w,H,h,'Memory per chip and chips per fast fabric for seven accelerators');
  }
  window.__tpuHero=R.map(r=>({name:r[0],gb:r[2],kind:r[3],min:r[4],max:r[5]}));
  RD.onRender(draw);RD.onResize(draw);draw();
})();
