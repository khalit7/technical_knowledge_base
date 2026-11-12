// ---- Scene, Fig. 1 (section 4): one save and one restore under each checkpoint strategy, on four nodes (renderer v2) ----
// Four nodes in a row, each with two GPUs (the state), host CPU memory with two slots (its own copy, a peer's copy), and shared storage behind.
// The pauses and load times in the labels come from section 5's model inputs (window.FT.rec: the default design's 5-minute pause and 162 s load,
// the in-memory design's 3 s load) and the measured lab pauses quoted in the step list; positions and distances are schematic.
(function(){
  if(!document.getElementById('stg-ck')||!window.FT||!window.FT.rec)return;const {at,off,lerp,mix}=S3;
  const D=window.FT.rec,des=id=>D.designs.find(d=>d.id===id),base=des('base'),mem=des('mem');
  const fmt=s=>s<200?Math.round(s)+' s':Math.round(s/60)+' min';
  window.FT_CK={C_base:fmt(base.C_s),L_base:fmt(base.R.load),L_mem:fmt(mem.R.load)};
  const NX=[-4.5,-1.5,1.5,4.5],ZG=-.5,ZM=.6,ZS=-4.1,FAIL=2,PEER=3;
  const gpu=(n,j)=>[NX[n]+(j?.55:-.55),.2,ZG],mem0=n=>[NX[n],.2,ZM],slot=(n,j)=>[NX[n]+(j?.42:-.42),.5,ZM];
  const sto=[0,1.25,ZS],SPF=[1.5,0,2.7];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-7,7,-5,3.6,.5);
    const spareIn=k===5||k===6?(k===5?e:1):0; // the hot spare slides into node 3's place
    // shared storage
    const sa=k===3||k===4?.35:1;
    for(let i=0;i<3;i++)R.box([0,i*.42,ZS],[3.2,.38,1.3],{fill:mix(P.paper,P.c5,.38),a:sa,shadow:i===0});
    lab([0,1.3,ZS],'shared storage',{dy:-12,b:1,a:Math.max(.5,sa)});
    // nodes
    const dead=n=>(k===4||k===5||k===7)&&n===FAIL||k===6&&(n===FAIL||n===PEER);
    NX.forEach((x,n)=>{const gone=dead(n),na=gone?(k===4?lerp(1,.22,e):.22):1;
      if(gone&&spareIn>0&&n===FAIL)return; // the spare stands here now
      R.box([x,0,0],[2.5,.2,2.3],{fill:mix(P.paper,P.ink,.06),a:na,dz:200});
      const stopped=k===1||(k===2&&e<.35),gc=gone?P.bad:stopped?mix(P.paper,P.bad,.65):P.acc;
      for(let j=0;j<2;j++)R.box(gpu(n,j),[.8,.42,.7],{fill:gc,a:na,shadow:false});
      R.box(mem0(n),[1.9,.3,.6],{fill:mix(P.paper,P.c3,.4),a:na,shadow:false});
      lab([x,.2,1.35],'node '+(n+1),{dy:14,b:1,a:Math.max(.45,na),c:gone?P.bad:P.ink});
    });
    // what each node's memory holds: its own copy (blue) from step 3, a peer's copy (purple) from step 4
    const own=k===2?at(k,e,2):k>=3&&k<=6?1:0,peer=k>=3&&k<=6?(k===3?e:1):0;
    NX.forEach((x,n)=>{if(dead(n)&&!(k===4&&n===FAIL))return;const fa=dead(n)?1-e:1;
      if(own)R.box(slot(n,0),[.62,.18,.4],{fill:P.c6,a:own*fa,shadow:false});
      if(peer)R.box(slot(n,1),[.62,.18,.4],{fill:P.c4,a:peer*fa,shadow:false})});
    // the spare: waiting in front, then in node 3's place, restored
    {const sp=[lerp(SPF[0],NX[FAIL],spareIn),0,lerp(SPF[2],0,spareIn)],sa2=k>=4&&k<=6?(k===4?e:1):0;
      if(sa2>0){R.box(sp,[2.5,.2,2.3],{fill:mix(P.paper,P.good,.25),a:sa2,dz:200});
        const filled=k===5?e:k===6?e:0;for(let j=0;j<2;j++)R.box([sp[0]+(j?.55:-.55),.2,sp[2]+ZG],[.8,.42,.7],{fill:mix(mix(P.paper,P.good,.3),P.acc,filled),a:sa2,shadow:false});
        R.box([sp[0],.2,sp[2]+ZM],[1.9,.3,.6],{fill:mix(P.paper,P.c3,.4),a:sa2,shadow:false});
        lab([sp[0],.2,sp[2]+1.35],'hot spare',{dy:14,b:1,c:P.good,a:sa2})}}
    // labels for the parts, step 1
    if(k===0){lab([NX[0]-1.3,.45,ZG],'GPUs: weights + optimiser',{al:'right',dx:-6,c:P.acc,grp:'part'});lab([NX[0]-1.3,.35,ZM],'host CPU memory',{al:'right',dx:-6,c:P.c3,grp:'part'})}
    // flows
    const fl=(pts,c,o)=>R.flow(pts,Object.assign({c,r:.08,speed:2.2},o||{}));
    const upG=n=>[NX[n],.7,ZG],upM=(n,j)=>{const s=slot(n,j);return [s[0],s[1]+.2,s[2]]};
    if(k===1){NX.forEach((x,n)=>R.flowArc(upG(n),[lerp(-1.2,1.2,n/3),1.3,ZS+.6],1.2,{c:P.bad,a:e,r:.08,speed:2.4}));
      lab([0,2.4,-1.8],'every GPU waits: 1.81 s here, 148.8 s for a 7B model',{b:1,c:P.bad,a:e,wide:1})}
    if(k===2){const cp=Math.min(1,e*2.5);NX.forEach((x,n)=>{fl([upG(n),[NX[n]-.42,.75,0],upM(n,0)],P.c6,{a:cp*(e<.5?1:.4),n:4,speed:1.4});
        R.flowArc(upM(n,0),[lerp(-1.2,1.2,n/3),1.3,ZS+.6],1,{c:P.c5,a:e,r:.06,n:9,speed:1.2})});
      lab([0,2.2,-1.8],'copy to host memory: 78 ms here, then a background write',{b:1,c:P.c6,a:e,wide:1})}
    if(k===3){NX.forEach((x,n)=>{fl([upG(n),[NX[n]-.42,.75,0],upM(n,0)],P.c6,{a:e,n:4,speed:1.4});
        const m=(n+1)%4;R.flowArc(upM(n,0),upM(m,1),m===0?2.2:.8,{c:P.c4,a:e,r:.07,n:m===0?16:7,speed:2})});
      lab([0,2.6,0],'own copy + a peer\'s copy: 0.01 to 0.04 s per step',{b:1,c:P.c4,a:e,wide:1})}
    if(k===4)lab([NX[FAIL],.9,0],'node 3 lost',{dy:-14,b:1,c:P.bad,a:e});
    if(k===5){const tgt=[NX[FAIL],.75,ZG];R.flowArc(upM(PEER,1),tgt,.9,{c:P.c4,a:e,r:.09,n:8,speed:2});
      R.flowArc([0,1.3,ZS+.6],tgt,1.4,{c:P.c5,a:e*.3,r:.05,n:5,speed:.5});
      lab([(NX[FAIL]+NX[PEER])/2,1.4,0],'from node 4\'s memory: under '+FT_CK.L_mem,{dy:-8,b:1,c:P.c4,a:e});
      lab([NX[FAIL]-1.6,1.5,-2.3],'from storage: '+FT_CK.L_base,{al:'right',c:P.c5,a:e*.8,wide:1})}
    if(k===6){const tgt=[NX[FAIL],.75,ZG];R.flowArc([0,1.3,ZS+.6],tgt,1.4,{c:P.c5,a:e,r:.08,n:12,speed:1.4});
      lab([NX[PEER],.9,0],'node 4 lost too',{dy:-14,b:1,c:P.bad,a:e});lab([-1.8,2,-2],'both copies gone: read storage',{b:1,c:P.c5,a:e,wide:1})}
    if(k===7){NX.forEach((x,n)=>{if(n===FAIL)return;R.flowArc(upG(n),[lerp(-1.2,1.2,n/3),1.3,ZS+.6],1.1,{c:P.good,a:e,r:.08,speed:2.4})});
      lab([0,2.4,-1.8],'survivors save on the spot: one minibatch replayed',{b:1,c:P.good,a:e,wide:1})}
  }
  const full={cam:[.18,.7],bounds:[[-6.2,0,-4.8],[6.2,2.2,2.4]]};
  const st=S3.stage({id:'stg-ck',list:'sx-ck',fig:'Fig. 1 · one save and one restore, four strategies',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5200,draw,
    view:k=>k===4||k===5?{cam:[.35,.62],bounds:[[-.4,0,-2.4],[6.2,1.8,3.6]]}:k===3?{cam:[.15,.75],bounds:[[-6.2,0,-1.3],[6.2,1.6,1.7]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,150]});
  (window.FTSTG=window.FTSTG||{})['stg-ck']=st;
})();
