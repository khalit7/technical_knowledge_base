// ---- Vector search lab: cosine vs dot vs L2 on raw gte vectors; the model comparison ----
(function(){
  const V=window.VEC,$=V.$,esc=V.esc,f3=V.f3;
  // --- metrics
  const M=V.D.metric;let mode='raw';
  function simDraw(){
    if(!M){$('vec-sim-lists').innerHTML='<p class="vec-small">The raw re-embedding of SciFact with gte-modernbert has not been run yet (it needs the shared GPU slot); the stored vectors are normalised, so on them the three metrics give identical lists.</p>';$('vec-sim-norm').hidden=true;return}
    const ex=M.example,rel=new Set(ex.relevant);
    $('vec-sim-claim').innerHTML='Claim: <b>'+esc(ex.claim)+'</b> (query vector length '+ex.qnorm.toFixed(2)+'). Top 5 of 5,183 abstracts; green = the abstract annotators marked relevant.';
    const cols=[['cosine','Cosine','cos'],['dot','Dot product','dot'],['l2','L2 distance','l2']];
    $('vec-sim-lists').innerHTML=cols.map(([k,nm,f])=>{const L=mode==='raw'?ex[k]:ex.cosine;
      return '<div><div class="small"><b>'+nm+'</b>'+(mode==='norm'?' (normalised)':'')+'</div><div class="tw"><table class="vec-tbl"><tr><th>#</th><th>abstract</th><th class="num">length</th><th class="num">'+(mode==='raw'?nm.split(' ')[0].toLowerCase():'cos')+'</th></tr>'+
      L.map((d,i)=>'<tr class="'+(d.rel?'rel':'')+'"><td>'+(i+1)+'</td><td class="t" title="'+esc(d.title)+'">'+esc(d.title)+'</td><td class="num">'+(mode==='raw'?d.norm.toFixed(2):'1')+'</td><td class="num">'+(mode==='raw'?(f==='cos'?d.cos.toFixed(3):f==='dot'?d.dot.toFixed(1):d.l2.toFixed(2)):d.cos.toFixed(3))+'</td></tr>').join('')+'</table></div></div>'}).join('');
    const m=M.metrics;
    $('vec-sim-stats').innerHTML=mode==='raw'?
      ['cosine','dot','l2'].map(k=>'<div class="stat"><div class="k">nDCG@10, '+(k==='l2'?'L2':k)+' <span class="vec-lbl m">measured</span></div><div class="v">'+f3(m[k]['ndcg@10'])+'</div><div class="d">mean length of its top 10: '+m[k].mean_norm_top10.toFixed(2)+'</div></div>').join('')+
      '<div class="stat"><div class="k">Top 10 shared, cosine and dot</div><div class="v">'+V.pc(M.overlap10.cos_dot,0)+'</div><div class="d">cosine and L2: '+V.pc(M.overlap10.cos_l2,0)+'</div></div>'
      :'<div class="stat"><div class="k">nDCG@10, all three</div><div class="v">'+f3(m.cosine['ndcg@10'])+'</div><div class="d">identical top 10 for all 300 claims: '+(M.normalised_all_same_top10?'yes':'no')+'</div></div>';
    // histogram of document lengths
    const n=M.norms,el=$('vec-sim-hist'),W=V.width(el),H=150,L=40,R=10,T=8,B=30;
    const mx=Math.max(...n.hist_counts),bw=(W-L-R)/n.hist_counts.length;
    let s='';n.hist_counts.forEach((c,i)=>{const h=(H-T-B)*c/mx;s+='<rect x="'+(L+i*bw+1).toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="var(--c2)"><title>'+n.hist_edges[i]+' to '+n.hist_edges[i+1]+': '+c+' abstracts</title></rect>'});
    [0,Math.floor(n.hist_counts.length/2),n.hist_counts.length].forEach(i=>{s+=V.T(L+i*bw,H-B+14,n.hist_edges[i].toFixed(2),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=V.T(L+(W-L-R)/2,H-4,'length |d| of each raw document vector (5,183 abstracts)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+=V.T(L-5,T+8,String(mx),{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Histogram of raw vector lengths">'+s+'</svg>';
    $('vec-sim-note').innerHTML='Raw lengths: documents '+n.doc_min.toFixed(2)+' to '+n.doc_max.toFixed(2)+' (median '+n.doc_median.toFixed(2)+'), claims '+n.query_min.toFixed(2)+' to '+n.query_max.toFixed(2)+'; correlation of a document\'s length with its token count '+n.corr_norm_tokens.toFixed(2)+'. Check: the raw vectors divided by their length match the stored normalised ones (minimum cosine '+M.stored_vs_raw_min_cos.toFixed(5)+'). <span class="vec-lbl m">measured</span> gte-modernbert-base, float32 on MPS, 1,024 tokens, SciFact test.';
  }
  V.seg($('vec-sim-norm'),v=>{mode=v;simDraw()});
  const C=V.D.con.models;
  const rng=k=>{const a=C[k].cos.flat();return [Math.min(...a),Math.max(...a)]};
  const rb=rng('bge-small'),rq=rng('qwen3-emb-0.6b'),diag=k=>C[k].cos.map((r,i)=>r[i]);
  $('vec-sim-scale').innerHTML='On the same 8 claims and 8 abstracts (the batch of the training section below), bge-small\'s cosines all fall between '+rb[0].toFixed(2)+' and '+rb[1].toFixed(2)+', Qwen3-Embedding\'s between '+rq[0].toFixed(2)+' and '+rq[1].toFixed(2)+'. A pair bge-small scores 0.6 is unrelated; a pair Qwen3 scores 0.6 is a strong match. A similarity threshold ("keep results above 0.7") must be set per model, on labelled data, and changes when the model changes. Only the order within one model means something.';
  V.onRender(simDraw);

  // --- models
  const MD=V.D.models,rows=MD.rows,cb=MD.colbert,bm=MD.bm25;
  const med=a=>a.slice().sort((x,y)=>x-y)[1];
  const KEYS=[
    ['scifact_ndcg10','SciFact nDCG@10',r=>r.scifact_ndcg10,f3,1,true],
    ['nfcorpus_ndcg10','NFCorpus nDCG@10',r=>r.nfcorpus_ndcg10,f3,1,true],
    ['scifact_recall100','SciFact recall@100',r=>r.scifact_recall100,f3,1,true],
    ['bytes','bytes per document',r=>r.bytes_per_vector!=null?r.bytes_per_vector:r.bytes_per_doc,x=>V.n0(x)+' B',null,false],
    ['weights','model weights (MB)',r=>r.weights_bytes/1e6,x=>V.n0(x)+' MB',null,false],
    ['dps','indexing (docs/s, MPS)',r=>Array.isArray(r.docs_per_s)?med(r.docs_per_s):r.docs_per_s,x=>(+x).toFixed(1),null,true],
    ['qms','query encode p50 (ms, MPS)',r=>r.q_ms_mps,x=>(+x).toFixed(1)+' ms',null,false]];
  let key='scifact_ndcg10';
  $('vec-mod-k').innerHTML=KEYS.map(k=>'<button data-v="'+k[0]+'"'+(k[0]===key?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+k[1]+'</button>').join('');
  const all=()=>rows.map(r=>Object.assign({},r)).concat([Object.assign({colbert:1},cb),Object.assign({bm:1},bm)]);
  function bars(){
    const k=KEYS.find(x=>x[0]===key);const R=all().map(r=>({name:r.name.replace(' (bm25s, k1 1.2, b 0.75)',''),v:(()=>{try{return k[2](r)}catch(e){return null}})(),r})).filter(x=>x.v!=null&&!isNaN(x.v));
    R.sort((a,b)=>k[5]?b.v-a.v:a.v-b.v);
    const mx=Math.max(...R.map(x=>x.v));
    V.bars($('vec-mod-bars'),R.map(x=>({name:x.name,v:x.v,color:x.r.colbert?'var(--c4)':x.r.bm?'var(--mute)':'var(--acc)'})),mx*1.02,k[3]);
    $('vec-mod-note').innerHTML=(k[5]?'Higher is better.':'Lower is better.')+' '+({bytes:'ColBERT stores one 96-number vector per token (float16): 1.22 M token vectors for SciFact, '+V.n0(cb.scifact_index_bytes/1e6)+' MB, against '+V.n0(rows[3].scifact_index_bytes/1e6)+' MB for Qwen3-Embedding at 1,024 float32 numbers per abstract. BM25 has no vector.',
      dps:'Median of three runs over the SciFact corpus (Qwen3: first 1,000 abstracts), batch 64 (Qwen3 16, float16). ColBERT: one run.',
      qms:'One query at a time after warm-up, 100 claims. On CPU: '+rows.map(r=>({'minilm-l6':'MiniLM','bge-small':'bge-small','gte-modernbert':'gte','qwen3-emb-0.6b':'Qwen3'})[r.key]+' '+r.q_ms_cpu.toFixed(1)).join(', ')+' ms.',
      weights:'Size of the safetensors files at the pinned revision.'}[key]||'Test split, pytrec_eval. ColBERT is late interaction (one vector per token, scored by MaxSim): see Reranking in the <a href="#" data-vec-go="t-pipe|pip-s-rerank">Pipeline lab</a>. Published: MTEB results repository (embedding models), the model card (ColBERT, vendor), the BEIR paper (BM25, Elasticsearch\'s implementation; here bm25s). BM25 query time: Pipeline lab latency, p50.');
  }
  function table(){
    const h='<tr><th>model</th><th>params</th><th class="num">dims</th><th>pooling</th><th>query prompt</th><th class="num">SciFact nDCG@10</th><th class="num">published</th><th class="num">recall@10</th><th class="num">recall@100</th><th class="num">NFCorpus nDCG@10</th><th class="num">bytes / doc</th><th class="num">SciFact index</th><th class="num">weights</th><th class="num">docs/s</th><th class="num">query ms</th></tr>';
    const tr=r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.params)+'</td><td class="num">'+r.dim+'</td><td>'+esc(r.pool)+'</td><td>'+esc(r.prompt)+'</td><td class="num"><b>'+f3(r.scifact_ndcg10)+'</b></td><td class="num">'+f3(r.mteb_scifact)+'</td><td class="num">'+f3(r.scifact_recall10)+'</td><td class="num">'+f3(r.scifact_recall100)+'</td><td class="num">'+f3(r.nfcorpus_ndcg10)+'</td><td class="num">'+V.n0(r.bytes_per_vector)+'</td><td class="num">'+(r.scifact_index_bytes/1e6).toFixed(1)+' MB</td><td class="num">'+V.n0(r.weights_bytes/1e6)+' MB</td><td class="num">'+med(r.docs_per_s).toFixed(1)+'</td><td class="num">'+r.q_ms_mps.toFixed(1)+'</td></tr>';
    $('vec-mod-tbl').innerHTML=h+rows.map(tr).join('')+
      '<tr><td>'+esc(cb.name)+'</td><td>'+esc(cb.params)+'</td><td class="num">96 per token</td><td>none (MaxSim)</td><td>none</td><td class="num"><b>'+f3(cb.scifact_ndcg10)+'</b></td><td class="num">'+f3(cb.card_scifact)+'</td><td class="num">'+f3(cb.scifact_recall10)+'</td><td class="num">'+f3(cb.scifact_recall100)+'</td><td class="num">'+f3(cb.nfcorpus_ndcg10)+'</td><td class="num">'+V.n0(cb.bytes_per_doc)+'</td><td class="num">'+(cb.scifact_index_bytes/1e6).toFixed(1)+' MB</td><td class="num">'+V.n0(cb.weights_bytes/1e6)+' MB</td><td class="num">'+cb.docs_per_s.toFixed(1)+'</td><td class="num">n/a</td></tr>'+
      '<tr><td>BM25</td><td>none</td><td class="num">sparse</td><td></td><td></td><td class="num"><b>'+f3(bm.scifact_ndcg10)+'</b></td><td class="num">0.665</td><td class="num">'+f3(bm.scifact_recall10)+'</td><td class="num">'+f3(bm.scifact_recall100)+'</td><td class="num">'+f3(bm.nfcorpus_ndcg10)+'</td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num">0.25</td></tr>';
  }
  const g=rows.find(r=>r.key==='gte-modernbert'),q=rows.find(r=>r.key==='qwen3-emb-0.6b'),b=rows.find(r=>r.key==='bge-small');
  $('vec-mod-pr-ans').innerHTML='gte-modernbert-base: '+f3(g.scifact_ndcg10)+', against '+f3(b.scifact_ndcg10)+' for bge-small and '+f3(q.scifact_ndcg10)+' for the 0.6 B Qwen3-Embedding, which is also '+(med(b.docs_per_s)/med(q.docs_per_s)).toFixed(0)+' times slower to index than bge-small. On NFCorpus the order flips: Qwen3 '+f3(q.nfcorpus_ndcg10)+', gte '+f3(g.nfcorpus_ndcg10)+'. Size is not a ranking; measure on your own queries.';
  V.seg($('vec-mod-k'),v=>{key=v;bars()});
  V.predict($('vec-mod-pr'));
  V.onRender(()=>{bars();table()});
})();
