// ---- One screen: the scaling ladder (click a rung) ----
(function(){
  const el=document.getElementById('ldr'),det=document.getElementById('ldrDet');if(!el)return;
  const K={one:'var(--c3)',copy:'var(--c1)',split:'var(--c2)'};
  const R=[
   ['Fix the queries and indexes','one','hours to days','Most load comes from a few queries. pg_stat_statements finds them, EXPLAIN shows why, an index or rewrite makes them 10 to 1,000 times cheaper.','Enough when a few queries dominate. Next symptom: every query is cheap but there are too many.','rd-s2'],
   ['Buy a bigger machine','one','money; a failover of minutes','Same database, more CPU, memory and IOPS. The largest RDS for PostgreSQL machine has 192 vCPU and 1,536 GiB for about $22.94 an hour (one zone, us-east-1, Oct 2026).','Enough while you are below about half of the largest box. Next symptom: the forecast reaches the top size.','rd-s2'],
   ['Pool connections','one','a proxy to run','PgBouncer lends a few real connections to thousands of clients; OpenAI saw connection time fall from 50 to 5 ms.','Enough when the problem is connection count; does nothing for slow queries.','rd-s2'],
   ['Cache hot reads','one','stale data, invalidation','Keep frequent answers in Redis so the database is not asked again.','Enough when load is repeated reads of the same keys; useless for writes.','rd-s2'],
   ['Add read replicas','copy','copies of everything; stale reads','Copies that replay the primary\'s log and answer reads, a little behind. The application routes reads and handles read-your-writes.','Enough when reads are the bottleneck and writes fit one primary (OpenAI: one primary, nearly 50 replicas). Never helps writes.','rd-s3'],
   ['Partition big tables','one','maintenance jobs; key constraints','Split one table into pieces on the same server; drop old data by dropping a partition (0.021 s against 2.1 s for a DELETE, measured).','Enough when the pain is one huge time-ordered table. Adds no capacity.','rd-s4'],
   ['Split by function','split','cross-database joins and transactions lost','Move groups of tables (billing, audit) to their own databases. GitHub and Figma did this before sharding.','Enough while no single table group outgrows one server.','rd-s5'],
   ['Shard','split','router, resharding, cross-shard queries','Split one table\'s rows across servers by a shard key. Queries with the key hit one shard; the rest hit all.','Enough for almost any size, if the key keeps the frequent queries single-shard. The key is nearly permanent.','rd-s6'],
   ['Distributed SQL','split','latency floor; a new system','CockroachDB, Spanner, YugabyteDB, TiDB, Aurora DSQL shard, replicate with consensus and fail over by themselves.','Worth it when you need write scale or region survival without building sharding yourself.','rd-s11']];
  el.innerHTML=R.map((r,i)=>'<button data-i="'+i+'" style="--sc:'+K[r[1]]+'"><span class="no">'+(i+1)+'</span><span><span class="nm">'+r[0]+'</span><span class="sm">'+r[3].split('. ')[0]+'.</span></span><span class="cst">'+r[2]+'</span></button>').join('');
  function show(i){const r=R[i];el.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));
    det.innerHTML='<h4>Rung '+(i+1)+': '+r[0]+'</h4><p>'+r[3]+'</p><p><b>When it is enough:</b> '+r[4]+'</p><p><b>Costs:</b> '+r[2]+'. <a href="#'+r[5]+'">Read section</a></p>'}
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});
  show(0);
})();
