// ---- Scene: reverse mode against forward mode on the tiny model (Fig. 3, renderer v2), sections 3 and 4 ----
// Values: MC.tinyAll() and MC.tinyJvps() (parts/22b_js_core.js, checked against src/recompute.py by src/check_js.mjs).
// The chain x -> W -> z -> softmax -> p -> L stands at the back (values, green flows); the row in front carries derivatives:
// reverse mode's adjoints (blue) run back once, forward mode's tangents (gold) run forward once per weight. In front, dL/dW as a
// 3 x 2 bar field fills as slopes are found: all six at once in reverse mode, one per sweep in forward mode.
(function(){
  if(!document.getElementById('stg-fr')||!window.MCS||!window.MC)return;
  const U=MCS,T=MC.tinyAll(),JV=MC.tinyJvps(),W=MC.tiny.W,x=MC.tiny.x,words=['cat','dog','sat'];
  const XX=-5,PW=-3.75,XZ=-2.4,PJ=-.95,XP=.45,XL=1.85,ZC=-1.9,ZA=-.15,XF=-1.6,ZF=1.75,YP=.25,HM=.8;
  const FO={cell:.48,m:Math.max(...T.gW.flat().map(Math.abs)),hmax:.85};
  const pbar=[0,0,-1/T.p[2]];
  let mode='rev';
  function cell(n){return U.cellTop([XF,0,ZF],T.gW,Math.floor(n/2),n%2,FO)}
  function draw(R,k,e){const P=R.P;R.grid(-5.8,2.8,-2.8,2.8,.5);
    const fwd=mode==='fwd',last=fwd?7:5,sweep=fwd&&k>=1&&k<=6?k-1:-1;
    // the chain at the back: the shared forward pass
    const va=k===0?1:.35,kept=!fwd;
    U.comb(R,[XX,YP,ZC],x,2.4,null,va,HM,.75,{kept});R.label([XX,0,ZC+.45],'x',{mono:true,fs:12.5,dy:6});
    U.comb(R,[XZ,YP,ZC],T.z,2.4,null,va,HM,1.05);R.label([XZ,0,ZC+.45],'z',{mono:true,fs:12.5,dy:6});
    U.comb(R,[XP,YP,ZC],T.p,1,null,va,HM,1.05,{kept});R.label([XP,0,ZC+.45],'p',{mono:true,fs:12.5,dy:6});
    R.box([XL,0,ZC],[.4,T.loss/2.4*HM,.4],{fill:S3.mix(P.paper,P.c3,.25),a:va});R.label([XL,0,ZC+.45],'L = '+U.f3(T.loss),{mono:true,fs:12.5,dy:6});
    [[PW,'W',2,3],[PJ,'softmax’s J',3,3]].forEach(([px,nm,nu,nv])=>{R.glass([px,.08,ZC-.55],[0,0,ZA-ZC+1.1],[0,1.15,0],{c:P.c4,nu,nv,a:.75});R.label([px,0,ZA+.7],nm,{mono:true,fs:12.5,c:P.c4,dy:8})});
    if(k===0)[[XX,XZ],[XZ,XP],[XP,XL]].forEach(([a,b])=>R.flow(U.path([a,YP+.3,ZC],[b,YP+.3,ZC],14),{c:P.c3,r:.07,speed:1.3}));
    // dL/dW, filled as slopes are found
    const found=new Array(6).fill(0);
    if(!fwd){if(k>=3)found.fill(k===3?e:1)}else{for(let n=0;n<6;n++)found[n]=k>n+1?1:k===n+1?Math.max(0,e*1.6-.6):0}
    R.box([XF,0,ZF],[2*FO.cell+.16,.03,3*FO.cell+.16],{fill:P.paper,a:.8,shadow:false,lw:.6});
    for(let n=0;n<6;n++){const i=Math.floor(n/2),j=n%2,c=[XF+(j-.5)*FO.cell,.03,ZF+(i-1)*FO.cell],v=T.gW[i][j];
      if(found[n]<=0){R.box(c,[FO.cell*.7,.012,FO.cell*.7],{fill:P.paper,a:.6,shadow:false,lw:.5,fa:.3,ec:n===sweep?P.c5:undefined});continue}
      R.box(c,[FO.cell*.7,Math.max(.014,Math.abs(v)/FO.m*FO.hmax*found[n]),FO.cell*.7],{fill:v>=0?(fwd?P.c5:P.acc):S3.mix(P.paper,fwd?P.c5:P.acc,.4),shadow:false,lw:.7})}
    R.label([XF,0,ZF+.85],'∂L/∂W · 3 × 2',{mono:true,fs:12.5,b:1,dy:4});
    R.label([XF-.55,0,ZF-.4],'cat',{mono:true,fs:12,al:'right',c:P.mute,wide:1});R.label([XF-.55,0,ZF+.4],'sat',{mono:true,fs:12,al:'right',c:P.mute,wide:1});
    const cnt=fwd?(k<1?0:Math.min(k,6)):(k>=3?1:0),macs=fwd?16*Math.min(Math.max(k,0),6):[0,1,10,16,22,22][k];
    R.label([XF,0,ZF+.85],(fwd?'sweeps ':'backward sweeps ')+cnt+' · multiply-adds '+macs,{mono:true,fs:12.5,c:fwd?P.c5:P.acc,b:1,wide:1,dy:24});
    if(!fwd){
      // reverse mode: one adjoint sweep from the loss
      if(k>=1){const a=k===1?1:.35;U.comb(R,[XP,YP,ZA],pbar,12,P.acc,a*(k===1?e:1),HM,1.05);R.label([XP,0,ZA+.45],'p̄',{mono:true,fs:13,b:1,c:P.acc,dy:6,a:Math.max(.5,a)});
        if(k===1){R.flow(U.path([XL,YP+.3,ZC],[XP,YP+.3,ZA],12),{c:P.acc,r:.07});R.label([XP,YP+1.15,ZA],'p̄ = (0, 0, '+U.f3(pbar[2])+')',{mono:true,fs:12.5,b:1,c:P.acc,wide:1,a:e})}}
      if(k>=2){const a=k===2?1:.35;U.comb(R,[XZ,YP,ZA],T.gz,1,P.acc,(k===2?e:1)*(k>=3&&k<=3?1:a),HM,1.05);R.label([XZ,0,ZA+.45],'z̄',{mono:true,fs:13,b:1,c:P.acc,dy:6});
        if(k===2){R.flow(U.path([XP,YP+.3,ZA],[XZ,YP+.3,ZA],14),{c:P.acc,r:.07});R.label([XZ,YP+1.15,ZA],'z̄ = Jᵀp̄ = '+U.vec(T.gz),{mono:true,fs:12.5,b:1,c:P.acc,wide:1,a:e})}}
      if(k===3){const tg=[XF,.6,ZF];R.flowArc([XZ,YP+.3,ZA],tg,.4,{c:P.acc,a:Math.min(1,e*1.6)});R.flowArc([XX,YP+.3,ZC],tg,.7,{c:P.c3,a:Math.min(1,e*1.6)});
        R.label([XF+.6,.95,ZF],'W̄ = z̄ xᵀ, all six at once',{mono:true,fs:12.5,b:1,c:P.acc,al:'left',wide:1,a:e})}
      if(k>=4){U.comb(R,[XX,YP,ZA],T.gx,2.4,P.acc,k===4?e:1,HM,.75);R.label([XX,0,ZA+.45],'x̄',{mono:true,fs:13,b:1,c:P.acc,dy:6});
        if(k===4){R.flow(U.path([XZ,YP+.3,ZA],[XX,YP+.3,ZA],14),{c:P.acc,r:.07});R.label([XX,YP+1.15,ZA],'x̄ = Wᵀz̄ = '+U.vec(T.gx),{mono:true,fs:12.5,b:1,c:P.acc,wide:1,a:e})}}
    }else if(sweep>=0){
      // forward mode: seed one weight, carry its tangent through the chain
      const r=JV[sweep],c=cell(sweep),g=Math.min(1,e*1.4);
      R.flowArc([c[0],.15,c[2]],[XZ,YP+.3,ZA],.5,{c:P.c5,a:g,r:.065,speed:1.4});
      U.comb(R,[XZ,YP,ZA],r.dz,2.4,P.c5,g,HM,1.05);R.label([XZ,0,ZA+.45],'ż',{mono:true,fs:13,b:1,c:P.c5,dy:6});
      R.flow(U.path([XZ,YP+.3,ZA],[XP,YP+.3,ZA],14),{c:P.c5,a:g,r:.065,speed:1.4});
      U.comb(R,[XP,YP,ZA],r.dp,.5,P.c5,g,HM,1.05);R.label([XP,0,ZA+.45],'ṗ',{mono:true,fs:13,b:1,c:P.c5,dy:6});
      R.flow(U.path([XP,YP+.3,ZA],[XL,YP+.3,ZA],8),{c:P.c5,a:g,r:.065,speed:1.4});
      R.box([XL,YP-.05,ZA],[.4,Math.max(.014,Math.abs(r.dL)/2*HM),.4],{fill:r.dL>=0?P.c5:S3.mix(P.paper,P.c5,.4),a:g,shadow:false});R.label([XL,0,ZA+.45],'L̇',{mono:true,fs:13,b:1,c:P.c5,dy:6});
      R.label([XZ,YP+1.15,ZA],'seed W['+words[r.i]+', '+(r.j+1)+'] · ż = '+U.vec(r.dz,v=>String(v)),{mono:true,fs:12.5,b:1,c:P.c5,wide:1,a:e});
      R.label([XL,YP+1.15,ZA],'L̇ = '+U.f3(r.dL),{mono:true,fs:12.5,b:1,c:P.c5,wide:1,a:e})
    }
  }
  const full={cam:[-.58,.7],bounds:[[-5.6,0,-2.6],[2.4,1.2,2.2]]};
  const st=S3.stage({id:'stg-fr',list:'sx-fr-rev',fig:'Fig. 3 · six slopes of the tiny model',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,10,8]:[18,14,14,14]});
  const seg=document.getElementById('mc-fr-mode');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;seg.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));
    ['rev','fwd'].forEach(m=>{const l=document.getElementById('sx-fr-'+m);if(l)l.hidden=m!==mode});st.list('sx-fr-'+mode)});
})();
