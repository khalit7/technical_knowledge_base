// ---- Pipeline lab: chunking explorer (one real QASPER paper) and the strategy comparison ----
(function(){
  const P=window.PIP,X=P.D.chunk_explorer,C=P.D.chunking,$=P.$,esc=P.esc;
  if(!X||!C)return;
  const LABEL={'fixed-128-16':'Fixed 128 tokens, 16 overlap','fixed-256-0':'Fixed 256, no overlap','fixed-256-32':'Fixed 256, 32 overlap (default)','fixed-512-64':'Fixed 512, 64 overlap',
    'recursive-256':'Recursive (LangChain rule), 256','sentence-256':'Sentences packed to 256','structure-256':'Paragraphs within sections, 256','paragraph':'One paragraph each',
    'semantic-p95':'Semantic, 95th percentile','semantic-p80':'Semantic, 80th percentile','fixed-256-32+hdr':'Fixed 256 + title and section','structure-256+hdr':'Paragraphs 256 + title and section',
    'fixed-256-32+ctx':'Fixed 256 + generator-written context','fixed-256-32@sub':'Fixed 256 (same subset)'};
  window.PIP.CHUNK_LABEL=LABEL;
  // ---- explorer
  const strats=Object.keys(X.strategies);let cur='fixed-256-32',qi=0;
  $('pip-ck-strat').innerHTML=strats.map(s=>'<button data-v="'+s+'"'+(s===cur?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+esc(LABEL[s]||s)+'</button>').join('');
  $('pip-ck-q').innerHTML=X.questions.map((q,i)=>'<option value="'+i+'">'+esc(q.q)+'</option>').join('');
  function render(){
    const S=X.strategies[cur],q=X.questions[qi],t=X.text,ch=S.chunks,top=S.top3[qi];
    const pts=new Set([0,t.length]);ch.forEach(c=>{pts.add(c[0]);pts.add(c[1])});q.ev.forEach(e=>{pts.add(e[0]);pts.add(e[1])});
    const P_=[...pts].filter(x=>x>=0&&x<=t.length).sort((a,b)=>a-b);
    const starts={};ch.forEach((c,i)=>{(starts[c[0]]=starts[c[0]]||[]).push(i)});
    let h='';
    for(let j=0;j<P_.length-1;j++){const a=P_[j],b=P_[j+1];
      (starts[a]||[]).forEach(i=>{const r=top.indexOf(i);h+='<span class="bd'+(r>=0?' top':'')+'" title="chunk '+(i+1)+', '+ch[i][2]+' tokens'+(r>=0?', BM25 rank '+(r+1):'')+'">'+(r>=0?'#'+(r+1)+' ':'')+'c'+(i+1)+'</span>'});
      if(b<=a)continue;
      const cov=[];ch.forEach((c,i)=>{if(c[0]<=a&&b<=c[1])cov.push(i)});
      const ev=q.ev.some(e=>e[0]<=a&&b<=e[1]);
      const cls=cov.length>1?'ovl':cov.length?('ck'+(cov[0]%2)):'';
      h+='<span class="ck '+cls+(ev?' ev':'')+'"'+(ev&&!h.includes('id="pip-ck-ev"')?' id="pip-ck-ev"':'')+'>'+esc(t.slice(a,b))+'</span>';
    }
    $('pip-ck-doc').innerHTML=h;
    const ntok=ch.map(c=>c[2]).sort((a,b)=>a-b);
    $('pip-ck-stats').innerHTML=[['Chunks in this paper',ch.length],['Median chunk',ntok[Math.floor(ntok.length/2)]+' tokens'],
      ['Evidence wholly inside one chunk',S.intact[qi]?'yes':'no'],['BM25 top 3 cover the evidence',S.hit3[qi]?'yes':'no']]
      .map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>').join('');
    $('pip-ck-ans').innerHTML='<b>Answer (annotators):</b> '+esc(q.ans.join(' | ')||'n/a');
    const all=strats.map(s=>[s,X.strategies[s].hit3.filter(Boolean).length,X.strategies[s].intact.filter(Boolean).length]);
    $('pip-ck-sum').textContent='In this paper, of '+X.questions.length+' questions: '+all.map(a=>(LABEL[a[0]]||a[0])+' '+a[2]+' intact, '+a[1]+' found in the top 3').join('; ')+'.';
  }
  P.seg($('pip-ck-strat'),v=>{cur=v;render()});
  $('pip-ck-q').addEventListener('change',e=>{qi=+e.target.value;render()});
  $('pip-ck-go').addEventListener('click',()=>{const e=$('pip-ck-ev'),box=$('pip-ck-doc');if(e)box.scrollTop=e.offsetTop-box.offsetTop-30});
  render();
  // ---- comparison chart over all 892 questions
  const ORDER=['fixed-128-16','fixed-256-0','fixed-256-32','fixed-512-64','sentence-256','semantic-p95','semantic-p80','recursive-256','structure-256','paragraph','fixed-256-32+hdr','structure-256+hdr'].filter(s=>C[s]);
  const MET={intact:['Evidence intact in one chunk',s=>C[s].intact/C[s].n_questions],
    'bm25k3':['BM25, top 3 chunks',s=>C[s].bm25.k['3']],'bm25b1024':['BM25, 1,024-token budget',s=>C[s].bm25.budget['1024']],
    'bgek3':['bge-small, top 3 chunks',s=>C[s]['bge-small']&&C[s]['bge-small'].k['3']],'bgeb1024':['bge-small, 1,024-token budget',s=>C[s]['bge-small']&&C[s]['bge-small'].budget['1024']],
    'qwk3':['Qwen3-Embedding, top 3',s=>C[s]['qwen3-emb-0.6b']&&C[s]['qwen3-emb-0.6b'].k['3']],'qwb1024':['Qwen3-Embedding, 1,024-token budget',s=>C[s]['qwen3-emb-0.6b']&&C[s]['qwen3-emb-0.6b'].budget['1024']]};
  let met='bm25k3';
  $('pip-ck-met').innerHTML=Object.keys(MET).map(m=>'<button data-v="'+m+'"'+(m===met?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+MET[m][0]+'</button>').join('');
  function chart(){const f=MET[met][1];const rows=ORDER.filter(s=>f(s)!=null).map(s=>({name:LABEL[s]||s,v:f(s),hl:s==='fixed-256-32',color:s.startsWith('fixed')?'var(--c1)':s.startsWith('semantic')||s==='sentence-256'?'var(--c5)':s.includes('+')?'var(--c4)':'var(--c3)'}));
    P.bars($('pip-ck-bars'),rows,1,v=>P.pc(v,1));
    const miss=ORDER.filter(s=>f(s)==null);$('pip-ck-miss').textContent=miss.length?'Not measured for this metric: '+miss.map(s=>LABEL[s]||s).join(', ')+'.':'';}
  P.seg($('pip-ck-met'),v=>{met=v;chart()});chart();
  // table
  $('pip-ck-tab').innerHTML='<thead><tr><th>Strategy</th><th class="num">chunks</th><th class="num">median tokens</th><th class="num">p90</th><th class="num">intact</th><th class="num">BM25 top 3</th><th class="num">BM25 1,024 tok</th><th class="num">bge top 3</th><th class="num">bge 1,024 tok</th></tr></thead><tbody>'+
    ORDER.map(s=>{const c=C[s],b=c['bge-small'];return '<tr><td>'+esc(LABEL[s]||s)+'</td><td class="num">'+P.n0(c.chunks)+'</td><td class="num">'+c.tok_median+'</td><td class="num">'+c.tok_p90+'</td><td class="num">'+P.pc(c.intact/c.n_questions)+'</td><td class="num">'+P.pc(c.bm25.k['3'])+'</td><td class="num">'+P.pc(c.bm25.budget['1024'])+'</td><td class="num">'+(b?P.pc(b.k['3']):'n/a')+'</td><td class="num">'+(b?P.pc(b.budget['1024']):'n/a')+'</td></tr>'}).join('')+'</tbody>';
})();
