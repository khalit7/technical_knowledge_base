// ---- Reading, section 6: 50 concurrent requests under four handler styles (measured; API_DATA.runs.styles) ----
(function(){
  const el=document.getElementById('rd-sty-svg');if(!el)return;
  const D=window.API_DATA.runs.styles,sum=document.getElementById('rd-sty-sum'),cnt=document.getElementById('rd-sty-cnt');
  const NAME={async_blocking:'async def + time.sleep',async_await:'async def + await',plain_def:'plain def, thread pool',async_blocking_4_workers:'blocking, 4 workers'};
  const COL=['var(--c1)','var(--c2)','var(--c4)','var(--c5)'];
  let mode='async_blocking';
  const ms=x=>x>=1000?(x/1000).toFixed(x>=10000?1:2)+' s':Math.round(x)+' ms';
  function ticks(max){const raw=max/5,p=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*p).find(m=>m>=raw);const t=[];for(let v=0;v<=max+1e-9;v+=st)t.push(v);return t}
  function draw(){const m=D[mode],W=RD.width(el),pad=8,x0=pad+4,x1=W-pad-6,rh=4,gap=1,top=8,n=m.req.length;
    const max=m.wall_ms*1.04,sc=t=>x0+(x1-x0)*t/max;let b='';
    const tk=ticks(max);if(W<520&&tk.length>5)tk.splice(1,tk.length-1,...tk.slice(1).filter((_,i)=>i%2===1));
    const H=top+n*(rh+gap)+30;
    tk.forEach(t=>{const x=sc(t);b+='<line x1="'+x+'" y1="'+top+'" x2="'+x+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(x,H-8,ms(t),{fs:11,fill:'var(--mute)',a:'middle'})});
    if(mode==='plain_def'||mode==='async_await'){const x=sc(500);b+='<line x1="'+x+'" y1="'+top+'" x2="'+x+'" y2="'+(H-22)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>'}
    m.req.forEach((r,i)=>{const y=top+i*(rh+gap);b+='<rect x="'+sc(r[0])+'" y="'+y+'" width="'+Math.max(1,sc(r[1])-sc(r[0]))+'" height="'+rh+'" fill="'+(m.workers>1?COL[r[2]-1]:'var(--acc)')+'"/>'});
    el.innerHTML=RD.svg(W,H,b,'50 bars, one per request, from send to response, for '+NAME[mode]);
    const per=[0,0,0,0];m.req.forEach(r=>per[r[2]-1]++);
    cnt.innerHTML=RD.stat('Last answer',ms(m.wall_ms),'all 50 done')+RD.stat('Median wait',ms(m.p50_ms),'send to response')+RD.stat('Slowest',ms(m.max_ms),'')+
      (m.workers>1?RD.stat('Requests per worker',per.join(', '),'colours in the chart'):RD.stat('Workers','1',''));
    // summary on one scale
    const keys=Object.keys(D),lab=W<520?0:170,sx0=pad+lab,sx1=W-pad-70,mx=Math.max(...keys.map(k=>D[k].wall_ms));let s='';
    keys.forEach((k,i)=>{const y=(lab?4:16)+i*(lab?22:36),w=Math.max(2,(sx1-sx0)*D[k].wall_ms/mx);
      s+=(lab?RD.t(pad,y+12,NAME[k],{fs:12,fill:'var(--ink)',w:k===mode?600:400}):RD.t(pad,y-3,NAME[k],{fs:11,fill:'var(--ink)',w:k===mode?600:400}));
      s+='<rect x="'+sx0+'" y="'+y+'" width="'+w+'" height="14" fill="'+(k===mode?'var(--acc)':'var(--mute)')+'" opacity="'+(k===mode?1:.5)+'"/>'+RD.t(sx0+w+5,y+11,ms(D[k].wall_ms),{fs:11,fill:'var(--ink)'})});
    sum.innerHTML=RD.svg(W,(lab?8:20)+keys.length*(lab?22:36),s,'Time until all 50 requests were answered, four styles on one scale')}
  RD.seg(document.getElementById('rd-sty-seg'),k=>{mode=k;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
