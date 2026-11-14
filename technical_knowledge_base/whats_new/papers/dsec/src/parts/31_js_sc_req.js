// ---- Scene (Fig. 1): the path of one sandbox request through DSec's components (§3.1 to §3.3, Figure 1), renderer v2 ----
// The components, what each holds and the order a request visits them are the paper's. Illustrative: the four nodes drawn (of about 160),
// the sandboxes already running on them (5, 2, 6 and 3), the three placement-engine instances and which k = 2 nodes are sampled.
(function(){
  if(!document.getElementById('stg-rq'))return;const {at,off,mix}=S3;
  let M='box';
  const SDK=[-6.2,0,.2],IAM=[-3.7,0,-1.0],PL=[-1.45,0,-1.0],WA=[-1.45,0,1.3],API=[.65,0,.1],FS=[3.95,0,-2.9];
  const NODES=[[2.7,0,-1.15],[5.2,0,-1.15],[2.7,0,1.15],[5.2,0,1.15]],LOAD=[5,2,6,3],SAMP=[0,3],WIN=3,FN=2,NS=[2.15,.12,1.8],CB=.34;
  window.DSEC_RQ={LOAD,SAMP,WIN}; // read by check_stages.mjs against the step list
  const edgeP=n=>[NODES[n][0]-.72,NS[1],NODES[n][2]];
  const cubeP=(n,i)=>{const c=NODES[n];return [c[0]-.12+(i%3)*.44,NS[1],c[2]-.42+Math.floor(i/3)*.6]};
  const NEW=cubeP(WIN,LOAD[WIN]);
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  const ON={box:[['sdk'],['sdk','iam'],['iam','pl','wa','nodes'],['pl','api','edge'],['api','edge','new'],['edge','new','fs'],['sdk','api','edge','new'],['edge','new']],
    fn:[['sdk'],['sdk','iam'],['iam','fn'],['fn']]};
  function draw(R,k,e){const P=R.P,on=new Set(ON[M][k]),A=id=>on.has(id)?1:.25,close=isClose(k),far=close?0:1; // far: labels of the services, hidden when the camera is in close on the nodes
    // a label whose anchor is outside the frame (a close or phone view) is dropped rather than clamped onto the edge
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    R.grid(-7.6,6.9,-3.7,2.7,.5);
    // the trusted side: a GPU server where training code calls libdsec
    R.box(SDK,[1.8,.5,1.3],{fill:mix(P.paper,P.c1,.22),a:A('sdk')});
    for(let i=0;i<4;i++)R.box([SDK[0]-.6+i*.4,.5,SDK[2]],[.28,.12,.95],{fill:mix(P.paper,P.c1,.45),a:A('sdk'),shadow:false,lw:.6});
    lab(top(SDK,.7),'GPU server · libdsec',{fs:12.5,b:on.has('sdk'),dy:-10,a:far*Math.max(.6,A('sdk'))});
    lab(SDK,'trusted',{fs:12,c:P.mute,dy:14,a:far*A('sdk')});
    // cluster services
    R.box(IAM,[1.1,.45,.85],{fill:mix(P.paper,P.c5,.28),a:A('iam')});lab(top(IAM,.45),'IAM',{fs:12.5,b:on.has('iam'),dy:-10,a:far*Math.max(.55,A('iam'))});
    const dimSvc=M==='fn'?.12:1;
    [-.45,0,.45].forEach(dz=>R.box([PL[0],0,PL[2]+dz],[.95,.32,.34],{fill:mix(P.paper,P.c2,.25),a:A('pl')*dimSvc}));
    lab(top(PL,.32),'placement engines',{fs:12.5,b:on.has('pl'),dy:-10,a:far*Math.max(.5,A('pl'))*dimSvc});
    R.box(WA,[.95,.32,.7],{fill:mix(P.paper,P.c6,.25),a:A('wa')*dimSvc});lab(WA,'watcher',{fs:12,dy:14,a:far*Math.max(.5,A('wa'))*dimSvc});
    R.box(API,[1.0,.55,1.5],{fill:mix(P.paper,P.c4,.22),a:A('api')*dimSvc});lab(top(API,.55),'apiserver',{fs:12.5,b:on.has('api'),dy:-10,a:far*Math.max(.5,A('api'))*dimSvc});
    // the CPU nodes, each with its edge and the sandboxes already running
    const nA=on.has('nodes')||on.has('edge')||on.has('new')||on.has('fn')||on.has('fs')?1:.45;
    NODES.forEach((c,n)=>{R.box(c,NS,{fill:P.paper,a:nA,dz:30});
      const eg=edgeP(n),eon=n===WIN&&on.has('edge');R.box(eg,[.42,.34,.5],{fill:eon?mix(P.paper,P.c3,.6):mix(P.paper,P.c3,.25),a:nA,shadow:false});
      if(eon)R.glow(top(eg,.4),.45,{c:P.c3,a:.7});
      for(let i=0;i<LOAD[n];i++){const fnc=M==='fn'&&n===FN;R.box(cubeP(n,i),[CB,CB,CB],{fill:fnc?mix(P.paper,P.c4,i===0&&k>=2?.7:.35):mix(P.paper,P.ink,.06),a:nA*(fnc?1:.75),shadow:false,lw:.6})}});
    lab(top(edgeP(WIN),.34),'edge',{fs:12,c:P.c3,b:1,dy:-10,al:'right',dx:-4,a:on.has('edge')?1:0});
    lab([NODES[2][0],0,NODES[2][2]+NS[2]/2],M==='fn'?'precreated FnCall containers':'CPU nodes (4 of about 160 drawn)',{fs:12,c:M==='fn'?P.c4:P.mute,dy:14,a:close&&M==='box'?0:Math.max(.6,nA)});
    // 3FS, the training cluster's filesystem, behind the nodes
    R.box(FS,[4.7,.3,.55],{fill:mix(P.paper,P.c6,.4),a:on.has('fs')?1:.3*dimSvc});lab(top([FS[0]+1.3,0,FS[2]],.3),'3FS (image data)',{fs:12,c:P.c6,b:on.has('fs'),dy:-10,a:on.has('fs')?1:.45*dimSvc});
    const cS=top(SDK,.62),cI=top(IAM,.5),cP=top(PL,.36),cW=top(WA,.36),cA=top(API,.6),cE=top(edgeP(WIN),.38),cN=top(NEW,CB+.05);
    if(M==='box'){
      if(k===0){R.ball(cS,.13,{c:P.c2});R.glow(cS,.45,{c:P.c2,a:.6});lab(cS,'create: backend, image, limits, lifetime, network',{fs:12,c:P.c2,dy:-22,al:'left',dx:-30,wide:1})}
      if(k===1){R.arc(cS,cI,.7,{c:P.c2,w:2,t:e,a:.8});R.flowArc(cS,cI,.7,{c:P.c2,a:e,r:.08,speed:1.6})}
      if(k===2){R.flowArc(cI,cP,.5,{c:P.c2,a:e,r:.08,speed:1.4});R.flowArc(cW,cP,.4,{c:P.c6,a:e*.9,r:.06,speed:1.2,n:5});lab(cW,'fleet snapshot',{fs:12,c:P.c6,dy:-16,a:e});
        SAMP.forEach(n=>{const c=NODES[n],win=n===WIN;R.glow([c[0],.2,c[2]],1.15,{c:win?P.c3:P.c2,a:e*(win?.55:.35)});
          lab([c[0]+.35,.5,c[2]],(win?'picked: ':'sampled: ')+LOAD[n]+' running',{fs:12.5,b:win,c:win?P.c3:P.c2,dy:-14,a:e})})}
      if(k===3){R.flowArc(cP,cA,.45,{c:P.c2,r:.08,speed:1.4});R.flowArc(cA,cE,.8,{c:P.c2,a:e,r:.08,speed:1.6})}
      const nb=k===4?e:k>=5&&k<7?1:k===7?1-e:0;
      if(nb>0){R.box(NEW,[CB,CB*Math.max(.05,k===4?e:1),CB],{fill:mix(P.paper,P.c2,.65),a:nb,shadow:false});R.glow(top(NEW,CB/2),.5,{c:P.c2,a:nb*.5})}
      if(k===4){R.flowArc(cE,cN,.25,{c:P.c3,a:e,r:.06,speed:1,n:4});lab(cN,'admitted: storage, eBPF rules, runtime',{fs:12,c:P.c3,dy:-18,al:'left',dx:8,a:e,wide:1})}
      if(k===5){R.flowArc(top(FS,.32),cN,.9,{c:P.c6,a:e,r:.05,n:4,speed:1.1});lab([FS[0]-1.6,0,FS[2]+.3],'only the blocks it reads',{fs:12,c:P.c6,dy:12,a:e,wide:1});
        lab(cN,'starts at once; writes stay on local disk',{fs:12,c:P.c2,dy:-18,al:'left',dx:8,a:e,wide:1})}
      if(k===6){const go=[cS,R.arcPt(cS,cA,.9,.5),cA,R.arcPt(cA,cE,.6,.5),cE,cN],back=go.slice().reverse().map(p=>[p[0],p[1]+.18,p[2]+.12]);
        R.flow(go,{c:P.c2,a:e,r:.07,speed:2});R.flow(back,{c:P.c1,a:e,r:.06,speed:2});
        lab(cN,'aether → chronus shell',{fs:12.5,b:1,c:P.c2,dy:-18,a:e});lab(cA,'commands in, output back',{fs:12,c:P.c1,dy:-24,a:e,wide:1})}
      if(k===7)lab(cN,'stopped or TTL: storage and memory freed',{fs:12,c:P.c3,dy:-18,al:'left',dx:8,a:e})
    }else{const cF=top(cubeP(FN,0),CB+.05);
      if(k===0){R.ball(cS,.13,{c:P.c2});R.glow(cS,.45,{c:P.c2,a:.6});lab(cS,'a task: type, files, code to run',{fs:12,c:P.c2,dy:-22,al:'left',dx:-30,wide:1})}
      if(k===1){R.arc(cS,cI,.7,{c:P.c2,w:2,t:e,a:.8});R.flowArc(cS,cI,.7,{c:P.c2,a:e,r:.08,speed:1.6})}
      if(k===2){R.flowArc(cS,cF,1.6,{c:P.c2,a:e,r:.08,speed:2.2});R.glow(cF,.55,{c:P.c4,a:e*.7});lab(cF,'runs at once: no image, no shell',{fs:12.5,b:1,c:P.c4,dy:-18,a:e})}
      if(k===3){R.glow(cF,.55,{c:P.c4,a:.4+.3*(1-e)});lab(cF,'cleaned up, then reused',{fs:12.5,b:1,c:P.c4,dy:-18,a:e})}
    }
  }
  const CNT={box:k=>stat('Components passed',[1,2,3,4,5,6,6,6][k]+' of 6')+stat('Per-sandbox state in the ingress','none','sandbox ID encodes its edge')+stat('Image bytes pulled before start','0','data fetched on read'),
    fn:k=>stat('Components passed',[1,2,3,3][k]+' of 3')+stat('Per-invocation provisioning','none','container is precreated')+stat('Step',(k+1)+' of 4')};
  const full={cam:[.28,.78],bounds:[[-7.2,0,-2.6],[6.3,.6,2.1]]},nodes={cam:[.38,.66],bounds:[[1.3,0,-3.2],[6.4,1.1,2.1]]},fnv={cam:[.3,.7],bounds:[[1.2,0,-.3],[6.4,1.1,2.1]]};
  const isClose=k=>M==='box'?(k===4||k===5||k===7):k===3;
  const stg=S3.stage({id:'stg-rq',list:'sx-rq-box',fig:'Fig. 1 · one request, from libdsec to a shell',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4600,draw,
    // the steps about the node (admission, image loading, stop) move in close; FnCall's last step is about its container
    view:k=>{if(isClose(k))return M==='box'?nodes:fnv;if(innerWidth>=520)return full;
      // on a phone the whole path is too wide to read: each step frames the part it is about
      const v=(x0,x1)=>({cam:[.3,.72],bounds:[[x0,0,-3.2],[x1,1.2,2.1]]});
      return M==='box'?[v(-7.2,-2.6),v(-7.2,-2.6),v(-4.6,6.3),v(-2.3,6.3),null,null,full][k]:(k<2?v(-7.2,-2.6):full)},
    margin:w=>w<520?[22,8,14,8]:[26,16,16,16],
    onStep:k=>{const c=document.getElementById('rqCnt');if(c)c.innerHTML=CNT[M](k)}});
  const seg=document.getElementById('rqM');if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;document.getElementById('sx-rq-box').hidden=M!=='box';document.getElementById('sx-rq-fn').hidden=M!=='fn';stg.list('sx-rq-'+M)}));
})();
