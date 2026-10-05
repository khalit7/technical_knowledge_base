// ---- Reading, section 7: chips needed just to hold the weights ----
(function(){
  const el=document.getElementById('rd-fit-svg');if(!el)return;
  const P=[8030261248,70553706496,405853388800],PN=['Llama 3.1 8B','Llama 3.1 70B','Llama 3.1 405B'];
  // memory per chip in bytes (decimal), see caption
  const CH=[['Groq TSP (2020), 220 MiB SRAM',220*1048576,'c2','Groq TSP 220 MiB'],['Groq 3 LPU, 0.5 GB SRAM',128e9/256,'c2','Groq 3 LPU 0.5 GB'],['Cerebras WSE-3, 44 GB SRAM',44e9,'c4','WSE-3 44 GB'],
    ['NVIDIA H100, 80 GB HBM',80e9,'c1','H100 80 GB'],['NVIDIA B200, 180 GB HBM',180e9,'c1','B200 180 GB'],['AMD MI355X, 288 GB HBM',288e9,'c3','MI355X 288 GB'],['TPU7x, 192 GiB HBM',192*1073741824,'c6','TPU7x 192 GiB']];
  let mi=1,by=2;
  window.__tpuFit=(m,b)=>CH.map(c=>Math.ceil(P[m]*b/c[1]));
  function draw(){
    const w=RD.width(el),lw=Math.min(190,Math.round(w*0.42)),bw=w-lw-60,row=24;
    const n=window.__tpuFit(mi,by),mx=Math.log10(Math.max(4000,...n));
    let h=RD.t(0,12,(P[mi]*by/1e9).toFixed(1)+' GB of weights ('+PN[mi]+', '+(by===2?'bf16':'8-bit')+')',{fs:11,fill:'var(--mute)'});
    CH.forEach((c,i)=>{const y=20+i*row,len=Math.max(2,bw*Math.log10(n[i]+1)/(mx));
      h+=RD.t(lw-6,y+14,w<480?c[3]:c[0],{a:'end',fs:w<480?9.5:11})+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+len.toFixed(1)+'" height="'+(row-8)+'" rx="2" fill="var(--'+c[2]+')"/>'+RD.t(lw+len+5,y+15,n[i].toLocaleString('en-US'),{fs:11,w:600})});
    el.innerHTML=RD.svg(w,20+CH.length*row+4,h,'Chips needed to hold the weights');
  }
  RD.seg(document.getElementById('rd-fit-mod'),m=>{mi=+m;draw()});
  RD.seg(document.getElementById('rd-fit-prec'),m=>{by=+m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
