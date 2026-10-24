// ---- Reading: the static figures added in the 2026-10-24 rebuild (hero, Little's law, LLM limits), drawn at the measured width ----
// Numbers are the page's own (M/M/1 formula; root estimate inputs; Anthropic rate limits read 2026-10-24); the captions in the HTML carry them as text.
(function(){
  const $=id=>document.getElementById(id);
  const num=v=>Math.round(v).toLocaleString('en-US');
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){}}));

  // hero: mean time in system W = S/(1-rho), split into work (S) and waiting
  if($('hero-svg'))reg(function(){const el=$('hero-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const rows=[0.5,0.8,0.9,0.95];const lab=W<480?58:80,val=W<480?44:60,x0=lab,bw=W-lab-val-6;const unit=bw/20;const rh=W<480?26:30,T=6;
    let b='';
    rows.forEach((r,i)=>{const w=1/(1-r);const y=T+i*rh;
      b+=RD.t(0,y+15,Math.round(r*100)+'% busy',{fs:11.5,w:600});
      b+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+unit+'" height="'+(rh-10)+'" fill="var(--c1)"/>';
      b+='<rect x="'+(x0+unit)+'" y="'+(y+3)+'" width="'+(unit*(w-1))+'" height="'+(rh-10)+'" fill="var(--bad)" opacity=".8"/>';
      b+=RD.t(x0+unit*w+5,y+15,(Math.round(w*10)/10)+'S',{fs:11.5,w:600});});
    const yb=T+rows.length*rh+4;
    for(let k=0;k<=20;k+=5){const x=x0+k*unit;b+='<line x1="'+x+'" x2="'+x+'" y1="'+(T)+'" y2="'+yb+'" stroke="var(--line)"/>'+RD.t(x,yb+12,k+'S',{fs:10.5,a:'middle',fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,yb+18,b,'Mean time in the system at 50, 80, 90 and 95 percent utilisation: 2, 5, 10 and 20 service times, almost all of it waiting');});

  // Little's law: three holders, log-scaled bars
  if($('lt-svg'))reg(function(){const el=$('lt-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const R=[['CPU cores busy','1,157 req/s × 25 ms',1157*0.025,'29 cores','var(--c1)'],['DB connections busy','3,472 reads/s × 1 ms',3472*0.001,'3.5','var(--c3)'],['Model calls open','231 calls/s × 10 s',231.5*10,'2,315 streams','var(--bad)']];
    const val=W<480?84:100,bw=W-val-4,lx=v=>bw*Math.log10(Math.max(1,v))/4;const rh=44;let b='';
    R.forEach((r,i)=>{const y=i*rh;b+=RD.t(0,y+13,r[0],{fs:11.5,w:600})+RD.t(W<480?0:170,W<480?y+13+0:y+13,W<480?'':'L = λW: '+r[1],{fs:11,fill:'var(--mute)'});
      if(W<480)b+=RD.t(W-2,y+13,r[1],{fs:10.5,a:'end',fill:'var(--mute)'});
      b+='<rect x="0" y="'+(y+19)+'" width="'+Math.max(3,lx(r[2]))+'" height="14" fill="'+r[4]+'" opacity=".85"/>'+RD.t(Math.max(3,lx(r[2]))+5,y+31,r[3],{fs:11.5,w:600});});
    const yb=R.length*rh+2;[1,10,100,1000,10000].forEach(v=>{const x=lx(v);b+='<line x1="'+x+'" x2="'+x+'" y1="'+(yb-6)+'" y2="'+yb+'" stroke="var(--mute)"/>'+RD.t(Math.min(x,bw-4),yb+12,num(v),{fs:10.5,a:x<8?'start':'middle',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,yb+18,b,'Little law applied to cores, database connections and open model streams');});

  // LLM demand against one provider tier's limits (demand / limit)
  if($('llm-svg'))reg(function(){const el=$('llm-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const D=[['Requests / min',13889,10000,'13,889','10,000'],['Input tokens / min',13.89e6,10e6,'13.9M','10M'],['…if 80% of input is cached',2.78e6,10e6,'2.78M','10M'],['Output tokens / min',5.56e6,2e6,'5.56M','2M']];
    const xmax=3,bw=W-8,X=v=>bw*Math.min(v,xmax)/xmax;const rh=40;let b='';
    D.forEach((d,i)=>{const y=i*rh,r=d[1]/d[2];b+=RD.t(0,y+12,d[0],{fs:11.5,w:600})+RD.t(W-4,y+12,'demand '+d[3]+' / limit '+d[4],{fs:10.5,a:'end',fill:'var(--mute)'});
      b+='<rect x="0" y="'+(y+17)+'" width="'+X(r)+'" height="13" fill="'+(r>1?'var(--bad)':'var(--good)')+'" opacity=".85"/>'+RD.t(Math.min(X(r)+5,bw-30),y+28,(Math.round(r*100)/100)+'×',{fs:11,w:600});});
    const yb=D.length*rh+2,x1=X(1);b+='<line x1="'+x1+'" x2="'+x1+'" y1="0" y2="'+yb+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(x1+4,yb+12,'the limit',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,yb+18,b,'Busy-hour demand as a multiple of one provider tier limit: requests 1.39, input tokens 1.39 or 0.28 with caching, output tokens 2.78');});

  // a link to an anchor inside a closed details block opens the block
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a||a.dataset.tab)return;const id=a.getAttribute('href').slice(1);const t=id&&document.getElementById(id);if(!t)return;
    let d=t.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details')}if(t.tagName==='DETAILS')t.open=true;});
})();
