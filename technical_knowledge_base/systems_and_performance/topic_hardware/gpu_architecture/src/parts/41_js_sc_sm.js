// ---- Scene, Fig. 2 (section 2): one SM drawn to its published counts, then changed generation: H100, A100, B200 / B300, RTX 5090.
// Counts per generation from window.GA_SM (24_js_rd_sm.js, sourced in the table under the figure): FP32 lanes per quadrant, L1 + shared and the
// largest shared carve-out (the SRAM slab's length is to scale of 256 KB), TMA, tensor memory, resident warps (slots per scheduler = warps / 4).
// The accumulators of the running tile (window.GA.tile.acc_bytes, 64 KB) are a quarter of the 256 KB register file. Not to silicon area.
// Steps are explained by #sx-sm on the left. ----
(function(){
  if(!document.getElementById('stg-sm')||!window.GA_SM)return;const {at,off,mix,lerp}=S3;
  const S=window.GA_SM,T=window.GA.tile,ACC=T.acc_bytes/(256*1024);
  const GEN=['h100','h100','h100','a100','b300','rtx5090'];
  window.GA_SMSC={acc:ACC,gen:GEN.map(g=>({g,lanes:S[g].lanes,l1:S[g].l1,smem:S[g].smem,tmem:S[g].tmem,warps:S[g].warps,tma:S[g].tma}))}; // checked by check/check_stages.mjs
  const QX=[-1.5,1.5],QZ=[-2.05,-.2],SL=5.6,SZ=1.75,MZ=2.65;
  function quad(R,qx,qz,g,a,k,e,pg){const P=R.P;
    R.quad([[qx-1.4,.05,qz-.15],[qx+1.4,.05,qz-.15],[qx+1.4,.05,qz+1.55],[qx-1.4,.05,qz+1.55]],{fill:mix(P.paper,P.c1,.06),ec:P.c1,a:a*.8,dz:60});
    // the scheduler's warp slots along the back: 16 per scheduler (12 on the RTX 5090)
    const ns=g.warps/4,np=pg.warps/4;for(let i=0;i<16;i++){const on=i<ns,was=i<np,al=on&&was?1:on?e:was?1-e:0;
      R.box([qx-1.2+i*.16,.05,qz+.05],[.12,.12,.12],{fill:mix(P.paper,P.c1,.55),a:a*Math.max(al,.0),shadow:false,lw:.5});
      if(!on&&!was||al<.05)R.quad([[qx-1.26+i*.16,.06,qz-.01],[qx-1.14+i*.16,.06,qz-.01],[qx-1.14+i*.16,.06,qz+.11],[qx-1.26+i*.16,.06,qz+.11]],{ec:P.mute,dash:[2,2],a:a*.6,dz:30})}
    // the register slice: 64 KB in every generation; the top quarter holds the tile's accumulators while they live in registers
    const accOn=k===2||k===3?1:k===4?1-e:0,rh=.7;
    R.box([qx-.95,.05,qz+.75],[.65,rh*(1-ACC),.65],{fill:mix(P.paper,P.c5,.6),a,shadow:false});
    R.box([qx-.95,.05+rh*(1-ACC),qz+.75],[.65,rh*ACC,.65],{fill:accOn>.01?mix(mix(P.paper,P.c5,.6),mix(P.paper,P.acc,.45),accOn):mix(P.paper,P.c5,.6),a,shadow:false});
    // FP32 lanes: 8 per row
    const nl=g.lanes,pl=pg.lanes;for(let i=0;i<32;i++){const on=i<nl,was=i<pl,al=on&&was?1:on?e:was?1-e:0;if(al<.02)continue;
      R.box([qx-.2+(i%8)*.13,.05,qz+.45+Math.floor(i/8)*.18],[.1,.12,.12],{fill:mix(P.paper,P.c3,.6),a:a*al,shadow:false,lw:.4})}
    R.box([qx+.95,.05,qz+.75],[.55,.48,.55],{fill:P.acc,a,shadow:false})}
  let PG=0;
  function draw(R,k,e,st){const P=R.P,g=S[GEN[k]],pg=S[GEN[st&&st.pk!=null&&e<1?st.pk:k]]||g,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-4.5,4.5,-3.2,3.6,.5);
    R.box([0,0,0],[6.2,.05,6.5],{fill:mix(P.paper,P.ink,.05),dz:100});
    const qa=k===1?.45:1;
    for(const qx of QX)for(const qz of QZ)quad(R,qx,qz,g,qa,k,e,pg);
    // the shared SRAM: L1 + shared, the shared carve-out darker; the TMA beside it
    const l1=lerp(pg.l1,g.l1,e)/256*SL,sm=lerp(pg.smem,g.smem,e)/256*SL,x0=-SL/2;
    if(l1-sm>.02)R.box([x0+sm+(l1-sm)/2,.05,SZ],[l1-sm,.16,.6],{fill:mix(P.paper,P.c6,.15),shadow:false});
    R.box([x0+sm/2,.05,SZ],[sm,.24,.5],{fill:mix(P.paper,P.c6,.7),shadow:false});
    const tmaA=(g.tma?1:0)*(pg.tma?1:e)+(!g.tma&&pg.tma?1-e:0);
    if(tmaA>.02){R.box([SL/2+.05,.05,SZ+.85],[.6,.35,.5],{fill:mix(P.paper,P.c6,.85),a:tmaA});
      if(k===1)R.flow([[SL/2+.05,.3,3.6],[SL/2+.05,.35,SZ+.85],[sm*.6+x0,.3,SZ]],{c:P.c6,a:e,r:.07,speed:1.3})}
    // tensor memory (Blackwell datacenter): 256 KB, the accumulators move into it
    const tmA=g.tmem?(pg.tmem?1:e):(pg.tmem?1-e:0);
    if(tmA>.02){R.box([0,.05,MZ],[g.tmem/256*SL||SL,.22,.45],{fill:mix(P.paper,P.c4,.6),a:tmA,shadow:false});
      if(k===4)for(const qx of QX)R.flowArc([qx-.95,.75,QZ[1]+.75],[qx*.8,.3,MZ],.6,{c:P.acc,a:e,r:.06,n:6,speed:1.2})}
    // labels: the generation, then what each step is about
    lab([0,.4,-3.0],{0:'H100 SM',1:'H100 SM',2:'H100 SM',3:'A100 SM',4:'B200 / B300 SM',5:'RTX 5090 SM'}[k],{b:1,fs:13.5});
    const L=(p,t,o)=>lab(p,t,Object.assign({a:k===0||k>=3?e:1},o||{}));
    if(k===0){L([QX[1],.2,QZ[0]+.05],'scheduler · 16 warp slots',{dy:-12,c:P.c1});L([QX[1]-.95,.75,QZ[1]+.75],'64 KB registers',{dy:-12});
      L([QX[1]+.25,.15,QZ[1]+1.05],'32 FP32 lanes',{dy:14,c:P.c3});L([QX[1]+.95,.5,QZ[1]+.75],'tensor core',{dy:-12,b:1,c:P.acc,al:'left',dx:-10})}
    if(k===1){lab([x0,.25,SZ],'L1 + shared · '+g.l1+' KB (up to '+g.smem+' shared)',{dy:-14,al:'left',c:P.c6,b:1});lab([SL/2+.05,.4,SZ+.85],'TMA',{dy:-12,b:1,c:P.c6})}
    if(k===2)lab([QX[1]-.95,.75,QZ[1]+.75],'accumulators · 16 KB of 64 per quadrant',{dy:-14,b:1,c:P.acc});
    if(k===3){L([QX[1]+.25,.15,QZ[1]+.85],g.lanes+' FP32 lanes per quadrant',{dy:14,c:P.c3,b:1});L([x0,.25,SZ],g.l1+' KB (up to '+g.smem+' shared)',{dy:-14,al:'left',c:P.c6,b:1});L([SL/2-.2,.1,SZ+.85],'no TMA',{dy:14,c:P.mute})}
    if(k===4)L([0,.27,MZ],'tensor memory · '+g.tmem+' KB',{dy:16,b:1,c:P.c4});
    if(k===5){L([QX[1],.2,QZ[0]+.05],g.warps/4+' warp slots per scheduler',{dy:-12,c:P.c1,b:1});L([x0,.25,SZ],g.l1+' KB (up to '+g.smem+' shared)',{dy:-14,al:'left',c:P.c6,b:1})}
  }
  const st=S3.stage({id:'stg-sm',list:'sx-sm',fig:'Fig. 2 · one SM, drawn to its counts',cam:[.32,.78],bounds:[[-3.4,0,-3.1],[3.4,.8,3.1]],aspect:.72,dur:1500,hold:4800,draw,margin:w=>w<520?[16,10,16,10]:[28,24,22,24]});
  (window.GASTG=window.GASTG||{})['stg-sm']=st;
})();
