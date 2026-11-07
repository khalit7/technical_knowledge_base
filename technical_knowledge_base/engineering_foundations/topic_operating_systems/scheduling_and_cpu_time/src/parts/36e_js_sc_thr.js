// ---- Scene, Fig. 5 (section 9): cpu.max throttling replayed from the measured gaps, one lane per thread over time (renderer v2) ----
// Data: window.SC_DATA.throttle (throttle.txt): each spinning thread's gaps over 300 us in a 1 s run, with cpu.stat. Refills are drawn where a stretch
// with every thread stopped ends (measured); the quota is a source whose dots stream only into threads running at the cursor.
(function(){
  if(!document.getElementById('stg-thr')||!window.SC_DATA)return;const {at,off,lerp,mix,cl}=S3,D=window.SC_DATA.throttle;
  const f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const R1=D.find(r=>r.n===1&&r.period===100000),R5=D.find(r=>r.n===5&&r.period===100000),R10=D.find(r=>r.period===10000);
  const prep=r=>{const all=t=>r.threads.every(th=>th.gaps.some(q=>q[0]<=t&&t<q[1]));const st=[];let s0=null;
    for(let t=0;t<=1000;t+=.1){if(all(t)){if(s0==null)s0=t}else if(s0!=null){if(t-s0>r.period/1000*.3)st.push([s0,t]);s0=null}}
    return {r,stops:st,running:(th,t)=>!th.gaps.some(q=>q[0]<=t&&t<q[1])}};
  const A=prep(R1),B=prep(R5),C=prep(R10);
  // the numbers the step list quotes, from the data
  const ref=B.stops.find(s=>s[1]>40),burst=R5.threads.map(th=>{const g=th.gaps.find(q=>q[0]>ref[1]);return g[0]-ref[1]});
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('sc-thr-1',f(Math.max(...R1.threads.map(t=>t.max_gap)),1));set('sc-thr-burst',f(Math.min(...burst))+' to '+f(Math.max(...burst)));
  set('sc-thr-10b',f(Math.max(...R10.threads.map(t=>t.max_gap)),1));
  window.SC_THR={refill:ref[1],burst};
  // per step: which run, the window shown (ms), and the cursor's start and end
  const W5=[60,360],b0=ref[1]+Math.min(...burst)-.5,S=[[A,W5,W5[0],W5[1]],[B,W5,W5[0],b0],[B,W5,b0,B.stops.find(s=>s[0]>ref[1])[1]],[B,W5,B.stops.find(s=>s[0]>ref[1])[1],W5[1]],[C,[60,160],60,160]];
  const LZ=j=>-1.3+j*.65,SRC=[-6.3,0,-.6];
  function draw(R,k,e){const P=R.P,[X,W,c0,c1]=S[k],r=X.r,n=r.threads.length,cur=lerp(c0,c1,cl(e*1.1,0,1)),TX=t=>-4.4+(t-W[0])/(W[1]-W[0])*8.8;R.grid(-6.4,5,-2.2,2.2,.5);
    // the time axis
    R.line([[TX(W[0]),.01,LZ(4)+.5],[TX(W[1]),.01,LZ(4)+.5]],{c:P.mute,w:1});
    const tk=(W[1]-W[0])>150?50:20;for(let t=Math.ceil(W[0]/tk)*tk;t<=W[1];t+=tk)R.label([TX(t),0,LZ(4)+.5],f(t)+(t+tk>W[1]?' ms':''),{mono:true,fs:12,dy:14,c:P.mute});
    // refills: where a stretch with every thread stopped ended
    X.stops.forEach(([s,t])=>{if(t<W[0]||t>W[1])return;const sh=t<=cur;R.glass([TX(t),0,LZ(0)-.4],[0,0,LZ(4)-LZ(0)+.8],[0,.8,0],{c:P.c6,a:sh?.6:.15,nu:1,nv:3});
      if(sh&&r.period===100000)R.label([TX(t),.8,LZ(0)-.4],'refill',{mono:true,fs:12,dy:-8,c:P.c6});
      // the stretch with nobody running, once the cursor has passed it
      const a0=Math.max(s,W[0]);if(cur>a0)R.quad([[TX(a0),.005,LZ(0)-.3],[TX(Math.min(t,cur)),.005,LZ(0)-.3],[TX(Math.min(t,cur)),.005,LZ(n-1)+.3],[TX(a0),.005,LZ(n-1)+.3]],{fill:P.bad,a:.14})});
    // the lanes: a block wherever the thread ran, up to the cursor
    r.threads.forEach((th,j)=>{R.label([TX(W[0]),0,LZ(j)],'t'+(j+1),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,wide:1});
      let t=W[0];const gs=th.gaps.filter(q=>q[1]>W[0]&&q[0]<W[1]).sort((a,b)=>a[0]-b[0]);
      const seg=[];gs.forEach(q=>{if(q[0]>t)seg.push([t,q[0]]);t=Math.max(t,q[1])});if(t<W[1])seg.push([t,W[1]]);
      seg.forEach(([a,b])=>{if(a>=cur)return;const b2=Math.min(b,cur);R.box([(TX(a)+TX(b2))/2,0,LZ(j)],[Math.max(.02,TX(b2)-TX(a)),.24,.36],{fill:mix(P.paper,P.c1,.6),shadow:false,lw:.6})});
      // the quota streams only into threads running at the cursor
      if(X.running(th,cur)&&cur<c1)R.flow([[SRC[0]+.4,.5,SRC[2]],[TX(W[0])-.6,.4,LZ(j)],[TX(cur),.3,LZ(j)]],{c:P.c1,r:.06,n:6,speed:2.2,a:.9})});
    R.box(SRC,[.8,.9,.8],{fill:mix(P.paper,P.c1,.3)});
    R.label([SRC[0],.9,SRC[2]],'cpu.max '+(r.quota/1000)+' ms per '+(r.period/1000)+' ms',{fs:12.5,b:1,c:P.c1,dy:-28,wide:1});
    R.label([SRC[0],.9,SRC[2]],r.n+' thread'+(r.n>1?'s':''),{fs:12.5,mono:true,dy:-10,c:P.mute,wide:1});
    if(k===2){const st=X.stops.find(s=>s[0]>ref[1]);R.label([TX((st[0]+st[1])/2),.02,LZ(2)],'all '+n+' stopped '+f(st[1]-st[0])+' ms',{fs:12.5,b:1,c:P.bad,a:e})}
    if(k===3)R.label([TX(W[1]),0,LZ(4)+.5],'periods throttled: '+r.stat.nr_throttled+' of '+r.stat.nr_periods,{al:'right',fs:12.5,b:1,c:P.bad,dy:34,a:e});
    if(k===4)R.label([TX(W[1]),0,LZ(4)+.5],'periods throttled: '+r.stat.nr_throttled+' of '+r.stat.nr_periods,{al:'right',fs:12.5,b:1,c:P.bad,dy:34,a:e});
  }
  S3.stage({id:'stg-thr',list:'sx-thr',fig:'Fig. 5 · a 1-CPU quota, measured',cam:[.06,.82],bounds:[[-6.8,0,-1.8],[4.6,.9,1.9]],aspect:.56,dur:2600,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16]});
})();
