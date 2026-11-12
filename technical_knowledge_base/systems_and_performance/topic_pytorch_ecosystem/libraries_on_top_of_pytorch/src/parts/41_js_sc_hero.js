// ---- Scene, Fig. 1 (the hero, 2026-11-12): six libraries as towers of the same eight duties, standing on a PyTorch plate.
// The slabs are read from the duty table #lib-duty on the page (data-o: y yours, l the library's, d a default that changes the loss;
// data-s a short label), so the figure and the table cannot disagree. TRL and Axolotl are stacked on the Trainer in step 3 (section 4 and 8).
// Dots streaming down each tower are its calls into PyTorch; their density follows log10 of the calls per step in LIB.tr (the What calls what traces).
// Steps are explained by #sx-hero on the left. ----
(function(){
  const tb=document.getElementById('lib-duty');
  if(!document.getElementById('stg-hero')||!window.S3||!tb||!window.LIB)return;const {at,mix,lerp}=S3;
  const rows=[...tb.tBodies[0].rows],DUTY=rows.map(r=>r.cells[0].textContent.trim());
  const NAMES=['plain loop','HF Trainer','Accelerate','Lightning','DeepSpeed','torchtitan'];
  const TRACE=['plain','hf','accelerate','lightning','ds_z0','titan_1p'];
  const TR=window.LIB.tr,per=k=>{const o=TR[k].tot.loop||{};return Object.values(o).reduce((a,b)=>a+b,0)/TR[k].steps};
  const CALLS=TRACE.map(k=>Math.round(per(k)));
  const fmt=n=>Number(n).toLocaleString('en-GB');
  // cells[i][j]: library i, duty j (0 = who runs the loop, at the top)
  const cells=NAMES.map((_,i)=>rows.map(r=>{const c=r.cells[i+1];return {o:c.dataset.o||'y',s:c.dataset.s||c.textContent.trim()}}));
  const TOPS=[{n:'TRL',s:'SFT, DPO, GRPO trainers: bf16, lr 1e-6 GRPO',o:'d'},{n:'Axolotl',s:'YAML file; cosine schedule',o:'d'}];
  const NS=DUTY.length,SW=1.7,SD=1.2,SH=.38,GAP=.07,Y0=.12,yOf=j=>Y0+(NS-1-j)*(SH+GAP),TOPY=Y0+NS*(SH+GAP);
  const XN=[-13,-7.8,-2.6,2.6,7.8,13],XF=[-6.5,-3.9,-1.3,1.3,3.9,6.5],X=XN.slice();
  const FOC=[0,1,1,2,3,4,5,-1]; // the tower each step is about (-1: all)
  function tower(R,i,a){const P=R.P;if(a<=.01)return;
    for(let j=0;j<NS;j++){const c=cells[i][j],fill=c.o==='d'?mix(P.paper,P.acc,.45):c.o==='l'?mix(P.paper,P.ink,.16):P.paper;
      R.box([X[i],yOf(j),0],[SW,SH,SD],{fill,a:a*(c.o==='y'?.85:1),shadow:false})}}
  function slabLabels(R,i,a){const P=R.P;for(let j=0;j<NS;j++){const c=cells[i][j];
    R.label([X[i]+SW/2,yOf(j)+SH/2,SD/2],c.s,{al:'left',dx:10,fs:12.5,b:c.o==='d',c:c.o==='d'?P.acc:c.o==='l'?P.ink:P.mute,grp:'sl'+i,a})}}
  function dutyNames(R,i,a){const P=R.P;for(let j=0;j<NS;j++)R.label([X[i]-SW/2,yOf(j)+SH/2,SD/2],DUTY[j],{al:'right',dx:-10,fs:12,c:P.mute,grp:'duty',a})}
  function calls(R,i,a){const P=R.P,n=2+Math.round(1.7*Math.log10(Math.max(1,CALLS[i])));
    R.flow([[X[i]+SW/2-.2,TOPY+.1,SD/2+.2],[X[i]+SW/2-.2,.02,SD/2+.2]],{c:P.c2,r:.08,n,a,speed:1.2})}
  function draw(R,k,e){const P=R.P;
    const t=k===7?e:0;for(let i=0;i<6;i++)X[i]=lerp(XN[i],XF[i],t);
    R.grid(-16,16,-2.6,2.6,.5);
    // the PyTorch plate under every tower
    const px0=Math.min(...X)-1.6,px1=Math.max(...X)+1.6;
    R.glass([px0,0,-1.1],[px1-px0,0,0],[0,0,2.2],{c:P.acc,nu:Math.round((px1-px0)/1.3),nv:3,a:1});
    R.label([px0+.15,0,1.1],'PyTorch',{al:'left',fs:13,b:1,c:P.acc,dy:14});
    const foc=FOC[k];
    for(let i=0;i<6;i++){const a=foc<0||i===foc?1:.18;tower(R,i,a);if(foc<0||i===foc)calls(R,i,foc<0?1:Math.min(1,.3+e));
      // the plain loop stays in faint view while the HF tower grows, as the reference
      const la=foc<0||i===foc?1:0,ph=R.W<520&&foc<0;
      const top=i===1&&k>=2&&k<7?TOPY+2*(SH+GAP+.06):TOPY;
      R.label([X[i],top,0],ph?NAMES[i].replace('HF Trainer','HF').replace('Accelerate','Accel.').replace('torchtitan','titan').replace('DeepSpeed','DS').replace('Lightning','Light.').replace('plain loop','plain'):NAMES[i],{fs:ph?12:13.5,b:1,dy:foc<0&&!ph?-32:-14,c:P.ink,a:la});
      if(foc<0)R.label([X[i],top,0],fmt(CALLS[i])+' /step',{mono:true,fs:12,dy:-14,c:P.c2,a:e,wide:1})}
    // step 3: TRL and Axolotl stack on the Trainer; dots run down through every layer
    if(k>=2&&k<7){const a=k===2?e:.18;
      TOPS.forEach((s,m)=>{const y=TOPY+m*(SH+GAP+.06)+.04*(1-(k===2?e:1));R.box([X[1],y,0],[SW,SH,SD],{fill:mix(P.paper,P.acc,.45),a,shadow:false});
        if(k===2){R.label([X[1]+SW/2,y+SH/2,SD/2],s.n+': '+s.s,{al:'left',dx:10,fs:12.5,b:1,c:P.acc,grp:'sl1',a:e});}});
      if(k===2)R.flow([[X[1]-SW/2+.2,TOPY+2*(SH+GAP+.06),SD/2+.12],[X[1]-SW/2+.2,.02,SD/2+.12]],{c:P.acc,r:.06,n:7,a:e,speed:1.2})}
    if(foc>=0){slabLabels(R,foc,k===FOC[k-1]?1:Math.min(1,.25+e));dutyNames(R,foc,1)}
  }
  const full={cam:[.26,.36],bounds:[[-8.2,0,-1.2],[8.2,4,1.6]]};
  // on a phone the side labels are hidden (the step text names the slabs), so the camera moves in closer
  const near=i=>innerWidth<560?{cam:[.3,.3],bounds:[[XN[i]-1.5,0,-1.2],[XN[i]+1.5,i===1?4.8:4,1.4]]}:{cam:[.3,.3],bounds:[[XN[i]-3.6,0,-1.2],[XN[i]+4.8,i===1?4.8:4,1.4]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · eight duties, six libraries (from source; calls traced)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[18,10,24,10]:[24,14,30,14],
    view:k=>FOC[k]>=0?near(FOC[k]):full});
})();
