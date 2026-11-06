// ---- Scene: Fig. 2, the same 40 requests under seven routing strategies (renderer v2). Recorded counts and wall times from FGW.e1
// (litellm.Router 1.104.0, deployment A 0.2 s, B 1.0 s, 4 requests at a time). One step per strategy: the requests stream from the
// router to the copies, the piles grow to the recorded counts, and the label over the router says what that strategy reads. ----
(function(){
  if(!document.getElementById('stg-route'))return;const {lerp,mix}=S3;const F=window.FGW;if(!F)return;
  const C=F.e1.cases,RX=-2.6,DX=1.6,PX=2.75,ZA=-1.15,ZB=1.15,TH=.042;
  const READS=['reads: nothing (a fair coin)','reads: weight 3 : 1','reads: requests in flight','reads: latency per output token','reads: tokens this calendar minute','reads: price in litellm_params (none: $5.00 each)','reads: price in litellm_params (A $2, B $1)'];
  function draw(R,k,e){const P=R.P,c=C[k],nA=c.count.A,nB=c.count.B,g=Math.min(1,e*1.25);R.grid(-4.6,4.4,-2.8,2.8,.5);
    // the caller and the router
    R.box([RX-1.2,0,0],[.7,.4,.6],{});R.label([RX-1.2,.4,0],'40 requests',{fs:12.5,dy:-10,b:1,wide:1});
    R.flow([[RX-.85,.25,0],[RX-.35,.25,0]],{c:P.acc,r:.05,speed:1.2,n:3});
    R.box([RX,0,0],[.7,.55,.7],{fill:mix(P.paper,P.acc,.2)});R.label([RX,.55,0],'router',{fs:13,b:1,c:P.acc,dy:-10});
    R.glass([RX-.6,.75,-.02],[1.2,0,0],[0,.45,0],{c:P.acc,a:.55,nu:4,nv:2});R.label([RX,1.25,0],READS[k],{fs:12.5,b:1,c:P.acc,dy:-10});
    // the two copies, their speed, and the requests flowing to them in proportion to the recorded counts
    [['A',ZA,nA,P.c1,'0.2 s'],['B',ZB,nB,P.c2,'1.0 s']].forEach(([n,z,cnt,col,sp])=>{
      R.box([DX,0,z],[.8,.5,.7],{fill:mix(P.paper,col,.3)});R.label([DX,.5,z],'copy '+n+' · '+sp,{fs:12.5,b:1,c:col,dy:-10});
      if(cnt>0)R.flowArc([RX+.35,.4,0],[DX-.4,.35,z],.25,{c:col,a:.9,r:.035+.05*cnt/40,n:Math.max(2,Math.round(cnt/3)),speed:n==='A'?1.8:.9});
      // the pile: one tile per request answered
      const m=Math.round(cnt*g);for(let j=0;j<m;j++)R.box([PX,j*TH,z],[.5,TH*.8,.5],{fill:mix(P.paper,col,.65),shadow:j===0,lw:.5,ea:.5});
      R.label([PX+.3,m*TH,z],String(Math.round(cnt*g)),{al:'left',dx:8,fs:14,b:1,c:col})});
    // the cost steps: price tags on the copies; in model_info the strategy cannot see them
    if(k>=5){const vis=k===6,a=Math.min(1,e*1.5);[['$2',ZA],['$1',ZB]].forEach(([p,z])=>{R.glass([DX-.95,0,z-.2],[0,0,.4],[0,.34,0],{c:vis?P.c5:P.mute,a:a*(vis?.9:.45),nu:1,nv:1});
      R.label([DX-.95,.17,z],p+(vis?'':' · model_info'),{al:'right',dx:-8,fs:12.5,b:vis,c:vis?P.c5:P.mute,a})})}
    R.label([PX,0,ZB+.5],'all 40 in '+c.wall.toFixed(1)+' s',{fs:12.5,mono:true,c:P.mute,dy:18})
  }
  S3.stage({id:'stg-route',list:'sx-route',fig:'Fig. 2 · forty recorded requests, seven strategies',cam:[.3,.7],bounds:[[-4.1,0,-2.1],[3.6,1.6,2.3]],aspect:.62,dur:1800,hold:4200,draw,
    // the latency step looks along the two copies; the cost steps move in on the price tags
    view:k=>k===3?{cam:[.12,.62],bounds:[[-4.1,0,-2.1],[3.6,1.6,2.3]]}:k>=5?{cam:[.42,.58],bounds:[[-3.4,0,-1.9],[3.5,1.5,2.1]]}:null});
})();
