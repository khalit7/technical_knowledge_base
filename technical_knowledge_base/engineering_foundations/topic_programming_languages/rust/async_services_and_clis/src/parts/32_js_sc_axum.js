// ---- Scene, Fig. 4 (axum section): one request through tokserve's tower layers, router, extractor and handler (renderer v2, 2026-11-07) ----
// The layers are upright glass frames, outermost (TraceLayer, added last) largest; the request flows in along the near lane and the
// response flows back along the far lane from wherever it was answered. Steps 2 to 7 are six recorded curl -i requests (RS_DATA.svc,
// generated from src/rs/out/svc_*.txt): the status drawn is the recorded one.
(function(){
  if(!document.getElementById('stg-axum')||!window.S3||!window.RS_DATA)return;const {lerp,mix}=S3,SV=RS_DATA.svc;
  const CX=-4.3,ZI=.28,ZO=-.28,Y=.55;
  // the parts in the request's path: x, frame height and depth (z), label, colour key
  const PARTS=[['trace',-2.7,2.0,2.3,'TraceLayer','trace'],['timeout',-1.7,1.72,1.95,'TimeoutLayer','timeout'],['limit',-.7,1.44,1.6,'RequestBodyLimitLayer','limit'],['router',.45,0,0,'Router','router'],['json',1.6,1.0,1.1,'Json<CountReq>','Json'],['handler',2.9,0,0,'count()','count()']];
  const X=Object.fromEntries(PARTS.map(p=>[p[0],p[1]]));
  // per step: where the request is answered, by whom, and which recording
  const STEPS=[null,['handler','svc_count'],['limit','svc_toolarge'],['json','svc_missing'],['json','svc_ctype'],['handler','svc_empty'],['timeout','svc_timeout']];
  function draw(R,k,e){const P=R.P,S=STEPS[k],stop=S&&S[0],rec=S&&SV[S[1]],ok=rec&&/^2/.test(rec.status),col=ok?P.good:P.bad;
    R.grid(-5,4,-1.8,1.8,.5);
    const hot=id=>!S||id===stop||(k===6&&id==='handler');
    const reach=S?X[stop]:X.handler;   // how far in the request gets
    const narrow=R.W<520;PARTS.forEach(([id,x,h,d,long,short],i)=>{const name=narrow?short:long;const passed=!S||x<=reach+1e-6,a=S?(hot(id)?1:passed?.55:.2):1,c=[P.c1,P.c5,P.c4,P.ink,P.q,P.ink][i];
      if(h){R.glass([x,0,-d/2],[0,0,d],[0,h,0],{c,a,nu:4,nv:4,th:.04});
        if(S&&id===stop)R.glow([x,Y,0],.9,{c:col,a:.85*e});
        R.label([x,h,0],name,{fs:12,mono:true,b:1,c,dy:-10,a:Math.max(.4,a)})}
      else{const killed=k===6&&id==='handler';R.box([x,0,0],[id==='router'?.7:1.05,.75,1.0],{fill:killed?mix(P.paper,P.bad,.25):mix(P.paper,id==='router'?P.c6:P.c3,.25),a:killed?lerp(1,.35,e):a});
        R.label([x,.75,0],name,{fs:12,mono:true,b:1,c:id==='router'?P.c6:P.c3,dy:-10,a:Math.max(.4,a)});
        if(S&&id===stop&&k!==6)R.glow([x,Y+.2,0],.9,{c:col,a:.85*e});
        if(killed)R.label([x,.75,0],'future dropped',{fs:12,b:1,c:P.bad,dy:-26,a:e})}});
    // the client
    R.box([CX,0,0],[.8,.6,.9],{fill:mix(P.paper,P.ink,.08)});R.label([CX,0,.45],'curl',{fs:12.5,mono:true,b:1,dy:12});
    if(!S){R.label([-.2,0,1.25],'request in, response out: every frame twice',{fs:12,c:P.mute,dy:10,wide:1});
      R.flow([[CX+.4,Y,ZI],[X.handler-.55,Y,ZI]],{c:P.acc,a:.55,r:.05,speed:1.4});R.flow([[X.handler-.55,Y,ZO],[CX+.4,Y,ZO]],{c:P.good,a:.55,r:.05,speed:1.4});return}
    // the request flows in to where it is answered (for the timeout: on to the handler, which was running), the response flows back from the answerer
    const inTo=k===6?X.handler-.55:reach-(stop==='handler'?.55:stop==='router'?.4:.05),outFrom=stop==='handler'?X.handler-.55:reach-.05;
    const t1=Math.min(1,e*1.8),t2=Math.max(0,e*1.8-.8);
    R.flow([[CX+.4,Y,ZI],[lerp(CX+.4,inTo,t1),Y,ZI]],{c:P.acc,a:.9,r:.06,speed:1.5});
    if(t2>0)R.flow([[outFrom,Y,ZO],[lerp(outFrom,CX+.4,Math.min(1,t2)),Y,ZO]],{c:col,a:.9,r:.06,speed:1.5});
    if(e>.75){const a=Math.min(1,(e-.75)*4);R.label(narrow?[CX,0,.45]:[CX,.6,0],rec.status,{fs:13,b:1,mono:true,c:col,dy:narrow?30:-12,a,al:narrow?'left':'center',dx:narrow?-20:0});if(rec.body)R.label([CX,.6,0],rec.body.length>34?rec.body.slice(0,32)+'…':rec.body,{fs:12,mono:true,c:P.mute,dy:-30,a,wide:1})}
  }
  const full={cam:[.42,.42],bounds:[[-4.8,0,-1.3],[3.5,2.05,1.3]]};
  S3.stage({id:'stg-axum',list:'sx-axum',fig:'Fig. 4 · six recorded requests to tokserve',cam:full.cam,bounds:full.bounds,aspect:.55,dur:2200,hold:4600,draw,
    margin:w=>w<520?[16,8,14,8]:[28,16,18,16]});
})();
