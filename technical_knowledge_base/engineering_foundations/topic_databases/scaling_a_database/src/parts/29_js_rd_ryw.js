// ---- Section 3: read-your-writes, the same reload under three routes (stepper; log positions illustrative) ----
(function(){
  const box=document.getElementById('rwSvg');if(!box)return;
  let mode='naive';
  const A='var(--acc)',L='var(--line)',G='var(--good)',B='var(--bad)',M='var(--mute)';
  const CAP={
    naive:[['The user sends a message','The write goes to the primary, which commits it at log position 0/3000060.'],
      ['The log streams to the replica','The replica has replayed up to 0/3000020: a fraction of a millisecond behind, which is normal.'],
      ['The chat reloads from any replica','The router sees a read and picks a replica. Nothing tells it that this user just wrote.'],
      ['The message is missing','The replica answers from 0/3000020, before the write. To the user the message looks lost.'],
      ['How often, measured','On Distributed systems fundamentals\' real Postgres replica, 1,993 of 2,000 immediate reads missed the write. Lag is short, but a reload is shorter.']],
    sticky:[['The user sends a message','The write goes to the primary, which commits it at 0/3000060; the app records last_write_at for this user.'],
      ['The log streams to the replica','The replica is at 0/3000020, behind the write.'],
      ['The chat reloads: this user wrote recently','now() minus last_write_at is under STICKY_SECONDS, so the router sends this user\'s reads to the primary.'],
      ['The message is there','The primary has every write, so the reload shows it.'],
      ['What it costs','Every recent writer reads from the primary for a few seconds: simple, but it spends the primary capacity replicas were meant to save.']],
    lsn:[['The user sends a message','The primary commits at 0/3000060; the app keeps that position, from pg_current_wal_insert_lsn().'],
      ['The log streams to the replica','The replica is at 0/3000020, behind the write.'],
      ['The chat reloads: is the replica past the write?','The router compares pg_last_wal_replay_lsn() on the replica (0/3000020) with the user\'s 0/3000060: not yet, so the read waits (or tries another replica, or the primary).'],
      ['The replica catches up, the read runs','Replay passes 0/3000080, beyond the write, and the read runs on the replica with the message in it.'],
      ['What it costs','A short wait: median 0.105 ms on loopback, measured on Distributed systems fundamentals. PostgreSQL 19 adds WAIT FOR LSN for exactly this.']]};
  function draw(i){
    const W=Math.max(300,RD.width(box)),H=220,dk=W<520;
    const ax=6,aw=dk?62:90,rx=dk?W*0.30:W*0.34,rw=dk?66:92,dx=dk?W*0.58:W*0.62,dw=W-dx-6;
    const g=['<defs><marker id="rwA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker><marker id="rwM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>'];
    const rect=(x,y,w,h,st,sw)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="'+st+'" stroke-width="'+(sw||1.2)+'"/>';
    const arr=(x1,y1,x2,y2,c,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="2.5"'+(dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#'+(c===M?'rwM':'rwA')+')"/>';
    // user/app and router
    g.push(rect(ax,92,aw,36,L)+RD.t(ax+aw/2,114,dk?'user':'user + app',{a:'middle',fs:11.5,w:600}));
    g.push(rect(rx,92,rw,36,i===2?A:L,i===2?2:1.2)+RD.t(rx+rw/2,114,'router',{a:'middle',fs:11.5,w:600}));
    // primary and replica with log bars
    const pY=14,qY=150,bh=56;
    const logbar=(y,pos,label,c)=>{const x0=dx+10,w=dw-20;return '<rect x="'+x0+'" y="'+(y+30)+'" width="'+w+'" height="10" rx="3" fill="var(--soft)" stroke="'+L+'"/>'+
      '<rect x="'+x0+'" y="'+(y+30)+'" width="'+(w*pos)+'" height="10" rx="3" fill="'+c+'"/>'+RD.t(x0,y+52,label,{fs:11,fill:M})};
    const pOn=i===0||(mode==='sticky'&&i>=2&&i<=3),qOn=(mode!=='sticky'&&i>=2);
    g.push(rect(dx,pY,dw,bh,pOn?A:L,pOn?2:1.2)+RD.t(dx+10,pY+18,'primary',{fs:12,w:600}));
    g.push(logbar(pY,0.75,'log at 0/3000060',A));
    const qpos=mode==='lsn'&&i>=3?0.85:0.5,ql=mode==='lsn'&&i>=3?'replayed to 0/3000080':'replayed to 0/3000020';
    g.push(rect(dx,qY-6,dw,bh,qOn?(mode==='naive'&&i>=3?B:A):L,qOn?2:1.2)+RD.t(dx+10,qY+12,'replica',{fs:12,w:600}));
    g.push(logbar(qY-6,qpos,ql,qpos>=0.75?G:'var(--c5)'));
    // arrows by step
    if(i===0){g.push(arr(ax+aw,104,rx-2,104,A));g.push(arr(rx+rw,100,dx-2,pY+30,A));g.push(RD.t(ax+aw+4,88,'write',{fs:11,fill:A}))}
    if(i>=1)g.push(arr(dx+dw/2,pY+bh+2,dx+dw/2,qY-10,M,true));
    if(i>=1&&!dk)g.push(RD.t(dx+dw/2+6,(pY+bh+qY)/2,'log stream',{fs:11,fill:M}));
    if(i>=2){g.push(arr(ax+aw,118,rx-2,118,A));g.push(RD.t(ax+2,146,'reload',{fs:11,fill:A}));
      if(mode==='sticky')g.push(arr(rx+rw,104,dx-2,pY+40,A));
      else if(mode==='naive'||i>=3)g.push(arr(rx+rw,120,dx-2,qY+16,A));
      else g.push('<line x1="'+(rx+rw)+'" y1="120" x2="'+(rx+rw+(dx-rx-rw)*0.45)+'" y2="'+(120+(qY+16-120)*0.45)+'" stroke="'+A+'" stroke-width="2.5" stroke-dasharray="2 4"/>'+RD.t(rx+rw+4,150,'wait',{fs:11,fill:A}))}
    if(i>=3){const ok=mode!=='naive';g.push(RD.t(rx+rw/2,170,ok?'message shown':'message missing',{a:'middle',fs:12,w:600,fill:ok?G:B}))}
    box.innerHTML=RD.svg(W,H,g.join(''),'Read-your-writes routes');
    const c=CAP[mode][i];
    document.getElementById('rwCap').innerHTML='<div class="t">Step '+(i+1)+' of 5: '+c[0]+'</div><p>'+c[1]+'</p>';
  }
  const an=RD.anim({card:'rwCard',ctl:'rwCtl',n:5,draw,ms:1800,label:'Read-your-writes step'});
  RD.seg(document.getElementById('rwM'),v=>{mode=v;an.reset(5)});
  RD.onResize(()=>an.redraw());
})();
