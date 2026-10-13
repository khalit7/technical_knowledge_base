// ---- Tool map: the stack, the atlas (filterable cards and a detail panel) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const F={layer:new Set(),lc:new Set(),dep:new Set(),status:new Set(),q:''};
  let sel='qdrant';
  const R={};D.defaults.runs.forEach(r=>R[r.key]=r);
  const f3=x=>Number(x).toFixed(3);
  M.run=R;
  function measured(a){
    const C=D.checks,X=D.defaults;let t='';
    const nq=X.n_queries,base=' on the running example ('+nf(X.data.n)+' SciFact abstracts, '+nq+' test queries, '+X.data.dim+'-dimension bge-small vectors)';
    function nf(n){return M.nf(n)}
    if(a.id==='qdrant')t='qdrant-client '+esc(C.qdrant_local.version)+' in local mode returned the exact top 10 for every query'+base+': ANN recall@10 '+f3(R.qdrant_local.ann_recall10)+'. In <code>qdrant_client/local/local_collection.py</code>, <code>search()</code> computes the distance to every stored vector and sorts with <code>np.argsort</code>: local mode is an exact scan, whatever <code>hnsw_config</code> reports ('+esc(C.qdrant_local.hnsw_config_reported.split(' full')[0])+').';
    else if(a.id==='chroma')t='chromadb '+esc(C.chroma.version)+', single node, collection created with defaults: the configuration read back is space <b>'+esc(C.chroma.config_read_back.space)+'</b>, max_neighbors '+C.chroma.config_read_back.max_neighbors+', ef_construction '+C.chroma.config_read_back.ef_construction+', ef_search '+C.chroma.config_read_back.ef_search+'. ANN recall@10'+base+': '+f3(R.chroma_def.ann_recall10)+'. The l2 default comes from <code>chromadb/api/collection_configuration.py</code> when you pass no embedding function.';
    else if(a.id==='lancedb')t='lancedb '+esc(C.lancedb.version)+': without an index the search is exact (recall '+f3(R.lance_noindex.ann_recall10)+'). <code>create_index()</code> with defaults built <code>IVF_PQ</code> (read back from <code>list_indices()</code>); ANN recall@10 fell to '+f3(R.lance_ivfpq_def.ann_recall10)+' and retrieval nDCG@10 from '+f3(X.exact_ndcg10)+' to '+f3(R.lance_ivfpq_def.ndcg10)+base+'. <code>refine_factor(10)</code> (re-score 10 times as many candidates with the full vectors) brought recall back to '+f3(R.lance_ivfpq_refine.ann_recall10)+'.';
    else if(a.id==='milvus')t='Milvus Lite ('+esc(C.milvus_lite.milvus_lite)+', pymilvus '+esc(C.milvus_lite.version)+'): a quick-setup collection reports <code>AUTOINDEX</code> and returned the exact top 10'+base+'. Asking for HNSW (M 16, efConstruction 64) is accepted and <code>describe_index</code> then says HNSW, but on 20,000 uniform random 256-dimension vectors with ef 10 it returned recall '+C.milvus_lite_hard.milvus_lite_recall.toFixed(3)+' where FAISS HNSW with the same settings returned '+C.milvus_lite_hard.faiss_hnsw_recall.toFixed(3)+': Lite scans flat, as its docs say. Measure Milvus on Standalone or Distributed.';
    else if(a.id==='faiss')t='faiss '+esc(C.faiss.version)+'. Defaults read back: HNSW efSearch '+C.faiss.hnsw_efSearch_default+', efConstruction '+C.faiss.hnsw_efConstruction_default+'; IVF nprobe '+C.faiss.ivf_nprobe_default+'. ANN recall@10'+base+': HNSW (M 32) '+f3(R.faiss_hnsw_def.ann_recall10)+' at the default efSearch, '+f3(R.faiss_hnsw_ef64.ann_recall10)+' at 64; IVF-Flat with '+R.faiss_ivf_def.cfg.nlist+' lists '+f3(R.faiss_ivf_def.ann_recall10)+' at nprobe 1, '+f3(R.faiss_ivf_np8.ann_recall10)+' at 8.';
    else if(a.id==='hnswlib')t='hnswlib '+esc(C.hnswlib.version)+' (PyPI). Defaults read back: M '+R.hnswlib_def.cfg.M+', ef_construction '+R.hnswlib_def.cfg.ef_construction+', ef '+R.hnswlib_def.cfg.ef+'. ANN recall@10'+base+': '+f3(R.hnswlib_def.ann_recall10)+' at ef 10, '+f3(R.hnswlib_ef100.ann_recall10)+' at ef 100; nDCG@10 '+f3(R.hnswlib_def.ndcg10)+' against '+f3(X.exact_ndcg10)+' for exact search.';
    else if(a.id==='usearch')t='usearch '+esc(C.usearch.version)+'. Defaults read back: connectivity '+C.usearch.connectivity_default+', expansion_add '+C.usearch.expansion_add_default+', expansion_search '+C.usearch.expansion_search_default+'. ANN recall@10'+base+': '+f3(R.usearch_def.ann_recall10)+'.';
    else if(a.id==='bm25s'||a.id==='rank_bm25'){const b=C.bm25;t='Five tiny sentences, query "cat on mat": bm25s '+esc(b.bm25s)+' (method '+esc(b.bm25s_method_default)+', k1 '+b.bm25s_k1+', b '+b.bm25s_b+') scored ['+b.scores_bm25s.join(', ')+']; rank_bm25 '+esc(b.rank_bm25)+' (BM25Okapi, k1 '+b.rank_bm25_k1+', b '+b.rank_bm25_b+', epsilon '+b.rank_bm25_epsilon+') scored ['+b.scores_rank_bm25.join(', ')+']. Same order, different numbers: the idf formulas differ, so scores from two BM25 libraries are not interchangeable (fusion by score would notice; fusion by rank would not).'}
    else if(a.id==='ranx')t='ranx '+esc(C.ranx.version)+': one query with relevant d1 and d3 ranked 1st and 3rd gives nDCG@10 '+C.ranx['ndcg@10']+', the same as the hand formula (1 + 1/log2 4) / (1 + 1/log2 3) = '+C.ranx['hand_ndcg@10']+'.';
    else if(a.id==='qwen3emb'||a.id==='bge'||a.id==='minilm'){t=a.id==='bge'?'These are the vectors every measured run on this tab uses: exact search with them gives nDCG@10 '+f3(X.exact_ndcg10)+' on the SciFact test set, the same value the MTEB results repo lists for bge-small-en-v1.5 on SciFact (0.7127, setup FACTS): an independent reproduction.':''}
    if(!t)return '';
    return '<dt>Measured</dt><dd><span class="map-lbl m">measured</span> '+t+'</dd>';
  }
  function modelFacts(a){
    const h=a.hfm;let s='';
    if(a.dims)s+='<dt>Vectors</dt><dd>'+esc(a.dims)+(a.mrl?' <span class="mute small">(Matryoshka: shorter prefixes still work)</span>':'')+'</dd>';
    if(a.ctx)s+='<dt>Max input</dt><dd>'+esc(a.ctx)+' tokens'+(h&&h.maxlen?' <span class="mute small">(sentence-transformers max_seq_length '+M.nf(h.maxlen)+')</span>':'')+'</dd>';
    if(h){const bits=[];if(h.params)bits.push(M.fmtP(h.params)+' parameters');if(h.pool&&h.pool.length)bits.push('pooling: '+h.pool.join(', '));if(h.prompts&&h.prompts.length)bits.push('prompts: '+h.prompts.slice(0,4).join(', '));if(h.lic)bits.push('licence tag: '+h.lic);
      s+='<dt>From the repo</dt><dd><span class="map-lbl d">docs</span> '+esc(bits.join('; '))+' <span class="mute small">('+esc(h.id)+', revision '+esc(h.sha)+', last modified '+esc(h.mod)+')</span></dd>'}
    if(a.layer==='embed'||a.layer==='rerank')s+='<dt>Instruction</dt><dd>'+(a.instr?'Queries take an instruction or prefix; documents are encoded without it (or with a different one).':'No instruction or prefix required.')+'</dd>';
    return s;
  }
  const evl={measured:'<span class="map-lbl m">measured</span>',source:'<span class="map-lbl s">source</span>',docs:'<span class="map-lbl d">docs</span>'};
  function detail(){
    const a=M.byId[sel],el=$('map-det');if(!a){el.innerHTML='';return}
    const L=M.layerOf(a.layer);
    const latest=a.ver==='docs'?'listed in the docs read on '+esc(a.date):a.ver==='card revision'?'model card revised '+esc(a.date):a.ver==='blog'?'announced '+esc(a.date):esc(a.ver)+' <span class="mute">('+esc(a.date)+')</span>';
    el.innerHTML='<h3>'+esc(a.name)+M.st(a.status)+'</h3><p style="margin:2px 0 6px">'+esc(a.one)+'</p><dl class="kv">'+
      '<dt>Layer</dt><dd>'+esc(L[1])+' <span class="mute small">('+esc(a.deploy)+')</span></dd>'+
      '<dt>Owner</dt><dd>'+esc(a.owner)+'</dd><dt>Licence</dt><dd>'+esc(a.lic)+(a.gh&&a.gh.lic?' <span class="mute small">(GitHub reads '+esc(a.gh.lic)+')</span>':'')+'</dd>'+
      '<dt>Latest</dt><dd>'+latest+(a.verSrc?' '+M.link('source',a.verSrc):'')+(a.first?' <span class="mute small">first stable PyPI release '+esc(a.first[1])+' on '+esc(a.first[0])+'</span>':'')+'</dd>'+
      '<dt>Status</dt><dd>'+esc(a.statusNote)+' '+M.link('source',a.statusSrc)+(a.gh?' <span class="mute small">(GitHub: last push '+esc(a.gh.pushed)+(a.gh.archived?', archived':', not archived')+')</span>':'')+'</dd>'+
      '<dt>What it runs</dt><dd>'+(evl[a.ev==='measured'?'docs':a.ev]||'')+' '+esc(a.algo)+' <span class="small">'+(a.algoSrc||[]).map(x=>M.link(x[0],x[1])).join(' . ')+'</span></dd>'+
      modelFacts(a)+measured(a)+
      (a.hyb?'<dt>Hybrid, filters, compression</dt><dd>hybrid: '+esc(a.hyb)+'; filters: '+esc(a.filt)+'; compression: '+esc(a.quant)+'; scale: '+esc(a.scale)+'</dd>':'')+
      '<dt>Choose when</dt><dd>'+esc(a.when)+'</dd>'+(a.avoid?'<dt>Avoid for</dt><dd>'+esc(a.avoid)+'</dd>':'')+
      '<dt>Links</dt><dd>'+[a.repo?M.link('GitHub','https://github.com/'+a.repo):'',a.pypi?M.link('PyPI','https://pypi.org/project/'+a.pypi+'/'):'',a.hf?M.link('Hugging Face','https://huggingface.co/'+a.hf):''].filter(Boolean).join(' . ')+'</dd></dl>';
  }
  function match(a){
    if(F.layer.size&&!F.layer.has(a.layer))return false;
    if(F.lc.size&&!F.lc.has(a.lc))return false;
    if(F.dep.size&&!F.dep.has(a.deployK))return false;
    if(F.status.size&&!F.status.has(a.status))return false;
    if(F.q){const q=F.q.toLowerCase();if(!(a.name+' '+a.one+' '+a.owner+' '+a.algo+' '+a.id).toLowerCase().includes(q))return false}
    return true;
  }
  function short(s){return s.length>112?s.slice(0,s.lastIndexOf(' ',108))+' ...':s}
  function draw(){
    const list=D.atlas.filter(match);
    $('map-f-count').textContent=list.length+' of '+D.atlas.length+' tools';
    $('map-cards').innerHTML=list.map(a=>{const L=M.layerOf(a.layer);const v=a.ver==='docs'?'docs read '+a.date:a.ver==='card revision'?'card '+a.date:a.ver==='blog'?'blog '+a.date:a.ver+' . '+a.date;
      return '<button class="map-card'+(a.id===sel?' sel':'')+'" data-id="'+a.id+'" style="border-left-color:'+L[3]+'"><span class="nm">'+esc(a.name)+'</span>'+M.st(a.status)+'<span class="ln">'+esc(short(a.one))+'</span><span class="vr">'+esc(L[1])+' . '+esc(v)+'</span></button>'}).join('')||'<p class="mute">Nothing matches.</p>';
    if(list.length&&!list.some(a=>a.id===sel)){sel=list[0].id;draw();return}
    detail();
    $('map-stack').querySelectorAll('.map-layer').forEach(b=>b.classList.toggle('on',F.layer.has(b.dataset.k)));
  }
  function chips(id,list,set,label){
    const el=$(id);el.innerHTML='<span class="lbl">'+label+'</span>'+list.map(([k,t])=>'<button data-k="'+esc(k)+'">'+esc(t)+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;set.has(k)?set.delete(k):set.add(k);b.classList.toggle('on',set.has(k));draw()});
  }
  M.selectTool=function(id){if(!M.byId[id])return;F.layer.clear();F.lc.clear();F.dep.clear();F.status.clear();F.q='';$('map-f-q').value='';
    document.querySelectorAll('#t-map .map-filt button.on').forEach(b=>b.classList.remove('on'));sel=id;draw();
    const d=$('map-det');d.scrollIntoView({block:'nearest',behavior:M.RM?'auto':'smooth'})};
  function init(){
    const cnt={};D.atlas.forEach(a=>cnt[a.layer]=(cnt[a.layer]||0)+1);
    $('map-stack').innerHTML=M.LAYERS.map(l=>'<button class="map-layer" data-k="'+l[0]+'" style="border-left-color:'+l[3]+'"><b>'+esc(l[1])+'</b><span>'+esc(l[2])+' . '+(cnt[l[0]]||0)+' in the atlas</span></button>').join('');
    $('map-stack').addEventListener('click',e=>{const b=e.target.closest('.map-layer');if(!b)return;const k=b.dataset.k;
      const only=F.layer.size===1&&F.layer.has(k);F.layer.clear();if(!only)F.layer.add(k);
      $('map-f-layer').querySelectorAll('button').forEach(x=>x.classList.toggle('on',F.layer.has(x.dataset.k)));draw();
      if(!only)$('map-s-atlas').scrollIntoView({block:'start',behavior:M.RM?'auto':'smooth'})});
    chips('map-f-layer',M.LAYERS.map(l=>[l[0],l[1]]),F.layer,'Layer');
    chips('map-f-lic',M.LC,F.lc,'Licence');
    chips('map-f-dep',M.DEP,F.dep,'Deployed');
    chips('map-f-status',M.STATUS.map(s=>[s,s]),F.status,'Status');
    $('map-f-q').addEventListener('input',e=>{F.q=e.target.value.trim();draw()});
    $('map-cards').addEventListener('click',e=>{const b=e.target.closest('.map-card');if(b){sel=b.dataset.id;draw();const d=$('map-det');if(d.getBoundingClientRect().top>innerHeight*0.7)d.scrollIntoView({block:'start',behavior:M.RM?'auto':'smooth'})}});
    document.getElementById('t-map').addEventListener('click',e=>{const a=e.target.closest('[data-tool]');if(!a)return;e.preventDefault();M.selectTool(a.dataset.tool)});
    draw();
  }
  init();
})();
