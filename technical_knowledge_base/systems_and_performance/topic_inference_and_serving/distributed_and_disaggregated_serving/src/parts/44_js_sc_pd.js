// ---- Scene, section 6 (Fig. 6): a 2,000-token prompt arriving at two busy H200s, colocated against disaggregated. Step times from
// window.DDC.pdanim (the Capacity planner's step(): 32 users per GPU colocated, a mixed step with the whole prompt, 64 users on one decode GPU,
// the prompt's prefill), the cache from DDC.ex_xfer (2,000 x 320 KiB = 625 MiB; 400 Gb/s card and NVLink, one direction, full speed). ----
(function(){
  if(!document.getElementById('stg-pd')||!window.DDS||!window.DDC)return;const {mix,lerp,lerp3}=S3,{vis,gpu,lab,f0,f1}=DDS,C=window.DDC,A=C.pdanim;
  const N={co:f1(A.co_dec),mix:f0(A.co_mix),pd:f1(A.pd_dec),pre:f0(A.pd_pre),mib:f0(C.ex_xfer.mib),nic:f1(C.ex_xfer.ms.nic400),nvl:f1(C.ex_xfer.ms.nvl),kib:f0(C.ex.kv_tok/1024),L:C.ex.L};
  window.DD_PD=N; // checked by check_stages.mjs
  const XA=-2.5,XB=2.5,GS=[3.4,.22,2.2],CS=.17;
  // user u's cube: colocated, users 0-31 on A and 32-63 on B (8 x 4 each); disaggregated, all 64 on B (8 x 8)
  const coPos=u=>{const g=u<32?XA:XB,i=u%32;return [g-.95+(i%8)*.27,GS[1],-.75+Math.floor(i/8)*.27]};
  const pdPos=u=>[XB+.35-.95+(u%8)*.27,GS[1],-.95+Math.floor(u/8)*.27];
  const kvA=j=>[XA+.9,.3+j*.085,0],kvB=j=>[XB-1.25,.3+j*.085,0];
  function draw(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-6,6,-1.8,3,.5);
    const dis=k>=2,mv=k===2&&(st.pk==null||st.pk<2)?e:1;
    gpu(R,[XA,0,0],GS,{die:false,hl:k===1?P.bad:null});gpu(R,[XB,0,0],GS,{die:false});
    lab(R,[XA,0,1.1],k>=2?'GPU A · prefill only':'GPU A',{dy:16,b:1,c:k>=2?P.c2:P.ink});lab(R,[XB,0,1.1],k>=2?'GPU B · decode only':'GPU B',{dy:16,b:1,c:k>=2?P.c1:P.ink});
    // the users, one cube each; stalled users turn red
    for(let u=0;u<64;u++){const p=dis?lerp3(coPos(u),pdPos(u),mv):coPos(u),stall=k===1&&u<32;
      R.box(p,[CS,CS,CS],{fill:stall?mix(P.paper,P.bad,.75):mix(P.paper,P.c1,.55),lw:.5,shadow:false})}
    // tokens streaming out to the users, in front
    const out=(x,a)=>R.flow([[x,.45,.4],[x,.45,2.6]],{c:P.c1,a,r:.06,n:5,speed:1.2});
    if(k===0){out(XA,1);out(XB,1)}
    if(k===1)out(XB,1);
    if(k>=2)out(XB,k===2?e:1);
    let a=v(q=>q===0);if(a>0)[XA,XB].forEach(x=>lab(R,[x,.4,-1.1],'32 users · a token every '+N.co+' ms',{dy:-8,b:1,fs:12.5,c:P.c1,a}));
    // the prompt
    const pin=[[-6,.45,0],[XA-1.7,.45,0]];
    a=v(q=>q===1);
    if(a>0){R.flow(pin,{c:P.c2,a,r:.09,n:6,speed:2});R.glass([XA-1.4,.62,-.85],[2.8,0,0],[0,0,1.7],{c:P.c2,a:a*.85,nu:10,nv:4});
      lab(R,[XA,.62,-.85],'one step of '+N.mix+' ms: no tokens',{dy:-10,b:1,fs:13,c:P.bad,a});lab(R,[-5.2,.45,0],'2,000-token prompt',{dy:-14,b:1,fs:12.5,c:P.c2,a})}
    a=v(q=>q>=2);if(a>0)lab(R,[XB+.35,.4,-1.1],'64 users · a token every '+N.pd+' ms',{dy:-8,b:1,fs:12.5,c:P.c1,a,wide:1});
    // prefill builds the cache: eight glass plates of ten layers each
    const kv=k===3?e:k>=4?1:0;
    if(k===3)R.flow(pin,{c:P.c2,r:.09,n:6,speed:2});
    if(k===3)R.glass([XA-1.4,.3,-.6],[1.8,0,0],[0,0,1.2],{c:P.c2,a:.8,nu:8,nv:3});
    if(kv>0){const t=k===4?e:k>=5?1:0;
      for(let j=0;j<8;j++){if(j/8>kv)break;const p=lerp3(kvA(j),kvB(j),t);R.glass([p[0]-.32,p[1],-.4],[.64,0,0],[0,0,.8],{c:P.c4,a:k===3?Math.min(1,(kv-j/8)*8):1,nu:3,nv:3,th:.025})}}
    a=v(q=>q===3);if(a>0){lab(R,[XA+.9,1.0,0],'KV cache · '+N.mib+' MiB',{dy:-10,b:1,fs:13,c:P.c4,a});lab(R,[XA-.5,.3,.6],'prefill '+N.pre+' ms',{dy:20,b:1,fs:12.5,c:P.c2,a})}
    a=v(q=>q===4);
    if(a>0){R.flowArc([XA+.9,.75,0],[XB-1.25,.75,0],.6,{c:P.c4,a,r:.09,n:9,speed:2});
      lab(R,R.arcPt([XA+.9,.75,0],[XB-1.25,.75,0],.6,.5),N.mib+' MiB in '+N.nic+' ms at 50 GB/s',{dy:-16,b:1,fs:13,c:P.c4,a});lab(R,R.arcPt([XA+.9,.75,0],[XB-1.25,.75,0],.6,.5),N.nvl+' ms over NVLink',{dy:2,fs:12,c:P.mute,a,wide:1})}
    a=v(q=>q===5);
    if(a>0){R.box([XB-1.25,GS[1],.75],[CS*1.4,CS*1.4,CS*1.4],{fill:mix(P.paper,P.acc,.7),ec:P.acc,lw:1.6,a,shadow:false});lab(R,[XB-1.25,.45,.75],'user 65',{dy:-10,fs:12,b:1,c:P.acc,a});
      lab(R,[XA,.3,0],'idle until the next prompt',{dy:-8,fs:12.5,c:P.mute,a});}
  }
  const st=S3.stage({id:'stg-pd',list:'sx-pd',fig:'Fig. 6 · colocated against disaggregated',cam:[.1,.72],bounds:[[-5.4,0,-1.3],[4.4,1.1,2.2]],aspect:.44,dur:1500,hold:4800,draw,
    view:k=>k===4?{cam:[.08,.55],bounds:[[-4.3,0,-1.2],[4.3,1.4,1.4]]}:null,margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.DDSTG=window.DDSTG||{})['stg-pd']=st;
})();
