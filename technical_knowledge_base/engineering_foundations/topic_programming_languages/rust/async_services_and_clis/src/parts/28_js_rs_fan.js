// ---- rs: twenty calls to a 100 ms server, three ways (totals measured by examples/a4_fanout.rs; per-call spans derived as equal shares) ----
(function(){
  const D=window.RS_DATA,host=document.getElementById('rs-fan-svg');if(!D||!D.fanout||!host)return;
  const F=D.fanout,n=F.n,k=F.permits;
  function draw(){
    const w=RD.width(host),narrow=w<420,lw=narrow?0:118,x0=lw+4,x1=w-(narrow?8:14),tmax=Math.ceil(F.seq/500)*500,X=v=>x0+(x1-x0)*v/tmax,bh=3,gap=narrow?34:22;
    const rows=[['one after another',i=>[i*F.seq/n,(i+1)*F.seq/n],F.seq,'var(--bad)'],['all 20 at once (JoinSet)',()=>[0,F.all],F.all,'var(--good)'],['at most '+k+' at a time (Semaphore)',i=>{const g=Math.floor(i/k),wv=F.five/Math.ceil(n/k);return [g*wv,(g+1)*wv]},F.five,'var(--c1)']];
    let y=narrow?30:16,s='';
    for(let v=0;v<=tmax;v+=500)s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="8" y2="9999" stroke="var(--line)"/>';
    rows.forEach(([name,span,tot,col])=>{
      s+=narrow?RD.t(4,y-8,name,{fs:12,w:600}):RD.t(4,y+n*bh/2+4,name.replace(/ \(.*/,''),{fs:12,w:600})+RD.t(4,y+n*bh/2+19,(name.match(/\((.*)\)/)||['',''])[1],{fs:11,fill:'var(--mute)'});
      for(let i=0;i<n;i++){const [a,b]=span(i);s+='<rect x="'+X(a)+'" y="'+(y+i*bh)+'" width="'+Math.max(1.5,X(b)-X(a)-.6)+'" height="'+(bh-.8)+'" fill="'+col+'"/>'}
      const end=X(Math.max(...Array.from({length:n},(_,i)=>span(i)[1])));
      s+=RD.t(Math.min(end+6,x1-50),y+n*bh/2+4,(tot/1000).toFixed(3)+' s',{fs:12,w:600});y+=n*bh+gap});
    for(let v=0;v<=tmax;v+=500)s+=RD.t(X(v),y-gap+16,(v/1000)+(v===tmax?' s':''),{a:'middle',fs:11,fill:'var(--mute)'});
    host.innerHTML=RD.svg(w,y-gap+22,s.replace(/y2="9999"/g,'y2="'+(y-gap+4)+'"'),'Twenty calls one after another, all at once and five at a time, on one time axis');
  }
  RS.reg('t-read',draw);RS.onResize('t-read',draw);draw();
})();
