// ---- Query plans tab: reading a plan. Node meanings, a plain-words sentence for every node, the psql-style text. ----
window.QP=(function(){
  const D=window.QP_DATA;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const f=n=>(n==null||isNaN(n))?'?':Math.round(n).toLocaleString('en-US');
  const fms=v=>v>=100?f(v):v>=10?v.toFixed(1):v>=1?v.toFixed(2):v.toFixed(3);
  const kb=b=>b>=1073741824?(b/1073741824).toFixed(2)+' GB':b>=1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB';
  const mb=b=>(b/1048576).toFixed(1)+' MB',gb=b=>(b/1073741824).toFixed(2)+' GB';
  // general meaning of each node type, in plain words
  const MEAN={
    'Seq Scan':'Sequential scan: read the table from its first page to its last and check every row. Cheap per page (pages are read in order), expensive when the table is big and you want few rows.',
    'Index Scan':'Walk a B-tree index to the matching entries, in index order, and fetch each matching row from the table. Cheap for few rows; each fetched row may sit on a different table page.',
    'Index Only Scan':'Answer from the index alone, without visiting the table, for rows on pages the visibility map marks as all-visible. "Heap Fetches" counts the rows it still had to check in the table.',
    'Bitmap Index Scan':'Search an index and, instead of fetching rows one by one, collect the locations of all matches into a bitmap (a list of table pages).',
    'Bitmap Heap Scan':'Fetch the table pages listed in the bitmap from the node below, in physical order and each page once, then re-check the condition on their rows. The middle ground between an index scan and a sequential scan.',
    'Nested Loop':'Join: for each row of the first (outer) input, run the second (inner) input once and keep the pairs that match. Great when the outer side is small and the inner side is an index lookup; terrible when both are big.',
    'Hash Join':'Join: build a hash table from one input (the Hash node below it), then stream the other input past it and look each row up. Good for big unsorted inputs; needs memory for the hash table.',
    'Hash':'Build the in-memory hash table that the Hash Join above uses, keyed on the join column.',
    'Merge Join':'Join: both inputs arrive sorted on the join key, so walk them side by side like a zipper, matching as it goes. No hash table and no repeated lookups.',
    'Memoize':'A cache in front of the inner side of a nested loop: when the same key comes again, reuse the previous lookup\'s result instead of repeating it.',
    'Aggregate':'Compute totals (count, sum, average) over the rows coming in, either one total for everything or one per group.',
    'Gather':'Parallel query: start worker processes that run the part of the plan below at the same time as the main process, each on a share of the pages, and collect their rows.',
    'Gather Merge':'Like Gather, but each worker\'s rows are already sorted and the merge keeps them in order.',
    'Sort':'Sort the incoming rows. In memory if they fit in work_mem (4 MB here), otherwise on temporary files.',
    'Limit':'Stop after the first N rows. The nodes below stop early too, which is why LIMIT with an index can be so cheap.',
    'SEQ_SCAN':'DuckDB\'s table scan: reads only the columns the query names, a block of values at a time, decompressing as it goes.',
    'TABLE_SCAN':'DuckDB\'s table scan: reads only the columns the query names, a block of values at a time.',
    'HASH_GROUP_BY':'DuckDB\'s grouping: a hash table with one entry per group (per model here), updated a whole vector of about 2,000 values at a time and in parallel threads.',
    'PROJECTION':'DuckDB: pick or compute the output columns.',
    'ORDER_BY':'DuckDB: sort the (four) result rows.'
  };
  const INFO={'Index Cond':'the condition the index answers directly (this is what makes it fast)','Filter':'checked row by row after reading; rows that fail are thrown away',
    'Rows Removed by Filter':'rows read and thrown away (per loop)','Heap Fetches':'rows checked in the table because their page was not marked all-visible',
    'Recheck Cond':'condition re-checked on each fetched row','Hash Cond':'how rows are matched','Merge Cond':'how rows are matched','Sort Key':'sorted by',
    'Group Key':'one group per value of','Workers Launched':'extra processes that actually started','Workers Planned':'extra processes the planner asked for',
    'Exact Heap Blocks':'table pages fetched','Peak Memory Usage':'memory used, kB','Hash Buckets':'hash table buckets','Hash Batches':'batches (1 means it fitted in memory)',
    'Cache Hits':'lookups answered from the cache','Cache Misses':'lookups that had to run','Strategy':'how totals are kept','Partial Mode':'parallel step'};
  // number the nodes and attach parents
  function prep(root){let n=0;(function walk(x,p,d){x.id=n++;x.par=p;x.d=d;(x.k||[]).forEach(c=>walk(c,x,d+1))})(root,null,0);return root}
  const kids=x=>x.k||[];
  const own=(x,k)=>Math.max(0,(x[k]||0)-kids(x).reduce((s,c)=>s+(c[k]||0),0));
  const pages=x=>(x.hit||0)+(x.rd||0);
  const ownPages=x=>own(x,'hit')+own(x,'rd');
  function workers(x){for(let p=x;p;p=p.par){const w=(p.i||[]).find(a=>a[0]==='Workers Planned');if(w)return w[1]}return 0}
  // PostgreSQL's parallel divisor: workers plus the main process's share (1 - 0.3 per worker, never below 0)
  const divisor=w=>w?w+Math.max(0,1-0.3*w):1;
  const inGather=x=>{for(let p=x.par;p;p=p.par)if(p.t==='Gather'||p.t==='Gather Merge')return true;return false};
  // estimated rows in total: per loop times loops for repeated inner nodes; times the parallel divisor below a Gather
  const estTotal=x=>{const g=inGather(x),procs=g?workers(x)+1:1;return (x.lp||1)>procs?x.er*x.lp:g?x.er*divisor(workers(x)):x.er};
  function info(x,k){const a=(x.i||[]).find(a=>a[0]===k);return a?a[1]:null}
  function on(x){return x.idx?(x.rel?' using '+x.idx+' on '+x.rel:' on '+x.idx):x.rel?' on '+x.rel:''}
  function name(x){return (x.pa?'Parallel ':'')+(x.t==='Aggregate'&&info(x,'Partial Mode')&&info(x,'Partial Mode')!=='Simple'?info(x,'Partial Mode')+' ':'')+(x.t==='Aggregate'&&info(x,'Strategy')==='Hashed'?'Hash':x.t==='Aggregate'&&info(x,'Strategy')==='Sorted'?'Group':'')+x.t}
  const totalRows=x=>x.ar*(x.lp||1);
  function off(x){if(x.ar==null||x.er==null)return null;const a=Math.max(x.ar,0.5),e=Math.max(x.er,0.5);if(x.ar===0&&x.er<=1)return null;const r=a>e?a/e:e/a;return {r,under:a>e}}
  // one plain-words sentence per node, with this run's numbers
  function sentence(x){
    if(x.duck)return duckSentence(x);
    const T=totalRows(x),L=x.lp||1,par=x.pa?' split across '+L+' processes,':'',per=L>1&&!x.pa?' It ran '+f(L)+' times, once per row from the outer side.':'';
    const pg=ownPages(x),pgs=pg?' ('+f(pg)+' page visits of its own'+(own(x,'rd')?', '+f(own(x,'rd'))+' asked of the OS':'')+')':'';
    const rr=info(x,'Rows Removed by Filter'),flt=info(x,'Filter'),ic=info(x,'Index Cond'),hf=info(x,'Heap Fetches');
    switch(x.t){
      case 'Seq Scan':return 'Read every page of '+x.rel+par+pgs+(flt?' and tested each row against '+esc(flt)+': kept '+f(T)+', threw away '+f((rr||0)*L)+'.':', producing '+f(T)+' rows.');
      case 'Index Scan':return (ic?'Looked up '+esc(ic)+' in the index '+x.idx:'Walked the whole index '+x.idx+' in order (no condition it can jump to)')+(flt?', checked '+esc(flt)+' on each entry,':'')+' and fetched '+f(T)+(T===1?' row':' rows')+' from '+x.rel+pgs+'.'+per;
      case 'Index Only Scan':return 'Read '+(ic?'the entries matching '+esc(ic):'every entry')+' from the index '+x.idx+' without the table'+(hf?', except '+f(hf*L)+' rows it had to check in the table (Heap Fetches)':', and never touched the table (Heap Fetches 0)')+': '+f(T)+' rows'+pgs+'.'+per;
      case 'Bitmap Index Scan':return 'Searched the index '+x.idx+' for '+esc(ic||'')+' and marked the '+f(T)+' matching row locations in a bitmap'+pgs+'.'+per;
      case 'Bitmap Heap Scan':return 'Fetched the table pages marked in the bitmap from '+x.rel+', each once, and returned '+f(T)+' rows'+pgs+'.'+per;
      case 'Hash':return 'Built a hash table of '+f(T)+' rows'+(info(x,'Peak Memory Usage')?' ('+f(info(x,'Peak Memory Usage'))+' kB'+(info(x,'Hash Batches')>1?', in '+info(x,'Hash Batches')+' batches':'')+')':'')+' from the node below.';
      case 'Hash Join':return 'Streamed its first input past the hash table on '+esc(info(x,'Hash Cond')||'')+par+' and produced '+f(T)+' joined rows.';
      case 'Merge Join':return 'Zipped two inputs sorted on '+esc(info(x,'Merge Cond')||'')+' and produced '+f(T)+' joined rows.';
      case 'Nested Loop':{const inner=kids(x)[1];return 'For each of the '+f(totalRows(kids(x)[0]))+' rows from its first input, ran its second input'+(inner?' ('+inner.t+')':'')+' once'+par+'; produced '+f(T)+' rows.'}
      case 'Memoize':return 'Cached inner lookups: '+f(info(x,'Cache Hits'))+' answered from the cache, '+f(info(x,'Cache Misses'))+' run for real.';
      case 'Aggregate':{const pm=info(x,'Partial Mode'),gk=info(x,'Group Key');return (pm==='Partial'?'Each process computed its own partial totals':pm==='Finalize'?'Combined the partial totals from the processes':'Computed the totals')+(gk?' per '+esc([].concat(gk).join(', ')):'')+': '+f(T)+' result row'+(T===1?'':'s')+'.'+per}
      case 'Gather':case 'Gather Merge':return 'Ran the plan below in '+(info(x,'Workers Launched')||0)+' extra worker process'+(info(x,'Workers Launched')===1?'':'es')+' plus the main one, and collected '+f(T)+' rows'+(x.t==='Gather Merge'?' in sorted order':'')+'.';
      case 'Sort':return 'Sorted '+f(T)+' rows by '+esc([].concat(info(x,'Sort Key')||[]).join(', '))+(info(x,'Sort Method')?' ('+info(x,'Sort Method')+')':'')+'.';
      case 'Limit':return 'Kept the first '+f(T)+' rows and told the nodes below to stop.';
    }
    return x.t+': '+f(T)+' rows.';
  }
  function duckSentence(x){const ex=x.ex||{};
    if(x.t==='SEQ_SCAN'||x.t==='TABLE_SCAN')return 'Read only the columns '+esc((ex.Projections||[]).join(' and '))+' of '+f(x.ar)+' rows of '+esc(String(ex.Table||'messages').split('.').pop())+'. CPU time across threads: '+fms(x.tt)+' ms.';
    if(x.t==='HASH_GROUP_BY')return 'Grouped the '+f(kids(x)[0]?kids(x)[0].ar:0)+' rows into '+f(x.ar)+' groups, computing '+esc((ex.Aggregates||[]).join(', '))+'. CPU time across threads: '+fms(x.tt)+' ms.';
    if(x.t==='ORDER_BY')return 'Sorted the '+f(x.ar)+' result rows by model.';
    if(x.t==='PROJECTION')return 'Picked the output columns '+esc((ex.Projections||[]).join(', '))+' ('+f(x.ar)+' rows).';
    return x.t+': '+f(x.ar)+' rows.'}
  // psql-style text of the plan, rebuilt from the JSON
  function text(v){const out=[];
    (function walk(x,ind){const pre=ind?' '.repeat(ind-6)+'->  ':'';const sub=' '.repeat(ind+2);
      out.push(pre+name(x)+(x.idx&&!x.rel?' on '+x.idx:x.idx?' using '+x.idx+' on '+x.rel+(x.al&&x.al!==x.rel?' '+x.al:''):x.rel?' on '+x.rel+(x.al&&x.al!==x.rel?' '+x.al:''):'')+'  (cost='+x.sc.toFixed(2)+'..'+x.c.toFixed(2)+' rows='+x.er+' width='+x.wd+') (actual time='+x.st.toFixed(3)+'..'+x.tt.toFixed(3)+' rows='+x.ar+' loops='+x.lp+')');
      (x.i||[]).forEach(([k,val])=>{if(k==='Parent Relationship'||k==='Scan Direction'||k==='Inner Unique'||k==='Join Type'||k==='Strategy'||k==='Partial Mode'||k==='Original Hash Buckets')return;
        out.push(sub+k+': '+(Array.isArray(val)?val.join(', '):val))});
      if(pages(x)||x.dt)out.push(sub+'Buffers: shared'+(x.hit?' hit='+x.hit:'')+(x.rd?' read='+x.rd:'')+(x.dt?' dirtied='+x.dt:''));
      if(x.io)out.push(sub+'I/O Timings: shared read='+x.io.toFixed(3));
      kids(x).forEach(c=>walk(c,ind?ind+6:6))})(v.tree,0);
    out.push('Planning Time: '+v.plan_ms.toFixed(3)+' ms');out.push('Execution Time: '+v.exec_ms.toFixed(3)+' ms');
    return out.join('\n')}
  return {D,esc,f,fms,kb,mb,gb,MEAN,INFO,prep,kids,own,pages,ownPages,workers,divisor,estTotal,inGather,info,on,name,totalRows,off,sentence,text};
})();
