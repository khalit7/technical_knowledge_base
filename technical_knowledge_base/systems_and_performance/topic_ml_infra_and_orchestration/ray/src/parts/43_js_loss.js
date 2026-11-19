// ---- Fig. 3 (failures): one worker node killed, six fates decided by owner and lineage, flat (2026-11-19: was a 3D stage; which node holds what is
// the lesson, and three flat node boxes show it without perspective). Everything from window.RY.lineage: where A, B, C, D and the two actors were placed,
// the GCS log lines (health checks, node death), the re-executed task, and each ray.get's answer and time after the kill, now also on a timeline
// in seconds after the kill. Positions inside a node are schematic. ----
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const card=document.getElementById('ry-loss-card');if(!card||!window.RY)return;
  const Y=window.RY,L=Y.lineage,g=k=>L.gets.find(x=>x.obj===k),f1=x=>x.toFixed(1);
  const HC=L.events.filter(x=>/health check failed/.test(x.what)).map(x=>x.t),DEAD=L.events.find(x=>x.what==='node marked dead').t,REC=L.events.find(x=>/lineage/.test(x.what)).t;
  const A=g('A_task_output'),B=g('B_task_output_no_retries'),C=g('C_put_inside_task'),D=g('D_small_inline'),a1=g('actor_max_restarts_1'),a0=g('actor_max_restarts_0');
  window.RY_LOSS={HC,DEAD,REC,A,B,C,D,a1,a0};
  const NOTE=['before the kill: A, B, C in w2\'s store, two actors on w2; D inline in the driver','docker kill at 0 s · ray.get(D) returns at once: it was never on w2',
    'failed checks at '+HC.map(f1).join(', ')+' s after the kill','node declared dead at '+f1(DEAD)+' s: placement groups and actors rescheduled',
    'A rebuilt from lineage: task re-run on w1 at '+f1(REC)+' s, ray.get(A) returned after '+f1(A.secs)+' s',
    'B: '+B.type+', retries off · C: '+C.type+' at '+f1(C.done_t)+' s, its owner died with w2','max_restarts=1: restarted on w1, __init__ again · max_restarts=0: '+a0.type];
  // when each step happens, in seconds after the kill (the timeline under the figure)
  const TS=[null,0,HC[0],DEAD,REC,C.done_t,a1.done_t];
  function draw(k){const el=document.getElementById('ry-loss'),W=RD.width(el),ph=W<520,fs=ph?11.5:12;let s='';
    const gap=ph?6:12,FR=ph?[.27,.27,.46]:[.3,.25,.45],NWS=FR.map(f=>f*(W-2*gap)),ny=4,nh=ph?150:142,NX=[0,NWS[0]+gap,NWS[0]+NWS[1]+2*gap],dead=k>=1;
    const node=(i,nm,c,op,st)=>{const nw=NWS[i];s+=grp(rect(NX[i],ny,nw,nh,{fill:c,fo:.06,s:st||c,sw:st?2:1.2,r:10,da:i===2&&dead?'5 4':null})+text(NX[i]+8,ny+17,nm,{fs:12.5,w:700,c:i===2&&dead?'var(--bad)':'var(--ink)'}),{op})};
    node(0,'head','var(--c4)',1);node(1,'w1','var(--ink)',k===4||k===6?1:.6);node(2,k>=3?(ph?'w2 · DEAD':'w2 · DEAD at '+f1(DEAD)+' s'):dead?(ph?'w2 · killed':'w2 · killed at 0 s'):'w2','var(--ink)',dead?.9:1,dead?'var(--bad)':null);
    const bx=(i,row,col,ncol,t,c,o)=>{o=o||{};const nw=NWS[i],pad=ph?6:8,cw=(nw-2*pad-(ncol-1)*6)/ncol,x=NX[i]+pad+col*(cw+6),y=ny+26+row*(ph?40:38),h=ph?32:30;
      s+=grp(rect(x,y,cw,h,{fill:c,fo:o.fo==null?.25:o.fo,s:o.s||c,sw:o.sw||1.2,r:6,da:o.da})+text(x+cw/2,y+h/2+4,t,{a:'middle',fs:o.fs||fs,w:o.b?700:500,mono:o.mono,c:o.tc}),{op:o.op,cl:o.cl})};
    // head: the GCS, the driver (owner of A, B and D) and D, 1 KB, inline in the driver's memory
    bx(0,0,0,1,'GCS','var(--c4)',{b:1,s:k===2||k===3?'var(--c4)':null,sw:k===2||k===3?2:1.2});
    bx(0,1,0,1,ph?'driver':'driver: owns A, B, D','var(--acc)',{b:1});
    bx(0,2,0,1,k>=1?(ph?'D: back':'D: returned at once'):'D · 1 KB','var(--good)',{fo:k===1?.4:.18,b:k===1,tc:k===1?'var(--good)':null,cl:k===1?'rd-new':''});
    // w2: A, B, C (8 MB each) in its object store; two actors on its workers
    const obj=(n,row,col)=>{let c='var(--c1)',t=n+(ph?'':' · 8 MB'),o={b:0};
      if(dead){c='var(--mute)';o.op=.6;t=n}
      if(n==='A'&&k>=4){o.op=.3}
      if((n==='B'||n==='C')&&k>=5){c='var(--bad)';o.op=1;t=n+': lost';o.tc='var(--bad)';o.b=1;o.fs=ph?11.5:11;o.cl=k===5?'rd-new':''}
      bx(2,row,col,col===0&&row===2?2:2,t,c,o)};
    obj('A',0,0);obj('B',0,1);obj('C',1,0);
    const act=(j,t,c,o)=>bx(2,j===0?1:2,j===0?1:0,2,t,c,o);
    act(0,ph?'r=1':'max_restarts=1',dead?'var(--mute)':'var(--c2)',{op:k===6?.25:dead?.6:1,fs:ph?11:11.5,mono:1});
    act(1,ph?'r=0':'max_restarts=0',k===6?'var(--bad)':dead?'var(--mute)':'var(--c2)',{op:dead&&k!==6?.6:1,fs:ph?11:11.5,mono:1,tc:k===6?'var(--bad)':null,cl:k===6?'rd-new':''});
    if(k===6)bx(2,2,1,2,ph?'dead':'ActorDied','var(--bad)',{tc:'var(--bad)',b:1,cl:'rd-new'});
    // w1: A rebuilt there from lineage; the actor with a restart comes back there with fresh state
    if(k>=4)bx(1,0,0,1,'A: rebuilt','var(--good)',{b:1,tc:'var(--good)',cl:k===4?'rd-new':''});
    if(k===6)bx(1,1,0,1,ph?'actor, next: '+a1.value:'restarted · next call: '+a1.value,'var(--c2)',{b:1,cl:'rd-new'});
    // arrows: the health checks, the re-executed task, the restarted actor
    const AR=(x1,y1,x2,y2,c)=>{s+=arrow(x1,y1,x2,y2,{c,sw:2,cl:'rd-new'})};
    const gy=ny+26+15;
    if(k===2||k===3)AR(NX[0]+NWS[0]-8,gy,NX[2]+8,gy+(ph?52:48),k===3?'var(--bad)':'var(--c4)');
    if(k===4)AR(NX[0]+NWS[0]-8,ny+26+(ph?40:38)+15,NX[1]+8,gy,'var(--acc)');
    if(k===6)AR(NX[0]+NWS[0]-8,gy,NX[1]+8,ny+26+(ph?40:38)+15,'var(--c4)');
    // the timeline: seconds after the kill, measured
    let y=ny+nh+18;const tx0=ph?4:8,tx1=W-8,TM=45,X=t=>tx0+(tx1-tx0)*t/TM;
    s+=line(tx0,y,tx1,y,{c:'var(--mute)'});[0,10,20,30,40].forEach(t=>{s+=line(X(t),y-3,X(t),y+3,{c:'var(--mute)'})+text(X(t),y+15,t+(t===40?' s':''),{a:'middle',fs:11,mono:1,c:'var(--mute)'})});
    const mk=(t,c,big)=>'<circle cx="'+fx(X(t))+'" cy="'+y+'" r="'+(big?5:3.5)+'" fill="'+c+'"/>';
    if(k>=1)s+=mk(0,'var(--bad)',k===1)+mk(D.done_t,'var(--good)',k===1);
    if(k>=2)HC.forEach((t,i)=>{if(k>2||i<HC.length)s+=mk(t,'var(--c4)',k===2)});
    if(k>=3)s+=mk(DEAD,'var(--bad)',k===3);if(k>=4)s+=mk(REC,'var(--good)',k===4);if(k>=5)s+=mk(C.done_t,'var(--bad)',k===5);
    if(TS[k]!=null)s+=line(X(TS[k]),y-12,X(TS[k]),y+4,{c:'var(--ink)',sw:1.5});
    y+=30;const mx=Math.floor(W/7),nl=[];NOTE[k].split(' · ').forEach(part=>{let first=true;part.split(' ').forEach(w=>{const i=nl.length-1,sep=first?' · ':' ';if(i>=0&&(nl[i]+sep+w).length<=mx&&!(first&&nl[i]===''))nl[i]+=(nl[i]?sep:'')+w;else nl.push(w);first=false})});
    nl.forEach((t,i)=>{s+=text(0,y+i*17,RD.esc(t),{fs:12.5,w:700,c:k===4?'var(--good)':k===5||k===3?'var(--bad)':k===6?'var(--c2)':'var(--ink)',cl:'rd-new'})});
    el.innerHTML=RD.svg(W,y+(nl.length-1)*17+8,s,'One node lost, six fates')}
  const an=RD.anim({card:'ry-loss-card',ctl:'ry-loss-ctl',n:7,ms:5200,draw,label:'Failure step',list:'sx-loss'});
  RD.onResize(()=>an.redraw());
  (window.RYSTG=window.RYSTG||{})['ry-loss']=an;
})();
