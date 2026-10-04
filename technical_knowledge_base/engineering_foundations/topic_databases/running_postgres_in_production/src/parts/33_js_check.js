// ---- Production checklist (ticks kept in localStorage, wrapped in try/catch) ----
(function(){
  const esc=RD.esc,KEY='rpg-check';
  const G=[
   ['Backups and recovery','rd-s3',[
     ['Continuous WAL archiving plus scheduled base backups to another account or project, encrypted, with delete protection','pgBackRest, WAL-G or Barman; object lock on the bucket',1],
     ['RPO and RTO written down and agreed with the product owner','"we can lose 1 minute, be down 1 hour"',0],
     ['A restore is tested automatically at least weekly, with checks and its duration recorded','the duration is your real RTO',0],
     ['Alerts on archiver failures and on the newest backup being too old','pg_stat_archiver.failed_count',0],
     ['A written runbook for point-in-time recovery to a side server','practised once by someone who did not write it',0]]],
   ['Replication and failover','rd-s4',[
     ['At least one replica in another availability zone','',1],
     ['max_slot_wal_keep_size set; alerts on inactive slots and retained WAL','one dead replica cannot fill the disk',0],
     ['Automated failover with a leader lock and fencing (Patroni, CloudNativePG or managed)','',1],
     ['Synchronous replication decided on purpose: off, or ANY 1 of two standbys','never a single synchronous standby',0],
     ['Applications reconnect and retry after a failover; tested with a planned switchover','',0]]],
   ['Vacuum and wraparound','rd-s6',[
     ['Autovacuum on everywhere; per-table settings on the biggest hot tables','scale factor around 0.01 to 0.05',0],
     ['log_autovacuum_min_duration set, so slow vacuums are logged','',0],
     ['Alerts on age(datfrozenxid) and on dead-tuple ratio of big tables','warn at 500 million',0],
     ['max_prepared_transactions = 0 unless two-phase commit is used','',0]]],
   ['Connections and timeouts','rd-s8',[
     ['A pooler (PgBouncer in transaction mode or managed) between applications and Postgres','and max_prepared_statements set',0],
     ['Pool arithmetic done: pods x pool size x 2 (deploys) fits under max_connections','',0],
     ['statement_timeout, idle_in_transaction_session_timeout and lock_timeout set per role','',0],
     ['No application code relies on session state (SET, LISTEN, advisory locks) through the pooler','or it uses SET LOCAL',0]]],
   ['Security','rd-s10',[
     ['No public IP; pg_hba.conf allows only hostssl from known subnets with scram-sha-256','',1],
     ['Applications use least-privilege roles; nothing runs as superuser or table owner','',0],
     ['Clients connect with sslmode=verify-full','',0],
     ['Credentials in a secret manager, rotated; humans use individual roles','',0],
     ['Postgres and the pooler on currently patched minor versions','PgBouncer 1.26.0 fixes CVE-2026-19888',1]]],
   ['Monitoring','rd-s11',[
     ['pg_stat_statements enabled and reviewed','top queries by total time',1],
     ['Dashboards for the golden signals: latency, traffic, errors, saturation','',1],
     ['Alerts: disk, replication lag, connections, long transactions, XID age, archiver, backups','see the table in section 11',0],
     ['Every alert links to a runbook','the Incident lab tab is a template',0]]],
   ['Upgrades','rd-s9',[
     ['The major version is supported for at least a year more','14 ends 2026-11-12',0],
     ['A major upgrade was rehearsed on a restored copy, with timings','',0],
     ['Minor releases applied within weeks of release','',1]]]];
  let st={};try{st=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){st={}}
  const total=G.reduce((a,g)=>a+g[2].length,0);
  function draw(){
    document.getElementById('chk-list').innerHTML=G.map((g,gi)=>'<div class="chk-g"><h4>'+esc(g[0])+' <a href="#" class="small" data-sec="'+g[1]+'">(section '+g[1].replace('rd-s','')+')</a></h4>'+
      g[2].map((it,ii)=>{const id=gi+'-'+ii;return '<label><input type="checkbox" data-id="'+id+'"'+(st[id]?' checked':'')+'><span>'+esc(it[0])+(it[2]?' <span class="tag">managed</span>':'')+(it[1]?'<br><span class="why">'+esc(it[1])+'</span>':'')+'</span></label>'}).join('')+'</div>').join('');
    count();
  }
  function count(){const n=Object.values(st).filter(Boolean).length;document.getElementById('chk-bar').style.width=(100*n/total).toFixed(1)+'%';document.getElementById('chk-count').textContent=n+' of '+total+' done'}
  const L=document.getElementById('chk-list');
  L.addEventListener('change',e=>{const c=e.target.closest('input[data-id]');if(!c)return;st[c.dataset.id]=c.checked;try{localStorage.setItem(KEY,JSON.stringify(st))}catch(x){}count()});
  L.addEventListener('click',e=>{const a=e.target.closest('a[data-sec]');if(!a)return;e.preventDefault();document.querySelector('#tabs button[data-t="t-read"]').click();setTimeout(()=>{const s=document.getElementById(a.dataset.sec);s&&s.scrollIntoView()},50)});
  document.getElementById('chk-reset').addEventListener('click',()=>{st={};try{localStorage.removeItem(KEY)}catch(e){}draw()});
  window.CHK={total};draw();
})();
