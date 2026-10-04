// ---- Reading tab: measured figures (durability, lock recordings, contention benchmark, long transaction) ----
(function(){
  const X=TXD.extras,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=n=>Number(n).toLocaleString('en-US');
  // durability bars
  const D=X.durability;
  const rows=[['Default flush (open_datasync), synchronous_commit on','default_on','var(--c1)'],['Default flush, synchronous_commit off','default_off','var(--c3)'],
    ['fsync_writethrough (drive cache flushed), on','writethrough_on','var(--c2)'],['fsync_writethrough, synchronous_commit off','writethrough_off','var(--c3)']];
  const mx=Math.max(...rows.map(r=>D[r[1]].commits_per_s));
  if($('rd-dur'))$('rd-dur').innerHTML='<div class="small mute">Commits per second, one client</div>'+rows.map(r=>{const v=D[r[1]];
    return '<div class="row"><div class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</div><div class="track"><div class="fill" style="width:'+(100*v.commits_per_s/mx).toFixed(1)+'%;background:'+r[2]+'"></div></div><div class="val">'+fmt(v.commits_per_s)+'</div></div>'}).join('');
  const ratio=D.default_on.commits_per_s/D.writethrough_on.commits_per_s;
  if($('rd-dur-note'))$('rd-dur-note').innerHTML='Measured '+X.date+', PostgreSQL '+esc(X.version)+', Apple M1 Pro internal SSD, macOS; one client sending one INSERT per transaction over TCP loopback, 5 s per setting. A durable commit with the drive cache flushed took '+D.writethrough_on.ms_per_commit+' ms, '+ratio.toFixed(0)+' times the default\'s '+D.default_on.ms_per_commit+' ms. Script: src/measure/extras.py.';
  if($('one-dur'))$('one-dur').textContent=D.writethrough_on.ms_per_commit+' ms per commit on this laptop with the drive cache flushed';
  // recorded lock traces with a mode switch
  function traceSeg(segId,boxId){const seg=$(segId),box=$(boxId);if(!seg||!box)return;
    const draw=k=>{TX.render(box,X.traces[k].tr)};RD.seg(seg,draw);draw(seg.querySelector('button.on').dataset.m)}
  traceSeg('rd-jobs-mode','rd-jobs');traceSeg('rd-lq-mode','rd-lq');traceSeg('rd-dl-mode','rd-dl');
  if($('rd-opt'))TX.render($('rd-opt'),X.traces.optimistic.tr);
  if($('rd-jobs-note'))$('rd-jobs-note').textContent='Recorded '+X.date+' on PostgreSQL '+X.version+'. Durations of waits are set by the script\'s pace (it waits about 2 s per step while something is blocked), not by the database.';
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
    $('rd-long-note').textContent='Measured '+X.date+' on PostgreSQL '+X.version+' with autovacuum turned off for the table so that only the effect of the open transaction shows; read latency is the median of 300 primary-key reads from Python over TCP loopback. Script: src/measure/extras.py.';
  }
  // contention benchmark
  const B=TXD.bench;let pool='hot',met='tps';
  const MODE={rc_naive:['Read committed, read then write (wrong)','var(--bad)','Naive read, write'],rc_atomic:['Read committed, one atomic UPDATE','var(--c3)','Atomic UPDATE'],rc_for_update:['Read committed, FOR UPDATE','var(--c1)','FOR UPDATE'],ser_retry:['Serializable with the retry loop','var(--c4)','Serializable + retry']};
  const MET={tps:['commits_per_s','commits per second',v=>fmt(v)],retry:['retries_per_commit','retries per commit',v=>v.toFixed(3)],p99:['p99_ms','p99 latency, ms',v=>v.toFixed(1)],lost:['lost_updates','updates lost (messages saved minus credits charged)',v=>fmt(v)]};
  function drawB(){const box=$('rd-bench');if(!box)return;
    const rs=B.runs.filter(r=>r.contention===pool),m=MET[met];
    const mx=Math.max(1e-9,...rs.map(r=>r[m[0]]||0));
    let h='<div class="small mute">'+m[1]+'</div><div class="leg">'+Object.keys(MODE).map(k=>'<span style="--sw:'+MODE[k][1]+'">'+MODE[k][0]+'</span>').join('')+'</div>';
    [2,8,32].forEach(n=>{h+='<div class="band">'+n+' clients</div><div class="bars">';
      Object.keys(MODE).forEach(k=>{const r=rs.find(x=>x.mode===k&&x.clients===n);if(!r)return;const v=r[m[0]]||0;
        h+='<div class="row"><div class="nm" title="'+esc(MODE[k][0])+'">'+esc(MODE[k][2])+'</div><div class="track"><div class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:'+MODE[k][1]+'"></div></div><div class="val">'+m[2](v)+'</div></div>'});
      h+='</div>'});
    box.innerHTML=h;
  }
  if($('rd-bench')){RD.seg($('rd-bench-pool'),v=>{pool=v;drawB()});RD.seg($('rd-bench-met'),v=>{met=v;drawB()});drawB();
    const g=B.runs.filter(r=>r.mode==='ser_retry'&&r.contention==='hot').map(r=>r.gave_up);
    $('rd-bench-note').textContent='Measured '+B.date+' on PostgreSQL '+B.version+', '+B.machine+'; each client is its own Python process with its own connection, '+B.secs+' s per run, one run per cell (a rerun of the same grid differed by up to about 30% in commits per second, so read the shape, not the third digit). Serializable transactions that failed 10 attempts and were given up, 4 hot users: '+g.join(', ')+' at 2, 8, 32 clients. Script: src/measure/bench.py.';
  }
})();
