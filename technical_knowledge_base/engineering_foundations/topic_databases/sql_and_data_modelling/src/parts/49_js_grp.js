// ---- Reading, section 3: GROUP BY against a window over the same 16 rows of chat 11 (static before/after) ----
(function(){
  const el=document.getElementById('rd-grp');if(!el)return;
  const D=window.SM_DATA;
  const R=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map(m=>({id:m[0],role:m[2]?'assistant':'user',tok:m[4]}));
  const G=['user','assistant'].map(r=>({role:r,n:R.filter(x=>x.role===r).length,sum:R.filter(x=>x.role===r).reduce((a,x)=>a+x.tok,0)}));
  const SQL={group:"SELECT role, COUNT(*) AS n, SUM(tokens) AS tokens\nFROM messages WHERE chat_id = 11\nGROUP BY role;",
    over:"SELECT id, role, tokens,\n       SUM(tokens) OVER (PARTITION BY role) AS role_tokens\nFROM messages WHERE chat_id = 11 ORDER BY id;"};
  const COL={user:'var(--c1)',assistant:'var(--c3)'};
  let mode='group';
  function draw(){
    document.getElementById('rd-grp-sql').textContent=SQL[mode];
    const W=RD.width(el),rh=17,top=18,narrow=W<480,rx=narrow?118:170,mx=Math.max(...R.map(r=>r.tok)),bw=narrow?54:90;
    let s=RD.t(0,12,'16 input rows (id, role, tokens)',{fs:11,fill:'var(--mute)'});
    R.forEach((r,k)=>{const y=top+k*rh;
      s+=RD.t(0,y+12,r.id,{fs:11})+RD.t(narrow?32:40,y+12,narrow?r.role.slice(0,4):r.role,{fs:11,fill:COL[r.role]});
      s+='<rect x="'+(narrow?62:104)+'" y="'+(y+4)+'" width="'+Math.max(1,bw*r.tok/mx*(narrow?0.9:0.7))+'" height="'+(rh-8)+'" rx="2" fill="'+COL[r.role]+'" opacity=".7"/>'});
    const H=top+R.length*rh;
    if(mode==='group'){
      const bx=W-(narrow?150:220),bwid=W-bx;
      G.forEach((g,i)=>{const by=top+(i?H*0.62:H*0.12),bh=46;
        R.forEach((r,k)=>{if(r.role!==g.role)return;const y=top+k*rh+rh/2;s+='<path d="M'+rx+','+y+' C'+((rx+bx)/2)+','+y+' '+((rx+bx)/2)+','+(by+bh/2)+' '+bx+','+(by+bh/2)+'" fill="none" stroke="'+COL[g.role]+'" stroke-width="1" opacity=".55"/>'});
        s+='<rect x="'+bx+'" y="'+by+'" width="'+bwid+'" height="'+bh+'" rx="7" fill="var(--bg)" stroke="'+COL[g.role]+'" stroke-width="1.8"/>';
        s+=RD.t(bx+8,by+17,g.role,{fs:12,w:600,fill:COL[g.role]})+RD.t(bx+8,by+35,'n '+g.n+', tokens '+g.sum.toLocaleString('en-US'),{fs:11.5})});
      s+=RD.t(W-4,12,'2 output rows',{fs:11,a:'end',fill:'var(--mute)',w:600});
    }else{
      R.forEach((r,k)=>{const y=top+k*rh;const g=G.find(x=>x.role===r.role);
        s+='<path d="M'+rx+','+(y+rh/2)+' L'+(W-(narrow?56:80))+','+(y+rh/2)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
        s+=RD.t(W-4,y+12,g.sum.toLocaleString('en-US'),{fs:11.5,a:'end',w:600,fill:COL[r.role]})});
      s+=RD.t(W-4,12,'16 output rows',{fs:11,a:'end',fill:'var(--mute)',w:600});
    }
    el.innerHTML=RD.svg(W,H+6,s,mode==='group'?'GROUP BY collapses 16 rows into 2':'A window keeps all 16 rows and adds the partition sum to each');
    document.getElementById('rd-grp-cap').textContent=mode==='group'
      ?'16 rows in, 2 rows out: every user row flows into one group and every assistant row into the other ('+G[0].n+' and '+G[1].n+' rows; '+G[0].sum+' and '+G[1].sum+' tokens). The individual ids are gone, so a column such as id can no longer be selected unless it is grouped or aggregated.'
      :'16 rows in, 16 rows out: each row keeps its id and gains its partition’s total ('+G[0].sum+' on every user row, '+G[1].sum+' on every assistant row). Add ORDER BY inside OVER and the same SUM becomes a running total, which is section 4.';
  }
  RD.seg(document.getElementById('rd-grp-mode'),m=>{mode=m;draw()});
  window.RD_GRP=G; // for src/check_page.mjs
  draw();RD.onRender(draw);RD.onResize(draw);
})();
