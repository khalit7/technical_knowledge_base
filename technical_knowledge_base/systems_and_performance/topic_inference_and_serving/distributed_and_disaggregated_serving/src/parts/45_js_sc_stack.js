// ---- Scene, section 8 (Fig. 8): the serving-layer projects stacked by how far above the GPUs they work. Schematic: what each layer does is
// from each project's documentation as section 8 cites it (read 2026-10-09, 10 and 26); nothing here is measured or drawn to scale. ----
(function(){
  if(!document.getElementById('stg-stack')||!window.DDS)return;const {mix}=S3,{vis,gpu,lab}=DDS;
  const EX=[-3,0,3],EW=2.7;
  function draw(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-5.5,5.5,-1.6,3.4,.5);
    for(let g=0;g<9;g++)gpu(R,[-4+g,0,0],[.82,.14,.82],{die:false});
    lab(R,[-4.45,0,0],'GPUs',{al:'right',dx:-8,fs:12,c:P.mute,wide:1});
    // the engines; under llm-d and Ray Serve LLM they are all vLLM
    const vl=v(q=>q>=3),dimE=g=>k===1&&g<2?.35:1;
    EX.forEach((x,g)=>{R.box([x,.14,0],[EW,.32,.72],{fill:mix(P.paper,P.c1,.3),a:dimE(g),lw:.8,shadow:false});
      const nm=['vLLM','SGLang','TensorRT-LLM'][g];if(1-vl>0)lab(R,[x,.46,0],nm,{dy:-10,b:1,fs:12.5,c:P.c1,a:(1-vl)*dimE(g)});if(vl>0)lab(R,[x,.46,0],'vLLM',{dy:-10,b:1,fs:12.5,c:P.c1,a:vl})});
    const req=(to,c,a)=>R.flowArc([to[0],2.6,2.6],to,.15,{c:c||P.acc,a,r:.07,n:6,speed:1.4});
    let a=v(q=>q===0);
    if(a>0){EX.forEach(x=>R.flowArc([x,2.4,2.4],[x,.5,.3],.1,{c:P.acc,a:a*.8,r:.06,n:4,speed:1.2}));}
    // Triton: one endpoint, many framework back ends, around one engine
    a=v(q=>q===1);
    if(a>0){R.glass([1.4,1.2,-.6],[3.2,0,0],[0,0,2.2],{c:P.c5,a,nu:6,nv:4});lab(R,[1.4,1.2,-.6],'Triton Inference Server',{al:'left',dy:-10,b:1,c:P.c5,a});
      R.box([3.6,.14,1.1],[1.4,.32,.6],{fill:mix(P.paper,P.c5,.3),a,lw:.8,shadow:false});lab(R,[3.6,.46,1.1],'PyTorch · ONNX · ...',{dy:-10,fs:12,a,wide:1});
      req([3,1.25,.4],P.acc,a);R.flowArc([3,1.2,.3],[3,.46,.1],.05,{c:P.acc,a,r:.05,n:3,speed:1});}
    // Dynamo: front end, router, planner, KV block manager across any engine; NIXL moves caches between workers
    a=v(q=>q===2);
    if(a>0){R.glass([-4.6,1.3,-.7],[9.2,0,0],[0,0,1.6],{c:P.c3,a,nu:12,nv:2});lab(R,[-4.6,1.3,-.7],'Dynamo',{al:'left',dy:-12,b:1,fs:13,c:P.c3,a});
      [['front end',-3.3],['KV-aware router',-1.1],['planner',1.1],['KV block manager',3.3]].forEach(([t,x])=>{R.box([x,1.33,.1],[1.9,.22,.6],{fill:mix(P.paper,P.c3,.3),a,shadow:false,lw:.7});lab(R,[x,1.55,.1],t,{dy:-10,b:1,fs:12.5,a,wide:1})});
      req([-3.3,1.55,.2],P.acc,a);R.flowArc([-1.1,1.3,.1],[0,.5,.1],.15,{c:P.acc,a,r:.06,n:4,speed:1.2});
      R.flowArc([-2.3,.35,-.3],[2.3,.35,-.3],.35,{c:P.c4,a,r:.075,n:8,speed:1.5});lab(R,[0,.75,-.3],'NIXL: KV cache, prefill to decode',{dy:-6,fs:12,c:P.c4,a,wide:1});}
    // llm-d on Kubernetes, KServe above it
    a=v(q=>q===3);
    if(a>0){R.glass([-4.6,.95,-.7],[9.2,0,0],[0,0,1.6],{c:P.c6,a:a*.8,nu:12,nv:2});lab(R,[4.6,.95,.9],'Kubernetes · vLLM pods',{al:'right',dy:18,b:1,c:P.c6,a});
      R.box([0,.98,.1],[2.6,.24,.6],{fill:mix(P.paper,P.c6,.3),a,shadow:false,lw:.7});lab(R,[0,1.22,.1],'llm-d Router',{dy:-10,b:1,fs:12.5,a});
      lab(R,[1.4,1.1,.1],'prefix · queue · KV use · latency',{al:'left',dx:10,fs:12,c:P.mute,a,wide:1});
      R.glass([-2.4,1.8,-.5],[4.8,0,0],[0,0,1.2],{c:P.c5,a:a*.8,nu:6,nv:2});lab(R,[-2.4,1.8,-.5],'KServe · LLMInferenceService',{al:'left',dy:-10,b:1,c:P.c5,a});
      req([0,1.85,.3],P.acc,a);R.flowArc([0,1.8,.1],[0,1.22,.1],.05,{c:P.acc,a,r:.05,n:3,speed:1});R.flowArc([0,.98,.1],[3,.46,.1],.2,{c:P.acc,a,r:.06,n:4,speed:1.2});}
    // Ray Serve LLM on a Ray cluster
    a=v(q=>q===4);
    if(a>0){R.glass([-4.6,.95,-.7],[9.2,0,0],[0,0,2.4],{c:P.c4,a:a*.7,nu:12,nv:3});lab(R,[4.6,.95,1.7],'Ray cluster',{al:'right',dy:18,b:1,c:P.c4,a});
      R.box([-1.5,.98,.1],[2.4,.24,.6],{fill:mix(P.paper,P.c4,.3),a,shadow:false,lw:.7});lab(R,[-1.5,1.22,.1],'Serve LLM router',{dy:-10,b:1,fs:12.5,a});
      R.box([3,.98,-.35],[2.2,.24,.6],{fill:mix(P.paper,P.mute,.25),a,shadow:false,lw:.7});lab(R,[3,1.22,-.35],'training · data jobs',{dy:-10,fs:12.5,c:P.mute,a});
      req([-1.5,1.25,.3],P.acc,a);R.flowArc([-1.5,.98,.1],[-3,.46,.1],.15,{c:P.acc,a,r:.06,n:4,speed:1.2});}
  }
  const st=S3.stage({id:'stg-stack',list:'sx-stack',fig:'Fig. 8 · the serving layer, stacked above the engines',cam:[.1,.62],bounds:[[-5,0,-.9],[5,1.6,2.4]],aspect:.36,dur:1500,hold:5200,draw,view:k=>DDP('stg-stack',null,[.1,.62]),margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.DDSTG=window.DDSTG||{})['stg-stack']=st;
})();
