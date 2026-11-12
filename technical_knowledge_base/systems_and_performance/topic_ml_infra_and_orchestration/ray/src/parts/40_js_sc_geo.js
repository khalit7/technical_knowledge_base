// ---- Shared geometry for the 3D stages (renderer v2): this page's cluster as three node slabs in a row, the head (GCS, driver, raylet)
// and two workers (raylet, a pool of two worker processes for its 2 CPUs, an 80 MB object store drawn as an open tray, two fake_gpu slots).
// Positions and sizes are schematic; what sits where, and every number, comes from window.RY (the page's runs). ----
window.RYG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const NX=[-3.9,0,3.9],SW=3.4,SH=.16,SD=2.6,NAMES=['head','w1','w2'];
  const C=i=>[NX[i],0,0];
  // parts of a node, as floor centres (the box API takes the centre of the bottom face)
  const GCS=[NX[0]-.95,SH,-.5],DRV=[NX[0]+.8,SH,.5],HRL=[NX[0]-.95,SH,.7];
  const RL=i=>[NX[i]-.85,SH,-.65],WK=(i,j)=>[NX[i]-1.18+j*.66,SH,.55],ST=i=>[NX[i]+.8,SH,.3],GPU=(i,j)=>[NX[i]+.35+j*.9,SH,-.85];
  const STW=1.3,STD=1.5,STH=.2;
  // the node slab; o: a (alpha), tint, dead (dashed look: faded and tinted with the bad colour)
  function slab(R,i,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(C(i),[SW,SH,SD],{fill:o.dead?mix(P.paper,P.bad,.22):o.tint?mix(P.paper,o.tint,.18):mix(P.paper,P.ink,.05),a:a*(o.dead?.55:1),lw:.7,dz:200})}
  function raylet(R,p,o){o=o||{};const P=R.P;R.box(p,[1.05,.3,.62],{fill:mix(P.paper,P.c5,.45),a:o.a==null?1:o.a,lw:.7})}
  function worker(R,p,o){o=o||{};const P=R.P;R.box(p,[.5,o.h||.5,.55],{fill:o.c?mix(P.paper,o.c,.55):P.paper,a:o.a==null?1:o.a,lw:.7})}
  // the object store tray: a see-through box; objects sit inside it
  function store(R,i,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;R.box(ST(i),[STW,STH,STD],{fill:mix(P.paper,P.c1,.3),fa:.28,a,lw:.8,shadow:false})}
  // an object in a store, slot k (0 front, 1 middle, 2 back)
  const OBJ=(i,k)=>[NX[i]+.8,SH+.02,.62-k*.6];
  function obj(R,p,o){o=o||{};const P=R.P;R.box(p,[o.w||.62,o.h||.32,o.d||.42],{fill:o.c||mix(P.paper,P.c1,.75),a:o.a==null?1:o.a,lw:.7,shadow:false})}
  function gpus(R,i,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;for(let j=0;j<2;j++)R.box(GPU(i,j),[.5,.05,.36],{fill:mix(P.paper,P.line,.6),a:a*.9,shadow:false,lw:.5})}
  // a whole worker node at its usual look; o.dim fades its parts (composition: the rest recedes)
  function wnode(R,i,o){o=o||{};const d=o.dim==null?1:o.dim;slab(R,i,{a:o.a,dead:o.dead});if(o.a===0)return;
    raylet(R,RL(i),{a:d});worker(R,WK(i,0),{a:d});worker(R,WK(i,1),{a:d});store(R,i,{a:Math.max(.35,d)});if(o.gpus)gpus(R,i,{a:d})}
  return {NX,SW,SH,SD,NAMES,C,GCS,DRV,HRL,RL,WK,ST,GPU,OBJ,STW,STD,slab,raylet,worker,store,obj,gpus,wnode};
})();
