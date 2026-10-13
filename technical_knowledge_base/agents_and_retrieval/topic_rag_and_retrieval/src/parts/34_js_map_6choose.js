// ---- Tool map: which store (rules of thumb over the atlas facts; every reason names its card) ----
(function(){
  const M=window.MAP,$=M.$,esc=M.esc;
  const C=['pgvector','qdrant','milvus','weaviate','elasticsearch','opensearch','vespa','lancedb','chroma','pinecone','turbopuffer','redis','faiss'];
  const MANAGED={qdrant:'Qdrant Cloud',milvus:'Zilliz Cloud',weaviate:'Weaviate Cloud',elasticsearch:'Elastic Cloud',opensearch:'Amazon OpenSearch Service',vespa:'Vespa Cloud',chroma:'Chroma Cloud',lancedb:'LanceDB Cloud',redis:'Redis Cloud',pgvector:'most managed Postgres services'};
  // rule: [question, answer, store, points, reason]; a points value of -99 excludes
  const RULES=[
    ['size','s','chroma',2,'Under a million vectors an embedded store is enough, and Chroma is the zero-setup one.'],
    ['size','s','lancedb',2,'Embedded, no server; fine at this size.'],
    ['size','s','pgvector',2,'At this size the HNSW index fits easily in one Postgres server\'s memory.'],
    ['size','s','faiss',1,'A library is enough if you keep ids and metadata yourself.'],
    ['size','m','pgvector',1,'Fits one server if the index fits in memory; check the memory arithmetic on the Search and vector databases page.'],
    ['size','m','qdrant',1,'One node or a small cluster handles this range.'],
    ['size','m','weaviate',1,'One node or a small cluster handles this range.'],
    ['size','l','milvus',2,'Built as a distributed system, with disk (DISKANN) and GPU indexes for large collections.'],
    ['size','l','vespa',2,'Built for large production search clusters.'],
    ['size','l','turbopuffer',2,'Object storage keeps the cost of large, mostly cold data low (vendor\'s design claim).'],
    ['size','l','pinecone',2,'Serverless storage on object storage; capacity is the vendor\'s problem.'],
    ['size','l','qdrant',1,'Sharded clusters; quantisation cuts memory.'],
    ['size','l','pgvector',-1,'Beyond one server\'s memory plain pgvector strains; pgvectorscale (DiskANN-style, on SSD) is the in-Postgres option.'],
    ['size','l','chroma',-2,'Single-node Chroma is for small collections (Chroma Cloud uses a different index, SPANN).'],
    ['size','l','redis',-2,'Priced by RAM.'],
    ['size','x','milvus',3,'Distributed, with disk and GPU indexes: the design target for billions.'],
    ['size','x','vespa',2,'Large clusters, disk-backed attributes.'],
    ['size','x','turbopuffer',2,'Object-storage design.'],
    ['size','x','pgvector',-3,'One Postgres server will not hold a billion-vector HNSW index in memory.'],
    ['size','x','chroma',-3,'Not designed for this scale on a single node.'],
    ['size','x','redis',-3,'Priced by RAM.'],
    ['size','x','lancedb',1,'Files on object storage scale with the bucket; IVF_PQ compresses.'],
    ['home','pg','pgvector',3,'Vectors in the same rows, transactions and backups as the data they describe; joins and WHERE clauses for free.'],
    ['home','es','elasticsearch',3,'Add a dense_vector field to the index you already run and fuse with the RRF retriever.'],
    ['home','es','opensearch',3,'Add a knn_vector field to the index you already run.'],
    ['home','obj','lancedb',3,'Reads and writes Lance files directly on object storage, versioned.'],
    ['home','obj','turbopuffer',2,'Every namespace lives on object storage.'],
    ['home','redis','redis',3,'The data is already in memory there; FLAT, HNSW or SVS-VAMANA indexes on top.'],
    ['filt','sel','qdrant',2,'Filters are evaluated during the graph walk, extra links keep filtered regions connected, and a planner switches to a scan for tiny filters.'],
    ['filt','sel','weaviate',2,'ACORN filtering is the default since 1.34.'],
    ['filt','sel','vespa',1,'Pre or post filtering chosen by threshold, plus ACORN-1-style filtering.'],
    ['filt','sel','pgvector',-1,'Filters run after the index scan; iterative scans (since 0.8.0) help, but very selective filters are pgvector\'s weak spot (see the Search and vector databases page).'],
    ['filt','sel','faiss',-1,'Only ID selectors: you build filtering yourself.'],
    ['filt','ten','weaviate',2,'Multi-tenancy with a shard per tenant.'],
    ['filt','ten','pinecone',2,'Namespaces per tenant.'],
    ['filt','ten','turbopuffer',2,'Namespaces per tenant on object storage, many of them cold.'],
    ['filt','ten','qdrant',1,'A payload-indexed tenant field.'],
    ['filt','ten','pgvector',1,'Partitions or partial indexes per large tenant; row-level security for access.'],
    ['hyb','yes','weaviate',2,'BM25 plus vectors in one query, built in.'],
    ['hyb','yes','elasticsearch',2,'BM25 is the native ranking; an RRF retriever fuses it with kNN.'],
    ['hyb','yes','opensearch',2,'Hybrid query with a normalization or RRF processor.'],
    ['hyb','yes','vespa',2,'Text, vectors and learned ranking in one ranking expression.'],
    ['hyb','yes','qdrant',1,'Dense plus sparse vectors fused with RRF or DBSF in the Query API.'],
    ['hyb','yes','milvus',1,'Built-in BM25 full-text search fused with dense results.'],
    ['hyb','yes','lancedb',1,'BM25 full-text index plus vectors, RRF by default.'],
    ['hyb','yes','pinecone',1,'Sparse-dense vectors or separate indexes with RRF; full-text search with BM25.'],
    ['hyb','yes','chroma',-1,'Hybrid search with RRF is documented for Chroma Cloud\'s Search API, not the single-node store.'],
    ['hyb','yes','faiss',-2,'No text search at all.'],
    ['ops','none','pinecone',3,'Managed only: nothing to operate.'],
    ['ops','none','turbopuffer',3,'Managed only: nothing to operate.'],
    ['ops','none','faiss',-3,'A library: someone has to build and run the service around it.'],
    ['ops','plat','milvus',2,'Its many components pay off when a platform team runs them.'],
    ['ops','plat','vespa',2,'Its configuration model pays off when search is a product.'],
    ['ops','small','qdrant',1,'One binary, one container.'],
    ['ops','small','milvus',-1,'Standalone is one container, but Distributed is many components on Kubernetes.'],
    ['con','self','pinecone',-99,'Managed service only.'],
    ['con','self','turbopuffer',-99,'Managed service only.'],
    ['con','emb','lancedb',3,'Embedded by design.'],
    ['con','emb','chroma',3,'Embedded by design.'],
    ['con','emb','faiss',2,'A library in your process.'],
    ['con','emb','qdrant',0,'Qdrant Edge is the embedded option; the Python client\'s local mode is an exact scan for development only.'],
    ['con','perm','pinecone',-99,'Proprietary service.'],
    ['con','perm','turbopuffer',-99,'Proprietary service.'],
    ['con','perm','elasticsearch',-3,'AGPL, SSPL or Elastic License: OpenSearch is the Apache-2.0 alternative.'],
    ['con','perm','redis',-3,'Redis 8 is AGPL, SSPL or RSALv2.']];
  ['pgvector','qdrant','milvus','weaviate','elasticsearch','opensearch','vespa','redis'].forEach(s=>RULES.push(['con','emb',s,-3,'A server, not an embedded library.']));
  ['qdrant','milvus','weaviate','elasticsearch','opensearch','vespa','chroma','lancedb','pgvector','redis'].forEach(s=>RULES.push(['ops','none',s,1,'Self-hostable, but '+MANAGED[s]+' can run it for you.']));
  function rec(){
    const q={};$('map-ch-sel').querySelectorAll('select').forEach(s=>q[s.dataset.q]=s.value);
    const sc={};C.forEach(s=>sc[s]={p:0,r:[],x:false});
    RULES.forEach(([k,v,s,p,why])=>{if(q[k]!==v)return;if(p===-99){sc[s].x=true;sc[s].r.push([p,why]);return}sc[s].p+=p;if(p!==0||why)sc[s].r.push([p,why])});
    const ok=C.filter(s=>!sc[s].x).sort((a,b)=>sc[b].p-sc[a].p||C.indexOf(a)-C.indexOf(b));
    const ex=C.filter(s=>sc[s].x);
    const name=s=>(M.byId[s]||{}).name||s;
    const li=(s,r)=>r.map(([p,w])=>'<li>'+(p>0?'+'+p:p===-99?'excluded':p)+': '+esc(w)+'</li>').join('');
    const top=ok.slice(0,3),rest=ok.slice(3);
    let h=top.map((s,i)=>'<div class="map-rec'+(i?' alt':'')+'"><h4>'+(i?'Also consider':'Start with')+': <a href="#" data-tool="'+s+'">'+esc(name(s))+'</a> <span class="mute small">score '+sc[s].p+'</span></h4><ul class="tight">'+(li(s,sc[s].r)||'<li>No question moved it; it stays in the running on general merit.</li>')+'</ul></div>').join('');
    const low=rest.filter(s=>sc[s].p<0);
    if(low.length)h+='<div class="map-rec av"><h4>Probably not, for these answers</h4><ul class="tight">'+low.map(s=>'<li><a href="#" data-tool="'+s+'">'+esc(name(s))+'</a> ('+sc[s].p+'): '+esc(sc[s].r.filter(x=>x[0]<0).map(x=>x[1]).join(' '))+'</li>').join('')+'</ul></div>';
    if(ex.length)h+='<p class="small mute">Excluded by a constraint: '+ex.map(s=>esc(name(s))).join(', ')+'.</p>';
    h+='<p class="small mute">Ties keep the atlas order. Scores are additive points from the rules listed (shown beside each reason), so a +2 and a +2 are not "twice as good": they are two separate reasons. Next step: load a sample of your own vectors into the top two and measure ANN recall@10 and latency at your filter rate, with the knobs set, not the defaults.</p>';
    $('map-ch-out').innerHTML=h;
  }
  $('map-ch-sel').addEventListener('change',rec);
  rec();
})();
