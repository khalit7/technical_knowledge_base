// ---- Reading tab, section 5: the lost update three ways, with the real heap page and snapshots (TXD.mvcc, recorded by src/measure/mvcc_trace.py) ----
(function(){
  const card=document.getElementById('rd-mv-card');if(!card)return;
  const M=TXD.mvcc,esc=RD.esc;
  const $=id=>document.getElementById(id);
  // captions per mode and step: [title, text]; {x} placeholders are filled from the recording
  const CAP={
    naive:[
      ['Start','Ines\'s row is one version on the page: balance 30, created by transaction {x0} long ago. Both tabs run at read committed, Postgres\'s default.'],
      ['A reads 30','A\'s snapshot is <code>{snapA}</code>: every transaction below {sx} has finished and none is running. A has no transaction id yet, because it has not written anything.'],
      ['B begins','B opens its transaction.'],
      ['B reads 30','B takes its own snapshot, the same one: it sees the same version, 30. Nothing blocks a read.'],
      ['A writes 20','A gets transaction id {xa}. It does not overwrite: it stamps xmax = {xa} on the old version and writes a new version with xmin = {xa}. Until A commits, everyone else still sees 30.'],
      ['A commits','One bit in the commit log flips: {xa} is committed. The old version is now dead and the new one is current.'],
      ['B writes 25','B\'s UPDATE takes a fresh snapshot (<code>{snapB2}</code>), finds the current version (20), and replaces it with the number B computed from its old read: 30 - 5 = 25. The database did what it was told.'],
      ['Result: an update lost','Three versions on the page; the current one says {fin}. Both spends committed; Ines was charged for one of them. Nothing in the database was wrong; the read and the write were simply two separate statements.']],
    for_update:[
      ['Start','The same row, the same two spends. This time each tab reads with SELECT ... FOR UPDATE.'],
      ['A reads 30 and locks it','The lock is written into the row itself: xmax = {xa} with a "lock only" flag. A now has a transaction id, because taking a row lock needs one.'],
      ['B begins','B opens its transaction.'],
      ['B waits','B asks for the same row lock and waits. Postgres reports B as waiting on a lock of type transactionid: B is waiting for A\'s whole transaction to end.'],
      ['A writes 20','A writes a new version (xmin = {xa}); it carries A\'s lock forward.'],
      ['A commits; B wakes up','A\'s commit releases the lock. B\'s read finally returns, and at read committed it re-reads the latest version: 20, not 30.'],
      ['B writes 15','B computes 20 - 5 = 15 and writes it.'],
      ['Result: correct','Final balance {fin}: both spends counted. The price was B\'s wait while A held the lock, which in real code includes whatever A does between its read and its commit.']],
    serializable:[
      ['Start','The same row and spends, both transactions at serializable.'],
      ['A reads 30','A takes its snapshot <code>{snapA}</code>; at serializable it keeps it for the whole transaction.'],
      ['B begins','B opens its transaction.'],
      ['B reads 30','B takes its snapshot, also <code>{snapB}</code>, and keeps it.'],
      ['A writes 20','A writes a new version, xmin = {xa}.'],
      ['A commits','The version 20 is current; B\'s snapshot still cannot see it, because {xa} was not finished when B\'s snapshot was taken.'],
      ['B is refused','B tries to update the version it can see (30), but that version was replaced by a transaction B cannot see. Postgres answers "{err}" and the transaction is dead. No new version was written.'],
      ['B rolls back','B\'s COMMIT is answered with ROLLBACK.'],
      ['B retries','The application catches SQLSTATE 40001 and runs the whole transaction again (section 9).'],
      ['B reads 20','A new snapshot, <code>{snapB3}</code>, sees A\'s commit.'],
      ['B writes 15','20 - 5 = 15.'],
      ['Result: correct, one retry','Final balance {fin}. No one waited for a lock; B did its work twice instead.']]
  };
  let mode='naive';
  function vars(run){
    const v={fin:run.final};const st=run.steps;
    const p0=st[0].page[0];v.x0=p0.xmin;
    const f=(i)=>((st[i]||{}).f||[]).find(z=>z.i===i)||{};
    const all=[];st.forEach(s=>s.f.forEach(z=>all.push(z)));const byI={};all.forEach(z=>byI[z.i]=z);
    v.snapA=(byI[1]||{}).snap||'';v.sx=(v.snapA||'').split(':')[0];
    v.snapB=(byI[3]||{}).snap||'';
    const ua=byI[4]||{};v.xa=ua.xid||((byI[1]||{}).xid)||'';
    if(mode==='for_update'){const lk=st[1].page[0];v.xa=lk.xmax||v.xa}
    v.snapB2=(byI[6]||{}).snap||'';v.err=(byI[6]||{}).err||'';v.snapB3=(byI[9]||{}).snap||'';
    return v;
  }
  function fill(s,v){return s.replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?esc(v[k]):m)}
  function draw(i){
    const run=M.runs[mode],st=run.steps,cur=st[i],v=vars(run);
    // lanes
    let h='<div class="trc" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div class="hd">Tab A</div><div class="hd">Tab B</div>';
    const doneAt={};st.slice(0,i+1).forEach((s,k)=>s.f.forEach(z=>doneAt[z.i]=k));
    for(let k=0;k<=i;k++){const s=st[k];
      const res=st.slice(k,i+1).flatMap(x=>x.f).find(z=>z.i===k);
      let r='';if(res){r=res.err?'<span class="r e">'+esc(res.err)+'</span>':(res.bal!==undefined?'<span class="r">returns '+res.bal+'</span>':'<span class="r">'+esc(res.st||'')+'</span>');
        if(doneAt[k]>k)r='<span class="late">finished at step '+(doneAt[k]+1)+'</span>'+r}
      else if(s.b)r='<span class="wt">waiting for a lock</span>';
      const cell='<div class="c'+(k===i?' cur':'')+(s.b&&!(doneAt[k]<=k)?' blk':'')+'"><code>'+esc(s.q)+'</code>'+r+'</div>';
      h+=s.s==='A'?cell+'<div></div>':'<div></div>'+cell}
    $('rd-mv-lanes').innerHTML=h+'</div>';
    // page
    $('rd-mv-page').innerHTML=cur.page.map(t=>{
      const lock=t.xmax&&t.xmax_is_lock_only,dead=t.xmax&&!lock&&t.xmax_status==='committed',isnew=t.xmin_status==='in progress';
      const live=!dead&&!isnew&&t.xmin_status!=='aborted';
      return '<div class="tup'+(dead?' dead':'')+(isnew?' new':'')+(live?' vis':'')+'"><div class="x">item '+t.lp+'</div><div class="bal">'+t.balance+'</div>'+
        '<div class="x">xmin '+t.xmin+' <span class="mute">('+esc(t.xmin_status)+')</span></div>'+
        '<div class="x">xmax '+(t.xmax||0)+(t.xmax?' <span class="mute">('+(lock?'lock only, ':'')+esc(t.xmax_status||'')+')</span>':'')+'</div>'+
        '<div class="small">'+(dead?'dead: replaced':isnew?'not committed yet':'current')+'</div></div>'}).join('');
    // sessions
    const last={A:null,B:null},blocked={A:false,B:false};
    st.slice(0,i+1).forEach((s,k)=>{s.f.forEach(z=>{if(z.snap)last[z.s]=z})});
    st.slice(0,i+1).forEach((s,k)=>{if(s.b&&!(doneAt[k]<=i&&st.slice(k,i+1).flatMap(x=>x.f).some(z=>z.i===k)))blocked[s.s]=true});
    $('rd-mv-snaps').innerHTML=['A','B'].map(n=>{const z=last[n];
      return '<div><b>Session '+n+'</b>'+(blocked[n]?' <span class="wt">waiting</span>':'')+'<br>'+(z?'snapshot <code>'+esc(z.snap)+'</code>; xid '+(z.xid?esc(z.xid):(mode==='for_update'&&n==='A'&&i>=1?esc(v.xa)+' (from the lock)':'none yet'))+'; last statement returned '+z.bal:'no snapshot yet')+'</div>'}).join('');
    // counters
    const committed=cur.page.find(t=>t.xmin_status==='committed'&&!(t.xmax&&!t.xmax_is_lock_only&&t.xmax_status==='committed'));
    const nret=mode==='serializable'&&i>=8?1:0;
    const end=i===st.length-1;
    $('rd-mv-cnt').innerHTML=RD.stat('Committed balance',committed?committed.balance:'?')+RD.stat('Row versions on the page',cur.page.length)+RD.stat('Retries',nret)+
      RD.stat('Outcome',!end?'running':(run.final===15?'<span style="color:var(--good)">15: both spends counted</span>':'<span style="color:var(--bad)">'+run.final+': an update lost</span>'));
    const c=CAP[mode][i]||['',''];
    $('rd-mv-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+st.length+': '+fill(c[0],v)+'</div><p>'+fill(c[1],v)+'</p>';
  }
  const a=RD.anim({card:'rd-mv-card',ctl:'rd-mv-ctl',n:M.runs.naive.steps.length,ms:2600,label:'MVCC step',draw});
  RD.seg($('rd-mv-mode'),m=>{mode=m;a.reset(M.runs[m].steps.length);a.play()});
  $('rd-mv-note').innerHTML='Recorded '+M.date+' on PostgreSQL '+esc(M.version)+' (the conda-forge build, used here because it ships pageinspect; every other run on this page used 16.2 from the pgserver wheel). Transaction ids differ between the three runs because each run is a new transaction on the same server. Script: src/measure/mvcc_trace.py.';
})();
