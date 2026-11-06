// ---- Scene: Fig. 2, self-hosted Langfuse 4.53.0 as run here (renderer v2): the six containers of its Docker Compose file, one batch of
// spans through them, and their measured memory at rest (FOBS.stack.containers) drawn as height at step 5. ----
(function(){
  if(!document.getElementById('stg-lf'))return;const {mix}=S3;
  const M=window.FOBS.stack.containers,gib=s=>{const m=String(s).match(/([\d.]+)\s*(GiB|MiB)/);return m?(+m[1])/(m[2]==='MiB'?1024:1):0};
  const ZF=.85,ZB=-1.05,W=1.15;
  // [key, x, z, title, what it holds, colour key, memory key]
  const C=[['app',-3.7,ZF,'your app or collector','OTLP + Basic auth','acc',null],['web',-1.6,ZF,'langfuse-web','UI, API, /api/public/otel','c1','langfuse-web'],
    ['redis',.5,ZF,'Redis 7','queue','c6','redis 7'],['worker',2.6,ZF,'langfuse-worker','ingests, evaluates','c1','langfuse-worker'],
    ['pg',-.9,ZB,'Postgres 17','users, prompts, datasets','c3','postgres 17'],['s3',1.2,ZB,'MinIO','raw events (S3)','c5','minio'],['ch',3.3,ZB,'ClickHouse 25.12','observations, scores','c4','clickhouse 25.12']];
  const by={};C.forEach(c=>by[c[0]]=c);
  // which containers each step is about
  const ACT=[['app','web'],['web','redis','worker'],['worker','ch'],['web','pg','s3'],null,['ch','web','app']];
  const top=(k,h)=>[by[k][1],h,by[k][2]];
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6),act=ACT[k];R.grid(-5,4.4,-2.2,2,.5);
    const H={};C.forEach(c=>{const mem=c[6]?gib(M[c[6]]):0,h0=c[0]==='app'?.35:.55,h1=c[0]==='app'?.35:.12+mem*1.05;H[c[0]]=k===4?h0+(h1-h0)*e:k>4?h1:h0});
    C.forEach(([key,x,z,t,sub,ck,mk])=>{const on=!act||act.includes(key),a=on?1:.22,cl=P[ck];
      R.box([x,0,z],[W,H[key],W*.8],{fill:mix(P.paper,cl,on?.42:.18),a,lw:.8});
      R.label([x,H[key],z],t,{fs:13,b:1,c:mix(P.ink,cl,.35),dy:-12,a:on?1:(k===0||k===2?0:.35)});
      if(k===4&&mk)R.label([x,H[key],z],M[mk],{mono:true,fs:12.5,b:1,c:P.ink,dy:-30,a:fa});
      else if(on&&!nar)R.label([x,0,z+W*.4],sub,{fs:12,c:P.mute,dy:14,a:fa,wide:1})});
    const f=(a,b,c,o)=>R.flow([top(a,Math.min(H[a],H[b])*.55),top(b,Math.min(H[a],H[b])*.55)],Object.assign({c,a:fa,r:.07,speed:1.2,n:6},o||{}));
    if(k===0)f('app','web',P.c1);
    if(k===1){f('web','redis',P.c1);f('redis','worker',P.c1)}
    if(k===2){R.flowArc([by.worker[1],.6,by.worker[2]-.35],[by.ch[1],.6,by.ch[2]+.35],.25,{c:P.c4,a:fa,r:.07,n:6});
      R.glass([by.ch[1]-.5,H.ch+.04,by.ch[2]],[1,0,0],[0,.9,0],{c:P.c4,a:e,nu:8,nv:6});
      if(!nar)R.label([by.ch[1]+.55,H.ch+.5,by.ch[2]],'one wide table',{al:'left',dx:8,fs:12.5,c:P.c4,a:e})}
    if(k===3){R.flowArc([by.web[1],.4,by.web[2]-.35],[by.pg[1],.4,by.pg[2]+.35],.2,{c:P.c3,a:fa,r:.065,n:5});
      R.flowArc([by.web[1]+.3,.45,by.web[2]-.35],[by.s3[1]-.2,.4,by.s3[2]+.35],.3,{c:P.c5,a:fa,r:.065,n:6})}
    if(k===4&&!nar)R.label([-3.7,0,ZB],window.FOBS.stack.ram_gib+' GiB at rest in all',{fs:13.5,b:1,c:P.ink,a:fa});
    if(k===5){R.flowArc([by.ch[1]-.3,.6,by.ch[2]+.35],[by.web[1]+.3,.6,by.web[2]-.35],.5,{c:P.c4,a:fa,r:.07,n:7,speed:1.1});
      R.flow([top('web',.45),top('app',.2)],{c:P.c4,a:fa,r:.07,n:5});
      R.label([by.web[1],H.web,by.web[2]],'v2/observations, v3/scores: work',{mono:true,fs:12,b:1,c:P.good,dy:-30,a:fa});
      R.label([by.app[1],H.app,by.app[2]],'GET /api/public/traces: 404',{mono:true,fs:12,b:1,c:P.bad,dy:-30,a:fa})}
  }
  S3.stage({id:'stg-lf',list:'sx-lf',fig:'Fig. 2 · self-hosted Langfuse, as run here',cam:[.32,.72],bounds:[[-4.4,0,-1.6],[3.9,1.5,1.4]],aspect:.62,dur:1300,hold:4800,draw,
    view:k=>k===0?{cam:[.25,.6],bounds:[[-4.4,0,-.2],[-.9,1,1.4]]}:k===2?{cam:[.45,.62],bounds:[[1.6,0,-1.6],[4,1.6,1.4]]}:null});
})();
