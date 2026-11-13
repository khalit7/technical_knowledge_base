// ---- Scene, Fig. 3 (section 4): CFS's run queue as a vruntime rail, replaying the measured /proc/PID/sched readings (renderer v2) ----
// Data: window.SC_DATA.vrun, 41 readings 50 ms apart of se.vruntime and se.sum_exec_runtime for a nice-0 loop, a nice-5 loop and a sleeper on one CPU.
// Position = vruntime relative to the queue (the rail scrolls with it), height = CPU time received since the first reading.
(function(){
  if(!document.getElementById('stg-vr')||!window.SC_DATA)return;const {at,off,lerp,mix,cl}=S3,D=window.SC_DATA,V=D.vrun,N=V.length;
  const f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const K=[['nice0','nice 0 loop','c3'],['nice5','nice 5 loop','c2'],['sleeper','sleeper','acc']];
  const F0=V[0],L=V[N-1],d0=L.nice0[1]-F0.nice0[1],d5=L.nice5[1]-F0.nice5[1];
  const med=a=>{const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
  const lag=med(V.map(r=>Math.min(r.nice0[0],r.nice5[0])-r.sleeper[0]));
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('sc-vr-ratio2',f(d0/d5,2));set('sc-vr-lag2',f(lag,1));
  const HMAX=Math.max(d0,L.sleeper[1]-F0.sleeper[1]),half=Math.floor((N-1)/2);
  // a reading between samples (u in samples, fractional): linear in both values
  const at2=(u,key,j)=>{const i=Math.min(N-2,Math.floor(u)),t=u-i;return lerp(V[i][key][j],V[i+1][key][j],t)};
  const SPAN=26,X0=-3.4,XS=8/SPAN,ZR=.6,CPU=[-4.9,0,ZR];
  function draw(R,k,e){const P=R.P;R.grid(-6,4.8,-1.6,2.6,.5);
    const u=k===0?0:k===1?e*half:k===2?half+e*(N-1-half):N-1;
    const vs=K.map(([key])=>at2(u,key,0)),ex=K.map(([key])=>at2(u,key,1)-F0[key][1]);
    const m=Math.min(...vs)-1.5,X=v=>X0+(v-m)*XS;
    // the rail, with 5 ms ticks that scroll as the queue's virtual time advances
    R.line([[X0-.4,.01,ZR],[X0+SPAN*XS,.01,ZR]],{c:P.ink,w:1.6,head:7});
    for(let t=Math.ceil(m/5)*5;t<=m+SPAN;t+=5){const x=X(t);R.line([[x,.01,ZR-.18],[x,.01,ZR+.18]],{c:P.mute,w:1});if(t%10===0)R.label([x,0,ZR+.2],f(t),{mono:true,fs:12,dy:14,c:P.mute,wide:1})}
    R.label([X0+SPAN*XS,0,ZR],'virtual runtime, ms →',{al:'right',fs:12,dy:34,c:P.mute,a:k===3?0:1});
    // the CPU at the left end: the leftmost task streams into it
    R.box(CPU,[1,.45,1],{fill:mix(P.paper,P.ink,.1)});R.label([CPU[0],.45,CPU[2]],'CPU',{fs:12.5,b:1,dy:-9});
    const li=vs.indexOf(Math.min(...vs)),focus=k===3?2:-1;
    K.forEach(([key,nm,c],i)=>{const x=X(vs[i]),zz=ZR+(i===0?-.55:i===1?.55:0),h=Math.max(.05,ex[i]/HMAX*2.2),dim=focus>=0&&i!==focus?.3:1;
      R.box([x,0,zz],[.5,h,.5],{fill:mix(P.paper,P[c],.55),a:dim,ec:i===li?P[c]:undefined,lw:i===li?1.6:.9});
      const lo={al:i===1?'right':i===0?'left':'center',dx:i===1?-14:i===0?14:0};
      R.label([x,h,zz],nm,Object.assign({fs:12.5,b:i===li,c:i===2?P.acc:P.ink,dy:R.W<520?-10:-26,a:dim},lo));
      R.label([x,h,zz],f(ex[i])+' ms CPU',Object.assign({fs:12,mono:true,c:P.mute,dy:-10,a:dim,wide:1},lo))});
    if(k<3)R.flowArc([X(vs[li]),.3,ZR+(li===0?-.55:li===1?.55:0)],[CPU[0]+.4,.35,CPU[2]],.6,{c:P[K[li][2]],r:.06,n:6,speed:1.3,a:k===0?e:1});
    if(k===2){R.label([CPU[0]-.4,2.3,ZR],'CPU so far '+f(ex[0]/Math.max(1,ex[1]),2)+' : 1 · weights 1024 : 335',{al:'left',fs:13,b:1,c:P.c3,a:e,wide:1})}
    if(k===3){const xs=X(vs[2]),xl=X(Math.min(vs[0],vs[1]));
      R.line([[xs,.6,ZR],[xl,.6,ZR]],{c:P.acc,w:2,a:e});R.label([(xs+xl)/2,.6,ZR],'median lag '+f(lag,1)+' ms · at most 9',{fs:12.5,b:1,c:P.acc,dy:-10,a:e})}
  }
  const full={cam:[.08,.6],bounds:[[-5.5,0,-.3],[4.6,2.4,1.5]]};
  S3.stage({id:'stg-vr',list:'sx-vr',fig:'Fig. 3 · CFS run queue, measured',cam:full.cam,bounds:full.bounds,aspect:.46,dur:3200,hold:4600,draw,
    view:k=>k===3?{cam:[.2,.45],bounds:[[-3.8,0,-.1],[1.6,2.6,1.3]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16]});
})();
