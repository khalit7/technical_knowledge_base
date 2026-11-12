// ---- Shared by the 3D scenes of this page (renderer v2, 2026-11). Colours on every scene, matched to the prose:
// the jaxpr purple glass (P.c4), StableHLO teal (P.c6), XLA's HLO orange (P.c2), compiled kernels and the executable green (P.c3),
// what the page follows or what is being taught blue (P.acc), memory traffic and misses the warning colour (P.bad). ----
window.XPS=(function(){
  if(!window.S3)return null;const {mix,lerp}=S3;
  // an upright label, drawn only when its anchor is on the canvas (close-up views leave parts of a scene outside)
  function lab(R,p,t,o){const q=R.p(p);if(q[2]<=0||q[0]<4||q[0]>R.W-4||q[1]<4||q[1]>R.H-4)return;R.label(p,t,o)}
  // a straight path, sampled so a flow can run along it; several legs joined into one path
  function path(a,b,n){const o=[];n=n||10;for(let i=0;i<=n;i++){const t=i/n;o.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}return o}
  function legs(pts){let o=[pts[0]];for(let i=1;i<pts.length;i++)o=o.concat(path(pts[i-1],pts[i],8).slice(1));return o}
  // a flat tile lying on a plane at height y (one instruction of a program)
  function tile(R,c,s,o){const h=s/2,y=c[1]+.006;R.quad([[c[0]-h,y,c[2]-h],[c[0]+h,y,c[2]-h],[c[0]+h,y,c[2]+h],[c[0]-h,y,c[2]+h]],o)}
  // a dashed outline of an empty slot on the floor
  function slot(R,c,w,d,a){const P=R.P;R.quad([[c[0]-w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]-d/2],[c[0]+w/2,c[1]+.005,c[2]+d/2],[c[0]-w/2,c[1]+.005,c[2]+d/2]],{a:a==null?.8:a,ec:P.mute,dash:[4,3],lw:1})}
  const tint=(P,c,t)=>mix(P.paper,c,t);
  const nf=new Intl.NumberFormat('en-US'),f=v=>nf.format(v);
  return {lab,path,legs,tile,slot,tint,f};
})();
