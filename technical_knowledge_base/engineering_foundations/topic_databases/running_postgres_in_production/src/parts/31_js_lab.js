// ---- Incident lab: pick an alert, step through diagnosis with real outputs ----
(function(){
  const esc=RD.esc;
  const S=(k,t,run,step,read)=>({k,t,run,step,read});
  const INC=[
    {id:'disk',title:'Disk 95% full',sub:'db-primary, data volume',sec:'rd-s4',page:'ALERT: disk usage on db-primary /var/lib/postgresql is 95% and rising.',
     steps:[
      S('Look','What is big: tables, or the WAL directory?','monitor','biggest,waldir','Tables are a few hundred MB and stable; check pg_wal/ next to them. On a healthy server pg_wal/ stays near max_wal_size (1 GB by default). Much more means something is keeping WAL.'),
      S('Look','Is a replication slot holding WAL?','replication','slot_grow','An inactive slot (active = f) with wal_status extended and gigabytes retained: the replica behind it stopped, and the primary keeps every byte it would need. Also check pg_stat_archiver for a failing archive_command, the other common cause.'),
      S('Fix','Cap the slot (or drop it if the replica is gone for good)','replication','slot_lost','With max_slot_wal_keep_size set, the next checkpoint releases the WAL and the slot is marked lost. pg_wal/ shrinks immediately. If the replica is truly gone, SELECT pg_drop_replication_slot(\'replica1\') does the same.'),
      S('Fix','The price: that replica must be rebuilt','replication','replica_cannot_resume,rebuild','The replica can no longer catch up from the primary\'s WAL; rebuild it with a new base backup (or let it fetch WAL from the archive via restore_command if you keep one).')],
     prevent:'Set max_slot_wal_keep_size; alert on inactive slots and retained WAL; alert on archiver failures; alert on disk at 80%, not 95%.'},
    {id:'lag',title:'Replication lag 10 min',sub:'replica-1 behind the primary',sec:'rd-s4',page:'ALERT: replay_lag on replica-1 has been above 5 minutes for 10 minutes. Reads routed to replica-1 are stale.',
     steps:[
      S('Look','Which of the three lags is growing?','replication','stat_rep_lag','write_lag and flush_lag are milliseconds, replay_lag is seconds and growing: WAL arrives and is saved, but is not being applied. The network and the replica\'s disk are fine; look at replay on the replica.'),
      S('Look','On the replica: is replay paused or blocked?','replication','lag_pause','Here replay had been paused (SELECT pg_is_wal_replay_paused() would say t). In real incidents the usual cause is a long query on the replica conflicting with replay (max_standby_streaming_delay lets it wait up to 30 s per conflict), a replica on smaller hardware, or a write burst on the primary. Check pg_stat_activity on the replica for long queries.'),
      S('Fix','Resume replay, or cancel the long replica queries','replication','lag_pause','Once replay resumes, the backlog drains at disk speed (seconds here). Move long analytic queries to a dedicated replica with its own settings, and stop sending latency-sensitive reads to a lagging replica.')],
     prevent:'Alert on replay_lag; size replicas like the primary; keep long queries off the failover replica; route reads with a lag check.'},
    {id:'conn',title:'Connections at 97%',sub:'max_connections nearly reached',sec:'rd-s8',page:'ALERT: 97 of 100 connections in use on db-primary. Some requests fail with "remaining connection slots are reserved".',
     steps:[
      S('Look','What are the connections doing?','monitor','idle_states','Group pg_stat_activity by state (and by application_name and client_addr in real life). Many idle connections mean oversized app pools; idle in transaction means an app holding transactions open, which also blocks vacuum.'),
      S('Look','What the application sees at the limit','connections','exhaust','Ordinary roles are refused while superuser slots stay free, so you can still log in to fix it.'),
      S('Fix','End stuck transactions, and make it automatic','monitor','idle_timeout','idle_in_transaction_session_timeout ends sessions that sit in an open transaction; the application sees this error and must reconnect.'),
      S('Fix','Put a pooler in front','connections','bouncer_1000','A thousand clients through PgBouncer in transaction mode used twenty server connections.')],
     prevent:'Do the pool arithmetic (pods x pool size x 2 for deploys); use PgBouncer in transaction mode; set idle and statement timeouts per role; alert at 70%.'},
    {id:'bloat',title:'Table 10x its size',sub:'dead tuples climbing',sec:'rd-s6',page:'ALERT: n_dead_tup on chat_state is above 80% of live rows and growing; the table keeps getting bigger.',
     steps:[
      S('Look','Is something holding back cleanup?','vacuum','phase_b_activity','A session idle in transaction for a minute, with a backend_xmin: no row version newer than that can be removed, in any table.'),
      S('Look','Autovacuum is running, but removing nothing','vacuum','phase_b_autovac','"dead but not yet removable" and a removable cutoff stuck at the old xmin. Autovacuum is not broken; it is blocked.'),
      S('Fix','End the old session, then VACUUM','vacuum','manual_vacuum','After pg_terminate_backend on the old session, VACUUM removes the backlog in milliseconds. The file stays big; the space is now reusable.'),
      S('Fix','Only if the space must be returned: not VACUUM FULL on a live table','vacuum','full_lock','VACUUM FULL takes an exclusive lock for the whole rewrite; readers fail or wait. Use pg_repack or pg_squeeze online instead.')],
     prevent:'idle_in_transaction_session_timeout; alert on transactions older than a few minutes; per-table autovacuum settings for hot tables; watch HOT update ratios before adding indexes.'},
    {id:'wrap',title:'Wraparound warning',sub:'"must be vacuumed within N transactions"',sec:'rd-s7',page:'LOG: WARNING: database "template0" must be vacuumed within 3,000,299 transactions.',
     steps:[
      S('Look','How close are we?','wraparound','ages','age(datfrozenxid) per database against the 2,147,483,648 limit. At 99.9%, writes are about to stop.'),
      S('Look','When it runs out','wraparound','refused','New transaction IDs are refused. Reads still work (they need no new ID).'),
      S('Look','What is holding the oldest ID back?','wraparound','holders,autovac_log','A prepared transaction nobody committed. Also check sessions (backend_xmin) and replication slots (xmin, catalog_xmin). Autovacuum keeps trying and logs that its cutoff is far in the past.'),
      S('Fix','Remove the holder, then VACUUM (FREEZE)','wraparound','fix,writes_back','ROLLBACK PREPARED in the database where it was prepared, then VACUUM in each database: ages drop to near zero and writes work again. On a large database this VACUUM can take hours.')],
     prevent:'Alert on age(datfrozenxid) at 500 million; alert on prepared transactions older than minutes; max_prepared_transactions = 0 unless you use two-phase commit; drop abandoned slots.'},
    {id:'cpu',title:'CPU 100%, latency 20x',sub:'one query eating the machine',sec:'rd-s11',page:'ALERT: db-primary CPU at 100% for 5 minutes; API p95 latency up 20x.',
     steps:[
      S('Look','What is running, and for how long?','monitor','runaway_find','Order active sessions by query_start: the oldest active query is the usual suspect (here an inequality join doing billions of comparisons).'),
      S('Fix','Cancel it','monitor','runaway_cancel','pg_cancel_backend keeps the connection; pg_terminate_backend ends the session. Then find who sent it (usename, application_name, client_addr).'),
      S('Fix','Make the database do it next time','monitor','statement_timeout','A per-role statement_timeout cancels any query from that role after 2 s.')],
     prevent:'statement_timeout per role; pg_stat_statements to find heavy queries before they page you (Query planning and performance page); separate roles for batch jobs.'},
    {id:'lock',title:'Every query on one table hangs',sub:'right after a deploy',sec:'rd-s11',page:'ALERT: requests touching users time out; the deploy just ran a migration.',
     steps:[
      S('Look','Who is blocking whom?','monitor','lock_queue','pg_blocking_pids shows a chain: an idle transaction blocks the ALTER TABLE, and the ALTER blocks every plain SELECT queued behind it.'),
      S('Fix','Break the chain','monitor','lock_queue','Cancel the migration (pg_cancel_backend on the ALTER) to release the readers at once, or end the idle transaction so the ALTER can finish. Then rerun the migration with lock_timeout and retries.')],
     prevent:'lock_timeout on the migration role; idle-in-transaction timeout; migrations designed to take weak locks (SQL and data modelling page, ALTER TABLE, measured).'},
    {id:'delete',title:'Messages vanished',sub:'a bad DELETE in production',sec:'rd-s3',page:'SUPPORT: several users report that all their messages are gone.',
     steps:[
      S('Look','Confirm, and stop the bleeding','pitr','bad_delete,after','The table is empty except for rows written after the mistake. Stop the job that ran it; do not restart anything yet.'),
      S('Look','Find the exact moment','pitr','waldump','pg_waldump shows the transaction: about a million heap deletes and one COMMIT with its timestamp.'),
      S('Fix','Recover to just before it, on a separate server','pitr','restore_pitr,pitr_count','Base backup plus archived WAL, stopped before that commit: every message written before the mistake is back. Copy the deleted rows into production with SQL, keeping the rows written since.'),
      S('Compare','What last night\'s dump would have given','pitr','restore_dump','Everything written since midnight would be gone.')],
     prevent:'Point-in-time recovery with tested restores; least privilege (the app role should not be able to DELETE everything); review destructive scripts; transactions you can roll back.'},
    {id:'sync',title:'All writes hang',sub:'nothing in the error log',sec:'rd-s4',page:'ALERT: write requests timing out on db-primary; reads fine; no errors logged.',
     steps:[
      S('Look','What are the writers waiting for?','replication','sync_down','wait_event SyncRep: commits are waiting for a synchronous standby that is down. The transactions are already committed locally.'),
      S('Fix','Restore the standby, or relax the requirement','replication','sync_down','ALTER SYSTEM SET synchronous_standby_names = \'\' (or point it at a healthy standby) and SELECT pg_reload_conf(): waiting commits are released. You are now running without the zero-data-loss guarantee until a standby is back.')],
     prevent:'synchronous_standby_names = \'ANY 1 (a, b)\' with two standbys; alert when a synchronous standby disconnects.'},
    {id:'down',title:'Primary unreachable',sub:'host or disk lost',sec:'rd-s5',page:'ALERT: db-primary not responding; connections refused for 60 s.',
     steps:[
      S('Fix','Fence the old primary, then promote','replication','promote','Make sure the old primary cannot take writes (stop it, cut its network, power it off), then promote the most up-to-date replica.'),
      S('Look','What happens without fencing','replication','split_brain','Both sides accept writes; the same id now means two different messages.'),
      S('Fix','Bring the old primary back as a replica','replication','rewind,rejoined','pg_rewind copies back only what diverged; the old primary\'s divergent write is discarded.')],
     prevent:'Automated failover with a leader lock (Patroni, CloudNativePG, or a managed service); fencing; applications that reconnect and retry.'}
  ];
  let cur=INC[0],si=0;
  const al=document.getElementById('lab-alerts');
  al.innerHTML=INC.map(x=>'<button data-id="'+x.id+'"><b>'+esc(x.title)+'</b><span>'+esc(x.sub)+'</span></button>').join('');
  function draw(){
    al.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.id===cur.id));
    const n=cur.steps.length+1;
    document.getElementById('lab-page').innerHTML='<div class="co warn"><div class="t">The page</div><code>'+esc(cur.page)+'</code></div>';
    document.getElementById('lab-steps').innerHTML=cur.steps.map((s,i)=>'<button data-i="'+i+'" class="'+(i===si?'on':'')+'">'+(i+1)+'. '+esc(s.k)+'</button>').join('')+'<button data-i="'+cur.steps.length+'" class="'+(si===cur.steps.length?'on':'')+'">'+n+'. Prevent</button>';
    let h;
    if(si<cur.steps.length){const s=cur.steps[si];
      h='<h3>'+esc(s.k)+': '+esc(s.t)+'</h3><div class="tr"><div class="h"><b>Real output</b><span class="meas">measured</span></div><pre class="term">'+s.step.split(',').map(x=>TR.body(s.run,x)).join('\n\n')+'</pre></div><p class="try"><b>What to notice.</b> '+esc(s.read)+'</p>';}
    else h='<h3>Prevent it</h3><p>'+esc(cur.prevent)+'</p><p class="small">The mechanism is explained in the Reading tab, <a href="#'+cur.sec+'" data-sec="'+cur.sec+'">section '+cur.sec.replace('rd-s','')+'</a>.</p>';
    document.getElementById('lab-body').innerHTML=h;
    document.getElementById('lab-pos').textContent='step '+(si+1)+' of '+n;
    document.getElementById('lab-prev').disabled=si===0;document.getElementById('lab-next').disabled=si===n-1;
  }
  al.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=INC.find(x=>x.id===b.dataset.id);si=0;draw()});
  document.getElementById('lab-steps').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;si=+b.dataset.i;draw()});
  document.getElementById('lab-prev').addEventListener('click',()=>{si=Math.max(0,si-1);draw()});
  document.getElementById('lab-next').addEventListener('click',()=>{si=Math.min(cur.steps.length,si+1);draw()});
  document.getElementById('lab-body').addEventListener('click',e=>{const a=e.target.closest('a[data-sec]');if(!a)return;e.preventDefault();
    document.querySelector('#tabs button[data-t="t-read"]').click();setTimeout(()=>{const s=document.getElementById(a.dataset.sec);s&&s.scrollIntoView()},50)});
  window.LAB={INC,pick(id){cur=INC.find(x=>x.id===id);si=0;draw()}};
  draw();
})();
