// ---- Scene, Fig. 1 (section 1): one 2,048 x 2,048 float32 multiply timed four ways, to scale (renderer v2).
// The CPU thread (front) and the GPU stream (back) are two glass lanes along one time axis; work is a block on its lane, a launch is a
// stream of dots from the CPU to the GPU, the host clock is a pair of green posts and the events a pair of purple flags.
// Durations are the measured medians of PCD.timing.async (Apple M1 Pro GPU, PyTorch 2.14.1 MPS, 3 runs); the steps are #sx-tl-* on the left. ----
(function(){
  if(!document.getElementById('stg-time'))return;const {at,mix}=S3,A=PCD.timing.async,f=MC.fmtN,$=id=>document.getElementById(id);
  const L=A.host_nosync_ms.median,G=A.event_ms.median,S=A.host_sync_ms.median,Q=A.host_queued_ms.median;
  // per mode: axis length (ms), blocks [lane, from, to, step it appears, kind, label], clock posts [t0, step, t1, step] or events, the reading
  const M={
    nosync:{max:G*1.1+L,list:'sx-tl-nosync',report:L,
      els:[['cpu',0,L,1,'cpu','c = a @ b queued'],['gpu',L,L+G,3,'gpu','matmul '+f(G,2)+' ms']],clock:[0,0,L,2],launch:[L,1],close:[1,2]},
    sync:{max:S*1.08,list:'sx-tl-sync',report:S,
      els:[['cpu',0,L,1,'cpu','queued'],['cpu',L,S,2,'wait','waiting in synchronize()'],['gpu',L,L+G,2,'gpu','matmul']],clock:[0,0,S,3],launch:[L,1],close:[]},
    event:{max:S*1.08,list:'sx-tl-event',report:G,
      els:[['cpu',0,L,1,'cpu','queued'],['cpu',L,S,2,'wait','synchronize()'],['gpu',L,L+G,2,'gpu','matmul']],ev:[L,0,L+G,1],launch:[L,1],close:[0]},
    queued:{max:Q*1.06,list:'sx-tl-queued',report:Q,
      els:(function(){const o=[],st=Q-5*G;for(let k=0;k<5;k++){const a=st+k*G,b=a+G;if(b<=0)continue;o.push(['gpu',Math.max(0,a),b,k<4?0:1,k<4?'old':'gpu',k===1?'4 earlier multiplies':k===4?'yours':''])}
        o.push(['cpu',0,L,1,'cpu',''],['cpu',L,Q,2,'wait','waiting in synchronize()']);return o})(),clock:[0,1,Q,3],launch:[L,1],close:[]}
  };
  let mode='nosync';
  const XA=-4.2,LEN=8.6,ZC=.85,ZG=-.85,HW=.34;
  function draw(R,k,e,st){const P=R.P,m=M[mode],X=t=>XA+t/m.max*LEN,col={cpu:P.c1,gpu:P.c2,old:P.c6,wait:P.mute};
    // cf: how close the camera is (1 in a close-up); the far part of the lanes fades out so a close-up never shows a cut plate
    const isC=j=>m.close.includes(j),cf=isC(k)?(isC(st.pk)?1:e):(isC(st.pk)?1-e:0),XV=XA+LEN-(LEN-2.9)*(1-Math.pow(1-cf,3));
    R.grid(-6,6,-2.6,2.6,.5);
    // the two lanes, with the ms ticks across them
    [[ZC,P.c1,'CPU thread'],[ZG,P.c2,'GPU stream']].forEach(([z,c,n])=>{R.glass([XA-.12,0,z-.42],[XV-XA+.24,0,0],[0,0,.84],{c,a:.55,nu:1,nv:1,th:.02});
      R.label([XA-.3,.05,z],n,{al:'right',mono:true,fs:12.5,b:1,c,grp:'lane'})});
    const stp=m.max>12?5:m.max>3?1:.5,narrow=R.W<520;
    for(let v=0,i=0;v<=m.max+1e-9;v+=stp,i++){const x=X(v);if(x>XV+.01)break;R.line([[x,.004,ZC+.46],[x,.004,ZG-.46]],{c:P.line,w:1,a:.9});
      if(!narrow||i%2===0)R.label([x,0,ZC+.56],f(v,stp<1?1:0)+(i===0?' ms':''),{mono:true,fs:12,c:P.mute})}
    // blocks: what the step is about at full strength, the rest receding
    m.els.forEach(([ln,a,b,s,kind,lab])=>{if(s>k)return;const z=ln==='cpu'?ZC:ZG,x0=X(a),x1=Math.min(X(b),XV),now=s===k,g=now?e:1,w=Math.max(.05,(x1-x0)*(kind==='gpu'||kind==='old'?g:1)),
        h=kind==='wait'?.1:HW,al=now?1:.55,fill=kind==='wait'?mix(P.paper,P.mute,.3):mix(P.paper,col[kind],.78);if(x1<=x0)return;
      R.box([x0+w/2,0,z],[w,h*(kind==='wait'?1:(now&&kind==='cpu'?g:1)),.5],{fill,a:al,fa:kind==='wait'?.75:1});
      // labels: a GPU block's on its own top face, a CPU block's on the clear floor between the lanes
      if(lab&&now){const big=x1-x0>1.1,gpu=ln==='gpu';R.label([big?(x0+x1)/2:x0,gpu?h:0,gpu?z:.02],lab,{al:big?'center':'left',mono:true,fs:12.5,b:1,c:kind==='wait'?P.mute:gpu?P.ink:col[kind]})}});
    // the launch: dots stream from the CPU's call to the GPU's queue
    if(m.launch&&k>=m.launch[1]){const x=X(m.launch[0]),a=k===m.launch[1]?1:.35;R.flowArc([x,HW,ZC],[x+.05,HW,ZG],.55,{c:P.c1,a,r:.06,speed:1.1,n:6})}
    // the host clock: two green posts and the reading between their tops
    // the host clock: two green posts on a ruler in front of the CPU lane, its reading under the ruler
    if(m.clock){const [t0,s0,t1,s1]=m.clock,ph=.3,zc=ZC+1.05;
      if(k>=s0){R.box([X(t0),0,zc],[.06,ph*(k===s0?e:1),.06],{fill:P.c3,shadow:false});if(k===s0)R.label([X(t0),0,zc],'clock starts',{al:'left',mono:true,fs:12.5,b:1,c:P.c3,dy:16,a:e})}
      if(k>=s1){const x1=X(t1),a=k===s1?e:1;R.box([x1,0,zc],[.06,ph,.06],{fill:P.c3,shadow:false,a});
        R.line([[X(t0),ph,zc],[x1,ph,zc]],{c:P.c3,w:3,a});
        const nar=x1-X(t0)<1.6;R.label([nar?X(t0):(X(t0)+x1)/2,0,zc],'clock says '+f(m.report,2)+' ms',{al:nar?'left':'center',mono:true,fs:13,b:1,c:P.c3,dy:16,a})}}
    // CUDA-style events: two purple flags in the GPU's stream, the elapsed time read between them
    if(m.ev){const [t0,s0,t1,s1]=m.ev,fh=.95;
      [[t0,s0,'start'],[t1,s1,'end']].forEach(([t,s,n])=>{if(k<s)return;const x=X(t),ap=k===s?(s===0?e:Math.max(0,(e-.6)/.4)):1; // the end flag waits until the camera has pulled back
        R.box([x,0,ZG-.25],[.05,fh,.05],{fill:P.c4,shadow:false,a:ap});
        R.quad([[x,fh,ZG-.25],[x+.34,fh-.1,ZG-.25],[x,fh-.2,ZG-.25]],{fill:P.c4,a:ap,edge:false});
        if(k===s)R.flowArc([X(L),HW,ZC],[x,fh-.1,ZG-.25],.4,{c:P.c4,a:.9*ap,r:.06,n:5});
        if(k<3)R.label([x,fh,ZG-.25],n+'.record()',{al:n==='end'?'right':'left',mono:true,fs:12,c:P.c4,dx:n==='end'?-6:6,dy:-20,a:ap})});
      if(k>=3){R.line([[X(t0),fh+.12,ZG-.25],[X(t1),fh+.12,ZG-.25]],{c:P.c4,w:3,a:e});R.label([(X(t0)+X(t1))/2,fh+.12,ZG-.25],'elapsed_time() = '+f(G,2)+' ms',{mono:true,fs:13,b:1,c:P.c4,dy:-14,a:e})}}
  }
  function counters(k){const m=M[mode],key={nosync:'host_nosync_ms',sync:'host_sync_ms',event:'event_ms',queued:'host_queued_ms'}[mode],done=k>=3;
    $('rd-tl-cnt').innerHTML=RD.stat('Timer reports',done?f(m.report,2)+' ms':'...','runs: '+A[key].runs.map(v=>f(v,mode==='nosync'?3:2)).join(', '))+
      RD.stat('GPU time of this multiply',f(G,2)+' ms','event median; runs '+A.event_ms.runs.map(v=>f(v,2)).join(', '))+
      RD.stat('Error',done?(m.report>=G?'+':'')+f((m.report/G-1)*100,0)+'%':'...','against the event time')+
      RD.stat('Throughput implied',done?f(A.flops/m.report/1e9,A.flops/m.report/1e9<10?2:0)+' TFLOP/s':'...','2N&sup3; = '+f(A.flops/1e9,1)+' GFLOP; the M1 Pro GPU peaks near 5 TFLOP/s')}
  const ph=()=>innerWidth<560,full=()=>({cam:ph()?[.5,.9]:[.1,.74],bounds:[[XA-1.6,0,-1.6],[XA+LEN+.2,.9,2.05]]});
  const st=S3.stage({id:'stg-time',list:'sx-tl-nosync',fig:'Fig. 1 · one matmul, four ways to time it',cam:full().cam,bounds:full().bounds,aspect:.44,dur:1400,hold:4400,draw,
    // the steps about the 0.18 ms call move the camera in close on the start of the axis
    view:k=>M[mode].close.includes(k)?{cam:ph()?[.55,.85]:[.3,.64],bounds:[[XA-1.5,0,-1.6],[XA+2.8,1.0,2.05]]}:full(),
    margin:w=>w<520?[14,10,10,10]:[20,16,14,16],onStep:k=>{try{counters(k)}catch(err){}}});
  (window.PCSTG=window.PCSTG||{})['stg-time']=st;window.PC_TIME=M;
  RD.seg($('rd-tl-mode'),v=>{mode=v;Object.keys(M).forEach(x=>$(M[x].list).hidden=x!==v);st.list(M[v].list)});
})();
