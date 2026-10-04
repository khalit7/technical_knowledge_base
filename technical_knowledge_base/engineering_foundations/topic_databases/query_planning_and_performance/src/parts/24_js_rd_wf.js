// ---- Reading tab, section 7: the slow-query workflow on the replayed workload (animation, two modes) ----
(function(){
const Q=window.QPD,W=Q.workload,E=RD.esc,$=id=>document.getElementById(id),F=window.QPF;
const short=q=>q.replace(/\s+/g,' ').replace(/^SELECT /,'').slice(0,74)+(q.length>80?'...':'');
const isSearch=q=>/title LIKE/.test(q),isReport=q=>/created_at >= timestamptz/.test(q);
function pss(top,hl){return '<div class="tw"><table class="pss"><thead><tr><th class="num">% time</th><th class="num">calls</th><th class="num">mean ms</th><th class="num">total ms</th><th>query (normalised)</th></tr></thead><tbody>'+
  top.map(r=>'<tr'+(hl(r.query)?' class="top"':'')+'><td class="num"><b>'+r.pct.toFixed(1)+'</b></td><td class="num">'+F.f(r.calls)+'</td><td class="num">'+F.ms(r.mean_ms)+'</td><td class="num">'+F.f(r.total_ms)+'</td><td class="q">'+E(short(r.query))+'</td></tr>').join('')+'</tbody></table></div>'}
function plan(txt,re,n){const ls=txt.split('\n').slice(0,n||12);return '<pre class="pl">'+ls.map(l=>re&&re.test(l)?'<span class="hl">'+E(l)+'</span>':E(l)).join('\n')+'</pre>'}
const B=W.before,A=W.after,sB=B.top.find(r=>isSearch(r.query)),sA=A.top.find(r=>isSearch(r.query)),rep=B.top.find(r=>isReport(r.query));
const totB=B.top.reduce((a,r)=>a+r.total_ms,0);
const hunchTps=B.tps/(1-rep.pct/100);
const logLine=(W.log_duration||'').split('\n')[0].replace(/^\d{4}-\d\d-\d\d (\d\d:\d\d:\d\d)\.\d+ \w+ \[\d+\]/,'$1');
const S={
 flow:[
  {st:-1,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'The replay',p:'pgbench runs the six queries from 4 clients, 1,000 transactions each, with random parameters. Throughput '+F.f(B.tps)+' transactions a second, '+F.ms(B.lat)+' ms average latency. Something is slow; nobody knows what.',
   panel:()=>'<pre class="sql">'+E(Object.keys(W.weights).map(k=>k+' (weight '+W.weights[k]+'): '+W.scripts[k].split('\n').filter(l=>l&&l[0]!=='\\').join(' ')).join('\n'))+'</pre>'},
  {st:0,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'Find: rank statements by total time',p:'pg_stat_statements after the replay, sorted by total_exec_time. One statement, the title search, used '+sB.pct.toFixed(1)+'% of all database time.',panel:()=>pss(B.top,isSearch)},
  {st:0,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'Find: why total time, not the slowest call',p:'The search ran '+F.f(sB.calls)+' times at '+F.ms(sB.mean_ms)+' ms: '+F.f(sB.total_ms)+' ms of the '+F.f(totB)+' ms total. Opening a chat ran '+(B.top[1].calls/sB.calls).toFixed(1)+' times more often but cost '+F.f(sB.mean_ms/B.top[1].mean_ms)+' times less per call.',panel:()=>pss(B.top,isSearch)},
  {st:1,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'Explain: get a real value from the log',p:'pg_stat_statements shows LIKE $1 || $2 || $3, with no values. log_min_duration_statement (20 ms here) logged real calls; one of them:',panel:()=>'<pre class="pl">'+E(logLine)+'</pre>'},
  {st:1,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'Explain: EXPLAIN (ANALYZE, BUFFERS)',p:'Estimated rows=100, actual rows=1, and 999,999 rows removed by the filter: the planner walked the primary key expecting to find 10 matches early. The Limit trap.',panel:()=>plan(W.explain_before,/rows=100|Rows Removed|Execution Time/,12)},
  {st:2,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'Fix: one index',p:'CREATE INDEX chats_title ON chats (title); built in '+W.index_s+' s, '+(W.index_bytes/1e6).toFixed(1)+' MB. With the C collation a B-tree serves LIKE \'prefix%\' as a range.',panel:()=>'<pre class="sql">CREATE INDEX chats_title ON chats (title);\n-- '+W.index_s+' s, '+F.f(W.index_bytes)+' bytes</pre>'},
  {st:2,c:[B.tps,B.lat,0.078,sB.pct],t:'Fix: the new plan',p:'Index Cond turns the prefix into a range on title, 7 pages instead of 12,053: 0.078 ms for the same search.',panel:()=>plan(W.explain_after,/Index Cond|Index Scan using chats_title|Execution Time/,18)},
  {st:3,c:[A.tps,A.lat,sA.mean_ms,sA.pct],t:'Verify: same replay, statistics reset',p:'Throughput '+F.f(B.tps)+' to '+F.f(A.tps)+' transactions a second ('+(A.tps/B.tps).toFixed(1)+' times), average latency '+F.ms(B.lat)+' to '+F.ms(A.lat)+' ms. The search fell to '+sA.pct.toFixed(1)+'% of database time.',panel:()=>pss(A.top,isSearch)},
  {st:3,c:[A.tps,A.lat,sA.mean_ms,sA.pct],t:'And again',p:'The top of the list is now opening a chat ('+A.top[0].pct.toFixed(1)+'%), a 2 ms query run '+F.f(A.top[0].calls)+' times. The routine repeats until the top entry is something you accept.',panel:()=>pss(A.top,q=>q===A.top[0].query)}],
 hunch:[
  {st:-1,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'The replay',p:'The same replay: '+F.f(B.tps)+' transactions a second.',panel:()=>'<pre class="sql">'+E(Object.keys(W.weights).map(k=>k+' (weight '+W.weights[k]+')').join('\n'))+'</pre>'},
  {st:1,c:[B.tps,B.lat,sB.mean_ms,sB.pct],t:'A colleague: "the weekly report is slow"',p:'It is: '+F.ms(rep.mean_ms)+' ms per call, '+F.f(rep.max_ms)+' ms at worst, against 4 ms for opening a chat. The team starts tuning it.',panel:()=>pss(B.top,isReport)},
  {st:2,c:[hunchTps,B.lat*(1-rep.pct/100),sB.mean_ms,sB.pct],t:'Even a perfect fix buys little',p:'The report is '+rep.pct.toFixed(1)+'% of database time. Making it free would raise throughput by at most '+(100*(1/(1-rep.pct/100)-1)).toFixed(1)+'%, to about '+F.f(hunchTps)+' transactions a second (derived, assuming the clients wait only on the database).',panel:()=>pss(B.top,isReport)},
  {st:3,c:[hunchTps,B.lat*(1-rep.pct/100),sB.mean_ms,sB.pct],t:'The real cost was elsewhere',p:'The title search, which nobody complained about because each call is a fraction of a keystroke, is still '+sB.pct.toFixed(1)+'% of the time. Step 1 of the workflow finds it in one query.',panel:()=>pss(B.top,isSearch)}]};
let mode='flow';
const cnt=$('rd-wf-cnt');
function draw(i){const s=S[mode][Math.min(i,S[mode].length-1)];
  [...$('rd-wf-strip').children].forEach((d,k)=>d.classList.toggle('on',k===s.st));
  cnt.innerHTML=RD.stat('Throughput',F.f(s.c[0])+'<small> tx/s</small>')+RD.stat('Average latency',F.ms(s.c[1])+'<small> ms</small>')+RD.stat('Search, mean',F.ms(s.c[2])+'<small> ms</small>')+RD.stat('Search, share of DB time',s.c[3].toFixed(1)+'%');
  $('rd-wf-panel').innerHTML=s.panel();$('rd-wf-cap').innerHTML='<div class="t">'+E(s.t)+'</div><p>'+E(s.p)+'</p>'}
const an=RD.anim({card:'rd-wf-card',ctl:'rd-wf-ctl',n:S.flow.length,draw,ms:3200,label:'Workflow step'});
RD.seg($('rd-wf-mode'),m=>{mode=m;an.reset(S[m].length);an.play()});
})();
