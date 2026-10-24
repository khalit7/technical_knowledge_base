// ---- Reading, section 7: ShieldGemma on ToxicChat as reported by four runners (published figures, transcribed in src/inputs/research_guard_models.md) ----
(function(){
  const el=document.getElementById('rd-spread');if(!el)return;
  const R=[
    {n:'Google (makers), per-dataset optimal threshold',m:'F1',v:[0.694,0.729],c:'var(--c1)'},
    {n:'Qwen (rival re-run)',m:'F1',v:[0.694,0.729],c:'var(--c2)'},
    {n:'Mistral (rival), 9B at threshold 0.5',m:'F1',v:[0.624,0.624],c:'var(--c2)'},
    {n:'IBM (rival), default threshold',m:'F1',v:[0.177,0.181],c:'var(--c2)'},
    {n:'IBM (rival), threshold-free',m:'AUC',v:[0.811,0.880],c:'var(--c6)'}
  ];
  function draw(){
    const w=RD.width(el),T=RD.t,L=8,RV=110,tw=w-L-RV;let b='',y=2;
    const sx=v=>L+v*tw;
    [0,0.25,0.5,0.75,1].forEach(g=>{b+='<line x1="'+sx(g)+'" x2="'+sx(g)+'" y1="14" y2="'+(16+R.length*36)+'" stroke="var(--line)"/>'+T(sx(g),10,g.toFixed(2),{fs:10.5,a:g===0?'start':g===1?'end':'middle',fill:'var(--mute)'})});
    y=18;
    R.forEach(r=>{
      b+=T(L,y+11,r.n,{fs:11.5,w:600});
      const x0=sx(r.v[0]),x1=sx(r.v[1]);
      b+='<rect x="'+(x0-3)+'" y="'+(y+16)+'" width="'+Math.max(6,x1-x0+6)+'" height="10" rx="3" fill="'+r.c+'"/>';
      b+=T(w,y+25,r.m+' '+(r.v[0]===r.v[1]?r.v[0].toFixed(3):r.v[0].toFixed(3)+' to '+r.v[1].toFixed(3)),{fs:11,a:'end'});
      y+=36});
    el.innerHTML=RD.svg(w,y+2,b,'ShieldGemma ToxicChat scores by runner: F1 from 0.177 to 0.729, AUC 0.811 to 0.880');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
