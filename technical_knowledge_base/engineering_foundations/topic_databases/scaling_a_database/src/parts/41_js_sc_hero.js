// ---- Scene, Fig. 1 (top): three ways to grow, and where one request goes in each (renderer v2) ----
// Schematic: one Postgres; a primary with two read replicas (the log streams to them); four shards behind a router.
// Colours match the ladder: one machine c3, copies c1, split c2. Reads teal, writes purple, the log gold, answers green.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,lerp,mix,cl}=S3;
  const APP=[0,0,2.35],RT=[0,0,.95],SX=[-3.3,-1.1,1.1,3.3],SZ=-.9,HIT=1;
  const half1=e=>cl(1-2*e,0,1),half2=e=>cl(2*e-1,0,1);
  function srv(R,c,s,fill,a,name,o){o=o||{};R.box(c,s,{fill,a});
    // a darker strip on the top face, so a server reads as a machine, not a block
    R.box([c[0],c[1]+s[1],c[2]],[s[0]*.82,.035,s[2]*.7],{fill:mix(fill,R.P.ink,.18),a:a*.9,shadow:false,lw:.5});
    if(name)R.label([c[0],c[1]+s[1]+.05,c[2]],name,{fs:o.fs||12.5,b:1,dy:-12,a:Math.max(.0,a),c:o.c||R.P.ink})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-2,3.2,.5);
    const top=(c,s)=>[c[0],c[1]+s[1]+.02,c[2]];
    // the application, front centre, present throughout
    R.box(APP,[1.6,.32,.6],{fill:mix(P.paper,P.ink,.06)});R.label([APP[0],.34,APP[2]],'app',{fs:12.5,b:1,dy:-12});
    // 1. one machine; it shrinks into the primary at step 2, and the copies fade out at step 3
    const big=[2.5,1.15,1.35],pri=[1.6,.85,1.05],C0=[0,0,-.45];
    let ca=k===0||k===1?1:k===2?half1(e):0,sz=k===0?big:k===1?big.map((v,i)=>lerp(v,pri[i],e)):pri;
    const fillOne=k===0?mix(P.paper,P.c3,.38):k===1?mix(mix(P.paper,P.c3,.38),mix(P.paper,P.c1,.4),e):mix(P.paper,P.c1,.4);
    srv(R,C0,sz,fillOne,ca,k===0?'one Postgres':'primary',{c:k===0?P.c3:P.c1});
    if(k===0){const a=e;
      [-.55,-.15].forEach((dx,i)=>R.flowArc([APP[0]+dx,.32,APP[2]-.1],[C0[0]+dx,sz[1]*.45,C0[2]+sz[2]/2+.02],.35+.1*i,{c:P.c6,a,r:.07,speed:1.3}));
      R.flowArc([APP[0]+.5,.32,APP[2]-.1],[C0[0]+.5,sz[1]*.45,C0[2]+sz[2]/2+.02],.4,{c:P.c4,a,r:.07,speed:1.3});
      R.label([C0[0]+big[0]/2,big[1]*.55,C0[2]],'every read and every write',{al:'left',dx:10,fs:12,c:P.mute,a,wide:1})}
    // 2. copies: the primary takes the writes, its log streams to two replicas, reads spread over all three
    const RP=[[-2.8,0,-.85],[2.8,0,-.85]],ra=k===1?e:k===2?half1(e):0;
    RP.forEach((c,i)=>srv(R,c,pri,mix(P.paper,P.c1,.2),ra,'replica',{c:P.c1}));
    if(k===1&&e>.3){const a=cl((e-.3)/.5,0,1);
      R.flowArc([APP[0]+.45,.32,APP[2]-.1],top(C0,pri),.55,{c:P.c4,a,r:.07,speed:1.3});
      RP.forEach(c=>R.flowArc([C0[0]+(c[0]<0?-.5:.5),pri[1]*.75,C0[2]],[c[0]+(c[0]<0?.5:-.5),pri[1]*.75,c[2]],.35,{c:P.c5,a,r:.065,speed:.8,n:7}));
      RP.forEach(c=>R.flowArc([APP[0]+(c[0]<0?-.6:.6),.32,APP[2]-.1],top(c,pri),.7,{c:P.c6,a,r:.07,speed:1.3}));
      R.flowArc([APP[0]-.15,.32,APP[2]-.1],top(C0,pri),.5,{c:P.c6,a:a*.6,r:.06,speed:1.3,n:5});
      R.label([0,pri[1]+.95,-.85],'log, a little behind',{fs:12,c:P.c5,b:1,a,wide:1});
      R.label([APP[0]+.9,.2,APP[2]],'writes: primary only',{al:'left',dx:8,fs:12,c:P.c4,a,wide:1})}
    // 3 and 4. split: a router, four shards
    const sa=k===2?half2(e):k>2?1:0,SS=[1.55,.7,.95];
    if(sa>0){srv(R,RT,[1.4,.28,.5],mix(P.paper,P.ink,.06),sa,'router');
      SX.forEach((x,i)=>{const hit=k===2&&i===HIT,all=k===3;const fill=mix(P.paper,P.c2,hit||all?.42:.2);
        srv(R,[x,0,SZ],SS,fill,sa,'shard '+(i+1),{c:P.c2})})}
    if(k===2&&e>.55){const a=cl((e-.55)/.35,0,1),sh=[SX[HIT],SS[1]+.02,SZ];
      R.flow([[APP[0]-.2,.32,APP[2]-.1],[RT[0]-.2,.3,RT[2]+.1]],{c:P.acc,a,r:.07,speed:1.2});
      R.flowArc([RT[0]-.3,.3,RT[2]],sh,.45,{c:P.acc,a,r:.07,speed:1.3});
      R.flowArc([sh[0]+.3,sh[1],sh[2]],[RT[0]+.1,.3,RT[2]],.45,{c:P.good,a,r:.06,speed:1.3,n:6});
      R.glow([sh[0],sh[1]+.1,sh[2]],.75,{c:P.c2,a:a*.5});
      R.label([RT[0]+.75,.15,RT[2]],'user_id = 4242 → shard 2',{al:'left',dx:8,mono:true,fs:12,c:P.acc,b:1,a,wide:1})}
    if(k===3){const a=e;R.flow([[APP[0]-.2,.32,APP[2]-.1],[RT[0]-.2,.3,RT[2]+.1]],{c:P.acc,a,r:.07,speed:1.2});
      SX.forEach(x=>{const sh=[x,SS[1]+.02,SZ];R.flowArc([RT[0]+(x<0?-.3:.3),.3,RT[2]],[x-.2,sh[1],sh[2]],.5,{c:P.acc,a,r:.065,speed:1.3,n:7});
        R.flowArc([x+.25,sh[1],sh[2]],[RT[0]+(x<0?-.1:.1),.3,RT[2]],.5,{c:P.good,a,r:.055,speed:1.3,n:5})});
      R.label([RT[0]+.75,.15,RT[2]],'no key: ask all 4, merge',{al:'left',dx:8,mono:true,fs:12,c:P.acc,b:1,a,wide:1})}
  }
  const full={cam:[.28,.48],bounds:[[-4.2,0,-1.4],[4.2,1.4,2.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · three ways to grow',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1500,hold:5200,draw,
    // step 1 is about one box: the camera starts close and pulls back as the copies and shards arrive
    view:k=>k===0?{cam:[.3,.45],bounds:[[-2.4,0,-1.3],[2.4,1.3,2.8]]}:full});
})();
