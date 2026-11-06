// ---- Scene: Fig. 4, the recorded burst through four rate limiters (renderer v2). The arrivals are FGW.e4.burst (LiteLLM 1.104.0,
// rpm_limit 10); the four rules are the functions of 26_js_fgw_lim.js (the same as src/recompute.py), replayed up to the moment
// the step has reached. A long replay grouped into stretches: each step plays its stretch of time. ----
(function(){
  if(!document.getElementById('stg-lim'))return;const {lerp,mix}=S3;const F=window.FGW,L=window.FGWLIM;if(!F||!L)return;
  const tr=F.e4.burst,ts=tr.map(x=>x[0]),LIM=10;
  const DEC=[L.anchored(ts,LIM,F.phi.burst),L.calendar(ts,LIM,F.phi.burst),L.slog(ts,LIM),L.bucket(ts,LIM)];
  const NAME=[['LiteLLM window','LiteLLM'],['calendar minute','minute'],['sliding log','log'],['token bucket','bucket']];
  const XS=[-3.3,-1.1,1.1,3.3],SL=.12,ZF=1.45;
  // what each limiter holds at time t: accepted in the current window, entries in the last 60 s, or tokens left
  function held(j,t){const r=DEC[j];
    if(j===0){let st=null,n=0;ts.forEach((u,i)=>{if(u>t)return;const ti=Math.floor(u+F.phi.burst);if(st===null||ti-st>=60){st=ti;n=0}n++});return Math.min(n,LIM)}
    if(j===1){let cur=null,n=0;ts.forEach((u,i)=>{if(u>t)return;const w=Math.floor((u+F.phi.burst)/60);if(w!==cur){cur=w;n=0}if(r[i]===200)n++});return n}
    if(j===2)return ts.filter((u,i)=>u<=t&&r[i]===200&&t-u<60).length;
    let tok=LIM,last=null;ts.forEach((u,i)=>{if(u>t)return;if(last!==null)tok=Math.min(LIM,tok+(u-last)*LIM/60);last=u;if(r[i]===200)tok-=1});return last===null?LIM:Math.min(LIM,tok+(t-last)*LIM/60)}
  const full={cam:[.1,.6],bounds:[[-4.4,0,-2.6],[4.4,1.5,1.9]]};
  // the roll-over moves in on the two fixed windows and the log; the count looks at the piles from lower down
  const VIEW=k=>k===2?{cam:[.2,.55],bounds:[[-4.0,0,-1],[1.9,1.5,1.9]]}:k===5?{cam:[.08,.5],bounds:[[-4.2,0,-.5],[4.2,1.4,1.9]]}:full;
  const T=[[-.5,1],[49.5,54.5],[54.5,60.8],[60.8,65.3],[65.3,67.5],[67.5,67.5]];
  function draw(R,k,e){const P=R.P,nar=R.W<520,t=lerp(T[k][0],T[k][1],e),VB=VIEW(k).bounds,la=x=>x>=VB[0][0]-.3&&x<=VB[1][0]+.3?1:0;R.grid(-4.8,4.8,-2.9,2.6,.5);
    const arriving=ts.some(u=>u>T[k][0]&&u<=T[k][1]);
    // the burst key: the source of every request
    const ka=k===5?.25:1;R.box([0,0,-2.3],[1.2,.35,.5],{fill:mix(P.paper,P.acc,.2),a:ka});if(k<5)R.label([0,.35,-2.3],(nar?'':'burst key · ')+'t = '+Math.max(0,t).toFixed(1)+' s',{fs:13,b:1,c:P.acc,dy:-10});
    XS.forEach((x,j)=>{const r=DEC[j],h=held(j,t),buck=j===3,col=buck?P.c6:P.c1;
      if(arriving)R.flowArc([0,.3,-2.1],[x,1.3,-.25],.3,{c:P.acc,a:.8,r:.05,n:5,speed:1.4});
      // the limiter: a glass tank of 10 slots; a counter fills it, the bucket's tokens drain it
      R.box([x,0,0],[1.0,.06,.6],{});
      if(buck){if(h>.005)R.box([x,.06,0],[.7,h*SL,.4],{fill:mix(P.paper,col,.55),shadow:false,lw:.6})}
      else for(let i=0;i<h;i++)R.box([x,.06+i*SL,0],[.7,SL*.82,.4],{fill:mix(P.paper,col,.55),shadow:false,lw:.6});
      R.glass([x-.42,.06,.25],[.84,0,0],[0,LIM*SL,0],{c:col,a:.75,nu:1,nv:10});
      R.label([x,.06+LIM*SL,0],NAME[j][nar?1:0],{fs:12.5,b:1,c:col,dy:-12,a:la(x)});
      R.label([x,0,.3],buck?h.toFixed(1)+' tokens left':h+' of 10 used',{mono:true,fs:12,dy:12,c:P.ink,a:.9*la(x)*(k===5?0:1),wide:1});
      // what came out: accepted since second 50 (green pile) and refused (red pile)
      const acc=ts.filter((u,i)=>u>=50&&u<=t&&r[i]===200).length,ref=ts.filter((u,i)=>u<=t&&r[i]!==200).length,last=ts.filter(u=>u<=t).length-1;
      for(let i=0;i<acc;i++)R.box([x-.22,i*.06,ZF],[.36,.05,.36],{fill:mix(P.paper,P.good,.6),shadow:i===0,lw:.5,ea:.5});
      for(let i=0;i<ref;i++)R.box([x+.25,i*.06,ZF],[.28,.05,.28],{fill:mix(P.paper,P.bad,.6),shadow:i===0,lw:.5,ea:.5});
      R.label([x-.22,acc*.06,ZF],String(acc),{fs:k===5?15:13,b:1,c:P.good,dy:-10,a:la(x)});
      if(ref)R.label([x+.25,ref*.06,ZF],String(ref),{fs:12,c:P.bad,dy:-10,wide:1,a:la(x)});
      if(arriving&&last>=0){const ok=r[last]===200;R.flowArc([x,.3,.3],ok?[x-.22,acc*.06,ZF]:[x+.25,ref*.06,ZF],.25,{c:ok?P.good:P.bad,a:.85,r:.05,n:4,speed:1.3})}});
    R.label([-4.5,0,ZF],'green: accepted since 50 s · red: refused',{al:'left',fs:12,c:P.good,dy:22,wide:1});
    if(k===5)R.label([0,0,ZF+.45],'most accepted in any 15 s: 19 · 19 · 10 · 12',{fs:13,b:1,dy:16})
  }
  S3.stage({id:'stg-lim',list:'sx-lim',fig:'Fig. 4 · one recorded burst, four limiters',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2800,hold:4200,draw,view:VIEW});
})();
