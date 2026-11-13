// ---- Scene, Fig. 1 (top): one run queue per CPU, the fair class sorted by measured vruntime, and a 1-CPU quota stopping five threads (renderer v2) ----
// Data: window.SC_DATA.vrun (the /proc/PID/sched sample nearest 1 s into section 4's run) and SC_DATA.throttle (section 9's 5-thread run, --cpus 1).
(function(){
  if(!document.getElementById('stg-hero')||!window.SC_DATA)return;const {at,off,lerp,mix,cl}=S3,D=window.SC_DATA;
  const f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const S=D.vrun.reduce((a,r)=>Math.abs(r.t-1000)<Math.abs(a.t-1000)?r:a,D.vrun[0]);
  const TH=D.throttle.find(r=>r.n===5&&r.period===100000),END=300;
  // running stretches of each thread in [0,END]: the complement of its recorded gaps
  const runs=TH.threads.map(th=>{const g=th.gaps.map(q=>[Math.max(0,q[0]),Math.min(END,q[1])]).filter(q=>q[1]>q[0]).sort((a,b)=>a[0]-b[0]);const out=[];let t=0;
    g.forEach(q=>{if(q[0]>t)out.push([t,q[0]]);t=Math.max(t,q[1])});if(t<END)out.push([t,END]);return out});
  // the longest stretch in which every thread was stopped
  const stoppedAll=t=>TH.threads.every(th=>th.gaps.some(q=>q[0]<=t&&t<q[1]));let s0=null,best=null;const refill=[];
  for(let t=0;t<=END;t+=0.25){if(stoppedAll(t)){if(s0==null)s0=t}else if(s0!=null){if(t-s0>20)refill.push(t);if(!best||t-s0>best[1]-best[0])best=[s0,t];s0=null}}
  const qn=document.getElementById('sc-hero-qn');if(qn&&best)qn.textContent=f(best[1]-best[0]);
  const CX=i=>(i-2)*2.1,FOC=2,CW=1.5,CD=1.1,TRAY=[['deadline','c5'],['real-time','c2'],['fair','acc'],['idle','mute']];
  // step 2: the fair queue opened out on a vruntime rail in front of the CPUs
  const ZR=2.5,pts=[['sleeper',S.sleeper,'acc'],['nice 5 loop',S.nice5,'c2'],['nice 0 loop',S.nice0,'c3']];
  const lo=Math.min(...pts.map(p=>p[1][0]))-2,hi=Math.max(...pts.map(p=>p[1][0]))+2,RX=v=>-3.6+(v-lo)/(hi-lo)*7.2,HM=Math.max(...pts.map(p=>p[1][1]));
  // step 3: five lanes over 300 ms
  const TX=t=>-4.2+t/END*8.4,LZ=j=>-1.3+j*.65;
  function draw(R,k,e){const P=R.P;R.grid(-5.5,5.5,-2.4,3.6,.5);
    const cpuA=k===0?1:k===1?.35:off(k,e,2)*.35;
    // the CPUs, and the focused CPU's run queue as four class trays, tried top to bottom
    for(let i=0;i<5;i++){const foc=i===FOC;R.box([CX(i),0,0],[CW,.3,CD],{fill:foc?mix(P.paper,P.ink,.1):P.paper,a:cpuA*(foc||k===0?1:.6)});
      R.label([CX(i),0,CD/2],'CPU '+i,{mono:true,fs:12,dy:14,c:P.mute,a:cpuA,wide:k>0})}
    const ta=k===0?1:k===1?.3:off(k,e,2)*.3;
    TRAY.forEach(([nm,c],j)=>{const y=2.25-j*.45,col=P[c],fair=nm==='fair';
      R.glass([CX(FOC)-.65,y,-.45],[1.3,0,0],[0,0,.9],{c:col,a:ta*(fair?1:.75),nu:4,nv:3});
      R.label([CX(FOC)+.7,y,0],nm+(fair?' · nearly every thread':''),{al:'left',dx:8,fs:12.5,b:fair,c:fair?P.acc:P.mute,a:ta,grp:'tray'})});
    if(k===0){R.flow([[CX(FOC),.85,0],[CX(FOC),.32,0]],{c:P.acc,a:e,r:.07,n:5,speed:.9});
      R.label([CX(FOC)-.7,2.5,0],'tried in this order',{al:'right',dx:-8,fs:12.5,c:P.mute,a:e,wide:1})}
    // the fair class opened out: measured vruntime along the rail, CPU received as height
    const ra=k===1?e:k===0?0:off(k,e,2);
    if(ra>0){R.line([[RX(lo),.02,ZR],[RX(hi)+.3,.02,ZR]],{c:P.ink,w:1.6,a:ra,head:7});
      R.label([RX(hi)+.3,0,ZR],'virtual runtime →',{al:'right',fs:12,dy:34,c:P.mute,a:ra});
      pts.forEach(([nm,v,c],i)=>{const h=Math.max(.06,v[1]/HM*1.6),x=RX(v[0]);
        R.box([x,0,ZR],[.42,h,.42],{fill:mix(P.paper,P[c],.55),a:ra});
        const lo2={al:i===1?'right':'center',dx:i===1?-14:0};
        R.label([x,h,ZR],R.W<520?nm:nm+' · '+f(v[0],1)+' ms',Object.assign({fs:12.5,dy:R.W<520?-10:-26,b:i===0,c:i===0?P.acc:P.ink,a:ra},lo2));
        R.label([x,h,ZR],f(v[1])+' ms CPU so far',Object.assign({fs:12,mono:true,dy:-10,c:P.mute,a:ra,wide:1},lo2))});
      const sx=RX(S.sleeper[0]);R.glow([sx,.3,ZR],.45,{c:P.acc,a:ra*.8});
      R.flowArc([sx,.5,ZR],[CX(FOC),.35,0],.9,{c:P.acc,a:ra,r:.07,n:7,speed:1.2});
      R.label([sx,.25,ZR],'leftmost runs next',{al:'right',dx:-18,fs:12.5,b:1,c:P.acc,a:ra,wide:1})}
    // five threads under a 1-CPU quota: running bars, period boundaries as glass panes, the stretch where all are stopped
    if(k===2){const cur=END*cl(e*1.15,0,1);
      refill.forEach(t=>{R.glass([TX(t),0,LZ(0)-.4],[0,0,LZ(4)-LZ(0)+.8],[0,.9,0],{c:P.c6,a:.55,nu:1,nv:3});R.label([TX(t),.9,LZ(0)-.4],'refill',{fs:12,mono:true,dy:-8,c:P.c6})});
      runs.forEach((rs,j)=>{R.label([TX(0),0,LZ(j)],'t'+(j+1),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,wide:1});
        rs.forEach(([a,b])=>{if(a>=cur)return;const b2=Math.min(b,cur);R.box([(TX(a)+TX(b2))/2,0,LZ(j)],[Math.max(.02,TX(b2)-TX(a)),.22,.36],{fill:mix(P.paper,P.c1,.6),shadow:false,lw:.6})})});
      R.line([[TX(0),.01,LZ(4)+.45],[TX(END),.01,LZ(4)+.45]],{c:P.mute,w:1,a:.8});
      [0,100,200,300].forEach(t=>R.label([TX(t),0,LZ(4)+.45],t+(t===END?' ms':''),{mono:true,fs:12,dy:14,c:P.mute}));
      if(best&&cur>best[1]){const x0=TX(best[0]),x1=TX(best[1]);R.quad([[x0,.005,LZ(0)-.3],[x1,.005,LZ(0)-.3],[x1,.005,LZ(4)+.3],[x0,.005,LZ(4)+.3]],{fill:P.bad,a:.16});
        R.label([(x0+x1)/2,.02,LZ(2)],'all 5 stopped '+f(best[1]-best[0])+' ms',{fs:12.5,b:1,c:P.bad})}
      R.label([TX(0),0,LZ(4)+.45],'quota: 100 ms of CPU per 100 ms period, spent by 5 threads',{al:'left',fs:12.5,b:1,c:P.c1,dy:38,wide:1})}
  }
  const full={cam:[.18,.72],bounds:[[-5.2,0,-1],[5.2,2.4,1.2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · run queues, virtual runtime, a quota',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    view:k=>k===1?{cam:[.12,.5],bounds:[[-3.9,0,1.6],[3.9,1.9,3.1]]}:k===2?{cam:[.1,.8],bounds:[[-5,0,-1.7],[4.8,.8,1.8]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16]});
})();
