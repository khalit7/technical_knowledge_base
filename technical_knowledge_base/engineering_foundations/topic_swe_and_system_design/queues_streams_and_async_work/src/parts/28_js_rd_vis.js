// ---- Reading: static diagrams and small widgets added in the 2026-10-24 rebuild ----
// Kafka's transaction scope, the backlog drain slider, and the batch-job stepper (RD.anim with its step list sx-bj, 2026-11-07).
// The hero, the queue-against-log diagram and the visibility-timeout toggle became 3D stages (34_js_sc_hero.js, 35_js_sc_ql.js, 38_js_sc_vt.js).
(function(){
  const $=id=>document.getElementById(id);
  const T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>'};
  const defs='<defs><marker id="rvar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  const arr=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.6" marker-end="url(#rvar)"/>';

  // ---------- Kafka transaction scope ----------
  function eos(){const el=$('rd-eos');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));const wide=W>=640;let b=defs;
    if(wide){const y=34,h=46;
      b+=box(1,y+40,150,h)+T(10,y+60,'input topic A',{fs:12,w:600})+T(10,y+76,'offset 41 read',{fs:11,fill:'var(--mute)'});
      b+=box(190,y+40,170,h,{stroke:'var(--acc)',sw:2})+T(200,y+60,'stream processor',{fs:12,w:600})+T(200,y+76,'read, compute, write',{fs:11,fill:'var(--mute)'});
      const tx=400,tw=W-tx-2;
      b+=box(tx,y-26,tw,150,{fill:'none',stroke:'var(--good)',sw:1.6,dash:1})+T(tx+10,y-10,'one Kafka transaction: visible together or not at all',{fs:11.5,w:600,fill:'var(--good)'});
      b+=box(tx+12,y+2,tw-24,40)+T(tx+22,y+20,'output topic B: records',{fs:12,w:600})+T(tx+22,y+35,'idempotent producer: (producer id, seq)',{fs:11,fill:'var(--mute)'});
      b+=box(tx+12,y+54,tw-24,40)+T(tx+22,y+72,'__consumer_offsets: "A at 42"',{fs:12,w:600})+T(tx+22,y+87,'sendOffsetsToTransaction',{fs:11,fill:'var(--mute)'});
      b+=box(tx,y+138,tw,44,{stroke:'var(--bad)'})+T(tx+10,y+156,'send e-mail, write Postgres: outside',{fs:12,w:600,fill:'var(--bad)'})+T(tx+10,y+172,'at-least-once: deduplicate on an id',{fs:11,fill:'var(--mute)'});
      b+=arr(152,y+63,188,y+63)+arr(362,y+55,tx+10,y+22)+arr(362,y+70,tx+10,y+74)+arr(362,y+80,tx-2,y+158,'var(--bad)');
      el.innerHTML=RD.svg(W,y+186,b,'What a Kafka transaction covers')}
    else{const x=1,w=W-2;let y=2;
      b+=box(x,y,w,40)+T(x+10,y+17,'input topic A',{fs:12,w:600})+T(x+10,y+33,'offset 41 read',{fs:11,fill:'var(--mute)'});y+=40;b+=arr(40,y+2,40,y+18);y+=20;
      b+=box(x,y,w,40,{stroke:'var(--acc)',sw:2})+T(x+10,y+17,'stream processor',{fs:12,w:600})+T(x+10,y+33,'read, compute, write',{fs:11,fill:'var(--mute)'});y+=40;b+=arr(40,y+2,40,y+18);y+=20;
      b+=box(x,y,w,128,{fill:'none',stroke:'var(--good)',sw:1.6,dash:1})+T(x+10,y+16,'one Kafka transaction',{fs:11.5,w:600,fill:'var(--good)'});
      b+=box(x+10,y+24,w-20,44)+T(x+20,y+42,'output topic B: records',{fs:12,w:600})+T(x+20,y+58,'idempotent: (producer id, seq)',{fs:11,fill:'var(--mute)'});
      b+=box(x+10,y+76,w-20,44)+T(x+20,y+94,'__consumer_offsets: "A at 42"',{fs:12,w:600})+T(x+20,y+110,'sendOffsetsToTransaction',{fs:11,fill:'var(--mute)'});y+=136;
      b+=box(x,y,w,44,{stroke:'var(--bad)'})+T(x+10,y+18,'e-mail, Postgres: outside',{fs:12,w:600,fill:'var(--bad)'})+T(x+10,y+35,'at-least-once: deduplicate on an id',{fs:11,fill:'var(--mute)'});y+=46;
      el.innerHTML=RD.svg(W,y,b,'What a Kafka transaction covers')}}

  // ---------- backlog drain slider ----------
  function dr(){const el=$('rd-dr');if(!el)return;const k=+$('rd-dr-k').value;$('rd-dr-kv').textContent=k.toFixed(2).replace(/0$/,'')+'×';
    const out=60,drain=out/(k-1),XM=360,W=Math.max(300,Math.min(860,RD.width(el))),x0=40,x1=W-12,y0=10,y1=150;
    const sx=t=>x0+(x1-x0)*Math.min(t,XM)/XM,sy=v=>y1-(y1-y0)*v/60;let b='';
    [0,30,60].forEach(v=>{b+='<line x1="'+x0+'" y1="'+sy(v)+'" x2="'+x1+'" y2="'+sy(v)+'" stroke="var(--line)"/>'+T(x0-4,sy(v)+4,String(v),{a:'end',fs:10.5,fill:'var(--mute)'})});
    for(let t=0;t<=XM;t+=60){b+=T(sx(t),y1+15,(t/60)+' h',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    b+='<rect x="'+sx(0)+'" y="'+y0+'" width="'+(sx(60)-sx(0))+'" height="'+(y1-y0)+'" fill="var(--bad)" opacity=".08"/>'+T(sx(0)+4,y1-6,W<520?'down':'consumers down',{fs:11,fill:'var(--bad)'});
    const tEnd=60+drain,left=tEnd>XM?60-(k-1)*(XM-60):0;
    b+='<polyline fill="none" stroke="var(--acc)" stroke-width="2.5" points="'+sx(0)+','+sy(0)+' '+sx(60)+','+sy(60)+' '+sx(Math.min(tEnd,XM))+','+sy(Math.max(0,left))+(tEnd<XM?' '+sx(XM)+','+sy(0):'')+'"/>';
    if(tEnd<=XM)b+='<circle cx="'+sx(tEnd)+'" cy="'+sy(0)+'" r="4" fill="var(--acc)"/>'+T(Math.min(sx(tEnd)+6,x1-70),sy(0)-8,'empty again',{fs:11,fill:'var(--acc)'});
    else b+=T(x1,Math.min(y1-6,sy(left)+18),'still '+Math.round(left)+' min of backlog at 6 h',{a:'end',fs:11,fill:'var(--acc)'});
    b+=T(x0+4,y1+30,'backlog, in minutes of arrivals (= age of the oldest message)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y1+36,b,'Backlog during and after a one-hour outage');
    const fm=m=>m>=120?(m/60).toFixed(m%60?1:0)+' h':Math.round(m)+' min';
    $('rd-dr-out').innerHTML=RD.stat('Spare capacity',Math.round((k-1)*100)+'%','of the arrival rate')+RD.stat('Drain time',fm(drain),'after consumers return')+RD.stat('Oldest message, worst',fm(60),'when consumers return')}
  if($('rd-dr-k'))$('rd-dr-k').addEventListener('input',dr);

  // ---------- batch job stepper ----------
  const BR=['Scheduler','Jobs table','Worker','Provider batch','Results table','Dead letters','Outbox, log'];
  const BS=[
    {a:[0,1],s:{0:'02:00 fires for 2026-10-23',1:'eval:2026-10-23 queued'},t:'Cron enqueues one job, keyed by the scheduled date',c:'<code>INSERT INTO jobs (key, ...) VALUES (\'eval:2026-10-23\', ...) ON CONFLICT (key) DO NOTHING</code>. <b>Fails if</b> two schedulers fire, or a rerun or backfill fires again. <b>Made harmless by</b> the key: the second insert does nothing (<a href="#s-cron">cron</a>).'},
    {a:[1,2],s:{1:'eval:2026-10-23 running',2:'lease 5 min, heartbeat'},t:'A worker claims it with a lease, and heartbeats',c:'It builds 20,000 requests, each with <code>custom_id</code> = the conversation id. <b>Fails if</b> the worker dies. <b>Made harmless by</b> the lease: the job reappears for another worker within one timeout, and heartbeats stop a slow build from being taken over (<a href="#s-vt">visibility timeouts</a>).'},
    {a:[1,3],s:{1:'running, batch_id = b_7',2:'lease 5 min, heartbeat',3:'b_7 in_progress, 20,000 req'},t:'Submit the batch, then record its id',c:'Submitting is a call to someone else\'s system and recording the id is a write to yours: a dual write. <b>Fails if</b> the worker dies between them; a rerun would submit and pay for a second batch. <b>Made harmless by</b> writing <code>status = submitting</code> first and, on a restart in that state, listing the account\'s recent batches before submitting again (<a href="#s-dual">dual writes</a>).'},
    {a:[0,3],s:{0:'poll every 10 min',1:'running, batch_id = b_7',3:'b_7 ended: 19,962 ok, 38 errored'},t:'Poll until the batch ends',c:'The poller is a scheduled task that reads <code>batch_id</code> from the job row and asks for the status. <b>Fails if</b> the poller dies or runs twice. <b>Made harmless by</b> keeping the state in the job row, not in the poller: asking twice is a read.'},
    {a:[3,4],s:{1:'running, batch_id = b_7',3:'b_7 ended',4:'19,962 rows, upsert by custom_id'},t:'Fetch results and upsert them by custom_id',c:'<code>INSERT INTO results ... ON CONFLICT (custom_id) DO UPDATE</code>. <b>Fails if</b> the worker dies halfway through the file. <b>Made harmless by</b> the key: fetching and writing again leaves the same rows (<a href="#s-idem">idempotent consumers</a>).'},
    {a:[3,5],s:{1:'running, retry round 2',3:'b_8: 38 retries',4:'19,998 rows',5:'2 after 3 tries, alert'},t:'Resubmit only the failures; dead-letter the poison',c:'Errored or expired requests go into a smaller batch with the same <code>custom_id</code>s. <b>Fails if</b> a request fails every time (too long, malformed). <b>Made harmless by</b> a try limit: after 3, it goes to a dead-letter table with an alert, instead of looping forever (<a href="#s-dlq">dead letters</a>).'},
    {a:[1,6],s:{1:'done',4:'19,998 rows',5:'2 after 3 tries, alert',6:'eval-ready:2026-10-23 sent'},t:'Mark done and announce it, in one transaction',c:'<code>UPDATE jobs SET status = \'done\'</code> and <code>INSERT INTO outbox</code> commit together; the relay publishes "eval-ready" to the log at least once, and the dashboards deduplicate on the event id (<a href="#s-dual">outbox</a>). Cost: both providers charge 50% of the synchronous price for this route.'}];
  let bA=null;
  function bj(i){const el=$('rd-bj');if(!el)return;const st=BS[i],W=Math.max(300,Math.min(860,RD.width(el))),lx=W<520?104:130,rh=30;let b='';
    BR.forEach((r,k)=>{const y=2+k*rh,on=st.a.indexOf(k)>=0;
      b+='<rect x="1" y="'+y+'" width="'+(W-2)+'" height="'+(rh-4)+'" rx="6" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>';
      b+=T(9,y+17,r,{fs:12,w:600})+T(lx,y+17,st.s[k]||'',{fs:11,fill:on?'var(--ink)':'var(--mute)'})});
    el.innerHTML=RD.svg(W,2+BR.length*rh,b,'Batch job state at step '+(i+1))}
  window.QS_BJ=BS;   // the step list sx-bj is written from these titles and texts; check_stages.mjs compares them
  if($('rd-bj-card'))bA=RD.anim({card:'rd-bj-card',ctl:'rd-bj-ctl',n:BS.length,draw:bj,ms:5200,label:'Batch job step',list:'sx-bj'});

  function all(){eos();dr();if(bA)bA.redraw()}
  RD.onRender(all);RD.onResize(all);all();
})();
