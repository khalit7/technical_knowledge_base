// ---- Section 4: which partitions a query reads (measured plans) and the retention / planning figures ----
(function(){
  const S=window.SC;if(!S||!document.getElementById('ptCard'))return;
  let q='dash',lay='messages';
  const f1=x=>x>=100?Math.round(x).toLocaleString('en-US'):x>=10?x.toFixed(1):x.toFixed(2);
  const months=S.partNames.map(n=>n.replace('messages_m','').replace('_','-'));
  function draw(){
    const k=q+'|'+lay,m=S.part[k];
    document.getElementById('ptSql').textContent=S.q[q].replace(/FROM messages/,'FROM '+lay);
    let boxes='';
    if(lay==='messages')boxes='<span class="hit" style="min-width:12em">messages (one table, 10,000,000 rows)</span>';
    else if(lay==='messages_month')boxes=S.partNames.map((n,i)=>'<span class="'+(m.rels.includes(n)?'hit':'miss')+'">'+months[i]+'</span>').join('');
    else boxes=[0,1,2,3,4,5,6,7].map(i=>'<span class="'+(m.rels.includes('messages_h'+i)?'hit':'miss')+'">hash '+i+'</span>').join('');
    document.getElementById('ptBoxes').innerHTML=boxes;
    const nP=lay==='messages'?1:m.rels.length;
    document.getElementById('ptNums').innerHTML=RD.stat('Execution, median of 5',f1(m.ms)+' ms','warm cache')+RD.stat('Planning',m.plan.toFixed(2)+' ms','')+
      RD.stat('8 KB pages touched',m.pages.toLocaleString('en-US'),'shared buffers hit + read')+RD.stat('Tables read',String(nP),lay==='messages'?'':'of '+(lay==='messages_month'?12:8)+' partitions');
    let note='';
    if(q==='dash'&&lay==='messages'){const ix=S.part['dash|messages+index'];note='With an ordinary index on created_at, the same one table answers in '+f1(ix.ms)+' ms ('+ix.pages.toLocaleString('en-US')+' pages): an index alone fixes this read. Without it, the first (cold) run took '+Math.round(S.cold).toLocaleString('en-US')+' ms.'}
    if(q==='dash'&&lay==='messages_month'){const np=S.part['dash|messages_month|nopruning'];note='With pruning switched off (enable_partition_pruning = off) the same query reads all 12 partitions: '+f1(np.ms)+' ms.'}
    if(q==='chat'&&lay==='messages_month')note='No created_at in the WHERE clause, so nothing can be pruned: one index probe per partition, most of them finding nothing.';
    if(q==='chat_week')note='Chat '+S.chatId+' has 13 messages, written within 15 hours on 25 and 26 February 2026; with the date range the monthly layout prunes to one partition and costs the same as one table.';
    document.getElementById('ptNote').textContent=note;
  }
  RD.seg(document.getElementById('ptQ'),v=>{q=v;draw()});RD.seg(document.getElementById('ptL'),v=>{lay=v;draw()});draw();
  const d=S.retDel,r=S.retDrop;
  document.getElementById('ptRet').innerHTML=RD.stat('DELETE one month (plain table)',d.s.toFixed(1)+' s',d.rows.toLocaleString('en-US')+' rows')+RD.stat('Log written by the DELETE',d.wal_mb.toFixed(1)+' MB','replayed by every replica')+
    RD.stat('DETACH + DROP the partition',r.s.toFixed(3)+' s','same month')+RD.stat('Log written by the DROP',r.wal_mb.toFixed(2)+' MB','about '+Math.round(d.wal_mb/r.wal_mb).toLocaleString('en-US')+'x less');
  const mx=Math.max(...S.planning.map(p=>p.all));
  document.getElementById('ptPlan').innerHTML=S.planning.map(p=>
    '<div class="row"><span class="nm">'+p.n.toLocaleString('en-US')+' partitions, pruned</span><span class="track"><span class="fill" style="width:'+(100*p.pruned/mx)+'%;background:var(--c3)"></span></span><span class="val">'+p.pruned.toFixed(2)+' ms</span></div>'+
    '<div class="row"><span class="nm">'+p.n.toLocaleString('en-US')+' partitions, all remain</span><span class="track"><span class="fill" style="width:'+(100*p.all/mx)+'%;background:var(--c2)"></span></span><span class="val">'+p.all.toFixed(1)+' ms</span></div>').join('');
})();
