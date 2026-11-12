// ---- Scene, Fig. 1 (section 1, the hero): one H100 SXM drawn to its published counts (window.GA.chips: 144 SMs on the full die, 132 enabled,
// 8 GPCs of 18, 50 MB L2, 6 HBM sites with 5 used), the GPC plan with the disabled SMs from window.GA_PLAN (positions illustrative, as the
// caption says), one SM opened (4 quadrants, 64 KB of registers each, a tensor core each, 256 KB L1 / shared), and the ladder our tile climbs
// with Luo et al.'s H800 latencies (window.GA.luo.H800, cycles). Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.GA||!window.GA_PLAN)return;const {at,off,mix}=S3;
  const G=window.GA,h=G.chips.find(c=>c.id==='h100'),PL=window.GA_PLAN.h100.dies[0],L=G.luo.H800,f=n=>Number(n).toLocaleString('en-US');
  // die and its GPCs: 4 columns x 2 rows around the L2 band; each GPC 6 x 3 SM slots (18 = 144 / 8)
  const DX=3,DZ=2.2,L2D=.5,GW=1.5,GD=(2*DZ-L2D)/2,per=h.sm_full/h.gpc_full;
  const SMS=[];PL.gpcs.forEach((g,gi)=>{const col=gi%4,row=gi<4?0:1,x0=-DX+col*GW,z0=row?L2D/2:-DZ;
    for(let s=0;s<g[0];s++){const c=s%6,r=Math.floor(s/6);SMS.push({p:[x0+.16+(c+.5)*(GW-.32)/6,0,z0+.12+(r+.5)*(GD-.24)/3],on:s<g[1],gi})}});
  const nOn=SMS.filter(s=>s.on).length;
  if(nOn!==h.sm_on||SMS.length!==h.sm_full)window.__jsErr&&window.__jsErr('hero SM count differs from GA.chips');
  const HI=SMS.findIndex((s,i)=>s.gi===1&&s.on&&i%18===8);
  window.GA_HERO={on:nOn,full:SMS.length,gpcs:PL.gpcs.length}; // checked by check/check_stages.mjs
  const SX=7.6,QX=[SX-.95,SX+.95],QZ=[-1.25,.45],SHZ=1.85; // the opened SM, to the right of the package
  const site=(s,k)=>[s?DX+.95:-DX-.95,0,-1.47+k*1.47];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-5,10.5,-3,3,.5);
    const dieA=k===2?.3:1;
    // 1. the package: the die and six HBM sites, five used
    R.box([0,0,0],[2*DX+.1,.08,2*DZ+.1],{fill:mix(P.paper,P.ink,.06),a:dieA,dz:100});
    for(let s=0;s<2;s++)for(let q=0;q<3;q++){const on=!(s===1&&q===2),c=site(s,q);
      if(on)R.box(c,[.9,.55,1.25],{fill:mix(P.paper,P.c2,.55),a:dieA});else R.quad([[c[0]-.45,.01,c[2]-.62],[c[0]+.45,.01,c[2]-.62],[c[0]+.45,.01,c[2]+.62],[c[0]-.45,.01,c[2]+.62]],{ec:P.mute,dash:[4,3],a:dieA*.9})}
    if(k===0){lab([-DX-.95,.55,-1.47],'HBM3',{dy:-12,b:1,c:P.c2});lab([-DX-.95,0,1.47],h.gb+' GB · '+h.tbs+' TB/s',{dy:20,fs:12,c:P.c2,a:e});
      lab([DX+.95,0,1.47],'unused site',{dy:20,fs:12,c:P.mute,a:e});lab([0,.08,0],'one die · '+h.area+' mm²',{b:1,a:e})}
    // 2. the SMs rise GPC by GPC; the disabled ones stay grey and flat; the L2 band across the middle
    const sa=k===0?0:k===1?1:k===2?.25:.35;
    if(sa>0){SMS.forEach((s,i)=>{const t=k===1?Math.max(0,Math.min(1,e*1.6-s.gi*.075)):1,hi=i===HI&&k>=1;
        R.box([s.p[0],.08,s.p[2]],[.17,s.on?.1+.12*t:.03,.44],{fill:hi?P.acc:s.on?mix(P.paper,P.c3,.55):P.line,a:hi?1:sa*(s.on?Math.max(.15,t):.8),shadow:false,lw:.5})});
      PL.gpcs.forEach((g,gi)=>{const col=gi%4,row=gi<4?0:1,x0=-DX+col*GW+.05,z0=(row?L2D/2:-DZ)+.05;
        R.quad([[x0,.09,z0],[x0+GW-.1,.09,z0],[x0+GW-.1,.09,z0+GD-.1],[x0,.09,z0+GD-.1]],{ec:P.c3,a:sa*.7,lw:1,dz:60})});
      R.box([0,.08,0],[2*DX-.2,.06,L2D-.12],{fill:mix(P.paper,P.c4,.5),a:sa*(k===1?e:1),shadow:false,dz:40})}
    if(k===1){lab([-DX+.75,.3,-DZ],'GPC · '+per+' SMs',{dy:-12,fs:12,c:P.c3,a:e});lab([0,.2,0],'L2 · '+h.l2_mb+' MB',{b:1,c:P.c4,a:e});
      lab([DX,.3,DZ],h.sm_on+' of '+h.sm_full+' SMs on',{dy:16,b:1,c:P.c3,al:'right',a:e})}
    // 3. one SM opened beside the package: four quadrants (scheduler, registers, tensor core) around the shared store
    const ba=k<2?0:k===2?e:1;
    if(ba>0){const hs=SMS[HI].p;
      if(k===2)R.flowArc([hs[0],.3,hs[2]],[SX,.6,0],1.2,{c:P.acc,a:ba*.7,r:.05,n:7,speed:1.4});
      R.box([SX,0,-.35],[4,.06,4.5],{fill:mix(P.paper,P.ink,.05),a:ba,dz:100});
      for(const qx of QX)for(const qz of QZ){
        R.quad([[qx-.85,.065,qz-.05],[qx+.85,.065,qz-.05],[qx+.85,.065,qz+1.3],[qx-.85,.065,qz+1.3]],{fill:mix(P.paper,P.c1,.08),ec:P.c1,a:ba*.8,dz:60});
        R.box([qx,.06,qz+.15],[1.5,.1,.22],{fill:mix(P.paper,P.c1,.45),a:ba,shadow:false});
        R.box([qx-.4,.06,qz+.8],[.6,.45,.6],{fill:mix(P.paper,P.c5,.6),a:ba*(k===3?.45:1),shadow:false});
        R.box([qx+.42,.06,qz+.8],[.5,.38,.5],{fill:P.acc,a:ba,shadow:false})}
      R.box([SX,.06,SHZ],[3.7,.18,.55],{fill:mix(P.paper,P.c6,.55),a:ba,shadow:false});
      if(k===2){lab([QX[0],.16,QZ[0]+.15],'warp scheduler',{dy:-12,fs:12,c:P.c1,a:e});lab([QX[0]-.4,.5,QZ[1]+.8],'64 KB registers',{dy:-14,fs:12,c:P.ink,a:e});
        lab([QX[1]+.42,.44,QZ[0]+.8],'tensor core',{dy:-12,fs:12,b:1,c:P.acc,a:e});lab([SX,.24,SHZ],'L1 / shared · '+h.l1_kb+' KB',{dy:18,fs:12,c:P.c6,a:e});
        lab([SX,0,-2.6],'one SM · 4 quadrants',{b:1,a:e})}}
    // 4. the ladder: HBM to L2 to shared memory to the tensor cores, each rung closer
    if(k===3){const hb=[-DX-.95,.6,0],l2=[0,.2,0],sh=[SX,.3,SHZ],tc=[QX[1]+.42,.44,QZ[1]+.8];
      R.flowArc(hb,l2,.6,{c:P.c2,a:e,r:.07,n:7,speed:1.2});R.flowArc(l2,sh,1.3,{c:P.c4,a:e,r:.07,n:9,speed:1.5});R.flowArc(sh,tc,.5,{c:P.c6,a:e,r:.07,n:5,speed:1.1});
      lab(hb,'HBM · '+Math.round(L.glob)+' cycles',{dy:-14,b:1,c:P.c2,a:e});lab([0,.25,-.1],'L2 · '+Math.round(L.l2),{dy:-14,b:1,c:P.c4,a:e});
      lab([SX,.3,SHZ],'shared · '+Math.round(L.smem),{dy:18,b:1,c:P.c6,a:e});lab([SX,.4,-2.5],'tensor cores · '+f(G.tile.h100_fma_clk_sm)+' FMAs / clock',{dy:-14,b:1,c:P.acc,a:e})}
  }
  const die={cam:[.18,.95],bounds:[[-4.7,0,-2.5],[4.7,.6,2.5]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one H100 SXM, drawn to its counts',cam:[.12,.85],bounds:[[-4.8,0,-2.7],[9.8,.9,2.6]],aspect:.52,dur:1500,hold:4800,draw,
    view:k=>k<=1?die:k===2?{cam:[.25,.72],bounds:[[5.2,0,-2.7],[10,.7,2.3]]}:null,
    margin:w=>w<520?[16,10,16,10]:[24,24,24,24]});
  (window.GASTG=window.GASTG||{})['stg-hero']=st;
})();
