// ---- Reading section 3: same model, many agents on the Terminal-Bench 2.0 public board (data: window.HS from mk_harness.py) ----
(function(){
  const fig=document.getElementById('hs-fig');if(!fig||!window.HS)return;
  const T=RD.t,E=RD.esc,M=HS.models;
  const COL={own:'var(--bad)',neutral:'var(--c4)',third:'var(--acc)'};
  let cur=[0,M[0].a.length-1];
  function draw(){
    const W=RD.width(fig),L=8,R=8,rowH=74,top=22,lo=30,hi=85;
    const X=v=>L+(W-L-R)*(v-lo)/(hi-lo);
    let b='';
    [30,40,50,60,70,80].forEach(v=>{b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-6)+'" y2="'+(top+M.length*rowH-8)+'" stroke="var(--line)"/>'+T(X(v),12,v+'%',{a:v===30?'start':'middle',fs:10.5,fill:'var(--mute)'})});
    M.forEach((m,mi)=>{const y0=top+mi*rowH,yl=y0+34;
      b+=T(L,y0+12,E(m.m),{fs:12,w:600,fill:'var(--ink)'})+T(W-R,y0+12,'spread '+(m.hi-m.lo).toFixed(1)+' pts, '+m.a.length+' agents',{a:'end',fs:11,fill:'var(--mute)'});
      b+='<line x1="'+X(m.lo)+'" x2="'+X(m.hi)+'" y1="'+yl+'" y2="'+yl+'" stroke="var(--mute)" stroke-width="2"/>';
      m.a.forEach((a,ai)=>{const sel=cur[0]===mi&&cur[1]===ai,dy=(ai%2?6:-6);
        if(sel)b+='<line x1="'+X(a.v-a.ci)+'" x2="'+X(a.v+a.ci)+'" y1="'+(yl+dy)+'" y2="'+(yl+dy)+'" stroke="var(--ink)" stroke-width="2"/>';
        b+='<circle data-m="'+mi+'" data-a="'+ai+'" cx="'+X(a.v)+'" cy="'+(yl+dy)+'" r="'+(sel?7:5.5)+'" fill="'+COL[a.k]+'" stroke="'+(sel?'var(--ink)':'var(--bg)')+'" stroke-width="1.5" style="cursor:pointer"><title>'+E(a.h)+': '+a.v+'%</title></circle>'});
      const first=m.a[0],last=m.a[m.a.length-1];
      b+=T(L,yl+26,'lowest: '+E(first.h)+' '+first.v.toFixed(1)+', highest: '+E(last.h)+' '+last.v.toFixed(1),{fs:11,fill:'var(--mute)'});
    });
    fig.innerHTML=RD.svg(W,top+M.length*rowH-4,b,'Terminal-Bench 2.0 accuracy for four models, one dot per agent');
    fig.querySelectorAll('circle[data-m]').forEach(c=>c.addEventListener('click',()=>{cur=[+c.dataset.m,+c.dataset.a];draw()}));
    const m=M[cur[0]],a=m.a[cur[1]];
    document.getElementById('hs-info').innerHTML='<b>'+E(m.m)+' in '+E(a.h)+'</b>'+(a.org?' ('+E(a.org)+')':'')+': '+a.v.toFixed(1)+'% &plusmn; '+a.ci+' (95%), '+(a.ver?'verified':'unverified')+' on the board; '+(a.k==='own'?'the provider\'s own agent':a.k==='neutral'?'the benchmark\'s neutral agent':'a third-party agent')+'.';
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
