// ---- Reading, section 5: holding a connection across the model call (Little's law) and N+1 round trips. Derived; checked by recompute.py ----
window.DL={RATE:1157,BORROW_S:0.001,BORROWS:2,MAXCONN:100,RTT:[[0.056,'local, measured'],[0.5,'same data centre'],[2,'zone to zone'],[8,'nearby regions']],N:20};
DL.held=s=>DL.RATE*s;DL.released=()=>DL.RATE*DL.BORROW_S*DL.BORROWS;
DL.n1=rtt=>({many:(DL.N+1)*rtt,one:rtt});
(function(){
  const el=document.getElementById('rd-hold-svg');if(!el)return;
  const sl=document.getElementById('rd-hold-s'),v=document.getElementById('rd-hold-v'),cnt=document.getElementById('rd-hold-cnt');
  const f0=n=>n>=100?Math.round(n).toLocaleString('en-US'):n.toFixed(1);
  function draw(){const s=+sl.value,W=RD.width(el),pad=8,lab=W<520?0:150,x0=pad+lab,x1=W-pad;v.textContent=s+' s';
    const tot=s+0.004,sc=t=>x0+(x1-x0)*t/tot,minw=4;let b='';
    const row=(y,title,conn)=>{let r='';if(!lab)r+=RD.t(pad,y-6,title,{fs:12,fill:'var(--ink)',w:600});else r+=RD.t(pad,y+16,title,{fs:12,fill:'var(--ink)',w:600});
      // request phases
      r+='<rect x="'+x0+'" y="'+y+'" width="'+minw+'" height="12" fill="var(--c3)"/>';
      r+='<rect x="'+(x0+minw)+'" y="'+y+'" width="'+Math.max(1,sc(s)-x0-2*minw)+'" height="12" fill="var(--c5)" opacity=".55"/>';
      r+='<rect x="'+(x1-minw)+'" y="'+y+'" width="'+minw+'" height="12" fill="var(--c3)"/>';
      r+=RD.t((x0+x1)/2,y+10,'model call, '+s+' s',{fs:11,fill:'var(--ink)',a:'middle'});
      // connection held
      if(conn==='held')r+='<rect x="'+x0+'" y="'+(y+16)+'" width="'+(x1-x0)+'" height="10" fill="var(--bad)" opacity=".75"/>'+RD.t(x0+4,y+38,'connection held the whole time',{fs:11,fill:'var(--bad)'});
      else r+='<rect x="'+x0+'" y="'+(y+16)+'" width="'+minw+'" height="10" fill="var(--good)"/><rect x="'+(x1-minw)+'" y="'+(y+16)+'" width="'+minw+'" height="10" fill="var(--good)"/>'+RD.t(x0+8,y+38,'two 1 ms borrows: read history, save reply',{fs:11,fill:'var(--good)'});
      return r};
    b+=row(lab?6:20,'Before: hold',"held");b+=row(lab?62:96,'After: borrow twice','rel');
    const H=lab?108:144;el.innerHTML=RD.svg(W,H,b,'Timeline of one request: before, the connection is held through the model call; after, it is borrowed twice briefly');
    const h=DL.held(s),r=DL.released();
    cnt.innerHTML=RD.stat('Before: connections busy',f0(h),'1,157/s x '+s+' s')+RD.stat('After: connections busy',f0(r),'1,157/s x 2 ms')+RD.stat('Ratio',Math.round(h/r).toLocaleString('en-US')+'x','')+RD.stat('Postgres max_connections','100','the default')}
  sl.addEventListener('input',draw);draw();RD.onRender(draw);RD.onResize(draw);
})();
(function(){
  const el=document.getElementById('rd-n1-svg');if(!el)return;
  const sl=document.getElementById('rd-n1-s'),v=document.getElementById('rd-n1-v');
  const fm=x=>x<1?x.toFixed(3).replace(/0+$/,''):(x<10?x.toFixed(1).replace(/\.0$/,''):Math.round(x).toString());
  function draw(){const p=DL.RTT[+sl.value],rtt=p[0],W=RD.width(el),pad=8,lab=W<520?0:170,x0=pad+lab,x1=W-pad-70;v.textContent=p[0]+' ms ('+p[1]+')';
    const r=DL.n1(rtt),max=DL.n1(8).many,sc=t=>(x1-x0)*t/max;let b='';
    const y1=lab?6:20,y2=lab?46:76;
    b+=lab?RD.t(pad,y1+14,'Before: lazy loading, 21 trips',{fs:12,fill:'var(--ink)',w:600}):RD.t(pad,y1-6,'Before: lazy loading, 21 trips',{fs:12,fill:'var(--ink)',w:600});
    const seg=sc(rtt);for(let i=0;i<DL.N+1;i++)b+='<rect x="'+(x0+i*seg)+'" y="'+y1+'" width="'+Math.max(0.6,seg-(seg>3?1:0))+'" height="18" fill="var(--bad)" opacity="'+(i===0?1:.7)+'"/>';
    b+=RD.t(x0+r.many*sc(1)+6,y1+13,fm(r.many)+' ms',{fs:12,fill:'var(--ink)',w:600});
    b+=lab?RD.t(pad,y2+14,'After: one query with a join',{fs:12,fill:'var(--ink)',w:600}):RD.t(pad,y2-6,'After: one query with a join',{fs:12,fill:'var(--ink)',w:600});
    b+='<rect x="'+x0+'" y="'+y2+'" width="'+Math.max(1,seg)+'" height="18" fill="var(--good)"/>'+RD.t(x0+Math.max(1,seg)+6,y2+13,fm(r.one)+' ms',{fs:12,fill:'var(--ink)',w:600});
    b+=RD.t(x0,y2+38,'scale: 0 to '+fm(max)+' ms (21 trips at 8 ms)',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y2+46,b,'Bars: 21 round trips against one, at the chosen round-trip time')}
  sl.addEventListener('input',draw);draw();RD.onRender(draw);RD.onResize(draw);
})();
