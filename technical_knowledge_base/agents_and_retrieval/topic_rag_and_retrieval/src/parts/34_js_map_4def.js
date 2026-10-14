// ---- Tool map: same query through ten tools, defaults against one knob turned (before/after on the same input) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc,X=D.defaults,R=M.run;
  const f3=x=>Number(x).toFixed(3);
  // rows: [tool id in atlas, label, default run key, tuned run key, caption default, caption tuned]
  const ROWS=[
    ['faiss','FAISS Flat (exact)','faiss_flat','faiss_flat','The reference: the question is compared with all 5,183 vectors. Every other row is scored against this one.','Unchanged: exact search has no knob.'],
    ['qdrant','Qdrant client, local mode','qdrant_local','qdrant_local','Local mode is a NumPy scan over every vector (qdrant_client/local/local_collection.py), so it is exact. The Qdrant server would use HNSW.','Unchanged: there is no index to tune in local mode.'],
    ['milvus','Milvus Lite','milvus_lite','milvus_lite','Reports AUTOINDEX, scans flat: exact.','Unchanged: Lite scans flat whatever index you ask for.'],
    ['lancedb','LanceDB, no index','lance_noindex','lance_noindex','A table without an index is scanned in full: exact.','Unchanged.'],
    ['chroma','Chroma (HNSW)','chroma_def','chroma_def','HNSW with ef_search 100: the graph walk keeps 100 candidates, wide enough for nearly every question here.','Unchanged: the default is already wide.'],
    ['usearch','USearch (HNSW)','usearch_def','usearch_def','HNSW with expansion_search 64.','Unchanged.'],
    ['faiss','FAISS HNSW (M 32)','faiss_hnsw_def','faiss_hnsw_ef64','efSearch 16: the walk keeps only 16 candidates, so some true neighbours are never reached.','efSearch 64: four times the candidates, nearly exact.'],
    ['hnswlib','hnswlib (M 16)','hnswlib_def','hnswlib_ef100','ef 10: the narrowest default here; the walk keeps exactly 10 candidates for a top 10.','ef 100: nearly exact.'],
    ['lancedb','LanceDB create_index()','lance_ivfpq_def','lance_ivfpq_refine','IVF_PQ: vectors grouped into clusters and each compressed to a short code, so the final order inside the shortlist is approximate.','refine_factor 10: fetch 100 candidates by code, re-score them with the full vectors, keep the best 10.'],
    ['faiss','FAISS IVF-Flat (72 clusters)','faiss_ivf_def','faiss_ivf_np8','nprobe 1: only the single nearest cluster is searched; neighbours that fell in the cluster next door are lost.','nprobe 8: eight clusters searched; most neighbours are back.']];
  if(R.pg_hnsw_def){ROWS.push(['pgvector','pgvector HNSW (server)','pg_hnsw_def','pg_hnsw_ef100','pgvector '+R.pg_hnsw_def.cfg.extversion+' in Docker, HNSW with m 16, ef_construction 64 and hnsw.ef_search '+R.pg_hnsw_def.cfg.ef_search+' (the defaults).','hnsw.ef_search 100.'])}
  if(R.qd_server_def){const c=R.qd_server_def.cfg;ROWS.push(['qdrant','Qdrant server','qd_server_def','qd_server_hnsw','Qdrant 1.19.2 in Docker, all defaults: no vector was indexed ('+c.indexed_vectors+' indexed), because these 5,183 vectors (about 8 MB) are under the default indexing_threshold of '+c.indexing_threshold_kb+' KB; and even with the graph built, the planner scans any segment under full_scan_threshold ('+c.full_scan_threshold_kb+' KB). So the server is exact here, like local mode.','HNSW built and full_scan_threshold set to its minimum (10 KB), so the query walks the graph with the default search breadth. With hnsw_ef 16 it returns '+R.qd_server_hnsw_ef16.ann_recall10.toFixed(3)+' (in the table).'])}
  let qi=0,mode='def',step=0,A=null;
  function key(r){return mode==='def'?r[2]:r[3]}
  function draw(i){
    step=i;const S=X.show[qi],ex=new Set(S.exact),rel=new Set(S.rel);
    $('map-def-rows').innerHTML=ROWS.map((r,j)=>{const run=R[key(r)];const L=S.lists[key(r)]||[];
      const hit=L.filter(x=>ex.has(x)).length;
      const cells=L.map((x,k)=>'<i class="'+(ex.has(x)?'hit':'miss')+(rel.has(x)?' rel':'')+'" data-d="'+x+'" data-r="'+(k+1)+'" title="rank '+(k+1)+'"></i>').join('');
      return '<div class="map-row'+(j===i?' now':j>i?' dim':'')+'" data-j="'+j+'"><span class="lb">'+esc(r[1])+(mode==='tun'&&r[2]!==r[3]?' <span class="mute small">(tuned)</span>':'')+'</span><span class="map-cells">'+(j<=i?cells:'<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>')+'</span><span class="v">'+(j<=i?hit+'/10':'')+'</span></div>'}).join('');
    const r=ROWS[i],run=R[key(r)],L=S.lists[key(r)];
    $('map-def-c1').textContent=L.filter(x=>ex.has(x)).length+' of 10';
    $('map-def-c2').textContent=f3(run.ann_recall10);$('map-def-c2d').textContent=r[1]+(mode==='tun'&&r[2]!==r[3]?' (tuned)':'');
    $('map-def-c3').textContent=f3(run.ndcg10);$('map-def-c3d').textContent='exact search: '+f3(X.exact_ndcg10);
    $('map-def-cap').innerHTML='<b>'+esc(r[1])+'.</b> '+esc(mode==='def'?r[4]:r[5]);
  }
  function setQ(){const S=X.show[qi];$('map-def-qt').innerHTML='<b>Question '+esc(S.qid)+':</b> '+esc(S.text)+' <span class="mute">('+S.rel.length+' abstract'+(S.rel.length>1?'s':'')+' labelled relevant)</span>';draw(step)}
  function table(){
    const tb=$('map-def-tab').querySelector('tbody');
    const idx=r=>{const c=r.cfg||{};if(r.key==='faiss_flat')return 'Flat';if(r.key.indexOf('hnsw')>=0||r.key==='chroma_def'||r.key==='usearch_def')return 'HNSW '+Object.entries(c).filter(([k])=>/ef|M|connectivity|expansion|max_neighbors/i.test(k)).map(([k,v])=>k+' '+v).join(', ');
      if(r.key.indexOf('ivf')>=0&&r.lib==='faiss')return 'IVF-Flat nlist '+c.nlist+', nprobe '+c.nprobe;if(r.key==='lance_ivfpq_def')return 'IVF_PQ (default)';if(r.key==='lance_ivfpq_refine')return 'IVF_PQ, refine_factor 10';
      if(r.key==='lance_noindex')return 'none (scan)';if(r.key==='qdrant_local')return 'none (NumPy scan)';if(r.key==='milvus_lite')return 'AUTOINDEX reported, flat scan';if(r.key.indexOf('pg_')===0)return 'HNSW m 16, ef_construction 64, ef_search '+c.ef_search;if(r.key==='qd_server_def')return c.indexed_vectors?'HNSW':'none (under indexing_threshold '+c.indexing_threshold_kb+' KB): scan';if(r.key==='qd_server_idx_scan')return 'HNSW built, but scanned (under full_scan_threshold '+c.full_scan_threshold_kb+' KB)';if(r.key.indexOf('qd_server_hnsw')===0)return 'HNSW m 16, ef_construct 100, full_scan_threshold 10 KB'+(c.hnsw_ef!=null?', hnsw_ef '+c.hnsw_ef:'');return ''};
    const tool={faiss:'faiss',hnswlib:'hnswlib',usearch:'usearch',chromadb:'chroma','qdrant-client':'qdrant',qdrant:'qdrant',pgvector:'pgvector',lancedb:'lancedb',pymilvus:'milvus'};
    tb.innerHTML=X.runs.map(r=>'<tr data-k="'+esc(tool[r.lib]||'')+'"><td>'+esc(r.label)+'</td><td>'+esc(idx(r))+'</td><td class="n">'+f3(r.ann_recall10)+'</td><td class="n">'+f3(r.ndcg10)+'</td><td class="n">'+f3(r.recall10)+'</td></tr>').join('');
    tb.addEventListener('click',e=>{const t=e.target.closest('tr[data-k]');if(t&&t.dataset.k)M.selectTool(t.dataset.k)});
  }
  function init(){
    $('map-def-q').innerHTML=X.show.map((s,i)=>'<option value="'+i+'">'+esc(s.qid+': '+(s.text.length>70?s.text.slice(0,s.text.lastIndexOf(' ',66))+' ...':s.text))+'</option>').join('');
    $('map-def-q').addEventListener('change',e=>{qi=+e.target.value;setQ()});
    $('map-def-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('map-def-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;draw(step)});
    $('map-def-rows').addEventListener('click',e=>{const c=e.target.closest('i[data-d]');if(!c)return;const d=c.dataset.d,S=X.show[qi];
      $('map-def-tip').innerHTML='Rank '+c.dataset.r+': <b>'+esc(X.docs[d]||'')+'</b> '+(S.exact.indexOf(+d)>=0?'(exact rank '+(S.exact.indexOf(+d)+1)+')':'(not in the exact top 10)')+(S.rel.indexOf(+d)>=0?', labelled relevant':'')});
    $('map-def-ver').textContent=Object.entries(X.versions).filter(([k,v])=>v&&k!=='numpy').map(([k,v])=>k+' '+v).join(', ');
    A=M.anim({n:ROWS.length,draw:i=>draw(i),ms:1700,play:'map-def-play',back:'map-def-back',fwd:'map-def-fwd',scrub:'map-def-scrub',speed:'map-def-speed',card:'map-def-card'});
    A.reset(ROWS.length,M.RM?ROWS.length-1:0);setQ();table();
    M.predict('map-pr1','c',()=>'FAISS IVF at nprobe 1 returned '+f3(R.faiss_ivf_def.ann_recall10)+' of the exact top 10 on average, then LanceDB IVF_PQ '+f3(R.lance_ivfpq_def.ann_recall10)+', hnswlib '+f3(R.hnswlib_def.ann_recall10)+' and Chroma '+f3(R.chroma_def.ann_recall10)+'. Play the animation below for one question at a time.');
  }
  init();
})();
