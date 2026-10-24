// ---- Section 3: leaderboard, rank lookup cost against the player's rank (measured points from inputs/rank.json and redis.json) ----
(function(){
  const el=document.getElementById('rd-lb-svg');if(!el||!window.NQ||!NQ.redis)return;
  const RK=NQ.rank, LB=NQ.redis.leaderboard;if(!RK)return;
  const T=RD.t;
  const pts=RK.rank.slice().sort((a,b)=>a.rank-b.rank).map(r=>[r.rank,r.ms,r.buffers]);
  const red=LB.rank_us_p50/1000;
  function draw(){const w=RD.width(el),h=200,x0=44,x1=w-16,y0=12,y1=h-40,mx=100000,my=10;
    const X=v=>x0+v/mx*(x1-x0),Y=v=>y1-v/my*(y1-y0);let s='';
    [0,2,4,6,8,10].forEach(v=>{s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(x0-5,Y(v)+4,v+' ms',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [0,25000,50000,75000,100000].forEach(v=>{s+=T(X(v),y1+15,v?(v/1000)+'k':'1',{a:v===100000?'end':v?'middle':'start',fs:10.5,fill:'var(--mute)'})});
    s+=T((x0+x1)/2,h-6,"player's rank (1 = best)",{a:'middle',fs:11,fill:'var(--mute)'});
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2.2" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
    pts.forEach((p,i)=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="4" fill="var(--c1)"/>';
      if(i>0)s+=T(X(p[0])-6,Y(p[1])-8,p[2]+' pages, '+p[1].toFixed(2)+' ms',{a:'end',fs:11,fill:'var(--c1)',w:600})});
    s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(red)+'" y2="'+Y(red)+'" stroke="var(--c4)" stroke-width="2.4" stroke-dasharray="6 3"/>';
    s+=T(x0+22,Y(red)-7,'Redis ZREVRANK: '+Math.round(LB.rank_us_p50)+' µs at any rank',{fs:11,fill:'var(--c4)',w:600});
    s+=T(x0+6,Y(7.4),'Postgres count(*) of players above',{fs:11,fill:'var(--c1)',w:600});
    el.innerHTML=RD.svg(w,h,s,'Time to find a player rank: Postgres grows with the rank, Redis stays flat')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
