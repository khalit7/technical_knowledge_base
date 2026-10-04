// ---- Section 7 (time series): measured table, the partition plan, the cardinality calculator ----
(function(){
  const T=NQ.ts; if(!T)return;
  const el=id=>document.getElementById(id), f0=n=>Math.round(n).toLocaleString('en-US'), mb=b=>(b/1048576).toFixed(b<1048576?2:0)+' MB';
  const g=T.pg, d=T.duckdb;
  const row=(a,b,c)=>'<tr><td>'+a+'</td><td>'+b+'</td><td>'+c+'</td></tr>';
  el('rd-ts').innerHTML='<table><tr><th>Task</th><th>One big table</th><th>Daily partitions (or a rollup)</th></tr>'+
    row('Insert '+f0(g.rows)+' rows',g.insert_plain.s+' s',g.insert_part.s+' s')+
    row('Last hour, per minute and model',g.last_hour.plain.ms+' ms, '+f0(g.last_hour.plain.buffers)+' page reads',g.last_hour.part.ms+' ms, '+f0(g.last_hour.part.buffers)+' page reads (one partition)')+
    row('30-day hourly chart',f0(g.chart_raw.ms)+' ms, '+f0(g.chart_raw.buffers)+' page reads','rollup: '+g.chart_rollup.ms+' ms, '+f0(g.chart_rollup.buffers)+' page reads; DuckDB on Parquet: '+d.chart_ms+' ms')+
    row('Delete the oldest 7 days','<code>DELETE</code>: '+g.retention_delete.s+' s, '+mb(g.retention_delete.wal_bytes)+' of WAL; table still '+mb(g.size_after_vacuum)+' after VACUUM','<code>DROP TABLE</code> x 7: '+g.retention_drop.s+' s, '+f0(g.retention_drop.wal_bytes)+' bytes of WAL')+
    row('Index on ts','B-tree '+mb(g.size.btree_ts),'BRIN '+(g.size.brin_ts/1024).toFixed(0)+' KB')+
    row('Size of the rows','heap '+mb(g.size.plain_heap)+' for '+f0(g.rows)+' rows ('+(g.size.plain_heap/g.rows).toFixed(0)+' bytes each)','Parquet, zstd: '+mb(d.parquet_bytes)+' for '+f0(d.rows)+' rows ('+(d.parquet_bytes/d.rows).toFixed(1)+' bytes each)')+'</table>'+
    '<p class="small mute">PostgreSQL 16.2 server times (medians); DuckDB '+d.version+' wall time. Partition pruning reads one day\'s partition; for the last hour the plain table\'s B-tree is just as quick, the partitions pay off for retention and for scans of a few days.</p>';
  el('rd-ts-plan').textContent=g.last_hour_plan_part+'\n\n(the bounds print in the server\'s time zone, Europe/London, UTC+1 in September: 00:00+01 is 23:00 UTC)';
  const ids=['h','m','r','s'];
  function c(){
    let n=1; ids.forEach(k=>{const v=+el('rd-c-'+k).value;el('rd-c-'+k+'-v').textContent=v;n*=v});
    const u=el('rd-c-u').checked; if(u)n*=100000;
    const spd=n*86400/15, disk=spd*2;
    const fb=b=>b>=1e12?(b/1e12).toFixed(1)+' TB':b>=1e9?(b/1e9).toFixed(1)+' GB':(b/1e6).toFixed(1)+' MB';
    el('rd-c-out').innerHTML=RD.stat('Series per metric',f0(n),u?'<span style="color:var(--bad)">the user label multiplies everything by 100,000</span>':'')+
      RD.stat('Samples a day',f0(spd),'one every 15 s per series')+RD.stat('Disk a day',fb(disk),'at 2 bytes per sample')+RD.stat('Disk for 15 days',fb(disk*15),'the default retention');
  }
  ids.forEach(k=>el('rd-c-'+k).addEventListener('input',c)); el('rd-c-u').addEventListener('change',c); c();
})();
