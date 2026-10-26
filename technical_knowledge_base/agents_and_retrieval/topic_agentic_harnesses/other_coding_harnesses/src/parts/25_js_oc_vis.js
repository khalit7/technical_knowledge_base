// ---- Reading figures, drawn as SVG at the measured width and redrawn on resize: hero, run endings, matcher ladder,
// first-request anatomy, compaction, containment grid, where the loop runs, run cost bars, Aider's repository map ----
window.OCV=(function(){
  const esc=RD.esc,T=RD.t,draws=[];
  const redraw=()=>draws.forEach(f=>{try{f()}catch(e){}});
  RD.onRender(redraw);RD.onResize(redraw);
  const reg=(id,f)=>{const el=document.getElementById(id);if(!el)return;const d=()=>{try{f(el,RD.width(el))}catch(e){el.textContent='(figure failed: '+e.message+')'}};draws.push(d);d()};
  const defs='<defs><marker id="ocv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const arrow=(x1,y1,x2,y2,c,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.5"'+(dash?' stroke-dasharray="4 3"':'')+' marker-end="url(#ocv-ah)"/>';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?7:o.rx)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>'};
  return {esc,T,reg,defs,arrow,box,draws,redraw};
})();
(function(){
  const {esc,T,reg,defs,arrow,box}=OCV, fmt=n=>Number(n).toLocaleString('en-US');
  const D=window.HR_DATA||{runs:[]}, E=window.HR_ENDS||{}, R=id=>D.runs.find(r=>r.id===id);
  const goRun=id=>{const b=document.querySelector('#tabs button[data-t="t-runs"]');if(b)b.click();if(window.HR_SELECT)window.HR_SELECT(id);const h=document.getElementById('hr-h-run');if(h)h.scrollIntoView({block:'start'})};
  const clickable=el=>{if(el.dataset.ocvc)return;el.dataset.ocvc=1;el.addEventListener('click',e=>{const g=e.target.closest('g[data-id]');if(g)goRun(g.dataset.id)})};

  // ---------- hero: one turn of the loop with the five choices, and where each harness failed
  reg('rd-hero-svg',(el,w)=>{
    const S=[['The model replies','the same in every harness',null],
      ['1 How the action is written','a tool call, or a block of text in the reply','#rd-1'],
      ['2 Does the loop stop?','no tool call, finish tool, submit line, or no loop','#rd-2'],
      ['3 Apply the edit','patch grammar, 2 to 9 matchers, SEARCH/REPLACE, sed','#rd-3'],
      ['4 Run it inside what?','OS sandbox, policy file, allow rules, git, nothing','#rd-4'],
      ['5 What the model sees next','compact at 50% or 90%, condenser, repo map, none','#rd-5']];
    const wide=w>=700, lw=wide?Math.min(400,Math.floor(w*0.52)):w-28, bh=40, gap=12;
    let g=defs,y=4;
    S.forEach((s,i)=>{const hot=!!s[2];
      const inner=box(0,y,lw,bh,{fill:hot?'var(--acc2)':'var(--soft)',stroke:hot?'var(--acc)':'var(--line)',sw:hot?1.6:1.2})+T(10,y+16,esc(s[0]),{fs:13,w:600,fill:'var(--ink)'})+T(10,y+32,esc(s[1]),{fs:11,fill:'var(--mute)'});
      g+=hot?'<a href="'+s[2]+'">'+inner+'</a>':inner;
      if(i<S.length-1)g+=arrow(lw/2,y+bh,lw/2,y+bh+gap-1);y+=bh+gap});
    const xr=lw+14,yT=4+bh/2,yB=y-gap-bh/2;
    g+='<path d="M'+lw+' '+yB+' H'+xr+' V'+yT+' H'+(lw+3)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#ocv-ah)"/>';
    let h=y;
    // outcomes panel
    const O=[['Aider (3 runs)',2,'fixed both: harness picks files, runs tests'],['Gemini CLI',1,'2: an empty reply ended the loop'],['Codex CLI',0,'1: optional schema field, resent 4 times'],['opencode',0,'2: prose instead of an edit call'],['OpenHands',0,'3: str_replace refused 5 edits'],['mini-SWE-agent',0,'3: sed matched nothing, silently']];
    const ox=wide?lw+40:0, oy=wide?4:y+14, ow=wide?w-ox:w;
    g+=T(ox,oy+12,'Same task, local 4B model: bugs fixed, and where it failed',{fs:12,w:600,fill:'var(--ink)'});
    let yy=oy+24;const two=ow<430;
    O.forEach(o=>{g+=T(ox,yy+13,esc(o[0]),{fs:12,fill:'var(--ink)'});const dx=ox+(two?112:118);
      for(let k=0;k<2;k++)g+='<circle cx="'+(dx+k*16)+'" cy="'+(yy+9)+'" r="6" fill="'+(k<o[1]?(o[1]===2?'var(--good)':'var(--c5)'):'var(--bg)')+'" stroke="'+(o[1]===2?'var(--good)':o[1]?'var(--c5)':'var(--bad)')+'" stroke-width="1.5"/>';
      if(two){g+=T(ox+10,yy+29,esc(o[2]),{fs:11,fill:'var(--mute)'});yy+=36}else{g+=T(dx+30,yy+13,esc(o[2]),{fs:11.5,fill:'var(--mute)'});yy+=24}});
    h=Math.max(h,yy+4);
    el.innerHTML=RD.svg(w,h,g,'The agent loop with five design choices, and where each harness failed on the shared task');
  });

  // ---------- how each recorded run ended
  const CAT={A:['var(--c1)','acted, real result'],E:['var(--bad)','acted, error or refusal'],S:['var(--c5)','silent no-op'],P:['var(--mute)','prose or empty reply'],X:['var(--dim)','side call'],U:['var(--c4)','subagent call']};
  const NAME=r=>r.harness+(/Claude Haiku/.test(r.model)?', Haiku':'')+' ('+(r.label||'')+')';
  reg('rd-ends-svg',(el,w)=>{
    const narrow=w<620, L=narrow?0:220, rows=D.runs.filter(r=>E[r.id]);
    const maxn=Math.max(...rows.map(r=>r.calls.length));
    let g='',y=4;
    // legend
    let lx=0;Object.keys(CAT).forEach(k=>{const t=CAT[k][1],tw=t.length*6.1+22;if(lx+tw>w){lx=0;y+=16}g+='<rect x="'+lx+'" y="'+(y+2)+'" width="10" height="10" rx="2" fill="'+CAT[k][0]+'"/>'+T(lx+14,y+11,esc(t),{fs:11,fill:'var(--ink)'});lx+=tw});y+=22;
    rows.forEach(r=>{const e=E[r.id];
      let gg='';
      if(narrow){gg+=T(0,y+12,esc(NAME(r)),{fs:11.5,w:600,fill:'var(--ink)'});y+=16}else gg+=T(0,y+13,esc(NAME(r)),{fs:11.5,fill:'var(--ink)'});
      const x0=narrow?0:L, avail=w-x0, cw=Math.max(5,Math.min(14,Math.floor((narrow?avail:avail*0.5)/maxn)-1));
      for(let i=0;i<e.cats.length;i++){const c=e.cats[i];gg+='<rect x="'+(x0+i*(cw+1))+'" y="'+(y+3)+'" width="'+cw+'" height="12" rx="1.5" fill="'+CAT[c][0]+'"><title>call '+(i+1)+': '+esc(CAT[c][1])+'</title></rect>'}
      const ex=x0+e.cats.length*(cw+1)+6;
      if(narrow||ex+e.end.length*6>w){y+=17;gg+=T(x0,y+11,esc('ends: '+e.end),{fs:11,fill:'var(--mute)'});y+=16}
      else{gg+=T(ex,y+13,esc(e.end),{fs:11,fill:'var(--mute)'});y+=20}
      g+='<g data-id="'+esc(r.id)+'">'+gg+'</g>'});
    el.innerHTML=RD.svg(w,y+2,g,'Every recorded run as a strip of model calls, classified, with its end reason');clickable(el);
  });

  // ---------- matcher ladder
  const LAD=[['Codex apply_patch',['exact','ignore trailing spaces','trimmed','dashes and quotes to ASCII'],'error: hunk not found',0],
    ['Gemini CLI replace',['exact','flexible (trimmed, re-indented)','regex with \\s*','fuzzy, Levenshtein up to 10%'],'error',0],
    ['opencode edit',['exact','line-trimmed','block-anchor','whitespace-normalised','indentation-flexible','escape-normalised','trimmed-boundary','context-aware','multi-occurrence'],'error; LSP diagnostics on success',0],
    ['Aider SEARCH/REPLACE',['exact','leading whitespace','stray blank line','... elision'],'"Did you mean" + closest lines',0],
    ['OpenHands str_replace',['exact, once','strip surrounding whitespace'],'error: "No replacement was performed"',1],
    ['mini-SWE-agent sed',[],'nothing: exit 0, no output',2]];
  reg('rd-ladder-svg',(el,w)=>{
    const narrow=w<620,L=narrow?0:170,sq=narrow?20:22;let g='',y=4;
    LAD.forEach(l=>{
      if(narrow){g+=T(0,y+12,esc(l[0]),{fs:12,w:600,fill:'var(--ink)'});y+=16}else g+=T(0,y+15,esc(l[0]),{fs:12,fill:'var(--ink)'});
      let x=L;
      if(!l[1].length)g+=box(x,y+2,sq,sq-4,{fill:'var(--bg)',stroke:'var(--mute)',dash:1,rx:3})+T(x+sq/2,y+15,'0',{a:'middle',fs:11,fill:'var(--mute)'});
      l[1].forEach((m,i)=>{g+='<g><title>'+esc((i+1)+'. '+m)+'</title>'+box(x+i*(sq+3),y+2,sq,sq-4,{fill:'var(--acc2)',stroke:'var(--acc)',rx:3})+T(x+i*(sq+3)+sq/2,y+15,String(i+1),{a:'middle',fs:11,fill:'var(--ink)'})+'</g>'});
      const n=Math.max(1,l[1].length),fx=x+n*(sq+3)+8,col=l[3]===2?'var(--c5)':l[3]===1?'var(--bad)':'var(--mute)';
      if(fx+l[2].length*6.2>w){y+=sq;g+=T(L,y+10,esc('no match: '+l[2]),{fs:11,fill:col});y+=16}
      else{g+=T(fx,y+15,esc('no match: '+l[2]),{fs:11,fill:col});y+=sq+6}
    });
    el.innerHTML=RD.svg(w,y+2,g,'Matcher ladders of six edit tools');
  });

  // ---------- first-request anatomy
  reg('rd-anat-svg',(el,w)=>{
    const ids=['gemini_1','codex_1','opencode_1','ohs_1','aider_diff_1','aider_whole_1','mswe_local_text','mswe_local_tool'];
    const rows=ids.map(R).filter(r=>r&&r.first);if(!rows.length)return;
    const tot=r=>r.first.system_chars+r.first.tools_chars+r.first.user_chars, mx=Math.max(...rows.map(tot));
    const narrow=w<560,L=narrow?0:190,RW=narrow?84:96;let g='',y=4;
    [['var(--c1)','system prompt'],['var(--c2)','tool definitions'],['var(--c3)','user content']].reduce((x,l)=>{g+='<rect x="'+x+'" y="'+(y+2)+'" width="10" height="10" rx="2" fill="'+l[0]+'"/>'+T(x+14,y+11,l[1],{fs:11,fill:'var(--ink)'});return x+l[1].length*6.2+30},0);y+=20;
    rows.forEach(r=>{const f=r.first,lab=r.harness+(r.label&&/^(Aider|mini)/.test(r.harness)?' ('+r.label+')':'');
      if(narrow){g+=T(0,y+12,esc(lab),{fs:11.5,fill:'var(--ink)'});y+=15}else g+=T(0,y+13,esc(lab),{fs:12,fill:'var(--ink)'});
      const x0=L+(narrow?0:6),bw=w-x0-RW;let x=x0;
      [[f.system_chars,'var(--c1)','system prompt'],[f.tools_chars,'var(--c2)','tools'],[f.user_chars,'var(--c3)','user']].forEach(s=>{const sw=bw*s[0]/mx;if(sw>0)g+='<rect x="'+x.toFixed(1)+'" y="'+(y+2)+'" width="'+sw.toFixed(1)+'" height="13" fill="'+s[1]+'"><title>'+esc(s[2]+': '+fmt(s[0])+' characters')+'</title></rect>';x+=sw});
      g+=T(w-2,y+13,fmt(f.in)+' tok',{a:'end',fs:11.5,fill:'var(--ink)'});y+=narrow?20:21});
    if(narrow){g+=T(0,y+12,'bar length: characters of the first request;',{fs:11,fill:'var(--mute)'});y+=14;g+=T(0,y+12,'right: prompt tokens counted',{fs:11,fill:'var(--mute)'})}
    else g+=T(0,y+12,'bar length: characters of the first request; right: prompt tokens counted',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y+18,g,'First request of each harness by part');
  });

  // ---------- compaction: what survives
  reg('rd-compact-svg',(el,w)=>{
    const C=[['Codex CLI','at 90% of the window',[['s',0.85,'summary'],['k',0.15,'user msgs']]],
      ['Gemini CLI','at 50%, plus a probe',[['s',0.70,'<state_snapshot> of oldest 70%'],['k',0.30,'newest 30%']]],
      ['opencode','at the usable window',[['s',0.75,'summary'],['k',0.25,'tail 25%']]],
      ['OpenHands','past 80 events',[['k',0.08,'first 4'],['s',0.62,'summary: COMPLETED, PENDING ...'],['k',0.30,'recent tail']]],
      ['Aider','chat past a budget',[['s',0.6,'background summary'],['k',0.4,'recent chat']]],
      ['mini-SWE-agent','never',[['k',1,'everything; past the window the run fails']]]];
    const narrow=w<600,L=narrow?0:250;let g='',y=4;
    C.forEach(c=>{
      if(narrow){g+=T(0,y+12,esc(c[0]),{fs:12,w:600,fill:'var(--ink)'})+T(c[0].length*7+10,y+12,esc(c[1]),{fs:11,fill:'var(--mute)'});y+=16}
      else g+=T(0,y+14,esc(c[0]),{fs:12,w:600,fill:'var(--ink)'})+T(110,y+14,esc(c[1]),{fs:11,fill:'var(--mute)'});
      const x0=L,bw=w-x0-2;let x=x0;
      c[2].forEach(s=>{const sw=bw*s[1],k=s[0]==='k';g+='<rect x="'+x.toFixed(1)+'" y="'+(y+2)+'" width="'+(sw-1).toFixed(1)+'" height="18" rx="2" fill="'+(k?'var(--acc2)':'var(--soft)')+'" stroke="'+(k?'var(--acc)':'var(--mute)')+'"'+(k?'':' stroke-dasharray="3 2"')+'/>';
        const lab=s[2], fits=lab.length*6<sw-6;g+=T(x+4,y+15,esc(fits?lab:(sw>40?lab.slice(0,Math.max(3,Math.floor((sw-10)/6)))+'.':'')),{fs:11,fill:'var(--ink)'});x+=sw});
      y+=narrow?26:28});
    el.innerHTML=RD.svg(w,y,g,'History at compaction: summarised against kept verbatim, per harness');
  });

  // ---------- containment grid
  reg('rd-box-svg',(el,w)=>{
    const cols=['nothing local','git commits (undo only)','OS sandbox on'],rowsN=['allow, nobody asked','ask a human','deny without a flag'];
    const narrow=w<560,L=narrow?50:120,top=34,cw=(w-L)/3,ch=narrow?78:70;let g=defs;
    cols.forEach((c,i)=>{const x=L+i*cw;const words=narrow?c.split(' ').slice(0,2).join(' '):c;g+=T(x+cw/2,14,esc(words),{a:'middle',fs:11.5,w:600,fill:'var(--ink)'});if(narrow&&c.split(' ').length>2)g+=T(x+cw/2,27,esc(c.split(' ').slice(2).join(' ')),{a:'middle',fs:11,fill:'var(--mute)'})});
    const RS=narrow?[['allow','nobody'],['ask','a human'],['deny','no flag']]:[['allow','nobody asked'],['ask','a human'],['deny','without a flag']];
    rowsN.forEach((r,j)=>{const y=top+j*ch;g+=T(0,y+ch/2-2,RS[j][0],{fs:11.5,w:600,fill:'var(--ink)'})+T(0,y+ch/2+12,RS[j][1],{fs:11,fill:'var(--mute)'});
      cols.forEach((c,i)=>{g+=box(L+i*cw+2,y+2,cw-4,ch-4,{fill:i===2?'var(--acc2)':'var(--soft)',stroke:'var(--line)',rx:6})})});
    // chips: [name, col, row, slot, headless]
    const P=[['opencode',0,0,0],['OpenHands',0,0,1],['mini --yolo',0,0,2,1],['Gemini CLI',0,1,0],['mini-SWE',0,1,1],['gemini -p',0,2,0,1],['Aider',1,1,0],['--yes-always',1,2,0,1],['Codex',2,1,0],['codex exec',2,0,0,1]];
    const pos={};
    P.forEach(p=>{const cx=L+p[1]*cw+cw/2,cy=top+p[2]*ch+14+p[3]*20,tw=Math.min(cw-12,p[0].length*6.4+14);pos[p[0]]=[cx,cy];
      g+=box(cx-tw/2,cy-8,tw,17,{fill:p[4]?'var(--bg)':'var(--bg)',stroke:p[4]?'var(--mute)':'var(--acc)',dash:p[4],rx:8})+T(cx,cy+4,esc(p[0]),{a:'middle',fs:11,fill:'var(--ink)'})});
    const lk=[['Codex','codex exec'],['Gemini CLI','gemini -p'],['Aider','--yes-always'],['mini-SWE','mini --yolo']];
    lk.forEach(([a,b])=>{const A=pos[a],B=pos[b];const dy=B[1]>A[1]?1:-1;g+=arrow(A[0]+(a==='mini-SWE'?-cw*0.3:cw*0.32),A[1]+dy*9,B[0]+(a==='mini-SWE'?-cw*0.3:cw*0.32),B[1]-dy*9,'var(--mute)',1)});
    el.innerHTML=RD.svg(w,top+3*ch+4,g,'Containment defaults: what isolates a command against who approves it');
  });

  // ---------- where the loop runs
  reg('rd-where-svg',(el,w)=>{
    const C=[['Terminal',['loop','context policy','tools run','permissions','you review each edit'],['model']],
      ['Cloud agent',['you review the pull request'],['loop','context policy','tools run (container)','model']],
      ['Hosted loop',['permissions','your tools, if you host the sandbox','watch and approve'],['loop','context policy','model']]];
    const gap=8,cw=(w-2*gap)/3,narrow=cw<150,fs=narrow?11:11.5;let g='',maxy=0;
    const lines=(t,mw)=>{const out=[];let cur='';t.split(' ').forEach(wd=>{if((cur+' '+wd).trim().length*6.1>mw&&cur){out.push(cur);cur=wd}else cur=(cur+' '+wd).trim()});if(cur)out.push(cur);return out};
    const H1=150,H2=118;
    C.forEach((c,i)=>{const x=i*(cw+gap);g+=T(x+cw/2,13,c[0],{a:'middle',fs:12.5,w:600,fill:'var(--ink)'});
      g+=box(x,20,cw,H1,{fill:'var(--acc2)',stroke:'var(--acc)'})+T(x+6,34,'your side',{fs:11,fill:'var(--acc)'});
      g+=box(x,20+H1+6,cw,H2,{fill:'var(--soft)',stroke:'var(--line)'})+T(x+6,40+H1,'provider',{fs:11,fill:'var(--mute)'});
      let y=50;c[1].forEach(t=>lines(t,cw-14).forEach((l,k)=>{g+=T(x+7,y,(k?'  ':'• ')+esc(l),{fs,fill:'var(--ink)'});y+=14}));
      y=56+H1;c[2].forEach(t=>lines(t,cw-14).forEach((l,k)=>{g+=T(x+7,y,(k?'  ':'• ')+esc(l),{fs,fill:'var(--ink)'});y+=14}))});
    el.innerHTML=RD.svg(w,20+H1+6+H2+2,g,'Which harness parts run on your side for terminal, cloud agent and hosted loop');
  });

  // ---------- run cost bars
  reg('rd-runbars',(el,w)=>{
    const rows=D.runs,mx=Math.max(...rows.map(r=>r.totals.in));const narrow=w<560,L=narrow?0:230,RW=narrow?92:104;let g='',y=4;
    rows.forEach(r=>{const ok=r.tests_failed_after===0,c=ok?'var(--good)':(r.tests_failed_after===1?'var(--c5)':'var(--bad)');let gg='';
      if(narrow){gg+=T(0,y+12,esc(NAME(r)),{fs:11.5,fill:'var(--ink)'});y+=15}else gg+=T(0,y+13,esc(NAME(r)),{fs:11.5,fill:'var(--ink)'});
      const x0=L+(narrow?0:6),bw=w-x0-RW;gg+='<rect x="'+x0+'" y="'+(y+2)+'" width="'+bw+'" height="13" rx="3" fill="var(--soft)" stroke="var(--line)"/><rect x="'+x0+'" y="'+(y+2)+'" width="'+Math.max(2,bw*r.totals.in/mx).toFixed(1)+'" height="13" rx="2" fill="'+c+'"/>';
      gg+=T(w-2,y+13,fmt(r.totals.in)+', '+r.totals.calls+' calls',{a:'end',fs:11,fill:'var(--ink)'});
      g+='<g data-id="'+esc(r.id)+'">'+gg+'</g>';y+=narrow?20:21});
    el.innerHTML=RD.svg(w,y+2,g,'Prompt tokens per run, coloured by outcome');clickable(el);
  });
})();
// ---- Aider's repository map (section 5): real PageRank on mini-SWE-agent's source; three situations as a stepper, four budgets ----
(function(){
  const D=window.HM_DATA;if(!D||!document.getElementById('hm-card'))return;
  const $=id=>document.getElementById(id),esc=RD.esc,T=RD.t;
  const F=D.files.map(f=>f[0]),ORDER=['cold','chat','chat_ident'];
  const CAP={cold:'Step 1 of 3. Nothing in the chat and no message: PageRank restarts uniformly, so files whose names are used everywhere rank highest. utils/serialize.py leads.',
    chat:'Step 2 of 3. agents/default.py is added to the chat: it gets a restart weight of 100/59 = 1.69 and its outgoing edges are multiplied by 50, so the files it uses climb. It is now sent in full and left out of the map.',
    chat_ident:'Step 3 of 3. Same, plus the message "Make DockerEnvironment retry when docker exec times out": environments/docker.py and models/utils/retry.py get restart weight 3.39 each (name match plus path match), so both jump into the top three.'};
  let sc='cold',bud='1024',all=false;
  const shown=t=>{const s=new Set();t.split('\n').forEach(l=>{if(l.endsWith(':')&&!/^[\s│⋮]/.test(l))s.add(l.slice(0,-1))});return s};
  function draw(){
    const S=D.sc[sc],M=S.maps[bud],inMap=shown(M.text),chat=new Set(S.chat),el=$('hm-bars');
    const mx=Math.max(...ORDER.map(k=>Math.max(...D.sc[k].rank)));
    const idx=F.map((f,i)=>i).filter(i=>S.rank[i]>0).sort((a,b)=>S.rank[b]-S.rank[a]);
    const n=all?idx.length:Math.min(20,idx.length),w=RD.width(el),narrow=w<560,L=narrow?0:250,RW=48;let g='',y=2;
    idx.slice(0,n).forEach(i=>{const f=F[i],r=S.rank[i],c=chat.has(f)?'var(--c3)':(inMap.has(f)?'var(--acc)':'var(--dim)'),mv=S.mentioned.includes(f)||chat.has(f);
      if(narrow){g+=T(0,y+11,esc(f),{fs:11,fill:'var(--ink)',w:mv?600:null});y+=14}else g+=T(0,y+12,esc(f),{fs:11.5,fill:'var(--ink)',w:mv?600:null});
      const x0=L+(narrow?0:6),bw=w-x0-RW;g+='<rect x="'+x0+'" y="'+(y+2)+'" width="'+bw+'" height="11" rx="3" fill="var(--soft)"/><rect x="'+x0+'" y="'+(y+2)+'" width="'+Math.max(1,bw*r/mx).toFixed(1)+'" height="11" rx="2" fill="'+c+'"/>'+T(w-2,y+12,r.toFixed(3),{a:'end',fs:11,fill:'var(--ink)'});
      y+=narrow?17:17});
    el.innerHTML=RD.svg(w,y+2,g,'PageRank of files in the repository map');
    $('hm-all').textContent=all?'Show the top 20 only':'Show all '+idx.length+' ranked files';
    $('hm-text').textContent=M.text;
    $('hm-tok').textContent=' map is '+M.tokens.toLocaleString('en-US')+' tokens ('+M.chars.toLocaleString('en-US')+' characters), '+inMap.size+' files';
    $('hm-cap').textContent=CAP[sc];
  }
  RD.anim({card:'hm-card',ctl:'hm-anim',n:3,ms:2600,label:'Situation',draw:i=>{sc=ORDER[i];draw()}});
  $('hm-bud').addEventListener('change',e=>{bud=e.target.value;draw()});
  $('hm-all').addEventListener('click',()=>{all=!all;draw()});
  RD.onRender(draw);RD.onResize(draw);
})();
