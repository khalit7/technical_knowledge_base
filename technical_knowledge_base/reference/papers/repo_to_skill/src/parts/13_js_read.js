// ---- The paper tab: graph view, library bars, predict reveals, results charts ----
const RCV=PAPER.rc.v, TB=PAPER.tables;
const kb=b=>b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':b+' B';
const READ=new Set(LIB.reads.filter(r=>r[3]).map(r=>r[1].replace('repositories/repo-skills/','')));

// vLLM / SGLang skill graph, every file to scale
(function(){let g='vllm';
  function draw(w){const files=LIB.detail[g],rows={};
    files.forEach(([p,b])=>{const m=p.match(/^sub-skills\/([^/]+)\//);const k=m?m[1]:'(entry)';(rows[k]=rows[k]||[]).push([p,b])});
    const keys=Object.keys(rows).sort((a,b)=>a==='(entry)'?-1:b==='(entry)'?1:a.localeCompare(b));
    const tot=k=>rows[k].reduce((a,x)=>a+x[1],0),mx=Math.max(...keys.map(tot));
    const narrow=w<560,lw=narrow?0:190,x0=lw,bw=w-x0-4,sc=bw/mx,rh=narrow?44:30;let y=4,s='';
    keys.forEach(k=>{const r=rows[k].sort((a,b)=>(b[0].endsWith('SKILL.md')?1:0)-(a[0].endsWith('SKILL.md')?1:0));
      const nr=r.filter(x=>READ.has(g+'/'+x[0])).length;
      const lab=(k==='(entry)'?'entry skill':k)+' · '+kb(tot(k))+(nr?' · read '+nr:'');
      if(narrow){s+=tx(0,y+12,lab,{fs:12});y+=16}else s+=tx(0,y+17,lab,{fs:12});
      let x=x0;r.forEach(([p,b])=>{const ww=Math.max(1.5,b*sc),rd=READ.has(g+'/'+p);
        const col=p.endsWith('SKILL.md')?'var(--c1)':/\/scripts\/|^scripts\//.test(p)?'var(--c3)':'var(--c2)';
        s+='<g><title>'+p+' ('+b.toLocaleString('en-GB')+' bytes)'+(rd?', read in the session':'')+'</title>'+rc(x,y+4,Math.max(1,ww-1),18,col,{r:2,op:rd?1:.35,s:rd?'var(--ink)':null,sw:1.5})+'</g>';x+=ww});
      y+=narrow?28:rh});
    const L=legend([['SKILL.md','var(--c1)'],['references','var(--c2)'],['scripts','var(--c3)']],0,y+12,w);
    s+=L.s;y+=L.h+4;
    $('gvSvg').innerHTML=svgW(w,y,s,g+' skill graph files to scale');
    const all=files.reduce((a,x)=>a+x[1],0),rd=files.filter(x=>READ.has(g+'/'+x[0])),rdb=rd.reduce((a,x)=>a+x[1],0);
    $('gvNote').innerHTML=files.length+' files, '+all.toLocaleString('en-GB')+' bytes in all; the session read '+rd.length+' of them ('+rdb.toLocaleString('en-GB')+' bytes, '+(100*rdb/all).toFixed(1)+'%). Solid blocks with an outline were read; faint ones were never opened. Each row is one skill; one row per sub-skill. Width is bytes, on one scale for all rows.'}
  segBind('gvM',m=>{g=m;refit($('gvSvg'))});fit($('gvSvg'),draw)})();

// Library: memberships per area, families as segments
(function(){const A=LIB.areas.map(a=>({n:a.n,f:a.f,t:a.f.reduce((s,f)=>s+f.m.length,0)})).sort((a,b)=>b.t-a.t),mx=A[0].t;
  function show(i){const a=A[i];$('libOut').innerHTML='<b>'+a.n+'</b>: '+a.t+' memberships in '+a.f.length+' families.<ul class="tight">'+a.f.slice().sort((x,y)=>y.m.length-x.m.length).map(f=>'<li><b>'+f.n+'</b> ('+f.m.length+'): '+f.s+'</li>').join('')+'</ul>'}
  function draw(w){const narrow=w<560,lw=narrow?0:210,bw=w-lw-50,rh=narrow?36:22;let y=2,s='';
    A.forEach((a,i)=>{if(narrow){s+=tx(0,y+12,a.n,{fs:12});y+=14}else s+=tx(lw-6,y+15,a.n,{fs:12,a:'end'});
      let x=lw;a.f.slice().sort((p,q)=>q.m.length-p.m.length).forEach((f,j)=>{const ww=f.m.length/mx*bw;s+='<g><title>'+f.n+': '+f.m.length+'</title>'+rc(x,y+3,Math.max(.5,ww-.6),16,j%2?'var(--c1)':'var(--c2)',{r:1,op:.85})+'</g>';x+=ww});
      s+=tx(x+4,y+15,a.t,{fs:12,c:'var(--mute)'});
      s+='<rect x="0" y="'+y+'" width="'+w+'" height="'+(narrow?22:rh)+'" fill="transparent" style="cursor:pointer" data-i="'+i+'"/>';y+=narrow?24:rh});
    const h=$('libPlot');h.innerHTML=svgW(w,y+4,s,'Repository memberships per area');
    h.querySelectorAll('rect[data-i]').forEach(r=>r.addEventListener('click',()=>show(+r.dataset.i)))}
  fit($('libPlot'),draw);show(A.findIndex(a=>a.n==='Model Deployment and Optimization'))})();

PRED_REVEAL.pr3=function(){const S=RCV.session,M=RCV.meta;
  $('pr3Out').innerHTML='<b>'+S.reads+' files, '+S.read_bytes.toLocaleString('en-GB')+' bytes: '+S.share_library+'% of the '+M.library_bytes.toLocaleString('en-GB')+'-byte library</b>, all within the first '+S.last_read_s+' seconds of a '+(S.seconds/3600).toFixed(1)+'-hour session ('+S.share_time+'% of its time). It then made '+S.tool_calls+' tool calls in all without opening another skill file. Loading the vLLM and SGLang graphs whole would have been '+S.two_graphs_bytes.toLocaleString('en-GB')+' bytes; listing the 1,000 repository descriptions up front, '+S.desc_chars.toLocaleString('en-GB')+' characters.'};

PRED_REVEAL.pr1=function(){const r=[['MLE-bench','75 graphs, one per competition; descriptive, no scripts','web search plus diagnostic trials on that competition (its web page blocked)','up to 24 GPU-hours per competition','no'],
  ['PaperBench','a pool per target paper: modules from up to 10 related-work papers (636 skills from 153 papers)','prior papers and their code; the target and its code excluded','module tests and recovery experiments; not quantified','yes (636 SKILL.md)'],
  ['FrontierCS','one recovery graph for all 188 tasks (9 nodes, 42 links)','two human-written guides and the workspace prompt, refined by paired trials on development problems','not quantified','yes'],
  ['PassNet','one benchmark-level graph','paired trials on 50 training instances, then a screened pass over 4,000+ training instances','about a day per pass, plus trials','yes'],
  ['(the repository library)','1,000 graphs, 5,353 skills','repository source, docs, tests, scripts, config','about $40 per repository','yes; not used in any of the four results']];
  $('srcTab').innerHTML='<tr><th>Benchmark</th><th>Skills used</th><th>Built from</th><th>Construction, not counted</th><th>Released</th></tr>'+r.map(x=>'<tr>'+x.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')};

// Table 1 chart
(function(){let col=3;const rows=TB.t1.rows;
  function draw(w){const R=rows.map(r=>({n:r.agent.replace(/ \(.*\)/,''),b:r.backbone,m:r.v[col][0],e:r.v[col][1],cx:r.agent.startsWith('Codex')})).sort((a,b)=>b.m-a.m);
    const narrow=w<560,lw=narrow?0:230,bw=w-lw-60,sc=bw/100,rh=narrow?38:24;let y=4,s='';
    R.forEach(r=>{const lab=r.n+' · '+r.b;if(narrow){s+=tx(0,y+12,lab,{fs:12,w:r.cx?'700':'400'});y+=15}else s+=tx(lw-6,y+15,lab,{fs:12,a:'end',w:r.cx?'700':'400'});
      const col_=r.n==='Codex + AREX-Skill'?'var(--c1)':r.n==='Codex'?'var(--c2)':'var(--mute)';
      s+=rc(lw,y+4,r.m*sc,15,col_,{op:r.cx?1:.45,r:2})+ln2(lw+(r.m-r.e)*sc,y+11.5,lw+(r.m+r.e)*sc,y+11.5,'var(--ink)',{sw:1.5})+tx(lw+(r.m+r.e)*sc+5,y+16,r.m.toFixed(2),{fs:12});y+=narrow?23:rh});
    [0,25,50,75,100].forEach(v=>{s+=ln2(lw+v*sc,y,lw+v*sc,y+4,'var(--mute)')+tx(lw+v*sc,y+16,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    $('t1Plot').innerHTML=svgW(w,y+22,s,'MLE-bench Any Medal')}
  segBind('t1M',m=>{col=+m;refit($('t1Plot'))});fit($('t1Plot'),draw)})();

// Table 2 dumbbells
(function(){let mode='d';
  function draw(w){const R=TB.t2.rows.slice().sort(mode==='d'?(a,b)=>b.delta-a.delta:mode==='b'?(a,b)=>a.base-b.base:(a,b)=>a.paper.localeCompare(b.paper));
    const narrow=w<560,lw=narrow?0:200,bw=w-lw-60,sc=bw/70,rh=narrow?36:22;let y=4,s='';
    R.forEach(r=>{const lab=r.paper+'  '+(r.delta>0?'+':'')+r.delta.toFixed(2);const neg=r.delta<0;
      if(narrow){s+=tx(0,y+12,lab,{fs:12,c:neg?'var(--bad)':'var(--ink)'});y+=14}else s+=tx(lw-6,y+15,lab,{fs:12,a:'end',c:neg?'var(--bad)':'var(--ink)'});
      const a=lw+r.base*sc,b=lw+r.skill*sc;s+='<g><title>'+r.paper+' ('+r.topic+'): '+r.base.toFixed(2)+' to '+r.skill.toFixed(2)+'</title>'+ln2(a,y+11,b,y+11,neg?'var(--bad)':'var(--c1)',{sw:2.5})+'<circle cx="'+a+'" cy="'+(y+11)+'" r="4.5" fill="var(--bg)" stroke="var(--c2)" stroke-width="2"/><circle cx="'+b+'" cy="'+(y+11)+'" r="4.5" fill="var(--c1)"/></g>';y+=narrow?22:rh});
    [0,10,20,30,40,50,60,70].forEach(v=>{s+=ln2(lw+v*sc,y,lw+v*sc,y+4,'var(--mute)')+tx(lw+v*sc,y+16,v,{fs:11,a:'middle',c:'var(--mute)'})});
    const L=legend([['without skills (open)','var(--c2)'],['with skills (filled)','var(--c1)']],0,y+34,w);
    $('t2Plot').innerHTML=svgW(w,y+34+L.h,s+L.s,'PaperBench per paper')}
  segBind('t2M',m=>{mode=m;refit($('t2Plot'))});fit($('t2Plot'),draw)})();

// Table 3 scatter, revealed by pr2
PRED_REVEAL.pr2=function(){fit($('t3Plot'),w=>{const R=TB.t3.rows,H=300,pl=44,pr=16,pt=14,pb=40;
  const f=logFrame({W:w,H,pl,pr,pt,pb,x:[1.5,20],y:[50,85],xlin:false,yt:[],xt:[[2,'2M'],[5,'5M'],[10,'10M'],[20,'20M']],xl:'mean tokens per task (log)'});
  const ly=v=>pt+(H-pt-pb)*(1-(v-50)/35);let s=f.s;[50,60,70,80].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
  s+=tx(12,(pt+H-pb)/2,'score',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
  const pts=R.map(r=>({x:f.lx(r.tokens_m),y:ly(r.score),t:(r.agent==='Codex + AREX-Skill'?'Codex + skills':r.agent+' ('+r.backbone+')')+' '+r.score,c:r.agent.startsWith('Codex')?(r.agent==='Codex'?'var(--c2)':'var(--c1)'):'var(--mute)'}));
  const a=pts[3],b=pts[4];s+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="var(--c1)" stroke-width="1.5" stroke-dasharray="4 3"/>';
  pts.forEach(p=>{s+='<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="'+p.c+'"/>'});
  placeLabels(pts,w,H).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
  $('t3Plot').innerHTML=svgW(w,H,s,'FrontierCS score against tokens')})};

// Table 4 bars
(function(){const R=TB.t4.rows,lab=['Eager','TorchInductor','Codex','Codex + skills'],cols=['var(--mute)','var(--c3)','var(--c2)','var(--c1)'];
  const M=[['AS Score','as',x=>x.toFixed(3),2],['G-Mean Speedup','gm',x=>x.toFixed(3),2],['Correctness (%)','corr',x=>x.toFixed(2),100],['Fast_1 (%)','fast1',x=>x.toFixed(2),100]];
  function draw(w){const narrow=w<560,lw=narrow?100:130,bw=w-lw-60;let y=4,s='';
    M.forEach(([n,k,fm,mx])=>{s+=tx(0,y+13,n,{fs:12,w:'700'});y+=18;
      R.forEach((r,i)=>{s+=tx(lw-6,y+13,lab[i],{fs:12,a:'end'})+rc(lw,y+2,r[k]/mx*bw,14,cols[i],{r:2})+tx(lw+r[k]/mx*bw+5,y+13,fm(r[k]),{fs:12});y+=19});y+=8});
    s+=tx(0,y+10,'Failed samples: Codex '+R[2].failed+', Codex + skills '+R[3].failed+' (of 200).',{fs:12,c:'var(--mute)'});
    $('t4Plot').innerHTML=svgW(w,y+18,s,'PassNet metrics')}
  fit($('t4Plot'),draw)})();
