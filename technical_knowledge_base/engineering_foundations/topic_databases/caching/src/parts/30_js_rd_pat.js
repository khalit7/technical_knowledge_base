// ---- Section 3: the five caching patterns as one diagram (app, cache, database); a toggle redraws the read path (above) and the write path (below) ----
(function(){
  const box=document.getElementById('rd-pat-svg'),cap=document.getElementById('rd-pat-cap');if(!box)return;
  // arrow: [from, to, number, label, dashed]; A app, C cache, D database
  const ASIDE_R=[['A','C',1,'GET: miss'],['A','D',2,'SELECT'],['A','C',3,'SET, with a TTL']];
  const ASIDE_W=[['A','D',1,'UPDATE, commit'],['A','C',2,'DELETE the key']];
  const P={
    aside:{r:ASIDE_R,w:ASIDE_W,t:'Cache-aside (lazy loading)',
      c:'<b>Read:</b> 1 the app asks the cache; on a miss 2 it reads Postgres and 3 fills the cache with a TTL. <b>Write:</b> 1 commit to Postgres, 2 then delete the key (never update it: section 3 shows why). Caches only what is read; the first read after a change is slow. The default.'},
    through:{r:[['A','C',1,'get'],['C','D',2,'loader'],['C','A',3,'value']],w:ASIDE_W,t:'Read-through',
      c:'<b>Read:</b> 1 the app asks the cache library, which 2 calls a loader you gave it on a miss and 3 returns the value. <b>Write:</b> as cache-aside. Same behaviour with less app code, and the loader is the one place to add coalescing (section 7).'},
    wthrough:{r:ASIDE_R,w:[['A','C',1,'SET new value'],['C','D',2,'write, same request']],t:'Write-through',
      c:'<b>Write:</b> 1 the new value goes to the cache and 2 to the database in the same request. Reads after writes are fresh; every write pays twice, you cache data nobody may read, and a cache set before a commit that fails caches a value that never existed (section 4).'},
    behind:{r:[['A','C',1,'GET: always the cache']],w:[['A','C',1,'SET: acknowledged'],['C','D',2,'flush later, in batches',1]],t:'Write-behind (write-back)',
      c:'<b>Write:</b> 1 the cache acknowledges the write and 2 flushes to the database later, in batches (dashed: outside the request). Fast writes that absorb bursts; a cache crash loses acknowledged writes, and anything reading Postgres directly sees old data. Rarely right for user data; fine for counters you can rebuild.'},
    around:{r:ASIDE_R,w:[['A','D',1,'UPDATE, commit'],['C','C',0,'entry ages out at its TTL',1]],t:'Write-around',
      c:'<b>Write:</b> 1 the database only; the cached entry is left to expire. For data written often and read rarely: no delete to forget, but readers see the old value for up to a TTL.'}};
  let mode='aside';
  function panel(list,title,ox,pw,ph,narrow){
    const bw=narrow?92:104,bh=40,X={A:0,C:pw-bw,D:pw-bw},Y={A:ph/2-bh/2,C:22,D:ph-bh-4};
    const names={A:'App server',C:'Cache (Redis)',D:'Postgres'};
    let g=RD.t(ox,13,title,{fs:12,w:600,fill:'var(--ink)'});
    ['A','C','D'].forEach(k=>{g+='<rect x="'+(ox+X[k])+'" y="'+Y[k]+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+(k==='C'?'var(--acc)':'var(--line)')+'" stroke-width="'+(k==='C'?2:1.2)+'"/>'+
      RD.t(ox+X[k]+bw/2,Y[k]+bh/2+4,names[k],{a:'middle',fs:11.5,w:600,fill:'var(--ink)'})});
    // anchor point on a box's edge facing another box
    const anchor=(k,o)=>{const cx=X[k]+bw/2,cy=Y[k]+bh/2,ox2=X[o]+bw/2,oy=Y[o]+bh/2;
      if(k==='A')return [X.A+bw,cy+(oy<cy?-8:8)];if(o==='A')return [X[k],cy];return [cx,oy>cy?Y[k]+bh:Y[k]]};
    const seen={},count={};list.forEach(a=>{if(a[0]!==a[1]){const p=[a[0],a[1]].sort().join('');count[p]=(count[p]||0)+1}});
    list.forEach(a=>{const [f,t,n,lab,dash]=a;
      if(f===t){g+=RD.t(ox+X[f]+bw/2,Y[f]+bh+15,lab,{a:'middle',fs:11,fill:'var(--mute)'});return}
      const p=[f,t].sort().join(''),k=(seen[p]=(seen[p]||0)+1),c=count[p],off=(k-(c+1)/2)*28;
      // offset along the normal of the canonical direction, so opposite arrows between one pair do not overlap
      const a0=p[0],a1=p[1];let [u1,v1]=anchor(a0,a1),[u2,v2]=anchor(a1,a0);
      const cl=Math.hypot(u2-u1,v2-v1),nx=-(v2-v1)/cl,ny=(u2-u1)/cl;u1+=ox+nx*off;v1+=ny*off;u2+=ox+nx*off;v2+=ny*off;
      let [x1,y1,x2,y2]=f===a0?[u1,v1,u2,v2]:[u2,v2,u1,v1];
      const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy);
      g+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+(x2-dx/L*3).toFixed(1)+'" y2="'+(y2-dy/L*3).toFixed(1)+'" stroke="var(--ink)" stroke-width="1.6"'+(dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#pm)"/>';
      const fr=c>1?0.3+0.3*(k-1):0.42,lx=x1+dx*fr,ly=y1+dy*fr;
      g+='<circle cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" r="9" fill="var(--acc)"/>'+RD.t(lx,ly+4,String(n),{a:'middle',fs:11,w:700,fill:'var(--bg)'});
      if(!narrow&&lab){const vert=Math.abs(dx)<20;g+=RD.t(vert?lx+14:lx+(c>1?14:0),vert?ly+4:(c>1?ly+4:ly-13),lab,{a:vert||c>1?'start':'middle',fs:11,fill:'var(--ink)'})}
    });
    return g;
  }
  function draw(){
    const W=Math.min(RD.width(box),760),narrow=W<560,p=P[mode],ph=170;
    let g='<defs><marker id="pm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>',H;
    if(narrow){g+=panel(p.r,'On a read',0,W,ph,true);g+='<g transform="translate(0,'+(ph+16)+')">'+panel(p.w,'On a write',0,W,ph,true)+'</g>';H=2*ph+20}
    else{const pw=(W-40)/2;g+=panel(p.r,'On a read',0,pw,ph,false)+'<line x1="'+(pw+20)+'" x2="'+(pw+20)+'" y1="4" y2="'+ph+'" stroke="var(--line)"/>'+panel(p.w,'On a write',pw+40,pw,ph,false);H=ph+6}
    box.innerHTML=RD.svg(W,H,g,p.t+': read and write paths');
    cap.innerHTML='<div class="t">'+p.t+'</div><p>'+p.c+'</p>';
  }
  RD.seg(document.getElementById('rd-pat-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
