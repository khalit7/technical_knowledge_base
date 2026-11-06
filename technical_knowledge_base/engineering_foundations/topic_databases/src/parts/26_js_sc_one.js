// ---- Scene, Fig. 1 (top): where the chat product's data lives at three moments, and who owns each store (renderer v2) ----
// A map, not a measurement: the user counts are the illustrative labels of the step list; the stores are the ones the map table names.
(function(){
  if(!document.getElementById('stg-one'))return;const {at,off,lerp,mix}=S3;
  const AX=-3.4,PX=0,RX=3.4,SL=['users','chats','messages','credits'],SH=.34,SG=.05;
  const rnd=i=>{const x=Math.sin(i*127.1+11.3)*43758.5453;return x-Math.floor(x)};
  const DOTS=[];for(let i=0;i<14;i++)DOTS.push([RX-.62+rnd(i)*1.24,.16+rnd(i+40)*.12,-1.6-.42+rnd(i+80)*.84]);
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-6,6,-3.6,3,.5);
    const fade=k===3?.85:1;
    // API server(s): one on day 1, three from year 1
    const nA=k===0?1:3;for(let i=0;i<nA;i++){const z=nA===1?0:(i-1)*.62,a=i===1||nA===1?1:(k===1?e:1);
      R.box([AX,0,z],[1.3,nA===1?.8:.7,nA===1?1:.48],{fill:mix(P.paper,P.mute,.12),a:a*fade})}
    R.label([AX,nA===1?.8:.7,.55],nA===1?'API server':'API servers',{fs:12.5,b:1,dy:-12,a:fade});
    // day 1: one file, written whole after every message
    const fA=k===0?1:k===1?1-e:0;
    if(fA>0){R.quad([[PX-.75,.002,-.55],[PX+.75,.002,-.55],[PX+.75,.002,.55],[PX-.75,.002,.55]],{fill:false,ec:P.bad,dash:[5,4],lw:1.4,a:fA});
      R.box([PX,0,0],[1.3,.12,.9],{fill:mix(P.paper,P.bad,.3),a:fA});R.label([PX,.12,0],'chats.json',{mono:true,fs:12.5,b:1,c:P.bad,dy:-14,a:fA});
      if(k===0){R.flowArc([AX+.66,.5,0],[PX-.4,.15,0],.5,{c:P.bad,a:e,r:.07});R.label([(AX+PX)/2,1.05,0],'the whole file, every message',{fs:12,c:P.bad,a:e,wide:1})}}
    // year 1 on: one Postgres, four tables stacked as slabs
    const pA=k===0?0:k===1?e:1;
    if(pA>0){SL.forEach((t,i)=>{R.box([PX,i*(SH+SG),0],[1.7,SH,1.5],{fill:mix(P.paper,P.c1,.18+.08*i),a:pA*fade,shadow:i===0});
        R.label([PX+.85,i*(SH+SG)+SH/2,.75],t,{al:'left',dx:8,mono:true,fs:12,c:P.mute,a:k===1?e:0,grp:'pg'})});
      R.label([PX,4*(SH+SG),0],'Postgres',{fs:13,b:1,c:P.c1,dy:-12,a:pA});
      if(k===1)R.flowArc([AX+.66,.45,0],[PX-.85,.7,0],.45,{c:P.c1,a:e,r:.07});
      if(k>=2)R.flowArc([AX+.66,.45,0],[PX-.85,.7,0],.45,{c:P.c1,a:.5,r:.06})}
    // year 3: the fleet, each a copy fed from Postgres
    const fl=k<2?0:k===2?e:1;
    if(fl>0){
      // Redis beside the API servers
      R.box([AX,0,-2.3],[1.3,.5,.9],{fill:mix(P.paper,P.c4,.35),a:fl*fade});R.label([AX,.5,-2.3],'Redis',{fs:12.5,b:1,c:P.c4,dy:-12,a:fl});
      R.flowArc([AX,.6,-.6],[AX,.55,-1.9],.3,{c:P.c4,a:fl*(k===3?.5:1),r:.06,n:5});
      // the vector index: embeddings as points on a glass plate
      R.glass([RX-.7,.12,-1.6-.5],[1.4,0,0],[0,0,1],{c:P.c6,a:fl,nu:4,nv:3,th:.04});DOTS.forEach(p=>R.ball(p,.06,{c:P.c6,a:fl}));
      R.box([RX,0,-1.6],[1.4,.1,1],{fill:mix(P.paper,P.c6,.2),a:fl*.8,shadow:true});
      R.label([RX,.3,-2.1],'vector index',{fs:12.5,b:1,c:P.c6,dy:-12,a:fl});
      // the column store: one tall block per column
      for(let i=0;i<6;i++)R.box([RX-.65+i*.26,0,1.5],[.2,.55+.25*rnd(i+7),.9],{fill:mix(P.paper,P.c3,.25+.05*i),a:fl*fade,lw:.6});
      R.label([RX,1,1.5],'column store',{fs:12.5,b:1,c:P.c3,dy:-14,a:fl});
      // copies stream out of Postgres, a little behind
      const ca=k===3?.45:fl;
      R.flowArc([PX+.85,.9,-.3],[RX-.3,.3,-1.6],.5,{c:P.c6,a:ca,r:.06});R.flowArc([PX+.85,.6,.3],[RX-.6,.5,1.5],.4,{c:P.c3,a:ca,r:.06});
      if(k===2)R.label([1.6,1.5,.9],'copied from Postgres, a little behind',{fs:12,c:P.mute,a:e,wide:1})}
    // owners, and the machines a fleet outgrows into
    if(k===3){const o=e,lab=(p,t,c,dy)=>R.label(p,t,{fs:12,c,a:o,dy,wide:1});
      [.2,2].forEach(x=>{R.quad([[x-.75,.002,-3.75],[x+.75,.002,-3.75],[x+.75,.002,-2.65],[x-.75,.002,-2.65]],{fill:false,ec:P.c5,dash:[5,4],lw:1.3,a:o});R.box([x,0,-3.2],[1.3,.9,1],{fill:mix(P.paper,P.c5,.15),a:o*.25,shadow:false})});
      R.label([1.1,.9,-3.2],narrow?'Scaling':'more machines: Scaling a database',{fs:12,b:1,c:P.c5,a:o,dy:-14});
      lab([PX,0,.75],'SQL · Transactions · Storage engines',P.c1,16);lab([PX,0,.75],'Query planning · Running Postgres',P.c1,32);
      lab([AX,.5,-2.3],'Caching · NoSQL in practice',P.c4,-30);lab([RX,0,-1.1],'Search and vector databases',P.c6,16);lab([RX,0,1.95],'Analytics',P.c3,16)}
  }
  const full={cam:[.42,.62],bounds:[[-4.4,0,-3.8],[4.4,1.7,2.4]]};
  S3.stage({id:'stg-one',list:'sx-one',fig:'Fig. 1 · one product, three moments',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[20,16,22,16],
    view:k=>k===0?{cam:[.42,.55],bounds:[[-4.3,0,-1.2],[1.2,1.3,1.2]]}:k===1?{cam:[.42,.58],bounds:[[-4.3,0,-1.4],[1.8,1.8,1.4]]}:full});
})();
