// ---- Reading tab, section 4: where a cold start goes, by phase, on one axis (measured, vendor, derived) ----
(function(){
  const el=document.getElementById('pr-cs-svg');if(!el)return;
  const V=(window.PRD&&PRD.vllm&&PRD.vllm.start&&PRD.vllm.start[0])||null;
  // [label, sub-label, weights s, engine init s, other s, kind]
  const rows=[];
  if(V){const wt=V.phases.weights_s,ei=V.phases.engine_init_s;
    rows.push(['vLLM v0.31.0, M1 Pro CPU','Qwen3-0.6B, Docker file sharing, measured',wt,ei,V.healthy_s-wt-ei,'meas'])}
  rows.push(['vLLM + Run:ai streamer, A10G','Llama 3 8B from S3, NVIDIA',4.88,23.18-4.88,0,'vend']);
  rows.push(['Running example, vLLM v0.30, H200','72.66 GB at 2 GB/s assumed, derived',36.3,8.2,0,'der']);
  rows.push(['Same, before v0.30','engine init 28.9 s, derived',36.3,28.9,0,'der']);
  const COL={w:'var(--c1)',e:'var(--c4)',o:'var(--dim)'};
  function draw(){
    const w=RD.width(el),narrow=w<640,lw=narrow?0:250,L=lw+6,R=46,rh=narrow?52:36,top=8;
    const tmax=Math.max(...rows.map(r=>r[2]+r[3]+r[4])),X=v=>(w-L-R)*v/Math.ceil(tmax/10)/10;
    let g='',y=top;
    rows.forEach(r=>{
      if(narrow){g+=RD.t(0,y+11,r[0],{fs:11.5,w:600});g+=RD.t(0,y+24,r[1],{fs:10.5,fill:'var(--mute)'});}
      else{g+=RD.t(0,y+13,r[0],{fs:11.5,w:600});g+=RD.t(0,y+27,r[1],{fs:10.5,fill:'var(--mute)'});}
      const by=narrow?y+30:y+6;let x=L;
      [[r[2],COL.w],[r[3],COL.e],[r[4],COL.o]].forEach(([v,c])=>{if(v<=0)return;const ww=Math.max(2,X(v));g+='<rect x="'+x.toFixed(1)+'" y="'+by+'" width="'+ww.toFixed(1)+'" height="18" fill="'+c+'"/>';
        if(ww>34)g+=RD.t(x+ww/2,by+13,v.toFixed(v<10?1:0)+' s',{a:'middle',fs:10.5,fill:'var(--bg)',w:600});x+=ww});
      g+=RD.t(x+4,by+13,(r[2]+r[3]+r[4]).toFixed(1)+' s',{fs:10.5,w:600});
      y+=rh+(narrow?10:8)});
    el.innerHTML=RD.svg(w,y,g,'Cold start time split into weights, engine initialization and other, for four cases')+
      '<div class="leg"><span style="--sw:'+COL.w+'">weights read and loaded</span><span style="--sw:'+COL.e+'">engine initialization (memory profiling, KV allocation, CUDA graphs, compilation)</span><span style="--sw:'+COL.o+'">container start, Python imports, API server</span></div>';
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
