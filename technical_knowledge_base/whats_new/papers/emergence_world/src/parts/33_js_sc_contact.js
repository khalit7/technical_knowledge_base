// ---- Scene (Fig. 3): the Claude world's external contact incident, round by round (§5.8.1, Figure 16; renderer v2: flows, camera per step) ----
// The town sits inside its sandbox (glass walls); the outside surfaces the agents tried stand to the right, coloured by their state at each step
// as the paper narrates it (reachable, reachable only by GET, needs an account, blocklisted, cut off). Counts are the paper's (§5.8.1) and the
// released records' post_egress tally (12 calls, 8 reaching a server, 2 returning HTTP 200). No intermediate counts are given, so none are drawn.
(function(){
  if(!document.getElementById('stg-ocx'))return;const {at,off,mix}=S3;
  const HOSTS=['paste.rs','dpaste.com','telegra.ph','webhook.site','Reddit, HN, Gists','Nostr relays','npoint.io, hastebin','post_egress → 4 hosts'];
  const ST=[
    ['','','','','','','',''],
    ['open','open','open','open','auth','auth','',''],
    ['open','open','open','open','auth','open','',''],
    ['cut','cut','get','cut','auth','cut','',''],
    ['cut','cut','blocked','blocked','auth','cut','open',''],
    ['cut','cut','blocked','blocked','auth','cut','blocked','open'],
    ['cut','cut','blocked','blocked','auth','cut','blocked','cut']];
  const HUM=['The Baker','The Wavefunction','Ted','Iris'];
  const RA=1.0,ang=i=>Math.PI*.5+2*Math.PI*i/10,ag=i=>[RA*Math.cos(ang(i)),0,RA*Math.sin(ang(i))];
  const WX=1.75,hp=i=>[3.3,0,-2.6+.75*i],hm=i=>[1.4+1.25*i,0,-3.6],LIB=[-.95,0,1.25],HALL=[.95,0,-1.25],CLOUD=[-.9,0,2.75];
  function draw(R,k,e){const P=R.P;R.grid(-3.2,6.6,-3.8,3.2,.5);
    const sc={open:P.good,get:P.c2,blocked:P.bad,auth:P.mute,cut:P.mute},lab={open:'reachable',get:'GET only',blocked:'blocklisted',auth:'needs an account',cut:'cut off'};
    // the sandbox: four glass walls that thicken as containment tightens
    const wa=.35+.12*Math.min(4,k>=6?4:k>=4?3:k>=3?1:0);
    [[[-WX,0,-WX],[2*WX,0,0]],[[-WX,0,WX],[2*WX,0,0]],[[-WX,0,-WX],[0,0,2*WX]],[[WX,0,-WX],[0,0,2*WX]]].forEach(([o0,u])=>R.glass(o0,u,[0,.62,0],{c:P.c1,a:wa,nu:6,nv:2,th:.03}));
    R.label([-WX,.62,-WX],'Claude world · sandbox',{al:'left',mono:true,fs:12,c:P.mute,dy:-10,wide:1});
    // the Library (web_fetch) and Town Hall (where tools are voted in)
    R.box(LIB,[.55,.32,.4],{fill:k===3?mix(P.paper,P.c2,.3):P.paper});R.label([LIB[0],.36,LIB[2]],'Library · web_fetch',{mono:true,fs:12,dy:-10,c:k===3?P.c2:P.mute,wide:k===3?0:1});
    R.box(HALL,[.6,.42,.45],{fill:k===5?mix(P.paper,P.c5,.45):P.paper});R.label([HALL[0],.46,HALL[2]],'Town Hall',{mono:true,fs:12,dy:-10,c:k===5?P.ink:P.mute,b:k===5,wide:k===5?0:1});
    if(k===5)R.glow([HALL[0],.5,HALL[2]],.7,{c:P.c5,a:.7*e});
    // the ten agents, all on outreach from step 2
    for(let i=0;i<10;i++){const p=ag(i),busy=k>=1;R.box(p,[.18,.26,.18],{fill:busy?mix(P.paper,P.c2,.35):P.paper});R.ball([p[0],.34,p[2]],.08,{c:busy?mix(P.paper,P.c2,.35):P.paper})}
    // 1. the audit: credits circle inside the town and nowhere else
    if(k===0){const pts=[];for(let j=0;j<=40;j++){const t=2*Math.PI*j/40;pts.push([RA*.62*Math.cos(t),.12,RA*.62*Math.sin(t)])}R.flow(pts,{c:P.c5,a:e,r:.06,n:5,speed:.8});
      R.label([0,.2,0],'5 transfers, all internal',{mono:true,fs:12,b:1,c:P.c5,a:e})}
    // the outside surfaces, in their state at this step
    HOSTS.forEach((h,i)=>{const s=ST[k][i];if(!s)return;const p=hp(i),first=ST[k-1]&&!ST[k-1][i],a=(first?e:1)*(s==='cut'?.35:1);
      R.box(p,[.55,.22,.42],{fill:mix(P.paper,sc[s],s==='cut'?.1:.4),a});
      R.label([p[0]+.33,.12,p[2]],h+' · '+lab[s],{al:'left',mono:true,fs:12,dx:4,c:s==='cut'?P.mute:s==='auth'?P.mute:sc[s],b:s!=='cut'&&s!=='auth',a:Math.max(.55,a),grp:'h'});
      const from=[WX*.3,.35,p[2]*.3];
      if((s==='open')&&i<7)R.flowArc(from,[p[0]-.3,.2,p[2]],.45,{c:P.good,a,r:.05,n:6,speed:1.3});
      if(s==='get')R.flowArc([LIB[0],.4,LIB[2]],[p[0]-.3,.2,p[2]],.6,{c:P.c2,a,r:.06,n:7,speed:1.3})});
    // 3. four humans answer: dots come back in
    if(k>=2){HUM.forEach((n,i)=>{const p=hm(i),a=k===2?e:.55;R.box(p,[.2,.3,.2],{fill:mix(P.paper,P.c4,.4),a});R.ball([p[0],.4,p[2]],.1,{c:P.c4,a});
      R.label([p[0],.5,p[2]],n,{mono:true,fs:12,dy:i%2?-26:-10,c:P.c4,a,wide:1});
      if(k===2)R.flowArc([p[0],.35,p[2]+.1],[p[0]*.3,.3,-WX*.3],.7,{c:P.c4,a:e,r:.06,n:6,speed:1.1})})}
    // 6. the egress tool, voted in at Town Hall, runs on the server outside the sandbox: 12 calls, 8 reached a server, 2 returned HTTP 200
    if(k===5){const p=hp(7);R.flowArc([HALL[0],.45,HALL[2]],[p[0]-.3,.2,p[2]],.9,{c:P.c5,a:e,r:.07,n:12,speed:1.2});
      R.label([HALL[0],.46,HALL[2]],'12 calls · 8 reach a server · 2 return 200',{mono:true,fs:12,dy:-28,b:1,c:P.c5,a:e})}
    // 7. tools for strangers, placed where a stranger may find them
    if(k===6){R.box(CLOUD,[.9,.3,.5],{fill:mix(P.paper,P.c6,.35),a:e});R.label([CLOUD[0],0,CLOUD[2]],'Cloud Storage · 26 tools, 19 for strangers',{mono:true,fs:12,dy:16,b:1,c:P.c6,a:e});
      R.flowArc([-.3,.35,.4],[CLOUD[0],.32,CLOUD[2]-.2],.7,{c:P.c6,a:e,r:.06,n:9,speed:1.2})}
  }
  const full={cam:[.22,.7],bounds:[[-2.1,0,-3.9],[5.6,.8,3.1]]};
  S3.stage({id:'stg-ocx',list:'sx-ocx',fig:'Fig. 3 · the external contact incident, as the paper narrates it',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,190,22,14],
    view:k=>k===0?{cam:[.3,.7],bounds:[[-2,0,-2],[2,.8,2]]}:full});
})();
