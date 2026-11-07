// ---- Scene: Fig. 2 (stg-skew): training-serving skew on one feature, "tickets this customer opened in the last 7 days", for one live ticket.
// The customer's tickets lie on a timeline (one cube each); the nightly SQL counts the 7 calendar days before today (UTC), the stream counter the
// last 168 hours up to now, so they give 3 and 5 for the same ticket; then one definition, logged at serving. Illustrative ticket times. ----
window.MSD_SKEW=(function(){
  // ticket times in days before now (now: 15:00 UTC, so today began 0.625 days ago); the live ticket is at 0 and is not counted
  const NOW_H=15,TODAY=-NOW_H/24,T=[-5.2,-3.1,-1.4,-.4,-.2];
  const inOff=t=>t>=TODAY-7&&t<TODAY,inOn=t=>t>=-7&&t<=0;
  return {NOW_H,TODAY,T,inOff,inOn,off:T.filter(inOff).length,on:T.filter(inOn).length};
})();
(function(){
  if(!document.getElementById('stg-skew')||!window.MSK)return;
  const {mix}=S3,{block,stack,bar,lab,poly,arcPts,win,cross}=MSK,D=window.MSD_SKEW;
  // today is drawn wider than the past days (1.8 units against 0.75 a day) so its two tickets stand apart from the live one
  const X0=2.4,WT=1.8,DD=.75,x=t=>t>=D.TODAY?X0+t/(-D.TODAY)*WT:X0-WT+(t-D.TODAY)*DD,ZO=-1.15,ZN=1.15,ZT=0,BX=4.5,MX=6.0,U=.24;
  function draw(R,k,e){const P=R.P,CO=P.c4,CN=P.c6,LIVE=P.acc;R.grid(-4.6,7.6,-2.4,2.4,.5);
    // the timeline: midnights as thin lines, today tinted, now marked
    for(let d=0;d<=8;d++){const t=D.TODAY-d;if(x(t)<-4.4)break;R.line([[x(t),.005,-.5],[x(t),.005,.5]],{c:P.mute,w:1,a:.45})}
    R.glass([x(D.TODAY),.006,-.5],[x(0)-x(D.TODAY),0,0],[0,0,1],{c:P.c5,a:.55,nu:1,nv:1,th:.01});
    R.line([[x(-8),.01,ZT],[x(0)+.3,.01,ZT]],{c:P.mute,w:1.4,a:.6,head:6});
    if(k<=1)lab(R,[x(D.TODAY/2),0,.5],'today (drawn wider)',{fs:12,c:P.c5,b:1,dy:14});
    if(k<3)lab(R,[x(0),0,.5],'now',{fs:12,b:1,dy:k<=1?30:14,c:P.ink});
    if(k===0)lab(R,[x(-4),0,.5],'the customer\'s tickets, last 8 days',{fs:12,c:P.mute,dy:14,wide:1});
    // the windows, as tinted glass lying on the floor in front of and behind the timeline
    const aO=k===1?win(e,0,.5):k===2||k===3?.75:k===4?.75*(1-e)+.1:0,aN=k===2?win(e,0,.5):k>=3?.85:0;
    if(aO>.01){R.glass([x(D.TODAY-7),.008,ZO-.42],[x(D.TODAY)-x(D.TODAY-7),0,0],[0,0,.84],{c:CO,a:aO,nu:7,nv:1,th:.02});
      lab(R,[(x(D.TODAY-7)+x(D.TODAY))/2,0,ZO-.42],'nightly SQL · 7 calendar days before today, UTC',{fs:12.5,b:1,c:CO,dy:-12,a:Math.max(.3,aO)})}
    if(aN>.01){R.glass([x(-7),.008,ZN-.42],[x(0)-x(-7),0,0],[0,0,.84],{c:CN,a:aN,nu:7,nv:1,th:.02});
      lab(R,[(x(-7)+x(0))/2,0,ZN+.42],'stream counter · last 168 hours up to now',{fs:12.5,b:1,c:CN,dy:16,a:Math.max(.3,aN)})}
    // the tickets: cubes on the timeline, the live ticket at now
    D.T.forEach((t,i)=>{const o=D.inOff(t),n=D.inOn(t);
      const c=k===1?(o?CO:P.mute):k===2||k===3?(n?CN:P.mute):k===4?CN:P.c1;
      R.box([x(t),0,ZT],[.3,.3,.3],{fill:mix(P.paper,c,.5),a:1});
      // counting: each ticket in the window streams into that window's count
      if(k===1&&o)R.flow(arcPts(R,[x(t),.3,ZT-.1],[BX,.3,ZO],.6,18),{c:CO,a:win(e,.1,.4),r:.06,n:4,speed:1.2});
      if(k===2&&n)R.flow(arcPts(R,[x(t),.3,ZT+.1],[BX,.3,ZN],.6,18),{c:CN,a:win(e,.1,.4),r:.06,n:4,speed:1.2})});
    block(R,[x(0),0,ZT],[.36,.42,.36],LIVE,k<=1?'live ticket':null,{a:1,t:.55,fs:12.5,dy:-10});
    // the counts, as bars on plinths: training row behind, live request in front
    const hO=k===1?D.off*U*win(e,.3,.9):k===2||k===3?D.off*U:k===4?(D.off+(D.on-D.off)*win(e,.45,.9))*U:0;
    const hN=k===2?D.on*U*win(e,.3,.9):k>=3?D.on*U:0;
    if(k>=1&&k<4)bar(R,[BX,0,ZO],hO,CO,1,String(k===1&&e<.9?Math.round(D.off*win(e,.3,.9)):D.off),{w:.5,d:.5});
    if(k>=2)bar(R,[BX,0,ZN],hN,CN,1,String(k===2&&e<.9?Math.round(D.on*win(e,.3,.9)):D.on),{w:.5,d:.5});
    if(k>=1)lab(R,[BX+.4,.1,ZO],'training row',{fs:12.5,b:1,al:'left',dx:8,c:k===4?CN:CO});
    if(k>=2)lab(R,[BX+.4,.1,ZN],'live request',{fs:12.5,b:1,al:'left',dx:8,c:CN});
    // 5. the fix: the value used at serving is logged, and the training row reads the log
    if(k===4){const y=stack(R,[BX,0,ZO],.66,.66,Math.max(1,Math.round(D.on*win(e,.45,.9))),CN,1,{h:U-.03,g:.03});
      lab(R,[BX,y,ZO],String(D.on),{fs:13,b:1,mono:1,dy:-10});
      R.flow(arcPts(R,[BX,hN+.1,ZN-.2],[BX,y+.1,ZO+.2],.5,18),{c:CN,a:win(e,0,.4),r:.07,n:6,speed:1.1});
      lab(R,[BX-.3,1.45,.1],'log at serving',{fs:12.5,b:1,c:P.good,al:'right',dx:-6,a:win(e,.1,.5)});
      cross(R,[(x(D.TODAY-7)+x(D.TODAY))/2,.1,ZO],.8*win(e,.2,.6),P.mute,.22)}
    // the model: trained on one number, served another
    if(k>=3){const a=k===3?win(e,0,.4):1;block(R,[MX,0,0],[.9,.6,1.1],P.acc,'model',{a,t:.4});
      R.flow(arcPts(R,[BX+.3,hO+.1,ZO],[MX-.4,.45,-.2],.35,14),{c:CO,a:a*(k===4?.5:1),r:.06,n:4});
      R.flow(arcPts(R,[BX+.3,hN+.1,ZN],[MX-.4,.45,.2],.35,14),{c:CN,a,r:.06,n:4});
      if(k===3){lab(R,[MX+.45,.5,-.4],'learned on 3: answer it',{fs:12.5,b:1,c:CO,al:'left',dx:10,a:win(e,.3,.6)});
        lab(R,[MX+.45,.1,.4],'served 5: escalate',{fs:12.5,b:1,c:CN,al:'left',dx:10,a:win(e,.4,.7)});
        lab(R,[BX,0,ZN+.4],'3 ≠ 5 · no error raised',{fs:13,b:1,c:P.bad,dy:18,a:win(e,.5,.9)})}
      else lab(R,[MX+.45,.3,0],'trained on what it serves',{fs:12.5,b:1,al:'left',dx:10,c:P.good,a:win(e,.4,.8)})}
  }
  const full={cam:[.22,.82],bounds:[[-4.4,0,-1.8],[7.6,1.2,1.9]]};
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-skew',list:'sx-skew',fig:'Fig. 2 · one feature, two code paths',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[22,8,16,8]:[26,16,22,16],
    view:k=>narrow()?{cam:[.9,.95],bounds:k>=3?[[2.4,0,-1.6],[7.4,1.4,1.7]]:[[-4.4,0,-1.8],[5.4,1.2,1.9]]}
      :k===0?{cam:[.22,.7],bounds:[[-4.2,0,-1],[3.2,.6,1.1]]}:k===3?{cam:[.3,.7],bounds:[[2.6,0,-1.8],[8.6,1.8,1.9]]}:k===4?{cam:[.26,.78],bounds:[[-1.6,0,-1.8],[8.4,1.4,1.9]]}:full});
})();
