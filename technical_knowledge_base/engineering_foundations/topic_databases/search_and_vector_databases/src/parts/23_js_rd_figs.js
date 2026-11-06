// ---- Reading figures (2D): analysis, LIKE against GIN, filters, hybrid scores,
// where each vector store keeps its data, and the zero-downtime rebuild. Numbers come from SV.facts and SV.* (build_data.py).
// The hero and the write-path stepper became 3D stages on 2026-11-06 (31_js_sc_hero.js, 34_js_sc_es.js). ----
(function(){
  if(!window.SV||!SV.facts||!document.getElementById('t-read'))return;
  const F=SV.facts,$=id=>document.getElementById(id);
  const draws=[];const reg=f=>{draws.push(f)};

  // ---- analysis of the running question, from Postgres ts_debug ----
  reg(function analysis(){const el=$('svAnal');if(!el||!SV.tiny.query_ts_debug)return;const W=Math.min(760,RD.width(el));
    const toks=SV.tiny.query_ts_debug.filter(r=>r[0]!=='blank');const pos={};SV.tiny.query_lexemes.forEach(([lx,p])=>pos[lx]=p[0]);
    let s='',y=4;const chipRow=(label,items)=>{s+=FG.text(0,y+12,FG.wrap(label,W,12),{fs:12,w:600,fill:'var(--mute)'});y+=18+(FG.wrap(label,W,12).length-1)*16;let x=0,rowY=y;
      items.forEach(it=>{const w=it.t.length*7.2+16;if(x+w>W){x=0;rowY+=30}
        s+='<rect x="'+x+'" y="'+rowY+'" width="'+w+'" height="24" rx="6" fill="'+(it.drop?'var(--bg)':'var(--soft)')+'" stroke="'+(it.drop?'var(--line)':it.c||'var(--line)')+'"'+(it.drop?' stroke-dasharray="3 2"':'')+'/>'+
          RD.t(x+8,rowY+16.5,FG.esc(it.t),{fs:12.5,fill:it.drop?'var(--mute)':'var(--ink)',w:it.drop?null:600});
        if(it.drop)s+='<line x1="'+(x+6)+'" x2="'+(x+w-6)+'" y1="'+(rowY+12)+'" y2="'+(rowY+12)+'" stroke="var(--bad)" stroke-width="1.4"/>';x+=w+6});y=rowY+36};
    chipRow('1. Tokenise: the parser cuts the text into words ('+toks.length+' asciiword tokens)',toks.map(r=>({t:r[1]})));
    chipRow('2. Lower-case and drop stop words (the english dictionary returns an empty lexeme)',toks.map(r=>({t:r[1].toLowerCase(),drop:r[2]==='{}'})));
    chipRow('3. Stem with Snowball (english_stem): endings cut, one lexeme per word family',toks.filter(r=>r[2]!=='{}').map(r=>({t:r[1].toLowerCase()+' → '+r[2].slice(1,-1),c:'var(--c1)'})));
    chipRow('4. Stored as a tsvector: lexeme and word position',SV.tiny.query_lexemes.map(([lx,p])=>({t:"'"+lx+"':"+p.join(','),c:'var(--c1)'})));
    el.innerHTML=RD.svg(W,y,s,'The running question through Postgres text analysis')});

  // ---- LIKE scan against the two GIN indexes ----
  reg(function likebars(){const el=$('svLike');if(!el)return;FG.hbars(el,[
    {label:'ILIKE \'%diamond%\', sequential scan, one process ('+F.like_rows+' rows)',v:+F.like_ms,txt:F.like_ms+' ms',col:'var(--bad)'},
    {label:'the same, parallel sequential scan, 3 processes',v:+F.like_par_ms,txt:F.like_par_ms+' ms',col:'var(--bad)'},
    {label:'the same, pg_trgm trigram GIN index (section 5)',v:+F.like_trgm_ms,txt:F.like_trgm_ms+' ms',col:'var(--c3)'},
    {label:'full-text: tsv @@ to_tsquery(\'diamond\'), GIN index ('+F.fts_rows+' rows)',v:+F.fts_ms,txt:F.fts_ms+' ms',col:'var(--c1)',bold:true}],
    {log:true,min:0.1,max:1000,ticks:[0.1,1,10,100,1000],unit:' ms',axis:'median of 5 runs, log scale',label:'LIKE scan against GIN indexes'})});

  // ---- filters in pgvector: recall and rows at 1% and 10% ----
  reg(function filters(){const el=$('svFilt');const A=SV.ann&&SV.ann.filter;if(!el||!A)return;const rows=[];
    const NM={hnsw_post_filter:'HNSW, iterative scan off (post-filter)',hnsw_strict:'HNSW, iterative_scan = strict_order',hnsw_relaxed:'HNSW, iterative_scan = relaxed_order',btree_prefilter_exact:'B-tree on tenant, then exact search (pre-filter)'};
    ['tenant','tenant10'].forEach(c=>{const X=A[c];Object.keys(NM).forEach(k=>{const r=X[k];rows.push({group:(100*X.share_of_rows).toFixed(0)+'% of rows pass the filter',label:NM[k],v:Math.max(.005,r.recall10),
      txt:r.recall10.toFixed(2)+', '+r.rows_mean.toFixed(1)+' rows, '+(r.p50_ms>=10?r.p50_ms.toFixed(0):r.p50_ms.toFixed(1))+' ms',col:k==='hnsw_post_filter'?'var(--bad)':k==='btree_prefilter_exact'?'var(--c3)':'var(--c2)'})})});
    FG.hbars(el,rows,{min:0,max:1.6,ticks:[0,0.5,1],axis:'recall@10 against the exact filtered top 10; then rows returned of 10, median latency',label:'Filtered vector search in pgvector'})});

  // ---- hybrid: nDCG@10 for each retriever on two corpora ----
  reg(function hybrid(){const el=$('svHyb');const R=SV.rel;if(!el||!R)return;const rows=[];
    const NM={fts_and:'Postgres full-text, every word required (ts_rank)',fts_or:'Postgres full-text, any word (ts_rank, no idf)',bm25_pg:'BM25 on the same lexemes',vector:'Vector, exact cosine',rrf_bm25_vec:'Hybrid: RRF of BM25 and vector'};
    [['quora','Quora: duplicates are paraphrases (1,000 questions)'],['scifact','SciFact: claims share rare terms with abstracts (300 claims)']].forEach(([c,gname])=>Object.keys(NM).forEach(k=>{const v=R[c].scores[k].ndcg10;
      rows.push({group:gname,label:NM[k],v,txt:v.toFixed(3),col:k==='rrf_bm25_vec'?'var(--c4)':k==='vector'?'var(--c2)':k==='bm25_pg'?'var(--c1)':'var(--dim)',bold:k==='rrf_bm25_vec'})}));
    FG.hbars(el,rows,{min:0,max:1.12,ticks:[0,0.25,0.5,0.75,1],axis:'nDCG@10 (1 = labelled duplicates ranked first)',label:'nDCG@10 per retriever'})});

  // ---- where each store keeps vectors: RAM, local disk, object storage ----
  reg(function tiers(){const el=$('svTiers');if(!el)return;const W=Math.min(860,RD.width(el)),g=6,cw=(W-2*g)/3,fs=W<520?11:12;let s='',y=0;
    ['Memory (RAM)','Local disk (SSD)','Object storage (S3)'].forEach((h,i)=>{s+=FG.text(i*(cw+g)+cw/2,y+13,FG.wrap(h,cw,12),{fs:12,a:'middle',w:700,fill:'var(--mute)'})});y+=30;
    const S=[['pgvector','HNSW and table pages cached in shared_buffers and the OS cache; fast only when they fit','table, indexes and WAL as ordinary Postgres files',null],
      ['Qdrant','vectors pre-loaded from the memory map by default; payload indexes','vectors in memory-mapped files; payload in Gridstore; an HNSW per segment',null],
      ['Weaviate','the HNSW index of each shard (one shard per tenant)','objects and inverted index in LSM trees; write-ahead logs','offloaded tenants (S3 module)'],
      ['Milvus','query nodes serve loaded segments','metadata in etcd; a log broker for the WAL','segments, logs and index files: the durable copy'],
      ['Turbopuffer','hot cache','NVMe cache of a namespace after its first query','the durable copy: each namespace\'s WAL and indexes under its own prefix']];
    S.forEach(([nm,...c])=>{s+=FG.text(0,y+13,[nm],{fs:13,w:700});y+=19;let hs=c.map((t,i)=>t?FG.box(i*(cw+g),y,cw,null,t,{fs}).h:30),h=Math.max(...hs);
      c.forEach((t,i)=>{if(t){const b=FG.box(i*(cw+g),y,cw,null,t,{fs,fill:i===2?'var(--hl)':'var(--soft)'});s+=b.s.replace('height="'+b.h+'"','height="'+h+'"')}
        else s+='<rect x="'+(i*(cw+g))+'" y="'+y+'" width="'+cw+'" height="'+h+'" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>'+RD.t(i*(cw+g)+cw/2,y+h/2+4,'not used',{a:'middle',fs:11,fill:'var(--mute)'})});y+=h+10});
    el.innerHTML=RD.svg(W,y,s,'Where each vector store keeps its data')});

  // ---- zero-downtime rebuild: old and new side by side, then switch ----
  reg(function rebuild(){const el=$('svRebuild');if(!el)return;const W=Math.min(760,RD.width(el)),pw=W<520?62:84,tw=W-2*pw-38,fs=W<520?11.5:12.5;let s='',y=22;
    s+=RD.t(W-2*pw-4+pw/2,14,'v1 (old)',{a:'middle',fs:11.5,w:700,fill:'var(--mute)'})+RD.t(W-pw+pw/2,14,'v2 (new)',{a:'middle',fs:11.5,w:700,fill:'var(--mute)'});
    const P=[['Create v2 beside v1: a new index with the new mapping or analyser (Elasticsearch), or a new column and CREATE INDEX CONCURRENTLY (pgvector, new model)','serving','empty'],
      ['Backfill v2 (Reindex API, or batched re-embedding); new writes go to both, by dual write or change data capture','serving','filling'],
      ['Compare on labelled queries: recall@10 and nDCG against v1, latency at the same settings','serving','ready'],
      ['Switch atomically: move the alias (Elasticsearch) or the query to the new column','idle','serving'],
      ['Drop v1 once nothing reads it','dropped','serving']];
    const col={serving:'var(--good)',empty:'var(--line)',filling:'var(--c5)',ready:'var(--c2)',idle:'var(--dim)',dropped:'var(--line)'};
    P.forEach((p,i)=>{const ll=FG.wrap(p[0],tw,fs),h=Math.max(28,ll.length*Math.round(fs*1.3)+8);
      s+='<circle cx="11" cy="'+(y+12)+'" r="10" fill="var(--acc2)"/>'+RD.t(11,y+16,String(i+1),{a:'middle',fs:11.5,w:700});
      s+=FG.text(30,y+fs+2,ll,{fs});
      [p[1],p[2]].forEach((st,j)=>{const x=W-2*pw-4+j*(pw+4);s+='<rect x="'+x+'" y="'+(y+2)+'" width="'+pw+'" height="22" rx="11" fill="'+(st==='serving'?'var(--soft)':'var(--bg)')+'" stroke="'+col[st]+'" stroke-width="'+(st==='serving'?2:1.2)+'"'+(st==='dropped'||st==='empty'?' stroke-dasharray="3 2"':'')+'/>'+
        RD.t(x+pw/2,y+17,st,{a:'middle',fs:11,fill:st==='serving'?'var(--ink)':'var(--mute)',w:st==='serving'?600:null})});
      y+=h+6});
    el.innerHTML=RD.svg(W,y,s,'Rebuilding a search index or re-embedding without downtime')});

  function all(){draws.forEach(f=>{try{f()}catch(e){console.error(e)}})}
  RD.onRender(all);RD.onResize(all);all();
})();
