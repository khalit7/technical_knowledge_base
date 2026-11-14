// ---- Scene, section 3 (Fig. 3): the replica pool of the running example over half an hour, driven by the page's autoscaling simulator
// (window.PRSIM, a port of src/sim/autoscale.py) with the comparison chart's defaults: 6 requests a second, tripled from minute 10 to 20,
// a 44.5 s cold start (36.3 s of weights, 8.2 s of engine initialisation), at most 16 replicas, HPA rules every 15 s.
// Two modes: an autoscaler on waiting requests per replica (target 1) and one on GPU utilization (target 70%). The half hour is cut into
// a few stretches; each step plays its stretch, so the pool, the queue and every cold start move during the step (long-replay rule a). ----
(function(){
  if(!document.getElementById('stg-as')||!window.PRSIM)return;const {at,off,lerp,mix}=S3;
  const BASE={seed:7,T:1800,base:6,spike:3,t_spike:600,dur:600,slots:32,prefill:0.4235,out:300,tpot:0.0468,slo:1.05,init:3,min_r:1,max_r:16,period:15,down_window:300,tol:0.1,cold:44.5};
  const W8=36.3/44.5;  // share of the cold start spent on weights (72.66 GB at an assumed 2 GB/s); the rest is vLLM v0.30's 8.2 s engine init
  const MODES={queue:{p:{metric:'queue',target:1},list:'sx-as-q',S:[[0,600],[600,645],[645,690],[690,1200],[1200,1500],[1500,1800]]},
    util:{p:{metric:'util',target:.7},list:'sx-as-u',S:[[0,195],[195,600],[600,1200],[1200,1800]]}};
  const RUN={};const run=m=>RUN[m]||(RUN[m]=PRSIM.run(Object.assign({},BASE,MODES[m].p)));
  let mode='queue';
  const COLS=8,sx=i=>-.35+(i%COLS)*.78,sz=i=>i<COLS?-.62:.62,QX=-3.3,RX=-1.9,UX=-5.1;
  function state(tau){const R=run(mode),S=R.series,jp=Math.floor(tau/15)-1,prev=jp>=0?S[Math.min(jp,S.length-1)]:{t:0,ready:BASE.init,waiting:0,running:0},next=S[Math.min(S.length-1,Math.max(0,jp+1))];
    const live=R.starts.filter(s=>!s[1]),ready=prev.ready+live.filter(s=>s[0]+BASE.cold>prev.t&&s[0]+BASE.cold<=tau).length;
    const starting=live.filter(s=>s[0]<=tau&&s[0]+BASE.cold>tau).map(s=>(tau-s[0])/BASE.cold);
    const u=next.t>prev.t?(tau-prev.t)/(next.t-prev.t):1;
    return {ready,starting,waiting:Math.max(0,lerp(prev.waiting,next.waiting,u)),running:next.running,rate:next.rate,p90:next.ttft_p90,metric:next.metric}}
  function draw(R,k,e){const P=R.P,M=MODES[mode],s=M.S[Math.min(k,M.S.length-1)],tau=lerp(s[0],s[1],e),X=state(tau),lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));
    R.grid(-5.8,6.2,-1.9,1.9,.5);
    const spike=tau>=600&&tau<1200;
    // users and their arrivals, the queue as a glass column, the router
    R.box([UX,0,0],[.8,.5,.8],{fill:mix(P.paper,P.c6,spike?.7:.4),lw:1});lab([UX,.5,0],'users',{dy:-12,b:1,c:P.c6});
    R.flowArc([UX+.3,.4,0],[QX,.3,0],.45,{c:P.c6,r:.055,n:Math.round(3+X.rate*.6),speed:.9+X.rate*.07});
    const qh=Math.max(.02,Math.min(1.7,X.waiting/500*1.7));
    R.glass([QX-.35,0,-.35],[.7,0,0],[0,0,.7],{c:P.bad,nu:2,nv:2,a:.6});
    if(X.waiting>=1)R.box([QX,0,0],[.6,qh,.6],{fill:mix(P.paper,P.bad,.75),lw:.8});
    lab([QX,qh,0],Math.round(X.waiting)+' waiting',{dy:-12,b:1,c:X.waiting>=1?P.bad:P.mute});
    R.box([RX,0,0],[.8,.42,.8],{fill:mix(P.paper,P.ink,.12),lw:1});lab([RX,0,.45],'router',{dy:14,c:P.mute});
    if(X.waiting>=1)R.flowArc([QX,qh,0],[RX,.42,0],.3,{c:P.bad,r:.05,n:5,speed:1.2});
    // the pool: 16 places (the autoscaler's maximum), dashed when empty; serving replicas solid, their busy share as a dark top;
    // a starting replica is a glass shell filling with its cold start, weights first (blue), then engine initialisation (purple)
    const nS=X.starting.length;
    for(let i=0;i<16;i++){const c=[sx(i),0,sz(i)];
      if(i<X.ready){const b=Math.min(1,X.running/Math.max(1,X.ready*BASE.slots));R.box(c,[.6,.48,.7],{fill:mix(P.paper,P.c1,.3),lw:.8});R.glass([c[0]-.3,.49,c[2]-.35],[.6,0,0],[0,0,.7],{c:P.c1,nu:4,nv:1,a:.5});R.box([c[0]-.3+.3*b,.49,c[2]],[.6*b,.04,.7],{fill:mix(P.paper,P.c1,.75),lw:.3,shadow:false})}
      else if(i<X.ready+nS){const pr=X.starting[i-X.ready],w=Math.min(pr,W8)/W8,ei=Math.max(0,pr-W8)/(1-W8);
        R.box(c,[.6,.48,.7],{fill:mix(P.paper,P.c2,.2),fa:.15,ec:P.c2,lw:1.1});
        R.box(c,[.6,.48*Math.min(pr,W8),.7],{fill:mix(P.paper,P.c1,.55),a:.85,lw:.3,shadow:false});
        if(ei>0)R.box([c[0],.48*W8,c[2]],[.6,.48*(pr-W8),.7],{fill:mix(P.paper,P.c4,.6),a:.85,lw:.3,shadow:false})}
      else R.quad([[c[0]-.3,.003,c[2]-.35],[c[0]+.3,.003,c[2]-.35],[c[0]+.3,.003,c[2]+.35],[c[0]-.3,.003,c[2]+.35]],{ec:P.mute,dash:[3,3],lw:.8,ea:.5,dz:300})}
    // the router spreads the queue over the serving replicas (a few streams stand for all of them)
    const tg=[0,Math.floor(X.ready/2),X.ready-1].filter((v,i,a)=>v>=0&&a.indexOf(v)===i);
    tg.forEach(i=>R.flowArc([RX,.42,0],[sx(i),.5,sz(i)],.4,{c:P.c1,r:.05,n:5,speed:1.3,a:.8}));
    lab([sx(15),.48,sz(15)],X.ready+' serving'+(nS?' · '+nS+' starting':''),{al:'left',dx:10,b:1,c:nS?P.c2:P.c1});
    if(nS)lab([sx(X.ready),.5,sz(X.ready)],'cold start 44.5 s',{dy:-14,c:P.c2,b:1,wide:1});
    // the clock and what the autoscaler reads
    const mm=tau/60,mt=(mode==='util'?'GPU busy '+Math.round(X.metric*100)+'%':'waiting per replica '+(X.metric<10?X.metric.toFixed(2):Math.round(X.metric)))+' (15 s mean) · target '+(mode==='util'?'70%':'1');
    lab([UX-.4,2.3,-1.7],'minute '+mm.toFixed(1)+' · '+X.rate.toFixed(0)+' requests/s',{al:'left',b:1,c:spike?P.bad:P.ink});
    lab([UX-.4,2.3,-1.7],mt,{al:'left',dy:19,mono:true,fs:12,c:P.mute});
    lab([UX-.4,2.3,-1.7],'p90 TTFT '+(X.p90<10?X.p90.toFixed(2):X.p90.toFixed(1))+' s · target 1.05 s',{al:'left',dy:38,mono:true,fs:12,b:X.p90>BASE.slo,c:X.p90>BASE.slo?P.bad:P.mute});
  }
  const ph=()=>{const c=document.querySelector('#stg-as canvas');return c&&c.clientWidth<520};
  const st=S3.stage({id:'stg-as',list:'sx-as-q',fig:'Fig. 3 · the pool over half an hour, simulated',cam:[.12,.78],bounds:[[-5.6,0,-1.6],[5.9,1.7,1.4]],aspect:.56,dur:3600,hold:3600,draw,
    view:()=>ph()?{cam:[.5,.98]}:null, // a steeper camera on a phone so the scene draws larger
    margin:w=>w<520?[16,10,14,10]:[20,100,18,18]});
  const ch=document.getElementById('as-mode');
  if(ch)ch.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    Object.values(MODES).forEach(m=>{document.getElementById(m.list).hidden=m.list!==MODES[mode].list});st.list(MODES[mode].list)});
  window.PR_AS={run:m=>run(m),MODES,state:(m,t)=>{const o=mode;mode=m;const r=state(t);mode=o;return r}};
  (window.PRSTG=window.PRSTG||{})['stg-as']=st;
})();
