// ---- Scene, Fig. 1 (the map): one training step's hardware from the inside out (renderer v2: a few large objects per step, the camera
// moving in close, flowing dots wherever data or energy moves). A map, not a mechanism: each step lights the part one child page owns,
// and the step list links that child's own figure.
// Numbers from RDH (src/read/recompute.py): the step's FLOPs, state and gradient bytes, the time on 1 and 8 H100s at 40% MFU, the ring
// all-reduce over NVLink and over one NIC per GPU; and the H100 SXM figures the page cites (80 GB, 3.35 TB/s, 450 GB/s, 50 GB/s).
// Counts drawn are illustrative and say so: 16 of the 132 SMs, two servers, one network switch, one failed GPU.
// Colours: blue HBM, purple tensor cores, green NVLink, teal the network, gold power, orange heat, the page accent for the featured parts.
(function(){
  if(!document.getElementById('stg-hero')||!window.RDH)return;const {mix,lerp}=S3;const D=RDH,S=D.step,A=D.ar;
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const T1=Math.round(S.step_1gpu),T8=fmt(S.step_8gpu,1),ST=fmt(S.states/1e9,1),GB=fmt(S.bytes_bf16/1e9,2);
  const NV=fmt(A.t.nvlink*1000,1),IB=fmt(A.t.ib,2),FL=(S.flops_6nd/1e16).toFixed(2);
  // where things sit: server A at z=0, server B behind; GPU packages in two rows of four with the NVSwitch between the halves
  const GX=[-3.5,-1.3,1.3,3.5],GZ=[-1.05,1.05],ZB=-6.2,F=[-1.3,0,1.05],SW=[6.4,0,-3.1],PW=[-6.9,0,-3.1],CO=[-6.9,0,.4];
  const TPU=[8.2,0,1.2],WAF=[8.2,0,-2.4];
  const gpus=z0=>{const o=[];GZ.forEach(z=>GX.forEach(x=>o.push([x,0,z0+z])));return o};
  const GA=gpus(0),GB2=gpus(ZB);
  const HX=[-.66,.66],HZ=[-.45,0,.45];
  // one H100 package: substrate, die, six HBM sites (five in use); y0 is the tray top
  function pkg(R,c,a,o){o=o||{};const P=R.P,y0=.08,[x,,z]=c;
    R.box([x,y0,z],[1.9,.05,1.6],{fill:mix(P.paper,P.ink,.06),a,shadow:false});
    R.box([x,y0+.05,z],[.8,.09,.8],{fill:o.bad?mix(P.paper,P.bad,.55):mix(P.paper,o.die||P.ink,o.die?.35:.14),a,shadow:false});
    HX.forEach((hx,i)=>HZ.forEach((hz,j)=>{const used=!(i===1&&j===2),p=[x+hx,y0+.05,z+hz];
      if(used)R.box(p,[.3,o.hbm?.34:.26,.36],{fill:mix(P.paper,P.c1,o.hbm?.6:.32),a,shadow:false});
      else if(o.hbm)R.quad([[p[0]-.15,y0+.06,p[2]-.18],[p[0]+.15,y0+.06,p[2]-.18],[p[0]+.15,y0+.06,p[2]+.18],[p[0]-.15,y0+.06,p[2]+.18]],{ec:P.mute,dash:[4,3],a:a*.9})}))}
  function tray(R,z,a){R.box([0,0,z],[9.6,.08,4.4],{fill:mix(R.P.paper,R.P.c3,.1),a})}
  // a bar on a white plinth, height h, value label above
  function bar(R,p,h,c,a,lab,o){if(a<=.01)return;R.box([p[0],0,p[2]],[.6,.05,.6],{a,shadow:false});R.box([p[0],.05,p[2]],[.42,Math.max(.03,h),.42],{fill:mix(R.P.paper,c,.55),a});
    if(lab)R.label([p[0],.05+Math.max(.03,h),p[2]],lab,Object.assign({mono:true,fs:12.5,b:1,dy:-10,c:c,a},o||{}))}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-7.6,9.6,-8.6,3.8,.5);
    // what each step lights; everything else recedes
    const L=[['a','b','net'],['f'],['f','hbm'],['a','sw'],['a','b','net','sw2'],['a','b','pw','co'],['a','bars'],['alt']];
    const lit=g=>{const A0=j=>L[Math.max(0,j)].includes(g)?1:.2;return lerp(A0(k-1),A0(k),e)};
    // parts introduced late (the building, the other bets) are drawn only during their step, fading in and then out
    const late=(g,s)=>k===s?e:k===s+1?1-e:0;
    const on=s=>k===s?e:0;
    // ---- server A (front) and B (behind) ----
    const aA=Math.max(lit('a'),lit('f')*.55,lit('bars')*.5),aB=lit('b');
    tray(R,0,Math.max(aA,.25));tray(R,ZB,Math.max(aB,.2));
    const fl=lit('f');
    GA.forEach(g=>{const feat=g[0]===F[0]&&g[2]===F[2];if(feat&&k===2)return;pkg(R,g,feat?Math.max(aA,fl):aA,{die:feat&&k===1?P.acc:null})});
    GB2.forEach((g,i)=>pkg(R,g,aB,{bad:k===5&&i===6}));
    // the NVSwitch between the two halves of each server
    R.box([0,.08,0],[.5,.24,3.2],{fill:mix(P.paper,P.c3,.45),a:Math.max(lit('sw'),aA*.7)});
    R.box([0,.08,ZB],[.5,.24,3.2],{fill:mix(P.paper,P.c3,.45),a:Math.max(lit('sw2')*.8,aB*.7)});
    // the network switch to the right, between the servers
    const na=k===7?lit('net')*(1-e):Math.max(lit('net'),lit('sw2'));
    R.box(SW,[1.0,.4,1.3],{fill:mix(P.paper,P.c6,.45),a:na});
    const ports=z0=>[-1.2,-.4,.4,1.2].map(dz=>[[4.8,.12,z0+dz],[5.5,.12,z0+dz*.5],[SW[0]-.5,.25,SW[2]+(z0<-3?-.25:.25)+dz*.15]]);
    const pa=ports(0),pb=ports(ZB);pa.concat(pb).forEach(p=>R.line(p,{c:P.line,w:1.5,a:na*.8}));
    // ---- step 0: the three demands, pinned where they act ----
    if(k===0){R.label([F[0],.25,F[2]],nar?FL+' × 10¹⁶ FLOPs':'arithmetic · '+FL+' × 10¹⁶ FLOPs',{fs:12.5,b:1,dy:-14,c:P.c4,a:e});
      R.label([GA[0][0],.4,GA[0][2]],nar?ST+' GB of state':'memory · '+ST+' GB of state',{fs:12.5,b:1,dy:-14,c:P.c1,a:e,wide:nar?1:0,grp:nar?null:'dem'});
      R.label([0,.32,-1.4],nar?GB+' GB of gradients':'between chips · '+GB+' GB of gradients',{fs:12.5,b:1,dy:-14,c:P.c3,a:e,grp:nar?null:'dem'});
      R.label([SW[0],.4,SW[2]],'network',{fs:12,dy:-12,c:P.c6,a:e,wide:1});
      R.label([0,0,ZB-2.2],'a second 8-GPU server',{fs:12,dy:16,c:P.mute,a:e,wide:1})}
    // ---- step 1: tensor cores inside the SMs; one SM lifted out of the die ----
    const y1=.22;
    if(k>=1&&k<=2){const a=k===1?1:1-e*.85;
      for(let r=0;r<4;r++)for(let c=0;c<4;c++){const p=[F[0]-.3+.2*c,y1,F[2]-.3+.2*r],sel=r===3&&c===1;
        R.box(p,[.15,.04,.15],{fill:mix(P.paper,sel&&k===1?P.acc:P.c4,sel&&k===1?.6:.3),a:a*(k===1?(sel?1:.85):1),shadow:false,lw:.6})}}
    if(k===1){const up=[F[0]+.15,.75,F[2]+1.45],a=e;
      R.box(up,[.56,.05,.56],{fill:mix(P.paper,P.acc,.25),a,shadow:false});
      [[-.13,-.13],[.13,-.13],[-.13,.13],[.13,.13]].forEach(([dx,dz],i)=>{const t=[up[0]+dx,up[1]+.05,up[2]+dz];
        R.box(t,[.16,.1,.16],{fill:mix(P.paper,P.c4,.6),a,shadow:false});
        R.flowArc([up[0]-.55,up[1]+.05,up[2]+dz*1.8],[t[0],t[1]+.1,t[2]],.1,{c:P.c4,a,r:.03,n:4,speed:.5})});
      R.line([[F[0]-.1,y1+.04,F[2]+.3],[up[0]-.1,up[1],up[2]-.28]],{c:P.acc,w:1.3,a:a*.8,dash:[4,3]});
      R.label([up[0]+.32,up[1]+.1,up[2]],nar?'4 tensor cores':'one SM: 4 tensor cores',{al:'left',dx:8,fs:12.5,b:1,c:P.c4,a});
      R.label([F[0]+.42,y1,F[2]-.3],nar?'132 SMs':'132 SMs on an H100, 16 drawn',{al:'left',dx:8,fs:12,c:P.ink,a,wide:nar?1:0});
      R.label([F[0],.08,F[2]-.8],nar?T1+' s on one H100':FL+' × 10¹⁶ FLOPs: '+T1+' s on one H100 at 40%',{fs:12.5,b:1,dy:-8,c:P.ink,a})}
    // ---- step 2: HBM beside the die; capacity against the step's state ----
    if(k===2){const a=e;
      HX.forEach((hx,i)=>HZ.forEach((hz,j)=>{if(i===1&&j===2)return;const s=[F[0]+hx,.42,F[2]+hz],d=[F[0]+Math.sign(hx)*.3,.2,F[2]+hz*.6];
        R.flowArc(s,d,.1,{c:P.c1,a,r:.04,n:4,speed:.7})}));
      pkg(R,F,1,{hbm:true,die:P.acc});
      const cap=80,stt=S.states/1e9,sc=1.25/stt,zb=F[2]+1.55;
      bar(R,[F[0]-.45,0,zb],cap*sc,P.c1,a,nar?'80 GB':'80 GB · HBM of one H100');
      bar(R,[F[0]+.45,0,zb],stt*sc,P.bad,a,nar?ST+' GB':ST+' GB · the step\'s state',{al:'left',dx:8,dy:0});
      R.label([F[0]-.66,.42,F[2]-.45],nar?'HBM3':'HBM3 · 3.35 TB/s',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c1,a})}
    // ---- step 3: NVLink through NVSwitch inside server A ----
    if(k===3){const a=e;
      GA.forEach((g,i)=>{const s=[g[0]+(g[0]<0?.6:-.6),.2,g[2]],d=[g[0]<0?-.26:.26,.3,g[2]*.55];
        R.flowArc(s,d,.3,{c:P.c3,a,r:.08,n:7,speed:1.3});R.flowArc([d[0],.3,d[2]+.15],[s[0],.2,s[2]+.15],.3,{c:P.c3,a:a*.8,r:.07,n:6,speed:1.3})});
      R.label([0,.32,-1.6],nar?'NVSwitch':'NVLink through NVSwitch',{fs:12.5,b:1,dy:-12,c:P.c3,a});
      R.label([0,.08,2.2],nar?'450 GB/s each way':'450 GB/s each way per GPU · all-reduce '+NV+' ms',{fs:12.5,b:1,dy:16,c:P.ink,a})}
    // ---- step 4: across servers, the network ----
    if(k===4){const a=e;
      pa.forEach(p=>R.flow(p,{c:P.c6,a,r:.08,n:3,speed:.55}));pb.forEach(p=>R.flow(p.slice().reverse(),{c:P.c6,a,r:.08,n:3,speed:.55}));
      R.label([SW[0],.4,SW[2]-.65],nar?'InfiniBand / RoCE':'InfiniBand or RoCE switch',{dy:-12,fs:12.5,b:1,c:P.c6,a});
      R.label([SW[0],0,SW[2]+.65],nar?'50 GB/s per GPU':'50 GB/s per GPU · all-reduce '+IB+' s',{dy:16,fs:12,c:P.ink,a,wide:nar?1:0});
      R.label([0,.32,0],'NVLink: 9 × faster',{fs:12,dy:-14,c:P.c3,a,wide:1})}
    // ---- step 5: the building: power in, heat out, one failure ----
    R.box(PW,[1.1,.7,1.1],{fill:mix(P.paper,P.c5,.5),a:late('pw',5)});R.box(CO,[1.1,.55,1.4],{fill:mix(P.paper,P.c6,.3),a:late('co',5)});
    if(k===5){const a=e;
      [0,ZB].forEach(z=>R.flow([[PW[0]+.55,.3,PW[2]],[-5.3,.1,z],[-4.8,.1,z]],{c:P.c5,a,r:.07,n:6,speed:1.1}));
      GA.concat(GB2).forEach((g,i)=>{if(i%2)return;R.flow([[g[0],.25,g[2]],[g[0],1.3,g[2]],[CO[0]+.5,.6,CO[2]]],{c:P.c2,a:a*.85,r:.05,n:5,speed:.9})});
      R.label([PW[0],.7,PW[2]],nar?'power in':'power in · 700 W per H100',{fs:12.5,b:1,dy:-12,c:P.c5,a});
      R.label([CO[0],.55,CO[2]],nar?'heat out':'heat out · liquid above about 1 kW a chip',{fs:12.5,b:1,dy:-12,c:P.c2,a});
      const bad=GB2[6];R.glow([bad[0],.2,bad[2]],.9,{c:P.bad,a});
      R.label([bad[0],.2,bad[2]],nar?'a failure':'one failure stops the whole job',{fs:12.5,b:1,dy:-18,c:P.bad,a})}
    // ---- step 6: the arithmetic: each demand over its rate, the largest sets the step ----
    if(k===6){const a=e,sc=2.0/S.step_8gpu,zb=3.5;
      bar(R,[-2.6,0,zb],S.step_8gpu*sc,P.c4,a,nar?T8+' s':'arithmetic · '+T8+' s');
      bar(R,[0,0,zb],A.t.nvlink*sc,P.c3,a,nar?NV+' ms':'NVLink all-reduce · '+NV+' ms',{grp:nar?null:'bars'});
      bar(R,[2.6,0,zb],A.t.ib*sc,P.c6,a,nar?IB+' s':'over the network · '+IB+' s',{grp:nar?null:'bars'});
      R.flow([[-2.6,.3,1.6],[-2.6,.3,zb-.35]],{c:P.c4,a,r:.07,n:4,speed:.8});R.flow([[0,.3,1.6],[0,.12,zb-.35]],{c:P.c3,a,r:.07,n:4,speed:.8});
      R.label([0,0,zb+.4],nar?'8 H100s, 40% MFU':'one step on 8 H100s at 40% MFU: the largest bar sets the time',{fs:12.5,b:1,dy:18,c:P.ink,a})}
    // ---- step 7: other bets: a systolic array, a wafer ----
    const al=late('alt',7);
    R.box([TPU[0],0,TPU[2]],[1.9,.1,1.9],{fill:mix(P.paper,P.c3,.15),a:al});
    R.box([WAF[0],0,WAF[2]],[2.3,.06,2.3],{fill:mix(P.paper,P.c5,.25),a:al});
    if(k===7){const a=e,o0=[TPU[0]-.75,.32,TPU[2]-.75],n=8,c=1.5/n;
      R.glass(o0,[1.5,0,0],[0,0,1.5],{c:P.c3,a,nu:n,nv:n,th:.04});
      for(let i=0;i<4;i++){const z=o0[2]+c*(2*i+.5),x=o0[0]+c*(2*i+.5);
        R.flow([[o0[0]-.25,.38,z],[o0[0]+1.75,.38,z]],{c:P.c2,a,r:.06,n:5,speed:.45});
        R.flow([[x,.38,o0[2]-.25],[x,.38,o0[2]+1.75]],{c:P.c4,a,r:.06,n:5,speed:.45})}
      for(let r=0;r<7;r++)for(let c2=0;c2<7;c2++){const x=WAF[0]-.96+.32*c2,z=WAF[2]-.96+.32*r;R.box([x,.06,z],[.26,.03,.26],{fill:mix(P.paper,P.c5,.5),a,shadow:false,lw:.5})}
      R.label([TPU[0],.4,TPU[2]+.9],nar?'systolic array':'TPU: a systolic array, operands cell to cell',{fs:12.5,b:1,dy:18,c:P.c3,a});
      R.label([WAF[0],.1,WAF[2]-1.2],nar?'one wafer':'Cerebras: one wafer, 44 GB of SRAM',{fs:12.5,b:1,dy:-12,c:P.c5,a})}
  }
  const full={cam:[.25,.75],bounds:[[-4.9,0,-8.5],[7,.5,2.3]]};
  const V=[full,
    {cam:[.35,.7],bounds:[[F[0]-1.3,0,F[2]-1],[F[0]+1.6,1,F[2]+1.9]]},
    {cam:[.35,.72],bounds:[[F[0]-1.2,0,F[2]-1],[F[0]+1.3,1.4,F[2]+1.9]]},
    {cam:[.4,.82],bounds:[[-4.9,0,-2.3],[4.9,.6,2.4]]},
    {cam:[.5,.78],bounds:[[-4.9,0,-8.5],[8.4,.6,2.4]]},
    {cam:[.4,.78],bounds:[[-7.6,0,-8.5],[4.9,1.4,2.4]]},
    {cam:[.22,.62],bounds:[[-3.6,0,.6],[3.6,2.2,4.3]]},
    {cam:[.45,.75],bounds:[[6.6,0,-3.8],[9.8,.6,2.4]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one training step, from the tensor core to the building',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[18,8,16,8]:[24,20,20,20]});
})();
