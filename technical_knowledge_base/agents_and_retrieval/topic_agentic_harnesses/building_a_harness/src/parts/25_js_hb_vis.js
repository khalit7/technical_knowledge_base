// ---- Reading figures drawn at the measured width: hero loop, SWE-agent ablation, planning, environment, cost per call, measuring ----
(function(){
  const esc=RD.esc, T=RD.t, H=window.HB||{};
  const reg=(el,f)=>{if(!el)return;const d=()=>{try{f(el,RD.width(el))}catch(e){el.textContent='(figure failed: '+e.message+')'}};HBV.draws.push(d);d()};
  const arrow=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.5" marker-end="url(#hbv-ah)"/>';
  const defs='<defs><marker id="hbv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>'};

  // ---------- hero: one turn of the loop
  reg(document.getElementById('hb-hero-svg'),(el,w)=>{
    const S=[
      ['Send the request','system + tools + history: 486 to 1,531 tokens a call','1, 11','hb-s1'],
      ['Model writes text or a tool call','a call is tokens between special tokens','1','hb-s1'],
      ['The turn ends at the action','let past it: 5 of 18 wrote the user’s turn','2','hb-s2',1],
      ['Parse and validate the calls','a malformed call can vanish in the server','1, 7','hb-s1'],
      ['Gate, then run the calls','in order, or in parallel if read-only; cwd, 60 s timeout','3, 4, 9','hb-s3'],
      ['Return results it can act on','"Edit failed." fixed 1 of 13; a diagnosis 4','5, 6, 7','hb-s5'],
      ['Stop? Done and verified, or a cap','naive stops left a test failing in 4 of 16 runs','10','hb-s10']];
    const narrow=w<560, bw=Math.min(narrow?w-46:620,w-46), bh=narrow?44:42, gap=14, x0=0;
    let g=defs,y=4;
    S.forEach((s,i)=>{
      const hot=s[4];
      g+='<a href="#'+s[3]+'">'+box(x0,y,bw,bh,{fill:hot?'var(--acc2)':'var(--bg)',stroke:hot?'var(--acc)':'var(--line)',sw:hot?2:1.2})+
        T(x0+10,y+17,esc(s[0]),{fs:13,w:600,fill:'var(--ink)'})+T(x0+10,y+34,esc(s[1]),{fs:11,fill:'var(--mute)'})+
        T(x0+bw-8,y+17,'§'+s[2],{a:'end',fs:11,fill:hot?'var(--acc)':'var(--mute)'})+'</a>';
      if(i<S.length-1)g+=arrow(x0+bw/2,y+bh,x0+bw/2,y+bh+gap-1);
      y+=bh+gap;
    });
    // loop back on the right
    const xr=bw+22, yTop=4+bh/2, yBot=y-gap-bh/2;
    g+='<path d="M'+bw+' '+yBot+' H'+xr+' V'+yTop+' H'+(bw+3)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#hbv-ah)"/>';
    g+='<text x="'+(xr+12)+'" y="'+((yTop+yBot)/2)+'" font-size="11" fill="var(--acc)" text-anchor="middle" transform="rotate(-90 '+(xr+12)+' '+((yTop+yBot)/2)+')">not done: append the results, call again</text>';
    // exit
    g+=arrow(bw/2,y-gap,bw/2,y+10);
    g+=box(bw/2-Math.min(150,bw/2-4),y+12,2*Math.min(150,bw/2-4),26,{fill:'var(--soft)'})+T(bw/2,y+29,'done: return the reason as data',{a:'middle',fs:11.5,fill:'var(--ink)'});
    el.innerHTML=RD.svg(w,y+42,g,'The agent loop: request, generation, boundary, parse, gate and run, results, stop check');
  });

  // ---------- SWE-agent Table 3
  const aci=document.getElementById('hb-aci-paper');
  if(aci){const rows=[['Default SWE-agent',18.0,1],['Edit without the linter',15.0],['No edit command (shell only)',10.3],['Viewer shows 30 lines',14.3],['Viewer shows the whole file',12.7],['Iterative search',12.0],['No search command',15.7]];
    HBV.hbars(aci,rows.map(r=>({label:r[0],segs:[{v:r[1],c:r[2]?'var(--acc)':'var(--c2)',t:r[1]+'% resolved'}],right:r[1].toFixed(1)+'%'})),{max:20,label:'SWE-agent ablations: resolved share'});}

  // ---------- planning
  reg(document.getElementById('hb-plan-svg'),(el,w)=>{
    const narrow=w<620, cw=narrow?w-2:Math.floor((w-24)/2);
    let g=defs,y=4;
    const L=[['Plan phase','tools: read_file, search, run_tests only','var(--bg)'],['A person approves the plan','the gate switches the tool list','var(--soft)'],['Act phase','every tool; the todo list ticked as items finish','var(--bg)']];
    L.forEach((b,i)=>{g+=box(0,y,cw,44,{fill:b[2]})+T(10,y+18,esc(b[0]),{fs:13,w:600,fill:'var(--ink)'})+T(10,y+35,esc(b[1]),{fs:11,fill:'var(--mute)'});
      if(i<2)g+=arrow(cw/2,y+44,cw/2,y+58);y+=60});
    let x=narrow?0:cw+24, y2=narrow?y+6:4;
    const R=[['turn 2','todo_write: 3 items','[ ] reproduce  [ ] fix  [ ] run tests',1],['turn 3','read_file, run_tests','',0],['turn 5','edit_file','',0],['turn 6','todo_write: 2 done','[x] reproduce  [x] fix  [ ] run tests',1]];
    g+=T(x,y2+12,'The transcript, with a todo tool',{fs:12,w:600,fill:'var(--ink)'});y2+=20;
    R.forEach(r=>{const h=r[3]?44:28;g+=box(x,y2,cw,h,{fill:r[3]?'var(--acc2)':'var(--bg)',stroke:r[3]?'var(--acc)':'var(--line)'})+
      T(x+10,y2+18,esc(r[0]+': '+r[1]),{fs:12,fill:'var(--ink)'})+(r[3]?T(x+10,y2+35,esc('result: '+r[2]),{fs:11,fill:'var(--acc)'}):'');y2+=h+8});
    el.innerHTML=RD.svg(w,Math.max(y,y2)+4,g,'Planning: a read-only plan phase, approval, an act phase; a todo tool whose result keeps the list in context');
  });

  // ---------- execution environment
  reg(document.getElementById('hb-env-svg'),(el,w)=>{
    const S=[['Host process','nothing; the gate decides what starts','native.py: path fence, timeout'],['OS sandbox per command','writes and network of each command','Seatbelt, bubblewrap'],['Container or VM','the whole session','throw it away after'],['Cloud machine','everything; you review a branch or PR','background agents']];
    const narrow=w<700; let g=defs,y=4;
    if(narrow){S.forEach((s,i)=>{const op=0.25+0.25*i;g+=box(0,y,w-2,58,{stroke:'var(--acc)',sw:1+i*0.6})+
        '<rect x="0" y="'+y+'" width="6" height="58" rx="3" fill="var(--acc)" opacity="'+op+'"/>'+
        T(14,y+18,esc(s[0]),{fs:13,w:600,fill:'var(--ink)'})+T(14,y+35,esc('contains: '+s[1]),{fs:11,fill:'var(--ink)'})+T(14,y+50,esc(s[2]),{fs:11,fill:'var(--mute)'});
        if(i<3)g+=arrow(30,y+58,30,y+70);y+=72});
      el.innerHTML=RD.svg(w,y,g,'Execution environments from no isolation to a cloud machine');return}
    const cw=(w-3*18)/4;
    g+=T(0,y+12,'more isolation, more autonomy allowed →',{fs:11.5,fill:'var(--acc)'});y+=22;
    S.forEach((s,i)=>{const x=i*(cw+18);g+=box(x,y,cw,92,{stroke:'var(--acc)',sw:1+i*0.6})+
      '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="6" rx="3" fill="var(--acc)" opacity="'+(0.25+0.25*i)+'"/>'+
      T(x+8,y+24,esc(s[0]),{fs:12.5,w:600,fill:'var(--ink)'});
      const words=('contains: '+s[1]).split(' ');let line='',ly=y+42;const maxc=Math.floor((cw-14)/6.2);
      words.forEach(wd=>{if((line+' '+wd).trim().length>maxc){g+=T(x+8,ly,esc(line.trim()),{fs:11,fill:'var(--ink)'});ly+=14;line=wd}else line+=' '+wd});
      g+=T(x+8,ly,esc(line.trim()),{fs:11,fill:'var(--ink)'});g+=T(x+8,y+84,esc(s[2]),{fs:11,fill:'var(--mute)'});
      if(i<3)g+=arrow(x+cw+2,y+46,x+cw+16,y+46)});
    el.innerHTML=RD.svg(w,y+96,g,'Execution environments from no isolation to a cloud machine');
  });

  // ---------- cost per call (HB.tok)
  const ce=document.getElementById('hb-cost-svg'), TK=H.tok;
  if(ce&&TK){const NAMES={S:'system prompt and markup',T:'tool definitions',U:'task',G:'model replies',R:'tool results'};
    const COL={S:'var(--mute)',T:'var(--c5)',U:'var(--c1)',G:'var(--c3)',R:'var(--c4)'};
    const reg2=[...TK.reg];
    HBV.hbars(ce,TK.cuts.map((end,j)=>{const c={};for(let i=0;i<end;i++)c[reg2[i]]=(c[reg2[i]]||0)+1;
      return {label:'call '+(j+1),segs:'STUGR'.split('').map(k=>({v:c[k]||0,c:COL[k],t:NAMES[k]+': '+(c[k]||0)})),right:end.toLocaleString()}}),
      {max:TK.cuts[TK.cuts.length-1],label:'Prompt tokens per call, by kind',legend:'STUGR'.split('').map(k=>[COL[k],NAMES[k]])});}

  // ---------- measuring: first-attempt correct per format, three models
  const me=document.getElementById('hb-meas-svg'), B=H.bench;
  if(me&&B){
    const F=['exact','sr','udiff','whole','patch'],FN={exact:'Exact replace',sr:'SEARCH/REPLACE',udiff:'Unified diff',whole:'Whole file',patch:'apply_patch'};
    const M=[['haiku_nothink','Haiku 4.5','var(--c1)'],['sonnet_nothink','Sonnet 5.5','var(--c4)'],['local_t0','Qwen3 4B','var(--c2)']].filter(m=>B.runs[m[0]]);
    const share=(m,f)=>{let c=0,n=0;B.tasks.forEach(t=>{const a=(B.runs[m][t.id]||{})[f];if(!a)return;n++;if(a[0].res[B.primary[f]][1])c++});return n?c/n:0};
    reg(me,(el,w)=>{
      const narrow=w<560, L=narrow?0:130, R=12, x0=L+(narrow?4:10), x1=w-R, X=v=>x0+(x1-x0)*v;
      let g='',y=18;
      [0,0.25,0.5,0.75,1].forEach(v=>{g+=T(X(v),12,Math.round(v*100)+'%',{a:v===0?'start':v===1?'end':'middle',fs:11,fill:'var(--mute)'})});
      const top=y;
      F.forEach(f=>{
        if(narrow){g+=T(0,y+11,FN[f],{fs:12,fill:'var(--ink)'});y+=14}else g+=T(0,y+14,FN[f],{fs:12,fill:'var(--ink)'});
        const vs=M.map(m=>share(m[0],f)), lo=Math.min(...vs), hi=Math.max(...vs);
        g+='<line x1="'+X(lo)+'" x2="'+X(hi)+'" y1="'+(y+10)+'" y2="'+(y+10)+'" stroke="var(--dim)" stroke-width="3"/>';
        M.forEach((m,i)=>{g+='<circle cx="'+X(vs[i]).toFixed(1)+'" cy="'+(y+10)+'" r="'+(i===0?8:5)+'" fill="'+(i===0?'none':m[2])+'" stroke="'+(i===0?m[2]:'var(--bg)')+'" stroke-width="'+(i===0?2.5:1.5)+'"><title>'+m[1]+': '+Math.round(vs[i]*100)+'%</title></circle>'});
        y+=narrow?22:26});
      [0,0.5,1].forEach(v=>{g='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-2)+'" y2="'+y+'" stroke="var(--line)"/>'+g});
      el.innerHTML=RD.svg(w,y+4,g,'Share correct at the first attempt per edit format, three models')+
        '<div class="small mute" style="margin-top:4px">'+M.map((m,i)=>'<span style="color:'+m[2]+'">'+(i===0?'&#9675;':'&#9679;')+'</span> '+m[1]+(i===0?' (ring)':'')).join(' &nbsp; ')+'</div>';
    });
  }
})();
