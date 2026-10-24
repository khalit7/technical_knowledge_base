// ---- Filter lab (inline in Reading): measured filtered search (data/results.json: filter, acorn, qdrant) ----
(function(){
  const R=window.VIX&&window.VIX.r;if(!R||!R.filter)return;
  const F=R.filter,A=R.acorn||{},Qd=R.qdrant||{rows:[]};
  const $=id=>document.getElementById(id),esc=RD.esc;
  const STR=[['pre-filter + exact','var(--ink)'],['post-filter','var(--c2)'],['in-graph (hnswlib rule)','var(--c1)'],['FAISS HNSW + IDSelector','var(--c5)'],['ACORN-1 (unpruned graph)','var(--c3)'],['ACORN-1-style','var(--c4)']];
  const NAME={'ACORN-1-style':'two-hop on the pruned graph','pre-filter + exact':'pre-filter + exact','post-filter':'post-filter (k′ = 10 to 1,000)','in-graph (hnswlib rule)':'hnswlib in-graph filter','FAISS HNSW + IDSelector':'FAISS HNSW + IDSelector','ACORN-1 (unpruned graph)':'ACORN-1 (unpruned graph)'};
  const COL=Object.fromEntries(STR);
  const SEL=F.all4.selectivity.map(x=>x.s);
  const st={sc:'rand',i:0};
  function scenario(){
    if(st.sc==='rand'){const s=F.all4.selectivity[st.i];const a=(A.all4&&A.all4.selectivity||[]).find(x=>x.s===s.s);return {rows:s.rows.concat(a?a.rows:[]),n:F.all4.n,label:'random attribute keeping '+(s.s*100)+'% ('+s.rows_kept.toLocaleString('en-US')+' of '+F.all4.n.toLocaleString('en-US')+' vectors), 400 queries',s:s.s}}
    const m={q_own:['qasper','own',F.qasper.n,'own paper (about '+(F.qasper.own_share*100).toFixed(2)+'% of chunks, correlated with the question), 892 questions'],
      q_other:['qasper','other',F.qasper.n,'another paper of the same size (uncorrelated), 892 questions'],
      s_own:['all4','source_own',F.all4.n,'the query\'s own collection (about '+(F.all4.source_own_share*100).toFixed(0)+'% of vectors, correlated), 400 queries'],
      s_other:['all4','source_other',F.all4.n,'the next collection, not the query\'s (about '+(F.all4.source_other_share*100).toFixed(0)+'%, anti-correlated), 400 queries']}[st.sc];
    const ac=(A[m[0]]&&A[m[0]][m[1]])||[];return {rows:F[m[0]][m[1]].concat(ac),n:m[2],label:m[3]}}
  function draw(i){if(st.sc==='rand')st.i=i;const S=scenario();const W=Math.max(280,Math.min(RD.width($('vix-l-plot')),820)),H=Math.round(Math.min(420,W*0.6));const L=44,Rm=10,T=10,Bm=34;
    const nds=S.rows.map(r=>Math.max(1,r.ndis));const x0=0,x1=Math.log10(Math.max(S.n*1.1,...nds));
    const X=v=>L+(Math.log10(Math.max(1,v))-x0)/(x1-x0)*(W-L-Rm),Y=v=>T+(1-v)*(H-T-Bm);let s='';
    for(let e=0;e<=Math.floor(x1);e++){const x=X(Math.pow(10,e));s+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(x,H-Bm+14,e>=3?(Math.pow(10,e)/1000)+'k':String(Math.pow(10,e)),{a:'middle',fs:10,fill:'var(--mute)'})}
    [0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+L+'" y1="'+Y(v)+'" x2="'+(W-Rm)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+3,v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})});
    const xn=X(S.n);s+='<line x1="'+xn+'" y1="'+T+'" x2="'+xn+'" y2="'+(H-Bm)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'+RD.t(xn-3,T+10,'exact search over all',{a:'end',fs:10,fill:'var(--bad)'});
    s+=RD.t((L+W)/2,H-4,'distance computations per query (log)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(L+4,T+10,'recall@10',{fs:11,fill:'var(--mute)'});
    STR.forEach(([k,c])=>{const g=S.rows.filter(r=>r.strategy===k).sort((a,b)=>a.ndis-b.ndis);if(!g.length)return;
      if(g.length>1)s+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+g.map(r=>X(r.ndis).toFixed(1)+','+Y(r.recall10).toFixed(1)).join(' ')+'"/>';
      g.forEach(r=>{s+='<circle cx="'+X(r.ndis).toFixed(1)+'" cy="'+Y(r.recall10).toFixed(1)+'" r="'+(k.startsWith('pre')?6:3.5)+'" fill="'+c+'"><title>'+esc(NAME[k]+' '+r.setting+': recall '+r.recall10.toFixed(3)+', '+Math.round(r.ndis)+' distances')+'</title></circle>'})});
    $('vix-l-plot').innerHTML=RD.svg(W,H,s,'Recall against work per query under a filter');
    $('vix-l-leg').innerHTML=STR.filter(([k])=>S.rows.some(r=>r.strategy===k)).map(([k,c])=>'<span><i style="background:'+c+'"></i>'+esc(NAME[k])+'</span>').join('');
    const pre=S.rows.find(r=>r.strategy.startsWith('pre'));const ig=S.rows.filter(r=>r.strategy==='in-graph (hnswlib rule)').find(r=>r.recall10>=0.99);
    const post=S.rows.filter(r=>r.strategy==='post-filter').find(r=>r.setting==="k'=100");
    $('vix-l-cap').innerHTML='<b>Filter:</b> '+esc(S.label)+'. Pre-filtering computes '+Math.round(pre.ndis).toLocaleString('en-US')+' distances and is exact; '+(ig?'hnswlib\'s in-graph filter reaches 0.99 at '+Math.round(ig.ndis).toLocaleString('en-US')+' ('+ig.setting+')':'hnswlib\'s in-graph filter never reaches 0.99 here')+'; post-filtering 100 neighbours keeps '+(post?post.recall10.toFixed(2):'?')+' recall'+(post&&post.empty!==undefined?' and returns nothing for '+post.empty+' queries':'')+'.'+(st.sc==='rand'&&ig&&ig.ndis<pre.ndis?' <b>Here walking the graph is cheaper than pre-filtering.</b>':'');
    $('vix-l-tab').innerHTML='<details class="mist"><summary>Every setting ('+S.rows.length+' rows)</summary><div class="b" style="padding-left:8px"><table><tr><th>Strategy</th><th>setting</th><th class="num">recall@10</th><th class="num">distances</th><th class="num">results returned</th></tr>'+S.rows.map(r=>'<tr><td><span style="color:'+COL[r.strategy]+'">&#9632;</span> '+esc(NAME[r.strategy]||r.strategy)+'</td><td>'+esc(r.setting.replace("k'","k′"))+'</td><td class="num">'+r.recall10.toFixed(3)+'</td><td class="num">'+Math.round(r.ndis).toLocaleString('en-US')+'</td><td class="num">'+(r.returned!==undefined?r.returned.toFixed(1):'')+'</td></tr>').join('')+'</table></div></details>'}
  const A1=RD.anim({card:'vix-l-card',ctl:'vix-l-ctl',n:SEL.length,draw,ms:1600,label:'Selectivity'});
  RD.seg($('vix-l-sc'),v=>{st.sc=v;A1.reset(v==='rand'?SEL.length:1)});
  const qd=Qd.rows||[];
  const keys=[...new Set(qd.map(r=>r.collection+'|'+r.filter))],efs=[...new Set(qd.map(r=>r.hnsw_ef))].sort((a,b)=>a-b);
  $('vix-l-qd').innerHTML='<table><tr><th>Collection, filter (share kept)</th>'+efs.map(e=>'<th class="num">ef '+e+'</th>').join('')+'</tr>'+keys.map(k=>{const rs=qd.filter(r=>r.collection+'|'+r.filter===k);const r0=rs[0];
    return '<tr><td>'+esc(r0.collection.replace('vix_','').replace('_graph',' (graph forced)').replace('_default',' (default threshold)')+', '+r0.filter+' ('+(r0.selectivity*100).toFixed(2)+'%)')+'</td>'+efs.map(e=>{const r=rs.find(x=>x.hnsw_ef===e);return '<td class="num">'+(r?r.recall10.toFixed(3):'')+'</td>'}).join('')+'</tr>'}).join('')+'</table><p class="small mute">Recall@10 against the exact filtered top 10.</p>';
  RD.onRender(()=>A1.redraw());
  RD.onResize(()=>A1.redraw());
})();
