// ---- Scene, Fig. 1 (section 2): a parallel file system as one metadata server and four object storage targets, one file striped over them,
// then four writers (renderer v2). Every rate and layout is a measured run on tpfs, the page's toy file system (window.SD.tpfs: 128 MiB at
// stripe count 1, 2 and 4, first run's layout; four writers of 64 MiB, spread and all on OST 0). Each OST is held to 25 MB/s by a token bucket.
// The eight cubes on the client are the file's first 8 MiB (1 MiB stripes); column heights are bytes held, to scale within the figure. Steps: #sx-pfs.
(function(){
  if(!document.getElementById('stg-pfs')||!window.SD||!SD.tpfs)return;const {at,off,lerp,mix}=S3;
  const T=SD.tpfs,ST=T.stripe,NP=T.nproc,r1=x=>x.toFixed(1);
  const LAY={1:ST['1'].layouts[0],2:ST['2'].layouts[0],4:ST['4'].layouts[0]};
  window.SD_PFS={lay:LAY,rate:{1:ST['1'].write_MBps,2:ST['2'].write_MBps,4:ST['4'].write_MBps},spread:NP.fpp_balanced.MBps,ost0:NP.fpp_ost0.MBps};
  const OX=[-1.95,-.65,.65,1.95],ZO=-2.2,MDS=[-4.3,0,-.9],CL=[0,0,2.4],H=.9,RX=OX; // OST columns, metadata server, the client; H: column height for 128 MiB
  const HL=[.6,2.7,-3.4]; // the headline of each step sits high behind the servers
  const C_OF=k=>k===2?1:k===3?2:k===4?4:0;
  function draw(R,k,e){const P=R.P,OC=[P.c1,P.c2,P.c3,P.c4],lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-6,4,-3.6,3.8,.5);
    const many=k>=5,one=many?(k===5?1-Math.min(1,e*2):0):1,four=many?(k===5?Math.max(0,e*2-1):1):0; // the client gives way to four ranks at step 6
    // the metadata server and its target: asked at open, never on the data path
    const ma=k===1?1:k===0?1:.3;
    R.box(MDS,[1.5,.55,1.2],{fill:mix(P.paper,P.c5,.45),a:ma});R.box([MDS[0],.55,MDS[2]],[1.3,.22,1],{fill:mix(P.paper,P.c5,.7),a:ma,shadow:false});
    lab([MDS[0],.8,MDS[2]],'MDS · MDT',{dy:-12,b:1,c:P.c5,a:Math.max(.5,ma)});
    if(k<=1)lab([MDS[0],0,MDS[2]+.6],'names and layouts',{dy:14,c:P.mute,wide:1});
    // the four object storage targets; a column on each is the bytes it holds
    const held=[0,0,0,0];
    if(k>=2&&k<=4){const C=C_OF(k),L=LAY[C];L.forEach(o=>held[o]=H/C*e)}
    if(k===5)[0,1,2,3].forEach(o=>held[o]=H/2*Math.max(0,e*2-1));
    if(k===6)held[0]=2*H*e;
    OX.forEach((x,o)=>{const busy=held[o]>0,oa=k===0||busy||k===1?1:.3;
      R.box([x,0,ZO],[1.05,.3,1.05],{fill:mix(P.paper,OC[o],.3),a:oa});
      if(held[o]>0)R.box([x,.3,ZO],[.62,held[o],.62],{fill:mix(P.paper,OC[o],.85),a:1,shadow:false});
      lab([x,0,ZO+.55],'OST '+o,{dy:14,b:busy,c:busy?OC[o]:P.ink,a:Math.max(.55,oa)})});
    if(k===0)lab([OX[3]+.7,.3,ZO],'25 MB/s each',{al:'left',dx:8,c:P.mute,wide:1});
    // the client and its file: 8 x 1 MiB, coloured by the OST each stripe goes to
    if(one>0){R.box(CL,[2.7,.24,1.2],{fill:mix(P.paper,P.ink,.06),a:one,dz:200});
      const C=k>=2&&k<=4?C_OF(k):0;
      for(let m=0;m<8;m++){const o=C?LAY[C][m%C]:-1,hot=k===4&&m===5;
        R.box([CL[0]-1.05+m*.3,.24,CL[2]],[.22,hot?.36:.22,.22],{fill:o<0?P.paper:mix(P.paper,OC[o],.85),a:one,shadow:false,lw:hot?1.6:.8})}
      lab([CL[0],0,CL[2]+.6],k===0?'client · 128 MiB file, 1 MiB stripes':'client',{dy:14,b:1,a:one})}
    const top=o=>[OX[o],.3+held[o]+.05,ZO],src=m=>[CL[0]-1.05+m*.3,.5,CL[2]];
    // 1. open: the layout comes back once
    if(k===1){R.flowArc([CL[0]-.6,.5,CL[2]],[MDS[0]+.3,.8,MDS[2]],.9,{c:P.c5,a:e,r:.07,n:6,speed:1.4});
      R.flowArc([MDS[0]+.5,.8,MDS[2]],[CL[0]-.2,.5,CL[2]],1.3,{c:P.c5,a:e,r:.05,n:5,speed:1.1});
      lab([lerp(MDS[0],CL[0],.5),1.6,lerp(MDS[2],CL[2],.5)],'layout: objects on OSTs, 1 MiB stripes',{b:1,c:P.c5,a:e})}
    // 2 to 4: stripe count 1, 2, 4; stripe m goes to object m mod C
    if(k>=2&&k<=4){const C=C_OF(k),L=LAY[C];
      L.forEach((o,j)=>R.flowArc(src(j),[OX[o],.35,ZO+.3],1.1,{c:OC[o],a:e,r:.075,n:8,speed:1.5}));
      lab(HL,'stripe count '+C+' · '+r1(SD_PFS.rate[C])+' MB/s',{b:1,c:P.acc,a:e});
      L.forEach(o=>lab(top(o),r1(128/C)+' MiB',{dy:-10,c:OC[o],a:e}));
      if(k===4){const o=LAY[4][1];R.arc([src(5)[0],.62,CL[2]],[OX[o],.35+held[o]+.1,ZO],1.6,{c:P.ink,w:1.6,t:e,top:1});
        lab([src(5)[0]+.2,.75,CL[2]],'MiB 5 → object 1 (OST '+o+'), offset 1 MiB',{al:'left',dx:10,b:1,a:e,wide:1})}}
    // 5 and 6: four ranks, four files
    if(four>0){OX.forEach((x,r)=>{R.box([x,0,CL[2]],[1.05,.22,1.05],{fill:mix(P.paper,P.ink,.06),a:four,dz:200});lab([x,0,CL[2]+.55],'rank '+r,{dy:14,a:four,b:1})});
      if(k===5){OX.forEach((x,r)=>R.flowArc([x,.3,CL[2]],[OX[r],.35,ZO+.3],1,{c:OC[r],a:four,r:.075,n:8,speed:1.5}));
        lab(HL,'4 files, spread · '+r1(SD_PFS.spread)+' MB/s together',{b:1,c:P.good,a:four});[0,1,2,3].forEach(o=>lab(top(o),'64 MiB',{dy:-10,c:OC[o],a:four}))}
      if(k===6){OX.forEach((x,r)=>R.flowArc([x,.3,CL[2]],[OX[0]+(r-1.5)*.12,.35,ZO+.3],1+.2*r,{c:OC[0],a:e,r:.06,n:5,speed:.6}));
        lab(HL,'4 files on OST 0 · '+r1(SD_PFS.ost0)+' MB/s',{b:1,c:P.bad,a:e});lab(top(0),'256 MiB',{dy:-10,c:OC[0],a:e})}}
  }
  const full={cam:[.28,.6],bounds:[[-5.2,0,-3.5],[3,2.8,3.1]]};
  const st=S3.stage({id:'stg-pfs',list:'sx-pfs',fig:'Fig. 1 · one file striped over four servers, then four writers',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===1?{cam:[.45,.55],bounds:[[-5.2,0,-1.9],[1.6,1.6,3.1]]}:k===6?{cam:[.2,.62],bounds:[[-3.2,0,-3.5],[3,2.8,3.1]]}:full});
  (window.SDSTG=window.SDSTG||{})['stg-pfs']=st;
})();
