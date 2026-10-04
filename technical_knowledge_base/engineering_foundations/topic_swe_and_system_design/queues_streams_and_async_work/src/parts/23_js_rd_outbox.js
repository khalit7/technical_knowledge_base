// ---- Reading, dual write: the same order 42 through a naive dual write (two orders of the writes) and the transactional outbox ----
// Each step is a snapshot of what every system holds; the crash points are the ones the measured lab injects (lab/pg_lab.py).
(function(){
  const box=document.getElementById('rd-ob-svg');if(!box)return;
  const cap=document.getElementById('rd-ob-cap'),cnt=document.getElementById('rd-ob-cnt');
  // snapshot fields: a = active box, x = crashed box, o = orders, ob = outbox rows [event, sent], b = broker events,
  // p = processed_events (consumer's dedup table), m = e-mails sent, ar = arrow [from,to], t/c = caption title/text
  const S={
   naive:[
    {a:'api',o:[],ob:null,b:[],p:null,m:[],t:'Order 42 arrives',c:'A customer places order 42. Our order API must do two things: save the order in Postgres, and tell the rest of the company (e-mail, warehouse, analytics) by publishing an "order placed" event to the broker. Two systems, and no transaction spans both.'},
    {a:'db',o:['42'],ob:null,b:[],p:null,m:[],ar:['api','db'],t:'Write 1: save the order, COMMIT',c:'<code>INSERT INTO orders ...; COMMIT;</code> The order is now durable: Postgres has promised it survives a crash.'},
    {a:'api',x:'api',o:['42'],ob:null,b:[],p:null,m:[],t:'The process dies before write 2',c:'A deploy, an out-of-memory kill, a lost network packet to the broker: anything that stops the process between the two writes. In the measured lab this is <code>os._exit()</code> at exactly this line.'},
    {a:'api',o:['42'],ob:null,b:[],p:null,m:[],t:'Restart: nothing remembers the event',c:'The new process handles the next order. The event for order 42 lived only in the dead process\'s memory. No error was logged anywhere: the database is fine and the broker is fine.'},
    {a:'cons',o:['42'],ob:null,b:[],p:null,m:[],t:'Result: a lost event',c:'Order 42 exists, but no receipt is ever sent, the warehouse never ships it, analytics never counts it. Measured on a real Postgres: 500 orders with a 5% crash chance lost 19, 28 and 27 events in three runs, one per crash, silently.'}],
   first:[
    {a:'api',o:[],ob:null,b:[],p:null,m:[],t:'Order 42 arrives',c:'Same order, the writes the other way round: publish first, so the event cannot be lost, then save.'},
    {a:'broker',o:[],ob:null,b:['e42'],p:null,m:[],ar:['api','broker'],t:'Write 1: publish "order 42 placed"',c:'The broker has the event durably. Consumers may read it at once.'},
    {a:'api',x:'api',o:[],ob:null,b:['e42'],p:null,m:[],t:'The process dies before write 2',c:'The order\'s transaction never commits; Postgres rolls it back.'},
    {a:'cons',o:[],ob:null,b:['e42'],p:null,m:['42'],ar:['broker','cons'],t:'A consumer acts on an order that does not exist',c:'The e-mail service sends a receipt for order 42; the warehouse may ship it. But order 42 is in no database. A <b>phantom event</b>.'},
    {a:'cons',o:[],ob:null,b:['e42'],p:null,m:['42'],t:'Result: the opposite failure',c:'Swapping the order of two writes only swaps which failure you get. Measured: 19, 28 and 27 phantom events per 500 orders. Any fix must make the two writes one.'}],
   outbox:[
    {a:'api',o:[],ob:[],b:[],p:[],m:[],t:'Order 42 arrives',c:'The outbox pattern: the API never talks to the broker. It writes the event as a row in an <code>outbox</code> table in the same database as the order.'},
    {a:'db',o:['42'],ob:[['e42',0]],b:[],p:[],m:[],ar:['api','db'],t:'One transaction: the order and its event',c:'<code>BEGIN; INSERT INTO orders ...; INSERT INTO outbox (event_id, payload) ...; COMMIT;</code> Both rows commit, or neither does. There is only one write.'},
    {a:'api',x:'api',o:['42'],ob:[['e42',0]],b:[],p:[],m:[],t:'The API crashes now: nothing is lost',c:'Unlike the naive version, the event is already durable, waiting in the outbox with <code>sent_at</code> empty.'},
    {a:'relay',o:['42'],ob:[['e42',0]],b:[],p:[],m:[],ar:['db','relay'],t:'The relay finds unsent rows',c:'A separate process, the <b>relay</b>, polls: <code>SELECT ... FROM outbox WHERE sent_at IS NULL ORDER BY seq LIMIT 10 FOR UPDATE SKIP LOCKED</code>. (Or a change-data-capture tool such as Debezium reads the same rows from the database\'s log.)'},
    {a:'broker',o:['42'],ob:[['e42',0]],b:['e42'],p:[],m:[],ar:['relay','broker'],t:'It publishes e42 to the broker',c:'The broker now has the event.'},
    {a:'relay',x:'relay',o:['42'],ob:[['e42',0]],b:['e42'],p:[],m:[],t:'The relay crashes before marking the row sent',c:'The same two-writes gap, moved to a place where it is harmless: the row still says unsent, so the event will be sent again.'},
    {a:'broker',o:['42'],ob:[['e42',1]],b:['e42','e42'],p:[],m:[],ar:['relay','broker'],t:'Restart: e42 is published again, then marked sent',c:'The broker holds e42 twice. The outbox gives <b>at-least-once</b> publishing: never lost, sometimes duplicated. Measured: 0 events lost in three runs; 24 to 32 duplicates per 500 orders with one event per relay transaction, 147 to 185 with batches of 10.'},
    {a:'cons',o:['42'],ob:[['e42',1]],b:['e42','e42'],p:['e42'],m:['42'],ar:['broker','cons'],t:'The consumer handles e42 once',c:'In one transaction it records <code>e42</code> in its <code>processed_events</code> table (a primary key on the event id) and does its work: one receipt.'},
    {a:'cons',o:['42'],ob:[['e42',1]],b:['e42','e42'],p:['e42'],m:['42'],ar:['broker','cons'],t:'The duplicate arrives and is skipped',c:'Inserting <code>e42</code> again violates the primary key, so the consumer knows it has seen it and acknowledges without acting. This is the <b>idempotent consumer</b> (also called the inbox pattern).'},
    {a:'cons',o:['42'],ob:[['e42',1]],b:['e42','e42'],p:['e42'],m:['42'],t:'Result: nothing lost, nothing doubled',c:'One order, one event delivered at least once, one e-mail. The outbox removes loss; the consumer\'s deduplication removes the duplicates. Together they give the effect people mean by "exactly once".'}]};
  let mode='naive';
  const NM={api:'Order API',db:'Postgres',relay:'Outbox relay',broker:'Broker (a Kafka topic or a queue)',cons:'E-mail service'};
  function chips(arr,x,y,w,col,lab){let s='',cx=x;for(const v of arr){const t=Array.isArray(v)?v[0]+(v[1]?' sent':' unsent'):v;const ww=Math.min(w,8+t.length*6.4);
      s+='<rect x="'+cx+'" y="'+y+'" width="'+ww+'" height="18" rx="4" fill="'+col+'" opacity="'+(Array.isArray(v)&&v[1]?.45:.9)+'"/>'+RD.t(cx+ww/2,y+13,t,{fs:10.5,a:'middle',fill:'var(--bg)',w:600});cx+=ww+4}
    if(!arr.length)s+=RD.t(x,y+13,lab||'(empty)',{fs:10.5,fill:'var(--mute)'});return s}
  function draw(i){
    const st=S[mode][Math.min(i,S[mode].length-1)];
    const W=Math.max(300,Math.min(860,RD.width(box)));const narrow=W<560;
    const bw=narrow?W-2:W-2,bh=54,gap=18;
    const rows=mode==='outbox'?['api','db','relay','broker','cons']:['api','db','broker','cons'];
    const Y={};rows.forEach((r,k)=>Y[r]=4+k*(bh+gap));
    const H=4+rows.length*(bh+gap);
    let b='<defs><marker id="obar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    for(const r of rows){const y=Y[r],on=st.a===r,dead=st.x===r;
      b+='<rect x="1" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+(dead?'var(--bad)':on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on||dead?2:1)+'"/>';
      b+=RD.t(10,y+16,NM[r],{fs:12,w:600});
      if(dead)b+=RD.t(bw-8,y+16,'crashed',{fs:11.5,a:'end',fill:'var(--bad)',w:600});
      const cx=10,cy=y+26;
      if(r==='db'){const half=narrow?bw:bw/2;
        b+=RD.t(cx,cy+13,'orders:',{fs:10.5,fill:'var(--mute)'})+chips(st.o,cx+48,cy,60,'var(--c1)');
        if(st.ob){const ox=narrow?cx+120:cx+half;b+=RD.t(ox,cy+13,'outbox:',{fs:10.5,fill:'var(--mute)'})+chips(st.ob,ox+50,cy,100,'var(--c4)')}
        else if(!narrow)b+=RD.t(cx+half,cy+13,'(no outbox table)',{fs:10.5,fill:'var(--mute)'})}
      if(r==='broker')b+=RD.t(cx,cy+13,'events:',{fs:10.5,fill:'var(--mute)'})+chips(st.b,cx+50,cy,40,'var(--c2)');
      if(r==='cons'){b+=RD.t(cx,cy+13,'receipts sent:',{fs:10.5,fill:'var(--mute)'})+chips(st.m,cx+86,cy,40,st.o.indexOf('42')<0&&st.m.length?'var(--bad)':'var(--c3)');
        if(st.p)b+=RD.t(narrow?cx+150:bw/2,cy+13,'processed_events: '+(st.p.length?st.p.join(', '):'(empty)'),{fs:10.5,fill:'var(--mute)'})}
      if(r==='relay')b+=RD.t(cx,cy+13,'polls the outbox, publishes, marks sent',{fs:10.5,fill:'var(--mute)'});
      if(r==='api')b+=RD.t(cx,cy+13,mode==='outbox'?'writes only to its own database':'writes to the database and to the broker',{fs:10.5,fill:'var(--mute)'})}
    if(st.ar){const f=st.ar[0],t=st.ar[1];const y1=Y[f]+bh,y2=Y[t];const xx=bw-40;
      b+='<line x1="'+xx+'" y1="'+(y1>y2?Y[f]:y1)+'" x2="'+xx+'" y2="'+(y1>y2?Y[t]+bh:y2-2)+'" stroke="var(--acc)" stroke-width="2.5" marker-end="url(#obar)"/>'}
    box.innerHTML=RD.svg(W,H,b,'Order 42 through '+(mode==='outbox'?'the outbox pattern':'a naive dual write'));
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+S[mode].length+': '+st.t+'</div><p>'+st.c+'</p>';
    const lost=st.o.length&&!st.b.length&&i===S[mode].length-1?1:0,ph=!st.o.length&&st.b.length?1:0;
    cnt.innerHTML=RD.stat('Orders saved',st.o.length)+RD.stat('Events in broker',st.b.length,st.b.length>1?'one is a duplicate':'')+
      RD.stat('Lost events',lost,lost?'order with no event':'')+RD.stat('Phantom events',ph,ph?'event with no order':'')+RD.stat('Receipts sent',st.m.length)}
  const A=RD.anim({card:'rd-ob-card',ctl:'rd-ob-ctl',n:S.naive.length,draw:draw,ms:2600,label:'Dual write step'});
  RD.seg(document.getElementById('rd-ob-seg'),m=>{mode=m;A.reset(S[m].length);A.play()});
  RD.onResize(()=>A.redraw());
})();
