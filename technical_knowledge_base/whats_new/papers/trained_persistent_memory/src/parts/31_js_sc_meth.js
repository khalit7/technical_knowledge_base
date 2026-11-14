// ---- Scene: Fig. 1, where each of the six methods attaches the persistent bank to the frozen Flan-T5-XL (renderer v2: towers of layers, glass plates for the projections, flowing dots where data moves) ----
// Sizes from Flan-T5-XL's configuration (inputs/flan_t5_xl_config.json, through recompute.py: 24 encoder and 24 decoder layers, d = 2,048);
// bank sizes from §6.2 (64 rows at 1x, 640 at 10x; M.4's d_h = 256 or 810; M.6's 64 slots, top 8); parameter counts from recompute.py (PAPER.rc.params)
// and Table 2 as printed (PAPER.tables.t2). Token counts drawn (6 per turn, 3 soft tokens, 3 memory positions) are illustrative.
// Eight steps; the step list is #sx-meth. Write paths are orange (no gradient), read paths blue (trained).
(function(){
  if(!document.getElementById('stg-meth')||!window.PAPER)return;const {at,off,mix}=S3;const RC=PAPER.rc,PR=RC.params,BB=RC.backbone;
  const NL=BB.layers,PITCH=.062,TH=.042,SD=1.15,EX=-3.0,DX=1.75,ZX=-.75,TX=-5.0,AX=3.65,BZ=-2.35,WZ=-1.25;
  const TOP=NL*PITCH,TZ=[-.75,-.45,-.15,.15,.45,.75],ZZ=[-.6,-.3,0,.3,.6],MZ=[.95,1.25,1.55],SZ=[-1.05,-1.35,-1.65];
  const BX0=-1.95,BW=2.4,BY0=.12,BH=1.3;
  const M=v=>(v/1e6).toFixed(2)+'M';
  function draw(R,k,e){const P=R.P,frozen=mix(P.paper,P.mute,.28),RD=P.c1,WR=P.c2,BK=P.c5;R.grid(-5.8,4.4,-3.0,2.2,.5);
    // how strongly the frozen model shows: full in steps 1 and 8, receded while a step is about the bank
    const base=k===0||k===7?1:.32,bank=k===0?0:k===1?e:k===5?1-.85*e:k===6?.6:k===7?1:.85;
    // (step 5 looks right of the encoder, at the bank and its rule, so the encoder, cut by that view, fades further)
    // 1. the frozen model: the turn's tokens, 24 encoder layers, Z, 24 decoder layers, the answer
    TZ.forEach(z=>R.box([TX,0,z],[.2,.2,.2],{fill:P.paper,a:base}));
    for(let l=0;l<NL;l++){R.box([EX,l*PITCH,0],[SD,TH,SD],{fill:frozen,a:k===4?.1:base,shadow:l===0,lw:.6});R.box([DX,l*PITCH,0],[SD,TH,SD],{fill:frozen,a:base,shadow:l===0,lw:.6})}
    ZZ.forEach(z=>R.box([ZX,0,z],[.22,.22,.22],{fill:mix(P.paper,P.ink,.12),a:Math.max(base,k===2||k===3||k===5?.9:0)}));
    for(let i=0;i<3;i++)R.box([AX,0,-.3+.3*i],[.2,.2,.2],{fill:P.paper,a:base});
    const la=k===0?e:k===7?1:0;
    R.label([TX,.2,.9],'turn xₜ',{fs:12,dy:14,c:P.mute,a:la,wide:1});
    R.label([EX,TOP,0],'encoder E · frozen · '+NL+' layers',{fs:12.5,b:1,dy:-10,a:la,c:P.ink});
    R.label([DX,TOP,0],'decoder D · frozen · '+NL+' layers',{fs:12.5,b:1,dy:-10,a:la||(k===3||k===6?.9:0),c:P.ink});
    R.label([ZX,0,ZZ[4]],'Zₜ · n × '+BB.d_model.toLocaleString('en-GB'),{mono:true,fs:12,dy:18,c:P.ink,a:k===0?e:k===1?1:0,wide:1});
    R.label([AX,.2,.6],'answer ŷₜ',{fs:12,dy:16,c:P.mute,a:la,wide:1});
    if(k===0){const a=e;TZ.forEach(z=>R.flow([[TX+.1,.1,z],[EX-SD/2-.05,.1,z*.6],[EX-SD/2-.05,TOP-.1,z*.6]],{c:P.mute,a,r:.045,n:6,speed:1.3}));
      R.flowArc([EX+.2,TOP,0],[ZX,.25,0],.35,{c:P.mute,a,r:.06,n:10});
      [4,10,16,22].forEach(l=>R.flowArc([ZX,.22,0],[DX-SD/2,l*PITCH,0],.25,{c:P.mute,a:a*.8,r:.045,n:7}));
      R.flow([[DX,TOP,0],[DX+.9,TOP,0],[AX,.25,0]],{c:P.mute,a,r:.05,n:8});
      R.label([ZX,0,ZZ[4]],'Zₜ is thrown away after the answer',{fs:12,c:P.bad,dy:36,a:e,wide:1})}
    // 2. the bank and the write rule: Q from Z, K from the bank, V from Z through three fixed random plates, then P <- 0.95 P + A^T V
    if(bank>0){R.glass([BX0,BY0,BZ],[BW,0,0],[0,BH,0],{c:BK,a:bank,nu:8,nv:16});
      R.label([BX0+BW/2,BY0+BH+.12,BZ],k===4?'P · 64 slots (one band = 4 slots)':k===5?'':(R.W<520?'bank P · 64 × 2,048':'bank P · 64 × 2,048 (640 × 2,048 at 10x)'),{mono:true,fs:12,dy:-8,c:mix(BK,P.ink,.35),a:k===1?e:k>=3&&k!==5?1:0,wide:k!==1})}
    const wp=k===1?e:k===2||k===3||k===6?.3:k===4?.3:k===7?.55:0,WX=[-1.55,-.75,.05];
    [['W_Q',P.q],['W_K',P.k],['W_V',P.v]].forEach(([n,c],i)=>{if(wp<=0)return;R.glass([WX[i]-.22,.3,WZ],[.44,0,0],[0,.5,0],{c,a:wp,nu:4,nv:4});
      R.label([WX[i],.8,WZ],n,{mono:true,fs:12,b:1,dy:-6,c,a:k===1?e:0,wide:1})});
    if(k===1){R.flowArc([ZX,.22,ZZ[0]],[WX[0],.55,WZ],.3,{c:P.q,a:e,r:.06,n:7});R.flowArc([BX0+BW/2-.8,.6,BZ],[WX[1],.55,WZ],.25,{c:P.k,a:e,r:.06,n:6});
      R.flowArc([ZX,.22,ZZ[0]],[WX[2],.55,WZ],.3,{c:P.v,a:e,r:.06,n:7});R.flowArc([WX[2],.6,WZ],[BX0+BW/2+.3,.9,BZ],.3,{c:WR,a:e,r:.08,n:10,speed:1.2});
      R.label([BX0+BW,BY0+BH*.45,BZ],'P ← 0.95 P + AᵀV · no gradient',{mono:true,fs:12.5,b:1,al:'left',dx:12,c:WR,a:e,wide:1})}
    // 3. M.1: the bank as soft tokens in front of the encoder, through the trained W_P
    const m1=k===2?e:k===7?1:0,PX=-4.6,PZ=-2.3;
    if(m1>0){SZ.forEach(z=>R.box([TX,0,z],[.2,.2,.2],{fill:mix(P.paper,RD,.55),a:m1}));
      if(k===2){R.glass([PX-.25,.3,PZ],[.5,0,0],[0,.5,0],{c:RD,a:m1,nu:4,nv:4});R.label([PX,.8,PZ],'W_P · trained',{mono:true,fs:12,dy:-6,c:RD,a:m1,wide:1});
        R.flowArc([BX0,.7,BZ],[PX,.55,PZ],.35,{c:RD,a:e,r:.07,n:10});R.flowArc([PX,.5,PZ],[TX,.2,SZ[1]],.2,{c:RD,a:e,r:.06,n:6});
        SZ.concat(TZ.slice(0,2)).forEach(z=>R.flow([[TX+.1,.1,z],[EX-SD/2-.05,.1,z*.5],[EX-SD/2-.05,TOP-.1,z*.5]],{c:z<-.9?RD:P.mute,a:e*.8,r:.045,n:6}));
        R.label([TX,0,SZ[0]],'soft tokens S = U_P P W_P',{mono:true,fs:12,al:'right',dx:-12,dy:8,c:RD,a:e,grp:'side'})}
      if(k===7)R.label([TX,0,SZ[0]],'M.1',{mono:true,fs:12.5,b:1,al:'right',dx:-22,dy:10,c:RD,grp:'side'})}
    // 4, 5, 6 and 8: extra memory positions beside Z, read by every decoder layer's frozen cross-attention
    const ext=k===3||k===4||k===5?(k===3?e:1):k===7?1:k===6?.25:0,MX=.55;
    if(ext>0){MZ.forEach(z=>R.box([ZX,0,z],[.22,.22,.22],{fill:mix(P.paper,RD,.55),a:ext}));
      if(k!==6)R.glass([MX-.25,.3,.95],[0,0,.6],[0,.5,0],{c:RD,a:k===7?.5:ext,nu:4,nv:4});
      if(k===3||k===4||k===5){R.label([MX,.8,1.25],'W_Mem · trained',{mono:true,fs:12,dy:-6,c:RD,a:ext,wide:1});
        const src=k===5?[-.75,.9,BZ+.9]:[BX0+BW,.8,BZ];R.flowArc(src,[MX,.55,1.0],.45,{c:RD,a:k===3?e:1,r:.07,n:12});R.flowArc([MX,.5,1.25],[ZX,.22,MZ[1]],.15,{c:RD,a:k===3?e:1,r:.06,n:5});
        [4,10,16,22].forEach(l=>R.flowArc([ZX,.22,MZ[0]],[DX-SD/2,l*PITCH,.3],.25,{c:RD,a:(k===3?e:1)*.7,r:.045,n:6}));
        R.label([ZX,.11,MZ[2]],k===5?'R = (Z W_Q,H) M, appended to Z':'n + 64 keys and values',{mono:true,fs:12,al:'left',dx:24,c:RD,a:k===3?e:1,wide:1})}
      if(k===7){R.label([ZX,.11,MZ[2]],'M.2 to M.6',{mono:true,fs:12.5,b:1,al:'left',dx:24,c:RD});
        R.flowArc([BX0+BW,.8,BZ],[MX,.55,1.0],.45,{c:RD,a:.8,r:.06,n:10});[4,10,16,22].forEach(l=>R.flowArc([ZX,.22,MZ[0]],[DX-SD/2,l*PITCH,.3],.25,{c:RD,a:.6,r:.045,n:6}));
        R.flowArc([BX0,.7,BZ],[TX,.2,SZ[1]],.3,{c:RD,a:.8,r:.06,n:10});R.flowArc([ZX,.22,0],[BX0+BW/2,.9,BZ],.3,{c:WR,a:.7,r:.06,n:8})}}
    // 5. M.6: only the 8 best-scoring of 64 slots move towards the new vector (2 of the 16 bands drawn); the rest keep their content
    if(k===4){const bh=BH/16,bands=[3,11];bands.forEach(b=>{const y=BY0+BH-(b+1)*bh;R.quad([[BX0,y,BZ+.01],[BX0+BW,y,BZ+.01],[BX0+BW,y+bh,BZ+.01],[BX0,y+bh,BZ+.01]],{fill:WR,a:.75*e});
        R.flowArc([ZX,.22,ZZ[0]],[BX0+BW*.7,y+bh/2,BZ],.25,{c:WR,a:e,r:.06,n:8})});
      R.label([BX0+BW,BY0+BH-3.5*bh,BZ],'top 8 of 64 slots: P[s] ← γP[s] + (1 − γ)u',{mono:true,fs:12,al:'left',dx:16,c:WR,a:e,grp:'side'});
      R.label([BX0+BW,BY0+BH-9*bh,BZ],'the other 56: untouched, no decay',{mono:true,fs:12,al:'left',dx:16,c:mix(BK,P.ink,.35),a:e,grp:'side'})}
    // 6. M.4: a 256 x 256 matrix written by an outer product, read with a trained query
    if(k===5){const hx=-.75,hy=.25,hs=.95;R.glass([hx-hs/2,hy,BZ+.9],[hs,0,0],[0,hs,0],{c:P.c3,a:e,nu:8,nv:8});
      R.label([hx,hy+hs,BZ+.9],'M · 256 × 256 (810 × 810 at 10x)',{mono:true,fs:12,dy:-12,c:P.c3,a:e});
      R.flowArc([ZX,.22,ZZ[0]],[hx-.2,hy+.5,BZ+.9],.25,{c:WR,a:e,r:.06,n:7});R.flowArc([ZX,.22,ZZ[1]],[hx+.2,hy+.5,BZ+.9],.3,{c:WR,a:e,r:.06,n:7});
      R.label([hx,hy+hs,BZ+.9],'M ← γM + (1/n)(Z W_K,H)ᵀ(Z W_V,H), norm ≤ 1',{mono:true,fs:12,dy:-30,c:WR,a:e,wide:1})}
    // 7. M.2 and M.5 as designed: a cross-attention over the bank inside every decoder block (beta or a gate on each)
    if(k===6){[1,5,9,13,17,21].forEach((l,i)=>{const y=l*PITCH+.02;R.flowArc([BX0+BW,.4+i*.15,BZ],[DX-SD/2,y,-.4],.3,{c:RD,a:e,r:.05,n:8,speed:1.2});R.ball([DX-SD/2-.05,y,-.4],.06,{c:P.c5,a:e})});
      R.label([DX-SD/2,0,.7],'a branch in each of 24 blocks: + β·read (M.2) or × gate g (M.5)',{mono:true,fs:12,al:'right',dx:-6,dy:16,c:RD,a:e,grp:'side'})}
    // 8. as run
    if(k===7)R.label([(TX+AX)/2,0,2.0],'as run, five of six enter as extra positions in cross-attention · '+M(PR['M.4'].count)+' to '+M(PR['M.5'].count)+' trained',{fs:13,b:1,dy:24,c:P.ink,wide:1});
  }
  const full={cam:[.42,.6],bounds:[[-5.6,0,-2.6],[4.0,1.9,2.0]]};
  const VIEWS=[full,{cam:[.3,.55],bounds:[[-2.4,0,-2.6],[2.2,1.6,.9]]},{cam:[.55,.55],bounds:[[-6.4,0,-2.6],[-.6,1.7,.9]]},
    {cam:[.3,.6],bounds:[[-2.0,0,-2.6],[2.6,1.7,1.8]]},{cam:[.3,.5],bounds:[[-1.9,0,-2.6],[4.0,1.6,1.6]]},{cam:[.3,.55],bounds:[[-2.4,0,-2.6],[1.0,1.5,1.8]]},
    {cam:[.2,.55],bounds:[[-2.2,0,-2.6],[2.5,1.8,.8]]},full];
  window.METH={steps:8,rc:RC};
  S3.stage({id:'stg-meth',list:'sx-meth',fig:'Fig. 1 · where each method attaches the bank',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5600,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,20,16],view:k=>VIEWS[k]});
})();
