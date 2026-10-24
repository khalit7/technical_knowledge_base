// ---- Reading, section 12: where each check on generated SQL sits (static diagram) ----
(function(){
  const el=document.getElementById('rd-chk');if(!el)return;
  const B=[{t:'ORM or LLM writes the SQL',d:'',c:'var(--c4)'},
    {t:'Reviews: can miss',d:'log it (echo=True); count queries per request; read for the traps of sections 1 to 4; compare the rows with a result you already know',c:'var(--c5)'},
    {t:'Boundaries: always hold',d:'read-only role, never the owner; row-level security; statement_timeout; a row limit; the production engine’s dialect',c:'var(--good)'},
    {t:'Database',d:'',c:'var(--c1)'}];
  function draw(){
    const W=RD.width(el),wide=W>=640;let s=SV.marker('chk-ar'),H;
    if(wide){const g=26,bw=Math.floor((W-g*3)/4);let mh=0;const L=B.map(b=>SV.wrap(b.d,bw-16,11));L.forEach(l=>mh=Math.max(mh,l.length));H=34+mh*15+10;
      B.forEach((b,i)=>{const x=i*(bw+g);s+='<rect x="'+x+'" y="2" width="'+bw+'" height="'+H+'" rx="8" fill="var(--bg)" stroke="'+b.c+'" stroke-width="1.8"/>';
        s+=SV.lines(x+8,22,SV.wrap(b.t,bw-16,12),{fs:12,w:600,fill:b.c})+SV.lines(x+8,42,L[i],{fs:11,lh:15});
        if(i<3)s+='<path d="M'+(x+bw+2)+','+(H/2+2)+' l'+(g-6)+',0" stroke="var(--c2)" stroke-width="1.6" marker-end="url(#chk-ar)"/>'});
      H+=6}
    else{let y=2;B.forEach((b,i)=>{const L=SV.wrap(b.d,W-20,11),h=28+L.length*15+(L.length?6:0);
        s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+h+'" rx="8" fill="var(--bg)" stroke="'+b.c+'" stroke-width="1.8"/>';
        s+=RD.t(10,y+19,b.t,{fs:12,w:600,fill:b.c})+SV.lines(10,y+37,L,{fs:11,lh:15});y+=h;
        if(i<3){s+='<path d="M'+(W/2)+','+y+' l0,14" stroke="var(--c2)" stroke-width="1.6" marker-end="url(#chk-ar)"/>';y+=18}});H=y+2}
    el.innerHTML=RD.svg(W,H,s,'Checks between generated SQL and the database');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
