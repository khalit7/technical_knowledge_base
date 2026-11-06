// ---- Scene: Fig. 8, Muse's published boundary (renderer v2). Structure from Meta's safety post, not data: one VM per person holding the
// agent and the person's data, the harness in an isolated cell that carries surrogate tokens, Sentinel at the network edge swapping in the
// real credential, the approval dialog in the app (outside the conversation), and the browsing sub-agent reading an accessibility tree.
// Steps: ol#sx-muse. ----
(function(){
  if(!document.getElementById('stg-muse'))return;const {mix}=S3;
  const HX=-1.7,HZ=.45,DZ=-.95,SX=.75,NX=3.0,APP=[-.5,0,2.4],BR=[-.2,0,-.95];
  const NET=[['mail',-1.1],['web',0],['payments',1.1]];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-3.4,4.0,-2.0,3.0,.5);
    const f=g=>({vm:k===0,har:k<=1,data:k===0,sen:k===2||k===3,net:k===2||k===4,app:k===3,br:k===4}[g]?1:.25);
    // the VM: a floor that holds everything Muse runs for one person
    R.box([-.9,0,0],[3.7,.05,3.0],{fill:mix(P.paper,P.soft,.7),a:k===0?1:.6,shadow:false});
    if(k===0)R.label([-2.7,.05,1.5],'Muse Secure VM · one per person',{fs:13,b:1,c:P.ink,al:'left',dy:16});
    // the harness in its own cell (glass walls), and the person's data
    const ha=f('har');R.box([HX,.05,HZ],[1.0,.75,1.0],{fill:mix(P.paper,P.c2,.3),a:ha,fa:.55});
    R.glass([HX-.55,.05,HZ-.55],[1.1,0,0],[0,.9,0],{c:P.c2,a:ha*.8,nu:3,nv:3});R.glass([HX-.55,.05,HZ+.55],[1.1,0,0],[0,.9,0],{c:P.c2,a:ha*.8,nu:3,nv:3});
    if(k<=1)R.label([HX,.95,HZ],'agent harness · isolated cell',{fs:12.5,b:1,c:P.c2,dy:-8,grp:'vm'});
    const da=f('data');for(let i=0;i<5;i++)R.box([HX,.05+i*.09,DZ],[.95,.08,.7],{fill:mix(P.paper,P.c4,.15+.08*i),a:da,shadow:false,lw:.6});
    if(k===0)R.label([HX,.5,DZ],"the person's data",{fs:12.5,c:P.c4,b:1,dy:-8,grp:'vm'});
    // Sentinel at the edge
    const sa=f('sen');R.box([SX,.05,0],[.6,.9,1.2],{fill:mix(P.paper,P.c3,.45),a:sa});if(k>=2&&k<=3)R.label([SX,.95,0],'Sentinel',{fs:13,b:1,c:P.c3,dy:-8});
    // the internet
    NET.forEach(([t,z])=>{R.box([NX,0,z],[.6,.4,.6],{fill:mix(P.paper,P.c6,.3),a:f('net')});if(k===2||k===4)R.label([NX+.35,.25,z],t,{fs:12.5,c:P.ink,al:'left',dx:6})});
    // the app on the person's phone, outside the VM and the conversation
    R.box(APP,[.4,.75,.12],{fill:mix(P.paper,P.c5,.35),a:f('app')});if(k===3)R.label([APP[0]+.3,.6,APP[2]],'your app · approval dialog',{fs:12.5,b:1,c:mix(P.ink,P.c5,.4),al:'left',dx:6});
    // flows
    const out=[[HX+.5,.45,HZ],[SX-.32,.5,.1]];
    if(k===1){R.flow(out,{c:P.mute,r:.07,n:7,a:e});R.label([(HX+SX)/2,.6,HZ],'surrogate tokens only',{fs:12.5,b:1,c:P.mute,dy:-12,a:e})}
    if(k===2){R.flow(out,{c:P.mute,r:.07,n:7});NET.forEach(([t,z])=>R.flow([[SX+.32,.5,0],[NX-.32,.25,z]],{c:P.good,r:.07,n:5,a:e}));
      R.label([(SX+NX)/2,.05,1.5],nar?'real credential':'real credential, swapped in at the edge',{fs:12.5,b:1,c:P.good,dy:18,a:e})}
    if(k===3){R.flowArc([SX,.9,.4],[APP[0],.7,APP[2]],.5,{c:P.c5,r:.07,n:6,a:e});R.flowArc([APP[0]+.1,.6,APP[2]],[SX+.1,.7,.5],.25,{c:P.good,r:.06,n:4,a:e,speed:.8});
      R.label([HX,.5,HZ],'the chat cannot say yes',{fs:12.5,b:1,c:P.ink,dy:24,a:e,wide:1})}
    if(k===4){R.box(BR,[.6,.45,.6],{fill:mix(P.paper,P.c1,.35),a:e});R.label([BR[0]-.32,.3,BR[2]],'browsing sub-agent',{fs:12.5,b:1,c:P.c1,al:'right',dx:-8,a:e});
      for(let i=0;i<4;i++)R.box([BR[0]+.85,.05+i*.12,BR[2]+.05*i],[.5-.08*i,.05,.3],{fill:mix(P.paper,P.c1,.25),a:e,shadow:false,lw:.6});
      R.flowArc([NX,.4,0],[BR[0]+.85,.5,BR[2]],.4,{c:P.c1,r:.06,n:6,a:e});R.flow([[BR[0]+.6,.3,BR[2]],[BR[0]+.3,.3,BR[2]]],{c:P.c1,r:.05,n:3,a:e});
      R.label([BR[0]+.85,.05,BR[2]+.3],'accessibility tree · no JavaScript',{fs:12.5,c:P.c1,dy:18,a:e,wide:1})}
  }
  const full={cam:[.4,.66],bounds:[[-3.2,0,-1.6],[3.8,1.1,2.6]]};
  S3.stage({id:'stg-muse',list:'sx-muse',fig:'Fig. 8 · Muse, as Meta describes it (structure, not data)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:5000,draw,
    view:k=>k<=1?{cam:[.45,.6],bounds:[[-3.2,0,-1.6],[1.2,1.1,1.8]]}:k===3?{cam:[.35,.6],bounds:[[-2.4,0,-.8],[1.6,1.1,2.8]]}:full,
    margin:w=>w<520?[16,10,14,10]:[24,16,16,16]});
})();
