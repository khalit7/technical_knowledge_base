// ---- Reading figures, drawn as SVG at the measured width and redrawn on resize: run endings, first-request anatomy, compaction,
// run cost bars, Aider's repository map (a stepper). The hero, the matcher ladders, containment and where the loop runs are 3D stages (40_js_sc_*.js) since 2026-11-06 ----
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
  // the three situations are explained by the step list ol#sx-hm on the left (one item each)
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
  }
  RD.anim({card:'hm-card',ctl:'hm-anim',n:3,ms:5200,label:'Situation',list:'sx-hm',draw:i=>{sc=ORDER[i];draw()}});
  $('hm-bud').addEventListener('change',e=>{bud=e.target.value;draw()});
  $('hm-all').addEventListener('click',()=>{all=!all;draw()});
  RD.onRender(draw);RD.onResize(draw);
})();
