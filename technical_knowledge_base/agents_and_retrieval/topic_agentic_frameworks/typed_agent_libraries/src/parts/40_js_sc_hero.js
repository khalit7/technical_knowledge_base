// ---- Scene: Fig. 1, one run of a typed agent library (renderer v2). Your types become schemas (glass plates), the result schema rides in one of
// three slots of the request (tool, native field, prompt text), the local server drops the native field, the reply is validated with your deps,
// a failure goes back as a retry prompt, and the valid results per slot are the page's recorded counts (FT.so, local model, 6 October 2026). ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const F=window.FT,by=r=>F.so.filter(x=>x.route===r),V=a=>a.filter(x=>x.valid).length;
  const nat=by('pai_native').concat(by('oai'),by('adk')),tool=by('pai_tool'),pr=by('pai_prompted');
  // the three slots, front to back: [name, where in the request, runs, valid]
  const SL=[['tool-forced','tools[ ]: final_result',tool.length,V(tool),-1.35],['native','response_format',nat.length,V(nat),0],['prompted','system text',pr.length,V(pr),1.35]];
  const PX=-4.6,RQ=-2.7,SV=-1.0,MD=.8,VG=2.5,RS=4.4,YF=.42;
  function draw(R,k,e){const P=R.P,nar=R.W<520,S=P.c2;R.grid(-6.2,6.2,-2.8,2.8,.5);
    const dimL=k>=3?.35:1; // once the reply is being checked, the left half recedes
    // 1. your Python and the two schemas the library derives from it
    R.box([PX,0,0],[1.25,.62,1.7],{fill:mix(P.paper,P.c1,.22),a:dimL});
    R.label([PX,.62,0],'your Python',{fs:13.5,b:1,c:P.c1,dy:-12,a:Math.max(.5,dimL)});
    if(k===0){R.label([PX,0,.85],'def edit_file(path: str, ...)',{mono:true,fs:12,c:P.mute,dy:16,wide:1});R.label([PX,0,.85],'class Triage(BaseModel)',{mono:true,fs:12,c:P.mute,dy:32,wide:1})}
    const pa=k===0?e:k<=2?1:.3;
    [['edit_file schema',-.55],['Triage schema',.55]].forEach(([t,z],i)=>{R.glass([PX+.95,.08,z-.4],[0,0,.8],[0,.95,0],{c:i?S:P.c1,a:pa,nu:4,nv:5});
      if(k<=1)R.label([PX+.95,1.05,z],t,{fs:12.5,b:1,c:i?S:P.c1,dy:-8,a:pa})});
    if(k===0){R.flowArc([PX+.3,.5,-.2],[PX+.95,.6,-.55],.25,{c:P.c1,r:.05,n:5,a:e});R.flowArc([PX+.3,.5,.2],[PX+.95,.6,.55],.25,{c:S,r:.05,n:5,a:e})}
    // 2. the request: one slot per route, the schema rides in one of them
    const ra=k>=1?(k===1?e:1):0;
    SL.forEach(([nm,where,n,v,z],i)=>{const dropped=i===1&&k>=2,a=ra*(dropped?.45:1)*(k>=3?.5:1);
      R.glass([RQ,.06,z-.42],[0,0,.84],[0,.72,0],{c:dropped?P.bad:S,a,nu:3,nv:3});
      if(k===1){R.label([RQ,.78,z],nm,{fs:12.5,b:1,c:S,dy:-9,a});if(!nar)R.label([RQ+.1,.35,z+.45],where,{mono:true,fs:12,c:P.mute,al:'left',dx:6,a})}
      if(k===2&&i!==1)R.label([RQ,.78,z],nm,{fs:12.5,b:1,c:dropped?P.bad:S,dy:-9,a:Math.max(.5,a)});
      if(k===1)R.flowArc([PX+1.0,.55,i===0?-.55:.55],[RQ,.4,z],.35,{c:S,r:.06,n:7,a:e})});
    // 3. the server: renders tools and text into the prompt, never reads response_format
    R.box([SV,0,0],[.32,1.0,3.9],{fill:mix(P.paper,P.ink,.06),a:k>=2?(k>=3?.4:1):.45});
    R.label([SV,0,1.95],'server: mlx-lm 0.32.0',{fs:12.5,b:1,c:P.ink,dy:16,a:k>=2&&k<3?1:.55});
    if(k===2){SL.forEach(([,,,,z],i)=>{if(i===1){R.flow([[RQ+.1,YF,z],[SV-.2,YF,z]],{c:P.bad,r:.06,n:4});R.label([SV,1.0,0],'never read: model sees no schema',{fs:12.5,b:1,c:P.bad,dy:-10,a:e})}
        else{R.flow([[RQ+.1,YF,z],[SV+.2,YF,z],[MD-.6,YF,z*.4]],{c:S,r:.06,n:9,a:e})}})}
    // the model
    R.box([MD,0,0],[1.1,.8,1.5],{fill:mix(P.paper,P.c4,.25),a:k>=2?1:.4});if(k!==4)R.label([MD,.8,0],'model',{fs:13.5,b:1,c:P.c4,dy:-12,a:k>=2?1:.5});else R.label([MD,0,.75],'model',{fs:13.5,b:1,c:P.c4,dy:16});
    // 4. the reply meets the checks: types, then your validator with ctx.deps
    const va=k>=3?(k===3?e:1):.15;
    R.glass([VG,.06,-.85],[0,0,1.7],[0,.95,0],{c:P.acc,a:va,nu:5,nv:4});
    if(k>=3)R.label([VG,1.02,0],'validate',{fs:13.5,b:1,c:P.acc,dy:-10,a:va});
    R.box([VG,0,-2.05],[.8,.4,.55],{fill:mix(P.paper,P.good,.3),a:k>=3?va:0});if(k>=3)R.label([VG,.4,-2.05],'ctx.deps',{mono:true,fs:12,c:P.good,dy:-10,a:va});
    if(k===3){R.flow([[MD+.6,YF,0],[VG-.1,YF,0]],{c:P.c4,r:.06,n:6});R.flowArc([VG,.4,-1.8],[VG,.5,-.8],.3,{c:P.good,r:.05,n:5});R.label([VG,0,.85],'Pydantic types, then your validator',{fs:12,c:P.mute,dy:16,wide:1})}
    // 5. a failure goes back to the model as a message
    if(k===4){R.flowArc([VG-.1,.7,.3],[MD+.4,.8,.3],.75,{c:P.bad,r:.065,n:9});
      R.label([(VG+MD)/2,2.0,.3],'retry prompt: "Fix the errors and try again."',{fs:12.5,b:1,c:P.bad,a:e});R.label([(VG+MD)/2,2.0,.3],'budget: 1 retry by default',{fs:12,c:P.mute,dy:18,a:e});
      R.flow([[MD+.6,YF,0],[VG-.1,YF,0]],{c:P.c4,r:.05,n:4,a:.6})}
    // 6. what came out of each slot, from the recorded runs
    if(k===5){R.flow([[VG+.1,YF,0],[RS-.5,YF,0]],{c:P.good,r:.06,n:5});
      SL.forEach(([nm,,n,v,z],i)=>{const h=1.0*v/n,c=v?P.good:P.bad,x=RS-.8+i*.8,hh=Math.max(.04,h*e);R.box([x,0,.3],[.5,hh,.5],{fill:mix(P.paper,c,.55)});
        R.label([x,hh,.3],nm+': '+v+' of '+n,{fs:12.5,b:1,c,dy:-11,a:e,grp:'tally'})})}
  }
  const full={cam:[.45,.6],bounds:[[-5.3,0,-2.1],[5.4,1.2,2.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one run, and where the schema travels',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[22,30,14,16],
    // step 1 moves in close on your Python, step 2 on the request; steps 4 and 5 on the checks; 3 and 6 show the whole run
    view:k=>k===0?{cam:[.6,.5],bounds:[[-5.4,0,-1.6],[-2.9,1.3,1.6]]}:k===1?{cam:[.6,.55],bounds:[[-5.4,0,-2.1],[-1.2,1.3,2.1]]}:k===3||k===4?{cam:[.6,.55],bounds:[[0,0,-2.4],[3.4,1.8,1.4]]}:full});
})();
