// ---- Reading (rebuilt 2026-10-24): hero, memory calculator, replication pipeline, failover stepper, XID-age slider,
// SET-leak stepper, lock-queue diagram. Every figure is drawn at the measured width; nothing moves until the reader acts.
(function(){
  const D=window.RPG||{},t=RD.t,esc=RD.esc,fmt=n=>Math.round(n).toLocaleString('en-US');
  const mk='<defs><marker id="rpn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker>'+
    '<marker id="rpo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--bad)"/></marker></defs>';
  // box: x,y,w,h, title, sub, kind ('' plain | 'add' an addition | 'pin' a pin | 'hl' highlighted)
  function box(x,y,w,h,ti,sub,kind){
    const st={add:['var(--acc2)','var(--acc)'],pin:['var(--bg)','var(--bad)'],hl:['var(--hl)','var(--c5)'],dim:['var(--soft)','var(--dim)']}[kind]||['var(--soft)','var(--line)'];
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+st[0]+'" stroke="'+st[1]+'"'+(kind==='pin'?' stroke-width="1.6"':'')+'/>'+
      t(x+w/2,y+(sub?h/2-3:h/2+4),ti,{a:'middle',fs:12,w:600,fill:kind==='pin'?'var(--bad)':'var(--ink)'})+(sub?t(x+w/2,y+h/2+12,sub,{a:'middle',fs:11,fill:'var(--mute)'}):'');
  }
  const ar=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+(o.no?'':' marker-end="url(#'+(o.c==='var(--bad)'?'rpo':'rpn')+')"')+'/>'};
  const W=el=>Math.min(820,RD.width(el));

  // ---- hero ----
  function hero(){
    const el=document.getElementById('rd-hero');if(!el)return;const w=W(el),n=w<520,g=10,col=(w-g)/2;
    let s=mk,y=4;
    s+=box(0,y,col,40,'application','many clients, pools','')+box(col+g,y,col,40,'PgBouncer  §7','few server connections','add');
    s+=ar(col,y+20,col+g-1,y+20);y+=40;s+=ar(col+g+col/2,y,col+g+col/2,y+20);s+=ar(col/2,y,col/2,y+20,{d:'3 3'});y+=22;
    // backends
    const bw=(w-2*g)/3;
    for(let i=0;i<3;i++)s+=box(i*(bw+g),y,bw,40,'backend','one process each','');
    // pin: open transaction, held by backend 1
    const py=y+52;s+=box(0,py,bw*1.55,40,'open transaction','holds old rows §5 §6','pin');s+=ar(bw/2,py,bw/2,y+41,{c:'var(--bad)',no:1,d:'2 2'});
    const B=y;y=py+44;for(let i=0;i<3;i++){const x=i*(bw+g)+(i?bw*0.75:bw/2);s+=ar(x,i?B+41:y-4,x,y+10)}
    y+=12;s+=box(0,y,w,36,'shared buffers  §1','8 KB pages cached for every backend','');y+=36;
    s+=ar(col/2,y,col/2,y+18);s+=ar(col+g+col/2,y,col+g+col/2,y+18,{c:'var(--acc)'});y+=20;
    s+=box(0,y,col,46,'table files','dead rows: VACUUM §5','')+box(col+g,y,col,46,'WAL  pg_wal/','every change, first §1','hl');
    y+=46;const qx=col+g;
    s+=ar(qx+col*0.25,y,col*0.5,y+30,{c:'var(--acc)'});s+=ar(qx+col*0.75,y,qx+col*0.5,y+30,{c:'var(--acc)'});
    // slot pin on the replica path
    y+=32;s+=box(0,y,col,42,'archive  §2','base backup + WAL: PITR','add')+box(col+g,y,col,42,'replica  §3 §4','replays the WAL','add');
    y+=48;s+=box(col+g,y,col,36,'inactive slot','keeps WAL, fills disk §3','pin');s+=ar(qx+col/2,y,qx+col/2,y-6,{c:'var(--bad)',no:1,d:'2 2'});
    s+=t(0,y+14,n?'checkpoints recycle old WAL':'checkpoints recycle old WAL (§1),',{fs:11,fill:'var(--mute)'})+t(0,y+29,n?'unless something needs it':'unless an archive or slot still needs it',{fs:11,fill:'var(--mute)'});
    y+=40;el.innerHTML=RD.svg(w,y,s,'A Postgres server: processes, shared buffers, table files, WAL, archive and replica, with the two pins');
  }

  // ---- memory calculator ----
  const WM=[1,4,16,64,128,256,1024],RAM=64,SB=16;
  window.RPG_MEM=(wm,conns)=>{const work=conns*3*wm/1024;return {work,total:SB+work}};   // GB; 3 = one sort + one hash x 2.0
  let memMode='direct';
  function mem(){
    const el=document.getElementById('rd-mem');if(!el)return;const wm=WM[+document.getElementById('rd-mem-w').value],c=memMode==='direct'?100:20;
    document.getElementById('rd-mem-wv').textContent=(wm>=1024?wm/1024+' GB':wm+' MB')+(wm===4?' (default)':'');
    const r=RPG_MEM(wm,c),w=W(el),l=0,mx=Math.max(RAM,r.total)*1.04,X=v=>l+(w-l-4)*v/mx,over=r.total>RAM;
    let s='<rect x="0" y="22" width="'+X(SB)+'" height="26" fill="var(--c1)" rx="3"/>'+'<rect x="'+X(SB)+'" y="22" width="'+Math.max(1,X(r.total)-X(SB))+'" height="26" fill="'+(over?'var(--bad)':'var(--c5)')+'" rx="3"/>';
    s+='<line x1="'+X(RAM)+'" x2="'+X(RAM)+'" y1="10" y2="60" stroke="var(--ink)" stroke-width="2"/>'+t(Math.min(X(RAM),w-2),9,'RAM 64 GB',{a:X(RAM)>w-60?'end':'middle',fs:11,w:600});
    s+=t(0,64,'shared_buffers 16 GB (25%)',{fs:11,fill:'var(--c1)',w:600});
    const lab='+ work memory, worst case: '+r.work.toFixed(1)+' GB';s+=t(0,80,lab,{fs:11,fill:over?'var(--bad)':'var(--mute)',w:over?600:400});
    el.innerHTML=RD.svg(w,86,s,'Memory: shared buffers plus worst-case work memory against RAM');
    document.getElementById('rd-mem-out').innerHTML=RD.stat('Active backends',c,memMode==='direct'?'direct connections':'server connections behind a pooler')+
      RD.stat('Per backend, worst case',(3*wm>=1024?(3*wm/1024).toFixed(1)+' GB':3*wm+' MB'),'sort + hash x 2.0')+
      RD.stat('Total, worst case',r.total.toFixed(1)+' GB',over?'<b style="color:var(--bad)">more than RAM: the kernel kills a backend</b>':(100*r.total/RAM).toFixed(0)+'% of RAM');
  }
  const mw=document.getElementById('rd-mem-w');if(mw){mw.addEventListener('input',mem);RD.seg(document.getElementById('rd-mem-mode'),m=>{memMode=m;mem()})}

  // ---- replication pipeline ----
  function rep(){
    const el=document.getElementById('rd-rep');if(!el)return;const w=W(el),n=w<520,bx=40,bw=w-bx,rh=30,gp=8;
    const rows=[['primary: commit, WAL flushed locally','','var(--line)'],['WAL sender streams the record','network',null],['replica: WAL receiver writes it','write_lag ends','var(--c1)'],['... and flushes it to disk','flush_lag ends','var(--c3)'],['startup process replays it','replay_lag ends: visible','var(--bad)']];
    let s=mk;rows.forEach((r,k)=>{const y=4+k*(rh+gp);
      s+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+rh+'" rx="6" fill="'+(k===0?'var(--acc2)':'var(--soft)')+'" stroke="'+(r[2]||'var(--line)')+'"/>';
      s+=t(bx+8,y+19,n?r[0].replace('replica: WAL receiver','receiver').replace('startup process replays it','replay applies it').replace('primary: commit, WAL flushed locally','primary: commit flushed').replace('WAL sender streams the record','WAL sender streams it'):r[0],{fs:11.5,w:k===0?600:400});
      if(r[1])s+=t(bx+bw-8,y+19,n?r[1].replace(': visible',''):r[1],{a:'end',fs:11,w:600,fill:r[2]||'var(--mute)'});
      if(k<rows.length-1)s+=ar(bx+bw/2,y+rh,bx+bw/2,y+rh+gp-1)});
    [[2,'var(--c1)',8],[3,'var(--c3)',20],[4,'var(--bad)',32]].forEach(([k,c,x])=>{const y0=4+rh/2,y1=4+k*(rh+gp)+rh/2;
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+y0+'" y2="'+y1+'" stroke="'+c+'" stroke-width="2.5"/><line x1="'+x+'" x2="'+bx+'" y1="'+y1+'" y2="'+y1+'" stroke="'+c+'" stroke-width="1.5"/>'});
    const H=4+rows.length*(rh+gp)+4;
    el.innerHTML=RD.svg(w,H,s,'Streaming replication: where write, flush and replay lag end');
  }

  // ---- failover stepper ----
  const FO={hand:[
    ['Normal','The primary takes every write and streams WAL to the replica.',{a:'primary',b:'replica',cut:0,wa:1,wb:0}],
    ['A partition','The monitor and the replica lose the primary. It is not dead: some clients still reach it and keep writing.',{a:'primary',b:'replica',cut:1,wa:1,wb:0}],
    ['Promote the replica by hand','<code>pg_ctl promote</code>: <code>server promoted</code> in 0.12 s, on a new timeline. Nobody stopped the old primary.',{a:'primary',b:'primary',cut:1,wa:1,wb:1}],
    ['Split brain','Both accept writes. In the run, row 2150968 is <code>written to the OLD primary</code> on one side and <code>written to the NEW primary</code> on the other.',{a:'primary',b:'primary',cut:1,wa:1,wb:1,rows:1}],
    ['Repair: pg_rewind','The old primary is rewound to the point the histories diverged (<code>0/B1000060</code>), copying 211 MB of 908 MB, and rejoins as a replica. Its write is gone: a data loss for whoever made it.',{a:'replica',b:'primary',cut:0,wa:0,wb:1,lost:1}]],
   patroni:[
    ['Normal, with a leader lock','The primary holds the leader lock in the consensus store (etcd) and renews it before its time to live runs out. Only the lock holder may be primary.',{a:'primary',b:'replica',cut:0,wa:1,wb:0,lock:'a'}],
    ['A partition','The same partition: the primary can no longer reach etcd to renew the lock.',{a:'primary',b:'replica',cut:1,wa:1,wb:0,lock:'a',stale:1}],
    ['The lock expires: the old primary fences itself','It demotes itself and stops taking writes (a watchdog resets it if it hangs). Its clients get errors, not a second history.',{a:'demoted',b:'replica',cut:1,wa:0,wb:0,lock:''}],
    ['The replica takes the lock, then promotes','Applications follow the new primary through DNS, a pooler or <code>target_session_attrs=read-write</code>. One history; only commits not yet replicated (asynchronous mode) can be lost.',{a:'demoted',b:'primary',cut:1,wa:0,wb:1,lock:'b'}],
    ['The old primary rejoins','<code>pg_rewind</code> as before, but it has nothing of its own to discard.',{a:'replica',b:'primary',cut:0,wa:0,wb:1,lock:'b'}]]};
  let foMode='hand',FA=null;
  function foDraw(i){
    const el=document.getElementById('rd-fo');if(!el)return;const w=W(el),n=w<520,f=FO[foMode][i],st=f[2];
    const nw=Math.min(240,(w-40)/2.2),ax=6,bx=w-nw-6,ny=96,nh=54;let s=mk;
    const cw=n?150:160,cx0=n?w-cw:w/2-cw/2,cm=cx0+cw/2;s+=box(cx0,4,cw,34,'clients','reads and writes','');
    const ex=n?0:w/2-50,ey=n?4:ny-6,ew=n?80:100;if(foMode==='patroni')s+=box(ex,ey,ew,38,'etcd','leader lock',st.lock?'hl':'dim');
    const role=r=>({primary:'primary: accepts writes',replica:'replica',demoted:'demoted: no writes'}[r]);
    const kind=r=>r==='primary'?'add':r==='demoted'?'dim':'';
    s+=box(ax,ny,nw,nh,'A (old primary)',role(st.a),kind(st.a))+box(bx,ny,nw,nh,'B (old replica)',role(st.b),kind(st.b));
    if(st.wa)s+=ar(cm-30,38,ax+nw*0.6,ny-2,{c:'var(--acc)',w:1.8});
    if(st.wb)s+=ar(cm+(n?0:40),38,bx+nw*0.4,ny-2,{c:'var(--acc)',w:1.8});
    if(st.a==='primary'&&st.b==='replica'&&!st.cut)s+=ar(ax+nw,ny+nh-10,bx,ny+nh-10,{});
    if(st.a==='replica')s+=ar(bx,ny+nh-10,ax+nw,ny+nh-10,{});
    if(st.cut){const cx=ax+nw+12;s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(ny-14)+'" y2="'+(ny+nh+14)+'" stroke="var(--bad)" stroke-width="2.5" stroke-dasharray="6 4"/>'+t(cx+4,ny+nh+28,'partition',{fs:11,fill:'var(--bad)',w:600})}
    if(st.lock==='a')s+=n?ar(ew/2,ey+38,ax+nw*0.3,ny-2,{c:st.stale?'var(--bad)':'var(--c5)',d:st.stale?'3 3':''}):ar(w/2-50,ny+14,ax+nw+2,ny+14,{c:st.stale?'var(--bad)':'var(--c5)',d:st.stale?'3 3':'',no:0});
    if(st.lock==='b')s+=n?ar(ew,ey+30,bx+nw*0.2,ny-2,{c:'var(--c5)'}):ar(w/2+50,ny+14,bx-2,ny+14,{c:'var(--c5)'});
    let y=ny+nh+40;
    if(st.rows){s+=t(ax,y,n?'2150968: OLD':'row 2150968: "written to the OLD primary"',{fs:11,w:600,fill:'var(--bad)'})+t(bx+nw,y,n?'2150968: NEW':'row 2150968: "written to the NEW primary"',{a:'end',fs:11,w:600,fill:'var(--bad)'});y+=8}
    if(st.lost){s+=t(ax,y,n?'OLD write discarded':'the OLD write is discarded by pg_rewind',{fs:11,fill:'var(--bad)'});y+=8}
    el.innerHTML=RD.svg(w,y+6,s,'Failover: two servers, clients and a partition');
    document.getElementById('rd-fo-cap').innerHTML='<div class="t">Step '+(i+1)+' of 5: '+f[0]+'</div><p>'+f[1]+'</p>';
  }
  if(document.getElementById('rd-fo-card')){FA=RD.anim({card:'rd-fo-card',ctl:'rd-fo-ctl',n:5,draw:foDraw,ms:2600,label:'Failover step'});
    RD.seg(document.getElementById('rd-fo-mode'),m=>{foMode=m;FA.reset(5)})}

  // ---- XID age slider ----
  const L31=2147483648,TH=[[200e6,'freeze_max_age 200M','var(--c5)'],[500e6,'alert: warn','var(--mute)'],[1e9,'alert: page','var(--mute)'],[1.6e9,'failsafe 1.6B','var(--c2)'],[L31-40e6,'warnings','var(--bad)'],[L31-3e6,'refuses writes','var(--bad)']];
  window.RPG_XID=age=>age>=L31-3e6?'stop':age>=L31-40e6?'warn':age>=1.6e9?'failsafe':age>=200e6?'aggressive':'normal';
  function xid(){
    const el=document.getElementById('rd-xid-svg');if(!el)return;const v=+document.getElementById('rd-xid').value,age=Math.round(v/1000*L31),w=W(el),n=w<520;
    const short=a=>a>=1e9?(a/1e9).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+' billion':(a/1e6).toFixed(a<1e7?1:0)+' million';
    document.getElementById('rd-xid-v').textContent=short(age);
    const X=a=>4+(w-8)*a/L31;let s='';
    const zones=[[0,200e6,'var(--c3)'],[200e6,1.6e9,'var(--c5)'],[1.6e9,L31-40e6,'var(--c2)'],[L31-40e6,L31,'var(--bad)']];
    zones.forEach(z=>s+='<rect x="'+X(z[0])+'" y="34" width="'+(X(z[1])-X(z[0]))+'" height="18" fill="'+z[2]+'" opacity=".55"/>');
    TH.forEach((h,k)=>{const x=X(h[0]),up=k%2===0;if(k===5)return;s+='<line x1="'+x+'" x2="'+x+'" y1="'+(up?24:34)+'" y2="'+(up?52:62)+'" stroke="'+h[2]+'"/>';
      const lb=n?h[1].replace('freeze_max_age ','').replace('alert: ','').replace('failsafe ','fs '):h[1];s+=t(Math.max(2,Math.min(x,w-2)),up?20:74,lb,{a:x>w-40?'end':x<40?'start':'middle',fs:11,fill:h[2]})});
    s+='<line x1="'+X(age)+'" x2="'+X(age)+'" y1="28" y2="58" stroke="var(--ink)" stroke-width="3"/>';
    // zoom on the last 50 million
    const z0=L31-50e6,Z=a=>4+(w-8)*(a-z0)/50e6,y2=100;
    s+=t(4,y2-6,'the last 50 million, zoomed',{fs:11,fill:'var(--mute)'});
    s+='<rect x="'+Z(z0)+'" y="'+y2+'" width="'+(Z(L31-40e6)-Z(z0))+'" height="16" fill="var(--c2)" opacity=".55"/><rect x="'+Z(L31-40e6)+'" y="'+y2+'" width="'+(Z(L31)-Z(L31-40e6))+'" height="16" fill="var(--bad)" opacity=".55"/>';
    [[L31-40e6,'warnings: 40M left'],[L31-3e6,'refuses: 3M left']].forEach(([a,lb],k)=>{const x=Z(a);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(y2-2)+'" y2="'+(y2+20)+'" stroke="var(--bad)"/>'+t(k?Math.min(x,w-2):x,y2+34,n?lb.replace(': ',' '):lb,{a:k?'end':'middle',fs:11,fill:'var(--bad)'})});
    if(age>=z0)s+='<line x1="'+Z(age)+'" x2="'+Z(age)+'" y1="'+(y2-4)+'" y2="'+(y2+20)+'" stroke="var(--ink)" stroke-width="3"/>';
    el.innerHTML=RD.svg(w,y2+42,s,'Transaction ID age against the safety thresholds');
    const c={normal:['Normal','Ordinary autovacuum freezes rows as it goes. A healthy database saws between 0 and 200 million.'],
      aggressive:['Aggressive autovacuum','Past autovacuum_freeze_max_age every table this old gets an anti-wraparound vacuum that scans every unfrozen page, even with autovacuum off. If the age keeps rising here, something is holding the oldest XID: an open or prepared transaction, or a slot.'],
      failsafe:['Failsafe vacuum','Past vacuum_failsafe_age the vacuum drops its cost limits and skips index cleanup to finish sooner. Still silent in the log: only your alert has fired.'],
      warn:['Warnings','Every command logs "database must be vacuumed within N transactions" (N was 3,000,299 in the run, which then refused writes 308 inserts later because it started just short of the limit). Find the holder now.'],
      stop:['Writes refused','Postgres stops assigning XIDs: "database is not accepting commands to avoid wraparound data loss". Reads still work. Remove the holder, then VACUUM.']}[RPG_XID(age)];
    document.getElementById('rd-xid-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+esc(c[1])+'</p>';
  }
  const xs=document.getElementById('rd-xid');if(xs)xs.addEventListener('input',xid);

  // ---- SET leak stepper ----
  const LK=[['A borrows server connection 1','Client A starts a transaction; PgBouncer lends it server connection 1. Both server connections have the default statement_timeout (0, off).',{a:1,set:0,b:0}],
    ['A runs SET statement_timeout = \'5s\'','A session-level SET changes the <b>server connection\'s</b> session, not client A: PgBouncer passes it through.',{a:1,set:1,b:0}],
    ['A\'s transaction ends; the connection goes back','Transaction mode returns connection 1 to the pool the moment the transaction ends, still carrying 5s.',{a:0,set:1,b:0}],
    ['B gets connection 1, and A\'s setting','Client B never ran SET, but <code>SHOW statement_timeout</code> says <code>5s</code> (ten times out of ten in the run). Any query of B\'s longer than 5 s is now cancelled. Fix: <code>SET LOCAL</code>, or per-role defaults.',{a:0,set:1,b:1}]];
  function leak(i){
    const el=document.getElementById('rd-leak');if(!el)return;const w=W(el),st=LK[i][2],cw=Math.min(150,w*0.28),pw=Math.min(140,w*0.3),sw=Math.min(180,w*0.32);
    let s=mk;const cx=0,px=(w-pw)/2,sx=w-sw;
    s+=box(cx,8,cw,40,'client A',st.a?'in a transaction':'idle',st.a?'add':'')+box(cx,80,cw,40,'client B',st.b?'in a transaction':'idle',st.b?'add':'');
    s+=box(px,44,pw,40,'PgBouncer',w<520?'per transaction':'transaction mode','');
    s+=box(sx,8,sw,40,'server conn 1','timeout '+(st.set?'5s':'0 (off)'),st.set?'pin':'')+box(sx,80,sw,40,'server conn 2','timeout 0 (off)','');
    if(st.a){s+=ar(cw,28,px-2,58,{c:'var(--acc)',w:1.8});s+=ar(px+pw,58,sx-2,28,{c:'var(--acc)',w:1.8})}
    if(st.b){s+=ar(cw,100,px-2,72,{c:'var(--acc)',w:1.8});s+=ar(px+pw,62,sx-2,30,{c:'var(--bad)',w:1.8})}
    el.innerHTML=RD.svg(w,128,s,'Two clients, PgBouncer and two server connections');
    document.getElementById('rd-leak-cap').innerHTML='<div class="t">Step '+(i+1)+' of 4: '+esc(LK[i][0])+'</div><p>'+LK[i][1]+'</p>';
  }
  let LA=null;if(document.getElementById('rd-leak-card'))LA=RD.anim({card:'rd-leak-card',ctl:'rd-leak-ctl',n:LK.length,draw:leak,ms:2400,label:'Pooling step'});

  // ---- lock queue, from the real pg_stat_activity snapshot ----
  function lockq(){
    const el=document.getElementById('rd-lock');if(!el)return;const st=D.monitor&&D.monitor.steps&&D.monitor.steps.lock_queue;if(!st)return;
    const rows=String(st.out).split('\n').filter(l=>/^\s*\d+\s*\|/.test(l)).map(l=>{const c=l.split('|').map(x=>x.trim());const m=c[3].match(/(\d+):(\d+):([\d.]+)/);
      return {pid:c[0],by:c[1].replace(/[{}]/g,''),ev:c[2],secs:m?(+m[1]*3600+ +m[2]*60+ +m[3]):0,q:c[4]}});
    window.RPG_LOCKQ=rows;
    const w=W(el),n=w<520,root=rows.find(r=>!r.by),alt=rows.find(r=>r.by===root.pid),sel=rows.filter(r=>r.by===alt.pid);
    let s=mk;const bw=Math.min(520,w);const x0=(w-bw)/2;
    s+=box(x0,4,bw,44,'pid '+root.pid+': idle in transaction',n?'read users; holds ACCESS SHARE':'ran SELECT count(*) FROM users; holds ACCESS SHARE','pin');
    s+=ar(w/2,92,w/2,50,{c:'var(--bad)'});s+=t(w/2+6,74,'waits for',{fs:11,fill:'var(--bad)'});
    s+=box(x0,94,bw,44,'pid '+alt.pid+': ALTER TABLE users ADD COLUMN',(n?'wants ACCESS EXCLUSIVE, ':'wants ACCESS EXCLUSIVE; waiting ')+alt.secs.toFixed(1)+' s','hl');
    const gw=(w-2*8)/3,y=190;
    sel.forEach((r,k)=>{const x=k*(gw+8);s+=box(x,y,gw,44,'pid '+r.pid,n?'SELECT, '+r.secs.toFixed(1)+' s':'SELECT by id, '+r.secs.toFixed(1)+' s','');s+=ar(x+gw/2,y,w/2+(k-1)*30,140,{})});
    s+=t(w-4,152,n?'wait for the ALTER':'the reads wait for the ALTER, not the idle session',{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y+50,s,'Lock queue: an idle transaction, a waiting ALTER and three blocked reads');
  }

  function all(){hero();mem();rep();xid();lockq()}
  all();RD.onRender(()=>{all();FA&&FA.redraw();LA&&LA.redraw()});RD.onResize(()=>{all();FA&&FA.redraw();LA&&LA.redraw()});
})();
