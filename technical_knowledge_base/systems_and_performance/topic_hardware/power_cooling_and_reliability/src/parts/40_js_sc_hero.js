// ---- Scene, Fig. 1 (the idea): one gigawatt from the grid to a GPU and back out as heat. Numbers from the page's data (window.PW):
// the GB200 NVL72 row of PW.systems (about 120 kW, 72 GPUs), PUE 1.2 (PW.pue.root), Blackwell's 1,200 W (PW.chips); everything else derived:
// overhead = 1,000 - 1,000 / PUE MW, racks = IT MW / rack kW, GPUs = racks x 72. Stream width: pipe cross-section area proportional to megawatts.
// The rack is PWG.rack (39_js_sc_geo.js); the grid, substation, UPS, cooling plant, CDU and hall are drawn for position. Steps: #sx-hero. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.PWG||!window.PW)return;const {mix,lerp}=S3,G=PWG;
  const sys=PW.systems.find(s=>s[0]==='nvl72'),chip=PW.chips.find(c=>/^B200/.test(c[0]));
  const N={site:1000,pue:PW.pue.root,rackKW:sys[2],gpr:sys[3],gpuW:chip[2]};
  N.it=N.site/N.pue;N.over=N.site-N.it;N.racks=N.it*1000/N.rackKW;N.gpus=N.racks*N.gpr;N.gpuKW=N.gpr*N.gpuW/1000;N.gpuShare=N.gpuKW/N.rackKW;
  window.PW_HERO=N; // checked by check/check_stages.mjs
  const f0=x=>Math.round(x).toLocaleString('en-US'),DM=mw=>.012*Math.sqrt(mw); // pipe diameter for a stream of mw megawatts
  const X={grid:-8.2,sub:-6.4,ups:-4.4,hall:-1.2},PL=[-3.2,-2.9],RK=[1.2,0],CDU=[3.0,-1.5],YP=.55;
  // the hall: one block per 100 racks, 10 by 7 (the last one partly filled)
  const BL=[];for(let r=0;r<7;r++)for(let c=0;c<10;c++)BL.push([-.4+c*.82,-2.5+r*.8]);
  const nb=N.racks/100;
  const A=[ // per step: the alpha of each part, so a step shows what it is about and the rest recedes
    {up:1,plant:.25,hall:0,rack:0,cdu:0},
    {up:.7,plant:1,hall:.5,rack:0,cdu:0},
    {up:.3,plant:.15,hall:0,rack:1,cdu:0},
    {up:.2,plant:.1,hall:0,rack:1,cdu:0},
    {up:.2,plant:1,hall:0,rack:1,cdu:1},
    {up:.6,plant:.5,hall:1,rack:0,cdu:0}];
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,a=n=>lerp(A[pk][n],A[k][n],e),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-9,8.5,-3.8,3.6,.5);
    const up=a('up'),pl=a('plant'),ha=a('hall'),ra=a('rack'),ca=a('cdu');
    // grid connection, substation, switchgear and UPS
    R.box([X.grid,0,0],[.14,2.1,.14],{fill:mix(P.paper,P.ink,.3),a:up});R.box([X.grid,1.85,0],[1.0,.07,.08],{fill:mix(P.paper,P.ink,.3),a:up,shadow:false});
    R.box([X.sub,0,0],[1.3,.85,1.2],{fill:mix(P.paper,P.c1,.45),a:up});
    R.box([X.ups,0,0],[1.1,.6,1.0],{fill:mix(P.paper,P.c5,.5),a:up});
    for(let i=0;i<4;i++)R.box([X.ups-.36+i*.24,.6,0],[.16,.22,.5],{fill:mix(P.paper,P.c3,.5),a:up,shadow:false});
    // the cooling plant (towers) behind
    R.box([PL[0],0,PL[1]],[1.8,.7,1.1],{fill:mix(P.paper,P.mute,.3),a:pl});
    [-.45,.45].forEach(dx=>R.box([PL[0]+dx,.7,PL[1]],[.6,.55,.6],{fill:mix(P.paper,P.mute,.2),a:pl,shadow:false}));
    // the hall of racks: 70 blocks of 100 racks
    if(ha>.01)BL.forEach((b,i)=>{const fill=Math.min(1,Math.max(0,nb-i));if(fill<=0)return;R.box([b[0],0,b[1]],[.56,.5*fill,.5],{fill:mix(P.paper,P.acc,i===3?.6:.25),a:ha,shadow:false})});
    // the rack
    if(ra>.01){const pull=k===3?e:k===4?1:pk===4&&k===5?1-e:pk===3&&k===2?1-e:0;
      G.rack(R,RK,{frame:ra,psu:ra*(k===2||k===1?1:.55),cpt:ra*(k===2?.7:1),sw:ra*.6,bus:ra*(k===2?1:.5),man:ra*(k===4?1:.25),pull,hlTray:k===3||k===4,cold:k===4?e:0,heat:0})}
    // the CDU beside the rack
    if(ca>.01){R.box([CDU[0],0,CDU[1]],[.7,1.0,.7],{fill:mix(P.paper,P.c6,.55),a:ca})}
    // streams
    const pts=[[X.grid,1.85,0],[X.sub,YP+.3,0],[X.ups,YP,0]];
    if(k===0){G.polyPipe(R,pts.concat([[X.hall,YP,0]]),DM(N.site),{c:P.c5,a:e});
      R.flow(pts.concat([[X.hall,YP,0]]),{c:P.c5,a:e,r:.09,n:Math.round(N.site/40),speed:1.6});
      lab([X.grid,2.1,0],'grid · '+f0(N.site)+' MW',{dy:-12,b:1,c:P.c5,a:e});lab([X.sub,.85,0],'substation',{dy:-26,fs:12,a:e});lab([X.ups,.85,0],'switchgear · UPS',{dy:-14,fs:12,a:e})}
    if(k===1||k===5){const m=k===1?e:e;
      G.polyPipe(R,pts,DM(N.site),{c:P.c5,a:m*.7});G.pipe(R,[X.ups,YP,0],[X.hall,YP,0],DM(N.it),{c:P.c5,a:m});G.polyPipe(R,[[X.ups,YP,0],[X.ups,YP,PL[1]],[PL[0]-.9,YP,PL[1]]],DM(N.over),{c:P.mute,a:m});
      R.flow(pts.concat([[X.hall,YP,0]]),{c:P.c5,a:m,r:.09,n:Math.round(N.it/40),speed:1.6});R.flow([[X.ups,YP,0],[X.ups,YP,PL[1]],[PL[0]-.9,YP,PL[1]]],{c:P.mute,a:m,r:.08,n:Math.max(3,Math.round(N.over/40)),speed:1.2});
      if(k===1){lab([X.hall,YP,0],f0(N.it)+' MW to servers',{al:'left',dx:10,dy:-4,b:1,c:P.c5,a:m});lab([PL[0],1.3,PL[1]],f0(N.over)+' MW · cooling, conversion',{dy:-12,b:1,c:P.mute,a:m});lab([X.grid,2.1,0],'PUE '+N.pue,{dy:-12,fs:12,a:m})}
      else{BL.forEach((b,i)=>{if(i%10===0&&i<70)R.flow([[X.hall,YP,0],[X.hall,YP,b[1]],[b[0]+8*.82,YP,b[1]]],{c:P.c5,a:m*.55,r:.06,n:9,speed:1.6})});
        lab([BL[66][0],.5,BL[66][1]],'≈'+f0(N.racks)+' racks · ≈'+f0(N.gpus)+' GPUs',{dy:-22,b:1,c:P.acc,a:m});lab([BL[3][0],.5,BL[3][1]],'1 block = 100 racks',{dy:26,fs:12,a:m})}}
    if(k===2){const top=[RK[0],G.H+.06,RK[1]],bus=[RK[0]+G.W/2+.06,G.H-.15,RK[1]-G.D/2+.22],bot=[bus[0],.2,bus[2]];
      G.pipe(R,[X.ups,YP,0],[RK[0]-1.2,YP,0],DM(N.it),{c:P.c5,a:.25});
      R.flow([[RK[0]-1.2,G.H+.5,0],[RK[0],G.H+.5,0],top],{c:P.c5,a:e,r:.06,n:6,speed:1});R.flow([bus,bot],{c:P.c5,a:e,r:.05,n:10,speed:.9});
      lab(top,'GB200 NVL72 · ≈'+f0(N.rackKW)+' kW',{dy:-30,b:1,c:P.c5,a:e});
      lab([RK[0]-G.W/2,G.ySlab(33),RK[1]+G.D/2],'4 power shelves',{al:'right',dx:-10,fs:12,c:P.c5,a:e});lab([RK[0]-G.W/2,G.ySlab(1),RK[1]+G.D/2],'4 power shelves',{al:'right',dx:-10,fs:12,c:P.c5,a:e});
      lab([RK[0]-G.W/2,G.ySlab(17),RK[1]+G.D/2],'9 NVLink switch trays',{al:'right',dx:-10,fs:12,c:P.c6,a:e});
      lab([RK[0]-G.W/2,G.ySlab(8),RK[1]+G.D/2],'9 compute trays',{al:'right',dx:-10,fs:12,a:e});lab([RK[0]-G.W/2,G.ySlab(26),RK[1]+G.D/2],'9 compute trays',{al:'right',dx:-10,fs:12,a:e});
      lab([bus[0],G.H*.55,bus[2]],'DC busbar',{al:'left',dx:12,fs:12,c:P.c5,a:e})}
    if(k===3){const zt=RK[1]+1.5,y=G.ySlab(G.PULL)+G.PITCH;const g=G.gpus(RK[0],zt);
      g.forEach(p=>R.glow([p[0],y+.05,p[2]],.3,{c:P.c5,a:e*.8}));
      lab([RK[0],y,zt+.7],'1 compute tray · 4 GPUs, 2 CPUs',{dy:22,b:1,a:e});lab([g[1][0],y+.08,g[1][2]],'≤ '+f0(N.gpuW)+' W each',{al:'left',dx:14,dy:-8,c:P.c5,b:1,a:e});
      lab([RK[0]-.24,y,zt-.35],'Grace CPUs',{al:'right',dx:-14,fs:12,a:e});
      lab([RK[0],y,zt+.7],'72 × '+f0(N.gpuW)+' W = '+N.gpuKW.toFixed(1)+' kW · '+Math.round(100*N.gpuShare)+'% of the rack',{dy:42,fs:12,c:P.c5,a:e})}
    if(k===4){const zt=RK[1]+1.5,y=G.ySlab(G.PULL)+G.PITCH+.05,mx=RK[0]+G.W/2+.06,hot=RK[1]-G.D/2+.5,cold=RK[1]-G.D/2+.66;
      G.gpus(RK[0],zt).forEach(p=>R.flow([[p[0],y,p[2]],[mx,y,p[2]],[mx,y,hot]],{c:P.bad,a:e,r:.045,n:6,speed:.7}));
      R.flow([[mx,G.H-.3,hot],[mx,G.H-.3,CDU[1]],[CDU[0],1.0,CDU[1]]],{c:P.bad,a:e,r:.06,n:8,speed:.9});
      R.flow([[CDU[0],.3,CDU[1]],[mx,.3,CDU[1]],[mx,.3,cold]],{c:P.c1,a:e,r:.06,n:6,speed:.9});
      G.polyPipe(R,[[CDU[0],.75,CDU[1]-.35],[CDU[0],.75,PL[1]],[PL[0]+.9,.75,PL[1]]],.12,{c:P.bad,a:e});
      R.flow([[CDU[0],.75,CDU[1]-.35],[CDU[0],.75,PL[1]],[PL[0]+.9,.75,PL[1]]],{c:P.bad,a:e,r:.07,n:12,speed:1.1});
      [-.45,.45].forEach(dx=>R.flow([[PL[0]+dx,1.3,PL[1]],[PL[0]+dx,2.6,PL[1]]],{c:P.bad,a:e*.6,r:.07,n:4,speed:.5}));
      lab([RK[0],y,zt+.7],'cold plates on every GPU and CPU',{dy:22,b:1,c:P.c1,a:e});lab([CDU[0],1.0,CDU[1]],'CDU',{dy:-14,b:1,c:P.c6,a:e});
      lab([PL[0],2.6,PL[1]],'cooling plant · heat out',{dy:-12,b:1,c:P.bad,a:e});lab([mx,G.H-.3,hot],'manifolds',{al:'left',dx:12,dy:-8,fs:12,a:e})}
  }
  const full={cam:[.5,.55],bounds:[[-8.6,0,-3.4],[7.8,2.4,3.0]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one gigawatt, grid to GPU and out as heat',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>k===0?{cam:[.45,.45],bounds:[[-8.8,0,-1.6],[-.6,2.4,1.6]]}:k===1?{cam:[.5,.6],bounds:[[-8.8,0,-3.6],[7.8,2.4,3.0]]}:k===2?{cam:[.6,.28],bounds:[[-1.4,0,-1.2],[2.6,4.0,1.4]]}:
      k===3?{cam:[.45,.9],bounds:[[.2,2.4,.5],[2.4,3.0,2.9]]}:k===4?{cam:[.55,.5],bounds:[[-4.4,0,-3.6],[3.8,3.8,2.6]]}:full,
    margin:w=>w<520?[18,10,14,10]:[24,20,20,20]});
  (window.PWSTG=window.PWSTG||{})['stg-hero']=st;
})();
