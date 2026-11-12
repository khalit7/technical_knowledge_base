// ---- Scene, Fig. 1 (section 2): 256 MiB in, a kernel, 256 MiB out, as 8 chunks on streams feeding the copy engines and the SMs (renderer v2).
// Host memory on the left, the GPU on the right (a copy engine for each direction, device memory, the SMs), one glass lane per stream between them.
// A chunk is a tile in its stream's colour; it slides along its lane while a copy engine moves it (dots flow the way the bytes go) and feeds the SMs while
// its kernel runs. Times are the page's pipeline model (window.SGPIPE in 23_js_sg_static.js, numbers SG.pipe: 63 GB/s each way, 3.35 TB/s for the kernel),
// played to scale within each step by the scene's own clock; the steps are #sx-pipe on the left. ----
(function(){
  if(!document.getElementById('stg-pipe'))return;const {mix,lerp,cl}=S3,$=id=>document.getElementById(id),PP=SG.pipe,K=8;
  // per chunk: {in:[s,e], ker:[s,e], out:[s,e]} for the three ways the job runs
  function phases(ev){const C=[];for(let c=0;c<K;c++)C.push({});ev.forEach(e=>{C[e.c][e.k]=[e[1],e[2]]});return C}
  const hi=PP.h2d_ms/K,ke=PP.k_ms/K,ho=PP.d2h_ms/K,one=[];
  for(let c=0;c<K;c++){const u=c*(hi+ke+ho);one.push({in:[u,u+hi],ker:[u+hi,u+hi+ke],out:[u+hi+ke,u+hi+ke+ho]})}
  const two=SGPIPE(K,true),oneE=SGPIPE(K,false);
  const SCH={one:{C:one,T:one[K-1].out[1],lanes:1,eng:2},two:{C:phases(two.ev),T:two.T,lanes:3,eng:2},onee:{C:phases(oneE.ev),T:oneE.T,lanes:3,eng:1}};
  const t2=SCH.two.C[1].in[1]+.04;   // the end of step 3: chunk 1 has landed, chunk 0 is on its way out
  // step k: which schedule, from which time to which, and what the step is about
  const STEPS=[{s:'one',a:0,b:0},{s:'one',a:0,b:SCH.one.T},{s:'two',a:0,b:t2},{s:'two',a:t2,b:SCH.two.T},{s:'onee',a:0,b:SCH.onee.T},{s:'two',a:SCH.two.T,b:SCH.two.T,sm:1}];
  const PLAY=3.6,clk={k:-1,t0:0};
  // layout: x from host (left) to GPU (right); stream 0 nearest the camera
  const XH=-4.3,XIN=-4.62,XOUT=-3.98,XL0=-3.55,XL1=1.0,XDM=2.3,XSM=3.55,ZS=[1.15,0,-1.15],TW=[.5,.12,.4],TI=.25,TO=-.25; // tile size; the in-track (front half of a lane) and the out-track (back half)
  const ZE=[1.95,-1.95]; // copy engines: in (front), out (back)
  function busy(ivs,t){return ivs.reduce((s,iv)=>s+Math.max(0,Math.min(t,iv[1])-iv[0]),0)}
  function draw(R,k,e,st){const P=R.P,S=STEPS[k],sc=SCH[S.s],C=sc.C,scol=[P.c1,P.c3,P.c5];
    if(clk.k!==k){clk.k=k;clk.t0=R.t}
    const pr=S3.RM?1:cl((R.t-clk.t0)/PLAY,0,1),t=lerp(S.a,S.b,pr);if(pr<1)R.flow([[0,0,0],[0,0,.01]],{a:.011,n:1,r:.001}); // keeps the clock running
    const lane=c=>sc.lanes===1?0:c%3,jIn=c=>sc.lanes===1?c:Math.floor(c/3),nIn=l=>sc.lanes===1?K:(l===2?2:3);
    R.grid(-5.6,5.4,-2.8,2.8,.5);
    // host memory and the GPU
    R.box([XH,0,0],[1.35,.1,3.4],{fill:mix(P.paper,P.ink,.05),dz:6});
    if(!S.sm)R.label([XH,0,1.75],'pinned host memory',{mono:true,fs:12,c:P.mute,dy:14,wide:1});
    R.box([2.65,0,0],[3.1,.16,4.7],{fill:mix(P.paper,P.ink,.05),dz:6});
    R.label([2.65,0,2.4],'GPU',{mono:true,fs:12.5,b:1,c:P.mute,dy:14});
    R.glass([XDM-.42,.17,-1.65],[.84,0,0],[0,0,3.3],{c:P.c6,a:.6,nu:2,nv:6,th:.02});
    R.label([XDM,.17,-1.65],'device memory',{mono:true,fs:12,c:P.mute,dy:-12,wide:1});
    // the lanes: one per stream
    for(let l=0;l<3;l++){const on=l<sc.lanes,z=ZS[l];R.glass([XL0,0,z-.5],[XL1-XL0,0,0],[0,0,1],{c:scol[l],a:on?.42:.1,nu:1,nv:1,th:.015});
      if(on&&!S.sm)R.label([-1.25,0,z+.52],'stream '+l,{al:'center',mono:true,fs:12,c:scol[l],dy:8,wide:1})}
    // the copy engines at the GPU's edge; one is greyed out when the GPU has a single engine
    const engBusy=[null,null];
    C.forEach((p,c)=>{if(p.in&&t>=p.in[0]&&t<p.in[1])engBusy[0]=c;if(p.out&&t>=p.out[0]&&t<p.out[1])engBusy[sc.eng===1?0:1]=c});
    [0,1].forEach(i=>{const off=i===1&&sc.eng===1,b=engBusy[i],z=ZE[i],fill=off?mix(P.paper,P.ink,.12):b!=null?mix(P.paper,scol[lane(b)],.75):P.paper;
      R.box([1.4,.16,z],[.75,.5,.75],{fill,a:off?.35:1});
      R.label([1.05,.2,z],off?'(no second engine)':sc.eng===1?'copy engine · both ways':i?'copy engine · out':'copy engine · in',{al:'right',mono:true,fs:12,c:off?P.mute:P.ink,dx:-6,b:b!=null,wide:1})});
    // the SMs: a block of small boxes that glows in the colour of the chunk whose kernel runs
    let kb=null;C.forEach((p,c)=>{if(t>=p.ker[0]&&t<p.ker[1])kb=c});
    const smHi=S.sm?(k===st.k?1:1):0;
    for(let i=0;i<3;i++)for(let j=0;j<4;j++){const x=XSM-.38+i*.38,z=-1.2+j*.8;
      R.box([x,.16,z],[.3,.26,.62],{fill:kb!=null?mix(P.paper,scol[lane(kb)],.8):smHi?mix(P.paper,P.acc,.35):P.paper,shadow:false})}
    R.label([XSM,.16,1.65],'SMs',{mono:true,fs:12.5,b:1,c:smHi?P.acc:P.ink,dy:12});
    // the chunks
    const lifted=new Array(3).fill(0),done=new Array(3).fill(0);
    C.forEach((p,c)=>{const l=lane(c),z=ZS[l],col=mix(P.paper,scol[l],.85);let pos,a=1;
      if(t<p.in[0]){const j=jIn(c),n=nIn(l);pos=[XIN,.1+(n-1-j)*.14,z+TI]}
      else if(t<p.in[1]){const u=(t-p.in[0])/(p.in[1]-p.in[0]);pos=[lerp(XH,XDM,u),.02,z+TI];
        R.flow([[XH+.3,.07,z+TI],[pos[0],.07,z+TI]],{c:scol[l],r:.06,speed:2.2,n:Math.max(3,Math.round(8*u+3))})}
      else if(t<p.out[0]){pos=[XDM,.18,z];if(t>=p.ker[0]&&t<p.ker[1]||(S3.RM&&kb===c))R.flowArc([XDM,.34,z],[XSM-.4,.42,z],.35,{c:scol[l],r:.06,n:7,speed:2})}
      else if(t<p.out[1]){const u=(t-p.out[0])/(p.out[1]-p.out[0]);pos=[lerp(XDM,XOUT,u),.02,z+TO];
        R.flow([[XDM,.07,z+TO],[pos[0],.07,z+TO]],{c:scol[l],r:.06,speed:2.2,n:Math.max(3,Math.round(8*u+3))})}
      else{const j=jIn(c);pos=[XOUT,.1+j*.14,z+TO]}
      if(S.sm)a=.45;
      R.box(pos,TW,{fill:col,a,shadow:pos[1]<.05})});
    // the clock, to scale within the step
    if(!S.sm)R.label([-4.9,.75,-1.6],'t = '+t.toFixed(2)+' ms'+(t>=sc.T-1e-9&&S.b>0?' · done':''),{al:'left',mono:true,fs:14,b:1,c:P.ink});
    counters(sc,t);
  }
  let last='';
  function counters(sc,t){const C=sc.C,iv=x=>C.map(p=>p[x]).filter(Boolean),T=Math.max(t,1e-9),pc=v=>t>0?Math.round(100*v/T)+'%':'0%';
    const h=RD.stat('Clock',t.toFixed(2)+' ms','job done at '+sc.T.toFixed(2)+' ms')+
      (sc.eng===1?RD.stat('Copy engine',pc(busy(iv('in'),t)+busy(iv('out'),t)),'busy so far, both directions'):RD.stat('Copy in',pc(busy(iv('in'),t)),'engine busy so far')+RD.stat('Copy out',pc(busy(iv('out'),t)),'engine busy so far'))+
      RD.stat('SMs',pc(busy(iv('ker'),t)),'busy so far');
    if(h!==last){last=h;$('sg-pipe3-cnt').innerHTML=h}}
  const full={cam:[.22,.62],bounds:[[-5,0,-2.4],[4.4,.9,2.4]]};
  const st=S3.stage({id:'stg-pipe',list:'sx-pipe',fig:'Fig. 1 · 256 MiB in 8 chunks through the copy engines',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1300,hold:4600,draw,
    // the last step is about the SMs: move in close on the GPU
    view:k=>k===5?{cam:[.4,.6],bounds:[[.8,0,-2.4],[4.3,.9,2.5]]}:full,margin:w=>w<520?[14,8,10,8]:[16,14,12,14]});
  (window.SGSTG=window.SGSTG||{})['stg-pipe']=st;window.SG_PIPE3={SCH,STEPS};
})();
