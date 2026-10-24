// ---- Section 6: hit-rate arithmetic, one slider: database load (1 - h) x lambda against its capacity, and mean latency ----
(function(){
  const box=document.getElementById('rd-hit-svg'),sl=document.getElementById('rd-hit-h');if(!box||!sl)return;
  const LAM=1000,CAP=600,TC=CA.pg.costs.redis_get.median_ms,TD=CA.pg.costs.usage_aggregate.median_ms;
  window.CAHIT={LAM,CAP,TC,TD,db:h=>(1-h)*LAM,lat:h=>h*TC+(1-h)*(TC+TD)};
  function draw(){
    const h=+sl.value/100,db=CAHIT.db(h),lat=CAHIT.lat(h),over=db>CAP;
    document.getElementById('rd-hit-hv').textContent=Math.round(h*100)+'%';
    document.getElementById('rd-hit-out').innerHTML=RD.stat('Database reads a second',Math.round(db).toLocaleString('en-US'),'(1 − h) × 1,000')+
      RD.stat('Database busy','<span style="color:'+(over?'var(--bad)':'var(--good)')+'">'+Math.round(db/CAP*100)+'%</span>',over?'over capacity: queues grow':'of its 600 a second')+
      RD.stat('Mean latency',lat.toFixed(2)+' ms','h × t<sub>cache</sub> + (1 − h)(t<sub>cache</sub> + t<sub>db</sub>)');
    const W=Math.min(RD.width(box),760),H=210,L=50,R=20,T=12,B=34,w=W-L-R,hh=H-T-B,xs=v=>L+v*w,ys=v=>T+hh-v/LAM*hh;let g='';
    for(let i=0;i<=4;i++){const v=LAM*i/4,y=ys(v);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+4,String(v),{a:'end',fs:10.5,fill:'var(--mute)'})}
    for(let i=0;i<=10;i+=(W<520?2:1)){const x=xs(i/10);g+=RD.t(x,T+hh+14,(i*10)+'%',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    g+=RD.t(L+w/2,H-3,'hit ratio',{a:'middle',fs:11,fill:'var(--mute)'});
    const hc=1-CAP/LAM;
    g+='<path d="M'+xs(0)+','+ys(LAM)+' L'+xs(hc)+','+ys(CAP)+' L'+xs(0)+','+ys(CAP)+' Z" fill="var(--bad)" opacity=".18"/>';
    g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+ys(CAP)+'" y2="'+ys(CAP)+'" stroke="var(--bad)" stroke-dasharray="5 4"/>'+RD.t(L+w-4,ys(CAP)-5,'database capacity, 600 a second',{a:'end',fs:11,fill:'var(--bad)'});
    g+='<path d="M'+xs(0)+','+ys(LAM)+' L'+xs(1)+','+ys(0)+'" stroke="var(--c1)" stroke-width="2.4"/>';
    g+='<circle cx="'+xs(h)+'" cy="'+ys(db)+'" r="5.5" fill="var(--acc)"/>'+RD.t(xs(h)+(h>0.7?-8:8),ys(db)-8,Math.round(db)+' a second',{a:h>0.7?'end':'start',fs:11,w:600,fill:'var(--ink)'});
    g+=RD.t(xs(0)+6,ys(LAM)+14,'empty cache',{fs:11,fill:'var(--bad)'});
    box.innerHTML=RD.svg(W,H,g,'Database reads a second against hit ratio');
  }
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
