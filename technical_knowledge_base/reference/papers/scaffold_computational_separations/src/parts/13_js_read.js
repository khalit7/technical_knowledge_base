// ---- The paper tab: hero graph, the complexity ladder and the rebuilt figures beside the text ----
(function(){if(!$('t-read')||!window.PAPER)return;const T=PAPER.tables;
  const ID='var(--c1)',OOD='var(--c4)',TE='var(--c2)',ST='var(--c1)',BA='var(--mute)';
  // hero: the lab's engine on a fixed graph, every BFS round shown, reader with 2 layers
  const hg=GR.graph(10,'local',13),hb=GR.bfs(hg),hr=GR.reader(hg,2);
  $('hero-r').textContent=hb.dist;$('hero-c').textContent=hb.calls;$('hero-d').textContent=hb.dist;
  window.HERO={dist:hb.dist,calls:hb.calls,rounds:hb.rounds.length,reader2:hr.yes,reader3:GR.reader(hg,3).yes};
  fit($('heroSvg'),w=>{$('heroSvg').innerHTML=drawGraph(w,hg,{round:hb.rounds.length,bfs:hb,seen:hr.seen},'hero')});
  // Figure 1, one setting at a time
  let f1=0;
  function drawF1(w){const S=T.fig1.settings[f1],cats=S.rows.map(r=>r.arm);
    $('f1Svg').innerHTML=groupH(w,cats,[{n:'ID',c:ID,v:S.rows.map(r=>r.id)},{n:'OOD',c:OOD,v:S.rows.map(r=>r.ood)}],{max:1,ticks:[0,0.25,0.5,0.75,1],tfmt:v=>String(v),hl:3,label:'Figure 1 '+S.setting});
    $('f1Cap').innerHTML='Figure 1 ('+S.setting+'), printed bar labels; teacher decoded from the dashed lines of the vector PDF. 0.68M-parameter transformers throughout; '+(f1===0?'Dyck test size is not stated.':'300 held-out puzzles per split, so each value has a standard error of about 0.03.')}
  segBind('f1M',m=>{f1=+m;$('f1M').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.classList.contains('on')?'true':'false'));refit($('f1Svg'))});
  fit($('f1Svg'),drawF1);
  // Figure 2b
  fit($('f2bSvg'),w=>{const f=T.fig2b;$('f2bSvg').innerHTML=groupH(w,f.params_M.map(p=>p.toFixed(2)+'M'+(p===0.68?' (teacher size)':'')),[{n:'student ID',c:ID,v:f.id},{n:'student OOD',c:OOD,v:f.ood}],
    {max:1,min:0.5,ticks:[0.5,0.75,1],tfmt:v=>String(v),rh:12,hl:f.params_M.indexOf(0.68),refs:[{v:f.teacher,c:TE,n:'teacher (ID and OOD)'}],fmt:v=>v.toFixed(2),label:'Figure 2b'})});
  // Figure 3b, drawn when the prediction is revealed
  PRED_REVEAL['pr-cot']=()=>fit($('f3Svg'),w=>{const f=T.fig3;$('f3Svg').innerHTML=groupH(w,f.L.map(L=>'L = '+L+(L===18?' (2 left)':L===19?' (1 left)':'')),[{n:'greedy, no scaffold',c:ST,v:f.greedy},{n:'+ scaffold (K = 16, oracle)',c:TE,v:f.scaffold}],
    {max:100,ticks:[0,25,50,75,100],tfmt:v=>v+'%',fmt:v=>v.toFixed(0)+'%',rh:12,hl:4,label:'Figure 3b'})});
  // complexity ladder (static)
  fit($('ladSvg'),w=>{const C=[['AC⁰','edge lookup E(u,v)','var(--c3)'],['TC⁰','fixed-depth transformer, log-length CoT','var(--c1)'],['L','',null],['NL','STCON (complete)','var(--c2)'],['P','BFS harness: N² lookups','var(--c4)']];
    const narrow=w<560,bw=narrow?(w-8)/5:Math.min(150,(w-8)/5),gap=0,H=narrow?150:120;let s='';
    C.forEach((c,i)=>{const x=4+i*(bw+gap),y=8;s+=rc(x+2,y,bw-4,34,'var(--soft)',{s:c[2]||'var(--line)',sw:c[2]?2:1});s+=tx(x+bw/2,y+22,c[0],{fs:14,a:'middle',w:'700'});
      if(i<4)s+=tx(x+bw,y+22,'⊆',{fs:13,a:'middle',c:'var(--mute)'});
      if(c[1]){const words=c[1].split(' '),lines=[];let cur='';const maxc=Math.max(6,Math.floor(bw/6.3));words.forEach(t=>{if((cur+' '+t).trim().length>maxc){lines.push(cur.trim());cur=t}else cur+=' '+t});lines.push(cur.trim());
        lines.forEach((l,j)=>{s+=tx(x+bw/2,y+58+j*14,l,{fs:11,a:'middle',c:c[2]})})}});

    $('ladSvg').innerHTML=svgW(w,H,s,'complexity classes')});
  // Figure 5a, on reveal
  PRED_REVEAL['pr-tree']=()=>fit($('f5Svg'),w=>{const f=T.fig5a;$('f5Svg').innerHTML=groupH(w,['base model'].concat(f.shapes.map((s,i)=>s+', '+f.calls[i]+' calls')),
    [{n:'teacher (multi-call)',c:TE,v:[undefined].concat(f.teacher)},{n:'student (one pass)',c:ST,v:[f.base].concat(f.student)}],{max:46,min:20,ticks:[20,30,40],tfmt:v=>v+'%',fmt:v=>v.toFixed(1),rh:12,refs:[{v:f.base,c:BA,n:'base model 28.0'}],label:'Figure 5a'})});
  // Figure 13c: gains with intervals
  fit($('f13cSvg'),w=>{const q=T.fig13.qed,lw=Math.min(130,w*0.3),pr=18,X=v=>lw+(w-lw-pr)*(v+10)/30,rh=26,top=14;let s='';
    [-10,-5,0,5,10,15,20].forEach(v=>{s+=ln2(X(v),top-4,X(v),top+q.shapes.length*rh+4,v===0?'var(--mute)':'var(--line)',{sw:1})+tx(X(v),top+q.shapes.length*rh+18,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'middle',c:'var(--mute)'})});
    q.shapes.forEach((sh,i)=>{const y=top+i*rh+13,c=q.fits[i]?'var(--c1)':'var(--c2)';s+=tx(lw-6,y+4,sh+', '+q.calls[i]+' calls',{fs:11.5,a:'end',c:'var(--mute)'});
      s+=ln2(X(q.lo[i]),y,X(q.hi[i]),y,c,{sw:2});s+=ln2(X(q.lo[i]),y-5,X(q.lo[i]),y+5,c,{sw:1.5})+ln2(X(q.hi[i]),y-5,X(q.hi[i]),y+5,c,{sw:1.5});
      s+=dotS(X(q.gain[i]),y,4,c,{t:sh+': '+q.gain[i]+' ['+q.lo[i]+', '+q.hi[i]+']'});s+=tx(X(q.gain[i]),y-7,(q.gain[i]>0?'+':'−')+Math.abs(q.gain[i]).toFixed(1),{fs:11,a:'middle',c:'var(--ink)'})});
    const H=top+q.shapes.length*rh+24;s+=tx((lw+w-pr)/2,H+12,'gain over one call (points)',{fs:11,a:'middle',c:'var(--mute)'});
    $('f13cSvg').innerHTML=svgW(w,H+18,s,'Figure 13c')});
})();
