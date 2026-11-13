// ---- Scene: Fig. 1, the resident agent (renderer v2). Structure, not data: five trigger sources stream events into the gateway,
// the gateway routes them to per-sender sessions, the loop (the model as a glass plate) reads its memory, every proposed action meets
// the gate (a glass wall decided in plain code), and leaves as run (read or reversible), held (irreversible, you started it) or refused
// (irreversible, nobody watching). Steps: ol#sx-hero. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {mix,lerp3,at}=S3;
  const SX=-4.5,GW=-2.8,SS=-1.6,MX=-.1,GX=1.7,OX=3.6,Y=.5;
  // sources: label, colour key, z, unattended
  const SRC=[['you · direct messages','c1',-1.7,0],['anyone · email, groups, web','c2',-.85,0],['heartbeat · timer','c5',0,1],['schedule · cron','c5',.85,1],['webhook','mute',1.7,0]];
  const SES=[-1.1,0,1.1];
  // outcomes: label, colour key, z
  const OUT=[['run · API tools or the screen','good',1.25],['held · waits for you','c5',0],['refused · draft and tell you','bad',-1.25]];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.6,5.0,-2.6,2.4,.5);
    // a part the step is not about recedes; one outside this step's close view (cut by the card's edge) almost disappears
    const vb=VIEW(k).bounds,XG={src:SX,gw:GW,ses:SS,mod:MX,mem:MX,gate:GX,run:OX,hold:OX,ref:OX},inV=g=>XG[g]>=vb[0][0]-.3&&XG[g]<=vb[1][0]+.3;
    const f=g=>({src:k===0,gw:k<=1,ses:k===1||k===2,mod:k>=2&&k<=3,mem:k===2,gate:k>=3,run:k===4,hold:k===5,ref:k===5}[g]?1:inV(g)?.24:.07);
    // 1. sources
    SRC.forEach(([t,c,z,u])=>{const a=f('src');R.box([SX,0,z],[.62,.42,.52],{fill:mix(P.paper,P[c],.45),a});
      if(k===0)R.label([SX-.35,.25,z],t,{fs:12.5,al:'right',dx:-6,c:mix(P.ink,P[c],.4),b:u,grp:'src'})});
    if(k===0)SRC.forEach(([t,c,z],i)=>R.flow([[SX+.32,.25,z],[GW-.32,.45,z*.55]],{c:P[c],r:.06,n:5,speed:1+.15*i,a:e}));
    // 2. the gateway and the sessions
    R.box([GW,0,0],[.6,.95,3.9],{fill:mix(P.paper,P.c3,.35),a:f('gw')});if(k<=1)R.label([GW,.95,-1.95],'gateway · always running',{fs:13,b:1,c:P.c3,dy:-10});
    SES.forEach((z,i)=>{const a=f('ses');R.box([SS,0,z],[.5,.34+.08*i,.6],{fill:mix(P.paper,P.c1,.2+.12*i),a})});
    if(k===1){SES.forEach((z,i)=>R.flow([[GW+.32,.5,z*.8],[SS-.27,.22,z]],{c:P.c3,r:.06,n:4,speed:1.1,a:e}));R.label([SS,.6,-1.1],'one session per sender',{fs:12.5,b:1,c:P.c1,dy:-10,a:e})}
    // 3. the loop: the model (glass) and its memory (a capped profile, a long history)
    const ma=f('mod');R.box([MX,0,0],[.9,.06,1.6],{fill:mix(P.paper,P.soft,.5),a:ma,shadow:false});R.glass([MX,.06,-.8],[0,0,1.6],[0,1.3,0],{c:P.c2,a:ma,nu:5,nv:6});
    if(k===2||k===3)R.label([MX,1.36,.8],'agent loop · model',{fs:13,b:1,c:P.c2,dy:-10});
    const mz=-2.0,mga=f('mem');R.box([MX,0,mz],[1.1,.1,.7],{fill:mix(P.paper,P.c4,.45),a:mga});for(let i=1;i<9;i++)R.box([MX,.1+i*.055-.055,mz],[1.1,.05,.7],{fill:mix(P.paper,P.c4,.12),a:mga,shadow:false,lw:.6});
    if(k===2){R.label([MX+.6,.5,mz],'memory · profile + searchable history',{fs:12.5,b:1,c:P.c4,al:'left',dx:6,a:e});
      R.flow([[SS+.27,.25,0],[MX-.05,.6,0]],{c:P.c1,r:.06,n:5,a:e});R.flowArc([MX,.55,mz+.3],[MX,.6,-.1],.5,{c:P.c4,r:.06,n:6,speed:.9,a:e})}
    // 4. the gate: a glass wall; the action carries two facts, which tool and who started the run
    R.glass([GX,.04,-1.9],[0,0,3.8],[0,1.15,0],{c:P.acc,a:f('gate'),nu:6,nv:3});
    if(k>=3)R.label([GX,1.2,1.9],'the gate · plain code',{fs:13,b:1,c:P.acc,dy:-10});
    if(k===3){const p=lerp3([MX+.1,Y,0],[GX-.15,Y,0],e);R.flow([[MX+.1,Y,0],p],{c:P.c2,r:.06,n:6,speed:1.2});R.ball(p,.12,{c:P.c2});
      R.label([(MX+GX)/2,Y,0],'which tool? who started the run?',{fs:12.5,b:1,c:P.ink,dy:-22,a:e})}
    // 5 and 6. three outcomes
    OUT.forEach(([t,c,z],i)=>{const a=i===0?f('run'):f('hold');R.box([OX,0,z],[.8,.5,.75],{fill:mix(P.paper,P[c],.4),a});
      if(k>=4&&(i===0?k===4:k===5))R.label([OX+.45,.3,z],nar?t.split(' · ')[0]:t,{fs:12.5,b:1,c:mix(P.ink,P[c],.45),al:'left',dx:6,a:e})});
    if(k===4){R.flow([[GX+.08,Y,.1],[OX-.42,.3,1.25]],{c:P.good,r:.065,n:6,a:e});R.flow([[OX+.42,.25,1.25],[4.9,.25,1.25]],{c:P.good,r:.05,n:3,a:e*.8});
      R.label([OX,.5,1.25],'undo step logged',{fs:12.5,c:P.good,dy:-12,a:e,wide:1})}
    if(k===5){R.flow([[GX+.08,Y,0],[OX-.42,.3,0]],{c:P.c5,r:.065,n:6,a:e});R.flow([[GX+.08,Y,-.1],[OX-.42,.3,-1.25]],{c:P.bad,r:.065,n:6,a:e});
      R.label([(GX+OX)/2,.3,0],'you started it',{fs:12.5,c:P.c5,dy:-14,a:e,wide:1});R.label([(GX+OX)/2,.3,-1.25],'heartbeat or schedule',{fs:12.5,c:P.bad,dy:18,a:e,wide:1})}
  }
  const full={cam:[.42,.62],bounds:[[-5.2,0,-2.4],[4.6,1.4,2.2]]};
  function VIEW(k){return k===0?{cam:[.5,.55],bounds:[[-6.4,0,-2.2],[-2.2,1.2,2.4]]}:k===1?{cam:[.45,.55],bounds:[[-3.6,0,-2.2],[-.8,1.2,2.2]]}:k===2?{cam:[.4,.55],bounds:[[-2.2,0,-2.6],[1.4,1.4,1.2]]}:k===3?{cam:[.4,.5],bounds:[[-1,0,-2],[2.4,1.4,2]]}:k>=4?{cam:[.4,.55],bounds:[[1.2,0,-1.9],[5.2,1.3,1.9]]}:full}
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the resident agent (structure, not data)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    view:VIEW,
    margin:w=>w<520?[16,10,14,10]:[28,16,16,16]});
})();
