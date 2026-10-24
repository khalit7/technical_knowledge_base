// ---- Reading section 1: score gap to win probability (ids rd-gap-); section 6: AlpacaEval length control before/after (ids rd-lc-) ----
(function(){
  const P=g=>1/(1+Math.pow(10,-g/400));
  const inp=document.getElementById('rd-gap'),el=document.getElementById('rd-gap-svg');
  if(inp&&el){
    function draw(){
      const g=+inp.value,p=P(g);document.getElementById('rd-gap-v').textContent=g+' points, '+(100*p).toFixed(1)+'% wins';
      const W=Math.max(300,Math.min(860,RD.width(el))),H=180,L=40,R=W-14,T=12,Bm=H-36;
      const x=v=>L+v/400*(R-L),y=v=>Bm-(v-50)/50*(Bm-T);let b='';
      [50,60,70,80,90,100].forEach(v=>{b+='<line x1="'+L+'" x2="'+R+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,v+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
      [0,100,200,300,400].forEach(v=>{b+=RD.t(x(v),H-20,v,{a:'middle',fs:10.5,fill:'var(--mute)'})});
      b+=RD.t(R,H-1,'score gap, points',{a:'end',fs:10.5,fill:'var(--mute)'});
      let d='';for(let v=0;v<=400;v+=5)d+=(v?'L':'M')+x(v).toFixed(1)+','+y(100*P(v)).toFixed(1);
      b+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
      b+='<line x1="'+x(g)+'" x2="'+x(g)+'" y1="'+y(100*p)+'" y2="'+Bm+'" stroke="var(--acc)" stroke-dasharray="3 3"/><circle cx="'+x(g)+'" cy="'+y(100*p)+'" r="5" fill="var(--acc)"/>';
      const rt=x(g)>R-150;b+=RD.t(rt?x(g)-9:x(g)+9,y(100*p)-9,(100*p).toFixed(1)+'% at '+g,{fs:11.5,w:600,a:rt?'end':'start'});
      el.innerHTML=RD.svg(W,H,b,'Win probability against score gap');
    }
    inp.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  }
  const lc=document.getElementById('rd-lc-svg');
  if(lc){
    // Dubois et al. 2024 (arXiv 2404.04475): gpt4_1106_preview prompted concise or verbose; Spearman with Chatbot Arena
    const rows=[{n:'Raw win rate',lo:22.9,hi:64.3,rho:'0.94',c:'var(--bad)'},{n:'Length-controlled',lo:41.9,hi:51.6,rho:'0.98',c:'var(--c1)'}];
    function drawLc(){
      const W=Math.max(300,Math.min(860,RD.width(lc))),nar=W<520,L=nar?8:140,R=W-(nar?60:90),rowH=nar?58:42,T=nar?20:16,H=T+rowH*2+26;
      const x=v=>L+v/100*(R-L);let b='';
      [0,25,50,75,100].forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+(T-8)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(x(v),H-8,v+'%',{a:'middle',fs:10.5,fill:'var(--mute)'})});
      b+=RD.t(W-4,T-2,'Spearman',{a:'end',fs:10.5,fill:'var(--mute)'});
      rows.forEach((r,k)=>{const y=T+k*rowH+(nar?16:6);
        b+=nar?RD.t(L,y-5,r.n,{fs:11.5,w:600}):RD.t(L-8,y+11,r.n,{a:'end',fs:11.5,w:600});
        b+='<rect x="'+x(r.lo)+'" y="'+y+'" width="'+(x(r.hi)-x(r.lo))+'" height="14" rx="3" fill="'+r.c+'" fill-opacity=".85"/>';
        b+=RD.t(x(r.lo)-4,y+11,r.lo,{a:'end',fs:11})+RD.t(x(r.hi)+4,y+11,r.hi,{fs:11});
        b+=RD.t(W-4,y+11,r.rho,{a:'end',fs:12,w:700});
      });
      lc.innerHTML=RD.svg(W,H,b,'AlpacaEval raw against length-controlled win rate range under verbosity prompts');
    }
    RD.onRender(drawLc);RD.onResize(drawLc);drawLc();
  }
})();
