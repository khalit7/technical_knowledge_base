// ---- Shared geometry for the 3D stages (renderer v2): a worker node as a server slab with 4 GPU slots on top (this cluster's fake
// example.com/gpu: 4 per worker), a pod as a block sitting on the slots it holds, and the three workers' positions. Sizes are illustrative. ----
window.KMG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const SW=1.7,SH=.3,SD=1.05,GW=.36,WX=[-2.6,0,2.6];
  const WN={'mi-kind-worker':0,'mi-kind-worker2':1,'mi-kind-worker3':2},NAMES=['worker','worker2','worker3'];
  const slotX=(c,g)=>c[0]+(g-1.5)*GW;
  // the centre of the top face over slots [from, from+n)
  const podAt=(c,from,n)=>[slotX(c,from)+(n-1)*GW/2,c[1]+SH,c[2]];
  // a worker whose floor centre is c: o.a alpha, o.tint (a colour mixed into the slab), o.used (slots already held, drawn as dashed-free), o.slots
  function worker(R,c,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(c,[SW,SH,SD],{fill:o.tint?mix(P.paper,o.tint,.35):mix(P.paper,P.ink,.06),a,lw:.7,dz:200});
    for(let g=0;g<4;g++)R.box([slotX(c,g),c[1]+SH,c[2]],[GW*.8,.035,SD*.55],{fill:mix(P.paper,P.line,.6),a:a*.85,shadow:false,lw:.5,dz:150})}
  // a pod holding n GPUs from slot 'from' of the worker at c (or floating at p when c is null): o.c colour, o.a alpha, o.h height
  function pod(R,p,n,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(p,[n*GW-.07,o.h||.34,SD*.62],{fill:o.c,a,lw:.7,shadow:o.shadow!==false&&p[1]<.05,fa:o.fa})}
  return {SW,SH,SD,GW,WX,WN,NAMES,slotX,podAt,worker,pod,wpos:i=>[WX[i],0,0]};
})();
