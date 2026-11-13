// ---- Scene: Fig. 2, one budget spent as one long chain or as five short ones (stg-sp, renderer v2) ----
// Section 1's illustrative model (60 layers, 240 KiB of KV cache a token, 50 tokens a second) and a 10,000-token budget drawn as 40 blocks of 250,
// to scale along wall-clock time (one block = 5 s). The traces and answers are illustrative; the vote and verifier probabilities are computed
// with the page's own sampling maths (window.TTC.TM): plurality at p = 0.6 with one or four wrong answers, pass@5.
(function(){
  if(!document.getElementById('stg-sp')||!window.S3||!window.TTC)return;const {at,off,lerp,lerp3,mix,cl}=S3,TM=TTC.TM;
  const BUD=10000,U=250,NB=BUD/U,TPS=50,LEN=2000,NC=LEN/U,ANS=[384,412,384,97,384];
  // phases of the single chain, in tokens: working, re-check, working, verify, answer
  const SER=[[0,3500,'c1'],[3500,4500,'c5'],[4500,8000,'c1'],[8000,9500,'c3'],[9500,10000,'c4']];
  const spentAt=[0,3500,8000,10000,10000,10000,10000,10000].map(t=>t/U);
  const V1=TM.plurality(.6,5,1),V4=TM.plurality(.6,5,4),PK=TM.passk(.6,5);
  window.TTCS=window.TTCS||{};TTCS.sp={v1:+(100*V1).toFixed(1),v4:+(100*V4).toFixed(1),pk:+PK.toFixed(3),serialS:BUD/TPS,parS:LEN/TPS,blocks:NB,perLane:NC};
  const PI=.3,CB=.26,CH=.42,CD=.46,X0=-5.85,x=i=>X0+i*PI,ZS=-1.4,ZP=j=>.25+j*.72,ZT=3.85,XA=x(NC)+.2,XG=XA+1.15;
  const blockPos=i=>[(i%8-3.5)*PI,0,ZS+1.6+(Math.floor(i/8)-2)*.52];
  const phase=i=>SER.find(p=>i*U>=p[0]&&i*U<p[1]);
  function draw(R,k,e){const P=R.P;R.grid(-7,7,-2.4,4.4,.5);
    // time axis along the front: 0 to 200 s, one block every 5 s
    if(k>0)for(let t=0;t<=200;t+=50){const tx=X0-PI/2+t/5*PI;if(k>=5)continue;R.line([[tx,0,ZT-.12],[tx,0,ZT+.08]],{c:P.mute,w:1.2});R.label([tx,0,ZT+.1],t+' s',{mono:true,fs:12,dy:12,c:P.mute})}
    if(k>0&&k<5)R.line([[X0-PI/2,0,ZT-.02],[X0-PI/2+40*PI,0,ZT-.02]],{c:P.line,w:1});
    // the single chain: block i leaves the budget block and takes its place in time
    const spent=k===0?0:lerp(spentAt[k-1],spentAt[k],e),sa=k>=4?(k===4?1-.65*e:.35):1;
    for(let i=0;i<NB;i++){const u=k===0?0:cl(spent-i,0,1),p=lerp3(blockPos(i),[x(i),0,ZS],S3.ease(u)),ph=phase(i);
      const fill=u>0?mix(P.paper,P[ph[2]],.15+.6*u):P.paper,lift=k===0?0:4*.35*u*(1-u);
      R.box([p[0],lift,p[2]],[CB,CH,CD],{fill,a:u>0?sa:1,lw:.8,shadow:false})}
    if(k>=1&&k<=3){const n=Math.max(1,Math.floor(spent)),head=[x(n-1),CH+.06,ZS];
      R.flow([[x(0),CH+.06,ZS],head],{c:P.c1,a:.8,r:.06,speed:1.6});
      if(k===2){const a=1;R.flowArc([x(16),CH,ZS],[x(5),CH,ZS],.9,{c:P.c5,a:Math.max(.2,a),r:.08,n:9,speed:1.8})}}
    if(k>=1&&k<=3){[['attempt 1',0,14,1],['re-check',14,18,2],['attempt 2',18,32,2],['verify',32,38,3]].forEach(([t,a,b,s])=>{if(k<s)return;
      R.label([(x(a)+x(b-1))/2,0,ZS+CD/2+.05],t,{fs:12,dy:13,c:t==='re-check'?P.c5:t==='verify'?P.c3:P.ink,a:k===s?e:1})})}
    if(k>=3&&k<6){const a=k===3?e:sa;R.box([x(NB)+.15,0,ZS],[.4,.5,.46],{fill:mix(P.paper,P.c4,.55),a});
      R.label([x(NB)+.15,.5,ZS],'384',{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a})}
    if(k>=1)R.label([x(0)-.3,0,ZS],'1 chain',{al:'right',dx:-6,fs:12.5,c:P.ink,grp:'ln',a:k>=4?.6:1});
    // five chains: the same blocks again, five lanes of eight, all growing at once
    if(k>=4){for(let i=0;i<NB;i++){const j=Math.floor(i/NC),c=i%NC,u=k===4?cl(e*(NC+2)-c-j*.25,0,1):1,p=lerp3([x(i),0,ZS],[x(c),0,ZP(j)],S3.ease(u));
        if(u<=0)continue;const fill=mix(P.paper,c===NC-1?P.c4:P.c1,.55);R.box([p[0],4*.5*u*(1-u),p[2]],[CB,CH,CD],{fill,a:k>=6?.55:1,lw:.8,shadow:false})}
      for(let j=0;j<5;j++){R.label([x(0)-.3,0,ZP(j)],'chain '+(j+1),{al:'right',dx:-6,fs:12,c:P.ink,grp:'ln'});
        if(k===4||k===5)R.flow([[x(0),CH+.05,ZP(j)],[x(NC-1),CH+.05,ZP(j)]],{c:P.c1,a:.6,r:.045,n:4,speed:1.3})}
      if(k<6)R.label([x(NC-1),CH,ZP(0)-.25],'40 s',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:k===4?at(4,e,4):1})}
    // the five answers, then the selector
    if(k>=5){ANS.forEach((v,j)=>{const ok=v===384,vote=k===6&&ok,lift=vote?.22*e:0;
        const col=k===7?(ok?P.good:P.bad):k===6&&ok?P.c5:P.ink,fill=k===7?mix(P.paper,ok?P.good:P.bad,.5):k===6&&ok?mix(P.paper,P.c5,.5):P.paper;
        R.box([XA,lift,ZP(j)],[.34,.4,.4],{fill,a:k===5?e:1,lw:vote?1.6:.9,ec:vote?P.c5:null});
        R.label([XA,.4+lift,ZP(j)],String(v)+(k===7?(ok?' ✓':' ✗'):''),{mono:true,fs:12.5,dy:-11,b:k>=6&&ok,c:col,a:k===5?e:1})})}
    if(k===6){const a=Math.min(1,e*1.5);R.glass([XG,0,ZP(0)-.15],[0,0,ZP(4)-ZP(0)+.3],[0,.9,0],{c:P.c5,a,nu:5,nv:3});
      ANS.forEach((v,j)=>{if(v===384)R.flow([[XA,.62,ZP(j)],[XG,.5,ZP(2)]],{c:P.c5,a:a*.85,r:.06,n:5,speed:1.2})});
      R.label([XG,0,ZP(4)+.15],'vote: 384 ×3',{fs:13,b:1,dy:14,c:P.c5,a});R.label([XG,0,ZP(4)+.15],TTCS.sp.v1+'% to '+TTCS.sp.v4+'%',{mono:true,fs:12.5,dy:31,c:P.c5,a})}
    if(k===7){const a=Math.min(1,e*1.5);R.glass([XG,0,ZP(0)-.15],[0,0,ZP(4)-ZP(0)+.3],[0,.9,0],{c:P.good,a,nu:5,nv:3});
      ANS.forEach((v,j)=>{if(v===384)R.flow([[XA,.3,ZP(j)],[XG+.6,.3,ZP(j)]],{c:P.good,a:a*.85,r:.06,n:4,speed:1.2})});
      R.label([XG,0,ZP(4)+.15],'verifier',{fs:13,b:1,dy:14,c:P.good,a});R.label([XG,0,ZP(4)+.15],'pass@5 = '+PK.toFixed(3),{mono:true,fs:12.5,dy:31,c:P.good,a})}
    if(k===0){R.label([0,CH,ZS+1.6-1.3],'10,000 tokens = 40 blocks of 250',{fs:13,b:1,dy:-12,c:P.ink,a:e})}
  }
  // on a phone the full view turns so the 40-block row runs into depth (larger blocks in front)
  const full={cam:[.1,.85],bounds:[[-6.4,0,-1.8],[6.4,.6,4.1]]};
  (TTCS.stage=TTCS.stage||{}).sp=S3.stage({id:'stg-sp',list:'sx-sp',fig:'Fig. 2 · one budget, two shapes, to scale',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,16,64],
    view:k=>k===0?{cam:[.4,.6],bounds:[[-1.5,0,-1.4],[1.5,.5,1.4]]}:k>=5?{cam:[.3,.8],bounds:[[-6.4,0,-.3],[-.9,1,4.4]]}:document.getElementById('stg-sp').clientWidth<520?{cam:[-.6,.75],bounds:full.bounds}:full});
})();
