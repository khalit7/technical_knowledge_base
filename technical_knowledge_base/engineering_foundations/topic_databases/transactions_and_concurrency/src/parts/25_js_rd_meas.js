// ---- Reading tab: measured figures (durability, lock recordings, contention benchmark, long transaction) ----
(function(){
  const X=TXD.extras,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=n=>Number(n).toLocaleString('en-US');
  // durability bars
  const D=X.durability;
  const rows=[['Default flush (open_datasync), synchronous_commit on','default_on','var(--c1)'],['Default flush, synchronous_commit off','default_off','var(--c3)'],
    ['fsync_writethrough (drive cache flushed), on','writethrough_on','var(--c2)'],['fsync_writethrough, synchronous_commit off','writethrough_off','var(--c3)']];
  const drawD=()=>{if($('rd-dur'))TXF.hbars($('rd-dur'),[{title:'Commits per second, one client',rows:rows.map(r=>({label:r[0],v:D[r[1]].commits_per_s,col:r[2],txt:fmt(D[r[1]].commits_per_s),hl:r[1]==='writethrough_on'}))}],{label:'Commits per second at four durability settings'})};
  drawD();RD.onRender(drawD);RD.onResize(drawD);
  // the provenance note under the chart is static HTML (20_read_b.html)
  // recorded lock traces with a mode switch
  function traceSeg(segId,boxId){const seg=$(segId),box=$(boxId);if(!seg||!box)return;
    const draw=k=>{TX.render(box,X.traces[k].tr)};RD.seg(seg,draw);draw(seg.querySelector('button.on').dataset.m)}
  traceSeg('rd-jobs-mode','rd-jobs');traceSeg('rd-lq-mode','rd-lq');traceSeg('rd-dl-mode','rd-dl');
  if($('rd-opt'))TX.render($('rd-opt'),X.traces.optimistic.tr);
  // long transaction tiles
  const L=X.long_tx;
  if($('rd-long')){
    const pages=b=>Math.round(b/8192);
    $('rd-long').innerHTML=
      RD.stat('Table size, nothing held open',fmt(L.control.size)+' B',pages(L.control.size)+' page after '+fmt(L.updates)+' updates')+
      RD.stat('Table size, one idle transaction open',fmt(L.size_held)+' B',pages(L.size_held)+' pages after the same updates')+
      RD.stat('VACUUM while it was open','removed '+fmt(L.vacuum_held.removed),fmt(L.vacuum_held.dead_not_removable)+' dead but not yet removable')+
      RD.stat('VACUUM after it ended','removed '+fmt(L.vacuum_after.removed),'file size unchanged: '+fmt(L.size_after)+' B')+
      RD.stat('20,000 updates took',L.update_s_held+' s','against '+L.control.update_s+' s with nothing held')+
      RD.stat('Reading Ines\'s one row (median)',Math.round(L.lat_held_us)+' &micro;s','against '+Math.round(L.control.lat_us)+' &micro;s, and '+Math.round(L.lat_after_us)+' &micro;s after VACUUM');
    // the note is static HTML (20_read_h.html)
  }
  // contention benchmark
  const B=TXD.bench;let pool='hot',met='tps';
  const MODE={rc_naive:['Read committed, read then write (wrong)','var(--bad)','Naive read, write'],rc_atomic:['Read committed, one atomic UPDATE','var(--c3)','Atomic UPDATE'],rc_for_update:['Read committed, FOR UPDATE','var(--c1)','FOR UPDATE'],ser_retry:['Serializable with the retry loop','var(--c4)','Serializable + retry']};
  const MET={tps:['commits_per_s','commits per second',v=>fmt(v)],retry:['retries_per_commit','retries per commit',v=>v.toFixed(3)],p99:['p99_ms','p99 latency, ms',v=>v.toFixed(1)],lost:['lost_updates','updates lost (messages saved minus credits charged)',v=>fmt(v)]};
  function drawB(){const box=$('rd-bench');if(!box)return;
    const rs=B.runs.filter(r=>r.contention===pool),m=MET[met];
    const mx=Math.max(1e-9,...rs.map(r=>r[m[0]]||0));
    TXF.hbars(box,[2,8,32].map(n=>({title:n+' clients: '+m[1],rows:Object.keys(MODE).map(k=>{const r=rs.find(x=>x.mode===k&&x.clients===n);const v=r?(r[m[0]]||0):0;
      return {label:MODE[k][0],v,col:MODE[k][1],txt:m[2](v)}})})),{max:mx,label:'Contention benchmark: '+m[1]});
  }
  if($('rd-bench')){RD.seg($('rd-bench-pool'),v=>{pool=v;drawB()});RD.seg($('rd-bench-met'),v=>{met=v;drawB()});drawB();RD.onRender(drawB);RD.onResize(drawB)}
})();
