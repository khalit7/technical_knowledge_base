// ---- Reading sections 1 to 5: server diagram, PITR animation, lag chart, slot and sync bars ----
(function(){
  const D=window.RPG,t=RD.t,esc=RD.esc;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const box=(x,y,w,h,label,sub,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+(col||'var(--line)')+'"/>'+
    t(x+w/2,y+(sub?h/2-2:h/2+4),label,{a:'middle',fs:11.5,w:600})+(sub?t(x+w/2,y+h/2+12,sub,{a:'middle',fs:10,fill:'var(--mute)'}):'');
  const arrow=(x1,y1,x2,y2,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.3" marker-end="url(#rpa)"/>';
  const defs='<defs><marker id="rpa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';

  // 1. the server
  function arch(){
    const el=document.getElementById('rd-arch');if(!el)return;const W=Math.min(760,RD.width(el)),H=350,g=10,cw=(W-4*g)/3;
    let s=defs;
    for(let i=0;i<3;i++){const x=g+i*(cw+g);s+=box(x,6,cw,34,'app '+(i+1),'client connection',null);s+=arrow(x+cw/2,40,x+cw/2,62);
      s+=box(x,64,cw,38,'backend '+(i+1),'one process each','var(--c4)')}
    s+=t(W/2,118,'postmaster starts one backend per connection',{a:'middle',fs:10,fill:'var(--mute)'});
    for(let i=0;i<3;i++){const x=g+i*(cw+g)+cw/2;s+=arrow(x,102,x,134)}
    s+=box(g,136,W-2*g,36,'shared buffers','cached 8 KB pages, shared by every backend','var(--c1)');
    const hw=(W-3*g)/2;
    s+=arrow(g+hw/2,172,g+hw/2,200);s+=arrow(2*g+hw+hw/2,172,2*g+hw+hw/2,200,'var(--bad)');
    s+=box(g,202,hw,40,'data files','tables, indexes');
    s+=box(2*g+hw,202,hw,40,'WAL (pg_wal/)','every change, first','var(--bad)');
    const qw=(hw-g)/2,x0=2*g+hw;
    s+=arrow(x0+qw/2,242,x0+qw/2,286,'var(--bad)');s+=arrow(x0+qw+g+qw/2,242,x0+qw+g+qw/2,286,'var(--bad)');
    s+=box(x0,288,qw,44,'archive','backups, PITR','var(--c3)');
    s+=box(x0+qw+g,288,qw,44,'replica','replays it','var(--c3)');
    s+=t(g,300,'Checkpoints let old WAL be recycled,',{fs:10,fill:'var(--mute)'})+t(g,314,'unless the archive or a replica',{fs:10,fill:'var(--mute)'})+t(g,328,'still needs it (section 4).',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Diagram of a Postgres server');
  }

  // 3. PITR animation
  const P=D.pitr||{},base=P.count_dump||1000000,good=P.before_delete||1012000,today=good-base;
  const secDump=(P.steps&&P.steps.restore_dump&&P.steps.restore_dump.secs)||0,secPitr=(P.steps&&P.steps.restore_pitr&&P.steps.restore_pitr.secs)||0;
  const stopLine=((P.steps&&P.steps.restore_pitr&&P.steps.restore_pitr.log)||[]).find(l=>/recovery stopping/.test(l))||'';
  let mode='dump';
  // per step: clock (hours), production rows, recovered rows (null = no recovered server yet), archived fraction
  const ST=[
    {h:0,prod:base,rec:null,arc:0,t:'00:00 Nightly backup',d:{dump:'pg_dump writes the whole database to one file. That file is the database <b>as of midnight</b>, and nothing after.',pitr:'pg_basebackup copies the data files, and from now on every finished 16 MB WAL segment is copied to the archive (archive_command).'}},
    {h:9,prod:base+today/3,rec:null,arc:.33,t:'Morning: messages arrive',d:{dump:'Users write messages all morning. None of them is in last night\'s file.',pitr:'Users write messages all morning. Each change is in the WAL, and full segments go to the archive within seconds.'}},
    {h:14.05,prod:good,rec:null,arc:.98,t:'14:02:59 The last good moment',d:{dump:fmt(good)+' messages: '+fmt(today)+' of them written today.',pitr:fmt(good)+' messages; the archive holds every change since midnight.'}},
    {h:14.05,prod:0,rec:null,arc:1,del:1,t:'14:03:00 DELETE FROM messages;',d:{dump:'A cleanup meant for one chat runs without its WHERE clause. Every message is gone, and the replica deleted them too, milliseconds later.',pitr:'The same mistake. Its million delete records and its COMMIT record are now in the WAL like any other change.'}},
    {h:14.3,prod:2,rec:null,arc:1,del:1,t:'14:05 Alert; two more messages arrive',d:{dump:'Users notice. Two new messages are written to the now empty table.',pitr:'Users notice. Two new messages are written to the now empty table.'}},
    {h:14.3,prod:2,rec:base,arc:1,del:1,rcv:1,t:'Restore into a new server',d:{dump:'pg_restore loads the midnight file into a fresh server: '+fmt(base)+' messages ('+secDump+' s here, measured).',pitr:'The midnight base backup is copied into a fresh server: '+fmt(base)+' messages, the state at 00:00.'}},
    {h:14.3,prod:2,rec:null,arc:1,del:1,rcv:2,t:'Replay',d:{dump:'Nothing to replay: a dump is one moment. The recovered server stays at midnight.',pitr:'Postgres fetches archived WAL and redoes every change up to 14:02:59, then stops just before the DELETE\'s commit:<br><code>'+esc(stopLine.replace(/^LOG:\s+/,''))+'</code>'}},
    {h:14.3,prod:2,rec:null,arc:1,del:1,rcv:3,t:'Result',d:{dump:'<b>'+fmt(today)+' messages lost</b>: everything written since midnight. RPO was 14 hours.',pitr:'<b>Nothing written before the mistake is lost</b> (recovery took '+secPitr+' s here). The 2 messages written after 14:03 exist only on the old server; copy them across, or recover to a side server and copy the deleted rows back.'}}
  ];
  function recRows(i){const s=ST[i];if(!s.rcv)return null;if(mode==='dump')return base;return s.rcv>=2?good:base}
  function drawPitr(i){
    const el=document.getElementById('rd-pitr');const W=Math.min(820,RD.width(el)),H=200,x0=14,x1=W-14,s0=ST[i];
    const X=h=>x0+(x1-x0)*h/15;let s=defs;
    s+='<line x1="'+x0+'" y1="34" x2="'+x1+'" y2="34" stroke="var(--line)" stroke-width="2"/>';
    [0,3,6,9,12,15].forEach(h=>{s+='<line x1="'+X(h)+'" y1="30" x2="'+X(h)+'" y2="38" stroke="var(--mute)"/>'+t(X(h),24,String(h).padStart(2,'0')+':00',{a:h===0?'start':h===15?'end':'middle',fs:10,fill:'var(--mute)'})});
    s+='<rect x="'+(X(0)-3)+'" y="40" width="6" height="12" fill="var(--c3)"/>';
    s+=t(X(0)+6,51,mode==='dump'?'dump':'base backup',{fs:10,fill:'var(--c3)'});
    const now=X(Math.min(s0.h,15));s+='<line x1="'+now+'" y1="28" x2="'+now+'" y2="40" stroke="var(--acc)" stroke-width="3"/>';
    if(s0.del){s+='<line x1="'+X(14.05)+'" y1="40" x2="'+X(14.05)+'" y2="'+(H-6)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+t(X(14.05)-4,51,'DELETE 14:03',{a:'end',fs:10,fill:'var(--bad)',w:600})}
    // WAL archive strip
    const n=28,sw=(X(14.05)-X(0))/n;
    for(let k=0;k<n;k++){const on=mode==='pitr'&&k/n<s0.arc;s+='<rect x="'+(X(0)+k*sw+1)+'" y="62" width="'+Math.max(1,sw-2)+'" height="10" rx="1.5" fill="'+(on?'var(--c5)':'var(--soft)')+'" stroke="var(--line)" stroke-width=".5"/>'}
    s+=t(x0,86,mode==='pitr'?'archived WAL segments (16 MB each)':'no WAL archive: only the nightly file exists',{fs:10,fill:'var(--mute)'});
    // bars
    const bw=x1-x0-150,bx=x0+150,Y=[106,150],rows=[['production',s0.prod],['recovered server',recRows(i)]];
    rows.forEach(([lab,v],k)=>{s+=t(x0,Y[k]+13,lab,{fs:11,w:600});s+='<rect x="'+bx+'" y="'+Y[k]+'" width="'+bw+'" height="18" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
      if(v!=null){const f=v/good;s+='<rect x="'+bx+'" y="'+Y[k]+'" width="'+Math.max(v>0?2:0,bw*f)+'" height="18" rx="3" fill="'+(k?'var(--c3)':'var(--acc)')+'"/>';
        s+=t(bx+bw-4,Y[k]+13,fmt(v)+' rows',{a:'end',fs:10.5,w:600,fill:v/good>.8?'var(--bg)':'var(--ink)'})}
      else s+=t(bx+6,Y[k]+13,k?'(not started)':'',{fs:10,fill:'var(--mute)'});});
    if(recRows(i)!=null){const f=base/good;s+='<line x1="'+(bx+bw*f)+'" y1="'+(Y[1]-4)+'" x2="'+(bx+bw*f)+'" y2="'+(Y[1]+22)+'" stroke="var(--ink)" stroke-dasharray="2 2"/>'}
    s+=t(x1,H-6,'dashed: the midnight state',{a:'end',fs:9.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Point-in-time recovery timeline');
    const r=recRows(i),lost=s0.rcv===3?(mode==='dump'?today:0):null;
    document.getElementById('rd-pitr-cnt').innerHTML=RD.stat('Production rows',fmt(s0.prod),'')+RD.stat('Recovered rows',r==null?'none yet':fmt(r),'')+
      RD.stat('Lost (written before 14:03)',lost==null?'?':fmt(lost),mode==='dump'?'RPO: since the last dump':'RPO: seconds')+
      RD.stat('Recovery time here',s0.rcv?(mode==='dump'?secDump:secPitr)+' s':'','measured, 221 MB');
    document.getElementById('rd-pitr-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+ST.length+': '+esc(s0.t)+'</div><p>'+s0.d[mode]+'</p>';
  }
  let A;
  RD.onRender(()=>{arch();lag();slot();sync();sum()});
  RD.onResize(()=>{arch();A&&A.redraw();lag();slot()});
  A=RD.anim({card:'rd-pitr-card',ctl:'rd-pitr-ctl',n:ST.length,draw:drawPitr,ms:2200,label:'Recovery step'});
  RD.seg(document.getElementById('rd-pitr-mode'),m=>{mode=m;A.reset(ST.length);A.play()});
  function sum(){const el=document.getElementById('rd-pitr-sum');if(!el||!P.count_pitr)return;
    el.innerHTML='<div class="out">'+RD.stat('Before the DELETE',fmt(good),'messages')+RD.stat('Restored from the dump',fmt(P.count_dump),'lost '+fmt(good-P.count_dump)+', restore '+secDump+' s')+
      RD.stat('Point-in-time recovery',fmt(P.count_pitr),'lost '+fmt(good-P.count_pitr)+', recovery '+secPitr+' s')+'</div>'}

  // 4. lag chart
  let lagMode='load';
  function lag(){
    const el=document.getElementById('rd-lag');if(!el)return;const R=D.replication||{};
    const ser=lagMode==='load'?R.series_lag_load:R.series_lag_pause;if(!ser)return;
    const W=Math.min(820,RD.width(el)),H=220,l=46,r=42,top=10,bot=28,pw=W-l-r,ph=H-top-bot;
    const T=ser[ser.length-1][0],maxMs=Math.max(...ser.map(p=>Math.max(p[1],p[2],p[3])))||1;
    const sec=maxMs>1500,unit=sec?1000:1,ymax=Math.ceil(maxMs/unit*1.1*10)/10,mb=Math.max(...ser.map(p=>p[4]))/2**20||1;
    const X=v=>l+pw*v/T,Y=v=>top+ph*(1-v/unit/ymax),YB=v=>top+ph*(1-v/2**20/(mb*1.1));
    let s='';
    if(lagMode==='pause'){const pz=(R.x&&R.x.lag_pause&&R.x.lag_pause.paused)||[3,13];s+='<rect x="'+X(pz[0])+'" y="'+top+'" width="'+(X(pz[1])-X(pz[0]))+'" height="'+ph+'" fill="var(--hl)" opacity=".6"/>'+t(X(pz[0])+4,top+12,'replay paused',{fs:10,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const v=ymax*k/4,y=top+ph*(1-k/4);s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+t(l-4,y+3,(sec?v.toFixed(1)+' s':v.toFixed(v<10?1:0)+' ms'),{a:'end',fs:9.5,fill:'var(--mute)'})+
      t(W-r+4,y+3,(mb*1.1*k/4).toFixed(0)+' MB',{fs:9.5,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const v=T*k/4;s+=t(X(v),H-10,v.toFixed(0)+' s',{a:'middle',fs:9.5,fill:'var(--mute)'})}
    const line=(idx,col,yf,dash)=>'<polyline fill="none" stroke="'+col+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 3"':'')+' points="'+ser.map(p=>X(p[0]).toFixed(1)+','+yf(p[idx]).toFixed(1)).join(' ')+'"/>';
    s+=line(4,'var(--c5)',YB,1)+line(1,'var(--c1)',Y)+line(2,'var(--c3)',Y)+line(3,'var(--bad)',Y);
    el.innerHTML=RD.svg(W,H,s,'Replication lag over time');
    const rl=ser.map(p=>p[3]).sort((a,b)=>a-b),med=rl[Math.floor(rl.length/2)],x=R.x||{};
    document.getElementById('rd-lag-cap').innerHTML=lagMode==='load'?
      'pgbench, 8 clients inserting messages for 20 s ('+fmt((x.lag_load||{}).tps||0)+' inserts per second), sampled every 250 ms: replay lag median '+med.toFixed(2)+' ms, max '+rl[rl.length-1].toFixed(2)+' ms. <span class="meas">measured</span>':
      'Same load; pg_wal_replay_pause() on the replica 3 s in, resumed at 13 s. write_lag and flush_lag stay at milliseconds; replay_lag climbs one second per second and '+(Math.max(...ser.map(p=>p[4]))/2**20).toFixed(0)+' MB piles up, then drains within seconds once replay resumes. <span class="meas">measured</span>';
  }
  RD.seg(document.getElementById('rd-lag-mode'),m=>{lagMode=m;lag()});

  // slot retention bars
  function slot(){
    const el=document.getElementById('rd-slot');if(!el)return;const rt=(D.replication||{}).retention||[];
    const W=Math.min(820,RD.width(el)),lab=Math.min(250,W*.42),H=rt.length*26+24,mx=Math.max(...rt.map(r=>r.pg_wal));
    const col={reserved:'var(--c3)',extended:'var(--c5)',unreserved:'var(--c2)',lost:'var(--bad)'};let s='';
    rt.forEach((r,k)=>{const y=6+k*26,bw=(W-lab-112)*r.pg_wal/mx;
      s+=t(0,y+13,esc(r.label.replace('max_slot_wal_keep_size','cap')),{fs:10.5});
      s+='<rect x="'+lab+'" y="'+y+'" width="'+bw+'" height="16" rx="3" fill="'+(col[r.wal_status]||'var(--mute)')+'"/>'+t(lab+bw+4,y+12,(r.pg_wal/2**20).toFixed(0)+' MB, '+r.wal_status,{fs:10})});
    s+=t(0,H-4,'"cap" = max_slot_wal_keep_size = 256MB',{fs:9.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'WAL kept for a stopped replica');
  }
  function sync(){
    const el=document.getElementById('rd-sync');if(!el)return;const rows=(D.replication||{}).sync||[];const mx=Math.max(...rows.map(r=>r.tps));
    el.innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+esc(r.mode)+'">'+esc(r.mode)+(r.standby!=='(none)'?' (sync)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*r.tps/mx).toFixed(1)+'%;background:'+(r.standby!=='(none)'?'var(--c4)':'var(--acc)')+'"></span></span><span class="val">'+fmt(r.tps)+'</span></div>').join('');
  }
})();
