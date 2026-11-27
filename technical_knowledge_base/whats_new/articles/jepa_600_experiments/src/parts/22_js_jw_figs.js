// ---- Static figures of the Reading tab: the hero (every success rate on the standard 75-step test, by planner and physics)
// and the harder test by goal direction. Every number is printed by the article (see each caption); nothing is read from
// its figures by eye.
(function(){
  if(!window.RD||!document.getElementById('jw-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t;
  // [label, success %, group, note]
  const HERO=[
    ['LeWM, one 75-step search (as published)',22,'lewm',''],
    ['Simulator physics, one 75-step search',42,'phys',''],
    ['Simulator physics, expert subgoal every 25 steps',77,'phys',''],
    ['LeWM, expert subgoal every 25 steps',80,'lewm','78 in the opening'],
    ['LeWM, subgoals from memory graph, free jumps',62,'mem',''],
    ['LeWM, subgoals from memory graph, cost per jump',85,'mem','no retraining']];
  const COL={lewm:'var(--c1)',phys:'var(--mute)',mem:'var(--c2)'};
  function bars(el,rows,opt){
    const W=RD.width(el),narrow=W<560,labW=narrow?0:opt.labW,x0=8+labW,x1=W-(narrow?44:52),rh=narrow?44:26,top=8;
    const H=top+rows.length*rh+30,X=v=>x0+v/100*(x1-x0);let s='';
    [0,25,50,75,100].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+rows.length*rh)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+t(X(v),top+rows.length*rh+16,v+'%',{fs:11.5,a:'middle',fill:'var(--mute)'})});
    rows.forEach((r,i)=>{
      const y=top+i*rh, by=narrow?y+20:y+5, bh=narrow?16:15, c=COL[r[2]]||'var(--c1)';
      if(narrow)s+=t(8,y+14,r[0],{fs:12,fill:'var(--ink)'});else s+=t(x0-8,y+17,r[0],{fs:12,a:'end',fill:'var(--ink)'});
      if(r[4]!=null)s+='<rect x="'+X(0)+'" y="'+by+'" width="'+(X(r[4])-X(0))+'" height="'+bh+'" rx="3" fill="'+c+'" opacity=".3"/>';
      s+='<rect x="'+X(0)+'" y="'+by+'" width="'+(X(r[1])-X(0))+'" height="'+bh+'" rx="3" fill="'+c+'"'+(r[4]!=null?' opacity=".95" height="'+(bh/2)+'"':'')+'/>';
      s+=t(X(r[1])+5,by+bh-3,r[1]+'%',{fs:12,w:600,fill:'var(--ink)'});
    });
    el.innerHTML=RD.svg(W,H,s,opt.label);
  }
  function hero(){bars($('jw-hero-svg'),HERO,{labW:300,label:'Success on 250 long-horizon Push-T tasks by planner'})}
  // harder test, about 83 tasks a row: [label, plain memory, group, note, with rotated and mirrored copies]
  const DIR=[['Goal with the flow',69,'mem','',null],['Goal across the flow',39,'mem','',54],['Goal against the flow',27,'mem','',46],['All 250 tasks',45,'mem','',56]];
  function dir(){
    const el=$('jw-dir-svg');if(!el)return;
    const W=RD.width(el),narrow=W<560,labW=narrow?0:170,x0=8+labW,x1=W-50,rh=narrow?52:34,top=6,H=top+DIR.length*rh+28,X=v=>x0+v/100*(x1-x0);let s='';
    [0,25,50,75,100].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+DIR.length*rh)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+t(X(v),top+DIR.length*rh+16,v+'%',{fs:11.5,a:'middle',fill:'var(--mute)'})});
    DIR.forEach((r,i)=>{
      const y=top+i*rh, b1=narrow?y+20:y+4;
      if(narrow)s+=t(8,y+14,r[0],{fs:12,fill:'var(--ink)'});else s+=t(x0-8,y+19,r[0],{fs:12,a:'end',fill:'var(--ink)'});
      s+='<rect x="'+X(0)+'" y="'+b1+'" width="'+(X(r[1])-X(0))+'" height="12" rx="3" fill="var(--c1)"/>'+t(X(r[1])+5,b1+11,r[1]+'%',{fs:12,fill:'var(--ink)'});
      if(r[4]!=null)s+='<rect x="'+X(0)+'" y="'+(b1+14)+'" width="'+(X(r[4])-X(0))+'" height="12" rx="3" fill="var(--c2)"/>'+t(X(r[4])+5,b1+25,r[4]+'%',{fs:12,w:600,fill:'var(--ink)'});
      else s+=t(X(0)+4,b1+25,'one value printed for both',{fs:11.5,fill:'var(--mute)'});
    });
    el.innerHTML=RD.svg(W,H,s,'Harder test success by goal direction, plain memory against memory with transformed copies');
  }
  RD.onRender(hero);RD.onRender(dir);RD.onResize(()=>{hero();dir()});hero();dir();
})();
