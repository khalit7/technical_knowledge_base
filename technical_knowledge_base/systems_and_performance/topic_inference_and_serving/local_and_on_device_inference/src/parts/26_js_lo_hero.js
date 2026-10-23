// ---- Reading top: the hero figure. One file (Qwen3-4B Q4_K_M with an imatrix) in the memory budget, and the bytes each token reads. Static; drawn at the measured width ----
(function(){
  const el=document.getElementById('lo-hero');if(!el||!window.LO||!LO.q||!LO.q.m4)return;
  const it=LO.q.m4.items.find(x=>x.id==='Q4_K_M+i');if(!it)return;
  const W8=it.bytes/1e9, KV=147456*40960/1e9, BW=200, TOT=16, WS=parseFloat(LO.facts.wsGB)||12.7, MEAS=it.tg;
  function draw(){
    const w=Math.max(300,Math.min(860,RD.width(el))),narrow=w<520,L=6,R=6,bh=26,X=v=>L+(w-L-R)*v/TOT;
    let b='',y=16;
    const seg=(x0,x1,yy,fill,lab,op,tc)=>'<rect x="'+X(x0).toFixed(1)+'" y="'+yy+'" width="'+Math.max(1,X(x1)-X(x0)).toFixed(1)+'" height="'+bh+'" fill="'+fill+'"'+(op?' opacity="'+op+'"':'')+' stroke="var(--bg)"/>'+
      (lab&&X(x1)-X(x0)>lab.length*6.2+8?RD.t((X(x0)+X(x1))/2,yy+bh/2+4,lab,{a:'middle',fs:11,fill:tc||'var(--bg)'}):'');
    b+=RD.t(L,y,narrow?'Memory, 16 GB (GPU may use '+WS.toFixed(1)+')':'Memory: 16 GB unified, of which the GPU may use '+WS.toFixed(1)+' GB',{fs:11.5,w:600});y+=6;
    b+=seg(0,W8,y,'var(--c1)',narrow?W8.toFixed(2):'weights '+W8.toFixed(2))+seg(W8,W8+KV,y,'var(--c2)',narrow?'KV '+KV.toFixed(2):'KV cache, 40,960 tokens: '+KV.toFixed(2)+' GB')+seg(W8+KV,WS,y,'var(--soft)',narrow?'free':'free for buffers, apps',0,'var(--mute)')+seg(WS,TOT,y,'var(--line)',narrow?'macOS':'kept by macOS',0,'var(--ink)');
    b+='<line x1="'+X(WS).toFixed(1)+'" x2="'+X(WS).toFixed(1)+'" y1="'+(y-4)+'" y2="'+(y+bh+4)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>';
    y+=bh+26;
    b+=RD.t(L,y,narrow?'Bytes read per token, ceiling at 200 GB/s':'Bytes read per generated token, and the speed ceiling at 200 GB/s',{fs:11.5,w:600});y+=6;
    const row=(gb,lab1,lab2)=>{let s=seg(0,Math.min(gb,W8),y,'var(--c1)','')+(gb>W8?seg(W8,gb,y,'var(--c2)',''):'');
      const tx=X(gb)+6,txt=lab1+': at most '+Math.round(BW/gb)+' tok/s'+(lab2||'');
      s+=(w-tx>txt.length*6.1)?RD.t(tx,y+bh/2+4,txt,{fs:11}):RD.t(L,y+bh+13,txt,{fs:11});return s};
    b+=row(W8,narrow?'short prompt':'short prompt, weights only',' (measured '+MEAS.toFixed(1)+')');y+=bh+(w-X(W8)-6>300?10:22);
    b+=row(W8+KV,narrow?'full context':'full 40,960-token context');y+=bh+(w-X(W8+KV)-6>230?8:20);
    el.innerHTML=RD.svg(w,y+4,b,'memory budget and bytes read per token for Qwen3-4B Q4_K_M on a 16 GB M1 Pro');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
