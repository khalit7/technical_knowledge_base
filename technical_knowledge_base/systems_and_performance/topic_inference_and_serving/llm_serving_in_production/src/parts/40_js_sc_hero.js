// ---- Scene, the top of the page (Fig. 1): one request's path through a production LLM service, schematic (renderer v2).
// Client, gateway, router, three replicas (each an engine with its own KV cache, drawn as a glass plate on top), metrics, autoscaler and a
// fourth replica starting. Each step lights the box it is about, lets the rest recede, and streams dots along the path the request or the
// metrics take. No measured numbers: the step list says which section owns each box. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const ZR=[-2.15,-.7,.75],XR=1.5,NEWZ=2.2,XM=4.5,ZM=-.7,ZA=2.2;
  const CL=[-5.4,0,0],GW=[-3.5,0,0],RT=[-1.5,0,0];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-6.6,5.6,-3.2,3.2,.5);
    // focus per step: 0 client, 1 gateway, 2 router, 3 replicas, 4 metrics, 5 autoscaler and the new replica
    const F=[['cl'],['gw'],['rt'],['rp'],['rp','me'],['me','as','nw']][k],fa=id=>F.includes(id)?1:.3;
    const node=(c,s,col,id,name,sec)=>{const a=fa(id);R.box(c,s,{fill:mix(P.paper,P[col],F.includes(id)?.55:.25),a,lw:F.includes(id)?1.3:.8});
      lab([c[0],s[1],c[2]],name,{dy:-14,b:1,c:F.includes(id)?P[col]:P.mute,a:Math.max(.55,a)});
      if(sec)lab([c[0],0,c[2]+s[2]/2],sec,{dy:13,fs:12,mono:true,c:P.mute,a:Math.max(.5,a),wide:1})};
    node(CL,[.9,.55,.8],'c6','cl','Client','§1 · §8');
    node(GW,[.9,.45,.8],'c5','gw','Gateway','keys, limits');
    node(RT,[.9,.5,.8],'c1','rt','Router','§2');
    // replicas: an engine box with its KV cache as a glass plate on top; the request's conversation is cached on replica 1 (darker tint)
    ZR.forEach((z,i)=>{const a=fa('rp')*(k===2&&i!==0?.6:1);R.box([XR,0,z],[1.3,.5,.8],{fill:mix(P.paper,P.c3,F.includes('rp')?.5:.25),a,lw:.9});
      R.glass([XR-.6,.52,z-.35],[1.2,0,0],[0,0,.7],{c:P.c1,nu:6,nv:3,a:a*(i===0&&k>=2?1:.55)});
      if(i===0&&k>=2&&k<=3)R.box([XR-.3,.52,z],[.5,.05,.6],{fill:mix(P.paper,P.c1,.8),a,shadow:false});
      lab([XR+.7,.25,z],'replica '+(i+1),{al:'left',dx:6,c:F.includes('rp')?P.c3:P.mute,b:i===0,a:Math.max(.5,a),grp:'rep'})});
    if(k>=2&&k<=3)lab([XR-.3,.6,ZR[0]],'its prefix is cached here',{dy:-12,c:P.c1,b:1,a:k===2?e:1,wide:1});
    if(k===3)lab([XR-.65,0,ZR[2]+.4],'§4 cold start · §5 adapters · §6 schemas',{al:'right',dy:12,fs:12,mono:true,c:P.c3,a:e,wide:1});
    node([XM,0,ZM],[.9,.6,.8],'c4','me','Metrics','§7');
    node([XM,0,ZA],[.9,.5,.8],'c2','as','Autoscaler','§3');
    // the path of the request, step by step, as streams of dots
    const up=(p,h)=>[p[0],h,p[2]];
    if(k===0)R.flowArc(up(CL,.5),up(GW,.45),.35,{c:P.c6,r:.07,n:6,speed:1.4,a:e});
    if(k===1){R.flowArc(up(CL,.5),up(GW,.45),.35,{c:P.c6,r:.06,n:5,speed:1.4,a:.4});R.flowArc(up(GW,.45),up(RT,.5),.35,{c:P.c5,r:.07,n:6,speed:1.4,a:e})}
    if(k===2)R.flowArc(up(RT,.5),[XR,.55,ZR[0]],.5,{c:P.c1,r:.07,n:9,speed:1.5,a:e});
    if(k===3){R.flowArc([XR,.55,ZR[0]],up(CL,.55),1.1,{c:P.c3,r:.06,n:20,speed:1.8,a:e});lab(R.arcPt([XR,.55,ZR[0]],up(CL,.55),1.1,.5),'tokens stream back',{dy:-10,c:P.c3,b:1,a:e,wide:1})}
    if(k>=4)ZR.forEach(z=>R.flowArc([XR+.4,.5,z],[XM,.6,ZM],.4,{c:P.c4,r:.05,n:5,speed:1.2,a:k===4?e:.45}));
    if(k===4)lab([XM,0,ZM+.4],'queue · KV · TTFT · hits',{dy:30,c:P.c4,b:1,a:e,wide:1});
    if(k>=4)R.flowArc([XM,.6,ZM],[XM,.5,ZA],.35,{c:P.c4,r:.05,n:5,speed:1.2,a:k===4?e:.6});
    // the autoscaler starts a fourth replica: a glass shell that fills while it loads, serving only at the end of its cold start
    if(k===5){R.flowArc([XM,.5,ZA],[XR+.3,.5,NEWZ],.4,{c:P.c2,r:.06,n:6,speed:1.3,a:Math.min(1,e*2)});
      const fill=Math.max(0,Math.min(1,(e-.2)/.8));
      R.box([XR,0,NEWZ],[1.3,.5,.8],{fill:mix(P.paper,P.c3,.25),fa:.18,a:1,ec:P.c2,lw:1.2});
      if(fill>0)R.box([XR,0,NEWZ],[1.3,.5*fill,.8],{fill:mix(P.paper,P.c2,.45),a:.9,shadow:false,lw:.5});
      lab([XR+.7,.25,NEWZ],fill<1?'starting: weights, engine init':'serving',{al:'left',dx:6,c:P.c2,b:1,grp:'rep'})}
  }
  const full={cam:[.15,.66],bounds:[[-5.9,0,-2.6],[5.2,.55,2.7]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one request through the service, schematic',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:4800,draw,
    margin:w=>w<520?[22,10,14,10]:[26,70,20,18]});
  (window.PRSTG=window.PRSTG||{})['stg-hero']=st;
})();
