// ---- Reading 3: long horizons, P(no wrong step) = p^n (derived, illustrative: independent steps, no recovery) ----
(function(){
  const host=document.getElementById('hp-fail-svg');if(!host)return;
  const ps=document.getElementById('hp-fail-p'),ns=document.getElementById('hp-fail-n');
  function draw(){
    const p=+ps.value/1000,n=+ns.value,P=Math.pow(p,n),half=Math.log(0.5)/Math.log(p);
    document.getElementById('hp-fail-pv').textContent=(100*p).toFixed(1)+'%';
    document.getElementById('hp-fail-nv').textContent=n;
    const W=RD.width(host),H=190,l=40,r=12,t=10,bt=30,N=100;
    const X=k=>l+(W-l-r)*(k-1)/(N-1),Y=v=>t+(H-t-bt)*(1-v);
    let b='';
    [0,0.25,0.5,0.75,1].forEach(v=>{b+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-6,Y(v)+4,Math.round(v*100)+'%',{a:'end',fs:11,fill:'var(--mute)'})});
    [1,25,50,75,100].forEach(k=>{b+=RD.t(X(k),H-bt+16,String(k),{a:'middle',fs:11,fill:'var(--mute)'})});
    b+=RD.t((l+W-r)/2,H-2,'steps in the task',{a:'middle',fs:11,fill:'var(--mute)'});
    let d='';for(let k=1;k<=N;k++)d+=(k===1?'M':'L')+X(k).toFixed(1)+' '+Y(Math.pow(p,k)).toFixed(1);
    b+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>';
    if(half<=N)b+='<line x1="'+X(Math.max(1,half))+'" x2="'+X(Math.max(1,half))+'" y1="'+Y(0.5)+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    b+='<circle cx="'+X(n)+'" cy="'+Y(P)+'" r="5" fill="var(--bad)"/>'+RD.t(Math.min(X(n)+8,W-r-70),Math.max(Y(P)-8,t+10),(100*P).toFixed(1)+'%',{fs:12,w:600,fill:'var(--bad)'});
    host.innerHTML=RD.svg(W,H,b,'Chance of a task with no wrong step against task length');
    document.getElementById('hp-fail-stats').innerHTML=RD.stat('No wrong step in '+n+' steps',(100*P).toFixed(1)+'%','p^n')+
      RD.stat('Half of tasks fail by step',half>=1000?'over 1,000':half.toFixed(1),'ln 0.5 / ln p')+
      RD.stat('Expected wrong steps',(n*(1-p)).toFixed(2),'n (1 - p)');
  }
  ps.addEventListener('input',draw);ns.addEventListener('input',draw);
  draw();RD.onRender(draw);RD.onResize(draw);
})();
