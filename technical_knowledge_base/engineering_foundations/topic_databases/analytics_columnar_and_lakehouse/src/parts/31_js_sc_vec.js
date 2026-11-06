// ---- Scene, Fig. 2 (section 4): row at a time against a vector at a time, then late materialisation (renderer v2) ----
// sum(tokens) over 10,000,000 values in memory: one value per call (10,000,000 calls) against 2,048 per call (4,883 calls, derived);
// then SELECT sum(tokens) WHERE chat_id = 424242: the filter runs on chat_id alone and tokens is fetched only at the 7 positions that passed.
(function(){
  if(!document.getElementById('stg-vec'))return;const {at,off,lerp,mix,RM}=S3;
  const XC0=-4.3,XC1=-1.55,XS=-.4,XA=2.1,ZT=0,ZC=1.5,NSEG=24,POS=.424242; // the chat's rows sit about 42% of the way through the time-sorted table
  const xs=u=>lerp(XC0,XC1,u);
  function rail(R,z,name,a,fill,hi){const P=R.P,w=(XC1-XC0)/NSEG;
    for(let i=0;i<NSEG;i++)R.box([xs((i+.5)/NSEG),0,z],[w*.94,.32,.5],{fill:hi&&hi(i)?hi(i):fill||P.paper,a,shadow:false,lw:.6});
    R.label([XC0-.1,.16,z],name,{al:'right',dx:-4,mono:true,fs:12.5,c:P.ink,a:Math.max(.4,a),grp:'rails'})}
  function draw(R,k,e){const P=R.P,t=R.t;R.grid(-6.5,4.5,-1.8,3,.5);
    const late=k>=3,tA=late?.5:1;
    // the tokens column in memory, and the chat_id column that joins it for the filter in steps 4 and 5
    rail(R,ZT,'tokens · 10,000,000 values',k===4?1:tA,mix(P.paper,P.c1,.3),k===4?i=>Math.abs((i+.5)/NSEG-POS)<.5/NSEG?P.c2:null:null);
    const ca=at(k,e,3);if(ca>0)rail(R,ZC,'chat_id',ca,mix(P.paper,P.c6,.35),i=>Math.abs((i+.5)/NSEG-POS)<.5/NSEG&&k>=3?P.c2:null);
    // the two operators of the plan
    R.box([XS,0,ZT+(late?.6:0)],[1.2,.75,1.1],{fill:P.paper});R.label([XS,.75,ZT+(late?.6:0)],late?'Scan + filter':'Scan · decode',{b:1,fs:13,dy:-12});
    R.box([XA,0,ZT],[1.3,.75,1.1],{fill:P.paper});R.label([XA,.75,ZT],'Aggregate · sum(tokens)',{b:1,fs:13,dy:-12});
    R.flow([[XC1+.05,.2,ZT],[XS-.62,.2,ZT]],{c:P.c1,a:k===0?e*.6:k<3?.5:.15,r:.05,speed:1});
    // the per-call cost every call pays: a glass plate the calls pass through
    const ga=k>=1&&k<=2?1:k===0?.35:.2;R.glass([.85,.06,-.55],[0,0,1.1],[0,.62,0],{c:P.c5,a:ga,nu:4,nv:4});
    if(k>=1&&k<=2)R.label([.85,.7,-.55],'per-call overhead',{mono:true,fs:12,dy:-10,c:P.c5,wide:1});
    if(k===1){R.flow([[XS+.62,.38,ZT],[XA-.66,.38,ZT]],{c:P.c2,a:e,r:.035,n:34,speed:2.6});
      R.label([.85,.06,.7],'1 value per call · 10,000,000 calls',{mono:true,fs:12.5,b:1,dy:22,c:P.c2,a:e})}
    if(k===2){ // vectors of 2,048 values travel as slabs; they move only while the stage is on screen, and stand still under reduced motion
      const L=XA-.66-(XS+.62);if(!RM)R.moving=true;
      for(let j=0;j<3;j++){const u=((RM?0:t*.45)+j/3)%1,px=XS+.62+u*L,fade=Math.sin(Math.PI*u);
        R.box([px,.12,ZT],[.38,.42,.8],{fill:P.c2,a:e*(.25+.75*fade),shadow:false,lw:.6})}
      R.label([.85,.06,.7],'2,048 values per call · 4,883 calls',{mono:true,fs:12.5,b:1,dy:22,c:P.c2,a:e})}
    // late materialisation: the filter reads chat_id alone, keeps the passing positions, then tokens is fetched only there
    if(k===3){R.flow([[xs(POS),.35,ZC],[XS-.4,.35,ZC-.2]],{c:P.c6,a:e,r:.06,speed:1.3});
      R.glass([XS+.8,.06,ZC-.3],[.9,0,0],[0,.5,0],{c:P.c2,a:e,nu:7,nv:1});R.label([XS+1.25,.56,ZC-.3],'7 positions passed',{mono:true,fs:12.5,b:1,dy:-10,c:P.c2,a:e})}
    if(k===4){R.glass([XS+.8,.06,ZC-.3],[.9,0,0],[0,.5,0],{c:P.c2,a:.6,nu:7,nv:1});
      R.flowArc([xs(POS),.35,ZT],[XS-.4,.4,ZT+.6],.5,{c:P.c2,a:e,r:.06,n:7,speed:1.2});
      R.flow([[XS+.62,.38,ZT+.3],[XA-.66,.38,ZT]],{c:P.c2,a:e*.8,r:.05,n:5,speed:1.2});
      R.label([xs(POS),0,ZC+.3],'tokens fetched at those 7 rows only',{mono:true,fs:12.5,b:1,dy:20,c:P.c2,a:e})}
  }
  const full={cam:[.32,.52],bounds:[[-4.4,0,-.8],[2.9,.9,1.9]]};
  S3.stage({id:'stg-vec',list:'sx-vec',fig:'Fig. 2 · the same plan, two ways of looping',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1300,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[18,14,18,170],
    // steps 2 and 3 move in close on the hand-over between the two operators
    view:k=>k===1||k===2?{cam:[.45,.5],bounds:[[-1.4,0,-1],[3,1,1.4]]}:full});
})();
