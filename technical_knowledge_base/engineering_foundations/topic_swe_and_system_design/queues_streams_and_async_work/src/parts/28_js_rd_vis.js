// ---- Reading: static diagrams and small widgets added in the 2026-10-24 rebuild ----
// hero (three failure points), queue against log, Kafka's transaction scope, visibility-timeout toggle,
// backlog drain slider, and the batch-job stepper. Nothing moves until the reader acts.
(function(){
  const $=id=>document.getElementById(id);
  const T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>'};
  const defs='<defs><marker id="rvar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  const arr=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.6" marker-end="url(#rvar)"/>';
  const badge=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="10" fill="var(--bad)"/>'+T(x,y+4,n,{a:'middle',fs:12,w:700,fill:'var(--bg)'});

  // ---------- hero ----------
  function hero(){const el=$('rd-hero');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));
    const N=[['Order API','producer','saves order 42'],['Postgres','orders + outbox','one transaction'],['Broker','queue or log','arrivals λ'],['Workers','C workers, S s each','work, then ack'],['Effect','receipt, embedding','once, by event id']];
    let b=defs;
    if(W>=640){const g=26,bw=(W-2-g*4)/5,bh=72,y=22;
      N.forEach((n,i)=>{const x=1+i*(bw+g);b+=box(x,y,bw,bh,{stroke:i===2?'var(--acc)':'var(--line)',sw:i===2?2:1})+T(x+8,y+18,n[0],{fs:12.5,w:700})+T(x+8,y+36,n[1],{fs:11,fill:'var(--mute)'})+T(x+8,y+54,n[2],{fs:11,fill:'var(--mute)'});
        if(i<4)b+=arr(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2)});
      const xg=i=>1+i*(bw+g)+bw+g/2;
      b+=badge(xg(1),y+bh/2-16,'1')+T(xg(1),y+bh+16,'relay',{a:'middle',fs:11,fill:'var(--mute)'});
      b+=badge(1+3*(bw+g)+bw-12,y,'2')+badge(1+2*(bw+g)+bw-12,y,'3');
      b+=T(1+2*(bw+g)+bw/2,y+bh+16,'backlog if λ > C/S',{a:'middle',fs:11,fill:'var(--bad)'})+T(1+3*(bw+g)+bw/2,y+bh+16,'crash before ack: rerun',{a:'middle',fs:11,fill:'var(--bad)'});
      el.innerHTML=RD.svg(W,y+bh+26,b,'Producer, database with outbox, broker, workers and effect, with the three failure points');}
    else{const bh=46,g=24,x=1,bw=W-2;let y=4;
      N.forEach((n,i)=>{b+=box(x,y,bw,bh,{stroke:i===2?'var(--acc)':'var(--line)',sw:i===2?2:1})+T(x+10,y+19,n[0],{fs:12.5,w:700})+T(x+10,y+36,n[1]+'; '+n[2],{fs:11,fill:'var(--mute)'});
        if(i===2){b+=badge(bw-14,y+bh/2,'3')}
        if(i===3){b+=badge(bw-14,y+bh/2,'2')}
        if(i<4){b+=arr(x+40,y+bh+2,x+40,y+bh+g-2);if(i===1)b+=badge(x+64,y+bh+g/2,'1')+T(x+80,y+bh+g/2+4,'relay',{fs:11,fill:'var(--mute)'})}
        y+=bh+g});
      el.innerHTML=RD.svg(W,y-g+4,b,'Producer, database with outbox, broker, workers and effect, with the three failure points');}}

  // ---------- queue against log ----------
  function ql(){const el=$('rd-ql');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));const wide=W>=640;
    const pw=wide?(W-14)/2:W-2,ph=158;let b=defs;
    function panel(x0,y0,kind){b+=box(x0,y0,pw,ph,{fill:'var(--bg)'});
      b+=T(x0+10,y0+18,kind==='q'?'Queue: deleted on ack':'Log: kept, read by offset',{fs:12.5,w:700});
      const n=kind==='q'?6:8,cw=Math.min(46,(pw-20)/n),cy=y0+46;
      for(let i=0;i<n;i++){const cx=x0+10+i*cw;
        if(kind==='q'){const gone=i<2,held=i===2||i===3;
          b+='<rect x="'+cx+'" y="'+cy+'" width="'+(cw-4)+'" height="26" rx="4" fill="'+(gone?'none':held?'var(--acc2)':'var(--soft)')+'" stroke="'+(gone?'var(--dim)':held?'var(--acc)':'var(--line)')+'"'+(gone?' stroke-dasharray="3 3"':'')+'/>';
          b+=T(cx+(cw-4)/2,cy+17,'m'+(i+1),{a:'middle',fs:11,fill:gone?'var(--mute)':'var(--ink)'})}
        else{b+='<rect x="'+cx+'" y="'+cy+'" width="'+(cw-4)+'" height="26" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+T(cx+(cw-4)/2,cy+17,String(i),{a:'middle',fs:11})}}
      const mid=i=>x0+10+i*cw+(cw-4)/2;
      if(kind==='q'){b+=T(mid(0)-8,cy-8,'acked, deleted',{fs:10.5,fill:'var(--mute)'});
        b+=arr(mid(2),cy+60,mid(2),cy+30,'var(--acc)')+T(mid(2),cy+74,'worker A',{a:'middle',fs:11,fill:'var(--acc)'});
        b+=arr(mid(3)+6,cy+88,mid(3)+6,cy+30,'var(--acc)')+T(mid(3)+6,cy+100,'worker B',{a:'middle',fs:11,fill:'var(--acc)'});
        b+=T(mid(5),cy-8,'waiting',{a:'middle',fs:10.5,fill:'var(--mute)'})}
      else{const ptr=(i,lab,dy,c)=>{const m=mid(i),est=lab.length*6.2,right=m+6+est<=x0+pw-6;
          return arr(m,cy+dy,m,cy+30,c)+T(right?m+6:m-6,cy+dy+4,lab,{a:right?'start':'end',fs:11,fill:c})};
        b+=ptr(6,'e-mail group @6',60,'var(--acc)')+ptr(3,'analytics @3',80,'var(--c4)')+ptr(0,'new reader replays @0',100,'var(--c3)');
        b+=T(x0+pw-10,cy-8,'retained 7 days (Kafka default)',{a:'end',fs:10.5,fill:'var(--mute)'})}}
    if(wide){panel(1,1,'q');panel(pw+13,1,'l');el.innerHTML=RD.svg(W,ph+2,b,'A queue against a log')}
    else{panel(1,1,'q');panel(1,ph+12,'l');el.innerHTML=RD.svg(W,2*ph+14,b,'A queue against a log')}}

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

  // ---------- visibility timeout toggle ----------
  const VT={
    short:{T:80,V:30,msg:[[0,30,'hidden (A)'],[30,45,'hidden (B)']],del:45,A:[[0,45]],B:[[30,75]],fx:[[45,'A','receipt 1'],[75,'B','receipt 2']],crash:null,hb:[],
      cap:'<div class="t">Two runs, one duplicate, and no crash anywhere</div><p>Worker A takes the message at 0 s; it is hidden for 30 s. A is still working at 30 s, so the message becomes visible and worker B takes it. A finishes at 45 s, sends receipt 1 and deletes the message; B finishes at 75 s and sends receipt 2, and its delete finds nothing. Raising the timeout fixes this job and delays recovery from real crashes.</p>'},
    hb:{T:80,V:30,msg:[[0,45,'hidden (A, extended)']],del:45,A:[[0,45]],B:[],fx:[[45,'A','receipt 1']],crash:null,hb:[20,40],
      cap:'<div class="t">One run: the lease follows the work</div><p>A extends its own lease every 20 s (<code>ChangeMessageVisibility</code> on SQS, RENEW in Kafka share groups), so the message stays hidden while A is alive: to 50 s at the first heartbeat, to 70 s at the second. A finishes at 45 s and deletes. If A dies, the heartbeats stop and the message comes back within one timeout.</p>'},
    long:{T:360,V:300,msg:[[0,300,'hidden (A, dead)'],[300,345,'hidden (B)']],del:345,A:[[0,10]],B:[[300,345]],fx:[[345,'B','receipt 1']],crash:10,hb:[],
      cap:'<div class="t">One run, five minutes late</div><p>A crashes 10 s into the job. Nobody can tell until the 300 s timeout expires; then B takes the message and finishes at 345 s. No duplicate, but every crash costs a full timeout of delay (with SQS\'s 12 h maximum, a crashed job can be 12 hours late).</p>'}};
  let vtm='short';
  function vt(){const el=$('rd-vt');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));const m=VT[vtm];
    const lx=W<520?74:96,x0=lx,x1=W-14,sx=t=>x0+(x1-x0)*t/m.T,rows=['Message','Worker A','Worker B'],rh=34;let b=defs;
    rows.forEach((r,i)=>{const y=8+i*rh;b+=T(0,y+17,r,{fs:12,w:600})+'<line x1="'+x0+'" y1="'+(y+rh-4)+'" x2="'+x1+'" y2="'+(y+rh-4)+'" stroke="var(--line)"/>'});
    m.msg.forEach(s=>{b+='<rect x="'+sx(s[0])+'" y="10" width="'+Math.max(2,sx(s[1])-sx(s[0]))+'" height="18" rx="3" fill="var(--c4)" opacity=".35"/>'});
    b+='<line x1="'+sx(m.del)+'" y1="6" x2="'+sx(m.del)+'" y2="32" stroke="var(--good)" stroke-width="2"/>'+T(Math.min(sx(m.del)+4,x1-44),24,'deleted',{fs:11,fill:'var(--good)'});
    [['A',m.A,1],['B',m.B,2]].forEach(([w,segs,i])=>{const y=8+i*rh+4;segs.forEach(s=>{b+='<rect x="'+sx(s[0])+'" y="'+y+'" width="'+Math.max(2,sx(s[1])-sx(s[0]))+'" height="18" rx="3" fill="var(--c1)" opacity=".85"/>'})});
    m.fx.forEach(f=>{const i=f[1]==='A'?1:2,y=8+i*rh+13,x=sx(f[0]);b+='<path d="M'+x+','+(y-8)+'L'+(x+7)+','+y+'L'+x+','+(y+8)+'L'+(x-7)+','+y+'z" fill="var(--c5)"/>'+T(Math.min(x+10,x1-60),y-9,f[2],{fs:11,fill:'var(--c5)'})});
    if(m.crash!=null){const x=sx(m.crash),y=8+rh+13;b+=T(x+2,y+5,'✕ crash',{fs:12,w:700,fill:'var(--bad)'})}
    m.hb.forEach(t=>{const x=sx(t),y=8+rh+4;b+='<line x1="'+x+'" y1="'+y+'" x2="'+x+'" y2="'+(y+18)+'" stroke="var(--bg)" stroke-width="2"/>'+T(x,y-2,'extend',{a:'middle',fs:10.5,fill:'var(--mute)'})});
    const ya=8+3*rh+4,step=m.T>100?60:10;b+='<line x1="'+x0+'" y1="'+ya+'" x2="'+x1+'" y2="'+ya+'" stroke="var(--mute)"/>';
    for(let t=0;t<=m.T;t+=step){if(W<520&&m.T<=100&&t%20)continue;b+='<line x1="'+sx(t)+'" y1="'+ya+'" x2="'+sx(t)+'" y2="'+(ya+4)+'" stroke="var(--mute)"/>'+T(sx(t),ya+16,t+' s',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,ya+22,b,'Visibility timeout timeline');$('rd-vt-cap').innerHTML=m.cap}
  if($('rd-vt-seg'))RD.seg($('rd-vt-seg'),m=>{vtm=m;vt()});

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
    el.innerHTML=RD.svg(W,2+BR.length*rh,b,'Batch job state at step '+(i+1));
    $('rd-bj-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+BS.length+': '+st.t+'</div><p>'+st.c+'</p>'}
  if($('rd-bj-card'))bA=RD.anim({card:'rd-bj-card',ctl:'rd-bj-ctl',n:BS.length,draw:bj,ms:3200,label:'Batch job step'});

  function all(){hero();ql();eos();vt();dr();if(bA)bA.redraw()}
  RD.onRender(all);RD.onResize(all);all();
})();
