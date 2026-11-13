// ---- Shared by the surface stages (Fig. 1, 2 and 5): one of the Optimiser race's surfaces as a 3D mesh, and optimiser runs as balls with trails ----
// Everything drawn is the race's own engine (OPTE in 30_js_engine.js, every rule checked against PyTorch) at the race's tuned rates (RACE_LR).
// The floor is the race's view box; height is log10(1 + loss), so the steep walls and the shallow floor of a ravine both stay visible.
window.SURF=(function(){
  if(!window.OPTE||!window.RACE_LR||!window.S3)return null;
  const E=OPTE,LR=RACE_LR,mix=S3.mix;
  // the race's colour for each optimiser (50_js_race.js), so the stages and the race tab agree
  const COL={gd:'#8a8a8a',mom:'#3f7f56',nes:'#2aa198',adagrad:'#b8983a',rmsprop:'#d4801f',adam:'#2f6fb5',shampoo:'#8a5cb8'};
  const NAME={gd:'SGD',mom:'momentum',nes:'Nesterov',adagrad:'AdaGrad',rmsprop:'RMSProp',adam:'Adam',shampoo:'Shampoo'};
  function make(sk,o){o=o||{};const sf=E.S[sk],b=sf.box,W=o.W||7.2,HT=o.H||1.7,nx=o.nx||46,nz=o.nz||20;
    const cx=(b[0]+b[1])/2,cy=(b[2]+b[3])/2,sx=W/(b[1]-b[0]),sz=Math.max(sx,(o.D||3.4)/(b[3]-b[2]));
    let hm=0;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=b[0]+(b[1]-b[0])*i/nx,y=b[2]+(b[3]-b[2])*j/nz;hm=Math.max(hm,Math.log10(1+sf.f(x,y)))}
    const hs=HT/hm,X=x=>(x-cx)*sx,Z=y=>-(y-cy)*sz,cl=(v,a,c)=>Math.max(a,Math.min(c,v));
    const h=(x,y)=>Math.log10(1+sf.f(x,y))*hs;
    // a point on the surface (clamped to the view box, as the race clamps its paths)
    const pt=(x,y,lift)=>{x=cl(x,b[0],b[1]);y=cl(y,b[2],b[3]);return [X(x),h(x,y)+(lift||0),Z(y)]};
    const cells=[];for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x0=b[0]+(b[1]-b[0])*i/nx,x1=b[0]+(b[1]-b[0])*(i+1)/nx,y0=b[2]+(b[3]-b[2])*j/nz,y1=b[2]+(b[3]-b[2])*(j+1)/nz;
      const q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>[X(x),h(x,y),Z(y)]);cells.push({q,t:Math.min(1,(q[0][1]+q[2][1])/2/HT)})}
    const runs={};
    function run(ok,sched,seed){const k=ok+'|'+(sched||'const')+'|'+(seed||1);if(!runs[k]){const r=E.run(sk,ok,LR[sk][ok],{sched:sched||'const',seed:seed||1});let f=null;for(let s=0;s<=r.T;s++)if(r.ls[s]<1e-3){f=s;break}r.first=f;r.lr=LR[sk][ok];runs[k]=r}return runs[k]}
    const S={sf,b,X,Z,h,pt,HT,run,
      // the mesh; a recedes it, so the paths a step is about stand out
      mesh(R,a,f){const P=R.P;cells.forEach(c=>R.quad(c.q,{fill:mix(P.paper,mix(P.c1,P.c6,Math.pow(c.t,.7)),.16+.42*c.t),fa:.94,ea:.16,lw:.5,a:f?a*f(c):a}))}, // f: optional per-cell alpha factor (a close-up fades what lies outside it)
      // the start (a ring of ink) and the minimum (a dark ball)
      marks(R,a,mins,sc){const P=R.P,s=pt(sf.start[0],sf.start[1],.03),z=sc||1;R.ball(s,.08*z,{c:P.paper,a,top:1});R.ball(s,.045*z,{c:P.ink,a,top:1});
        (mins||[[1,.6]]).forEach(m=>R.ball(pt(m[0],m[1],.02),.07*z,{c:P.ink,a,top:1}))},
      // one run's trail up to step t (fractional), its ball, and dots flowing along the last few hops (the direction it is moving)
      trail(R,r,t,c,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01)return null;const T=Math.min(r.T,t),n=Math.floor(T),u=T-n,pts=[];
        for(let s=0;s<=n;s++){if(!isFinite(r.xs[s]))break;pts.push(pt(r.xs[s],r.ys[s],.025))}
        if(u>0&&n<r.T&&isFinite(r.xs[n+1])){const p=pt(r.xs[n],r.ys[n],.025),q=pt(r.xs[n+1],r.ys[n+1],.025);pts.push([p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u])}
        if(pts.length>1)R.line(pts,{c,w:o.w||2.2,a,top:1});const end=pts[pts.length-1];
        if(o.flow&&pts.length>3)R.flow(pts.slice(-Math.min(pts.length,o.flow)),{c,a:a*.9,r:.05,speed:1.4,n:6,top:1});
        R.glow(end,o.gr||.22,{c,a:a*.8,top:1});R.ball(end,o.br||.075,{c,a,top:1});return end}};
    return S}
  return {make,COL,NAME,E,LR};
})();
