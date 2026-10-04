// ---- Plan reading lab ----
(function(){
const Q=window.QPD,L=Q.lab,E=RD.esc,$=id=>document.getElementById(id),F=window.QPF;
const tot=L.parallel.text.match(/Parallel Index Scan[^\n]*actual time=[^ ]+ rows=(\d+) loops=(\d+)/);
const ptot=tot?(+tot[1])*(+tot[2]):0;
const X=[
 {id:'limit',nm:'The Limit trap',sub:'one search, 91 ms',sql:L.limit_trap.sql,text:L.limit_trap.text,
  intro:'The sidebar search from Reading, section 7. It returns one chat and takes 91.6 ms.',
  q1:'Click the line where the planner’s row estimate is furthest from what happened.',ans:/Index Scan using chats_pkey/,
  why:'Estimated rows=100, actual rows=1. Believing 100 titles match, the planner expected to find 10 of them after walking about a tenth of the primary key in id order, and chose this plan for its low startup cost. With one match it walked all of it: Rows Removed by Filter 999,999.',
  q2:'The best fix?',opts:[['CREATE INDEX ON chats (title)',1,'Yes: LIKE \'prefix%\' becomes an index range (with the C collation, or text_pattern_ops). Measured: 0.078 ms.'],['SET enable_indexscan = off for the application',0,'A diagnostic switch, not a fix: it penalises every index scan in every query.'],['Raise the statistics target on title',0,'The estimate for a prefix pattern is part guess; better statistics barely move it, and the plan would still scan.'],['Add LIMIT 1 instead of LIMIT 10',0,'Still walks the whole index when the only match is near the end.']]},
 {id:'generic',nm:'A generic plan',sub:'2,000,231 loops',sql:L.generic.sql,text:L.generic.text,
  intro:'The billing query from Reading, section 10, executed with the generic plan for the enterprise organisation that owns 2,000,231 of the 4,000,000 usage rows.',
  q1:'Click the line of the node that did the most work.',ans:/Index Scan using chats_pkey on chats c/,
  why:'The inner side of the nested loop ran loops=2,000,231 times, one index lookup into chats per usage row: 8,000,924 page visits (Buffers shared hit). Its time per loop is tiny (0.002 ms); multiplied by the loops it is most of the 4.4 seconds. Note also rows=290 estimated on the usage_events scan: that is the generic plan’s guess for "some organisation" ($1 in the Index Cond).',
  q2:'The best fix?',opts:[['plan_cache_mode = force_custom_plan for this statement’s role or session',1,'Yes: each call is planned for its value. Measured: 520 to 600 ms for the enterprise, under 1 ms for small organisations.'],['Pin a hash join with pg_hint_plan',0,'Measured: small organisations went from under 1 ms to over 100 ms. A pin is right for one kind of value only.'],['Increase work_mem',0,'The Sort spilled, but 47 MB of sorting is not where 4 seconds went.'],['Add an index on usage_events (chat_id)',0,'The lookups go into chats, which already has its primary key; the problem is doing 2 million of them.']]},
 {id:'corr',nm:'Correlated columns',sub:'a join sized on a bad guess',sql:L.corr_before.sql,text:L.corr_before.text,after:L.corr_after.text,
  intro:'The five London users with the most chats, on a copy of users without extended statistics.',
  q1:'Click the lowest node where estimated and actual rows differ badly.',ans:/Seq Scan on lab_users/,
  why:'The scan expects 158 London-and-GB users and finds 2,294: the planner multiplied the share of GB by the share of London as if they were independent. Everything above it (the nested loop expecting 1,580 rows and getting 22,364, the aggregate) was sized on that guess.',
  q2:'The best fix?',opts:[['CREATE STATISTICS (dependencies, mcv) ON country, city FROM users; ANALYZE users;',1,'Yes. With it the estimate becomes 2,270 (the plan below, revealed): the planner now also uses a parallel worker.'],['An index on (country, city)',0,'An index gives a faster path but not a better estimate; the join would still be sized for 158 rows.'],['Raise default_statistics_target',0,'Per-column statistics are already accurate here; the error is in combining them.'],['Rewrite with a subquery',0,'The estimate would be the same.']]},
 {id:'par',nm:'Parallel workers',sub:'rows are per process',sql:L.parallel.sql,text:L.parallel.text,
  intro:'Messages per role before December 2025, planned with 2 parallel workers.',
  q1:'Click the line that reads the table.',ans:/Parallel Index Scan/,
  why:'Parallel Index Scan with rows='+F.f(tot?+tot[1]:0)+' loops='+(tot?tot[2]:'')+': the leader and two workers each produced about that many rows, '+F.f(ptot)+' in total. Under a Gather, rows and times are per process; multiply by loops.',
  q2:'How many rows did the scan produce in total?',opts:[[F.f(tot?+tot[1]:0),0,'That is one process’s share.'],[F.f(ptot),1,'Yes: rows times loops (the leader plus 2 workers).'],['6',0,'That is what Gather Merge passed up after the partial aggregates.'],['2',0,'That is the final result: one row per role.']]},
 {id:'lossy',nm:'A lossy bitmap',sub:'work_mem too small',sql:L.lossy.sql+'   -- with work_mem = 64kB',text:L.lossy.text,after:L.lossy.text_ok,
  intro:'Counting 2,000,000 messages by id range with a bitmap scan, run with work_mem at its minimum, 64 kB.',
  q1:'Click the line that shows the bitmap did not fit in memory.',ans:/lossy=/,
  why:'Heap Blocks: exact=873 lossy=37,598. A bitmap that outgrows work_mem degrades to one bit per page instead of per row ("lossy"), and every row on a lossy page must be rechecked against the condition. It also loses a shortcut: for exact pages that the visibility map marks all-visible, a query needing no columns can skip reading the table page; lossy pages are always read. Here 43,063 pages were read against 5,472 with the default 4 MB (revealed below), and 412 ms against 188 ms (part of that gap is a colder cache).',
  q2:'The best fix?',opts:[['Restore work_mem to its default or raise it for this session',1,'Yes: with 4 MB the bitmap is exact (Heap Blocks: exact=38,471).'],['Add an index on id',0,'The bitmap already comes from the primary key index.'],['VACUUM messages',0,'The visibility map is already set; the exact version shows it.'],['Disable bitmap scans',0,'A sequential scan of all 10 million rows would be slower.']]},
 {id:'subplan',nm:'A per-row subquery',sub:'SubPlan loops',sql:L.subplan.sql,text:L.subplan.text,
  intro:'Team-plan users in Sweden with the time of their latest message, written with a correlated subquery.',
  q1:'Click the line showing how many times the subquery ran.',ans:/->\s+Aggregate.*loops=21/,
  why:'The Aggregate under SubPlan 1 has loops=21: the subquery ran once per qualifying user. With 21 users that is cheap (8 ms); the same shape over 50,000 users runs the inner plan 50,000 times. The inner Index Only Scan shows loops=224: once per chat of those users.',
  q2:'When the outer side is large, the usual rewrite?',opts:[['A join with GROUP BY u.id, or LEFT JOIN LATERAL',1,'Yes: the planner can then choose a hash join and aggregate once, instead of being forced into one inner execution per row.'],['Add LIMIT inside the subquery',0,'max() already returns one row.'],['Raise work_mem',0,'Nothing spills here.'],['An index on users (country, plan)',0,'That speeds up finding the 21 users, which is not the costly part when there are many.']]},
 {id:'spill',nm:'A sort that spilled',sub:'external merge',sql:L.spill.sql+'   -- serial, work_mem = 4MB',text:L.spill.text,
  intro:'All 1,000,000 chats ordered by title, with the default work_mem of 4 MB.',
  q1:'Click the line that shows the sort did not fit in work_mem.',ans:/Sort Method: external merge/,
  why:'Sort Method: external merge Disk: 56,560 kB: the sort wrote sorted runs to temporary files and merged them (temp written=14,161 pages on the Buffers line). In memory it needs 94,674 kB (measured at work_mem 256 MB, where it uses quicksort). On this laptop the spill cost about 14% (410 against 360 ms); on slower disks more.',
  q2:'Which fix would you try first for a report that runs this every hour?',opts:[['SET LOCAL work_mem = \'128MB\' inside the report’s transaction',1,'Yes: memory for the one query that needs it, without raising it for every connection.'],['Raise work_mem in postgresql.conf to 128 MB',0,'Every sort and hash in every connection may then use 128 MB: a risk of running out of memory.'],['An index on (title, id)',0,'Possible, and it would remove the sort entirely, but it costs space and write speed for one hourly report; try memory first.'],['Increase shared_buffers',0,'The buffer pool caches table pages; sort memory is work_mem.']]},
 {id:'stale',nm:'Stale statistics',sub:'after a bulk load',sql:'SELECT * FROM stale WHERE user_id = 7;   -- right after loading 999,000 rows, before ANALYZE',text:Q.stats.stale_plans[0],after:Q.stats.stale_plans[1],
  intro:'From Reading, section 3: a 1,000-row table where user 7 owned 1% of the rows, analyzed, then loaded with 999,000 more rows mostly belonging to user 7. Timing was off for this run (TIMING OFF), so only rows are shown.',
  q1:'Click the line where the plan went wrong.',ans:/Bitmap Heap Scan on stale/,
  why:'Estimated 9,100 rows, actual 899,110. The planner noticed the table had grown (it scales row counts by the file size) but still believed user 7 owned 1% of the rows, as the statistics said. The Bitmap Index Scan below has the same estimate, but the lowest node where it matters for the plan choice is the scan of the table.',
  q2:'The fix?',opts:[['ANALYZE stale;',1,'Yes: estimate 901,100 and a Seq Scan (revealed below). Run ANALYZE after bulk loads; autovacuum would get there, but later.'],['REINDEX the index',0,'The index is fine; the statistics are old.'],['Increase the statistics target',0,'The sample was fine when it was taken; the data changed since.'],['VACUUM FULL',0,'Rewrites the table without refreshing the column statistics the planner needs here (use ANALYZE).']]}];
let cur=0;const done={};
function pick(){$('lb-pick').innerHTML=X.map((x,i)=>'<button data-i="'+i+'" class="'+(i===cur?'on ':'')+(done[x.id]?'done':'')+'"><b>'+(i+1)+'. '+E(x.nm)+'</b><span>'+E(x.sub)+'</span></button>').join('');
  $('lb-score').textContent=Object.keys(done).length+' of '+X.length+' answered correctly.'}
function planHtml(t,cls){return '<div class="lb-plan'+(cls?' '+cls:'')+'">'+t.split('\n').map((l,i)=>'<div data-l="'+i+'">'+E(l||' ')+'</div>').join('')+'</div>'}
function show(i){cur=i;const x=X[i];pick();
  $('lb-card').innerHTML='<h3 style="margin-top:0">'+(i+1)+'. '+E(x.nm)+'</h3><p>'+E(x.intro)+'</p><div class="lb-sql">'+E(x.sql)+'</div>'+
   '<div class="lb-q">'+E(x.q1)+'</div>'+planHtml(x.text)+'<div id="lb-fb1"></div><p><button id="lb-show1">Show the answer</button></p><div id="lb-q2" hidden><div class="lb-q">'+E(x.q2)+'</div><div class="lb-opts">'+x.opts.map((o,k)=>'<button data-k="'+k+'">'+E(o[0])+'</button>').join('')+'</div><div id="lb-fb2"></div>'+(x.after?'<div id="lb-after" hidden><div class="lb-q">After the fix</div>'+planHtml(x.after,'static')+'</div>':'')+'</div>'+
   '<p style="margin-top:10px">'+(i<X.length-1?'<button id="lb-next">Next plan &#9654;</button>':'')+'</p>';
  const lines=[...$('lb-card').querySelectorAll('.lb-plan:not(.static) div')],good=lines.filter(d=>x.ans.test(d.textContent));
  const reveal=()=>{good.forEach(d=>d.classList.add('ans'));$('lb-fb1').innerHTML='<div class="lb-fb ok">'+E(x.why)+'</div>';$('lb-q2').hidden=false};
  lines.forEach(d=>d.addEventListener('click',()=>{lines.forEach(z=>z.classList.remove('ok','no'));
    if(good.includes(d)){d.classList.add('ok');reveal()}else{d.classList.add('no');$('lb-fb1').innerHTML='<div class="lb-fb no">Not this one. '+E(hint(d.textContent))+' Try again, or show the answer.</div>'}}));
  $('lb-show1').addEventListener('click',reveal);
  $('lb-card').querySelectorAll('.lb-opts button').forEach(b=>b.addEventListener('click',()=>{const o=x.opts[+b.dataset.k];b.classList.add(o[1]?'ok':'no');
    $('lb-fb2').innerHTML='<div class="lb-fb '+(o[1]?'ok':'no')+'">'+E(o[2])+'</div>';if(o[1]){done[x.id]=1;pick();const a=$('lb-after');if(a)a.hidden=false}}));
  const nx=$('lb-next');if(nx)nx.addEventListener('click',()=>{show(i+1);$('lb-card').scrollIntoView({block:'start'})})}
function hint(l){if(/Buffers/.test(l))return 'This line counts pages: useful for size of work, not for where the estimate broke.';if(/I\/O Timings/.test(l))return 'Time spent waiting for reads and writes.';
  if(/Planning|Execution Time/.test(l))return 'Totals for the whole statement.';if(/Cond|Filter|Key/.test(l))return 'This line describes the condition or key of the node above it.';
  if(/rows=/.test(l)){const m=l.match(/rows=(\d+).*actual[^)]*rows=(\d+) loops=(\d+)/);if(m)return 'Here the planner expected '+F.f(+m[1])+' rows and got '+F.f(+m[2])+' per loop, over '+m[3]+' loop'+(m[3]==='1'?'':'s')+'.'}
  return 'Look at estimated against actual rows, loops, and the detail lines under each node.'}
$('lb-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});
show(0);
})();
