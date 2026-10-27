// ---- Hero figure (light pass, 2026-10-26): the search funnel, where each kept mechanism acts in the agent loop,
// and the full stack against Pi on EdgeBench for both models (from Tables 1 and 2). Static: nothing moves.
// Also the add-one chart of the "Each mechanism" section (Table 4), drawn inline in the Reading tab.
(function(){const el=$('heroSvg');if(!el)return;const TB=PAPER.tables;
  const AC='var(--acc)';
  const defs='<defs><marker id="ahH" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  const arr=(x1,y1,x2,y2,da)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--mute)" stroke-width="1.3"'+(da?' stroke-dasharray="5 4"':'')+' marker-end="url(#ahH)"/>';
  const FUN=[['152 proposed directions','six families, human priors'],['Loops on 535 environments','3,000+ runs, gated on cost'],['4 mechanisms kept','frozen, then held-out check']];
  // the agent loop, left to right; each node carries the mechanism that acts there (number as in the paper)
  const LOOP=[['Context','re-sent on every request',['2 Online Context Compact','compacts at a plan step','if it repays the cache'],'2 Online Context Compact','compacts when it pays'],
    ['Model','reads it all, picks a tool',[],'',''],
    ['Tool call','edit, run, read',['1 Action Fusion','edit + test run','in one call'],'1 Action Fusion','edit + run, one call'],
    ['Observation','result appended',['3 ObservationPack','big result: 1 KB stub','4 Reducer','long log: verified receipt'],'3 ObservationPack, 4 Reducer','1 KB stubs; log receipts']];
  const res=m=>{const pi=TB[m].find(r=>r.kind==='pi'),ef=TB[m].find(r=>r.kind==='sol');return [['Tokens',ef.total/pi.total],['Cost',ef.cost/pi.cost],['Score',ef.score/pi.score]]};
  fit(el,w=>{const wide=w>=700;let s='',y=0;
    s+=tx(2,12,'1. The search keeps 1 idea in 38',{fs:12,w:600});y=22;
    if(wide){const g=26,bw=(w-2*g-4)/3,bh=42;FUN.forEach((f,i)=>{const x=2+i*(bw+g);
        s+=rc(x,y,bw,bh,i===2?'var(--acc2)':'var(--soft)',{s:i===2?AC:'var(--line)',r:8})+tx(x+bw/2,y+18,f[0],{fs:12,a:'middle',w:600})+tx(x+bw/2,y+34,f[1],{fs:11,a:'middle',c:'var(--mute)'});
        if(i<2)s+=arr(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2)});y+=bh+26}
    else{const bh=40,g=12;FUN.forEach((f,i)=>{s+=rc(2,y,w-4,bh,i===2?'var(--acc2)':'var(--soft)',{s:i===2?AC:'var(--line)',r:8})+tx(10,y+17,f[0],{fs:12,w:600})+tx(10,y+32,f[1],{fs:11,c:'var(--mute)'});
        if(i<2)s+=arr(w/2,y+bh+1,w/2,y+bh+g-1);y+=bh+g});y+=14}
    s+=tx(2,y,wide?'2. Where each kept mechanism acts in the agent loop (no model change)':'2. Where each mechanism acts',{fs:12,w:600});y+=10;
    if(wide){const g=22,bw=(w-3*g-4)/4,bh=42;y+=18;const top=y-10;
      LOOP.forEach((n,i)=>{const x=2+i*(bw+g),last=i===3,ax=last?x+bw:x+bw/2,an=last?'end':'middle';
        s+=rc(x,y,bw,bh,'var(--soft)',{s:'var(--line)',r:8})+tx(x+bw/2,y+18,n[0],{fs:12,a:'middle',w:600})+tx(x+bw/2,y+34,n[1],{fs:11,a:'middle',c:'var(--mute)'});
        if(i<3)s+=arr(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2);
        if(n[2].length){s+=ln2(x+bw/2,y+bh,x+bw/2,y+bh+10,AC,{sw:1.4});
          n[2].forEach((t,j)=>{const tag=/^\d /.test(t);s+=tx(ax,y+bh+24+j*15,t,{fs:11,a:an,w:tag?600:400,c:tag?AC:'var(--mute)'})})}});
      const xo=2+3*(bw+g)+bw/2,xc=2+bw/2;
      s+='<path d="M'+xo.toFixed(1)+','+(y-1)+' L'+xo.toFixed(1)+','+top+' L'+xc.toFixed(1)+','+top+' L'+xc.toFixed(1)+','+(y-3)+'" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#ahH)"/>';
      s+='<rect x="'+(w/2-150)+'" y="'+(top-7)+'" width="300" height="14" fill="var(--bg)"/>'+tx(w/2,top+4,'the result joins the context; the next request re-sends all',{fs:11,a:'middle',c:'var(--mute)'});
      y+=bh+24+4*15+8}
    else{const bh=50,g=8;LOOP.forEach((n,i)=>{s+=rc(2,y,w-4,bh,'var(--soft)',{s:'var(--line)',r:8})+tx(10,y+18,n[0],{fs:12,w:600})+tx(10,y+34,n[1],{fs:11,c:'var(--mute)'});
        if(n[3])s+=tx(w-10,y+18,n[3],{fs:11,a:'end',w:600,c:AC})+tx(w-10,y+34,n[4],{fs:11,a:'end',c:'var(--mute)'});
        if(i<3)s+=arr(w/2,y+bh+1,w/2,y+bh+g-1);y+=bh+g});
      s+=tx(2,y+8,'then back to Context: every request re-sends it all',{fs:11,c:'var(--mute)'});y+=30}
    s+=tx(2,y,wide?'3. The full stack against Pi on EdgeBench (Pi = 100%, one run each)':'3. All four against Pi (= 100%)',{fs:12,w:600});y+=12;
    const pl=wide?150:96,bw=w-pl-60,bh=14,X=v=>pl+bw*v/1.1;
    [['sol','GPT-5.6 Sol (searched on)'],['opus','Opus 5 (never searched on)']].forEach(([m,lab])=>{
      s+=tx(2,y+12,wide?lab:(m==='sol'?'GPT-5.6 Sol':'Opus 5'),{fs:11,w:600});y+=18;
      res(m).forEach(([k,v])=>{s+=tx(pl-8,y+11,k,{fs:11,a:'end'})+rc(pl,y,X(v)-pl,bh,k==='Score'?'var(--c4)':AC,{r:2})+tx(Math.max(X(v),X(1))+5,y+11,(100*v).toFixed(1)+'%',{fs:11});y+=bh+4});y+=6});
    s+=ln2(X(1),y-2*(3*(bh+4)+24)+6,X(1),y-4,'var(--ink)',{da:'3 3'})+tx(X(1),y+8,'Pi',{fs:11,a:'middle',c:'var(--mute)'});
    el.innerHTML=svgW(w,y+14,defs+s,'SoL-Pi: the search funnel, where the four mechanisms act in the agent loop, and the full stack against Pi')});
})();
(function(){const el=$('abSvg');if(!el)return;const AB=PAPER.tables.abl;
  const MS=[['+ Action Fusion','Action Fusion'],['+ Online Context Compact','Online Context Compact'],['+ Evidence-Preserving Reducer','Reducer'],['+ ObservationPack','ObservationPack'],['SoL-Pi [Efficiency]','All four']];
  const MD=[['GPT-5.6 Sol','var(--c1)'],['Opus 5','var(--c2)']];
  fit(el,w=>{const pl=w<520?118:178,pr=w<520?92:120,bw=w-pl-pr,bh=13,X=v=>pl+bw*v/55;let s='',y=24;
    s+=tx(pl,12,'fewer tokens than Pi (%)',{fs:11,c:'var(--mute)'})+tx(w-2,12,'score (Pi 44.8)',{fs:11,a:'end',c:'var(--mute)'});
    for(let v=0;v<=50;v+=10)s+=ln2(X(v),20,X(v),20+MS.length*(2*bh+14),'var(--line)')+tx(X(v),32+MS.length*(2*bh+14),v,{fs:11,a:'middle',c:'var(--mute)'});
    MS.forEach(([key,lab])=>{s+=tx(pl-8,y+bh+4,w<520?lab.replace('Online Context Compact','Context Compact'):lab,{fs:11,a:'end',w:key[0]==='S'?600:400});
      MD.forEach(([m,c],j)=>{const rows=AB[m],pi=rows[0],r=rows.find(x=>x.name===key),cut=100*(1-r.total/pi.total),ds=r.score-pi.score;
        s+=rc(pl,y+j*(bh+1),X(cut)-pl,bh,c,{r:2})+tx(X(cut)+4,y+j*(bh+1)+11,cut.toFixed(1),{fs:11});
        s+=tx(w-2,y+j*(bh+1)+11,r.score.toFixed(1)+' ('+(ds>=0?'+':'')+ds.toFixed(1)+')',{fs:11,a:'end'})});y+=2*bh+14});
    const lg=legend(MD.map(([n,c])=>[n,c]),pl,y+30,w-pl);s+=lg.s;
    el.innerHTML=svgW(w,y+30+lg.h,s,'Each mechanism added to Pi alone: token cut and score, both models (Table 4)')});
})();
