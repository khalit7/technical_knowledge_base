// ---- Reading tab: the settings-precedence figure, drawn at the measured width (the hero and compaction are 3D scenes 40 and 44) ----
(function(){
  const esc=RD.esc;
  const box=(x,y,w,h,o)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1.4)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
  const txt=(x,y,s,o)=>RD.t(x,y,esc(s),o||{});
  const arrow=(x1,y1,x2,y2,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.5" marker-end="url(#hcc-ah)"/>';
  const defs='<defs><marker id="hcc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const AC='var(--acc)';

  const SET=[['Managed (organisation)','','deny: Bash(curl *)'],['Command-line flags','model: sonnet',''],['.claude/settings.local.json','','allow: Bash(npm test)'],['.claude/settings.json (project)','model: haiku','allow: Bash(curl *)'],['~/.claude/settings.json (user)','model: opus','allow: Read']];
  function set(){
    const el=document.getElementById('hcc-set');if(!el)return;
    const W=RD.width(el),wide=W>=640;let s=defs,H,y=4;
    const bh=wide?28:44,gap=5;
    SET.forEach((r,i)=>{
      s+=box(0,y,W-2,bh,{st:i===0?AC:'var(--line)',fill:'var(--soft)'});
      if(wide){s+=txt(10,y+18,(i+1)+'. '+r[0],{fs:12,w:600})+txt(Math.round(W*0.45),y+18,r[1],{fs:11.5,fill:r[1]==='model: sonnet'?AC:'var(--mute)',w:r[1]==='model: sonnet'?600:400})+txt(Math.round(W*0.66),y+18,r[2],{fs:11.5,fill:r[2].startsWith('deny')?'var(--bad)':'var(--ink)'})}
      else{s+=txt(8,y+17,(i+1)+'. '+r[0],{fs:12,w:600})+txt(18,y+35,[r[1],r[2]].filter(Boolean).join('; '),{fs:11.5,fill:r[2].startsWith('deny')?'var(--bad)':'var(--ink)'})}
      y+=bh+gap});
    y+=6;
    const res=wide?['Result: model = sonnet (the highest file that sets it). allow = npm test, curl, Read (lists merge);','curl is still refused: a deny anywhere beats an allow anywhere.']:['Result: model = sonnet (highest wins).','allow lists merge: npm test, curl, Read;','curl is refused: a deny anywhere wins.'];
    res.forEach(l=>{s+=txt(0,y+13,l,{fs:12});y+=18});
    H=y+2;
    el.innerHTML=RD.svg(W,H,s,'Settings precedence: five sources, scalars from the highest, lists merged, deny wins');
  }
  const all=()=>{set()};
  RD.onRender(all);RD.onResize(all);all();
})();
