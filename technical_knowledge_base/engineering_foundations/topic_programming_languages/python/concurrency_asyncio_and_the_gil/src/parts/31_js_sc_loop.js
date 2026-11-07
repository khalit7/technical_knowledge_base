// ---- Scene, Fig. 3 (section 2): an asyncio event loop replaying the real a2_trace.py events (renderer v2, 2026-11-07) ----
// Places on the floor: the ready queue (left), the one thread (centre), the loop's timers where suspended tasks wait (back), a worker
// thread (back right, mode 4) and a done tray (right); the loop clock is a ruler at the front, 0 to 620 ms for every mode.
// Each step of a mode is a stretch of recorded events (the step list item's data-e is the index of the stretch's last event in PA.loop);
// the tasks move from where they were at the end of the previous stretch to where they are at the end of this one.
(function(){
  if(!document.getElementById('stg-loop')||!window.S3||!window.PA)return;const {lerp,lerp3,mix,cl}=S3,$=id=>document.getElementById(id);
  const WHO=['A','B','C'],AX=620,RX0=-4,RX1=4,ZR=2.35,TH=[0,0,.45],TZ=[-2.1,-2.1,-2.1],WX=[-1.5,.2,1.9],WK=[3.6,0,-2.1];
  const QX=j=>-2.05-j*.85,DX=j=>2.0+j*.85,RXp=t=>lerp(RX0,RX1,Math.min(1,t/AX));
  const secs=n=>{const m=/([\d.]+)\)?$/.exec(n||'');return m?parseFloat(m[1]):0};
  let mode='sequential',ends=[];
  // the state of every task after event j (j = -1: before the first event)
  function state(j){const ev=PA.loop[mode].events,T=j>=0?ev[j][2]:0,st={},q=[],done=[];
    WHO.forEach((w,i)=>{const mine=ev.slice(0,j+1).filter(e=>e[0]===w);
      if(!mine.length){st[w]=mode==='sequential'?{z:'none'}:{z:'ready',t:0};return}
      const l=mine[mine.length-1];
      if(l[1]==='start'||l[1]==='resume')st[w]={z:'run'};
      else if(l[1]==='block')st[w]={z:'block',note:l[3]};
      else if(l[1]==='done')st[w]={z:'done',t:l[2]};
      else if(l[1]==='await'){const due=l[2]+secs(l[3])*1000,thr=/to_thread/.test(l[3]);
        st[w]=T>=due-.5?{z:'ready',t:due,due,late:true}:{z:thr?'worker':'wait',due,note:l[3]}}});
    WHO.filter(w=>st[w].z==='ready').sort((a,b)=>st[a].t-st[b].t).forEach((w,i)=>st[w].qi=i);
    WHO.filter(w=>st[w].z==='done').sort((a,b)=>st[a].t-st[b].t).forEach((w,i)=>st[w].di=i);
    return {st,T}}
  function pos(w,s){const i=WHO.indexOf(w);switch(s.z){case 'run':case 'block':return [TH[0],.36,TH[2]];case 'wait':return [WX[i],.1,TZ[i]];case 'worker':return [WK[0],.32,WK[2]];
    case 'done':return [DX(s.di),.04,.45];case 'ready':return [QX(s.qi),.04,.45];default:return [QX(i),.04,.45]}}
  function draw(R,k,e){const P=R.P,ev=PA.loop[mode].events,tot=PA.loop[mode].total_ms;R.grid(-5,5,-3,3.2,.5);
    const C={A:P.c1,B:P.c4,C:P.c6},j1=ends[k],j0=k>0?ends[k-1]:-1,S0=state(j0),S1=state(j1),T=lerp(S0.T,S1.T,e);
    const blocked=WHO.some(w=>S1.st[w].z==='block'),thr=mode==='gathered_thread';
    // the furniture: ready queue, the one thread, the timers, the worker thread, the done tray
    R.glass([-4.45,.01,0],[3.1,0,0],[0,0,.9],{c:P.mute,nu:4,nv:1,a:.55,th:.03,dz:200});R.label([-4.45,0,0],'ready queue',{al:'left',fs:12,b:1,c:P.mute,dy:-9});
    R.box([TH[0],0,TH[2]],[1.5,.36,1.2],{fill:blocked?mix(P.paper,P.bad,.35):mix(P.paper,P.ink,.06),dz:60});
    R.label([TH[0],0,TH[2]+.6],blocked?'the one thread: stuck':'the one thread',{fs:12.5,b:1,dy:12,c:blocked?P.bad:P.ink});
    R.box([-.3,0,-2.1],[5.4,.1,1.1],{fill:mix(P.paper,P.c5,.14),shadow:false,dz:300});R.label([-3,.1,-2.1],'suspended at await',{al:'right',fs:12,c:P.c5,dx:-8,b:1,wide:1});R.label([-3,.1,-2.1],'(the loop\'s timers)',{al:'right',fs:12,c:P.c5,dx:-8,dy:15,wide:1});
    R.box([WK[0],0,WK[2]],[1.2,.32,1.0],{fill:mix(P.paper,P.c3,.2),a:thr?1:.18,dz:60});if(thr)R.label([WK[0]+.6,.32,WK[2]],'worker thread',{fs:12,b:1,c:P.c3,al:'left',dx:4,wide:1});
    R.quad([[1.55,.005,0],[4.45,.005,0],[4.45,.005,.9],[1.55,.005,.9]],{fill:mix(P.paper,P.good,.1),ec:P.good,ea:.5,dz:200});R.label([4.45,0,0],'done',{al:'right',fs:12,b:1,c:P.good,dy:-9});
    // the loop clock: a ruler at the front with this mode's time so far
    R.line([[RX0,.01,ZR],[RX1,.01,ZR]],{c:P.line,w:2});
    [0,200,400,600].forEach(v=>{R.line([[RXp(v),.01,ZR-.08],[RXp(v),.01,ZR+.08]],{c:P.mute,w:1.2});R.label([RXp(v),0,ZR+.1],v+(v===600?' ms':''),{fs:12,mono:true,c:P.mute,dy:11})});
    {const x=RXp(T);R.box([(RX0+x)/2,0,ZR],[Math.max(.01,x-RX0),.05,.16],{fill:mix(P.paper,P.acc,.55),shadow:false,edge:false});R.ball([x,.1,ZR],.11,{c:P.acc});
      R.label([x,.1,ZR],'loop clock '+T.toFixed(1)+' ms',{fs:12.5,mono:true,b:1,c:P.acc,dy:-16,al:'left',dx:-12})}
    // timers: a ring on each suspended task's slot, gold once it is due
    WHO.forEach((w,i)=>{const s=S1.st[w];if(s.z==='wait'||s.late&&S0.st[w].z==='wait'){const due=s.due,isDue=T>=due-.5,p=[WX[i],.1,TZ[i]];
      R.glow([p[0],.12,p[2]],.55,{c:isDue?P.c5:P.mute,a:isDue?.9:.25});
      R.label([p[0],.1,p[2]+.42],(isDue?'due ':'due at ')+due.toFixed(0)+' ms',{fs:12,mono:true,c:isDue?P.c5:P.mute,dy:10,b:isDue,wide:1})}});
    // the tasks: each glides from its place at the end of the last stretch to its place now, on a small hop; data flows along the move
    WHO.forEach(w=>{const a=S0.st[w],b=S1.st[w];if(a.z==='none'&&b.z==='none')return;
      const pa=pos(w,a),pb=pos(w,b),moved=Math.hypot(pa[0]-pb[0],pa[2]-pb[2])>.05,p=moved?R.arcPt(pa,pb,.55,e):pb;
      const al=a.z==='none'?e:1,c=C[w],run=b.z==='run'||b.z==='block',sz=run?[.72,.72,.72]:[.6,.5,.6];
      R.box(p,sz,{fill:b.z==='block'?mix(P.paper,P.bad,.6):mix(P.paper,c,run?.65:b.z==='done'?.3:.45),a:al,shadow:p[1]<.05});
      R.label([p[0],p[1]+sz[1],p[2]],w,{fs:13.5,b:1,mono:true,c:b.z==='block'?P.bad:c,dy:-10,a:al});
      if(moved)R.flowArc([pa[0],pa[1]+.3,pa[2]],[pb[0],pb[1]+.3,pb[2]],.75,{c,a:.85,r:.06,n:9});
      if(b.z==='block')R.label([p[0],p[1]+sz[1],p[2]],(b.note||'')+': the loop cannot run',{fs:12,mono:true,c:P.bad,dy:-28,b:1,a:e});
      if(b.z==='worker')R.flow([[WK[0],.95,WK[2]],[WK[0],.45,WK[2]]],{c:P.c3,a:.8,r:.05,n:4,speed:.6})});
    if(k===ends.length-1)R.label([RXp(tot),.1,ZR],'total '+tot.toFixed(1)+' ms',{fs:13,b:1,mono:true,c:P.ink,dy:-34,a:e})}
  function lid(m){return 'sx-loop-'+m}
  function load(){ends=[...$(lid(mode)).children].map(li=>+li.dataset.e)}
  load();
  const full={cam:[-.18,.74],bounds:[[-4.5,0,-2.7],[4.5,.9,2.5]]};
  const st=S3.stage({id:'stg-loop',list:lid(mode),fig:'Fig. 3 · one thread, three coroutines, a real trace',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,6,26,6]:[22,14,30,14]});
  RD.seg($('cg-loop-mode'),m=>{mode=m;document.querySelectorAll('ol.sx[id^="sx-loop-"]').forEach(o=>o.hidden=o.id!==lid(m));load();st.list(lid(m))});
})();
