// ---- Reading 2: H100 drawn at two zoom levels (whole chip, one SM) ----
(function(){
  const box=document.getElementById('rd-sm-svg');if(!box)return;
  let mode='chip';
  const R=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+((o&&o.rx)||2)+'" fill="'+f+'"'+(o&&o.st?' stroke="'+o.st+'"':'')+(o&&o.op?' fill-opacity="'+o.op+'"':'')+'/>';
  // 12 of 144 SMs are disabled on H100 SXM5; which ones varies from chip to chip, so the positions are illustrative
  const off=new Set([5,22,31,47,58,66,79,90,101,117,126,139]);
  function chip(w){
    const narrow=w<560,cols=narrow?12:18,rows=144/cols,side=narrow?0:56,top=narrow?44:8;
    const gw=w-2*side-(narrow?0:8),cell=Math.min(28,gw/cols),gridW=cell*cols,x0=(w-gridW)/2;
    const l2h=18,gridH=cell*rows+l2h+8,H=top+gridH+(narrow?50:16);
    let b='';
    // HBM stacks: 6 sites, 5 active on H100 SXM5
    for(let i=0;i<6;i++){const act=i!==5;let x,y,ww,hh;
      if(narrow){ww=(w-5*6)/6;hh=30;x=i*(ww+6);y=i<3?6:top+gridH+8;y=6;}else{ww=44;hh=(gridH-16)/3;x=i<3?4:w-48;y=top+(i%3)*(hh+8)}
      if(narrow&&i>=0){x=i*(ww+6);y=6}
      b+=R(x,y,ww,hh,act?'var(--c2)':'var(--soft)',{op:act?.8:1,st:act?'':'var(--line)'})+RD.t(x+ww/2,y+hh/2+4,act?'HBM3':'unused',{a:'middle',fs:10,fill:act?'var(--bg)':'var(--mute)'})}
    let k=0;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const y=top+r*cell+(r>=rows/2?l2h+8:0);const d=off.has(k);
      b+=R(x0+c*cell+1,y+1,cell-2,cell-2,d?'var(--soft)':'var(--c1)',{op:d?1:.85,st:d?'var(--dim)':''});k++}
    const ly=top+rows/2*cell+4;b+=R(x0,ly,gridW,l2h,'var(--c5)',{op:.75})+RD.t(x0+gridW/2,ly+13,'L2 cache, 50 MB, shared by all SMs',{a:'middle',fs:11,fill:'var(--bg)',w:600});
    if(narrow)b+=RD.t(w/2,H-26,'Each blue square is one SM; grey ones are disabled.',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(w/2,H-10,'Orange: the five HBM3 stacks beside the die.',{a:'middle',fs:11,fill:'var(--mute)'});
    return {svg:RD.svg(w,H,b,'H100: 144 SM sites with 132 enabled, an L2 cache across the middle, HBM stacks at the sides'),
      cnt:[['SMs enabled','132 of 144','12 spare absorb defects'],['FP32 lanes','16,896','132 &times; 128'],['Tensor cores','528','132 &times; 4'],['Registers','33.8 MB','132 &times; 256 KB'],['L2 cache','50 MB',''],['HBM3','80 GB','5 stacks, 3.35 TB/s']],
      note:'Drawn to the counts, not to the floor plan: the real die groups SMs into 8 clusters (GPCs) and which 12 SMs are disabled differs from chip to chip. The sixth HBM site is unused on H100 SXM.'};
  }
  function sm(w){
    const narrow=w<560,pc=narrow?1:2,gap=10,pw=(w-(pc-1)*gap)/pc,ph=narrow?118:124,rows=4/pc;
    let b='',H=rows*(ph+gap)+70;
    for(let p=0;p<4;p++){const x=(p%pc)*(pw+gap),y=Math.floor(p/pc)*(ph+gap);
      b+=R(x,y,pw,ph,'var(--soft)',{st:'var(--line)',rx:6});
      b+=R(x+6,y+6,pw-12,16,'var(--c4)',{op:.8})+RD.t(x+pw/2,y+18,'Warp scheduler: 1 instruction per cycle for 32 threads',{a:'middle',fs:10,fill:'var(--bg)'});
      const lw=Math.min(14,(pw*0.48-6)/8);
      for(let i=0;i<32;i++){b+=R(x+6+(i%8)*lw,y+28+Math.floor(i/8)*lw,lw-2,lw-2,'var(--c1)',{op:.85})}
      b+=RD.t(x+6,y+28+4*lw+12,'32 fp32 lanes',{fs:10,fill:'var(--mute)'});
      const tx=x+pw*0.52,tw=pw*0.48-6;
      b+=R(tx,y+28,tw,26,'var(--c3)',{op:.85})+RD.t(tx+tw/2,y+45,'Tensor core',{a:'middle',fs:11,fill:'var(--bg)',w:600});
      b+=R(tx,y+60,tw,26,'var(--c6)',{op:.7})+RD.t(tx+tw/2,y+77,'Registers 64 KB',{a:'middle',fs:11,fill:'var(--bg)'});
      b+=RD.t(x+8,y+ph-8,'Sub-partition '+(p+1),{fs:10,fill:'var(--mute)'});
    }
    const y=rows*(ph+gap);
    b+=R(0,y,w*0.72,28,'var(--c5)',{op:.75})+RD.t(w*0.36,y+18,'L1 / shared memory 256 KB',{a:'middle',fs:11,fill:'var(--bg)',w:600});
    b+=R(w*0.74,y,w*0.26,28,'var(--c2)',{op:.75})+RD.t(w*0.87,y+18,'TMA',{a:'middle',fs:11,fill:'var(--bg)',w:600});
    b+=RD.t(w/2,y+50,'Up to 64 warps (2,048 threads) resident, registers kept in place',{a:'middle',fs:11,fill:'var(--mute)'});
    return {svg:RD.svg(w,H,b,'One H100 SM: four sub-partitions, each with a warp scheduler, 32 lanes, a tensor core and 64 KB of registers; shared L1 and the TMA copy engine'),
      cnt:[['Sub-partitions','4',''],['FP32 lanes','128','4 &times; 32'],['Tensor cores','4','2,048 BF16 FMAs per cycle together'],['Resident threads','2,048','64 warps of 32'],['Registers','256 KB','64K &times; 32 bit'],['L1 + shared','256 KB','up to 228 KB shared']],
      note:'Each sub-partition issues one warp instruction per cycle; with 64 warps resident, a warp waiting on memory costs nothing as long as another is ready.'};
  }
  function draw(){const w=RD.width(box),o=mode==='chip'?chip(w):sm(w);box.innerHTML=o.svg;
    document.getElementById('rd-sm-cnt').innerHTML=o.cnt.map(c=>RD.stat(c[0],c[1],c[2])).join('');document.getElementById('rd-sm-note').textContent=o.note}
  RD.seg(document.getElementById('rd-sm-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
