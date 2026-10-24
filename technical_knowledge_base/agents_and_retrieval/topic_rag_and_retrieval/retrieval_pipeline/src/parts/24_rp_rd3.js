// ---- Reading tab, part 3: query understanding tables, filters, duplicates and MMR, prompt assembly
(function(){
  const $=id=>document.getElementById(id),D=RP.D,E=RP.esc,f3=RP.f3,pct=RP.pct;
  const Q=D.qrewrite||{};
  const tbl=(head,rows)=>'<table class="rp-t"><thead><tr>'+head.map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(r.hl?' class="hl"':'')+'>'+r.c.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  // 5.2 self-query
  if(Q.selfq){const S=Q.selfq,K={title:'by title',month_year:'by month and year',year:'by year only'};
    const M=S.hit_at_1024_tokens;const kinds=Object.keys(K);
    $('rp-sq').innerHTML=tbl(['request mentions the paper'].concat(kinds.map(k=>K[k]+' ('+S.filter_correct[k].n+')')),[
      {c:['generator\'s filter keeps the right paper'].concat(kinds.map(k=>S.filter_correct[k].right_paper_kept+' <span class="mute">(median '+S.allowed_papers_median[k]+(S.allowed_papers_median[k]===1?' paper':' papers')+' pass)</span>'))},
      ...Object.keys(M).map(m=>({c:[E(m)].concat(kinds.map(k=>M[m][k]+' / '+S.filter_correct[k].n)),hl:m==='extracted filter'}))])+
      '<p class="small mute">"Found" = the top chunks within 1,024 tokens cover at least 90% of an evidence paragraph, searching all 6,463 chunks of 281 papers. The "title" filter counts as right only when it keeps exactly the right paper. JSON parsed for '+S.json_parsed+' of '+S.n+' answers. src/exp/qgen.py, qeval.py <span class="meas">measured</span> <span class="cons">constructed requests</span></p>'}
  // 5.3 step-back
  if(Q.step_back){const R=Q.step_back;const ms=Object.keys(R);
    $('rp-sb').innerHTML=tbl(['SciFact test, nDCG@10'].concat(ms),['original','step-back','original + step-back (RRF)'].map(v=>({c:[v].concat(ms.map(m=>f3(R[m][v].ndcg10)))})))+
      '<p class="small mute">Examples: '+(Q.step_back_examples||[]).slice(0,3).map(x=>'&ldquo;'+E(x.claim)+'&rdquo; &#8594; &ldquo;'+E(x.step_back)+'&rdquo;').join('; ')+' <span class="meas">measured</span></p>'}
  if(Q.decomp){const R=Q.decomp,n=R.n_by_type;const ks=['bm25 | question','bm25 | sub-questions + question (RRF)','bge-small | question','bge-small | sub-questions + question (RRF)'];
    $('rp-dec').innerHTML=tbl(['HotpotQA, both gold paragraphs in the top k','bridge ('+n.bridge+'), top 5','bridge, top 10','comparison ('+n.comparison+'), top 5','comparison, top 10'],
      ks.filter(k=>R[k]).map(k=>({c:[E(k)].concat([R[k].bridge[5],R[k].bridge[10],R[k].comparison[5],R[k].comparison[10]])})))+
      '<p class="small mute">Sub-questions per question: '+R.n_subq_mean+' on average. BM25 here indexes title + paragraph. <span class="meas">measured</span></p>'}
  // 6.2 post-filter arithmetic
  function kept(){const el=$('rp-kept-chart');const F=D.root_filter;if(!F)return;
    const G=Object.keys(F.groups).map(Number).sort((a,b)=>a-b),Ks=[10,30,100,1000],cols={10:'var(--c1)',30:'var(--c2)',100:'var(--c3)',1000:'var(--c4)'};
    const w=Math.min(860,RP.W(el)),h=230,m={l:34,r:12,t:10,b:34};const lx=s=>Math.log10(s);
    const xs=G.map(g=>1/g);const x0=lx(0.01),x1=lx(1);const X=s=>m.l+(w-m.l-m.r)*(lx(s)-x0)/(x1-x0),Y=v=>m.t+(h-m.t-m.b)*(1-v/10);
    let b='';[0,2,4,6,8,10].forEach(v=>{b+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RP.t(m.l-4,Y(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
    [0.01,0.02,0.05,0.1,0.2,0.5,1].forEach(s=>b+=RP.t(X(s),h-m.b+14,(100*s)+'%',{a:'middle',fs:10,fill:'var(--mute)'}));
    b+=RP.t((m.l+w)/2,h-4,'share of the corpus the user may see (s)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    Ks.forEach(K=>{const pts=[];for(let e=-2;e<=0.001;e+=0.02){const s=Math.pow(10,e);pts.push(X(s)+','+Y(Math.min(10,K*s)))}
      b+='<polyline fill="none" stroke="'+cols[K]+'" stroke-width="1.6" stroke-dasharray="5 3" points="'+pts.join(' ')+'"/>';
      G.forEach(g=>{const v=F.groups[g].post[String(K)];if(v)b+='<circle cx="'+X(1/g)+'" cy="'+Y(v.returned_mean)+'" r="4" fill="'+cols[K]+'"><title>K '+K+', s '+(100/g)+'%: '+v.returned_mean+' returned</title></circle>'})});
    el.innerHTML=RP.svg(w,h,b,'Post-filter survivors against K times s')+'<div class="rp-leg">'+Ks.map(K=>'<span><i style="background:'+cols[K]+'"></i>top K = '+K+'</span>').join('')+'</div>'}
  // 7.1 duplicates
  const MM=D.mmr||{};
  if(MM.near_duplicates){const N=MM.near_duplicates;
    $('rp-dup').innerHTML=tbl(['corpus (bge-small cosine)','documents','pairs &ge; 0.95','pairs &ge; 0.98','pairs &ge; 0.995'],Object.keys(N).map(k=>({c:[k,RP.fmt(N[k].docs),N[k]['0.95'].pairs,N[k]['0.98'].pairs,N[k]['0.995'].pairs]})))}
  // 7.2 MMR chart
  const ms={m:'hp'};const lk=(R,l)=>R[String(l)]||R[(+l).toFixed(1)];
  function mmr(){const el=$('rp-mmr-chart');if(!MM.lambdas)return;const L=MM.lambdas;let series,lab,max;
    if(ms.m==='hp'){series=[['bge-small',MM['hotpotqa_bge-small'],'var(--c1)'],['Qwen3-Embedding',MM['hotpotqa_qwen3-emb-0.6b'],'var(--c2)']].map(([n,R,c])=>[n,L.map(l=>lk(R,l)['both_gold@5']),c]);lab='questions (of 200) with both gold paragraphs in the top 5';max=200}
    else{const ds=ms.m==='nf'?'nfcorpus':'scifact';series=[['bge-small',MM[ds+'_bge-small'],'var(--c1)'],['Qwen3-Embedding',MM[ds+'_qwen3-emb-0.6b'],'var(--c2)']].map(([n,R,c])=>[n,L.map(l=>lk(R,l).ndcg10),c]);lab='nDCG@10';max=null}
    const w=Math.min(860,RP.W(el)),h=210,m={l:40,r:12,t:10,b:34};const all=series.flatMap(s=>s[1]);const y1=max||Math.ceil(Math.max(...all)*20)/20,y0=max?0:Math.floor(Math.min(...all)*20)/20;
    const X=i=>m.l+(w-m.l-m.r)*i/(L.length-1),Y=v=>m.t+(h-m.t-m.b)*(1-(v-y0)/(y1-y0));let b='';
    for(let k=0;k<=4;k++){const v=y0+(y1-y0)*k/4;b+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RP.t(m.l-4,Y(v)+4,max?Math.round(v):v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
    L.forEach((l,i)=>b+=RP.t(X(i),h-m.b+14,'λ '+l,{a:'middle',fs:10,fill:'var(--mute)'}));b+=RP.t((m.l+w)/2,h-4,lab,{a:'middle',fs:10.5,fill:'var(--mute)'});
    series.forEach(([n,v,c])=>{b+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+v.map((y,i)=>X(i)+','+Y(y)).join(' ')+'"/>'+v.map((y,i)=>'<circle cx="'+X(i)+'" cy="'+Y(y)+'" r="3" fill="'+c+'"/>').join('')});
    el.innerHTML=RP.svg(w,h,b,'MMR lambda sweep')+'<div class="rp-leg">'+series.map(([n,,c])=>'<span><i style="background:'+c+'"></i>'+n+'</span>').join('')+'</div>'}
  RD.seg($('rp-mmr-ds'),m=>{ms.m=m;mmr()});
  // 8 prompt assembly
  const PA=(D.prompt_asm||{}).results;
  if(PA){const b=PA.budget||{};const ks=['k1','k3','k5','k10'].filter(k=>b[k]);
    $('rp-pa-budget').innerHTML=tbl(['reranked top k in the prompt (188 claims)'].concat(ks.map(k=>k.replace('k','k = '))),[
      {c:['strictly right'].concat(ks.map(k=>b[k].strict+' <span class="mute">('+pct(b[k].strict/b[k].n,0)+')</span>'))},
      {c:['right label (lenient)'].concat(ks.map(k=>b[k].lenient))},
      {c:['answered NOT ENOUGH INFO'].concat(ks.map(k=>b[k].answered_nei))},
      {c:['prompt tokens, mean'].concat(ks.map(k=>RP.fmt(b[k].prompt_tokens_mean)))}])+'<p class="small mute">k = 1, 3, 5 are the root\'s answers, reused from its cache; k = 10 run here. <span class="meas">measured</span></p>';
    const c=PA.cite||{};const cv=['number','doc-id','number+quote'].filter(k=>c[k]);
    $('rp-pa-cite').innerHTML=tbl(['format (real top 5, 188 claims)'].concat(cv),[
      {c:['citation parsed and resolved to an abstract in the prompt'].concat(cv.map(k=>c[k].citation_resolved))},
      {c:['strictly right'].concat(cv.map(k=>c[k].strict))},
      {c:['quote given (30+ characters)'].concat(cv.map(k=>c[k].quote_given!=null?c[k].quote_given:'&ndash;'))},
      {c:['quote found word for word in the cited abstract'].concat(cv.map(k=>c[k].quote_verbatim!=null?c[k].quote_verbatim:'&ndash;'))},
      {c:['strictly right and quote verified'].concat(cv.map(k=>c[k].strict_and_quote_verbatim!=null?c[k].strict_and_quote_verbatim:'&ndash;'))}])+'<p class="small mute"><span class="meas">measured</span></p>'}
  function pos(){const el=$('rp-pa-pos');const P=PA&&PA.pos;if(!P)return;
    const rows=[];[5,10].forEach(k=>['first','middle','last'].forEach(p=>{const v=P['k'+k+'-'+p];if(v)rows.push({name:'k = '+k+', gold '+p,v:v.strict/v.n,color:k===5?'var(--c1)':'var(--c2)'})}));
    el.innerHTML=RP.bars(rows,1,v=>(100*v).toFixed(1)+'%')+'<p class="small mute">Share strictly right of '+(P['k5-first']||{}).n+' claims; distractors are the reranker\'s highest-ranked non-evidence abstracts. <span class="meas">measured</span></p>'}
  RD.onRender(()=>{kept();mmr();pos()});RD.onResize(()=>{kept();mmr();pos()});
})();
