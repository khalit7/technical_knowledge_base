// ---- Reading, section 1: the logical evaluation order, and what each step can refer to (static figure) ----
(function(){
  const el=document.getElementById('rd-pipe');if(!el)return;
  // [clause, what it does, written position, aggregate, window function, SELECT alias]; 1 yes, 0 no, 2 Postgres allows it (output names in GROUP BY), the standard does not, null not applicable
  const S=[['FROM, JOIN','pair rows, keep ON = TRUE',2,0,0,0],['WHERE','keep rows where TRUE',3,0,0,0],['GROUP BY','one row per group',4,0,0,2],
    ['HAVING','keep groups where TRUE',5,1,0,0],['SELECT','compute columns and windows',1,1,1,0],['DISTINCT','drop duplicate rows',1,null,null,null],
    ['ORDER BY','sort',7,1,1,1],['LIMIT, OFFSET','cut',8,null,null,null]];
  const H=['aggregate','window','alias'];
  function draw(){
    const W=RD.width(el),cw=W<420?50:70,dx=W-3*cw,rh=38,top=30;
    let s='';
    H.forEach((h,i)=>{s+=RD.t(dx+cw*i+cw/2,14,h,{fs:11,a:'middle',fill:'var(--mute)',w:600})});
    s+=RD.t(0,14,'evaluated in this order',{fs:11,fill:'var(--mute)',w:600});
    S.forEach((r,k)=>{const y=top+k*rh;
      s+='<rect x="0" y="'+y+'" width="'+(dx-8)+'" height="'+(rh-6)+'" rx="6" fill="'+(r[0]==='SELECT'?'var(--acc2)':'var(--soft)')+'" stroke="var(--line)"/>';
      s+=RD.t(8,y+14,(k+1)+'. '+r[0],{fs:12,w:600})+RD.t(8,y+27,r[1],{fs:11,fill:'var(--mute)'});
      if(W>=420)s+=RD.t(dx-14,y+14,'written '+r[2]+(r[2]===1?'st':r[2]===2?'nd':r[2]===3?'rd':'th'),{fs:10.5,a:'end',fill:'var(--mute)'});
      if(k<S.length-1)s+='<path d="M14,'+(y+rh-6)+' l0,6" stroke="var(--mute)"/>';
      [r[3],r[4],r[5]].forEach((v,i)=>{if(v===null)return;const cx=dx+cw*i+cw/2,cy=y+(rh-6)/2;
        if(v===1)s+='<circle cx="'+cx+'" cy="'+cy+'" r="6.5" fill="var(--good)"/>';
        else if(v===2)s+='<circle cx="'+cx+'" cy="'+cy+'" r="6.5" fill="none" stroke="var(--c5)" stroke-width="2"/><path d="M'+(cx-6.5)+','+cy+' a6.5,6.5 0 0 0 13,0z" fill="var(--c5)"/>';
        else s+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="none" stroke="var(--dim)" stroke-width="1.6"/>'});
    });
    const y=top+S.length*rh+4;
    s+='<circle cx="8" cy="'+(y+6)+'" r="5.5" fill="var(--good)"/>'+RD.t(18,y+10,'allowed',{fs:11,fill:'var(--mute)'});
    s+='<circle cx="80" cy="'+(y+6)+'" r="5.5" fill="none" stroke="var(--dim)" stroke-width="1.6"/>'+RD.t(90,y+10,'not allowed',{fs:11,fill:'var(--mute)'});
    s+='<circle cx="190" cy="'+(y+6)+'" r="5.5" fill="none" stroke="var(--c5)" stroke-width="2"/><path d="M184.5,'+(y+6)+' a5.5,5.5 0 0 0 11,0z" fill="var(--c5)"/>'+RD.t(200,y+10,W<420?'Postgres only':'Postgres allows, the standard does not',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+18,s,'The logical evaluation order of a SELECT and what each step may refer to');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
