// ---- Scene: Fig. 3 (stg-serve): three serving shapes, by who waits. Behind, batch scoring (a table of users through the model into a table of
// predictions, read later); in the middle, online inference (one request, its fresh features, the model, the answer); in front, a streamed reply on
// a time axis drawn from the page's latency model (window.MSD_LAT: 0.09 s of prefill, then one token every 64 / 4,418 s), one replica shared by 64
// conversations, and Little's law for how many replies are open at once. ----
window.MSD_SERVE=(function(){
  const L=window.MSD_LAT;if(!L)return null;
  const N=400,REP=4418,BATCH=64,GPU=REP/2,MSG=1e6*10/86400;   // the parent's chat assistant: 1 million daily users x 10 messages
  const e2e=L.e2e(N);
  return {N,REP,BATCH,GPU,MSG,e2e,tpot:L.TPOT,prefill:L.PREFILL,perUser:REP/BATCH,openStream:MSG*e2e,openWeb:MSG*.02};
})();
(function(){
  if(!document.getElementById('stg-serve')||!window.MSK||!window.MSD_SERVE)return;
  const {mix}=S3,{block,plate,stack,bar,lab,poly,seg,arcPts,win,part}=MSK,D=window.MSD_SERVE;
  const ZB=-2.3,ZO=0,ZS=2.3,TX0=-2.6,TX1=4.0,tx=s=>TX0+(TX1-TX0)*s/6;
  function draw(R,k,e){const P=R.P,CB=P.c4,CO=P.c6,CS=P.c1;R.grid(-5.4,6.4,-3.4,3.6,.5);
    const aB=k===0?1:.2,aO=k===1?1:.2,aS=k===2||k===3?1:k===4?.35:.2;
    // only the lane a step is about carries names; the others recede
    const nB=t=>k===0?t:null,nO=t=>k===1?t:null,nS=t=>k===2||k===3?t:null;
    // batch: a table of users, scored on a schedule into a table the product reads later
    stack(R,[-4.2,0,ZB],.9,.7,6,CB,aB);lab(R,[-4.2,.7,ZB],nB('users'),{b:1,fs:12.5,dy:-10,a:Math.max(.35,aB)});
    plate(R,[-1.4,0,ZB],CB,aB,nB('model · nightly job'),{w:1,h:1});
    stack(R,[1.4,0,ZB],.9,.7,k===0?Math.max(1,Math.round(6*win(e,.2,.9))):6,CB,aB);lab(R,[1.4,.7,ZB],nB('predictions table'),{b:1,fs:12.5,dy:-10,a:Math.max(.35,aB)});
    block(R,[4,0,ZB],[.7,.45,.55],P.mute,nB('product'),{a:aB,t:.2});
    R.flow(poly([[-3.7,.4,ZB],[-1.4,.5,ZB],[.95,.4,ZB]],12),{c:CB,a:aB,r:.06,n:18,speed:1.6});
    R.line([[1.9,.3,ZB],[3.6,.3,ZB]],{c:CB,w:1.4,a:aB*.6,dash:[4,4]});
    if(k===0){lab(R,[2.7,.3,ZB],'read later',{fs:12,c:P.mute,dy:-12,a:win(e,.4,.8),wide:1});
      lab(R,[-1.4,0,ZB+.4],'nobody waits · a deadline in hours',{fs:12.5,b:1,c:CB,dy:16,a:win(e,.3,.7)})}
    // online: one request, fresh features, the model, the answer, inside the request
    block(R,[-4.2,0,ZO],[.6,.4,.5],CO,nO('request'),{a:aO});
    plate(R,[-2,0,ZO],CO,aO,nO('fresh features'),{w:.9,h:.9});
    block(R,[.4,0,ZO],[1,.6,.8],P.acc,nO('model'),{a:aO,t:.4});
    const goO=poly([[-3.9,.35,ZO-.1],[-2,.4,ZO-.1],[-.1,.35,ZO-.1]],10),back=arcPts(R,[.1,.5,ZO+.15],[-3.9,.4,ZO+.15],.45,24);
    R.flow(k===1?part(goO,Math.min(1,e*1.6)):goO,{c:CO,a:aO,r:.065,n:8,speed:1.6});
    if(k===1){R.flow(part(back,win(e,.55,1)),{c:P.good,a:1,r:.065,n:8,speed:1.6});
      lab(R,[-2,0,ZO+.45],'a program waits · milliseconds',{fs:12.5,b:1,c:CO,dy:16,a:win(e,.3,.7)});
      lab(R,[.9,.6,ZO],'P95 under 5 ms; under 10 ms with stored features',{fs:12,al:'left',dx:10,c:P.mute,a:win(e,.5,.9),wide:1})}
    // streaming: one reply on a time axis, 0 to 6 s, drawn from the latency model
    const gpuA=aS;[-.32,.32].forEach(dz=>R.box([-4.3,0,ZS+dz],[.7,.5,.5],{fill:mix(P.paper,CS,.42),a:gpuA}));
    lab(R,[-4.3,.5,ZS],nS(k>=3?'1 replica · 2 GPUs':'GPUs'),{b:1,fs:12.5,dy:-10,a:Math.max(.35,gpuA)});
    R.line([[tx(0),.01,ZS+.55],[tx(6),.01,ZS+.55]],{c:P.mute,w:1.2,a:.6*aS,head:6});
    [0,2,4,6].forEach(s=>lab(R,[tx(s),0,ZS+.55],s+' s',{fs:12,mono:1,c:P.mute,dy:14,a:aS>.5?.9:.0,grp:'ax'}));
    const grow=k===2?win(e,.05,.95):k>2?1:0,tEnd=D.prefill+(D.e2e-D.prefill)*grow;
    if(k>=2||k===4){const a=k===4?.35:k===3?.3:1;
      R.box([tx(0),0,ZS],[Math.max(.04,tx(D.prefill)-tx(0)),.42,.5],{fill:mix(P.paper,P.c2,.75),a,shadow:false});
      if(grow>0)R.box([(tx(D.prefill)+tx(tEnd))/2,0,ZS],[Math.max(.01,tx(tEnd)-tx(D.prefill)),.22,.5],{fill:mix(P.paper,CS,.55),a,shadow:false});
      if(k===2||k===3)R.flow(poly([[-3.9,.3,ZS],[tx(tEnd),.3,ZS]],20),{c:CS,a:.9,r:.05,n:16,speed:2});
      if(k===2){lab(R,[tx(D.prefill),.42,ZS],'first token at '+D.prefill.toFixed(2)+' s',{fs:12.5,b:1,c:P.c2,al:'left',dx:-2,dy:-12,a:win(e,0,.2)});
        lab(R,[tx(tEnd),.22,ZS-.25],grow>=1?'done at '+D.e2e.toFixed(1)+' s · '+D.N+' tokens':(Math.round(1+(D.N-1)*grow))+' tokens',{fs:12.5,b:1,mono:1,c:CS,al:'right',dy:-16,a:1})}}
    // one replica, many conversations: its 4,418 tokens a second are shared by 64 streams
    if(k===3){const n=8;for(let i=0;i<n;i++){const z=ZS-1.1+i*.32;
        R.flow(arcPts(R,[-3.95,.35,ZS],[4.8,.2,z],.55,26),{c:CS,a:win(e,i*.06,i*.06+.4)*.85,r:.045,n:5,speed:1.2});
        R.box([5.0,0,z],[.22,.22,.22],{fill:mix(P.paper,CS,.3),a:win(e,i*.06,i*.06+.4),shadow:false})}
      lab(R,[5.0,.22,ZS-1.1],'64 conversations (8 drawn)',{fs:12.5,b:1,dy:-14,c:CS,a:win(e,.3,.7),wide:1});
      lab(R,[-4.3,0,ZS+.6],Math.round(D.perUser)+' tokens/s each',{fs:12.5,b:1,c:CS,dy:16,a:win(e,.4,.8)})}
    // Little's law: replies open at once = arrival rate x time each one stays open
    if(k===4){const a=win(e,0,.4),h=v=>Math.max(.02,v/D.openStream*2.4);
      bar(R,[5.0,0,ZS],h(D.openWeb)*win(e,.2,.8),CO,a,'2 or 3',{w:.6,d:.6});
      bar(R,[6.6,0,ZS],h(D.openStream)*win(e,.2,.8),CS,a,'about 700',{w:.6,d:.6});
      lab(R,[5.0,0,ZS+.45],'20 ms web request',{fs:12.5,b:1,dy:16,c:CO,a});
      lab(R,[6.6,0,ZS+.45],D.e2e.toFixed(1)+' s streamed reply',{fs:12.5,b:1,dy:16,c:CS,a})}
  }
  const full={cam:[.22,.78],bounds:[[-5,0,-2.9],[4.8,1.2,3.2]]};
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-serve',list:'sx-serve',fig:'Fig. 3 · who waits for the prediction',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,8,16,8]:[26,16,20,16],
    view:k=>{const B=[[[-5,0,-3],[4.8,1.2,-1.4]],[[-5,0,-1],[4.8,1.2,1.0]],[[-5,0,1.4],[4.6,1.2,3.4]],[[-5,0,.9],[5.6,1.2,3.4]],[[3.4,0,1.2],[7.8,2.8,3.4]]][k];
      return narrow()?{cam:[.9,.95],bounds:B}:{cam:k===4?[.3,.5]:[.22,.72],bounds:B}}});
})();
