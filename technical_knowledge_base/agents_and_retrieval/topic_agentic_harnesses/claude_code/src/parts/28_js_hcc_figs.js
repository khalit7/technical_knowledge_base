// ---- Reading tab: three static figures drawn at the measured width (hero, compaction, settings precedence) ----
(function(){
  const esc=RD.esc;
  const box=(x,y,w,h,o)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1.4)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
  const txt=(x,y,s,o)=>RD.t(x,y,esc(s),o||{});
  const arrow=(x1,y1,x2,y2,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.5" marker-end="url(#hcc-ah)"/>';
  const defs='<defs><marker id="hcc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const CTX=[['System prompt and tool definitions','2'],['CLAUDE.md files and rules','5'],['Skill names and descriptions','6'],['MCP tool names (definitions on demand)','10'],['SessionStart hook output','4'],['Conversation and tool results','1, 9']];
  const ENF=[['PreToolUse hooks: exit 2 blocks','4'],['Rules: deny, then ask, then allow','3'],['Permission mode decides the rest','3, 8'],['OS sandbox, if turned on','3'],['Tool runs; output capped','2'],['PostToolUse hooks','4']];
  const C4='var(--c4)',AC='var(--acc)';

  function hero(){
    const el=document.getElementById('hcc-hero');if(!el)return;
    const W=RD.width(el),wide=W>=700,bh=26,gap=6;let s=defs,H;
    const lab=(x,y,w,item,col)=>box(x,y,w,bh,{st:col})+txt(x+8,y+17,item[0],{fs:12})+txt(x+w-6,y+17,item[1],{fs:11,a:'end',fill:col,w:600});
    if(wide){
      const cw=Math.round(W*0.34),mx=cw+70,mw=W-2*cw-140,rx=W-cw;
      s+=txt(0,14,'CONTEXT: text the model reads',{fs:12,w:600,fill:C4})+txt(rx,14,'ENFORCEMENT: code on every tool call',{fs:12,w:600,fill:AC});
      CTX.forEach((c,i)=>{s+=lab(0,24+i*(bh+gap),cw,c,C4)});
      ENF.forEach((c,i)=>{s+=lab(rx,24+i*(bh+gap),cw,c,AC)});
      const my=24+2*(bh+gap)-4,mh=2*bh+gap+8;
      s+=box(mx,my,mw,mh,{st:'var(--ink)',dash:1})+txt(mx+mw/2,my+22,'Model',{fs:13,a:'middle',w:600})+txt(mx+mw/2,my+40,'text, tool calls',{fs:11.5,a:'middle',fill:'var(--mute)'});
      s+=arrow(cw+2,my+mh/2-6,mx-2,my+mh/2-6)+txt((cw+mx)/2,my+mh/2-14,'request',{fs:11,a:'middle',fill:'var(--mute)'});
      s+=arrow(mx+mw+2,my+mh/2-6,rx-2,24+bh/2)+txt((mx+mw+rx)/2+6,my+mh/2+12,'tool call',{fs:11,a:'middle',fill:'var(--mute)'});
      const by=24+6*(bh+gap),ly=24+5*(bh+gap)+bh/2;
      s+='<path d="M'+(rx+cw/2)+','+(by-gap)+' L'+(rx+cw/2)+','+(by+14)+' L'+(cw/2)+','+(by+14)+' L'+(cw/2)+','+(by-gap+2)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#hcc-ah)"/>';
      s+=txt(W/2,by+28,'result appended; the next request goes out (section 1)',{fs:11.5,a:'middle',fill:'var(--mute)'});
      const fy=by+40;
      s+=box(mx-40,fy,mw+80,bh+2,{st:AC})+txt(mx+mw/2,fy+18,'Stop hook may refuse the end (4)',{fs:11.5,a:'middle'});
      s+=box(0,fy,cw,bh+2,{st:C4,dash:1})+txt(8,fy+18,'Agent tool: subagent, own window (7)',{fs:11.5});
      s+=box(rx,fy,cw,bh+2,{st:'var(--line)'})+txt(rx+8,fy+18,'claude -p: result record, exit (11)',{fs:11.5});
      H=fy+bh+8; void ly;
    }else{
      const w=W-14;let y=14;
      s+=txt(0,y,'CONTEXT: text the model reads',{fs:12,w:600,fill:C4});y+=8;
      CTX.forEach(c=>{s+=lab(14,y,w-14,c,C4);y+=bh+gap});
      s+=arrow(W/2,y,W/2,y+16);y+=20;
      s+=box(14,y,w-14,40,{st:'var(--ink)',dash:1})+txt(W/2+7,y+17,'Model',{fs:13,a:'middle',w:600})+txt(W/2+7,y+33,'text, tool calls',{fs:11.5,a:'middle',fill:'var(--mute)'});y+=44;
      s+=arrow(W/2,y,W/2,y+16);y+=20;
      s+=txt(0,y+4,'ENFORCEMENT: code on every tool call',{fs:12,w:600,fill:AC});y+=12;
      const top=y;ENF.forEach(c=>{s+=lab(14,y,w-14,c,AC);y+=bh+gap});
      const ret=24+bh/2+8+5*(bh+gap); // y of the conversation box centre
      s+='<path d="M14,'+(y-gap-bh/2)+' L4,'+(y-gap-bh/2)+' L4,'+(14+8+5*(bh+gap)+bh/2)+' L12,'+(14+8+5*(bh+gap)+bh/2)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#hcc-ah)"/>';
      s+=txt(14,y+10,'result appended; loop again (section 1)',{fs:11.5,fill:'var(--mute)'});y+=20;
      s+=box(14,y,w-14,bh,{st:AC})+txt(22,y+17,'Stop hook may refuse the end (4)',{fs:11.5});y+=bh+gap;
      s+=box(14,y,w-14,bh,{st:C4,dash:1})+txt(22,y+17,'Agent tool: subagent, own window (7)',{fs:11.5});y+=bh+gap;
      H=y+2; void top; void ret;
    }
    el.innerHTML=RD.svg(W,H,s,'Claude Code: context assembled into each request, and the enforcement chain every tool call passes');
  }

  const CMP=[
    ['System prompt and tools','resent from the snapshot','re-recorded as a new snapshot','g'],
    ['Project-root CLAUDE.md','loaded at launch','re-read from disk','g'],
    ['Nested CLAUDE.md, path rules','loaded on demand','gone until a matching file is read','x'],
    ['Invoked skill bodies','in the conversation','latest per skill re-attached (5,000 each, 25,000 total)','g'],
    ['Older turns, tool outputs','verbatim','tool outputs cleared first, then summarised','a'],
    ['Recent messages','verbatim','kept verbatim (last 5 in the recorded /compact)','g']];
  const CC={g:'var(--good)',a:'var(--c5)',x:'var(--dim)'};
  function cmp(){
    const el=document.getElementById('hcc-cmp');if(!el)return;
    const W=RD.width(el),wide=W>=700;let s=defs,H;
    if(wide){
      const c1=Math.round(W*0.27),c2=Math.round(W*0.2),c3=W-c1-c2-60,x2=c1+12,x3=x2+c2+48,bh=28,gap=6;
      s+=txt(0,14,'Part of the window',{fs:12,w:600})+txt(x2,14,'Before',{fs:12,w:600})+txt(x3,14,'After compaction',{fs:12,w:600});
      CMP.forEach((r,i)=>{const y=24+i*(bh+gap),col=CC[r[3]];
        s+=txt(0,y+18,r[0],{fs:12})+box(x2,y,c2,bh,{st:'var(--line)',fill:'var(--soft)'})+txt(x2+8,y+18,r[1],{fs:11.5})+arrow(x2+c2+4,y+bh/2,x3-4,y+bh/2)+box(x3,y,c3,bh,{st:col,dash:r[3]==='x'})+txt(x3+8,y+18,r[2],{fs:11.5,fill:r[3]==='x'?'var(--mute)':'var(--ink)'})});
      H=24+CMP.length*(bh+gap);
    }else{
      const w=W-2,bh=24;let y=4;
      CMP.forEach(r=>{const col=CC[r[3]];
        s+=txt(0,y+13,r[0]+': '+r[1],{fs:11.5,w:600});y+=18;
        s+=txt(4,y+14,'→',{fs:12,fill:'var(--mute)'})+box(18,y,w-18,bh,{st:col,dash:r[3]==='x'})+txt(24,y+16,r[2],{fs:11});y+=bh+10});
      H=y;
    }
    el.innerHTML=RD.svg(W,H,s,'What survives a compaction, part by part');
  }

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
  const all=()=>{hero();cmp();set()};
  RD.onRender(all);RD.onResize(all);all();
})();
