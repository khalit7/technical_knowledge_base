// ---- Scene, Fig. 2 (section 4): HBM against GDDR7, from window.MEMD. H100 SXM: 5 HBM3 stacks of 1,024 bits (chips h100: 80 GB, 3.35 TB/s;
// the pin rate nums.h100_pin_gbps derived as bandwidth x 8 / 5,120). RTX 5090: a 512-bit GDDR7 bus at 28 Gb/s (nums.rtx5090_gbs = 1,792 GB/s,
// the rate is 1,792 x 8 / 512), 32 GB. Energy per bit nums.hbm2_pj and nums.gddr5_pj (O'Connor et al. 2017). One lane is drawn per 64 wires
// (16 per stack, 8 for the GDDR7 bus) and the dots move at a speed proportional to the pin rate. The 8 DRAM dies per stack, the 8 GDDR7
// packages (one per 64 bits) and all positions and sizes are illustrative, as the note under the step list says. ----
(function(){
  if(!document.getElementById('stg-hbm')||!window.MEMD)return;const {at,off,mix}=S3;
  const D=window.MEMD,h=D.chips.find(c=>c.id==='h100'),g=D.chips.find(c=>c.id==='rtx5090'),N=D.nums;
  const HW=5*1024,HR=N.h100_pin_gbps,GW=512,GR=N.rtx5090_gbs*8/GW,HL=HW/64,GL=GW/64;
  window.MT_HBM={hw:HW,hr:HR,hgbs:HW*HR/8,gw:GW,gr:GR,ggbs:GW*GR/8,lanesH:HL,lanesG:GL,bwx:(h.tbs*1000)/N.rtx5090_gbs,capx:h.gb/g.gb}; // checked by check/check_stages.mjs
  const HX=-3.2,GX=3.4,SX=[-1.08,1.08],SZ=[-.8,0,.8],DIES=8,f0=v=>Math.round(v).toLocaleString('en-US');
  const used=(i,j)=>!(i===1&&j===2),OPEN=[0,0];   // the stack opened in step 2: left column, back row
  const chips=[[-1.65,-.55],[-1.65,.55],[1.65,-.55],[1.65,.55],[-.55,-1.3],[.55,-1.3],[-.55,1.3],[.55,1.3]];
  function stack(R,c,k,e,a){const P=R.P,op=k===1?e:k>1?1-Math.min(1,k===2?e:1):0,gap=.055*op,dh=.04;
    R.box(c,[.55,.06,.66],{fill:mix(P.paper,P.ink,.22),a,shadow:false});
    for(let d=0;d<DIES;d++)R.box([c[0],c[1]+.06+d*(dh+gap)+gap,c[2]],[.55,dh,.66],{fill:mix(P.paper,P.c1,.35+.04*d),a,shadow:false,lw:.6});
    if(op>.05){const top=c[1]+.06+DIES*(dh+gap)+gap;[-.15,0,.15].forEach(dx=>[-.2,.2].forEach(dz=>R.line([[c[0]+dx,c[1]+.03,c[2]+dz],[c[0]+dx,top,c[2]+dz]],{c:P.c5,w:1.6,a:a*op})))}}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-6.2,6.4,-2.4,2.4,.5);
    const ha=k===3?.25:1,ga=k<3?.2:1;
    // H100: interposer, die, five stacks and an unused site
    R.box([HX,0,0],[3.0,.06,2.6],{fill:mix(P.paper,P.ink,.07),a:ha,dz:100});R.box([HX,.06,0],[1.3,.12,1.5],{fill:mix(P.paper,P.ink,.18),a:ha});
    SX.forEach((sx,i)=>SZ.forEach((sz,j)=>{const p=[HX+sx,.06,sz];if(!used(i,j)){R.quad([[p[0]-.27,.07,sz-.33],[p[0]+.27,.07,sz-.33],[p[0]+.27,.07,sz+.33],[p[0]-.27,.07,sz+.33]],{ec:P.mute,dash:[4,3],a:ha*.9});return}
      const isOpen=i===OPEN[0]&&j===OPEN[1];stack(R,p,isOpen?k:0,e,isOpen||k!==1?ha:.3)}));
    // the HBM bus: 16 lanes per stack (one per 64 wires) arching from the stack's top edge to the die; dots at a speed proportional to 5.23 Gb/s
    const hb=k===2?e:k===4?1:0;
    if(hb>0)SX.forEach((sx,i)=>SZ.forEach((sz,j)=>{if(!used(i,j))return;for(let l=0;l<16;l++){const z=sz-.3+.6*(l+.5)/16,a0=[HX+sx-Math.sign(sx)*.27,.42,z],b0=[HX+Math.sign(sx)*.5,.19,z];
      R.arc(a0,b0,.12,{c:P.c1,w:1,a:hb*.5});R.flowArc(a0,b0,.12,{c:P.c1,r:.03,n:2,speed:.12*HR,a:hb})}}));
    // RTX 5090: the board, the GPU package, eight GDDR7 packages; one lane per 64 bits at 28 Gb/s
    R.box([GX,0,0],[4.4,.05,3.6],{fill:mix(P.paper,P.good,.22),a:ga,dz:100});R.box([GX,.05,0],[1.5,.14,1.5],{fill:mix(P.paper,P.ink,.18),a:ga});
    chips.forEach(([dx,dz])=>R.box([GX+dx,.05,dz],[.5,.08,.5],{fill:mix(P.paper,P.c2,.55),a:ga,shadow:false}));
    const gb=k>=3?(k===3?e:1):0;
    if(gb>0)chips.forEach(([dx,dz])=>{const a0=[GX+dx,.14,dz],side=Math.abs(dx)>1?[GX+Math.sign(dx)*.76,.18,dz]:[GX+dx,.18,Math.sign(dz)*.76];const pts=[a0,side];
      R.line(pts,{c:P.c2,w:2.2,a:gb*.6});R.flow(pts,{c:P.c2,r:.06,n:3,speed:.12*GR,a:gb})});
    // labels
    if(k===0){lab([HX,.18,0],'H100 die',{b:1,a:e});lab([HX-1.08,.45,.8],'HBM3 stack',{dy:-14,c:P.c1,b:1,a:e});lab([HX,0,1.3],'silicon interposer · '+h.gb+' GB',{dy:18,a:e});lab([HX+1.08,.07,.8],'unused site',{dy:-12,fs:12,c:P.mute,a:e})}
    if(k===1){const c=[HX+SX[0],.06,SZ[0]];lab([c[0]+.3,.08,c[2]],'logic base die',{al:'left',dx:10,fs:12,a:e,grp:'st'});lab([c[0]+.3,.35,c[2]],'DRAM dies (8 drawn)',{al:'left',dx:10,fs:12,c:P.c1,b:1,a:e,grp:'st'});
      lab([c[0]-.3,.5,c[2]],'TSVs',{al:'right',dx:-10,fs:12,c:P.c5,b:1,a:e});lab([c[0],.06,c[2]+.4],'1,024 bits per stack',{dy:20,b:1,a:e})}
    if(k===2){lab([HX,.2,-1.25],'5 × 1,024 = '+f0(HW)+' wires',{dy:-14,b:1,c:P.c1,a:e});lab([HX,.1,1.3],'× '+HR.toFixed(2)+' Gb/s / 8 = '+f0(HW*HR/8)+' GB/s',{dy:18,b:1,a:e})}
    if(k===3){lab([GX,.19,0],'RTX 5090',{b:1,a:e});lab([GX,.1,-1.6],GW+' wires × '+f0(GR)+' Gb/s / 8 = '+f0(N.rtx5090_gbs)+' GB/s',{dy:-14,b:1,c:P.c2,a:e});lab([GX+1.65,.13,.55],'GDDR7',{dy:-12,fs:12,c:P.c2,a:e});lab([GX,0,1.8],'on the board · '+g.gb+' GB',{dy:18,a:e})}
    if(k===4){lab([HX,.5,-1.3],'HBM: '+f0(h.tbs*1000)+' GB/s · '+h.gb+' GB',{dy:-14,b:1,c:P.c1,a:e});lab([HX,0,1.3],'HBM2 ≈ '+N.hbm2_pj+' pJ per bit',{dy:18,a:e});
      lab([GX,.5,-1.8],'GDDR7: '+f0(N.rtx5090_gbs)+' GB/s · '+g.gb+' GB',{dy:-14,b:1,c:P.c2,a:e});lab([GX,0,1.8],'GDDR5 ≈ '+N.gddr5_pj.toFixed(1)+' pJ per bit',{dy:18,a:e})}
  }
  const full={cam:[.2,.78],bounds:[[-5.4,0,-2],[5.8,.7,2]]};
  const views=[{cam:[.3,.82],bounds:[[-5,0,-1.5],[-1.4,.6,1.6]]},{cam:[.55,.42],bounds:[[-4.9,0,-1.25],[-3.4,1.05,-.3]]},{cam:[.25,.9],bounds:[[-5,0,-1.5],[-1.4,.5,1.5]]},
    {cam:[.25,.85],bounds:[[1.1,0,-1.9],[5.7,.5,2]]},full];
  const st=S3.stage({id:'stg-hbm',list:'sx-hbm',fig:'Fig. 2 · HBM against GDDR7, to their published numbers',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    view:k=>views[k]||full,margin:w=>w<520?[16,10,16,10]:[24,24,24,24]});
  (window.MTSTG=window.MTSTG||{})['stg-hbm']=st;
})();
