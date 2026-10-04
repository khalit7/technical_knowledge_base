// ---- Section 8: Postgres-side caching, measured (materialised view, Memoize, pg_prewarm) ----
(function(){
  const P=CA.pg;if(!P)return;
  const n=document.getElementById('rd-mv-nums');
  if(n){const m=P.mv;n.innerHTML=RD.stat('Build the view',m.create_s.toFixed(1)+' s','plus '+m.index_s.toFixed(1)+' s for the unique index')+
    RD.stat('Rows stored',m.rows.toLocaleString('en-US'),m.mb+' MB with its index')+
    RD.stat('One user\'s daily usage, live tables',m.raw_query.median_ms.toFixed(1)+' ms','median of 200 random users')+
    RD.stat('The same from the view',m.mv_query.median_ms.toFixed(2)+' ms',Math.round(m.raw_query.median_ms/m.mv_query.median_ms)+'× faster')+
    RD.stat('Heaviest users, live tables',m.raw_heavy.median_ms.toFixed(1)+' ms','p90 '+Math.round(m.raw_heavy.p90_ms)+' ms; view '+m.mv_heavy.median_ms.toFixed(2)+' ms')}
  const mt=document.getElementById('rd-memo-tbl');
  if(mt){const M=P.memo,lab={planner_default:'Planner\'s own choice',nested_loop_memoize:'Nested loop with Memoize (hash and merge joins off)',nested_loop_no_memoize:'Nested loop without Memoize (memoize off too)'};
    mt.innerHTML='<tr><th>Plan</th><th>Nodes</th><th class="num">Median time</th><th class="num">Memoize hits / misses</th></tr>'+
      ['planner_default','nested_loop_memoize','nested_loop_no_memoize'].map(k=>{const r=M[k];return '<tr><td>'+lab[k]+'</td><td class="small">'+r.nodes.join(' &rarr; ')+'</td><td class="num">'+r.ms_median.toFixed(2)+' ms</td><td class="num">'+(r.memoize?r.memoize['Cache Hits'].toLocaleString('en-US')+' / '+r.memoize['Cache Misses']:'none')+'</td></tr>'}).join('')+
      '<tr><td colspan="4" class="small mute">EXPLAIN (ANALYZE) execution time, median of 7 runs after 3 warm-ups, parallel workers off. Memoize peak memory '+M.nested_loop_memoize.memoize['Peak Memory Usage']+' kB.</td></tr>'}
  const wt=document.getElementById('rd-warm-tbl');
  if(wt){const W=P.warm,row=(k,l)=>{const r=W[k];return '<tr><td>'+l+'</td><td class="num">'+r.ms_per_lookup.toFixed(3)+' ms</td><td class="num">'+r.blks_hit.toLocaleString('en-US')+'</td><td class="num">'+r.blks_read.toLocaleString('en-US')+'</td><td class="num">'+Math.round(r.read_ms).toLocaleString('en-US')+' ms</td></tr>'};
    wt.innerHTML='<tr><th>After</th><th class="num">Per lookup</th><th class="num">Blocks found in shared_buffers</th><th class="num">Blocks read from outside</th><th class="num">Time in those reads</th></tr>'+
      row('after_restart','A restart (empty shared_buffers), first pass')+row('second_pass','The same lookups again (warm)')+row('after_prewarm','A restart, then <code>pg_prewarm(\'chats\')</code> and its index ('+W.prewarm.pages.toLocaleString('en-US')+' pages in '+W.prewarm.seconds+' s)')+
      row('after_autoprewarm_restart','A restart with autoprewarm reloading the saved block list ('+Math.round(W.autoprewarm_file_bytes/1024)+' KB file)')}
})();
