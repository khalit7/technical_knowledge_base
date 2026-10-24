// ---- Reading figures: hero, analysis, LIKE against GIN, the Elasticsearch write path (stepper), filters, hybrid scores,
// where each vector store keeps its data, and the zero-downtime rebuild. Numbers come from SV.facts and SV.* (build_data.py). ----
(function(){
  if(!window.SV||!SV.facts||!document.getElementById('t-read'))return;
  const F=SV.facts,$=id=>document.getElementById(id);
  const draws=[];const reg=f=>{draws.push(f)};

  // ---- hero: one question, two paths inside one Postgres, fused ----
  reg(function hero(){const el=$('svHero');if(!el)return;const W=Math.min(860,RD.width(el)),g=12,cw=(W-g)/2,fs=W<520?11.5:12.5;let s=FG.defs('svHa'),y=0;
    const q=FG.box(0,y,W,'The question: "How do I start investing in shares?"','Find the earlier questions that ask the same thing, among 522,931 stored ones.',{fs,stroke:'var(--acc)',sw:1.6});s+=q.s;y+=q.h+22;
    s+=FG.text(cw/2,y-6,['Words (lexical)'],{fs:12,a:'middle',w:700,fill:'var(--c1)'})+FG.text(cw+g+cw/2,y-6,['Meaning (semantic)'],{fs:12,a:'middle',w:700,fill:'var(--c2)'});
    s+=FG.arrow('svHa',cw/2,q.h,cw/2,y-20)+FG.arrow('svHa',cw+g+cw/2,q.h,cw+g+cw/2,y-20);y+=4;
    const L=[['Analyse','tokenise, drop stop words, stem: invest, share, start'],['Inverted index (GIN)','read 3 postings lists, not every text: '+F.fts_ms+' ms against '+F.like_ms+' ms for LIKE'],['Rank by BM25','rare words count more; nDCG@10 '+F.q_bm25+' (ts_rank, no idf: '+F.q_fts_or+')']];
    const R=[['Embed','all-MiniLM-L6-v2 turns the text into 384 numbers'],['ANN index (HNSW)','walk a graph of neighbours: '+F.hnsw40_p50+' ms against '+F.exact_p50+' ms exact, recall '+F.hnsw40_rec],['Rank by cosine','nearest meaning first; nDCG@10 '+F.vec_q]];
    for(let i=0;i<3;i++){const a=FG.box(0,y,cw,L[i][0],L[i][1],{fs,bar:'var(--c1)'}),b=FG.box(cw+g,y,cw,R[i][0],R[i][1],{fs,bar:'var(--c2)'});const h=Math.max(a.h,b.h);
      s+=FG.box(0,y,cw,L[i][0],L[i][1],{fs,bar:'var(--c1)'}).s.replace('height="'+a.h+'"','height="'+h+'"')+FG.box(cw+g,y,cw,R[i][0],R[i][1],{fs,bar:'var(--c2)'}).s.replace('height="'+b.h+'"','height="'+h+'"');
      y+=h;if(i<2){s+=FG.arrow('svHa',cw/2,y,cw/2,y+16)+FG.arrow('svHa',cw+g+cw/2,y,cw+g+cw/2,y+16);y+=18}}
    s+=FG.arrow('svHa',cw/2,y,W/2-30,y+20)+FG.arrow('svHa',cw+g+cw/2,y,W/2+30,y+20);y+=22;
    const m=FG.box(0,y,W,'Fuse in one SQL statement: reciprocal rank fusion, score = sum of 1 / (60 + rank)','Quora: '+F.hyb_q+', below vectors alone; SciFact: '+F.s_hyb+', above both ('+F.s_bm25+' and '+F.s_vec+'). Fusion helps when both retrievers are comparably strong.',{fs,stroke:'var(--acc)',sw:1.6,fill:'var(--hl)'});
    s+=m.s;y+=m.h;el.innerHTML=RD.svg(W,y+2,s,'One question searched by words and by meaning inside one Postgres, then fused')});

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

// ---- stepper: one document through an Elasticsearch (Lucene) shard ----
(function(){
  if(!document.getElementById('esCard'))return;const $=id=>document.getElementById(id);
  // state per step: buf (docs in memory buffer), tl (operations in translog), segs [{n, docs:[[id, deleted]]}], t (seconds), searchable
  const S=[
    {t:0,buf:[],tl:[],segs:[],cap:['An empty shard','Three places matter: an in-memory buffer, the translog on disk, and immutable segments, each a small complete inverted index. Only segments are searched.']},
    {t:0,buf:['d1'],tl:['d1'],segs:[],cap:['Index d1: buffered and logged','The document is analysed into the buffer and appended to the translog, which is fsynced before the write is acknowledged (index.translog.durability: request). It is durable now, but no search can find it.']},
    {t:0.4,buf:['d1','d2','d3'],tl:['d1','d2','d3'],segs:[],cap:['More writes, still invisible','d2 and d3 arrive. A search sent now returns none of the three: they are not in any segment yet.']},
    {t:1.0,buf:[],tl:['d1','d2','d3'],segs:[{n:'S1',docs:[['d1'],['d2'],['d3']]}],cap:['Refresh (every 1 s by default): a new segment','The buffer is written as segment S1 and opened for search. This is near real-time: a write appears about a second after it was acknowledged. Refresh runs only on shards searched in the last 30 s.']},
    {t:1.6,buf:["d2'"],tl:['d1','d2','d3',"d2'"],segs:[{n:'S1',docs:[['d1'],['d2',1],['d3']]}],cap:['Update d2: a delete mark plus a new document','Segments are never edited. The old d2 is marked dead in S1\'s deletion bitset and the new version goes to the buffer. The dead d2 still counts in the idf statistics, so scores drift a little.']},
    {t:2.0,buf:[],tl:['d1','d2','d3',"d2'"],segs:[{n:'S1',docs:[['d1'],['d2',1],['d3']]},{n:'S2',docs:[["d2'"]]}],cap:['Next refresh: a second segment','A search now reads S1 and S2 and merges their results. Many small segments mean many lookups per query.']},
    {t:9,buf:[],tl:['d1','d2','d3',"d2'"],segs:[{n:'S3',docs:[['d1'],['d3'],["d2'"]]}],cap:['Background merge drops the dead document','The merge policy (TieredMergePolicy) combines small segments into a bigger one and only now removes the deleted d2. The LSM-tree write pattern: write new files, merge later.']},
    {t:30,buf:[],tl:[],segs:[{n:'S3',docs:[['d1'],['d3'],["d2'"]]}],cap:['Flush: a Lucene commit, the translog trimmed','Segments are fsynced in a Lucene commit and the translog, no longer needed for recovery, starts again empty. After a crash, the shard replays only the translog written since the last commit.']}];
  function draw(i){const st=S[i],el=$('esFig'),W=Math.min(760,RD.width(el)),fs=12;let s='',y=0;
    const lane=(title,sub,items,kind)=>{const ll=FG.wrap(title+': '+sub,W-16,fs);s+=FG.text(0,y+fs,ll,{fs,fill:'var(--mute)'});y+=ll.length*16+4;
      const h=kind==='seg'?64:34;s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+h+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';let x=8;
      if(kind==='seg'){items.forEach(sg=>{const w=sg.docs.length*40+18;s+='<rect x="'+x+'" y="'+(y+6)+'" width="'+w+'" height="'+(h-12)+'" rx="6" fill="var(--bg)" stroke="var(--c1)" stroke-width="1.4"/>'+RD.t(x+6,y+19,sg.n,{fs:11,w:700,fill:'var(--c1)'});
          sg.docs.forEach((d,j)=>{const dx=x+9+j*40;s+='<rect x="'+dx+'" y="'+(y+26)+'" width="34" height="22" rx="4" fill="'+(d[1]?'var(--bg)':'var(--hl)')+'" stroke="'+(d[1]?'var(--bad)':'var(--line)')+'"/>'+RD.t(dx+17,y+41,FG.esc(d[0]),{a:'middle',fs:11.5,fill:d[1]?'var(--mute)':'var(--ink)'});
            if(d[1])s+='<line x1="'+(dx+3)+'" x2="'+(dx+31)+'" y1="'+(y+37)+'" y2="'+(y+37)+'" stroke="var(--bad)" stroke-width="1.4"/>'});x+=w+8});
        if(!items.length)s+=RD.t(12,y+37,'no segments yet',{fs:11.5,fill:'var(--mute)'})}
      else{items.forEach(d=>{s+='<rect x="'+x+'" y="'+(y+6)+'" width="34" height="22" rx="4" fill="var(--bg)" stroke="var(--line)"/>'+RD.t(x+17,y+21,FG.esc(d),{a:'middle',fs:11.5});x+=40});if(!items.length)s+=RD.t(12,y+22,'empty',{fs:11.5,fill:'var(--mute)'})}
      y+=h+10};
    lane('In-memory buffer','analysed, not searchable',st.buf,'doc');lane('Translog on disk','durable, replayed after a crash',st.tl,'doc');lane('Segments','immutable, searchable',st.segs,'seg');
    el.innerHTML=RD.svg(W,y,s,'Elasticsearch shard: buffer, translog and segments');
    $('esCap').innerHTML='<div class="t">'+st.cap[0]+'</div><p>'+st.cap[1]+'</p>';
    const live=new Set();st.segs.forEach(sg=>sg.docs.forEach(d=>{if(!d[1])live.add(d[0])}));
    $('esCnt').innerHTML=RD.stat('Clock','t = '+st.t+' s','illustrative')+RD.stat('Searchable documents',live.size?[...live].join(', '):'none','')+RD.stat('Segments a search reads',st.segs.length,'')}
  const A=RD.anim({card:'esCard',ctl:'esCtl',n:S.length,draw,ms:2200,label:'Write path step'});
  RD.onResize(()=>A.redraw());
})();
