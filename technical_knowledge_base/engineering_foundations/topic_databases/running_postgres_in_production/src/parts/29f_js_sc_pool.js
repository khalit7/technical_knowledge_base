// ---- Scene, Fig. 7 (section 7): many clients onto few server connections through PgBouncer in transaction mode (renderer v2) ----
// Data: window.RPG.connections, the real runs: 97 connections opened before the refusal (max_connections 100, 3 reserved), and SHOW POOLS for
// 1,000 clients with default_pool_size 20 (cl_active, cl_waiting, sv_active; Postgres saw 20). From step 2 on, one client dot stands for ten.
(function(){
  if(!document.getElementById('stg-pool')||!window.RPG)return;const {at,off,lerp,mix}=S3;
  const C=RPG.connections||{},CS=C.steps||{},opened=(C.x&&C.x.exhaust&&C.x.exhaust.opened)||97;
  const pools=String((CS.bouncer_1000&&CS.bouncer_1000.out)||'').split('\n').find(l=>/transaction\s*$/.test(l.trim()))||'',nums=(pools.match(/\d+/g)||[]).map(Number);
  const clA=nums[0]||832,clW=nums[1]||168,svA=nums[2]||20,sv=(C.x&&C.x.bouncer_1000&&C.x.bouncer_1000.server_conns)||20;
  const XC=c=>-4.9+c*.3,ZC=r=>-1.35+r*.3,XS=c=>1.75+c*.34,ZS=r=>-1.5+r*.34,XB=-.45;
  const conn=i=>[XS(i%10),0,ZS(Math.floor(i/10))],pool=i=>[XS(3+i%4)+.0,0,ZS(2+Math.floor(i/4))*1.0];
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-2.2,2.4,.5);
    const pb=at(k,e,1);
    // the clients: 100 dots (step 1: one dot is one client; afterwards ten)
    for(let i=0;i<100;i++){const c=i%10,r=Math.floor(i/10),p=[XC(c),.08,ZC(r)];let col=P.acc,a=1;
      if(k===0){if(i===opened)col=P.bad;else if(i>opened)a=.15}
      if(k===2&&(i===34||i===35))col=i===34?P.c2:P.c4;
      if(k===3){const run=Math.round(svA/10),wait=Math.round(clW/10);col=i<run?P.acc:i<run+wait?P.c5:mix(P.paper,P.acc,.35)} // running, waiting, idle
      R.ball(p,k===2&&(i===34||i===35)?.13:.09,{c:col,a})}
    R.label([XC(4.5),0,ZC(9)+.1],k===0?'clients · one dot = one client':'1,000 clients · one dot = ten',{fs:12.5,b:1,c:P.acc,dy:16});
    // Postgres: max_connections slots (step 1), then only the pool's server connections
    for(let i=0;i<100;i++){const inPool=i<sv,res=i>=97;let a=1,fill=P.paper;
      if(k===0){fill=res?mix(P.paper,P.c5,.6):i<opened?mix(P.paper,P.acc,.25):P.paper}
      else{a=inPool?1:Math.max(0,1-pb)*.6;fill=inPool?mix(P.paper,P.c3,.35):P.paper}
      if(k===3&&inPool)fill=mix(P.paper,P.acc,.45);
      if(k===2&&i===3)fill=mix(P.paper,e<.5?P.c2:P.c4,.55);
      R.box(conn(i),[.27,.28,.27],{fill,a,shadow:false,lw:.6})}
    R.label([XS(4.5),.22,ZS(0)],k===0?'max_connections = 100':'Postgres sees '+sv+' backends',{fs:12.5,b:1,dy:-12,c:k===0?P.ink:P.c3,a:k===2?0:1});
    if(k===0){R.label([XS(9),.22,ZS(9.7)],'3 reserved for superusers',{al:'left',dx:12,fs:12,c:mix(P.ink,P.c5,.5),b:1,wide:1});
      R.label([XC(opened%10),.1,ZC(Math.floor(opened/10))],'refused: slots reserved',{al:'left',dx:14,fs:12.5,b:1,c:P.bad,a:e});
      [3,25,48,71,90].forEach(i=>R.flow([[XC(i%10)+.1,.1,ZC(Math.floor(i/10))],conn(i).map((v,j)=>j===1?.15:v)],{c:P.acc,a:e*.7,r:.04,speed:1.4,n:7}))}
    // PgBouncer between them
    if(pb>0){R.glass([XB,.05,-1.6],[0,0,3.2],[0,1.2,0],{c:P.acc,a:pb,nu:2,nv:4});R.label([XB,1.2,.1],'PgBouncer · transaction mode',{fs:12.5,b:1,c:P.acc,dy:-8,a:pb})}
    if(k===1){[5,22,47,63,88].forEach((i,q)=>R.flow([[XC(i%10)+.1,.1,ZC(Math.floor(i/10))],[XB-.05,.4,-.8+q*.4]],{c:P.acc,a:e*.6,r:.035,speed:1.2,n:6}));
      [0,7,12,19].forEach((i,q)=>R.flow([[XB+.05,.4,-.6+q*.4],conn(i).map((v,j)=>j===1?.15:v)],{c:P.c3,a:e,r:.045,speed:1.2,n:6}))}
    // one server connection lent for a transaction, then returned and lent to the next client in line
    if(k===2){const first=e<.5,u=first?e*2:(e-.5)*2,src=first?34:35,col=first?P.c2:P.c4;
      R.flow([[XC(src%10)+.1,.1,ZC(Math.floor(src/10))],[XB,.45,0],conn(3).map((v,j)=>j===1?.2:v)],{c:col,a:1,r:.07,speed:1.6,n:10});
      R.label(conn(3).map((v,j)=>j===1?.22:v),first?'lent to client A until COMMIT':'returned; lent to client B',{fs:12.5,b:1,c:col,dy:-14})}
    // more work than connections: a short queue in PgBouncer
    if(k===3){const nq=Math.round(clW/10);for(let i=0;i<nq;i++)R.ball([XB-.35-(i%6)*.16,.1+Math.floor(i/6)*.16,.9-.0],.06,{c:P.c5,a:e});
      for(let i=0;i<sv;i++)if(i%4===0)R.flow([[XB+.05,.4,-.9+i*.09],conn(i).map((v,j)=>j===1?.15:v)],{c:P.acc,a:e,r:.04,speed:1.4,n:5});
      R.label([XB-.75,.1,1.15],'cl_waiting '+clW,{dy:16,fs:12.5,b:1,mono:true,c:mix(P.ink,P.c5,.5),a:e});
      R.label([XB,1.2,.1],'cl_active '+clA,{fs:12.5,b:1,mono:true,c:P.acc,dy:12,a:e});
      R.label([XS(4.5),0,ZS(2)],'sv_active '+svA,{fs:12.5,b:1,mono:true,c:P.acc,dy:14,a:e})}
  }
  const full={cam:[.08,.85],bounds:[[-5.1,0,-1.7],[5.2,1.0,1.8]]};
  S3.stage({id:'stg-pool',list:'sx-pool',fig:'Fig. 7 · many clients, few server connections',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,120,18,16]});
})();
