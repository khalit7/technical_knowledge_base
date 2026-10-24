// ---- Reading, top: the hero figure (Sutton and Barto's Figure 8.1, redrawn): learning and planning are the same backups on two kinds of experience ----
(function(){
  const el=document.getElementById('mb-heroD');if(!el)return;
  const box=(cx,cy,w,h,t1,t2,hl)=>'<rect x="'+(cx-w/2)+'" y="'+(cy-h/2)+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(hl?'color-mix(in srgb, var(--acc) 12%, var(--bg))':'var(--soft)')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'" stroke-width="1.4"/>'+
    RD.t(cx,cy-3,t1,{a:'middle',fs:13,w:700})+RD.t(cx,cy+13,t2,{a:'middle',fs:11,fill:'var(--mute)'});
  const ar=(x1,y1,x2,y2,col,mk)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="2" marker-end="url(#'+mk+')"/>';
  function draw(){
    const W=Math.max(300,RD.width(el)),H=250,bw=Math.min(180,Math.max(118,W*0.3)),bh=44;
    const top=[W/2,34],L=[bw/2+4,H-34],R=[W-bw/2-4,H-34];
    let s='<defs><marker id="mbh-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker>'+
      '<marker id="mbh-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    // acting: top right corner of value box down to real experience
    s+=ar(top[0]+bw/2-10,top[1]+bh/2,R[0]+18,R[1]-bh/2-2,'var(--mute)','mbh-a');
    // direct RL: experience back up (offset to the left of the acting arrow)
    s+=ar(R[0]-22,R[1]-bh/2,top[0]+bw/2-46,top[1]+bh/2+2,'var(--mute)','mbh-a');
    // model learning: experience to model
    s+=ar(R[0]-bw/2,R[1],L[0]+bw/2+2,L[1],'var(--mute)','mbh-a');
    // planning: model up to value
    s+=ar(L[0]+10,L[1]-bh/2,top[0]-bw/2+14,top[1]+bh/2+2,'var(--acc)','mbh-b');
    const mx=(a,b)=>(a+b)/2,narrow=W<520;
    s+=RD.t(Math.min(W-4,mx(top[0]+bw/2-10,R[0]+18)+8),mx(top[1],R[1])-10,'acting',{fs:11.5,fill:'var(--mute)'});
    s+=RD.t(mx(R[0]-22,top[0]+bw/2-46)-6,mx(top[1],R[1])+22,'direct RL',{a:'end',fs:11.5,fill:'var(--mute)'});
    s+=RD.t(W/2,L[1]+bh/2-2,'model learning',{a:'middle',fs:11.5,fill:'var(--mute)'});
    s+=narrow?RD.t(mx(L[0]+10,top[0]-bw/2+14)+6,mx(L[1],top[1])-4,'planning',{fs:12,w:700,fill:'var(--acc)'}):RD.t(mx(L[0]+10,top[0]-bw/2+14)-10,mx(L[1],top[1])-6,'planning',{a:'end',fs:12,w:700,fill:'var(--acc)'});
    s+=box(top[0],top[1],bw,bh,'Value / policy','Q, π, or a network');
    s+=box(L[0],L[1],bw,bh,'Model','table, rules, network',true);
    s+=box(R[0],R[1],bw,bh,'Real experience','s, a → r, s′');
    el.innerHTML=RD.svg(W,H,s,'Learning and planning: real experience updates values directly and trains a model; the model generates simulated experience that updates the same values');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
