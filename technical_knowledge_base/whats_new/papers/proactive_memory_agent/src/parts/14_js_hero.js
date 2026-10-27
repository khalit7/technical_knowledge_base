// ---- Hero figure (light pass, 2026-10-26): the actor's loop, the memory agent beside it (window and bank in,
// Phase 1 edits the bank, Phase 2 reminds or stays silent, the reminder rides on the actor's next call), and the
// counts that carry the argument (Tables 1 and 2, the released traces). Static: nothing moves.
(function(){const el=$('heroSvg');if(!el)return;const T1=PAPER.tables.T1.rows,RC=PAPER.rc,TT=RC.traces_total;
  const AC='var(--acc)';
  const defs='<defs><marker id="ahP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker><marker id="ahA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
  const pth=(d,c,da,m)=>'<path d="'+d+'" fill="none" stroke="'+(c||'var(--mute)')+'" stroke-width="1.4"'+(da?' stroke-dasharray="5 4"':'')+' marker-end="url(#'+(m||'ahP')+')"/>';
  const box=(x,y,w,h,a,b,hl)=>rc(x,y,w,h,hl?'var(--acc2)':'var(--soft)',{s:hl?AC:'var(--line)',r:8})+tx(x+10,y+19,a,{fs:12,w:600})+(b?tx(x+10,y+35,b,{fs:11,c:'var(--mute)'}):'');
  const cnt=(rows,n)=>Math.round(rows*n/100);
  const tb=T1.find(r=>r[0].startsWith('Terminal')&&r[2]==='Sonnet 4.5'),tau=T1.find(r=>r[1]==='task-weighted avg.'&&r[2]==='Sonnet 4.5');
  const R=[['Terminal-Bench 2.0','no memory',cnt(tb[4],85),'with memory',cnt(tb[5],85),85,'Table 1'],
           ['τ²-Bench, Sonnet 4.5','no memory',cnt(tau[4],278),'with memory',cnt(tau[5],278),278,'Table 1'],
           ['τ²-Bench, no silence','selective',RC.t2[1].solved,'always remind',RC.t2[3].solved,278,'Table 2']];
  fit(el,w=>{const wide=w>=700;let s='',y;
    if(wide){const aw=Math.min(230,w*.28),xr=aw+110,rw=w-xr-2,bh=46;
      s+=box(2,46,aw,bh,'Action agent','Sonnet 4.5, never retrained')+box(2,150,aw,bh,'Environment','terminal or simulated user');
      s+=pth('M'+(aw*.35)+',94 L'+(aw*.35)+',148')+tx(aw*.35-6,124,'action',{fs:11,a:'end',c:'var(--mute)'});
      s+=pth('M'+(aw*.65)+',148 L'+(aw*.65)+',94')+tx(aw*.65+6,124,'observation',{fs:11,c:'var(--mute)'});
      s+=box(xr,6,rw,bh,'Reads: task, last 8 steps, its memory bank','bank = status (private), knowledge, procedural entries');
      s+=box(xr,82,rw,bh,'Phase 1: edit the bank','tool calls: update status, save knowledge, save procedure, delete');
      s+=box(xr,158,rw,bh,'Phase 2: remind or stay silent','&lt;context_for_action&gt; or &lt;no_intervention/&gt;; never edits the bank',true);
      s+=pth('M'+(xr+rw/2)+','+(6+bh+1)+' L'+(xr+rw/2)+',80')+pth('M'+(xr+rw/2)+','+(82+bh+1)+' L'+(xr+rw/2)+',156');
      s+=pth('M'+(aw+3)+',58 L'+(aw+40)+',58 L'+(aw+40)+',29 L'+(xr-3)+',29')+tx((aw+40+xr)/2,23,'every step',{fs:11,a:'middle',c:'var(--mute)'});
      s+=pth('M'+(xr-2)+',181 L'+(aw+58)+',181 L'+(aw+58)+',80 L'+(aw+4)+',80',AC,1,'ahA');
      s+=tx(aw+64,222,'reminder appended to the next call ('+TT.inject+' of '+TT.triggers+' steps in the released traces)',{fs:11,c:AC});
      y=248}
    else{const bh=44,g=12;y=4;
      s+=box(2,y,w-4,bh,'Action agent','Sonnet 4.5, never retrained; acts on the environment');y+=bh+22;
      s+=pth('M'+(w/2)+','+(y-21)+' L'+(w/2)+','+(y-1))+tx(w/2+8,y-7,'every step',{fs:11,c:'var(--mute)'});
      s+=box(2,y,w-4,bh,'Reads: task, last 8 steps, bank','status (private), knowledge, procedural');y+=bh+g;
      s+=pth('M'+(w/2)+','+(y-g+1)+' L'+(w/2)+','+(y-1));
      s+=box(2,y,w-4,bh,'Phase 1: edit the bank','four tools: status, save, save, delete');y+=bh+g;
      s+=pth('M'+(w/2)+','+(y-g+1)+' L'+(w/2)+','+(y-1));
      s+=box(2,y,w-4,bh,'Phase 2: remind or stay silent','reminder or &lt;no_intervention/&gt;',true);y+=bh+16;
      s+=tx(2,y,'the reminder rides on the actor\'s next call',{fs:11,c:AC})+tx(2,y+15,'('+TT.inject+' of '+TT.triggers+' steps in the released traces)',{fs:11,c:AC});y+=44}
    // the counts
    s+=tx(2,y,wide?'Tasks solved, one run each (Opus 4.6 is the memory agent)':'Tasks solved, one run each',{fs:12,w:600});y+=10;
    const pl=wide?170:2,lw=wide?0:1,bw=w-pl-(wide?110:70),bh=13;
    R.forEach(r=>{if(lw){s+=tx(2,y+12,r[0],{fs:11,w:600});y+=16}else s+=tx(pl-8,y+19,r[0],{fs:11,a:'end',w:600});
      [[r[1],r[2],'var(--dim)'],[r[3],r[4],r[6]==='Table 2'?'var(--c2)':AC]].forEach(([lab,v,c],j)=>{const x2=pl+bw*v/r[5];
        s+=rc(pl,y+j*(bh+2),x2-pl,bh,c,{r:2})+tx(x2+5,y+j*(bh+2)+11,v+' / '+r[5]+' ('+lab+')',{fs:11})});y+=2*(bh+2)+10});
    el.innerHTML=svgW(w,y+4,defs+s,'The memory agent beside the action agent, and the task counts with and without it')});
})();
