// ---- Lab notebook: every recorded step of every run ----
(function(){
  const esc=RD.esc;
  const RUNS=[['pitr','Backups and PITR','pitr.py','A primary with WAL archiving, a nightly dump and a base backup, a day of writes, the bad DELETE, then recovery from the dump and by point-in-time recovery.'],
    ['replication','Replication and failover','replication.py','A streaming replica with a slot; lag under load and with replay paused; synchronous commit levels; a stopped synchronous standby; a stopped replica\'s slot filling pg_wal and the cap that releases it; promotion, split brain and pg_rewind.'],
    ['vacuum','Vacuum','vacuum.py','chat_state churned at 1,500 updates per second: HOT updates, then non-HOT with autovacuum, then a forgotten transaction; VACUUM against VACUUM FULL on messages.'],
    ['wraparound','Wraparound','wraparound.py','A throwaway server moved to just short of the wraparound stop point with pg_resetwal, held back by a forgotten prepared transaction: warning, refusal, diagnosis, fix.'],
    ['connections','Connections and PgBouncer','connections.py','Backend memory, connection setup, max_connections, 1,000 clients through PgBouncer, and the SET and prepared-statement pitfalls of transaction pooling.'],
    ['upgrade','Major upgrade','upgrade.py','16.2 to 17.11 with pg_upgrade (check, copy, link) and with logical replication, including the sequence trap at cutover.'],
    ['monitor','Monitoring and small incidents','monitor.py','A runaway query, timeouts, idle-in-transaction sessions, a migration queued behind a long transaction, and the dashboard views.']];
  const pick=document.getElementById('runs-pick');let cur='pitr';
  pick.innerHTML=RUNS.map(r=>'<button data-m="'+r[0]+'"'+(r[0]===cur?' class="on"':'')+'>'+esc(r[1])+'</button>').join('');
  const m=(window.RPG.pitr||{}).machine||{};
  document.getElementById('runs-machine').textContent='Machine: '+(m.cpu||'')+', '+(m.ram_gb||'')+' GB, run on '+(m.date||'')+'. PostgreSQL 16.2 (pgserver wheel), 17.11 (conda-forge), PgBouncer 1.24.1 (built from source). Each run finishes in under 5 minutes.';
  function draw(){
    const r=RUNS.find(x=>x[0]===cur),R=window.RPG[cur]||{steps:{}};
    document.getElementById('runs-body').innerHTML='<p><b>'+esc(r[2])+'</b>: '+esc(r[3])+'</p>'+Object.keys(R.steps).map(k=>{const s=R.steps[k];
      return '<div class="tr"><div class="h"><b>'+esc(k.replace(/_/g,' '))+'</b><span class="meas">'+(s.secs!=null?'took '+s.secs+' s':'measured')+'</span></div><pre class="term">'+TR.body(cur,k)+'</pre></div>'}).join('');
  }
  RD.seg(pick,v=>{cur=v;draw()});draw();
})();
