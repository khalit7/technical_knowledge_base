// ---- Reading, section 6: two concurrent requests against a daily usage counter, read-then-write against one upsert (static before/after) ----
(function(){
  const el=document.getElementById('rd-ups');if(!el)return;
  // illustrative: user 7 on 2026-10-04 has no row yet; request A adds 120 tokens, request B adds 80, at the same moment
  const S={naive:{A:[['SELECT tokens ... WHERE key = (7, day)','0 rows: "missing"'],['',''],['INSERT ... VALUES (7, day, 120)','ok, row created'],['','']],
                  B:[['',''],['SELECT tokens ... WHERE key = (7, day)','0 rows: "missing"'],['',''],['INSERT ... VALUES (7, day, 80)','ERROR 23505 duplicate key']],
                  end:'row (7, day) = 120 tokens; B’s 80 lost (or, with no key, two rows)',bad:1},
           upsert:{A:[['INSERT ... ON CONFLICT (user_id, day)','inserted 120'],['',''],['COMMIT',''],['','']],
                   B:[['',''],['INSERT ... ON CONFLICT (user_id, day)','conflict with A’s row: waits'],['',''],['DO UPDATE SET tokens = tokens + excluded.tokens','updated: 120 + 80']],
                   end:'row (7, day) = 200 tokens; both requests counted',bad:0}};
  let mode='naive';
  function draw(){
    const W=RD.width(el),narrow=W<560,lw=narrow?0:24,colW=narrow?W:Math.floor((W-lw-12)/2),rh=narrow?0:62,X=S[mode];let s='',y=0;
    if(!narrow){
      s+=RD.t(lw,14,'request A',{fs:12,w:600,fill:'var(--c1)'})+RD.t(lw+colW+12,14,'request B',{fs:12,w:600,fill:'var(--c2)'});y=24;
      for(let t=0;t<4;t++){const yy=y+t*rh;s+=RD.t(0,yy+18,'t'+(t+1),{fs:11,fill:'var(--mute)'});
        ['A','B'].forEach((who,c)=>{const e=X[who][t];if(!e[0])return;const x=lw+c*(colW+12),bad=/ERROR|lost/.test(e[1]);
          s+='<rect x="'+x+'" y="'+yy+'" width="'+colW+'" height="'+(rh-6)+'" rx="6" fill="var(--soft)" stroke="'+(bad?'var(--bad)':'var(--line)')+'"/>';
          const ln=SV.wrap(e[0],colW-16,11,true).slice(0,2);s+=SV.lines(x+8,yy+15,ln,{fs:11,mono:true,lh:14})+RD.t(x+8,yy+17+ln.length*14,e[1],{fs:11,w:600,fill:bad?'var(--bad)':'var(--mute)'})})}
      y+=4*rh+6;
    }else{
      for(let t=0;t<4;t++)['A','B'].forEach(who=>{const e=X[who][t];if(!e[0])return;const bad=/ERROR/.test(e[1]);const ln=SV.wrap(e[0],W-60,11,true);const h=18+ln.length*14+4;
        s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+(bad?'var(--bad)':'var(--line)')+'"/>';
        s+=RD.t(8,y+15,'t'+(t+1)+' '+who,{fs:11,w:600,fill:who==='A'?'var(--c1)':'var(--c2)'})+RD.t(W-8,y+15,e[1],{fs:11,a:'end',w:600,fill:bad?'var(--bad)':'var(--mute)'});
        s+=SV.lines(8,y+30,ln,{fs:11,mono:true,lh:14});y+=h+5});
    }
    const el2=SV.wrap(X.end,W-4,12);s+=SV.lines(0,y+14,el2,{fs:12,w:600,fill:X.bad?'var(--bad)':'var(--good)',lh:16});
    el.innerHTML=RD.svg(W,y+8+el2.length*16,s,'Two requests updating one usage counter');
    document.getElementById('rd-ups-cap').textContent=mode==='naive'
      ?'Both requests read before either writes, so both decide to insert. The database sees two separate statements and cannot know they were one decision. Illustrative timing; the race needs only two requests within the same few milliseconds.'
      :'One statement per request: the conflict is detected on the unique key inside the database. B waits for A’s uncommitted row, then takes the DO UPDATE branch, so the counter ends at 200 whatever the timing. Illustrative timing.';
  }
  RD.seg(document.getElementById('rd-ups-mode'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
