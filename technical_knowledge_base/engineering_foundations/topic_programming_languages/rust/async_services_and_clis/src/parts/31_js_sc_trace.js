// ---- Scene, Fig. 2 (blocking section): jobs A, B, C replayed from the real examples/a2_trace.rs events (renderer v2, 2026-11-07) ----
// Adapted from the Python concurrency page's event-loop scene. Places on the floor: the ready tray (left: polled futures waiting for the
// thread), the thread or threads (centre; two of the four workers in the last mode, named by the recorded thread ids), the timers where
// suspended futures wait (back), the blocking pool (back right) and a done tray (right); a ruler at the front is the run's clock, 0 to 620 ms
// in every mode. Each step is a stretch of recorded events: the step list item's data-e is the index of the stretch's last event.
(function(){
  if(!document.getElementById('stg-trace')||!window.S3||!window.RS_DATA)return;const {lerp,mix}=S3,$=id=>document.getElementById(id);
  const TR=RS_DATA.trace_rs,WHO=['A','B','C'],AX=620,RX0=-4,RX1=4,ZR=2.35,TZ=-2.1,WX=[-2.2,0,2.2],BP=[3.6,0,-2.1];
  const QX=j=>-2.05-j*.85,DX=j=>2.0+j*.85,RXp=t=>lerp(RX0,RX1,Math.min(1,t/AX));
  const msOf=n=>{const m=/(\d+) ms/.exec(n||'');return m?+m[1]:0};
  let mode='join',ends=[];
  // the threads of this mode, in order of first appearance (one for current_thread, two of the four workers for the multi-thread run)
  const threads=()=>[...new Set(TR[mode].events.map(e=>e[4]))];
  const TX=i=>{const n=threads().length;return n===1?0:(i===0?-.95:.95)};
  // the state of every job after event j (j = -1: before the first event)
  function state(j){const ev=TR[mode].events,T=j>=0?ev[j][2]:0,st={};
    WHO.forEach(w=>{const mine=ev.slice(0,j+1).filter(e=>e[0]===w);
      if(!mine.length){st[w]=mode==='sequential'?{z:'none'}:{z:'ready',t:0};return}
      const l=mine[mine.length-1],th=threads().indexOf(l[4]);
      if(l[1]==='start'||l[1]==='resume')st[w]={z:'run',th};
      else if(l[1]==='block')st[w]={z:'block',th,note:l[3]};
      else if(l[1]==='done')st[w]={z:'done',t:l[2]};
      else if(l[1]==='await'){const due=l[2]+msOf(l[3]),pool=/spawn_blocking/.test(l[3]);
        st[w]=T>=due-.5&&!pool?{z:'ready',t:due,due,late:true}:{z:pool?'pool':'wait',due,note:l[3]}}});
    WHO.filter(w=>st[w].z==='ready').sort((a,b)=>st[a].t-st[b].t).forEach((w,i)=>st[w].qi=i);
    WHO.filter(w=>st[w].z==='done').sort((a,b)=>st[a].t-st[b].t).forEach((w,i)=>st[w].di=i);
    return {st,T}}
  function pos(w,s){const i=WHO.indexOf(w);switch(s.z){case 'run':case 'block':return [TX(s.th),.36,0];case 'wait':return [WX[i],.1,TZ];case 'pool':return [BP[0],.32,BP[2]];
    case 'done':return [DX(s.di),.04,.45];case 'ready':return [QX(s.qi),.04,.45];default:return [QX(i),.04,.45]}}
  function draw(R,k,e){const P=R.P,tot=TR[mode].total_ms,ths=threads();R.grid(-5,5,-3,3.2,.5);
    const C={A:P.c1,B:P.c4,C:P.c6},j1=ends[k],j0=k>0?ends[k-1]:-1,S0=state(j0),S1=state(j1),T=lerp(S0.T,S1.T,e),pool=mode==='join_offload';
    // the furniture
    R.glass([-4.45,.01,0],[3.1,0,0],[0,0,.9],{c:P.mute,nu:4,nv:1,a:.55,th:.03,dz:200});R.label([-4.45,0,0],'ready, waiting for a thread',{al:'left',fs:12,b:1,c:P.mute,dy:-9,wide:1});
    ths.forEach((th,i)=>{const blocked=WHO.some(w=>S1.st[w].z==='block'&&S1.st[w].th===i),x=TX(i),wd=ths.length>1?1.5:1.5;
      R.box([x,0,0],[wd,.36,1.2],{fill:blocked?mix(P.paper,P.bad,.35):mix(P.paper,P.ink,.06),dz:60});
      R.label([x,0,.6],(ths.length>1?'worker, ':'the one thread, ')+th+(blocked?': stuck':''),{fs:12.5,b:1,dy:12,c:blocked?P.bad:P.ink})});
    R.box([0,0,TZ],[5.8,.1,1.1],{fill:mix(P.paper,P.c5,.14),shadow:false,dz:300});R.label([-2.95,.1,TZ],'suspended at .await',{al:'right',fs:12,c:P.c5,dx:-8,b:1,wide:1});R.label([-2.95,.1,TZ],'(tokio\'s timers)',{al:'right',fs:12,c:P.c5,dx:-8,dy:15,wide:1});
    R.box([BP[0],0,BP[2]],[1.2,.32,1.0],{fill:mix(P.paper,P.c3,.2),a:pool?1:.18,dz:60});if(pool)R.label([BP[0]+.6,.32,BP[2]],'blocking pool',{fs:12,b:1,c:P.c3,al:'left',dx:4,wide:1});
    R.quad([[1.55,.005,0],[4.45,.005,0],[4.45,.005,.9],[1.55,.005,.9]],{fill:mix(P.paper,P.good,.1),ec:P.good,ea:.5,dz:200});R.label([4.45,0,0],'done',{al:'right',fs:12,b:1,c:P.good,dy:-9});
    // the clock: a ruler at the front with this mode's time so far
    R.line([[RX0,.01,ZR],[RX1,.01,ZR]],{c:P.line,w:2});
    [0,200,400,600].forEach(v=>{R.line([[RXp(v),.01,ZR-.08],[RXp(v),.01,ZR+.08]],{c:P.mute,w:1.2});R.label([RXp(v),0,ZR+.1],v+(v===600?' ms':''),{fs:12,mono:true,c:P.mute,dy:11})});
    {const x=RXp(T);R.box([(RX0+x)/2,0,ZR],[Math.max(.01,x-RX0),.05,.16],{fill:mix(P.paper,P.acc,.55),shadow:false,edge:false});R.ball([x,.1,ZR],.11,{c:P.acc});
      R.label([x,.1,ZR],'clock '+T.toFixed(1)+' ms',{fs:12.5,mono:true,b:1,c:P.acc,dy:-16,al:'left',dx:-12})}
    // timers: a glow on each suspended job's slot, gold once it is due
    WHO.forEach((w,i)=>{const s=S1.st[w];if(s.z==='wait'||s.late&&S0.st[w].z==='wait'){const due=s.due,isDue=T>=due-.5,p=[WX[i],.1,TZ];
      R.glow([p[0],.12,p[2]],.55,{c:isDue?P.c5:P.mute,a:isDue?.9:.25});
      R.label([p[0],.1,p[2]+.42],(isDue?'due ':'due at ')+due.toFixed(0)+' ms',{fs:12,mono:true,c:isDue?P.c5:P.mute,dy:10,b:isDue,wide:1})}});
    // the jobs glide from their place at the end of the last stretch to their place now; data flows along each move
    WHO.forEach(w=>{const a=S0.st[w],b=S1.st[w];if(a.z==='none'&&b.z==='none')return;
      const pa=pos(w,a),pb=pos(w,b),moved=Math.hypot(pa[0]-pb[0],pa[2]-pb[2])>.05,p=moved?R.arcPt(pa,pb,.55,e):pb;
      const al=a.z==='none'?e:1,c=C[w],run=b.z==='run'||b.z==='block',sz=run?[.72,.72,.72]:[.6,.5,.6];
      R.box(p,sz,{fill:b.z==='block'?mix(P.paper,P.bad,.6):mix(P.paper,c,run?.65:b.z==='done'?.3:.45),a:al,shadow:p[1]<.05});
      R.label([p[0],p[1]+sz[1],p[2]],w,{fs:13.5,b:1,mono:true,c:b.z==='block'?P.bad:c,dy:-10,a:al});
      if(moved)R.flowArc([pa[0],pa[1]+.3,pa[2]],[pb[0],pb[1]+.3,pb[2]],.75,{c,a:.85,r:.06,n:9});
      if(b.z==='block')R.label([p[0],p[1]+sz[1],p[2]],(b.note||'')+': nothing else runs here',{fs:12,mono:true,c:P.bad,dy:-28,b:1,a:e});
      if(b.z==='pool')R.flow([[BP[0],.95,BP[2]],[BP[0],.45,BP[2]]],{c:P.c3,a:.8,r:.05,n:4,speed:.6})});
    if(k===ends.length-1)R.label([RXp(tot),.1,ZR],'total '+tot.toFixed(1)+' ms',{fs:13,b:1,mono:true,c:P.ink,dy:-34,a:e})}
  const lid=m=>'sx-tr-'+m;
  function load(){ends=[...$(lid(mode)).children].map(li=>+li.dataset.e)}
  load();
  const st=S3.stage({id:'stg-trace',list:lid(mode),fig:'Fig. 2 · jobs A, B, C on tokio, a real trace',cam:[-.18,.74],bounds:[[-4.5,0,-2.7],[4.5,.9,2.5]],aspect:.58,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,6,26,6]:[22,14,30,14]});
  RD.seg($('rs-tr-mode'),m=>{mode=m;document.querySelectorAll('ol.sx[id^="sx-tr-"]').forEach(o=>o.hidden=o.id!==lid(m));load();st.list(lid(m))});
})();
