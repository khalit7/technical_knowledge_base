// ---- Reading (rebuilt 2026-10-24; 2026-11-06: the hero, the replication pipeline and the XID-age slider became 3D stages, 29a to 29f):
// memory calculator, failover stepper, SET-leak stepper (both RD.anim with step lists), lock-queue diagram. Every figure is drawn at the measured width.
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
  }
  if(document.getElementById('rd-fo-card')){FA=RD.anim({card:'rd-fo-card',ctl:'rd-fo-ctl',n:5,draw:foDraw,ms:4200,label:'Failover step',list:'sx-fo-hand'});
    // a mode switch swaps the step list and replays from step 1 (the one exception to 'stops for good')
    RD.seg(document.getElementById('rd-fo-mode'),m=>{foMode=m;['hand','patroni'].forEach(x=>document.getElementById('sx-fo-'+x).hidden=x!==m);FA.reset(5,'sx-fo-'+m)})}

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
  }
  let LA=null;if(document.getElementById('rd-leak-card'))LA=RD.anim({card:'rd-leak-card',ctl:'rd-leak-ctl',n:LK.length,draw:leak,ms:4000,label:'Pooling step',list:'sx-leak'});

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

  function all(){mem();lockq()}
  all();RD.onRender(()=>{all();FA&&FA.redraw();LA&&LA.redraw()});RD.onResize(()=>{all();FA&&FA.redraw();LA&&LA.redraw()});
})();
