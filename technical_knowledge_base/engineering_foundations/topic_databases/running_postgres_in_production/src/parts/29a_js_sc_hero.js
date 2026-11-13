// ---- Scene, Fig. 1 (top): one Postgres server, what each part does, and the two orange pins that page you (renderer v2) ----
// Clients, one backend process each, shared buffers (a glass plate of 8 KB pages), the table files and the WAL; then the WAL shipped to an archive
// and a replica, dead row versions left in the table files and VACUUM, the two pins (an open transaction, an inactive slot) and the blue additions
// a fresh install lacks (archive, replica, PgBouncer, alerts). Drawn, not to scale; the steps are written out in #sx-hero.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const CZ=[-1.5,-.5,.5,1.5],XC=-4.4,XP=-3.15,XB=-1.9,XG=-.75,XT=.85,XW=1.05,ZW=1.15,XA=3.5,ZA=1.55,ZR=.05,ZL=-1.45;
  const TP=[];for(let r=0;r<2;r++)for(let c=0;c<3;c++)TP.push([XT-.5+c*.5,-1.55+r*.55]); // table-file pages
  const BH=.55,TH=.42,SL=.13; // backend height, table page height, WAL slab height
  function wal(R,n,a,c){const P=R.P;for(let i=0;i<n;i++){const red=c&&i>=4;R.box([XW,i*SL,ZW],[.95,SL*.82,.75],{fill:red?mix(P.paper,P.bad,.55):mix(P.paper,P.c5,.45),a,shadow:i===0,lw:.7})}}
  function draw(R,k,e){const P=R.P;R.grid(-5.2,4.6,-2.4,2.4,.5);const lab=(p,t,o,a)=>{if(a>=.6)R.label(p,t,Object.assign({a:Math.min(1,a)},o))};
    const pool=k===5?e:0,pin=k===4?e:0,addn=k>=5?1:0;
    // what each step is about stays at full strength; the rest recedes
    const aC=k===0||k===5?1:.3,aB=k<=1||k===4?1:k===5?.45:.3,aG=k===1?1:k===5?.3:.35,aT=k===1||k===3||k===4?1:.3,aW=k>=1&&k<=2||k===4?1:k===5?.35:.3,aX=k===2?1:k===5?1:.18;
    // 1. clients and their backends
    CZ.forEach((z,i)=>{R.ball([XC,.32,z],.17,{c:P.acc,a:aC});
      const isPin=i===0&&k===4,fill=isPin?mix(P.paper,P.bad,.55*pin):P.paper;
      R.box([XB,0,z],[.72,BH,.6],{fill,a:isPin?1:aB,lw:isPin?1.6:.9,ec:isPin?P.bad:null});
      if(k===0)R.flow([[XC+.2,.32,z],[XB-.38,.3,z]],{c:P.acc,a:e,r:.06,speed:1.2,n:4});
      if(k===5&&i<2)R.flow([[XP+.3,.4,0],[XB-.38,.3,z]],{c:P.acc,a:pool,r:.06,speed:1.2,n:4});
      if(k===5)R.flow([[XC+.2,.32,z],[XP-.3,.4,z*.4]],{c:P.acc,a:pool,r:.055,speed:1.2,n:3})});
    lab([XC,.6,CZ[0]-.2],'clients',{fs:12.5,b:1,c:P.acc,dy:-6},aC);
    lab([XB,BH,CZ[0]-.1],'backends · one process each',{fs:12.5,b:1,dy:-10},k===4?0:aB);
    // 2. shared buffers, the table files, the WAL
    R.glass([XG,.06,-1.75],[0,0,3.5],[0,1.25,0],{c:P.c1,a:aG,nu:9,nv:3});
    lab([XG,1.36,0],'shared buffers · 8 KB pages',{fs:12.5,b:1,c:P.c1,dy:-8},aG);
    TP.forEach(([x,z],i)=>R.box([x,0,z],[.42,TH,.42],{a:aT,lw:.8}));
    lab([XT,TH,-1.85],'table files',{fs:12.5,b:1,dy:-10,wide:k===3?1:0},k===4?0:aT);
    // dead row versions on the table pages: they appear at step 4, vacuum removes them; at step 5 an open transaction keeps them
    const dead=k===3?(e<.55?e/.55:1-(e-.55)/.45):k===4?pin:0;
    if(dead>.01)TP.forEach(([x,z],i)=>{if(i%2===0||k===4)R.box([x,TH,z],[.34,.08,.34],{fill:mix(P.paper,P.bad,.7),a:dead,shadow:false,lw:.6})});
    if(k===3)R.label([XT,TH+.15,-.8],e<.55?'dead row versions':'VACUUM reclaims them',{fs:12.5,b:1,c:e<.55?P.bad:P.good,dy:-14});
    const nW=k===4?Math.round(lerp(4,12,pin)):4;wal(R,nW,aW,k===4);
    lab(k===4?[XW+.48,nW*SL*.6,ZW]:[XW,nW*SL,ZW],k===4?'pg_wal/ keeps growing':'WAL · pg_wal/',k===4?{al:'left',dx:8,fs:12.5,b:1,c:P.bad}:{fs:12.5,b:1,c:mix(P.ink,P.c5,.5),dy:-10},aW);
    if(k===1){CZ.forEach(z=>{R.flow([[XB+.38,.3,z],[XG,.45,z*.8]],{c:P.c1,a:e,r:.05,speed:1.1,n:3});R.flowArc([XB+.38,.42,z],[XW-.4,.45,ZW],.35,{c:P.c5,a:e*.9,r:.05,speed:1.2,n:5})});
      R.flowArc([XG+.05,.5,-.9],[XT,TH+.05,-1.3],.3,{c:P.c1,a:e*.7,r:.045,speed:.6,n:4});
      R.label([XT+.85,TH,-1.1],'checkpoint: pages to disk',{al:'left',dx:6,fs:12,c:P.mute,a:e,wide:1});
      R.label([XW+.5,.3,ZW+.3],'every change, first',{al:'left',dx:8,fs:12,c:mix(P.ink,P.c5,.5),a:e,wide:1})}
    // 3. ship the WAL: archive and replica
    const repDead=k===4;
    R.box([XA,0,ZA],[.95,.55,.75],{fill:addn?mix(P.paper,P.acc,.3*(k===5?e:1)):P.paper,a:aX});
    lab([XA,.55,ZA],'archive · base backup + WAL',{fs:12.5,b:1,c:addn?P.acc:P.ink,dy:-10},aX);
    R.box([XA,0,ZR],[.95,.7,.8],{fill:repDead?mix(P.paper,P.mute,.35):addn?mix(P.paper,P.acc,.3*(k===5?e:1)):P.paper,a:repDead?.9:aX});
    lab([XA,.7,ZR],repDead?'replica: stopped':'replica · replays the WAL',{fs:12.5,b:1,c:repDead?P.mute:addn?P.acc:P.ink,dy:-10},repDead?1:aX);
    if(k===2){R.flowArc([XW+.5,.5,ZW],[XA-.5,.35,ZA],.45,{c:P.c5,a:e,r:.06,speed:1.3});R.flowArc([XW+.5,.4,ZW],[XA-.5,.4,ZR],.4,{c:P.c5,a:e,r:.06,speed:1.3})}
    // 5. the two pins
    if(k===4){R.glow([XB,BH+.1,CZ[0]],.5,{c:P.bad,a:pin*.7});
      R.label([XB,BH,CZ[0]],'open transaction',{fs:12.5,b:1,c:P.bad,a:pin,dy:-12});
      R.line([[XB+.36,.3,CZ[0]],[XT-.7,.3,-1.55]],{c:P.bad,w:2,a:pin,dash:[5,4]});
      R.label([XT+.75,TH,-1.3],'dead rows it can still see',{al:'left',dx:8,fs:12,c:P.bad,a:pin});
      R.box([XA-.75,0,ZR+.55],[.16,.5,.16],{fill:mix(P.paper,P.bad,.7),a:pin,lw:1.2,ec:P.bad});
      R.line([[XA-.75,.45,ZR+.55],[XW+.5,nW*SL,ZW]],{c:P.bad,w:2,a:pin,dash:[5,4]});
      R.label([XA-.75,.5,ZR+.55],'inactive slot',{fs:12.5,b:1,c:P.bad,a:pin,dy:-10})}
    // 6. the additions a fresh install lacks: the pooler and the alerts appear, archive and replica turn blue
    R.box([XP,0,0],[.36,.8,3.5],{fill:mix(P.paper,P.acc,.3),a:k===5?.25+.75*pool:0,lw:1.1,ec:P.acc});
    if(k===5){R.label([XP,.8,-1.6],'PgBouncer',{fs:12.5,b:1,c:P.acc,a:pool,dy:-8});
      R.box([XA,0,ZL],[.2,.9,.2],{fill:mix(P.paper,P.acc,.3),a:pool,lw:1.1,ec:P.acc});R.glow([XA,.95,ZL],.3,{c:P.acc,a:pool*.8});
      R.label([XA,.95,ZL],'alerts',{fs:12.5,b:1,c:P.acc,a:pool,dy:-12})}
  }
  const full={cam:[.16,.6],bounds:[[-4.7,0,-1.9],[4.1,1.1,1.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one server, and the pins that page you',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,12,8]:[18,16,14,16],
    // step 1 moves in close on clients and backends, step 2 on the write path, step 4 on the table files; the rest show the whole server
    view:k=>k===0?{cam:[.3,.6],bounds:[[-4.8,0,-2],[-1.2,1.0,2]]}:k===1?{cam:[.24,.6],bounds:[[-2.5,0,-2.1],[1.9,1.5,2.1]]}:k===3?{cam:[.2,.65],bounds:[[-1.1,0,-2.3],[2.8,1,-.1]]}:full});
})();
