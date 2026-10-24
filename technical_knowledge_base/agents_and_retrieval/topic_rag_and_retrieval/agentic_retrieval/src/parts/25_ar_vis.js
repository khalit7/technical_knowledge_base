// ---- Reading tab figures (SVG at the measured width): hero, loop staircase, formats, second-hop bars, budgets,
// methods at two sizes, evaluator AUROC, deep-research shape, accuracy against tokens read, lost in the middle by
// length, memory curation. All numbers come from window.AR (data/*.json via build_data.py); nothing is typed here.
(function(){
  const A=ARL.A, esc=ARL.esc, f3=ARL.f3, fi=ARL.fmtInt, T=RD.t;
  const $=id=>document.getElementById(id);
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  const R=A.out.res, P=A.pend;
  const st=s=>({f1:mean(R[s].f1),tok:mean(R[s].tok)});
  const pd=k=>({f1:P[k].f1,tok:P[k].tok});
  const line=(x1,y1,x2,y2,c,o)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(c||'var(--line)')+'"'+(o||'')+'/>';
  const dot=(x,y,r,c,tip,o)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+c+'"'+(o||'')+'>'+(tip?'<title>'+esc(tip)+'</title>':'')+'</circle>';
  const rect=(x,y,w,h,c,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" fill="'+c+'"'+(o||'')+'/>';
  const kfmt=v=>v>=1000?(v/1000)+'k':String(v);
  // horizontal bars; below 520 px the label sits above its bar
  function hbar(el,rows,o){if(!el)return;o=o||{};const W=RD.width(el),nar=W<520,lw=nar?0:Math.min(220,W*.36),vw=o.vw||70,rh=nar?34:24;
    const bw=W-lw-vw-8,H=rows.length*rh+4;let g='';
    rows.forEach((r,i)=>{const y=i*rh+(nar?14:4),w=bw*Math.max(0,Math.min(1,r.v/r.max));
      g+=T(nar?0:lw-6,nar?y-3:y+12,esc(r.nm),{a:nar?'start':'end',fill:r.hl?'var(--ink)':'var(--mute)',w:r.hl?600:null});
      g+=rect(lw,y+(nar?1:3),bw,12,'var(--soft)',' rx="3"')+rect(lw,y+(nar?1:3),w,12,r.col||'var(--acc)',' rx="3"');
      g+=T(lw+w+6,y+(nar?11:13),r.txt,{fill:'var(--ink)'})});
    el.innerHTML=RD.svg(W,H,g,o.label||'')}
  // log-x frame
  function logX(lo,hi,x0,x1){const a=Math.log10(lo),b=Math.log10(hi);return v=>x0+(x1-x0)*(Math.log10(v)-a)/(b-a)}

  // ---- hero: F1 against tokens for every strategy (1.7B) ----
  const CW={eng:'var(--acc)',prog:'var(--c5)',model:'var(--c2)',eval:'var(--c6)',none:'var(--c4)'};
  function hero(){const el=$('ar-hero');if(!el)return;const W=RD.width(el),nar=W<520,H=nar?300:330,ml=38,mr=10,mt=12,mb=34;
    const X=logX(200,10000,ml,W-mr),y0=.26,y1=.48,Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
    const rt=A.rt.policies.rule_cmp_to_react;
    const pts=[['top 2',st('single_k2'),'eng',7,4,'start'],['top 5',st('single_k5'),'eng',-7,-3,'end'],['top 10',st('single_k10'),'eng',7,11,'start'],
      ['FLARE',pd('flare'),'model',7,11,'start'],['IRCoT',pd('ircot'),'model',-7,-4,'end'],['ReAct',st('react'),'model',7,4,'start'],['Self-Ask',pd('selfask'),'model',7,4,'start'],
      ['decompose',st('decomp'),'prog',7,4,'start'],['CRAG-style',pd('crag'),'eval',-7,4,'end'],['router (rule)',{f1:rt.f1,tok:rt.tok},'eval',7,13,'start'],
      ['long context, 1.5k',st('longctx'),'none',0,-9,'middle'],['long context, 8k',st('longctx_tokens8000'),'none',-7,4,'end']];
    let g='';[.3,.35,.4,.45].forEach(v=>{g+=line(ml,Y(v),W-mr,Y(v))+T(ml-5,Y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'})});
    [300,1000,3000,10000].forEach(v=>{g+=line(X(v),mt,X(v),H-mb)+T(X(v),H-mb+14,kfmt(v),{a:'middle',fill:'var(--mute)'})});
    g+=T((ml+W-mr)/2,H-5,'tokens billed per question (log scale)',{a:'middle',fill:'var(--mute)'})+T(ml+4,mt+10,'F1',{fill:'var(--mute)'});
    pts.forEach(([nm,p,k,dx,dy,an])=>{const x=X(p.tok),y=Y(p.f1);g+=dot(x,y,5,CW[k],nm+': F1 '+f3(p.f1)+', '+fi(p.tok)+' tokens');
      g+=T(x+dx,y+dy,esc(nm),{a:an,fill:'var(--ink)'})});
    el.innerHTML=RD.svg(W,H,g,'F1 against tokens per question for twelve strategies')}

  // ---- staircase: each call re-reads everything before it ----
  const TB=A.tool.by_n;
  function stair(){const el=$('ar-stair');if(!el)return;const n=+$('ar-stairn').value;$('ar-stairv').textContent=n;
    const W=RD.width(el),H=210,ml=44,mr=8,mt=16,mb=28,top=SM+4*RM,Y=v=>mt+(H-mt-mb)*(1-v/top);
    const cols=5,gap=W<520?8:16,bw=Math.min(90,(W-ml-mr-gap*(cols+1))/cols);let g='';
    [0,500,1000,1500,2000].forEach(v=>{g+=line(ml,Y(v),W-mr,Y(v))+T(ml-5,Y(v)+4,fi(v),{a:'end',fill:'var(--mute)'})});
    let tot=0;for(let j=0;j<=n;j++){const x=ml+gap+j*(bw+gap),p=Math.round(SM+j*RM),old=j?SM+(j-1)*RM:0;tot+=p;
      g+=rect(x,Y(p),bw,Y(0)-Y(p),j?'var(--c2)':'var(--acc)',' rx="2"')+rect(x,Y(old),bw,Y(0)-Y(old),'var(--dim)');
      g+=T(x+bw/2,Y(p)-4,fi(p),{a:'middle',fill:'var(--ink)'})+T(x+bw/2,H-mb+14,j<n?'call '+(j+1):'answer',{a:'middle',fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,H,g,'prompt tokens of each model call');
    const b=TB[n],last=SM+n*RM;
    $('ar-stairout').innerHTML=RD.stat('Questions with n = '+n,b.q,'of 200, recorded')+RD.stat('Formula',fi(b.pred),'per-question s and r')+RD.stat('Billed',fi(b.billed),'recorded')+RD.stat('Computed',fi(b.prefilled),'prompt cache on')+
      RD.stat('Last call alone',fi(Math.round(last)),(last/(SM+RM)).toFixed(1)+' times the second call (mean s, r)')}
  const SM=A.tool.s_mean, RM=A.tool.r_mean;

  // ---- result formats and second-hop bars ----
  function fmt(){const F=A.tool.formats;hbar($('ar-fmt'),[['full paragraphs with titles (root)','full'],['as JSON objects','json'],['title + first sentence','first'],['titles only','titles']].map(([nm,k])=>({nm,v:F[k],max:F.json,txt:Math.round(F[k])+' tok',col:k==='full'?'var(--acc)':'var(--c6)',hl:k==='full'})),{label:'tokens per search result by format'})}
  function hops(){const H=A.hops.all;hbar($('ar-hopbars'),[['same question again','same'],['the 1.7B agent\'s 2nd query','agent'],['decomposition, 2nd sub-question','decomp'],['hop-1 sentence (IRCoT oracle)','sent'],['question + hop-1 sentence','q_sent'],['bridge entity\'s exact name','title']].map(([nm,k])=>({nm,v:H[k].top3/H[k].n,max:1,txt:H[k].top3+' / '+H[k].n,col:(k==='agent'||k==='decomp')?'var(--c2)':k==='same'?'var(--mute)':'var(--c3)',hl:k==='agent'})),{label:'second-hop recall by query'})}

  // ---- budgets ----
  function budget(){const el=$('ar-budget');if(!el)return;const W=RD.width(el),H=230,ml=40,mr=12,mt=12,mb=32;
    const X=v=>ml+(W-ml-mr)*v/3800,y0=.25,y1=.48,Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
    const B=[[1,pd('react_budget1')],[2,pd('react_budget2')],[3,pd('react_budget3')],[4,st('react')],[6,pd('react_budget6')]];
    let g='';[.3,.35,.4,.45].forEach(v=>{g+=line(ml,Y(v),W-mr,Y(v))+T(ml-5,Y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'})});
    [0,1000,2000,3000].forEach(v=>{g+=T(X(v),H-mb+14,fi(v),{a:'middle',fill:'var(--mute)'})});
    g+=T((ml+W-mr)/2,H-5,'tokens billed per question',{a:'middle',fill:'var(--mute)'});
    const pipe=st('single_k5');g+=line(ml,Y(pipe.f1),W-mr,Y(pipe.f1),'var(--acc)',' stroke-dasharray="4 3"')+T(W-mr-2,Y(pipe.f1)+14,'top-5 pipeline '+f3(pipe.f1),{a:'end',fill:'var(--acc)'});
    g+='<polyline fill="none" stroke="var(--c2)" stroke-width="1.5" points="'+B.map(([b,p])=>X(p.tok).toFixed(1)+','+Y(p.f1).toFixed(1)).join(' ')+'"/>';
    B.forEach(([b,p],i)=>{g+=dot(X(p.tok),Y(p.f1),4.5,'var(--c2)','budget '+b+': F1 '+f3(p.f1)+', '+fi(p.tok)+' tokens')+T(X(p.tok),Y(p.f1)-8,(i===0?'budget ':'')+b,{a:'middle',fill:'var(--ink)'})});
    [['1 result per search',pd('react_k1'),7,4,'start'],['5 results per search',pd('react_k5'),0,-9,'end']].forEach(([nm,p,dx,dy,an])=>{g+=dot(X(p.tok),Y(p.f1),4.5,'var(--bg)',nm,' stroke="var(--c2)" stroke-width="1.5"')+T(X(p.tok)+dx+(an==='end'?6:0),Y(p.f1)+dy,nm,{a:an,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,g,'ReAct F1 against tokens for search budgets 1 to 6')}

  // ---- methods at two model sizes ----
  function meth(){const el=$('ar-meth');if(!el)return;
    const F4=k=>A.f4[k];
    const rows=[['long context, own 10',st('longctx').f1,F4('longctx'),'var(--c4)'],['ReAct',st('react').f1,F4('react'),'var(--c2)'],['IRCoT + reader',P.ircot.f1,P.ircot_4b.f1,'var(--c2)'],
      ['FLARE',P.flare.f1,P.flare_4b.f1,'var(--c2)'],['pipeline, top 5',st('single_k5').f1,F4('single_k5'),'var(--acc)'],['decompose',st('decomp').f1,F4('decomp'),'var(--c5)'],
      ['long context, 8k',st('longctx_tokens8000').f1,F4('longctx_tokens8000'),'var(--c4)'],['CRAG-style',P.crag.f1,P.crag_4b.f1,'var(--c6)'],['Self-Ask',P.selfask.f1,P.selfask_4b.f1,'var(--c2)']];
    const W=RD.width(el),nar=W<520,lw=nar?0:150,rh=nar?36:26,mt=18,H=mt+rows.length*rh+22,x0=lw+8,x1=W-12,X=v=>x0+(x1-x0)*(v-.25)/(.62-.25);
    let g='';[.3,.4,.5,.6].forEach(v=>{g+=line(X(v),mt-4,X(v),H-20)+T(X(v),H-6,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
    g+=dot(x0+4,8,4,'var(--bg)','',' stroke="var(--ink)" stroke-width="1.5"')+T(x0+12,12,'Qwen3-1.7B',{fill:'var(--mute)'})+dot(x0+100,8,4,'var(--ink)')+T(x0+108,12,'Qwen3-4B',{fill:'var(--mute)'});
    rows.forEach(([nm,a,b,c],i)=>{const y=mt+i*rh+(nar?22:13);
      g+=T(nar?x0:lw,nar?y-10:y+4,esc(nm),{a:nar?'start':'end',fill:'var(--ink)'});
      g+=line(X(a),y,X(b),y,c,' stroke-width="2.5"')+dot(X(a),y,4.5,'var(--bg)',nm+' 1.7B: '+f3(a),' stroke="'+c+'" stroke-width="1.8"')+dot(X(b),y,4.5,c,nm+' 4B: '+f3(b));
      g+=T(nar?x1:X(b)+8,nar?y-10:y+4,f3(a)+' to '+f3(b),{a:nar?'end':'start',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,g,'F1 of nine methods with Qwen3-1.7B and Qwen3-4B')}

  // ---- evaluator signals ----
  function auroc(){const el=$('ar-auroc');if(!el)return;const U=A.rt.auroc;
    const rows=[['cross-encoder, best of top 5','ce1'],['cross-encoder, second best','ce2'],['bge-small top-1 cosine','s1'],['top-1 minus top-3 cosine','gap'],['BM25 and dense agree (of top 5)','ov'],['comparison word in the question','cue_cmp']];
    const W=RD.width(el),nar=W<520,lw=nar?0:200,rh=nar?36:26,mt=20,H=mt+rows.length*rh+22,x0=lw+8,x1=W-12,X=v=>x0+(x1-x0)*(v-.35)/(.75-.35);
    let g='';[.4,.5,.6,.7].forEach(v=>{g+=line(X(v),mt-4,X(v),H-20,v===.5?'var(--mute)':'var(--line)',v===.5?' stroke-dasharray="4 3"':'')+T(X(v),H-6,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
    g+=T(X(.5)+4,mt+2,'coin',{fill:'var(--mute)'});
    g+=dot(x0+4,8,4.5,'var(--c1)')+T(x0+12,12,'both gold in top 5',{fill:'var(--mute)'})+dot(x0+140,8,4.5,'var(--bg)','',' stroke="var(--c2)" stroke-width="1.8"')+T(x0+148,12,'answer right',{fill:'var(--mute)'});
    rows.forEach(([nm,k],i)=>{const y=mt+i*rh+(nar?22:13),u=U[k];
      g+=T(nar?x0:lw,nar?y-10:y+4,esc(nm),{a:nar?'start':'end',fill:k==='ce1'?'var(--ink)':'var(--mute)',w:k==='ce1'?600:null});
      g+=line(X(.35),y,X(.75),y,'var(--soft)');
      if(u.single_ok!=null)g+=dot(X(u.single_ok),y,4.5,'var(--bg)',nm+', answer right: '+u.single_ok.toFixed(2),' stroke="var(--c2)" stroke-width="1.8"');
      g+=dot(X(u.both5),y,5,'var(--c1)',nm+', both gold in top 5: '+u.both5.toFixed(2));
      if(k==='ce1')g+=T(X(u.both5)-8,y+4,u.both5.toFixed(2),{a:'end',fill:'var(--c1)',w:600})});
    el.innerHTML=RD.svg(W,H,g,'AUROC of six query-time signals')}

  // ---- deep-research shape (static, from open_deep_research's source) ----
  function dr(){const el=$('ar-dr');if(!el)return;const W=RD.width(el),nar=W<520,cx=W/2;
    const box=(x,y,w,h,l1,l2,c)=>rect(x,y,w,h,'var(--soft)',' rx="6" stroke="'+(c||'var(--line)')+'"')+T(x+w/2,y+(l2?16:h/2+4),l1,{a:'middle',fill:'var(--ink)',w:600})+(l2?T(x+w/2,y+31,l2,{a:'middle',fill:'var(--mute)'}):'');
    const arr=(x1,y1,x2,y2)=>line(x1,y1,x2,y2,'var(--mute)',' marker-end="url(#ar-drm)"');
    let g='<defs><marker id="ar-drm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    const bw=Math.min(300,W-20),bx=cx-bw/2;
    g+=box(bx,4,bw,40,'question','clarify, then write a research brief');
    g+=arr(cx,44,cx,60);
    g+=box(bx,60,bw,40,'lead (supervisor)','plans; up to 6 rounds of ConductResearch','var(--c2)');
    const n=3,gw=nar?6:14,cw=Math.min(180,(W-20-gw*(n-1))/n),x0=cx-(n*cw+(n-1)*gw)/2,y2=128;
    for(let i=0;i<n;i++){const x=x0+i*(cw+gw);g+=arr(cx,100,x+cw/2,y2);
      g+=rect(x,y2,cw,96,'var(--bg)',' rx="6" stroke="var(--c2)" stroke-dasharray="4 3"');
      g+=T(x+cw/2,y2+15,'researcher '+(i+1),{a:'middle',fill:'var(--ink)',w:600})+T(x+cw/2,y2+31,'own window',{a:'middle',fill:'var(--mute)'})+T(x+cw/2,y2+47,nar?'search, read':'search and read pages',{a:'middle',fill:'var(--mute)'})+T(x+cw/2,y2+63,'up to 10 calls',{a:'middle',fill:'var(--mute)'});
      g+=rect(x+4,y2+70,cw-8,20,'var(--c6)',' rx="4" opacity=".25"')+T(x+cw/2,y2+84,'compress',{a:'middle',fill:'var(--ink)'});
      g+=arr(x+cw/2,y2+96,cx,y2+124)}
    g+=box(bx,y2+124,bw,40,'lead sees compressed findings only','up to 5 researchers in parallel','var(--c2)');
    g+=arr(cx,y2+164,cx,y2+180);
    g+=box(bx,y2+180,bw,32,'report with citations','');
    el.innerHTML=RD.svg(W,y2+216,g,'deep research: lead, parallel researchers with their own windows, compression, report')}

  // ---- accuracy against tokens read ----
  function lcacc(){const AC=A.lc.acc,NM={single_k2:'pipeline, top 2',single_k5:'pipeline, top 5',single_k10:'pipeline, top 10',longctx:'long context, own 10',longctx_tokens8000:'long context, 8k tokens'};
    hbar($('ar-lcacc'),['single_k2','single_k5','single_k10','longctx','longctx_tokens8000'].map(s=>({nm:NM[s]+' ('+fi(AC[s].tok)+' tok)',v:AC[s].f1,max:.5,txt:f3(AC[s].f1),col:s.indexOf('long')===0?'var(--c4)':'var(--acc)',hl:s==='longctx'})),{label:'F1 against tokens read'})}

  // ---- lost in the middle by window length ----
  function lim(){const el=$('ar-lim');if(!el||!P.lim)return;const W=RD.width(el),H=250,ml=40,mr=14,mt=12,mb=34;
    const rel=['0.00','0.25','0.50','0.75','1.00'],X=i=>ml+(W-ml-mr)*i/4,y0=.3,y1=.68,Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
    const Ns=['5','10','40','80'],C={'5':'var(--c6)','10':'var(--c1)','40':'var(--c4)','80':'var(--c2)'};
    let g='';[.35,.45,.55,.65].forEach(v=>{g+=line(ml,Y(v),W-mr,Y(v))+T(ml-5,Y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'})});
    ['first','','middle','','last'].forEach((l,i)=>{if(l)g+=T(X(i),H-mb+14,l,{a:i===0?'start':i===4?'end':'middle',fill:'var(--mute)'})});
    g+=T((ml+W-mr)/2,H-5,'position of the gold block in the window',{a:'middle',fill:'var(--mute)'});
    Ns.forEach(N=>{const v=rel.map(r=>P.lim[N][r]);g+='<polyline fill="none" stroke="'+C[N]+'" stroke-width="'+(N==='80'?2.5:1.6)+'" points="'+v.map((y,i)=>X(i).toFixed(1)+','+Y(y).toFixed(1)).join(' ')+'"/>';
      v.forEach((y,i)=>{g+=dot(X(i),Y(y),3.2,C[N],N+' paragraphs, position '+rel[i]+': F1 '+f3(y))});
      g+=T(X(2)+6,Y(v[2])-6,N+(N==='80'?' paragraphs':''),{fill:C[N],w:600})});
    el.innerHTML=RD.svg(W,H,g,'F1 by gold position for four window lengths')}

  // ---- memory curation ----
  function mem(){const el=$('ar-mem');if(!el)return;const C=A.cur,W=RD.width(el),H=250,ml=40,mr=14,mt=26,mb=34;
    const X=v=>ml+(W-ml-mr)*v/950,Y=v=>mt+(H-mt-mb)*(1-v/C.n);
    let g='';[0,25,50,75,C.n].forEach(v=>{g+=line(ml,Y(v),W-mr,Y(v))+T(ml-5,Y(v)+4,v,{a:'end',fill:'var(--mute)'})});
    [0,250,500,750].forEach(v=>{g+=T(X(v),H-mb+14,v,{a:'middle',fill:'var(--mute)'})});
    g+=T((ml+W-mr)/2,H-5,'paragraph tokens kept for the final step',{a:'middle',fill:'var(--mute)'})+T(ml+4,mt-14,'both gold kept (of '+C.n+')',{fill:'var(--mute)'});
    const q=[[C.tok_top2,C.top2_q],[C.tok_top3,C.top3_q],[C.tok_top4,C.top4_q]],qt=[[C.tok_top2_qt,C.top2_qt],[C.tok_top3_qt,C.top3_qt],[C.tok_top4_qt,C.top4_qt]];
    const pl=(a,c,d)=>'<polyline fill="none" stroke="'+c+'" stroke-width="1.6"'+(d||'')+' points="'+a.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
    g+=pl(q,'var(--acc)',' stroke-dasharray="4 3"')+pl(qt,'var(--c2)');
    q.forEach((p,i)=>{g+=dot(X(p[0]),Y(p[1]),4,'var(--acc)','top '+(i+2)+' by question: '+p[1]+' of '+C.n)+T(X(p[0]),Y(p[1])+15,'top '+(i+2),{a:'middle',fill:'var(--mute)'})});
    qt.forEach((p,i)=>{g+=dot(X(p[0]),Y(p[1]),4.5,'var(--c2)','top '+(i+2)+' by question + last thought: '+p[1]+' of '+C.n)});
    g+=T(X(qt[2][0])+7,Y(qt[2][1])+2,'+ last thought',{fill:'var(--c2)',w:600})+T(X(q[2][0])+8,Y(q[2][1])+4,'question only',{fill:'var(--acc)'});
    g+=dot(X(C.tok_all),Y(C.keep_all),5,'var(--mute)','everything read')+T(X(C.tok_all)+6,Y(C.keep_all)-9,'everything read',{a:'end',fill:'var(--ink)'});
    g+=dot(X(C.tok_last),Y(C.last_obs),5,'var(--bad)','last observation only')+T(X(C.tok_last)+8,Y(C.last_obs)-4,(W<520?'last observation only':'last observation only (sliding window)'),{fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,H,g,'both gold paragraphs kept against tokens for memory policies')}

  const all=()=>{hero();stair();fmt();hops();budget();meth();auroc();dr();lcacc();lim();mem()};
  const sn=$('ar-stairn');if(sn)sn.addEventListener('input',stair);
  RD.onRender(all);RD.onResize(all);
})();
