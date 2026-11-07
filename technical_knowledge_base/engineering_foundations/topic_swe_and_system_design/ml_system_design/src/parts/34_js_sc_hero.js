// ---- Scene: Fig. 1, the hero (stg-hero): an ML system as two lanes of one loop. In front the online lane (a ticket, its features computed now,
// the model, the action, the logged outcome); behind it the offline lane (event logs, the feature pipeline, training, offline evaluation, the registry).
// The outcome flows back into the logs (the loop), the registry deploys to the model, and two dashed links mark where the lanes must agree.
// A schematic layout: no numbers. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.MSK)return;
  const {mix}=S3,{block,plate,stack,lab,poly,arcPts,win,part}=MSK;
  const ZO=-1.5,ZN=1.5,X=[-4.4,-2.2,0,2.2,4.4],Y=.42;
  function draw(R,k,e){const P=R.P,CN=P.c6,CF=P.c4,LOOP=P.bad,AG=P.c5;R.grid(-6.2,6.2,-3,3.4,.5);
    const on=k===0?1:k===3?.3:k===4?.3:.5,off=k===0||k===1?.22:k===3?.3:k===4?.22:1;
    const agree=k===3,mA=k===4||k===2?1:on;
    // in the close views (steps 4 and 5) only the things the step is about carry names
    const nm=(t,keep)=>k<3||keep?t:null,thin=R.W<520;
    // on a phone the lane a step is not about carries no names either
    const nN=(t,keep)=>thin&&on<=.5&&!keep?null:nm(t,keep),nF=(t,keep)=>thin&&off<.5&&!keep?null:nm(t,keep);
    // online lane, in front
    block(R,[X[0],0,ZN],[.62,.36,.5],CN,nN('ticket'),{a:on});
    plate(R,[X[1],0,ZN],CN,agree?1:on,nN('features now',agree),{w:.95,h:.95,glow:k===0?.35:0});
    block(R,[X[2],0,ZN],[1.15,.7,.9],P.acc,k===4?null:nm('model'),{a:mA,t:.4,fs:13.5});
    plate(R,[X[3],0,ZN],CN,agree?1:on,nN('action',agree),{w:.95,h:.95});
    block(R,[X[4],0,ZN],[.7,.42,.55],CN,nN('outcome',k===1),{a:k===1?1:on});
    const lineN=poly([[X[0]+.31,Y,ZN],[X[4]-.35,Y,ZN]],40);
    R.line([lineN[0],lineN[lineN.length-1]],{c:CN,w:1.2,a:.3*on,dash:[4,4]});
    R.flow(k===0?part(lineN,Math.min(1,e*1.4)):lineN,{c:CN,a:k===0?1:.45*on,r:.07,n:14,speed:1.2});
    // offline lane, behind
    const nLog=k===1?6:k>=2?6:4;
    stack(R,[X[0],0,ZO],.75,.55,nLog,CF,Math.max(off,k===1?1:0),{fresh:k===1?win(e,.4,.9):1});
    lab(R,[X[0],.75,ZO],nF('event logs',k===1),{b:1,fs:13,dy:-12,c:P.ink,a:Math.max(.35,k===1?1:off)});
    plate(R,[X[1],0,ZO],CF,agree?1:off,nF('feature pipeline',agree),{w:.95,h:.95});
    plate(R,[X[2],0,ZO],CF,off,nF('train'),{w:.95,h:.95,glow:k===2?.3:0});
    plate(R,[X[3],0,ZO],CF,agree?1:off,nF('offline eval',agree),{w:.95,h:.95});
    block(R,[X[4],0,ZO],[.8,.5,.6],CF,nF('registry'),{a:off});
    const lineO=poly([[X[0]+.4,Y,ZO],[X[4]-.4,Y,ZO]],40);
    R.line([lineO[0],lineO[lineO.length-1]],{c:CF,w:1.2,a:.3*off,dash:[4,4]});
    if(k===2)R.flow(part(lineO,Math.min(1,e*1.3)),{c:CF,a:1,r:.07,n:14,speed:1.2});else if(k>2)R.flow(lineO,{c:CF,a:.4*off,r:.06,n:10,speed:1});
    // deploy: the registry hands a versioned model to the online lane
    if(k>=2){const dp=arcPts(R,[X[4],.55,ZO],[X[2]+.4,.75,ZN-.2],.75,30),a=k===2?win(e,.5,1):k===4?.25:.4;
      R.line(dp,{c:P.good,w:1.4,a:a*.6});R.flow(dp,{c:P.good,a,r:.065,n:8,speed:1.1});if(k===2)lab(R,dp[19],'deploy',{fs:12.5,b:1,c:P.good,a,al:'left',dx:10,dy:-4,wide:1})}
    // the loop: the logged outcome becomes the next training data
    const loop=poly([[X[4],.2,ZN+.3],[X[4],.2,2.75],[-5.6,.2,2.75],[-5.6,.2,ZO],[X[0]-.4,.2,ZO]],14);
    const la=k===1?1:k===0?0:k===2?.55:.25;
    if(la>0){R.line(loop,{c:LOOP,w:1.6,a:la*.5});R.flow(k===1?part(loop,Math.min(1,e*1.25)):loop,{c:LOOP,a:la,r:.07,n:22,speed:1.4})}
    if(k===1)lab(R,[0,.2,2.75],'5 · the model\'s actions decide what is logged',{fs:12.5,b:1,c:LOOP,dy:16,a:win(e,.3,.7)});
    // where the lanes must agree
    [[X[1],'same values? · 2'],[X[3],'same verdict? · 3']].forEach(([x,t])=>{const a=agree?1:k===4?.12:.3;
      R.line([[x,.5,ZO+.15],[x,.5,ZN-.15]],{c:AG,w:2.2,a,dash:[6,5]});
      if(agree)lab(R,[x,.5,0],t,{fs:13,b:1,c:AG,a:win(e,.25,.7),dx:0,dy:-4})});
    // 5. the model box: where the serving shape and the LLM design are chosen
    if(k===4){const a=e;
      ['prompt','retrieval','fine-tuning','agent'].forEach((t,i)=>{const y=1.0+i*.24;
        R.glass([X[2]-.55,y,ZN-.45],[1.1,0,0],[0,0,.9],{c:[P.c1,P.c2,P.c3,P.c4][i],a:a*win(e,i*.15,i*.15+.4),nu:4,nv:3,th:.02});
        lab(R,[X[2]+.6,y+.02,ZN],t,{fs:12,mono:1,al:'left',dx:8,c:[P.c1,P.c2,P.c3,P.c4][i],a:win(e,i*.15,i*.15+.4),grp:'rung'})});
      lab(R,[X[2],0,ZN+.45],'model · 4 serving shape and budget',{fs:12.5,b:1,c:P.acc,dy:16,a:win(e,.1,.5)});
      lab(R,[X[2]-.6,1.48,ZN],'6 · an LLM product adds',{fs:12.5,b:1,c:P.acc,al:'right',dx:-10,a:win(e,.3,.7),wide:1})}
  }
  const full={cam:[.18,.8],bounds:[[-5.8,0,-2],[5.4,1.1,3]]};
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one loop, two lanes',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4600,draw,
    margin:w=>w<520?[22,8,16,8]:[28,16,18,16],
    view:k=>narrow()?{cam:[1.0,.9],bounds:k===4?[[-1.6,0,.6],[1.6,1.9,2.4]]:full.bounds}
      :k===3?{cam:[.18,.72],bounds:[[-3.4,0,-2],[3.4,1.1,2.2]]}:k===4?{cam:[.35,.5],bounds:[[-2.4,0,.4],[2.8,2.0,2.6]]}:full});
})();
