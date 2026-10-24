// ---- Section 5: the dueling head on one example, V = 5 and A = (1, -1, 3), recombined by subtracting the mean or the max ----
(function(){
  const el=document.getElementById('vb-duD');if(!el)return;const T=document.getElementById('vb-duT');
  const V=5,A=[1,-1,3];let m='mean';
  function panel(title,vals,lo,hi,col,best){const w=Math.max(130,Math.min(220,(RD.width(el)-30)/4)),H=128,b=22,t=20,n=vals.length,gw=(w-12)/n,bw=Math.min(30,gw*0.62);
    const Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let s=RD.t(4,13,title,{fs:11.5,w:600,fill:'var(--ink)'});
    s+='<line x1="4" x2="'+(w-4)+'" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'" stroke="var(--mute)"/>';
    vals.forEach((v,i)=>{const cx=8+gw*(i+0.5),y0=Y(0),y1=Y(v);const hl=best!=null&&i===best;
      s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(y1-y0)).toFixed(1)+'" fill="'+(hl?'var(--acc)':col)+'" opacity="'+(hl?1:.75)+'"/>';
      s+=RD.t(cx,(v>=0?y1-4:y1+12),RD.n(v,0),{a:'middle',fs:11,w:600,fill:'var(--ink)'});
      if(n>1)s+=RD.t(cx,H-5,'a'+(i+1),{a:'middle',fs:11,fill:'var(--mute)'})});
    return '<div style="min-width:0">'+RD.svg(w,H,s,title)+'</div>'}
  function draw(){const ref=m==='mean'?A.reduce((a,b)=>a+b,0)/A.length:Math.max(...A),Ac=A.map(a=>a-ref),Q=Ac.map(a=>V+a);
    const best=Q.indexOf(Math.max(...Q));
    el.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:4px 10px">'+
      panel('V stream: V(s)',[V],-5,8,'var(--c3)')+panel('A stream: A(s, a)',A,-5,8,'var(--c4)')+
      panel(m==='mean'?'A − mean A':'A − max A',Ac,-5,8,'var(--c4)')+panel('Q = V + that',Q,-5,8,'var(--c1)',best)+'</div>';
    T.innerHTML=m==='mean'?'Mean of A is 1, so Q = (5, 3, 7). V = 5 is the average of Q, not the value of the best action (7). The greedy action is a3 either way.':
      'Max of A is 3, so Q = (3, 1, 5). Now V = 5 equals max Q: V is exactly the state value, and the best action\'s advantage is 0. Same ranking, so the same greedy action a3.'}
  RD.seg(document.getElementById('vb-duM'),v=>{m=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
