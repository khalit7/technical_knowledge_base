// ---- Hero: who runs Python bytecode at each instant under four models (static, illustrative schedules; drawn at the measured width) ----
(function(){
  const el=document.getElementById('cg-hero');if(!el)return;
  // segment kinds: r run Python, i waiting on I/O, w ready but waiting for the GIL, b blocking call, s start-up and pickling, a/b/c asyncio task slices
  const P=[
    {t:'4 threads, default build: one GIL, so one runner at a time',n:'4 threads, GIL: one runner at a time',lanes:[
      ['T1',[['r',0,2],['i',2,6],['w',6,7],['r',7,9],['i',9,12]]],
      ['T2',[['w',0,2],['r',2,4],['i',4,8],['w',8,9],['r',9,11]]],
      ['T3',[['w',0,4],['r',4,7],['i',7,12]]],
      ['T4',[['w',0,11],['r',11,12]]]]},
    {t:'4 threads, free-threaded build (3.14t): no GIL, runners overlap',n:'4 threads, 3.14t (no GIL): overlap',lanes:[
      ['T1',[['r',0,5],['i',5,7],['r',7,10]]],
      ['T2',[['r',0,6],['i',6,8],['r',8,10.5]]],
      ['T3',[['r',0,4],['i',4,6],['r',6,10]]],
      ['T4',[['r',0,5.5],['i',5.5,7.5],['r',7.5,10.2]]]]},
    {t:'asyncio: one thread, three tasks, switching only at await',n:'asyncio: one thread, switch at await',lanes:[
      ['loop',[['A',0,0.8],['B',0.8,1.6],['C',1.6,2.4],['A',3.6,4.4],['b',4.4,7.4],['C',7.4,8.2],['B',8.2,9]]],
      ['A',[['A',0,0.8],['i',0.8,3.6],['A',3.6,4.4]]],
      ['B',[['B',0.8,1.6],['i',1.6,4.4],['b',4.4,7.4],['i',7.4,8.2],['B',8.2,9]]],
      ['C',[['C',1.6,2.4],['i',2.4,5],['w',5,7.4],['C',7.4,8.2]]]]},
    {t:'4 processes: four GILs, paid for in start-up and pickling',n:'4 processes: four GILs, start-up cost',lanes:[
      ['P1',[['s',0,1.6],['r',1.6,6.4],['s',6.4,7]]],
      ['P2',[['s',0,1.8],['r',1.8,6.6],['s',6.6,7.2]]],
      ['P3',[['s',0,2],['r',2,6.8],['s',6.8,7.4]]],
      ['P4',[['s',0,2.2],['r',2.2,7],['s',7,7.6]]]]}];
  const TC={A:'var(--c1)',B:'var(--c4)',C:'var(--c6)'};
  function draw(){
    const W=Math.min(900,RD.width(el)),L=34,R=8,lh=13,gap=4,X=t=>L+(W-L-R)*t/12;
    let y=0,s='';
    P.forEach((p,k)=>{
      y+=k?14:2;s+=RD.t(0,y+11,W<560?p.n:p.t,{fs:12,w:600,fill:'var(--ink)'});y+=18;
      p.lanes.forEach(([nm,segs])=>{
        s+=RD.t(0,y+lh-2,nm,{fs:11,fill:'var(--mute)'});
        s+='<rect x="'+L+'" y="'+y+'" width="'+(W-L-R)+'" height="'+lh+'" fill="var(--soft)"/>';
        segs.forEach(([kd,a,b])=>{const x=X(a),w=Math.max(1,X(b)-X(a));
          if(kd==='r')s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+lh+'" rx="2" fill="var(--acc)"/>';
          else if(kd==='i')s+='<rect x="'+x+'" y="'+(y+lh/2-2)+'" width="'+w+'" height="4" rx="2" fill="var(--c3)" opacity=".55"/>';
          else if(kd==='w')s+='<rect x="'+(x+0.5)+'" y="'+(y+1.5)+'" width="'+Math.max(1,w-1)+'" height="'+(lh-3)+'" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
          else if(kd==='b')s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+lh+'" rx="2" fill="var(--bad)"/>';
          else if(kd==='s')s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+lh+'" rx="2" fill="var(--dim)"/>';
          else{s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+lh+'" rx="2" fill="'+TC[kd]+'"/>';if(w>14)s+=RD.t(x+w/2,y+lh-2.5,kd,{a:'middle',fs:10.5,w:600,fill:'var(--bg)'})}
        });
        y+=lh+gap;
      });
      if(k===2){const xb=X(4.4),xe=X(7.4);s+=RD.t(Math.min((xb+xe)/2,W-60),y+9,'time.sleep: A and C wait',{a:'middle',fs:10.5,fill:'var(--bad)'});y+=10}
    });
    y+=6;s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(W-R,y+13,'time',{a:'end',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+16,s,'Four timelines: threads under the GIL, threads on the free-threaded build, an asyncio loop with one blocking call, and four processes');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
